// Run explicitly with: node tests/organizations.integration.mjs
// Uses the configured database; only a uniquely named temporary organization is changed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import pool from "../src/database.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const server = spawn(process.execPath, ["server.js"], {
  cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"],
});
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (data) => {
    if (data.toString().includes("Server is running")) resolve();
  });
  server.once("error", reject);
  server.once("exit", (code) => reject(new Error(`Server exited: ${code}`)));
});
server.stderr.on("data", (data) => process.stderr.write(data));
const token = `w04-test-${Date.now()}`;
const valid = {
  name: token, description: "Temporary Week 04 verification organization.",
  contactEmail: `${token}@example.com`,
};
let id;
let original;
let checks = 0;
const request = async (path, status, fields) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    signal: AbortSignal.timeout(15000), redirect: "manual",
    ...(fields === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: fields instanceof URLSearchParams ? fields : new URLSearchParams(fields),
    }),
  });
  assert.equal(response.status, status, path);
  checks++;
  return { body: await response.text(), location: response.headers.get("location") };
};

try {
  await ready;
  original = (await pool.query("SELECT * FROM organization ORDER BY organization_id")).rows;
  for (const path of ["/", "/organizations", "/projects", "/categories"]) await request(path, 200);
  if (original.length) await request(`/organization/${original[0].organization_id}`, 200);
  for (const [table, field, route] of [
    ["project", "project_id", "project"], ["category", "category_id", "category"],
  ]) {
    // Table/column identifiers are fixed test constants, never user input.
    const result = await pool.query(`SELECT ${field} AS id FROM ${table} LIMIT 1`);
    if (result.rows.length) await request(`/${route}/${result.rows[0].id}`, 200);
  }
  let page = await request("/new-organization", 200);
  assert.match(page.body, /action="\/new-organization" method="POST"/);
  assert.match(page.body, /name="name" required minlength="3" maxlength="150"/);
  assert.match(page.body, /name="description" required maxlength="500"/);
  assert.match(page.body, /type="email"[^>]*required maxlength="255"/);
  assert.doesNotMatch(page.body, /name="logoFilename"/);
  for (const fields of [
    {}, { ...valid, name: "  " }, { ...valid, name: "ab" },
    { ...valid, name: "x".repeat(151) }, { ...valid, description: " " },
    { ...valid, description: "x".repeat(501) }, { ...valid, contactEmail: "invalid" },
    { ...valid, contactEmail: "a".repeat(245) + "@example.com" },
    { ...valid, name: "bad\0name" },
  ]) {
    page = await request("/new-organization", 400, fields);
    assert.match(page.body, /role="alert"/);
  }
  const repeated = new URLSearchParams(valid);
  repeated.append("name", "another");
  await request("/new-organization", 400, repeated);
  page = await request("/new-organization", 400, {
    ...valid, name: "<script>alert(1)</script>", contactEmail: "bad",
  });
  assert.match(page.body, /&lt;script&gt;/);
  assert.doesNotMatch(page.body, /<script>alert/);
  assert.ok(page.body.includes(valid.description));

  page = await request("/new-organization", 303, { ...valid, name: `  ${valid.name}  ` });
  assert.match(page.location, /^\/organization\/\d+$/);
  id = Number(page.location.split("/").pop());
  assert.ok((await request("/organizations", 200)).body.includes(token));
  assert.match((await request(`/organization/${id}`, 200)).body, /placeholder-logo.png/);
  page = await request(`/edit-organization/${id}`, 200);
  for (const value of Object.values(valid)) assert.ok(page.body.includes(value));
  assert.match(page.body, /name="logoFilename" required maxlength="255"/);
  assert.match(page.body, /value="placeholder-logo.png"/);
  await request("/images/placeholder-logo.png", 200);

  const edit = {
    ...valid, name: `${token} updated`, logoFilename: "brightfuture-logo.png",
    description: "Updated <b>literal text</b> & an apostrophe: O'Brien.",
  };
  for (const fields of [
    {}, { ...edit, name: "a" }, { ...edit, name: "x".repeat(151) },
    { ...edit, description: " " }, { ...edit, description: "x".repeat(501) },
    { ...edit, contactEmail: "bad" }, { ...edit, logoFilename: "" },
    { ...edit, logoFilename: "x".repeat(256) },
  ]) {
    page = await request(`/edit-organization/${id}`, 400, fields);
    assert.match(page.body, /role="alert"/);
  }
  const beforeEdit = (await pool.query("SELECT * FROM organization WHERE organization_id=$1", [id])).rows[0];
  assert.equal(beforeEdit.name, valid.name);
  if (original.length) {
    await request(`/edit-organization/${id}`, 400, { ...edit, name: original[0].name });
    await request(`/edit-organization/${id}`, 400, { ...edit, contactEmail: original[0].contact_email });
  }
  await request("/new-organization", 400, { ...valid, contactEmail: `other-${token}@example.com` });
  await request("/new-organization", 400, { ...valid, name: token + " other" });
  page = await request(`/edit-organization/${id}`, 303, edit);
  assert.equal(page.location, `/organization/${id}`);
  page = await request(`/organization/${id}`, 200);
  assert.ok(page.body.includes(edit.name));
  assert.match(page.body, /&lt;b&gt;literal text&lt;\/b&gt;/);
  assert.ok((await request("/organizations", 200)).body.includes(edit.name));
  const updated = (await pool.query("SELECT * FROM organization WHERE organization_id=$1", [id])).rows[0];
  assert.equal(updated.description, edit.description);
  assert.equal(updated.logo_filename, edit.logoFilename);
  await request(`/edit-organization/${id}`, 303, edit);

  for (const badId of ["abc", "0", "-1", "1.5", "2147483648", "999999999999999999999", "2147483647"]) {
    await request(`/organization/${badId}`, 404);
    await request(`/edit-organization/${badId}`, 404);
    await request(`/edit-organization/${badId}`, 404, edit);
  }
  await request("/not-a-real-page", 404);
  console.log(`PASS: ${checks} HTTP checks plus form attributes, value preservation, escaping, database writes, and redirects.`);
} finally {
  try {
    // Include the returned ID so cleanup still works after editing the name/email.
    const removed = await pool.query(
      "DELETE FROM organization WHERE organization_id=$1 OR contact_email=$2 RETURNING organization_id",
      [id ?? null, valid.contactEmail]
    );
    console.log(`Cleanup: removed ${removed.rowCount} temporary organization(s).`);
    if (original) {
      const after = (await pool.query("SELECT * FROM organization ORDER BY organization_id")).rows;
      assert.deepEqual(after, original, "Organization records must match the pre-test snapshot");
      console.log("PASS: all original organization records are unchanged; no test records remain.");
    }
  } finally {
    server.kill();
    await pool.end();
  }
}

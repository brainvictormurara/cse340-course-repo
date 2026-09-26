// Run explicitly: node tests/categories.integration.mjs
// Uses the configured database; temporary categories/relationships are removed in finally.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import pool from "../src/database.js";

const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const server = spawn(process.execPath, ["server.js"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"],
});
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (data) => {
    if (data.toString().includes("Server is running")) resolve();
  });
  server.once("error", reject);
  server.once("exit", (code) => reject(new Error(`Server exited: ${code}`)));
});
server.stderr.on("data", (data) => process.stderr.write(data));
const snapshot = async () => ({
  categories: (await pool.query("SELECT * FROM category ORDER BY category_id")).rows,
  relationships: (await pool.query("SELECT * FROM project_category ORDER BY project_id, category_id")).rows,
  projects: (await pool.query("SELECT * FROM project ORDER BY project_id")).rows,
  organizations: (await pool.query("SELECT * FROM organization ORDER BY organization_id")).rows,
});
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&#34;").replaceAll("'", "&#39;");
let original;
let id;
let checks = 0;
const createdIds = [];
const request = async (path, status, fields) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    signal: AbortSignal.timeout(15000), redirect: "manual",
    ...(fields === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: fields instanceof URLSearchParams ? fields : new URLSearchParams(fields),
    }),
  });
  const location = response.headers.get("location");
  if (path === "/new-category" && response.status === 303 && /^\/category\/\d+$/.test(location)) {
    createdIds.push(Number(location.split("/").pop()));
  }
  assert.equal(response.status, status, path);
  checks++;
  return { body: await response.text(), location };
};
const assertAttributes = (html) => {
  assert.match(html, /name="name" required maxlength="100"/);
  assert.doesNotMatch(html, /minlength\s*=/i);
  assert.doesNotMatch(html, /pattern\s*=/i);
};
try {
  await ready;
  original = await snapshot();
  assert.ok(original.projects.length, "An existing project is needed to verify category tags");
  for (const path of ["/organizations", "/projects", "/categories"]) await request(path, 200);
  let page = await request("/new-category", 200);
  assertAttributes(page.body);
  assert.match(page.body, /action="\/new-category" method="POST"/);
  assert.ok((await request("/categories", 200)).body.includes('href="/new-category"'));
  const invalidNames = ["", "   ", "a", "ab", "x".repeat(101), "bad\0name"];
  for (const name of invalidNames) {
    page = await request("/new-category", 400, { name });
    assert.match(page.body, /role="alert"/);
    assert.ok(page.body.includes(`value="${escape(name.trim())}"`));
    assertAttributes(page.body);
  }
  await request("/new-category", 400, {});
  await request("/new-category", 400, new URLSearchParams([["name", "one"], ["name", "two"]]));
  let shortName;
  do { shortName = randomBytes(3).toString("hex").slice(0, 3); }
  while (original.categories.some((category) => category.name === shortName));
  page = await request("/new-category", 303, { name: shortName });
  id = Number(page.location.split("/").pop());
  assert.equal(page.location, `/category/${id}`);
  assert.equal((await pool.query("SELECT name FROM category WHERE category_id=$1", [id])).rows[0].name, shortName);
  page = await request(`/category/${id}`, 200);
  assert.ok(page.body.includes(shortName));
  assert.ok(page.body.includes(`/edit-category/${id}`));
  assert.ok((await request("/categories", 200)).body.includes(`/category/${id}`));
  page = await request(`/edit-category/${id}`, 200);
  assertAttributes(page.body);
  assert.ok(page.body.includes(`value="${shortName}"`));
  assert.ok(page.body.includes(`action="/edit-category/${id}"`));
  for (const name of invalidNames) {
    page = await request(`/edit-category/${id}`, 400, { name });
    assert.match(page.body, /role="alert"/);
    assert.ok(page.body.includes(`value="${escape(name.trim())}"`));
    assertAttributes(page.body);
  }
  assert.equal((await pool.query("SELECT name FROM category WHERE category_id=$1", [id])).rows[0].name, shortName);
  await request(`/edit-category/${id}`, 400, {});
  await request(`/edit-category/${id}`, 400, new URLSearchParams([["name", "one"], ["name", "two"]]));
  await request("/new-category", 400, { name: shortName });
  if (original.categories.length) {
    page = await request(`/edit-category/${id}`, 400, { name: original.categories[0].name });
    assert.match(page.body, /already exists/);
    assert.ok(page.body.includes(`value="${escape(original.categories[0].name)}"`));
  }
  const projectId = original.projects[0].project_id;
  await pool.query("INSERT INTO project_category (project_id,category_id) VALUES ($1,$2)", [projectId, id]);
  const updatedName = `W04 ${Date.now()} <b>Help</b> & O'Brien`;
  page = await request(`/edit-category/${id}`, 303, { name: updatedName });
  assert.equal(page.location, `/category/${id}`);
  assert.equal((await pool.query("SELECT name FROM category WHERE category_id=$1", [id])).rows[0].name, updatedName);
  page = await request(`/category/${id}`, 200);
  assert.ok(page.body.includes(escape(updatedName)));
  assert.ok(page.body.includes(`/project/${projectId}`));
  page = await request(`/project/${projectId}`, 200);
  assert.ok(page.body.includes(`/category/${id}`));
  assert.ok(page.body.includes(escape(updatedName)));
  assert.doesNotMatch(page.body, /<b>Help<\/b>/);
  page = await request(`/edit-category/${id}`, 200);
  assert.ok(page.body.includes(`value="${escape(updatedName)}"`));
  assertAttributes(page.body);
  // Updating without changing the name must not trigger the unique constraint.
  await request(`/edit-category/${id}`, 303, { name: updatedName });
  const maxName = `W04-${Date.now()}`.padEnd(100, "x");
  page = await request("/new-category", 303, { name: maxName });
  assert.equal((await pool.query("SELECT name FROM category WHERE category_id=$1", [createdIds.at(-1)])).rows[0].name, maxName);
  await request(`/edit-category/${id}`, 303, { name: maxName.slice(0, 99) + "y" });
  await request(`/edit-category/${id}`, 303, { name: shortName });
  for (const badId of ["abc", "0", "-1", "1.5", "1e0", "2147483648", "999999999999999999999", "2147483647"]) {
    await request(`/category/${badId}`, 404);
    await request(`/edit-category/${badId}`, 404);
    await request(`/edit-category/${badId}`, 404, { name: "Valid name" });
  }
  await request("/not-a-real-page", 404);
  for (const category of original.categories) {
    page = await request(`/category/${category.category_id}`, 200);
    for (const link of original.relationships.filter((row) => row.category_id === category.category_id)) {
      assert.ok(page.body.includes(`/project/${link.project_id}`));
    }
  }
  console.log(`PASS: ${checks} HTTP checks; client attributes, server boundaries, preserved values, persistence, redirects, IDs, and category relationships.`);
} finally {
  try {
    await pool.query("DELETE FROM project_category WHERE category_id = ANY($1::integer[])", [createdIds]);
    const removed = await pool.query("DELETE FROM category WHERE category_id = ANY($1::integer[])", [createdIds]);
    console.log(`Cleanup: removed ${removed.rowCount} temporary categories and their relationships.`);
    if (original) {
      assert.deepEqual(await snapshot(), original, "Original application records must remain unchanged");
      console.log("PASS: all category, project, organization, and relationship records match the pre-test snapshot.");
    }
  } finally {
    server.kill();
    await pool.end();
  }
}

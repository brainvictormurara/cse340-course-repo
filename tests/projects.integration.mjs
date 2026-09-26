// Run explicitly: node tests/projects.integration.mjs
// Creates one temporary project and category relationship, then removes them in finally.
import assert from "node:assert/strict";
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
  // Exercise date form rendering in a timezone ahead of UTC.
  env: { ...process.env, PORT: String(port), TZ: "Africa/Harare" },
  stdio: ["ignore", "pipe", "pipe"],
});
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (data) => {
    if (data.toString().includes("Server is running")) resolve();
  });
  server.once("error", reject);
  server.once("exit", (code) => reject(new Error(`Server exited: ${code}`)));
});
server.stderr.on("data", (data) => process.stderr.write(data));
const token = `w04-project-test-${Date.now()}`;
let id;
let original;
let checks = 0;
const snapshot = async () => ({
  projects: (await pool.query("SELECT *, date::text AS calendar_date FROM project ORDER BY project_id")).rows,
  relationships: (await pool.query("SELECT * FROM project_category ORDER BY project_id, category_id")).rows,
  organizations: (await pool.query("SELECT * FROM organization ORDER BY organization_id")).rows,
  categories: (await pool.query("SELECT * FROM category ORDER BY category_id")).rows,
});
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
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&#34;").replaceAll("'", "&#39;");
const assertOptions = (html, organizations, selected) => {
  for (const organization of organizations) {
    assert.ok(html.includes(`value="${organization.organization_id}"`));
    assert.ok(html.includes(escape(organization.name)));
  }
  if (selected) assert.ok(html.includes(`value="${selected}" selected`));
};

try {
  await ready;
  original = await snapshot();
  assert.ok(original.organizations.length >= 2, "Two existing organizations are needed to test reassignment");
  assert.ok(original.categories.length, "An existing category is needed to test category tags");
  const organizations = original.organizations;
  const valid = {
    title: token, description: "Temporary project description.", location: "Test community hall",
    date: "2032-02-29", organizationId: String(organizations[0].organization_id),
  };
  for (const path of ["/projects", "/organizations", "/categories", "/new-organization",
    `/edit-organization/${organizations[0].organization_id}`]) await request(path, 200);
  for (const project of original.projects) await request(`/project/${project.project_id}`, 200);
  let page = await request("/new-project", 200);
  assert.match(page.body, /action="\/new-project" method="POST"/);
  assert.match(page.body, /name="title" required minlength="3" maxlength="150"/);
  assert.match(page.body, /name="description" required maxlength="1000"/);
  assert.match(page.body, /name="location" required maxlength="200"/);
  assert.match(page.body, /type="date"[^>]*name="date" required/);
  assert.match(page.body, /select[^>]*name="organizationId" required/);
  assertOptions(page.body, organizations);
  const invalidFields = [
    {}, ...Object.keys(valid).map((field) => ({ ...valid, [field]: " " })),
    { ...valid, title: "ab" }, { ...valid, title: "x".repeat(151) },
    { ...valid, description: "x".repeat(1001) }, { ...valid, location: "x".repeat(201) },
    { ...valid, title: "bad\0title" },
    ...["not-a-date", "2031-02-29", "2032-02-30", "2032-04-31", "2032-13-01",
      "0000-01-01", "2032-01-01T00:00:00Z", "10000-01-01"].map((date) => ({ ...valid, date })),
    ...["abc", "0", "-1", "1.5", "1e0", "2147483648", "999999999999999999999", "2147483647"]
      .map((organizationId) => ({ ...valid, organizationId })),
  ];
  for (const fields of invalidFields) {
    page = await request("/new-project", 400, fields);
    assert.match(page.body, /role="alert"/);
    assertOptions(page.body, organizations);
  }
  const repeated = new URLSearchParams(valid);
  repeated.append("organizationId", valid.organizationId);
  await request("/new-project", 400, repeated);
  page = await request("/new-project", 400, { ...valid, title: '<script>alert("x")</script>', date: "invalid" });
  assert.ok(page.body.includes(escape('<script>alert("x")</script>')));
  assert.ok(page.body.includes(valid.description));
  assert.ok(page.body.includes(valid.location));
  assert.match(page.body, /Submitted value: invalid/);
  assertOptions(page.body, organizations, valid.organizationId);
  assert.doesNotMatch(page.body, /<script>/);

  page = await request("/new-project", 303, { ...valid, title: `  ${token}  ` });
  assert.match(page.location, /^\/project\/\d+$/);
  id = Number(page.location.split("/").pop());
  page = await request(`/project/${id}`, 200);
  assert.ok(page.body.includes(token));
  assert.ok(page.body.includes("29 February 2032"));
  assert.ok(page.body.includes(`/organization/${valid.organizationId}`));
  assert.ok(page.body.includes(`/edit-project/${id}`));
  page = await request(`/edit-project/${id}`, 200);
  for (const field of ["title", "description", "location", "date"]) assert.ok(page.body.includes(valid[field]));
  assertOptions(page.body, organizations, valid.organizationId);
  const beforeEdit = (await pool.query("SELECT *, date::text AS calendar_date FROM project WHERE project_id=$1", [id])).rows[0];
  assert.equal(beforeEdit.calendar_date, valid.date);
  for (const fields of invalidFields) await request(`/edit-project/${id}`, 400, fields);
  await request(`/edit-project/${id}`, 400, repeated);
  page = await request(`/edit-project/${id}`, 400, { ...valid, title: token + " retained", date: "invalid" });
  assert.ok(page.body.includes(token + " retained"));
  assert.ok(page.body.includes(valid.description));
  assertOptions(page.body, organizations, valid.organizationId);
  assert.deepEqual((await pool.query("SELECT *, date::text AS calendar_date FROM project WHERE project_id=$1", [id])).rows[0], beforeEdit);

  const categoryId = original.categories[0].category_id;
  await pool.query("INSERT INTO project_category (project_id,category_id) VALUES ($1,$2)", [id, categoryId]);
  assert.ok((await request(`/project/${id}`, 200)).body.includes(`/category/${categoryId}`));
  const edit = {
    ...valid, title: token + " updated", description: "Updated <b>text</b> & O'Brien.",
    location: "Different hall", date: "2024-02-29", organizationId: String(organizations[1].organization_id),
  };
  page = await request(`/edit-project/${id}`, 303, edit);
  assert.equal(page.location, `/project/${id}`);
  page = await request(`/project/${id}`, 200);
  assert.ok(page.body.includes(edit.title));
  assert.ok(page.body.includes("29 February 2024"));
  assert.ok(page.body.includes(escape(edit.description)));
  assert.ok(page.body.includes(edit.location));
  assert.ok(page.body.includes(`/organization/${edit.organizationId}`));
  assert.ok(page.body.includes(`/category/${categoryId}`));
  page = await request(`/edit-project/${id}`, 200);
  for (const field of ["title", "description", "location", "date"]) assert.ok(page.body.includes(escape(edit[field])));
  assertOptions(page.body, organizations, edit.organizationId);
  const updated = (await pool.query("SELECT *, date::text AS calendar_date FROM project WHERE project_id=$1", [id])).rows[0];
  for (const field of ["title", "description", "location"]) assert.equal(updated[field], edit[field]);
  assert.equal(updated.calendar_date, edit.date);
  assert.equal(updated.organization_id, Number(edit.organizationId));
  assert.ok((await request(`/organization/${edit.organizationId}`, 200)).body.includes(`/project/${id}`));
  assert.ok(!(await request(`/organization/${valid.organizationId}`, 200)).body.includes(`/project/${id}`));
  assert.ok((await request(`/category/${categoryId}`, 200)).body.includes(`/project/${id}`));
  assert.equal((await pool.query("SELECT * FROM project_category WHERE project_id=$1", [id])).rowCount, 1);
  for (const badId of ["abc", "0", "-1", "1.5", "2147483648", "999999999999999999999", "2147483647"]) {
    await request(`/project/${badId}`, 404);
    await request(`/edit-project/${badId}`, 404);
    await request(`/edit-project/${badId}`, 404, edit);
  }
  // Boundary values accepted by both forms and the schema.
  await request(`/edit-project/${id}`, 303, {
    ...edit, title: "t".repeat(150), description: "d".repeat(1000), location: "l".repeat(200),
  });
  console.log(`PASS: ${checks} HTTP checks; validation, pre-population, dates, organization reassignment, category preservation, and database persistence.`);
} finally {
  try {
    // Only IDs created by this run (or its unique marker if a redirect assertion failed).
    const testIds = (await pool.query("SELECT project_id FROM project WHERE project_id=$1 OR title=$2", [id ?? null, token])).rows.map((row) => row.project_id);
    await pool.query("DELETE FROM project_category WHERE project_id = ANY($1::integer[])", [testIds]);
    const removed = await pool.query("DELETE FROM project WHERE project_id = ANY($1::integer[])", [testIds]);
    console.log(`Cleanup: removed ${removed.rowCount} temporary project(s) and their relationships.`);
    if (original) {
      assert.deepEqual(await snapshot(), original, "All application records must match the pre-test snapshot");
      console.log("PASS: project, organization, category, and relationship records are unchanged.");
    }
  } finally {
    server.kill();
    await pool.end();
  }
}

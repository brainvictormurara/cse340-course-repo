import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newDb, DataType } from 'pg-mem';
import request from 'supertest';
import session from 'express-session';
import bcrypt from 'bcrypt';
import pool from '../src/database.js';
import { createApp } from '../server.js';

// Exercise the real models, routes and templates against isolated SQL data.
const db = newDb();
// The existing project model uses this PostgreSQL date formatter.
db.public.registerFunction({ name: 'to_char', args: [DataType.date, DataType.text],
  returns: DataType.text, implementation: value => new Date(value).toISOString().slice(0, 10) });
db.public.none(await readFile(new URL('../src/setup.sql', import.meta.url), 'utf8'));
db.public.none(await readFile(new URL('../src/migrations/005-authentication.sql', import.meta.url), 'utf8'));
const memoryPool = new (db.adapters.createPg().Pool)();
const originalQuery = pool.query;
pool.query = memoryPool.query.bind(memoryPool);
const app = createApp({ sessionStore: new session.MemoryStore(), sessionSecret: 'integration-test-secret', production: false });
const admin = request.agent(app);
const user = request.agent(app);
const guest = request.agent(app);
after(async () => { pool.query = originalQuery; await memoryPool.end(); await pool.end(); });
const management = ['/new-organization', '/edit-organization/1', '/new-project', '/edit-project/1', '/new-category', '/edit-category/1', '/project/1/categories'];

 test('W05 registration, hashing, login, authorization, navigation and logout', async () => {
  for (const path of ['/dashboard', '/users', ...management]) {
    const response = await guest.get(path);
    assert.equal(response.status, 303, path);
    assert.equal(response.headers.location, '/login', path);
  }
  for (const path of management) {
    assert.equal((await guest.post(path).send({})).headers.location, '/login');
  }
  let response = await guest.get('/login');
  assert.match(response.text, /href="\/login"/);
  assert.doesNotMatch(response.text, /href="\/logout"/);
  assert.match(response.text, /must be logged in/);
  assert.equal((await user.post('/register').type('form').send({name: '', email: 'bad', password: 'x'})).status, 400);
  assert.equal((await user.post('/register').type('form').send({name: 'Name', email: 'name@example.com', password: 'é'.repeat(37)})).status, 400);
  response = await user.post('/register').type('form').send({name: '<script>alert(1)</script>', email: 'USER@example.com', password: 'testPass!', role_name: 'admin', role_id: 2});
  assert.equal(response.status, 303);
  const accounts = await memoryPool.query('SELECT * FROM users');
  const saved = accounts.rows[0];
  assert.equal(saved.email, 'user@example.com');
  assert.notEqual(saved.password_hash, 'testPass!');
  assert.equal(await bcrypt.compare('testPass!', saved.password_hash), true);
  assert.equal(saved.role_id, db.public.one("SELECT role_id FROM roles WHERE role_name = 'user'").role_id);
  assert.equal((await user.post('/register').type('form').send({name: 'Duplicate', email: 'USER@example.com', password: 'testPass!'})).status, 400);
  assert.equal((await user.post('/login').type('form').send({email: 'user@example.com', password: 'wrongPass!'})).status, 401);
  response = await user.post('/login').type('form').send({email: 'USER@example.com', password: 'testPass!'});
  assert.equal(response.headers.location, '/dashboard');
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
  response = await user.get('/dashboard');
  assert.match(response.text, /user@example.com/);
  assert.match(response.text, /href="\/logout"/);
  assert.match(response.text, /&lt;script&gt;/);
  assert.doesNotMatch(response.text, /href="\/users"/);
  assert.doesNotMatch(response.text, /href="\/login"/);
  for (const path of ['/users', ...management]) {
    response = await user.get(path);
    assert.equal(response.headers.location, '/dashboard', path);
  }
  for (const path of management) {
    assert.equal((await user.post(path).send({})).headers.location, '/dashboard');
  }
  assert.match((await user.get('/dashboard')).text, /do not have permission/);
  assert.equal((await admin.post('/register').type('form').send({name: 'admin', email: 'admin@example.com', password: 'cse340!'})).status, 303);
  await memoryPool.query("UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin') WHERE email = 'admin@example.com'");
  assert.equal((await admin.post('/login').type('form').send({email: 'admin@example.com', password: 'cse340!'})).headers.location, '/dashboard');
  assert.match((await admin.get('/dashboard')).text, /href="\/users"/);
  for (const path of management) {
    assert.equal((await admin.get(path)).status, 200, path);
  }
  const publicPages = ['/organizations', '/organization/1', '/projects', '/project/1', '/categories', '/category/1'];
  for (const path of publicPages) {
    const anonymousPage = await guest.get(path);
    assert.equal(anonymousPage.status, 200, path);
    assert.doesNotMatch(anonymousPage.text, /href="\/(new-|edit-|project\/1\/categories)/, path);
    const regularPage = await user.get(path);
    assert.equal(regularPage.status, 200, path);
    assert.doesNotMatch(regularPage.text, /href="\/(new-|edit-|project\/1\/categories)/, path);
    assert.match((await admin.get(path)).text, /href="\/(new-|edit-)/, path);
  }
  response = await admin.get('/users');
  assert.equal(response.status, 200);
  assert.match(response.text, /admin@example.com/);
  assert.match(response.text, /user@example.com/);
  assert.match(response.text, /<td>admin<\/td>/);
  assert.match(response.text, /<td>user<\/td>/);
  assert.doesNotMatch(response.text, /password_hash|\$2b\$|testPass!|cse340!/);
  // Revoking admin access applies without requiring another login.
  await memoryPool.query("UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'user') WHERE email = 'admin@example.com'");
  assert.equal((await admin.get('/users')).headers.location, '/dashboard');
  assert.doesNotMatch((await admin.get('/dashboard')).text, /href="\/users"/);
  const oldCookie = (await user.post('/login').type('form').send({email:'user@example.com', password:'testPass!'})).headers['set-cookie'][0].split(';')[0];
  assert.equal((await user.get('/logout')).headers.location, '/login');
  assert.equal((await user.get('/dashboard')).headers.location, '/login');
  assert.equal((await request(app).get('/users').set('Cookie', oldCookie)).headers.location, '/login');
  assert.doesNotMatch((await user.get('/login')).text, /href="\/logout"/);
 });

test('session store failure renders the 500 error page instead of a template error', async () => {
  const storeError = () => Object.assign(new Error('relation "user_sessions" does not exist'), { code: '42P01' });
  class FailingStore extends session.MemoryStore {
    failing = false;
    get(sid, callback) { this.failing ? callback(storeError()) : super.get(sid, callback); }
    set(sid, data, callback) { this.failing ? callback(storeError()) : super.set(sid, data, callback); }
  }
  const store = new FailingStore();
  const visitor = request.agent(createApp({ sessionStore: store, sessionSecret: 'integration-test-secret', production: false }));
  assert.equal((await visitor.get('/register')).status, 200);
  store.failing = true;
  const originalConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.map(String).join(' '));
  let response;
  try { response = await visitor.get('/register'); } finally { console.error = originalConsoleError; }
  assert.equal(response.status, 500);
  assert.match(response.text, /500: Server Error/);
  assert.match(response.text, /href="\/login"/);
  assert.doesNotMatch(response.text, /is not defined|ReferenceError/);
  assert.ok(logged.some(line => line.includes('user_sessions')), 'original store error is logged');
  assert.ok(!logged.some(line => line.includes('is not defined')), 'no secondary template error');
});

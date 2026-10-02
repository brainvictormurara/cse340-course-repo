import { readFile } from 'node:fs/promises';
import pool from '../src/database.js';
try {
  await pool.query(await readFile(new URL('../src/migrations/005-authentication.sql', import.meta.url), 'utf8'));
  console.log('Authentication tables are ready. Existing project data was preserved.');
} finally { await pool.end(); }

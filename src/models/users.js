import bcrypt from 'bcrypt';
import pool from '../database.js';

export const createUser = async (name, email, passwordHash) => {
  const result = await pool.query(`INSERT INTO users (name, email, password_hash, role_id)
    VALUES ($1, $2, $3, (SELECT role_id FROM roles WHERE role_name = 'user')) RETURNING user_id`,
  [name, email.toLowerCase(), passwordHash]);
  return result.rows[0].user_id;
};

const findUserByEmail = async (email) => {
  const result = await pool.query(`SELECT u.user_id, u.name, u.email, u.password_hash, r.role_name
    FROM users u JOIN roles r ON r.role_id = u.role_id WHERE lower(u.email) = lower($1)`, [email]);
  return result.rows[0] || null;
};
const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);
export const authenticateUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user || !await verifyPassword(password, user.password_hash)) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};
export const getUserById = async (id) => {
  const result = await pool.query(`SELECT u.user_id, u.name, u.email, r.role_name
    FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = $1`, [id]);
  return result.rows[0] || null;
};
export const getAllUsers = async () => {
  const result = await pool.query(`SELECT u.user_id, u.name, u.email, r.role_name
    FROM users u JOIN roles r ON r.role_id = u.role_id ORDER BY lower(u.name), u.user_id`);
  return result.rows;
};

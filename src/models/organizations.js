import pool from "../database.js";

export async function getAllOrganizations() {
  const result = await pool.query(
    "SELECT * FROM organization ORDER BY name"
  );

  return result.rows;
}
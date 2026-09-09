import pool from "../database.js";

export async function getAllCategories() {
  const result = await pool.query(
    "SELECT * FROM category ORDER BY name"
  );

  return result.rows;
}
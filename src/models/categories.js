import pool from "../database.js";

export const getAllCategories = async () => {
  const result = await pool.query(
    "SELECT * FROM category ORDER BY name"
  );

  return result.rows;
};
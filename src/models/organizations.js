import pool from "../database.js";

export const getAllOrganizations = async () => {
  const result = await pool.query(
    "SELECT * FROM organization ORDER BY name"
  );

  return result.rows;
};
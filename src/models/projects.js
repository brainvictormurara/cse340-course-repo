import pool from "../database.js";

export async function getAllProjects() {
  const result = await pool.query(`
    SELECT
      project.project_id,
      project.name,
      project.description,
      project.organization_id,
      organization.name AS organization_name
    FROM project
    JOIN organization
      ON project.organization_id = organization.organization_id
    ORDER BY organization.name, project.name
  `);

  return result.rows;
}
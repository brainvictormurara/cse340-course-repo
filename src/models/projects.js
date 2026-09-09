import pool from "../database.js";

export async function getAllProjects() {
  const result = await pool.query(`
    SELECT
      project.project_id,
      project.title,
      project.description,
      project.location,
      project.date,
      project.organization_id,
      organization.name AS organization_name
    FROM project
    JOIN organization
      ON project.organization_id = organization.organization_id
    ORDER BY project.date, project.title
  `);

  return result.rows;
}
import pool from "../database.js";

export const getAllProjects = async () => {
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
};

export const getUpcomingProjects = async (number_of_projects) => {
  const result = await pool.query(
    `
      SELECT
        project.project_id,
        project.title,
        project.description,
        project.date,
        project.location,
        project.organization_id,
        organization.name AS organization_name
      FROM project
      JOIN organization
        ON project.organization_id = organization.organization_id
      WHERE project.date >= CURRENT_DATE
      ORDER BY project.date ASC
      LIMIT $1
    `,
    [number_of_projects]
  );

  return result.rows;
};

export const getProjectDetails = async (id) => {
  const result = await pool.query(
    `
      SELECT
        project.project_id,
        project.title,
        project.description,
        project.date,
        project.location,
        project.organization_id,
        organization.name AS organization_name
      FROM project
      JOIN organization
        ON project.organization_id = organization.organization_id
      WHERE project.project_id = $1
    `,
    [id]
  );

  return result.rows[0];
};

export const getCategoriesByProject = async (projectId) => {
  const result = await pool.query(
    `
      SELECT
        category.category_id,
        category.name
      FROM project_category
      JOIN category
        ON project_category.category_id = category.category_id
      WHERE project_category.project_id = $1
      ORDER BY category.name
    `,
    [projectId]
  );

  return result.rows;
};
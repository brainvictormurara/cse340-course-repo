import pool from "../database.js";

export const createProject = async (title, description, location, date, organizationId) => {
  const result = await pool.query(
    `INSERT INTO project (title, description, location, date, organization_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING project_id`,
    [title, description, location, date, organizationId]
  );
  return result.rows[0].project_id;
};

export const updateProject = async (id, title, description, location, date, organizationId) => {
  const result = await pool.query(
    `UPDATE project SET title = $1, description = $2, location = $3,
     date = $4, organization_id = $5 WHERE project_id = $6 RETURNING project_id`,
    [title, description, location, date, organizationId, id]
  );
  return result.rows[0]?.project_id;
};

export const getAllProjects = async () => {
  const result = await pool.query(`
    SELECT
      project.project_id,
      project.title,
      project.description,
      project.location,
      to_char(project.date, 'YYYY-MM-DD') AS date,
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
        to_char(project.date, 'YYYY-MM-DD') AS date,
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
        to_char(project.date, 'YYYY-MM-DD') AS date,
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

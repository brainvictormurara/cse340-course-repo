import pool from "../database.js";

export const replaceProjectCategories = async (projectId, categoryIds) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize assignment changes for this project and prevent deletion during the save.
    const project = await client.query(
      "SELECT project_id FROM project WHERE project_id = $1 FOR UPDATE", [projectId]
    );
    if (!project.rowCount) {
      await client.query("ROLLBACK");
      return "not-found";
    }
    const categories = await client.query(
      "SELECT category_id FROM category WHERE category_id = ANY($1::integer[]) FOR KEY SHARE",
      [categoryIds]
    );
    if (categories.rowCount !== categoryIds.length) {
      await client.query("ROLLBACK");
      return "invalid-categories";
    }
    await client.query("DELETE FROM project_category WHERE project_id = $1", [projectId]);
    await client.query(
      `INSERT INTO project_category (project_id, category_id)
       SELECT $1, unnest($2::integer[])`, [projectId, categoryIds]
    );
    await client.query("COMMIT");
    return "saved";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

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

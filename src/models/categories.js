import pool from "../database.js";

export const getAllCategories = async () => {
  const result = await pool.query(
    "SELECT * FROM category ORDER BY name"
  );

  return result.rows;
};

export const getCategoryById = async (id) => {
  const result = await pool.query(
    "SELECT category_id, name FROM category WHERE category_id = $1",
    [id]
  );

  return result.rows[0];
};

export const getProjectsByCategory = async (categoryId) => {
  const result = await pool.query(
    `
      SELECT
        project.project_id,
        project.title,
        project.description,
        project.location,
        project.date,
        project.organization_id,
        organization.name AS organization_name
      FROM project_category
      JOIN project
        ON project_category.project_id = project.project_id
      JOIN organization
        ON project.organization_id = organization.organization_id
      WHERE project_category.category_id = $1
      ORDER BY project.date, project.title
    `,
    [categoryId]
  );

  return result.rows;
};
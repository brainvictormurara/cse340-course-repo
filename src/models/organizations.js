import pool from "../database.js";

export const getAllOrganizations = async () => {
  const result = await pool.query(
    "SELECT * FROM organization ORDER BY name"
  );

  return result.rows;
};

export const getOrganizationById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        organization_id,
        name,
        description,
        contact_email,
        logo_filename
      FROM organization
      WHERE organization_id = $1
    `,
    [id]
  );

  return result.rows[0];
};

export const getProjectsByOrganization = async (organizationId) => {
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
      FROM project
      JOIN organization
        ON project.organization_id = organization.organization_id
      WHERE project.organization_id = $1
      ORDER BY project.date, project.title
    `,
    [organizationId]
  );

  return result.rows;
};
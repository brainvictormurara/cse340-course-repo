import pool from "../database.js";

export const getOrganizationConflicts = async (name, contactEmail, id = null) => {
  const result = await pool.query(
    `SELECT name, contact_email FROM organization
     WHERE (name = $1 OR contact_email = $2)
       AND ($3::integer IS NULL OR organization_id <> $3)`,
    [name, contactEmail, id]
  );
  return result.rows;
};

export const createOrganization = async (name, description, contactEmail, logoFilename) => {
  const result = await pool.query(
    `INSERT INTO organization (name, description, contact_email, logo_filename)
     VALUES ($1, $2, $3, $4)
     RETURNING organization_id`,
    [name, description, contactEmail, logoFilename]
  );
  return result.rows[0].organization_id;
};

export const updateOrganization = async (id, name, description, contactEmail, logoFilename) => {
  const result = await pool.query(
    `UPDATE organization
     SET name = $1, description = $2, contact_email = $3, logo_filename = $4
     WHERE organization_id = $5
     RETURNING organization_id`,
    [name, description, contactEmail, logoFilename, id]
  );
  return result.rows[0]?.organization_id;
};

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

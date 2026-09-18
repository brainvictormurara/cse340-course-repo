import {
  getAllOrganizations,
  getOrganizationById,
  getProjectsByOrganization,
} from "../models/organizations.js";

export const showOrganizationsPage = async (req, res, next) => {
  try {
    const organizations = await getAllOrganizations();

    res.render("organizations", {
      title: "Our Partner Organizations",
      organizations,
    });
  } catch (error) {
    next(error);
  }
};

export const showOrganizationDetailsPage = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^\d+$/.test(id)) {
      return res.status(404).render("error", {
        title: "Organization Not Found",
        statusCode: 404,
        message: "The organization you requested could not be found.",
      });
    }

    const organization = await getOrganizationById(id);

    if (!organization) {
      return res.status(404).render("error", {
        title: "Organization Not Found",
        statusCode: 404,
        message: "The organization you requested could not be found.",
      });
    }

    const projects = await getProjectsByOrganization(id);

    res.render("organization", {
      title: organization.name,
      organization,
      projects,
    });
  } catch (error) {
    next(error);
  }
};
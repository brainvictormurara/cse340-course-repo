import { body, validationResult } from "express-validator";
import { getAllCategories } from "../models/categories.js";
import { getAllOrganizations, getOrganizationById } from "../models/organizations.js";
import {
  getUpcomingProjects,
  getCategoriesByProject,
  getProjectDetails,
  createProject,
  updateProject,
  replaceProjectCategories,
} from "../models/projects.js";

const NUMBER_OF_UPCOMING_PROJECTS = 5;

const isValidId = (id) => typeof id === "string" && /^\d+$/.test(id) &&
  Number.isSafeInteger(Number(id)) && Number(id) > 0 && Number(id) <= 2147483647;

const projectNotFound = (res) => res.status(404).render("error", {
  title: "Project Not Found", statusCode: 404,
  message: "The service project you requested could not be found.",
});

export const validateProjectId = (req, res, next) => {
  if (!isValidId(req.params.id)) return projectNotFound(res);
  next();
};

const renderCategoryAssignments = async (res, project, selectedIds, error = null) => {
  const categories = await getAllCategories();
  return res.status(error ? 400 : 200).render("assign-categories", {
    title: "Update Categories", project, categories, selectedIds, error,
  });
};

export const showCategoryAssignments = async (req, res, next) => {
  try {
    const project = await getProjectDetails(req.params.id);
    if (!project) return projectNotFound(res);
    const assigned = await getCategoriesByProject(project.project_id);
    return await renderCategoryAssignments(res, project, assigned.map((category) => category.category_id));
  } catch (error) { next(error); }
};

export const processCategoryAssignments = async (req, res, next) => {
  try {
    const project = await getProjectDetails(req.params.id);
    if (!project) return projectNotFound(res);
    // Browsers omit the field entirely when all checkboxes are unchecked.
    const submitted = req.body?.categoryIds;
    const values = submitted === undefined ? [] : Array.isArray(submitted) ? submitted : [submitted];
    const selectedIds = [...new Set(values.filter(isValidId).map(Number))];
    if (!values.every(isValidId)) {
      return await renderCategoryAssignments(res, project, selectedIds, "Select valid categories from the list.");
    }
    const result = await replaceProjectCategories(project.project_id, selectedIds);
    if (result === "not-found") return projectNotFound(res);
    if (result === "invalid-categories") {
      return await renderCategoryAssignments(res, project, selectedIds,
        "A selected category no longer exists. Review the available categories and save again.");
    }
    return res.redirect(303, `/project/${project.project_id}`);
  } catch (error) { next(error); }
};

const requiredText = (field, label) => body(field)
  .isString().withMessage(`${label} must be text.`).bail()
  .trim().notEmpty().withMessage(`${label} is required.`).bail()
  .custom((value) => !value.includes("\0"))
  .withMessage(`${label} contains an invalid character.`).bail();

// Use the schema's title limit and the course's server-side description/location limits.
export const projectValidation = [
  requiredText("title", "Project title").isLength({ min: 3, max: 150 })
    .withMessage("Project title must be between 3 and 150 characters."),
  requiredText("description", "Description").isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters."),
  requiredText("location", "Location").isLength({ max: 200 })
    .withMessage("Location cannot exceed 200 characters."),
  requiredText("date", "Date")
    .matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
    .withMessage("Enter a date in YYYY-MM-DD format.").bail()
    .isISO8601({ strict: true }).withMessage("Enter a valid calendar date."),
  requiredText("organizationId", "Organization")
    .custom(isValidId).withMessage("Select a valid organization."),
];

const getFormData = (body = {}) => Object.fromEntries(
  ["title", "description", "location", "date", "organizationId"].map((field) =>
    [field, typeof body[field] === "string" ? body[field] : ""]
  )
);

const renderProjectForm = async (res, formData, errors = {}, id = null, status = 200) => {
  const organizations = await getAllOrganizations();
  return res.status(status).render(id ? "edit-project" : "new-project", {
    title: id ? "Edit Service Project" : "Create New Service Project",
    projectId: id, formData, errors, organizations,
  });
};

const getFormErrors = async (req, formData) => {
  const errors = Object.fromEntries(validationResult(req)
    .array({ onlyFirstError: true }).map((error) => [error.path, error.msg]));
  // Do not pass malformed or out-of-range IDs to PostgreSQL.
  if (!errors.organizationId && !await getOrganizationById(formData.organizationId)) {
    errors.organizationId = "The selected organization no longer exists. Select an available organization.";
  }
  return errors;
};

export const showNewProjectForm = async (req, res, next) => {
  try {
    return await renderProjectForm(res, getFormData());
  } catch (error) { next(error); }
};

export const showEditProjectForm = async (req, res, next) => {
  try {
    const project = await getProjectDetails(req.params.id);
    if (!project) return projectNotFound(res);
    return await renderProjectForm(res, {
      title: project.title, description: project.description, location: project.location,
      // A DATE is a calendar day: do not shift it through a JavaScript timezone conversion.
      date: project.date, organizationId: String(project.organization_id),
    }, {}, project.project_id);
  } catch (error) { next(error); }
};

const processProjectForm = async (req, res, next, id = null) => {
  const formData = getFormData(req.body);
  try {
    if (id !== null && !await getProjectDetails(id)) return projectNotFound(res);
    const errors = await getFormErrors(req, formData);
    if (Object.keys(errors).length) return await renderProjectForm(res, formData, errors, id, 400);
    const values = [formData.title, formData.description, formData.location,
      formData.date, formData.organizationId];
    const savedId = id === null ? await createProject(...values) : await updateProject(id, ...values);
    if (!savedId) return projectNotFound(res);
    return res.redirect(303, `/project/${savedId}`);
  } catch (error) {
    // An organization can be deleted between validation and the INSERT/UPDATE.
    if (error.code === "23503" && error.constraint === "fk_project_organization") {
      try {
        return await renderProjectForm(res, formData, {
          organizationId: "The selected organization is unavailable. Select another organization.",
        }, id, 400);
      } catch (renderError) { return next(renderError); }
    }
    next(error);
  }
};

export const processNewProjectForm = (req, res, next) => processProjectForm(req, res, next);
export const processEditProjectForm = (req, res, next) =>
  processProjectForm(req, res, next, Number(req.params.id));

export const showProjectsPage = async (req, res, next) => {
  try {
    const projects = await getUpcomingProjects(
      NUMBER_OF_UPCOMING_PROJECTS
    );

    const title = "Upcoming Service Projects";

    res.render("projects", { title, projects });
  } catch (error) {
    next(error);
  }
};

export const showProjectDetailsPage = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(404).render("error", {
        title: "Project Not Found",
        statusCode: 404,
        message: "The service project you requested could not be found.",
      });
    }

    const project = await getProjectDetails(id);

    if (!project) {
      return res.status(404).render("error", {
        title: "Project Not Found",
        statusCode: 404,
        message: "The service project you requested could not be found.",
      });
    }

    const categories = await getCategoriesByProject(id);
    const title = project.title;

    res.render("project", { title, project, categories });
  } catch (error) {
    next(error);
  }
};

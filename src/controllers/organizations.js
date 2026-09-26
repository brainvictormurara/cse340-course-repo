import { body, validationResult } from "express-validator";
import {
  getAllOrganizations,
  getOrganizationById,
  getProjectsByOrganization,
  createOrganization,
  updateOrganization,
  getOrganizationConflicts,
} from "../models/organizations.js";

// SERIAL IDs must fit PostgreSQL's positive signed 32-bit integer range.
const isValidOrganizationId = (id) =>
  /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) &&
  Number(id) > 0 && Number(id) <= 2147483647;

const organizationNotFound = (res) => res.status(404).render("error", {
  title: "Organization Not Found",
  statusCode: 404,
  message: "The organization you requested could not be found.",
});

export const validateOrganizationId = (req, res, next) => {
  if (!isValidOrganizationId(req.params.id)) return organizationNotFound(res);
  next();
};

const requiredText = (field, label) => body(field)
  .isString().withMessage(`${label} must be text.`).bail()
  .trim()
  .notEmpty().withMessage(`${label} is required.`).bail()
  .custom((value) => !value.includes("\0"))
  .withMessage(`${label} contains an invalid character.`).bail();

export const organizationValidation = [
  requiredText("name", "Organization name")
    .isLength({ min: 3, max: 150 })
    .withMessage("Organization name must be between 3 and 150 characters."),
  requiredText("description", "Organization description")
    .isLength({ max: 500 })
    .withMessage("Organization description cannot exceed 500 characters."),
  requiredText("contactEmail", "Contact email")
    .isLength({ max: 255 }).withMessage("Contact email cannot exceed 255 characters.").bail()
    .isEmail().withMessage("Please provide a valid email address.").bail()
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false, yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false }),
];

export const organizationLogoValidation = [
  requiredText("logoFilename", "Logo filename")
    .isLength({ max: 255 }).withMessage("Logo filename cannot exceed 255 characters."),
];

const getFormData = (body = {}) => Object.fromEntries(
  ["name", "description", "contactEmail", "logoFilename"].map((field) =>
    [field, typeof body[field] === "string" ? body[field] : ""]
  )
);

const renderOrganizationForm = (res, formData, errors = {}, id = null, status = 200) =>
  res.status(status).render(id ? "edit-organization" : "new-organization", {
    title: id ? "Edit Organization" : "Create New Organization",
    organizationId: id,
    formData,
    errors,
  });

const formErrors = (req) => Object.fromEntries(
  validationResult(req).array({ onlyFirstError: true }).map((error) => [error.path, error.msg])
);

const checkOrganizationConflicts = async (formData, id = null) => {
  const conflicts = await getOrganizationConflicts(formData.name, formData.contactEmail, id);
  const errors = {};
  if (conflicts.some((organization) => organization.name === formData.name)) {
    errors.name = "An organization with this name already exists.";
  }
  if (conflicts.some((organization) => organization.contact_email === formData.contactEmail)) {
    errors.contactEmail = "An organization with this contact email already exists.";
  }
  return errors;
};

// Constraints also protect against simultaneous submissions of duplicate values.
const duplicateErrors = (error) => {
  if (error.code !== "23505") return null;
  if (error.constraint === "organization_name_key") {
    return { name: "An organization with this name already exists." };
  }
  if (error.constraint === "organization_contact_email_key") {
    return { contactEmail: "An organization with this contact email already exists." };
  }
  return { form: "An organization with this name or contact email already exists." };
};

export const showNewOrganizationForm = (req, res) =>
  renderOrganizationForm(res, getFormData());

export const processNewOrganizationForm = async (req, res, next) => {
  const formData = getFormData(req.body);
  const errors = formErrors(req);
  if (Object.keys(errors).length) return renderOrganizationForm(res, formData, errors, null, 400);
  try {
    const conflicts = await checkOrganizationConflicts(formData);
    if (Object.keys(conflicts).length) return renderOrganizationForm(res, formData, conflicts, null, 400);
    const id = await createOrganization(
      formData.name, formData.description, formData.contactEmail, "placeholder-logo.png"
    );
    return res.redirect(303, `/organization/${id}`);
  } catch (error) {
    const errors = duplicateErrors(error);
    if (errors) return renderOrganizationForm(res, formData, errors, null, 400);
    next(error);
  }
};

export const showEditOrganizationForm = async (req, res, next) => {
  try {
    const organization = await getOrganizationById(req.params.id);
    if (!organization) return organizationNotFound(res);
    return renderOrganizationForm(res, {
      name: organization.name,
      description: organization.description,
      contactEmail: organization.contact_email,
      logoFilename: organization.logo_filename,
    }, {}, organization.organization_id);
  } catch (error) {
    next(error);
  }
};

export const processEditOrganizationForm = async (req, res, next) => {
  const id = Number(req.params.id);
  const formData = getFormData(req.body);
  try {
    const organization = await getOrganizationById(id);
    if (!organization) return organizationNotFound(res);
    const errors = formErrors(req);
    if (Object.keys(errors).length) return renderOrganizationForm(res, formData, errors, id, 400);
    const conflicts = await checkOrganizationConflicts(formData, id);
    if (Object.keys(conflicts).length) return renderOrganizationForm(res, formData, conflicts, id, 400);
    const updatedId = await updateOrganization(
      id, formData.name, formData.description, formData.contactEmail, formData.logoFilename
    );
    if (!updatedId) return organizationNotFound(res);
    return res.redirect(303, `/organization/${updatedId}`);
  } catch (error) {
    const errors = duplicateErrors(error);
    if (errors) return renderOrganizationForm(res, formData, errors, id, 400);
    next(error);
  }
};

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

    if (!isValidOrganizationId(id)) {
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

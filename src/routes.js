import express from "express";
import { showHomePage } from "./controllers/home.js";
import {
  showOrganizationsPage,
  showOrganizationDetailsPage,
  showNewOrganizationForm,
  processNewOrganizationForm,
  showEditOrganizationForm,
  processEditOrganizationForm,
  organizationValidation,
  organizationLogoValidation,
  validateOrganizationId,
} from "./controllers/organizations.js";
import {
  showProjectsPage,
  showProjectDetailsPage,
  showNewProjectForm,
  processNewProjectForm,
  showEditProjectForm,
  processEditProjectForm,
  projectValidation,
  validateProjectId,
  showCategoryAssignments,
  processCategoryAssignments,
} from "./controllers/projects.js";
import {
  showCategoriesPage,
  showCategoryDetailsPage,
  showNewCategoryForm,
  processNewCategoryForm,
  showEditCategoryForm,
  processEditCategoryForm,
  categoryValidation,
  validateCategoryId,
} from "./controllers/categories.js";

const router = express.Router();

router.get("/", showHomePage);
router.get("/organizations", showOrganizationsPage);
router.get("/new-organization", showNewOrganizationForm);
router.post("/new-organization", organizationValidation, processNewOrganizationForm);
router.get("/edit-organization/:id", validateOrganizationId, showEditOrganizationForm);
router.post("/edit-organization/:id", validateOrganizationId,
  organizationValidation, organizationLogoValidation, processEditOrganizationForm);
router.get("/organization/:id", showOrganizationDetailsPage);
router.get("/projects", showProjectsPage);
router.get("/new-project", showNewProjectForm);
router.post("/new-project", projectValidation, processNewProjectForm);
router.get("/edit-project/:id", validateProjectId, showEditProjectForm);
router.post("/edit-project/:id", validateProjectId, projectValidation, processEditProjectForm);
router.get("/project/:id", showProjectDetailsPage);
router.get("/project/:id/categories", validateProjectId, showCategoryAssignments);
router.post("/project/:id/categories", validateProjectId, processCategoryAssignments);
router.get("/categories", showCategoriesPage);
router.get("/new-category", showNewCategoryForm);
router.post("/new-category", categoryValidation, processNewCategoryForm);
router.get("/edit-category/:id", validateCategoryId, showEditCategoryForm);
router.post("/edit-category/:id", validateCategoryId, categoryValidation, processEditCategoryForm);
router.get("/category/:id", showCategoryDetailsPage);

export default router;

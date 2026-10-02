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

import {
  showUserRegistrationForm, processUserRegistrationForm, registrationValidation,
  showLoginForm, processLoginForm, loginValidation, processLogout,
  requireLogin, requireRole, showDashboard, showUsersPage,
} from "./controllers/users.js";

const router = express.Router();
router.get("/register", showUserRegistrationForm);
router.post("/register", registrationValidation, processUserRegistrationForm);
router.get("/login", showLoginForm);
router.post("/login", loginValidation, processLoginForm);
router.get("/logout", processLogout);
router.get("/dashboard", requireLogin, showDashboard);
router.get("/users", requireLogin, requireRole("admin"), showUsersPage);

router.get("/", showHomePage);
router.get("/organizations", showOrganizationsPage);
router.get("/new-organization", requireLogin, requireRole("admin"), showNewOrganizationForm);
router.post("/new-organization", requireLogin, requireRole("admin"), organizationValidation, processNewOrganizationForm);
router.get("/edit-organization/:id", requireLogin, requireRole("admin"), validateOrganizationId, showEditOrganizationForm);
router.post("/edit-organization/:id", requireLogin, requireRole("admin"), validateOrganizationId,
  organizationValidation, organizationLogoValidation, processEditOrganizationForm);
router.get("/organization/:id", showOrganizationDetailsPage);
router.get("/projects", showProjectsPage);
router.get("/new-project", requireLogin, requireRole("admin"), showNewProjectForm);
router.post("/new-project", requireLogin, requireRole("admin"), projectValidation, processNewProjectForm);
router.get("/edit-project/:id", requireLogin, requireRole("admin"), validateProjectId, showEditProjectForm);
router.post("/edit-project/:id", requireLogin, requireRole("admin"), validateProjectId, projectValidation, processEditProjectForm);
router.get("/project/:id", showProjectDetailsPage);
router.get("/project/:id/categories", requireLogin, requireRole("admin"), validateProjectId, showCategoryAssignments);
router.post("/project/:id/categories", requireLogin, requireRole("admin"), validateProjectId, processCategoryAssignments);
router.get("/categories", showCategoriesPage);
router.get("/new-category", requireLogin, requireRole("admin"), showNewCategoryForm);
router.post("/new-category", requireLogin, requireRole("admin"), categoryValidation, processNewCategoryForm);
router.get("/edit-category/:id", requireLogin, requireRole("admin"), validateCategoryId, showEditCategoryForm);
router.post("/edit-category/:id", requireLogin, requireRole("admin"), validateCategoryId, categoryValidation, processEditCategoryForm);
router.get("/category/:id", showCategoryDetailsPage);

export default router;

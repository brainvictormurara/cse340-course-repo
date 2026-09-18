import express from "express";
import { showHomePage } from "./controllers/home.js";
import {
  showOrganizationsPage,
  showOrganizationDetailsPage,
} from "./controllers/organizations.js";
import {
  showProjectsPage,
  showProjectDetailsPage,
} from "./controllers/projects.js";
import { showCategoriesPage } from "./controllers/categories.js";
import { showCategoryDetailsPage } from "./controllers/categories.js";

const router = express.Router();

router.get("/", showHomePage);
router.get("/organizations", showOrganizationsPage);
router.get("/organization/:id", showOrganizationDetailsPage);
router.get("/projects", showProjectsPage);
router.get("/project/:id", showProjectDetailsPage);
router.get("/categories", showCategoriesPage);
router.get("/category/:id", showCategoryDetailsPage);

export default router;
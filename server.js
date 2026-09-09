import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { getAllOrganizations } from "./src/models/organizations.js";
import { getAllProjects } from "./src/models/projects.js";
import { getAllCategories } from "./src/models/categories.js";
const nodeEnv = process.env.NODE_ENV?.toLowerCase() || "production";
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as the templating engine
app.set("view engine", "ejs");

// Tell Express where to find the templates
app.set("views", path.join(__dirname, "src/views"));

// Routes
app.get("/", async (req, res) => {
  const title = "Home";
  res.render("home", { title });
});

app.get("/organizations", async (req, res) => {
  try {
    const title = "Our Partner Organizations";
    const organizations = await getAllOrganizations();

    res.render("organizations", { title, organizations });
  } catch (error) {
    console.error("Error retrieving organizations:", error);
    res.status(500).send("Unable to retrieve organizations.");
  }
});

app.get("/projects", async (req, res) => {
  try {
    const title = "Service Projects";
    const projects = await getAllProjects();

    res.render("projects", { title, projects });
  } catch (error) {
    console.error("Error retrieving projects:", error);
    res.status(500).send("Unable to retrieve projects.");
  }
});
app.get("/categories", async (req, res) => {
  try {
    const title = "Service Project Categories";
    const categories = await getAllCategories();

    res.render("categories", { title, categories });
  } catch (error) {
    console.error("Error retrieving categories:", error);
    res.status(500).send("Unable to retrieve categories.");
  }
});
app.listen(port, () => {
  console.log(`Server is running at http://127.0.0.1:${port}`);
  console.log(`Environment: ${nodeEnv}`);
});
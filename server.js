import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import routes from "./src/routes.js";

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

app.use(routes);

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page Not Found",
    statusCode: 404,
    message: "The page you requested could not be found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Application error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).render("error", {
    title: "Server Error",
    statusCode: 500,
    message: "Something went wrong while processing your request.",
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://127.0.0.1:${port}`);
  console.log(`Environment: ${nodeEnv}`);
});
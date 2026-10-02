import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import routes from "./src/routes.js";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import flash from "connect-flash";
import pool from "./src/database.js";
import { loadCurrentUser } from "./src/controllers/users.js";
import "dotenv/config";

const nodeEnv = process.env.NODE_ENV?.toLowerCase() || "production";
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = ({ sessionStore, sessionSecret = process.env.SESSION_SECRET,
  production = process.env.NODE_ENV === "production" } = {}) => {
if (!sessionSecret) throw new Error("SESSION_SECRET must be set before starting the server.");
const app = express();
if (production) app.set("trust proxy", 1);

// Parse organization form submissions before the routes run.
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as the templating engine
app.set("view engine", "ejs");

// Tell Express where to find the templates
app.set("views", path.join(__dirname, "src/views"));

const PgStore = connectPgSimple(session);
app.use(session({
  name: "cse340.sid",
  secret: sessionSecret,
  store: sessionStore || new PgStore({ pool, tableName: "user_sessions" }),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: production, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 },
}));
app.use(flash());
app.use(loadCurrentUser);
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

return app;
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  createApp().listen(port, () => {
    console.log(`Server is running at http://127.0.0.1:${port}`);
    console.log(`Environment: ${nodeEnv}`);
  });
}

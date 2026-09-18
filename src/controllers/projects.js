import {
  getUpcomingProjects,
  getCategoriesByProject,
  getProjectDetails,
} from "../models/projects.js";

const NUMBER_OF_UPCOMING_PROJECTS = 5;

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

    if (!/^\d+$/.test(id)) {
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
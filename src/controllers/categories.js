import {
  getAllCategories,
  getCategoryById,
  getProjectsByCategory,
} from "../models/categories.js";

export const showCategoriesPage = async (req, res, next) => {
  try {
    const categories = await getAllCategories();

    res.render("categories", {
      title: "Service Project Categories",
      categories,
    });
  } catch (error) {
    next(error);
  }
};

export const showCategoryDetailsPage = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!/^\d+$/.test(id)) {
      return res.status(404).render("error", {
        title: "Category Not Found",
        statusCode: 404,
        message: "The service project category you requested could not be found.",
      });
    }

    const category = await getCategoryById(id);

    if (!category) {
      return res.status(404).render("error", {
        title: "Category Not Found",
        statusCode: 404,
        message: "The service project category you requested could not be found.",
      });
    }

    const projects = await getProjectsByCategory(id);

    res.render("category", {
      title: category.name,
      category,
      projects,
    });
  } catch (error) {
    next(error);
  }
};
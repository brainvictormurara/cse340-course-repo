import { body, validationResult } from "express-validator";
import {
  getAllCategories,
  getCategoryById,
  getProjectsByCategory,
  createCategory,
  updateCategory,
} from "../models/categories.js";

const isValidCategoryId = (id) => typeof id === "string" && /^\d+$/.test(id) &&
  Number.isSafeInteger(Number(id)) && Number(id) > 0 && Number(id) <= 2147483647;

const categoryNotFound = (res) => res.status(404).render("error", {
  title: "Category Not Found", statusCode: 404,
  message: "The service project category you requested could not be found.",
});

export const validateCategoryId = (req, res, next) => {
  if (!isValidCategoryId(req.params.id)) return categoryNotFound(res);
  next();
};

export const categoryValidation = [
  body("name")
    .isString().withMessage("Category name must be text.").bail()
    .trim()
    .notEmpty().withMessage("Category name is required.").bail()
    .isLength({ min: 3, max: 100 })
    .withMessage("Category name must be between 3 and 100 characters.").bail()
    .custom((value) => !value.includes("\0"))
    .withMessage("Category name contains an invalid character."),
];

const renderCategoryForm = (res, name = "", error = "", id = null, status = 200) =>
  res.status(status).render(id === null ? "new-category" : "edit-category", {
    title: id === null ? "Create New Category" : "Edit Category",
    categoryId: id, name, error,
  });

export const showNewCategoryForm = (req, res) => renderCategoryForm(res);

export const showEditCategoryForm = async (req, res, next) => {
  try {
    const category = await getCategoryById(req.params.id);
    if (!category) return categoryNotFound(res);
    return renderCategoryForm(res, category.name, "", category.category_id);
  } catch (error) { next(error); }
};

const processCategoryForm = async (req, res, next, id = null) => {
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  try {
    if (id !== null && !await getCategoryById(id)) return categoryNotFound(res);
    const results = validationResult(req);
    if (!results.isEmpty()) {
      return renderCategoryForm(res, name, results.array()[0].msg, id, 400);
    }
    const savedId = id === null ? await createCategory(name) : await updateCategory(id, name);
    if (!savedId) return categoryNotFound(res);
    return res.redirect(303, `/category/${savedId}`);
  } catch (error) {
    if (error.code === "23505" && error.constraint === "category_name_key") {
      return renderCategoryForm(res, name, "A category with this name already exists.", id, 400);
    }
    next(error);
  }
};

export const processNewCategoryForm = (req, res, next) => processCategoryForm(req, res, next);
export const processEditCategoryForm = (req, res, next) =>
  processCategoryForm(req, res, next, Number(req.params.id));

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

    if (!isValidCategoryId(id)) {
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

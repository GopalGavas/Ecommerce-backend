import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Category } from "../models/category.model.js";
import slugify from "slugify";
import { isValidObjectId } from "mongoose";

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, "Category Name is required");
  }

  const category = await Category.create({
    name,
    slug: slugify(name),
  });

  if (!category) {
    throw new ApiError(500, "Something went wrong while creating category");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { catId } = req.params;
  const { name } = req.body;

  if (!isValidObjectId(catId)) {
    throw new ApiError(400, "Invalid category Id");
  }

  if (!name) {
    throw new ApiError(400, "Name of the Category is required to Update");
  }

  const category = await Category.findById(catId);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    catId,
    {
      name,
      slug: slugify(name),
    },
    {
      new: true,
    }
  );

  if (!updatedCategory) {
    throw new ApiError(500, "Something went wrong while updating the category");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCategory, "Category updated successfully")
    );
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { catId } = req.params;

  if (!isValidObjectId(catId)) {
    throw new ApiError(400, "Invalid category Id");
  }

  const deletedCategory = await Category.findByIdAndDelete(catId);

  if (!deletedCategory) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted permanently"));
});

const getCategoryById = asyncHandler(async (req, res) => {
  const { catId } = req.params;

  if (!isValidObjectId(catId)) {
    throw new ApiError(400, "Invalid category Id");
  }

  const category = await Category.findById(catId); // Fetch category by ID

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category retrieved successfully"));
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find(); // Fetch all categories

  return res
    .status(200)
    .json(
      new ApiResponse(200, categories, "Categories retrieved successfully")
    );
});

export {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
  getAllCategories,
};

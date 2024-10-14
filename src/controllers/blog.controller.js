import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Blog } from "../models/blog.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { isValidObjectId } from "mongoose";

const createBlog = asyncHandler(async (req, res) => {
  const { title, description, category, content } = req.body;

  if (!title || !description || !category || !content) {
    throw new ApiError(
      400,
      "Title , description, category and content fields are required"
    );
  }

  let blogImageLocalPath;
  if (req.file) {
    blogImageLocalPath = req.file.path; // For single file upload
  }

  const blogImage = await uploadOnCloudinary(blogImageLocalPath);

  const blog = await Blog.create({
    title,
    description,
    category,
    content,
    image: blogImage?.path || undefined,
    author: req.user?._id,
  });

  if (!blog) {
    throw new ApiError(500, "Something went wrong while creating the blog");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, blog, "Blog created successfully"));
});

const updateBlogDetails = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { title, category, description, content } = req.body;

  if (!isValidObjectId(blogId)) {
    throw new ApiError(400, "Invalid Blog Id");
  }

  if (!title && !description && !category && !content) {
    throw new ApiError(400, "Atlast one field is required to update");
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  if (
    blog?.author.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(401, "You are not authorized for this action");
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    blogId,
    {
      $set: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(content && { content }),
      },
    },
    {
      new: true,
    }
  );

  if (!updateBlog) {
    throw new ApiError(500, "Something went wrong while updating the blog");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedBlog, "Blog updated successfully"));
});

const updateBlogImage = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const blogImageLocalPath = req.file?.path;

  if (!isValidObjectId(blogId)) {
    throw new ApiError(400, "Invalid Blog Id");
  }
  const blog = await Blog.findById(blogId).select("image, author");

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  if (
    blog.author?.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(401, "You are not authorized for this action");
  }

  if (!blogImageLocalPath) {
    throw new ApiError(404, "local path for blog Image not found");
  }

  const blogImage = await uploadOnCloudinary(blogImageLocalPath);

  const oldblogImage = blog?.image;
  const updatedBlogImage = await Blog.findByIdAndUpdate(
    blogId,
    {
      $set: {
        image: blogImage?.url,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedBlogImage) {
    throw new ApiError(
      500,
      "Something went wrong while updating the blogImage"
    );
  }

  if (oldblogImage) {
    const publicId = oldblogImage.split("/").pop().split(".")[0];

    await deleteFromCloudinary(publicId);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedBlogImage, "Blog Image updated successfully")
    );
});

const deleteBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.params;

  if (!isValidObjectId(blogId)) {
    throw new ApiError(400, "Invalid Blog Id");
  }

  const blog = await Blog.findById(blogId).select("author image");

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  const image = blog?.image;

  const publicIdImage = image.split("/").pop().split(".")[0];

  if (
    blog.author.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(401, "You are not authorized for this action");
  }

  const deletedBlog = await Blog.findByIdAndDelete(blogId);

  if (!deletedBlog) {
    throw new ApiError(500, "Something went wrong while deleting the blog");
  }

  await deleteFromCloudinary(publicIdImage);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Your blog is permanently deleted"));
});

export { createBlog, updateBlogDetails, updateBlogImage, deleteBlog };

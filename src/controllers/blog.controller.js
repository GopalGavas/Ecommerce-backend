import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Blog } from "../models/blog.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/likes.model.js";

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

  if (!updatedBlog) {
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

const getBlogById = asyncHandler(async (req, res) => {
  const { blogId } = req.params;

  if (!isValidObjectId(blogId)) {
    throw new ApiError(400, "Ivalid Object Id");
  }

  const blog = await Blog.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(blogId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "blog",
        as: "likes",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "likedBy",
              foreignField: "_id",
              as: "likedByDetails",
            },
          },
          {
            $unwind: "$likedByDetails",
          },
          {
            $addFields: {
              fullName: "$likedByDetails.fullName",
            },
          },
          {
            $project: {
              _id: 0,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "authorDetails",
      },
    },
    {
      $addFields: {
        totalLikes: {
          $size: "$likes",
        },
        authorDetails: {
          $first: "$authorDetails",
        },
      },
    },
    {
      $addFields: {
        author: "$authorDetails.fullName",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        category: 1,
        content: 1,
        image: 1,
        numViews: 1,
        totalLikes: 1,
        likes: 1,
        author: 1,
      },
    },
  ]);

  // Handle case where the blog is not found
  if (!blog || blog.length === 0) {
    throw new ApiError(404, "Blog not found");
  }

  await Blog.findByIdAndUpdate(
    blogId,
    {
      $inc: {
        numViews: 1,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, blog[0], "Blog fetched successfully"));
});

const getAllBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageSize = parseInt(limit, 10);
  const currentPage = parseInt(page, 10);

  const skip = (currentPage - 1) * pageSize;

  const blogs = await Blog.aggregate([
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "blog",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "authorDetails",
      },
    },
    {
      $addFields: {
        totalLikes: {
          $size: "$likes",
        },
        author: {
          $first: "$authorDetails",
        },
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        category: 1,
        content: 1,
        image: 1,
        numViews: 1,
        totalLikes: 1,
        "author.fullName": 1,
        "author._id": 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: pageSize,
    },
  ]);

  const totalBlogs = await Blog.countDocuments();

  return res.status(200).json(
    new ApiResponse(200, {
      blogs,
      currentPage,
      totalPages: Math.ceil(totalBlogs / pageSize),
      totalBlogs,
    })
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

  await Like.deleteMany({
    blog: blogId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Your blog is permanently deleted"));
});

export {
  createBlog,
  updateBlogDetails,
  updateBlogImage,
  getBlogById,
  getAllBlogs,
  deleteBlog,
};

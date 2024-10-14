import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Like } from "../models/likes.model.js";
import { Blog } from "../models/blog.model.js";
import { isValidObjectId } from "mongoose";

const toggleBlogLike = asyncHandler(async (req, res) => {
  const { blogId } = req.params;

  if (!isValidObjectId(blogId)) {
    throw new ApiError(400, "Invalid Blog Id");
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  const likedBlog = await Like.findOne({
    blog: blogId,
    likedBy: req.user?._id,
  });

  if (likedBlog) {
    await Like.findByIdAndDelete(likedBlog._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { blogId, isLiked: false }, "Blog unliked"));
  } else {
    await Like.create({
      blog: blogId,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { blogId, isLiked: true }, "Blog Liked"));
  }
});

export { toggleBlogLike };

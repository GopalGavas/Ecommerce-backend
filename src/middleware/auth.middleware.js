import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";

const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-refreshToken -password"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access Token");
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new ApiError(401, "Invalid access token");
    }
    throw new ApiError(
      401,
      error.message || "Something went wrong in verifyJWT"
    );
  }
});

const isAdmin = asyncHandler(async (req, _, next) => {
  const { email } = req.user;

  const user = await User.findOne({ email });

  if (user?.role !== "admin") {
    throw new ApiError(
      401,
      "You are not authorized for this action since you are not a admin"
    );
  }

  next();
});

export { verifyJwt, isAdmin };

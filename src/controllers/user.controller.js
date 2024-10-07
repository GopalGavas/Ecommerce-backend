import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils//apiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  try {
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access Token" ||
        error.message
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // [take the data from body]
  const { fullName, email, phoneNo, password } = req.body;

  // [validate data]
  if (
    [fullName, email, phoneNo, password].some(
      (field) => !field || field.trim === ""
    )
  ) {
    throw new ApiError(
      400,
      "fullName , email, phoneNo and password are required"
    );
  }

  // [check for existing user]

  const existingUser = await User.findOne({
    $or: [{ email }, { phoneNo }],
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  // [create User]
  const user = await User.create({
    fullName,
    email,
    phoneNo,
    password,
  });

  const createdUser = await User.findById(user?._id).select(
    "-refreshToken -password"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, phoneNo, password } = req.body;

  if (!email?.trim() && !phoneNo?.trim()) {
    throw new ApiError("Email or phoneNo is required for login");
  }

  const user = await User.findOne({
    $or: [{ email }, { phoneNo }],
  }).select("-refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found / user does not exists");
  }

  const verfiyPassword = await user.comparePassword(password);

  if (!verfiyPassword) {
    throw new ApiError(400, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user?._id
  );

  user.refreshToken = refreshToken;
  await user.save();

  user.refreshToken = undefined;
  user.password = undefined;

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "User logged In successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user?._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Error refreshing access token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };

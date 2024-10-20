import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";

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
    throw new ApiError(400, "Invalid credentials");
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
      $unset: {
        refreshToken: "",
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  return res
    .status(204)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .send();
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Invalid request , cant find you refreshToken");
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

    if (incomingRefreshToken !== user?.refreshToken) {
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
    throw new ApiError(
      401,
      "unauthorized request , can't refresh accessToken" || error.message
    );
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "old Password and new Password are required");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.comparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Password");
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "password changed successfully"));
});

const saveAddress = asyncHandler(async (req, res) => {
  const { address, addressId } = req.body;

  if (
    !address ||
    !address.type ||
    !address.street ||
    !address.city ||
    !address.code
  ) {
    throw new ApiError(400, "Your complete address is required");
  }

  const user = await User.findById(req.user?._id);

  if (addressId) {
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      throw new ApiError(404, "address not found");
    }

    user.addresses[addressIndex] = address;
  } else {
    user.addresses.push(address);
  }

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "address saved successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Enter a valid User Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email, phoneNo } = req.body;

  if (!fullName && !email && !phoneNo) {
    throw new ApiError(
      400,
      "At least one of fullName, email, or phoneNo is required for updating."
    );
  }

  // [Check if email number already exists in the database]
  if (email) {
    const existingEmailUser = await User.findOne({ email });
    if (
      existingEmailUser &&
      existingEmailUser._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(400, "Email is already in use by another user.");
    }
  }

  // [Check if phone number already exists in the database]
  if (phoneNo) {
    const existingPhoneUser = await User.findOne({ phoneNo });
    if (
      existingPhoneUser &&
      existingPhoneUser._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(
        400,
        "Phone number is already in use by another user."
      );
    }
  }

  const updateUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(phoneNo && { phoneNo }),
      },
    },
    { new: true }
  ).select("-password");

  if (!updateUser) {
    throw new ApiError(500, "Something went wrong while updating the user");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updateUser, "User details updated successfully")
    );
});

const toggleWishList = asyncHandler(async (req, res) => {
  const { prodId } = req.params;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid product Id");
  }

  const product = await Product.findById(prodId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const user = await User.findById(req.user?._id);
  const inWishList = user.wishlist.includes(prodId);

  if (inWishList) {
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== prodId.toString()
    );

    await user.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { prodId, inWishList: false },
          "Product removed from wishlist"
        )
      );
  } else {
    user.wishlist.push(prodId);
    await user.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { prodId, inWishList: true },
          "Product added to wishlist"
        )
      );
  }
});

const getWishList = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).populate({
    path: "wishlist",
    select: "title price brand",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, user.wishlist, "Wishlist fetched successfully"));
});

////////////// "ADMIN RELATED ACTIONS AND ACCOUNT HOLDERS ACTIONS"////////////////
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, phoneNo, password } = req.body;

  // Ensure email or phone number is provided and not empty
  if ((!email || !email.trim()) && (!phoneNo || !phoneNo.trim())) {
    throw new ApiError(400, "Email or phone number is required for login");
  }

  // Ensure password is provided
  if (!password || !password.trim()) {
    throw new ApiError(400, "Password is required for login");
  }

  // Find admin by email or phone number
  const admin = await User.findOne({
    $or: [{ email }, { phoneNo }],
  }).select("-refreshToken");

  if (!admin) {
    throw new ApiError(404, "Admin not found / Admin does not exist");
  }

  // Check if the user has admin privileges
  if (admin.role !== "admin") {
    throw new ApiError(401, "Warning!! Only Admins can login here");
  }

  // Verify password
  const verifyPassword = await admin.comparePassword(password);

  if (!verifyPassword) {
    throw new ApiError(400, "Invalid credentials");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    admin._id
  );

  // Save refresh token in the admin's document
  admin.refreshToken = refreshToken;
  await admin.save();

  // Remove sensitive data before sending the response
  admin.refreshToken = undefined;
  admin.password = undefined;

  const options = {
    httpOnly: true,
    secure: true, // Make sure this is only used in a production environment (e.g., behind HTTPS)
  };

  // Return response with cookies and data
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { admin, accessToken, refreshToken },
        "Admin logged in successfully"
      )
    );
});

const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Enter a valid user Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isBlocked) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User is already blocked"));
  }

  const updatedUser = await User.findByIdAndUpdate(
    user?._id,
    { $set: { isBlocked: true } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User blocked successfully"));
});

const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Enter a valid User Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isBlocked) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User is already unblocked"));
  }

  const updatedUser = await User.findByIdAndUpdate(
    user?._id,
    { $set: { isBlocked: false } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User unblocked successfully"));
});

const deactivateOwnAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { isDeleted: true } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "Your account has been deactivated and session invalidated"
      )
    );
});

const deleteOwnAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user?._id);

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "Your account has been permanently deleted and session invalidated"
      )
    );
});

const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isDeleted) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User is already Deactivated"));
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        isDeleted: true,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "User account has been deactivated"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await User.findByIdAndDelete(userId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "User account has been permanently deleted")
    );
});

const reactivateAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user Id");
  }

  const user = await User.findById(userId);

  if (!user) throw new ApiError(404, "User not found");
  if (!user.isDeleted) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Account is already active"));
  }

  user.isDeleted = false;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Account reactivated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  saveAddress,
  getCurrentUser,
  getUserById,
  updateUserDetails,
  toggleWishList,
  getWishList,
  loginAdmin,
  blockUser,
  unblockUser,
  deactivateOwnAccount,
  deleteOwnAccount,
  deactivateUser,
  deleteUser,
  reactivateAccount,
};

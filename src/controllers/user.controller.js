import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { sendEmail } from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
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
  const { fullName, email, phoneNo, password } = req.body;

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

  const existingUser = await User.findOne({
    $or: [{ email }, { phoneNo }],
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

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
    sameSite: "Lax",
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
  if (!req.user?._id) {
    throw new ApiError(401, "User not logged In");
  }

  const user = await User.findById(req.user?._id).populate({
    path: "wishlist",
    select: "title brand price",
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.wishlist || user.wishlist.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          [],
          "You have not added anything to  your wishlist"
        )
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, user.wishlist, "User wishlist fetched successfully")
    );
});

const generateForgetPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const token = await user.generateResetPasswordToken();
  await user.save();

  const resetUrl = `Hi Please follow this link to reset your password , it is only valid for next 10 minutes <a href="http://localhost:8080/api/v1/users/reset-password/${token}">Click here</a>`;
  await sendEmail(
    email,
    "Forgot Password Link",
    `Hey, ${user.fullName}`,
    resetUrl
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        token,
        "Forgot password token generated successfully"
      )
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const { token } = req.params;

  if (!newPassword) {
    throw new ApiError(400, "New Password is required to reset password");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(404, "Invalid or  expired token");
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Password Reset successfull"));
});

////////////// "ADMIN RELATED ACTIONS AND ACCOUNT HOLDERS ACTIONS"////////////////
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, phoneNo, password } = req.body;

  if ((!email || !email.trim()) && (!phoneNo || !phoneNo.trim())) {
    throw new ApiError(400, "Email or phone number is required for login");
  }

  if (!password || !password.trim()) {
    throw new ApiError(400, "Password is required for login");
  }

  const admin = await User.findOne({
    $or: [{ email }, { phoneNo }],
  }).select("-refreshToken");

  if (!admin) {
    throw new ApiError(404, "Admin not found / Admin does not exist");
  }

  if (admin.role !== "admin") {
    throw new ApiError(401, "Warning!! Only Admins can login here");
  }

  const verifyPassword = await admin.comparePassword(password);

  if (!verifyPassword) {
    throw new ApiError(400, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    admin._id
  );

  admin.refreshToken = refreshToken;
  await admin.save();

  admin.refreshToken = undefined;
  admin.password = undefined;

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
    sameSite: "Lax",
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
  await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { isDeleted: true } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
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
  generateForgetPasswordToken,
  resetPassword,
  loginAdmin,
  blockUser,
  unblockUser,
  deactivateOwnAccount,
  deleteOwnAccount,
  deleteUser,
  reactivateAccount,
};

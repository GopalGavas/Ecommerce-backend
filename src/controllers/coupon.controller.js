import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Coupon } from "../models/coupon.model.js";
import { isValidObjectId } from "mongoose";

const createCoupon = asyncHandler(async (req, res) => {
  const { name, expiry, discount } = req.body;

  if (!name || !expiry || !discount) {
    throw new ApiError(
      400,
      "name, expiry and discount of the coupon are required"
    );
  }

  const expiryDate = new Date(expiry);
  expiryDate.setHours(23, 59, 59, 999);
  if (expiryDate <= new Date()) {
    throw new ApiError(400, "Expiry date should be in future");
  }

  if (discount <= 0 || discount > 100) {
    throw new ApiError(400, "Discount should be between 1 and 100");
  }

  const existingCoupon = await Coupon.findOne({ name });

  if (existingCoupon) {
    throw new ApiError(400, "Coupon of this name already  exists");
  }

  const coupon = await Coupon.create({
    name,
    expiry,
    discount,
  });

  if (!coupon) {
    throw new ApiError(500, "Something went wrong while creating the coupon");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, coupon, "Coupon created successfully"));
});

const updateCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  const { name, expiry, discount } = req.body;

  if (!isValidObjectId(couponId)) {
    throw new ApiError(400, "Invalid  coupon id");
  }

  if (!name && !expiry && !discount) {
    throw new ApiError(
      400,
      "Provide name, expiry or discount on the coupon that you want to update"
    );
  }

  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  const updatedCoupon = await Coupon.findByIdAndUpdate(
    couponId,
    {
      ...(name && { name }),
      ...(expiry && { expiry }),
      ...(discount && { discount }),
    },
    { new: true }
  );

  if (!updatedCoupon) {
    throw new ApiError(500, "Something went wrong while updating the coupon");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCoupon, "Coupon updated successfully"));
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;

  if (!isValidObjectId(couponId)) {
    throw new ApiError(400, "Invalid Coupon Id");
  }

  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  const deleteCoupon = await Coupon.findByIdAndDelete(couponId);

  if (!deleteCoupon) {
    throw new ApiError(500, "Something went wrong while deleting the coupon");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Coupon deleted successfully"));
});

const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({});

  return res
    .status(200)
    .json(new ApiResponse(200, coupons, "All coupons fetched successfully"));
});

export { createCoupon, updateCoupon, deleteCoupon, getAllCoupons };

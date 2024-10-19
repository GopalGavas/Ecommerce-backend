import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Enquiry } from "../models/enquiry.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { isValidObjectId } from "mongoose";

const createEnquiry = asyncHandler(async (req, res) => {
  const { prodId, orderId, message, enquiryType } = req.body;

  if (!message) {
    throw new ApiError(400, "Enquiry statement is required");
  }

  if (!["product", "order", "general", "other"].includes(enquiryType)) {
    throw new ApiError(400, "Invalid enquiry type");
  }

  let product;
  let order;

  if (prodId) {
    product = await Product.findById(prodId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
  }

  if (orderId) {
    order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
  }

  const enquiry = await Enquiry.create({
    user: req.user?._id,
    product: product || null,
    order: order || null,
    message,
    status: "pending",
    enquiryType,
  });

  if (!enquiry) {
    throw new ApiError(500, "Something went wrong while  creating enquiry");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, enquiry, "enquiry created successfully"));
});

const updateEnquiry = asyncHandler(async (req, res) => {
  const { enquiryId } = req.params;
  const { prodId, orderId, message, enquiryType } = req.body;

  if (!isValidObjectId(enquiryId)) {
    throw new ApiError(400, "Invalid Enquiry Id");
  }

  let product;
  let order;

  if (prodId) {
    product = await Product.findById(prodId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
  }

  if (orderId) {
    order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
  }

  const enquiry = await Enquiry.findByIdAndUpdate(
    enquiryId,
    {
      $set: {
        ...(message && { message }),
        ...(product && { product }),
        ...(order && { order }),
        ...(enquiryType && { enquiryType }),
      },
    },
    { new: true }
  );

  if (!enquiry) {
    throw new ApiError(404, "Enquiry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, enquiry, "Enquiry updated successfully"));
});

const respondToEnquiry = asyncHandler(async (req, res) => {
  const { enquiryId } = req.params;
  const { response } = req.body;

  if (!isValidObjectId(enquiryId)) {
    throw new ApiError(400, "Invalid enquiry Id");
  }

  if (!response) {
    throw new ApiError(400, "Response can be Empty");
  }

  const enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    throw new ApiError(404, "Enquiry not found");
  }

  enquiry.response = response;
  enquiry.status = "resolved";

  await enquiry.save();

  return res
    .status(200)
    .json(new ApiResponse(200, enquiry, "Enquiry resolved successfully"));
});

const deleteEnquiry = asyncHandler(async (req, res) => {
  const { enquiryId } = req.params;

  if (!isValidObjectId) {
    throw new ApiError(400, "Invalid Enquiry Id");
  }

  const enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    throw new ApiError(404, "Enquiry not found");
  }

  if (
    enquiry.user.toString() !== req.user?._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(401, "You are not authorized to delete this enquiry");
  }

  await Enquiry.findByIdAndDelete(enquiryId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Enquiry deleted successfully"));
});

export { createEnquiry, updateEnquiry, respondToEnquiry, deleteEnquiry };

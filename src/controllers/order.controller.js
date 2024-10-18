import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { isValidObjectId } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const createOrder = asyncHandler(async (req, res) => {
  const { paymentIntent, paymentMethod } = req.body;

  if (!["Card", "COD"].includes(paymentMethod)) {
    throw new ApiError(400, "Invalid Payment method");
  }

  const cart = await Cart.findOne({ orderBy: req.user?._id });

  if (!cart || cart.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  const trackingNumber = uuidv4();

  const orderData = {
    products: cart.products,
    paymentMethod: paymentMethod || "Card",
    trackingNumber,
    orderBy: req.user?._id,
  };

  if (paymentMethod === "Card") {
    if (!paymentIntent) {
      throw new ApiError(400, "Card details are required");
    }

    orderData.paymentIntent = paymentIntent;
    orderData.paymentStatus = "Completed";
  }

  const order = new Order(orderData);
  await order.save();

  cart.products = [];
  cart.appliedCoupons = [];
  cart.cartTotal = 0;
  cart.TotalAfterDiscount = 0;
  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order created successfully"));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId, status } = req.body;

  if (!isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid object Id");
  }

  const validStatuses = [
    "Not Processed",
    "Processed",
    "Dispatched",
    "Cancelled",
    "Delivered",
  ];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid order status");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.orderStatus = status;
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order Status updated successfully"));
});

const updatePaymentStatusForCOD = asyncHandler(async (req, res) => {
  const { orderId, status } = req.body;

  if (!["Completed", "Failed"].includes(status)) {
    throw new ApiError(400, "Invalid payment status for COD");
  }

  const order = await Order.findOne({ _id: orderId, paymentMethod: "COD" });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.paymentStatus = status;
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Payment status updated for COD order"));
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid Order Id");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.orderBy.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorized to cancel this order");
  }

  if (["Dispatched", "Delivered"].includes(order.orderStatus)) {
    throw new ApiError(
      400,
      "Cannot cancel order which is alredy dispatched or delivered"
    );
  }

  order.orderStatus = "Cancelled";
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Your order is Cancelled"));
});

const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "Invalid Order Id");
  }

  const order = await Order.findById(orderId).select(
    "orderStatus trackingNumber orderBy"
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (
    order.orderBy.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(401, "You are not authorized to track this order");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        trackingNumber: order.trackingNumber,
        orderStatus: order.orderStatus,
      },
      "You can track your order with the provided tracking number"
    )
  );
});

export {
  createOrder,
  updateOrderStatus,
  updatePaymentStatusForCOD,
  cancelOrder,
  trackOrder,
};

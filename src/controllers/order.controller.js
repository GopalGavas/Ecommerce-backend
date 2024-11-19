import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Product } from "../models/product.model.js";

const createOrder = asyncHandler(async (req, res) => {
  const { paymentIntent, paymentMethod } = req.body;

  if (!["Card", "COD"].includes(paymentMethod)) {
    throw new ApiError(400, "Invalid Payment method");
  }

  const cart = await Cart.findOne({ orderBy: req.user?._id });

  if (!cart || cart.products.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  const trackingNumber = uuidv4();

  const orderData = {
    products: cart.products,
    paymentMethod,
    trackingNumber,
    orderBy: req.user?._id,
  };

  if (paymentMethod === "Card") {
    if (!paymentIntent) {
      throw new ApiError(400, "Card details are required required");
    }

    orderData.paymentIntent = paymentIntent;
    orderData.paymentStatus = "Completed";
  }

  for (const item of cart.products) {
    const product = await Product.findById(item.product);

    if (!product) {
      throw new ApiError(404, `Product with id ${item.product} not found`);
    }

    if (product.quantity < item.count) {
      throw new ApiError(
        400,
        `Insufficient stock for product: ${product.title}`
      );
    }

    product.quantity -= item.count;
    product.sold += item.count;
    await product.save();
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
  const { orderId } = req.params;
  const { status } = req.body;

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
  const { orderId } = req.params;
  const { status } = req.body;

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

const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order Id");
  }

  const order = await Order.findByIdAndDelete(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Order deleted successfully"));
});

const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order Id");
  }

  const order = await Order.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(orderId),
      },
    },
    {
      $unwind: "$products",
    },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "orderBy",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $addFields: {
        productDetail: {
          $first: "$productDetails",
        },

        buyerDetails: {
          $first: "$userDetails",
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        products: {
          $push: {
            title: "$productDetail.title",
            brand: "$productDetail.brand",
            count: "$products.count",
            color: "$products.color",
          },
        },
        paymentMethod: { $first: "$paymentMethod" },
        paymentIntent: { $first: "$paymentIntent" },
        paymentStatus: { $first: "$paymentStatus" },
        orderStatus: { $first: "$orderStatus" },
        trackingNumber: { $first: "$trackingNumber" },
        buyer: { $first: "$buyerDetails" },
      },
    },
    {
      $project: {
        products: 1,
        paymentMethod: 1,
        paymentStatus: 1,
        orderStatus: 1,
        trackingNumber: 1,
        orderBy: 1,
        "buyer.fullName": 1,
        "buyer.email": 1,
        "buyer.phoneNo": 1,
        paymentIntent: {
          $cond: {
            if: { $ne: ["$paymentIntent", null] },
            then: "$paymentIntent",
            else: "$$REMOVE",
          },
        },
      },
    },
  ]);

  if (!order || order.length === 0) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order[0], "order fetched successfully"));
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortType, sortBy, userId } = req.query;

  const pipeline = [];

  // Add search conditions based on the query
  if (query) {
    const searchTerms = query.split(" ");
    pipeline.push({
      $search: {
        index: "get-all-orders", // Your Atlas Search index name
        text: {
          query: query,
          path: ["paymentMethod", "paymentStatus", "orderStatus"], // The fields to search in
        },
      },
    });

    // Add the $match stage to filter down to only those that match all conditions
    const matchConditions = searchTerms.map((term) => ({
      $or: [
        { paymentMethod: { $regex: term, $options: "i" } },
        { orderStatus: { $regex: term, $options: "i" } },
        { paymentStatus: { $regex: term, $options: "i" } },
      ],
    }));

    // Combine all match conditions
    pipeline.push({
      $match: {
        $and: matchConditions,
      },
    });
  }

  // User ID filtering
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user Id");
    }

    pipeline.push({
      $match: {
        orderBy: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // Sorting
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? -1 : 1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  pipeline.push({ $skip: skip }, { $limit: parseInt(limit, 10) });

  const orders = await Order.aggregate(pipeline);

  // Total orders count
  const totalOrdersCount = await Order.aggregate([
    ...pipeline,
    { $count: "total" },
  ]);

  const totalNoOfOrders =
    totalOrdersCount.length > 0 ? totalOrdersCount[0].total : 0;

  const noOfPages =
    totalNoOfOrders > 0 ? Math.ceil(totalNoOfOrders / limit) : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalNoOfOrders, orders, noOfPages },
        "All orders fetched successfully"
      )
    );
});

export {
  createOrder,
  updateOrderStatus,
  updatePaymentStatusForCOD,
  cancelOrder,
  trackOrder,
  deleteOrder,
  getOrderById,
  getAllOrders,
};

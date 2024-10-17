import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { Coupon } from "../models/coupon.model.js";
import { isValidObjectId } from "mongoose";

const addToCart = asyncHandler(async (req, res) => {
  const { prodId, count, color } = req.body;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid Product Id");
  }

  if (!count || !color) {
    throw new ApiError(400, "The count and color of the Product is required ");
  }

  const product = await Product.findById(prodId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  let cart = await Cart.findOne({ orderBy: req.user?._id });

  if (!cart) {
    cart = new Cart({
      products: [],
      orderBy: req.user?._id,
    });
  }

  const productIndex = cart.products.findIndex(
    (p) => p.product.toString() === prodId
  );

  if (productIndex > -1) {
    cart.products[productIndex].count = count;
    cart.products[productIndex].color = color;
  } else {
    cart.products.push({
      product: prodId,
      count,
      color,
      price: product.price,
    });
  }

  cart.cartTotal = cart.products.reduce(
    (acc, prod) => acc + prod.price * prod.count,
    0
  );

  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Product added to cart successfully"));
});

const removeFromCart = asyncHandler(async (req, res) => {
  const { prodId } = req.body;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Enter a valid Product Id");
  }

  const product = await Product.findById(prodId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const cart = await Cart.findOne({ orderBy: req.user?._id });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const productIndex = cart.products.findIndex(
    (p) => p.product.toString() === prodId
  );

  if (productIndex === -1) {
    throw new ApiError(404, "Product not found in the cart");
  }

  cart.products.splice(productIndex, 1);

  cart.cartTotal = cart.products.reduce(
    (acc, prod) => acc + prod.price * prod.count,
    0
  );

  if (cart.appliedCoupons && cart.appliedCoupons.length > 0) {
    const coupon = await Coupon.findById(cart.appliedCoupons[0]);
    const discount = coupon.discount / 100;
    const priceAfterDiscount = cart.cartTotal - cart.cartTotal * discount;
    cart.TotalAfterDiscount = priceAfterDiscount;
  } else {
    cart.TotalAfterDiscount = null;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Product removed from the  cart"));
});

const applyCouponToCart = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    throw new ApiError(400, "CouponCode is required");
  }

  const coupon = await Coupon.findOne({ name: couponCode });

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  let currentDate = Date.now();
  if (coupon.expiry && coupon.expiry < currentDate) {
    throw new ApiError(400, "Coupon is expired");
  }

  const cart = await Cart.findOne({ orderBy: req.user?._id });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const discount = coupon.discount / 100;
  const totalAfterDiscount = cart.cartTotal - cart.cartTotal * discount;

  cart.TotalAfterDiscount = totalAfterDiscount;
  cart.appliedCoupons = [coupon._id];

  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Coupon applied successfully"));
});

export { addToCart, removeFromCart, applyCouponToCart };

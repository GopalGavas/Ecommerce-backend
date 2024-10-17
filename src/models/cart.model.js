import mongoose, { Schema } from "mongoose";

const cartSchema = new Schema(
  {
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        count: {
          type: Number,
        },
        color: {
          type: String,
        },
        price: {
          type: Number,
        },
        discount: {
          // Optional: to track individual product discounts
          type: Number,
          default: 0,
        },
      },
    ],
    cartTotal: Number,
    TotalAfterDiscount: Number,
    appliedCoupons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Coupon", // Optional: To track applied coupons
      },
    ],
    orderBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Cart = mongoose.model("Cart", cartSchema);

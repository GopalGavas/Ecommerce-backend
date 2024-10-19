import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
        },
        count: Number,
        color: String,
      },
    ],
    paymentIntent: {
      type: Object, // If you're using services like Stripe, you can map more specific fields here
    },
    paymentMethod: {
      type: String,
      enum: ["Card", "COD"], // Define the available payment methods
      default: "Card",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },
    orderStatus: {
      type: String,
      default: "Not-Processed",
      enum: [
        "Not-Processed",
        "Processed",
        "Dispatched",
        "Cancelled",
        "Delivered",
      ],
    },
    trackingNumber: {
      type: String, // Optional: for tracking shipments
    },
    orderBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);

import mongoose, { Schema } from "mongoose";

const enquirySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    message: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "resolved", "closed"],
      default: "pending",
    },

    response: {
      type: String,
    },

    enquiryType: {
      type: String,
      enum: ["product", "order", "general", "other"],
      default: "general",
    },
  },
  { timestamps: true }
);

export const Enquiry = mongoose.model("Enquiry", enquirySchema);

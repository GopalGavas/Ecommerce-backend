import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const productSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: true,
    },

    category: {
      type: String,
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    sold: {
      type: Number,
      default: 0,
    },

    color: {
      type: String,
    },

    productImages: [
      {
        type: String,
      },
    ],

    ratings: [
      {
        star: { type: Number, min: 0, max: 5 },
        postedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        postedAt: { type: Date, default: Date.now },
      },
    ],

    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.plugin(mongooseAggregatePaginate);

export const Product = mongoose.model("Product", productSchema);

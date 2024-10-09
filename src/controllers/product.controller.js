import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Product } from "../models/product.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import slugify from "slugify";

const createProduct = asyncHandler(async (req, res) => {
  const { title, description, price, quantity, category, brand, color } =
    req.body;

  if (
    [title, description, price, quantity, category, brand].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  let productImages = [];

  // Handle multiple product images if they exist
  if (req.files && Array.isArray(req.files.productImages)) {
    if (req.files.productImages.length > 5) {
      throw new ApiError(400, "You can upload a maximum of 5 images");
    }

    for (const file of req.files.productImages) {
      const uploadedImage = await uploadOnCloudinary(file.path);
      if (uploadedImage?.url) {
        productImages.push(uploadedImage.url); // Add image URL to the array
      }
    }
  }

  // Handle slug uniqueness
  let slug = slugify(title, { lower: true });
  const existingProduct = await Product.findOne({ slug });
  if (existingProduct) {
    slug = `${slug}-${Date.now()}`; // Append timestamp to slug if a product with the same title exists
  }
  const product = await Product.create({
    title,
    slug,
    description,
    price,
    quantity,
    category,
    brand,
    color,
    productImages,
    seller: req.user?._id,
  });

  if (!product) {
    throw new ApiError(500, "Something went wrong while creating a product");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product, slug: product.slug },
        "Product created successfully"
      )
    );
});

export { createProduct };

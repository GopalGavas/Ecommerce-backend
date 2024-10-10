import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Product } from "../models/product.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import slugify from "slugify";
import { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";

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

  // Format the price with currency symbol (e.g., USD)
  const formattedPrice = `$${product.price.toFixed(2)}`; // Adjust the symbol as needed

  // Send response with formatted price

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...product._doc, slug: product.slug, price: formattedPrice },
        "Product created successfully"
      )
    );
});

const getProductById = asyncHandler(async (req, res) => {
  const { prodId } = req.params;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid Product Id");
  }

  const product = await Product.findById(prodId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const allProduct = await Product.find({});

  return res
    .status(200)
    .json(
      new ApiResponse(200, allProduct, "All Products fetched successfully")
    );
});

const updateProductDetails = asyncHandler(async (req, res) => {
  const { prodId } = req.params;
  const { title, description, price, quantity, category, brand, color } =
    req.body;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid product Id");
  }

  if (
    !title &&
    !description &&
    !price &&
    !quantity &&
    !category &&
    !brand &&
    !color
  ) {
    throw new ApiError(400, "Provide a field that you need to update");
  }

  const product = await Product.findById(prodId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (
    product.seller.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(403, "You are not authorized for this action");
  }

  const updateProduct = await Product.findByIdAndUpdate(
    product._id,
    {
      ...(title && { title, slug: slugify(title, { lower: true }) }),
      ...(description && { description }),
      ...(price && { price }),
      ...(quantity && { quantity }),
      ...(category && { category }),
      ...(brand && { brand }),
      ...(color && { color }),
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updateProduct, "Product updated successfully"));
});

const updateProductImages = asyncHandler(async (req, res) => {
  const { prodId } = req.params;
  const { imageIndex } = req.body;
  const productImageLocalPath = req.files?.productImages[0]?.path;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid product Id");
  }

  if (!productImageLocalPath) {
    throw new ApiError(404, "Can't find local path for Product Images");
  }

  const productImage = await uploadOnCloudinary(productImageLocalPath);

  if (!productImage.url) {
    throw new ApiError(400, "Error while uploading file  on cloudinary");
  }

  const product = await Product.findById(prodId).select("productImages seller");
  if (
    product.seller.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(403, "You are unauthorized for this action");
  }
  let productImages = product?.productImages || [];

  // {If fewer than 5 images, directly add the new image}

  if (productImages.length < 5) {
    productImages.push(productImage.url);

    const updatedProductImage = await Product.findByIdAndUpdate(
      product?._id,
      { productImages },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedProductImage,
          "Product image uploaded successfully"
        )
      );
  }

  // {If 5 images already exist, check for a valid image index to replace}
  if (imageIndex < 0 || imageIndex >= productImages.length) {
    throw new ApiError(400, "Invalid image index");
  }

  // Extract publicId from the current image to be replaced
  const publicIdToReplace = productImages[imageIndex]
    .split("/")
    .slice(-2)
    .join("/")
    .split(".")[0];

  // Replace the image at the specified index
  productImages[imageIndex] = productImage.url;

  // Update the product with the new images
  const updatedProductImage = await Product.findByIdAndUpdate(
    product?._id,
    { productImages },
    { new: true }
  );

  // Delete the old image from Cloudinary
  await deleteFromCloudinary(publicIdToReplace);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedProductImage,
        "Product image replaced successfully"
      )
    );
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { prodId } = req.params;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid Product Id");
  }

  const product = await Product.findById(prodId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  let productImages = product.productImages;

  if (
    product.seller.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
    throw new ApiError(403, "You are not authorized for this action");
  }

  const usersWithWishList = await User.find({ wishlist: prodId });

  if (usersWithWishList && usersWithWishList.length > 0) {
    await User.updateMany(
      { wishlist: prodId },
      { $pull: { wishlist: prodId } }
    );
  }

  if (productImages && productImages.length > 0) {
    for (let imageUrl of productImages) {
      const publicId = imageUrl.split("/").pop().split(".")[0];

      await deleteFromCloudinary(publicId);
    }
  }

  const deleteProduct = await Product.findByIdAndDelete(prodId);

  if (!deleteProduct) {
    throw new ApiError(500, "Something went wrong");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

export {
  createProduct,
  getProductById,
  getAllProducts,
  updateProductDetails,
  updateProductImages,
  deleteProduct,
};

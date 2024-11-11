import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import slugify from "slugify";
import mongoose, { isValidObjectId } from "mongoose";
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

  if (req.files && Array.isArray(req.files.productImages)) {
    if (req.files.productImages.length > 5) {
      throw new ApiError(400, "You can upload a maximum of 5 images");
    }

    for (const file of req.files.productImages) {
      const uploadedImage = await uploadOnCloudinary(file.path);
      if (uploadedImage?.url) {
        productImages.push(uploadedImage.url);
      }
    }
  }

  let slug = slugify(title, { lower: true });
  const existingProduct = await Product.findOne({ slug });
  if (existingProduct) {
    slug = `${slug}-${Date.now()}`;
  }

  const categoryData = await Category.findOne({ slug: category });
  if (!categoryData) {
    throw new ApiError(400, "Invalid category slug");
  }

  const product = await Product.create({
    title,
    slug,
    description,
    price,
    quantity,
    category: categoryData.slug,
    brand,
    color,
    productImages,
    seller: req.user?._id,
  });

  if (!product) {
    throw new ApiError(500, "Something went wrong while creating a product");
  }

  const formattedPrice = `$${product.price.toFixed(2)}`;

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

  const product = await Product.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(prodId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "seller",
        foreignField: "_id",
        as: "sellerDetails",
      },
    },
    {
      $addFields: {
        seller: {
          $first: "$sellerDetails",
        },
      },
    },
    {
      $project: {
        title: 1,
        slug: 1,
        description: 1,
        price: 1,
        brand: 1,
        category: 1,
        productImages: 1,
        ratings: 1,
        totalRatings: 1,
        "seller._id": 1,
        "seller.firstName": 1,
        "seller.email": 1,
      },
    },
  ]);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product[0], "Product fetched successfully"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortType, sortBy, userId } = req.query;

  const pipeline = [];

  // {TEXT SEARCH}
  if (query) {
    pipeline.push({
      $search: {
        index: "search-product",
        text: {
          query: query,
          path: ["brand", "category", "title", "color", "price"],
        },
      },
    });
  }

  // {FIlTER BY USERID IF PROVIDED}
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user Id");
    }

    pipeline.push({
      $match: {
        seller: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // {SORTING LOGIC}
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // {Pagination logic: adding limit and skip for pagination AFTER sorting and matching}
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  pipeline.push({ $skip: skip }, { $limit: parseInt(limit, 10) });

  const products = await Product.aggregate(pipeline);

  // {NO OF PRODUCTS}
  const totalProductsCount = await Product.aggregate([
    ...pipeline,
    { $count: "total" },
  ]);
  const totalProducts =
    totalProductsCount.length > 0 ? totalProductsCount[0].total : 0;

  const noOfPages = totalProducts > 0 ? Math.ceil(totalProducts / limit) : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalProducts, products, noOfPages },
        "All Products fetched successfully"
      )
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

  let categorySlug;
  if (category) {
    const categoryData = await Category.findOne({ slug: category });
    if (!categoryData) {
      throw new ApiError(400, "Invalid category slug");
    }
    categorySlug = categoryData.slug; // Use the category slug for update
  }

  const updateProduct = await Product.findByIdAndUpdate(
    product._id,
    {
      ...(title && { title, slug: slugify(title, { lower: true }) }),
      ...(description && { description }),
      ...(price && { price }),
      ...(quantity && { quantity }),
      ...(category && { category: categorySlug }),
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

const productRating = asyncHandler(async (req, res) => {
  const { prodId } = req.params;
  const { stars, comment } = req.body;

  if (!isValidObjectId(prodId)) {
    throw new ApiError(400, "Invalid Product Id");
  }

  if (stars < 0 || stars > 5) {
    throw new ApiError(400, "Stars rating should be between 0 and 5");
  }

  const product = await Product.findById(prodId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const existingRating = product.ratings.find(
    (rating) => rating.postedBy.toString() === req.user?._id.toString()
  );

  if (existingRating) {
    existingRating.stars = stars;
    existingRating.comment = comment;
  } else {
    product.ratings.push({ stars, comment, postedBy: req.user?._id });
  }

  const totalStars = product.ratings.reduce(
    (acc, rating) => acc + rating.stars,
    0
  );

  product.totalRatings =
    product.ratings.length > 0
      ? (totalStars / product.ratings.length).toFixed(2)
      : 0;

  await product.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalRatings: product.ratings.length,
        overallRating: product.totalRatings,
        ratings: product.ratings,
      },
      "Product rated successfully"
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
  productRating,
  deleteProduct,
};

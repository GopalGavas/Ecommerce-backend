import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./apiError.js";

cloudinary.config({
  cloud_name: `${process.env.CLOUDINARY_CLOUD_NAME}`,
  api_key: `${process.env.CLOUDINARY_API_KEY}`,
  api_secret: `${process.env.CLOUDINARY_API_SECRET}`, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log(
      "File has been successfully uploaded on cloudinary",
      response.url
    );
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.log(`Something went wrong while uploading on Cloudinary`);
    return null;
  }
};

const deleteFromCloudinary = async (publicId, resource_type = "image") => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: `${resource_type}`,
    });

    console.log("Old Image deleted successfully");
    return response;
  } catch (error) {
    throw new ApiError(500, {
      message:
        "Something went wrong while deleting image from cloudinary" ||
        error.message,
    });
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };

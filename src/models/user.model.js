import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import crypto from "crypto";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      validate: validator.isEmail,
    },

    phoneNo: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v); // For a 10-digit number
        },
        message: (props) =>
          `${props.value} is not a valid phone number! (Phone no should be of length 10)`,
      },
    },

    password: {
      type: String,
      required: true,
      minlength: [8, "Password of atleast 8 letters is required"],
    },

    role: {
      type: String,
      default: "user",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    cart: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    address: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address",
      },
    ],

    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    refreshToken: {
      type: String,
    },

    passwordChangedAt: {
      type: Date,
    },

    /*
    passwordResetToken: {
      type: String,
    },

    passwordResetExpires: {
      type: Date,
    },
    */
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      fullName: this.fullName,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

/*
userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // {10 mins}

  return resetToken;
};
*/

export const User = mongoose.model("User", userSchema);

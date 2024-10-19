import express from "express";
import logger from "./utils/logger.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// "<------- MIDDLEWARES ------->"
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(express.json({}));

app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use(cookieParser());

// "<------- LOGGER WITH MORGAN AND WINSTON ------->"
const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

// "<------- ROUTES ------->"
import userRouter from "./routes/user.routes.js";
import productRouter from "./routes/product.routes.js";
import blogRouter from "./routes/blog.routes.js";
import likeRouter from "./routes/like.routes.js";
import categoryRouter from "./routes/category.routes.js";
import couponRouter from "./routes/coupon.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";
import healthCheckRouter from "./routes/healthcheck.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/blogs", blogRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/coupons", couponRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/healthcheck", healthCheckRouter);

export { app };

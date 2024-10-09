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

app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);

export { app };

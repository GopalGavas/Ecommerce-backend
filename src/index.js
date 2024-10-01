import dotenv from "dotenv";
import { connectDB } from "./database/index.db.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Error: ", error);
    });

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Server is listing on PORT ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error: ", error);
  });

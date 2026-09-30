import express from "express";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());


app.use("/auth", authRoutes);

app.use(errorHandler);

export default app;

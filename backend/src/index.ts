import express from "express";
import dotenv from "dotenv";

if (process.env.NODE_ENV === "production") {
  console.log("Running in production mode.");
  dotenv.config({ path: "/home/cs231951/dev/Personal/RestaurantApp/backend/.prod.env" });
} else {
  console.log("Running in development mode.");
  dotenv.config({ path: "/home/cs231951/dev/Personal/RestaurantApp/backend/.dev.env" });
}

const { PORT } = process.env;

const app = express();
app.use(express.json());

import menuRouter from "./api/menu";
app.use(menuRouter);

import custRouter from "./api/customer";
app.use(custRouter);

import cartRouter from "./api/order_items";
app.use(cartRouter);

import historyRouter from "./api/order_history";
app.use(historyRouter);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

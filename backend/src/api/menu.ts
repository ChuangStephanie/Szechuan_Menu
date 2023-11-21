import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { menu } from "../db/schema";
import { eq } from "drizzle-orm";
import express, { Request, Response } from "express";

const menuRouter = express.Router();

const pool = new Pool({
  connectionString: `${process.env.DATABASE_URL}`,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

// error query
const handleQueryError = (err: any, res: Response) => {
  console.error("Error executing query:", err);
  res
    .status(500)
    .json({ error: "An error occurred while executing the query." });
};

// get all dishes
menuRouter.get("/menu", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(menu);
    res.json(rows);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// single item by id
menuRouter.get("/menu/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db.select().from(menu).where(eq(menu.id, +id)); //+id will be replaced by id in url ex: "/menu/3"
    if (rows.length === 0) {
      return res.status(404).json({ error: "Dish not found." });
    }
    res.json(rows[0]);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// add new item
menuRouter.post("/menu", async (req: Request, res: Response) => {
  try {
    const { name, category, spicy, description, price, stock, image } =
      req.body;
    const menuItem = await db
      .insert(menu)
      .values([{ name, category, spicy, description, price, stock, image }])
      .returning();
    res.json(menuItem);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// update item
menuRouter.put("/menu/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, spicy, description, price, stock, image } =
      req.body;
    const menuItem = await db
      .update(menu)
      .set({ name, category, spicy, description, price, stock, image })
      .where(eq(menu.id, +id))
      .returning();
    if (menuItem.length === 0) {
      return res.status(404).json({ error: "Dish not found." });
    }
    res.json(menuItem);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// delete item
menuRouter.delete("/menu/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db.delete(menu).where(eq(menu.id, +id)).returning();
    if (rows.length === 0) {
      return res.status(404).json({ error: "Dish not found." });
    }
    res.json(rows);
  } catch (err) {
    handleQueryError(err, res);
  }
});

export default menuRouter;

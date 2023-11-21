import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { menu, cart, Cart, order_history } from "../db/schema";
import { eq } from "drizzle-orm";
import express, { Request, Response } from "express";

const cartRouter = express.Router();

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

// get orders
cartRouter.get("/cart", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(cart);
    res.json(rows);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// add items to cart
cartRouter.post("/cart", async (req: Request, res: Response) => {
  try {
    const { name, dishes: orderBody } = req.body;

    const order = await db.transaction(async (trx) => {
      const addDishes = await Promise.all(
        orderBody.map(async (menuItem: any) => {
          const [res] = await db
            .select()
            .from(menu)
            .where(eq(menu.id, +menuItem.id));
          return res.price;
        })
      );

      const order_items = await Promise.all(
        orderBody.map(async (menuItem: any, index: number) => {
          const extraCost = menuItem.extraCost || 0;
          const baseTotal = +addDishes[index] * +menuItem.quantity;
          const total = (+baseTotal + +extraCost).toFixed(2);
          const [order_item] = await trx
            .insert(cart)
            .values({
              custName: name,
              menu_id: menuItem.id,
              modifications: menuItem.modifications,
              quantity: menuItem.quantity,
              total: +total,
            })
            .returning();
          return order_item;
        })
      );

      return { dishes: order_items };
    });

    res.json(order);
    
  } catch (err) {
    handleQueryError(err, res);
  }
});

// update cart item ex: quantity, dish, modifications
cartRouter.put("/cart/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, dishes: orderBody } = req.body;

    const order = await db.transaction(async (trx) => {
      const addDishes = await Promise.all(
        orderBody.map(async (menuItem: any) => {
          const [res] = await db
            .select()
            .from(menu)
            .where(eq(menu.id, +menuItem.id));
          return res.price;
        })
      );

      const order_items = await Promise.all(
        orderBody.map(async (menuItem: any, index: number) => {
          const extraCost = menuItem.extraCost || 0;
          const baseTotal = +addDishes[index] * +menuItem.quantity;
          const total = (+baseTotal + +extraCost).toFixed(2);
          const [order_item] = await trx
            .update(cart)
            .set({
              custName: name,
              menu_id: menuItem.id,
              modifications: menuItem.modifications,
              quantity: menuItem.quantity,
              total: +total,
            })
            .where(eq(cart.id, +id))
            .returning();
          return order_item;
        })
      );

      return { dishes: order_items };
    });

    res.json(order);

  } catch (err) {
    handleQueryError(err, res);
  }
});

// delete item from cart
cartRouter.delete("/cart/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db.delete(cart).where(eq(cart.id, +id)).returning();
    if (rows.length === 0) {
      return res.status(404).json({ error: "Item not found." });
    }
    res.json(rows);
  } catch (err) {
    handleQueryError(err, res);
  }
});

export default cartRouter;

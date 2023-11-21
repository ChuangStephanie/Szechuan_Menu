import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { menu, cart, order_history, Cart } from "../db/schema";
import { eq } from "drizzle-orm";
import express, { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';

const historyRouter = express.Router();

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

// get order history
historyRouter.get("/orderhistory", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(order_history);
    res.json(rows);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// get order by id
historyRouter.get("/orderhistory/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select()
      .from(order_history)
      .where(eq(order_history.id, +id));
    if (rows.length === 0) {
      return res.status(404).json({ error: "Dish not found." });
    }
    res.json(rows[0]);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// req format:
// {
// 	"name": "[custName in cart]"
// }
// add order to order history
historyRouter.post("/orderhistory", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // check if name exists
    const checkExists = await db
      .select()
      .from(cart)
      .where(eq(cart.custName, name));

    if (checkExists.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = await db.transaction(async (trx) => {
      // retrieve cart items
      const cartItems = await db
        .select()
        .from(cart)
        .where(eq(cart.custName, name));

      // check if cartItems is empty
      if (cartItems.length === 0) {
        return res.status(404).json({ error: "No items found in cart." });
      }

      // calculate total
      const total = cartItems.reduce((acc: number, curr: Cart) => {
        const subTotal = acc + curr.total;
        return subTotal + subTotal * 0.0825;
      }, 0);

      //save order
      const [saveOrder] = await trx
        .insert(order_history)
        .values({
          order_name: name,
          order_items: cartItems,
          order_total: +total.toFixed(2),
        })
        .returning();

      return { ...saveOrder };
    });

    // clear cart
    const clearCart = await db.transaction(async (trx) => {
      await trx.delete(cart).where(eq(cart.custName, name));
    });

    res.json({ ...order, clearCart });
  } catch (err) {
    handleQueryError(err, res);
  }
});

// req format:
// {
// 	"name": "[new name if wish to change]",
//  "newItems": [
//       {
//          "id": [menu item id]
//          "modifications": "[modifications]"
//          "quantity": [quantity],
//          "extraCost": "[extra cost from modifications if any]"
//       },
//    ],
//  "removeItems": [id(s) of dish(es) removed, needs to be an array]
// }
// update order
historyRouter.put("/orderhistory/:id", async (req: Request, res: Response) => {
  try {
    console.log("Request Body:", req.body);

    const { id } = req.params;
    const { name, newItems: updateItems } = req.body;
    const removeItems = req.body.removeItems;

    const updateOrder = await db.transaction(async (trx) => {
      // update name if provided
      if (name) {
        await trx
          .update(order_history)
          .set({ order_name: name })
          .where(eq(order_history.id, +id));
      }

      // retrieve existing order items
      const [existingOrder] = await trx
        .select({ order_items: order_history.order_items })
        .from(order_history)
        .where(eq(order_history.id, +id));

      // turn items into array
      const existingOrderItems = existingOrder.order_items as any[];

      // handle item removal if removeItems is defined
      let updateOrderItems = existingOrderItems;

      if (removeItems) {
        updateOrderItems = await Promise.all(
          existingOrderItems.map(async (item) => {
            if (removeItems.includes(item.id)) {
              return undefined; // Exclude this item
            }
            return item; // Include this item
          })
        );

        updateOrderItems = updateOrderItems.filter(
          (item) => item !== undefined
        );

        const newTotal = updateOrderItems.reduce((acc: number, curr: any) => {
          const subTotal = acc + curr.total;
          return subTotal + subTotal * 0.0825;
        }, 0);

        await trx
          .update(order_history)
          .set({
            order_items: updateOrderItems,
            order_total: newTotal.toFixed(2),
          })
          .where(eq(order_history.id, +id));
      }

      // handle adding item if removeItems is defined
      if (updateItems) {
        const addDishes = await Promise.all(
          updateItems.map(async (menuItem: any) => {
            const [res] = await db
              .select()
              .from(menu)
              .where(eq(menu.id, menuItem.id));
            return res.price;
          })
        );

        const new_items = await Promise.all(
          updateItems.map(async (menuItem: any, index: number) => {
            const extraCost = menuItem.extraCost || 0;
            const baseTotal = +addDishes[index] * +menuItem.quantity;
            const total = (+baseTotal + +extraCost).toFixed(2);

            // generate new id for each item
            const uniqueId = uuidv4();

            return {
              id: uniqueId,
              menu_id: menuItem.id,
              modifications: menuItem.modifications,
              quantity: menuItem.quantity,
              total: +total,
            };
          })
        );

        // combine existing order items with new items
        updateOrderItems.push(...new_items);

        const newTotal = updateOrderItems.reduce((acc: number, curr: any) => {
          const subTotal = acc + curr.total;
          return subTotal + subTotal * 0.0825;
        }, 0);

        await trx
          .update(order_history)
          .set({
            order_items: updateOrderItems,
            order_total: newTotal.toFixed(2),
          })
          .where(eq(order_history.id, +id));
      }

      const [newOrder] = await trx
        .select()
        .from(order_history)
        .where(eq(order_history.id, +id));

      return { ...newOrder };
    });

    res.json(updateOrder);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// delete order from history
historyRouter.delete(
  "/orderhistory/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rows = await db
        .delete(order_history)
        .where(eq(order_history.id, +id))
        .returning();
      if (rows.length === 0) {
        return res.status(404).json({ error: "Order not found." });
      }
      res.json(rows);
    } catch (err) {
      handleQueryError(err, res);
    }
  }
);

export default historyRouter;

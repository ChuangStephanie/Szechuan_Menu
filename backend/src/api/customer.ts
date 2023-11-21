import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { customer } from "../db/schema";
import { eq } from "drizzle-orm";
import express, { Request, Response } from "express";

const custRouter = express.Router();

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

// get all customers
custRouter.get("/customers", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(customer);
    res.json(rows);
  } catch (err) {
    handleQueryError(err, res);
  }
});

// get customer by id
custRouter.get("/customers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(customer).where(eq(customer.id, +id)); //+id will be replaced by id in url ex: "/customers/3"
      if (rows.length === 0) {
        return res.status(404).json({ error: "Customer not found." });
      }
      res.json(rows[0]);
    } catch (err) {
      handleQueryError(err, res);
    }
  });

  // add new customer
custRouter.post("/customers", async (req: Request, res: Response) => {
    try {
      const { name, number, address, notes } =
        req.body;
      const newCust = await db
        .insert(customer)
        .values([{ name, number, address, notes }])
        .returning();
      res.json(newCust);
    } catch (err) {
      handleQueryError(err, res);
    }
  });

  // update customer info
custRouter.put("/customers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, number, address, notes } =
        req.body;
      const newCust = await db
        .update(customer)
        .set({ name, number, address, notes })
        .where(eq(customer.id, +id))
        .returning();
      if (newCust.length === 0) {
        return res.status(404).json({ error: "Customer not found." });
      }
      res.json(newCust);
    } catch (err) {
      handleQueryError(err, res);
    }
  });

  // delete customer
custRouter.delete("/customers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const cust = await db.delete(customer).where(eq(customer.id, +id)).returning();
      if (cust.length === 0) {
        return res.status(404).json({ error: "Customer not found." });
      }
      res.json(cust);
    } catch (err) {
      handleQueryError(err, res);
    }
  });

  export default custRouter;

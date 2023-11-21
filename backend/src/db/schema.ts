import { InferInsertModel, InferSelectModel, InferModel, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const menu = pgTable("menu", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  spicy: boolean("spicy").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  stock: boolean("stock").default(true).notNull(),
  image: text("image").notNull(),
});

export const customer = pgTable("customer", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }),
  number: integer("number"),
  address: text("address"),
  notes: text("notes"),
  total: doublePrecision("total").default(0),
});

export const cart = pgTable("cart", {
  id: serial("id").primaryKey().notNull(),
  custName: varchar("custName", { length: 100 }).default("Guest"),
  menu_id: integer("menu_id")
    .notNull()
    .references(() => menu.id),
  modifications: text("modifications").default("N/A"),
  quantity: integer("quantity").notNull(),
  total: doublePrecision("total").default(0),
});

export const order_history = pgTable("order_history", {
  id: serial("id").primaryKey().notNull(),
  order_name: varchar("order_name", { length: 100 }).default("Guest"),
  order_date: timestamp("order_date", { withTimezone: true }).default(sql`now()`),
  order_items: jsonb("order_items"),
  order_total: doublePrecision("order_total"),
});

export type Menu = typeof menu.$inferSelect;
export type Customer = typeof customer.$inferSelect;
export type Cart = typeof cart.$inferSelect;
export type OrderHistory = typeof order_history.$inferSelect;

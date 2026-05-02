import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sectionsTable } from "./sections";

export const dishesTable = pgTable("dishes", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => sectionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("KES"),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  isSpecial: boolean("is_special").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  dietaryLabels: text("dietary_labels").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDishSchema = createInsertSchema(dishesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDish = z.infer<typeof insertDishSchema>;
export type Dish = typeof dishesTable.$inferSelect;

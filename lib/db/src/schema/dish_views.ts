import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { dishesTable } from "./dishes";

export const dishViewsTable = pgTable("dish_views", {
  id: serial("id").primaryKey(),
  dishId: integer("dish_id")
    .notNull()
    .references(() => dishesTable.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DishView = typeof dishViewsTable.$inferSelect;

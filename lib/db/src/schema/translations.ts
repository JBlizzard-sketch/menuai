import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dishesTable } from "./dishes";

export const dishTranslationsTable = pgTable("dish_translations", {
  id: serial("id").primaryKey(),
  dishId: integer("dish_id")
    .notNull()
    .references(() => dishesTable.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  culinaryExplanation: text("culinary_explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDishTranslationSchema = createInsertSchema(dishTranslationsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDishTranslation = z.infer<typeof insertDishTranslationSchema>;
export type DishTranslation = typeof dishTranslationsTable.$inferSelect;

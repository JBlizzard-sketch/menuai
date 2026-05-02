import { pgTable, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dishesTable } from "./dishes";

export const allergenTypeEnum = pgEnum("allergen_type", [
  "gluten",
  "dairy",
  "nuts",
  "peanuts",
  "eggs",
  "soy",
  "shellfish",
  "fish",
  "sesame",
  "sulphites",
  "celery",
  "mustard",
  "lupin",
  "molluscs",
]);

export const allergensTable = pgTable("allergens", {
  id: serial("id").primaryKey(),
  dishId: integer("dish_id")
    .notNull()
    .references(() => dishesTable.id, { onDelete: "cascade" }),
  allergenType: allergenTypeEnum("allergen_type").notNull(),
  isAiSuggested: boolean("is_ai_suggested").notNull().default(false),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAllergenSchema = createInsertSchema(allergensTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAllergen = z.infer<typeof insertAllergenSchema>;
export type Allergen = typeof allergensTable.$inferSelect;

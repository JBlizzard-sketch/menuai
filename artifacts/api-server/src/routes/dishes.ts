import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dishesTable,
  allergensTable,
  dishTranslationsTable,
} from "@workspace/db";
import {
  CreateDishParams,
  CreateDishBody,
  GetDishParams,
  UpdateDishParams,
  UpdateDishBody,
  DeleteDishParams,
  ToggleDishAvailabilityParams,
  ToggleDishAvailabilityBody,
  CreateSectionParams,
  CreateSectionBody,
  UpdateSectionParams,
  UpdateSectionBody,
  DeleteSectionParams,
  AddAllergenParams,
  AddAllergenBody,
  UpdateAllergenParams,
  UpdateAllergenBody,
  DeleteAllergenParams,
} from "@workspace/api-zod";
import { sectionsTable } from "@workspace/db";

const router: IRouter = Router();

// ── Sections ─────────────────────────────────────────────────

router.post("/menus/:menuId/sections", async (req, res): Promise<void> => {
  const params = CreateSectionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreateSectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [section] = await db.insert(sectionsTable).values({ ...parsed.data, menuId: params.data.menuId }).returning();
  res.status(201).json(section);
});

router.patch("/sections/:id", async (req, res): Promise<void> => {
  const params = UpdateSectionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [section] = await db.update(sectionsTable).set(parsed.data).where(eq(sectionsTable.id, params.data.id)).returning();
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }
  res.json(section);
});

router.delete("/sections/:id", async (req, res): Promise<void> => {
  const params = DeleteSectionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [section] = await db.delete(sectionsTable).where(eq(sectionsTable.id, params.data.id)).returning();
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }
  res.sendStatus(204);
});

// ── Dishes ───────────────────────────────────────────────────

router.post("/sections/:sectionId/dishes", async (req, res): Promise<void> => {
  const params = CreateDishParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreateDishBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [dish] = await db.insert(dishesTable).values({
    ...parsed.data,
    sectionId: params.data.sectionId,
    price: parsed.data.price?.toString(),
    dietaryLabels: parsed.data.dietaryLabels ?? [],
  }).returning();
  res.status(201).json({ ...dish, price: dish.price != null ? parseFloat(dish.price) : null });
});

router.get("/dishes/:id", async (req, res): Promise<void> => {
  const params = GetDishParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [dish] = await db.select().from(dishesTable).where(eq(dishesTable.id, params.data.id));
  if (!dish) { res.status(404).json({ error: "Dish not found" }); return; }
  const allergens = await db.select().from(allergensTable).where(eq(allergensTable.dishId, dish.id));
  const translations = await db.select().from(dishTranslationsTable).where(eq(dishTranslationsTable.dishId, dish.id));
  res.json({
    ...dish,
    price: dish.price != null ? parseFloat(dish.price) : null,
    allergens,
    dietaryLabels: dish.dietaryLabels ?? [],
    translations,
  });
});

router.patch("/dishes/:id", async (req, res): Promise<void> => {
  const params = UpdateDishParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDishBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData = {
    ...parsed.data,
    ...(parsed.data.price !== undefined ? { price: parsed.data.price?.toString() } : {}),
  };
  const [dish] = await db.update(dishesTable).set(updateData).where(eq(dishesTable.id, params.data.id)).returning();
  if (!dish) { res.status(404).json({ error: "Dish not found" }); return; }
  res.json({ ...dish, price: dish.price != null ? parseFloat(dish.price) : null });
});

router.delete("/dishes/:id", async (req, res): Promise<void> => {
  const params = DeleteDishParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [dish] = await db.delete(dishesTable).where(eq(dishesTable.id, params.data.id)).returning();
  if (!dish) { res.status(404).json({ error: "Dish not found" }); return; }
  res.sendStatus(204);
});

router.patch("/dishes/:id/availability", async (req, res): Promise<void> => {
  const params = ToggleDishAvailabilityParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = ToggleDishAvailabilityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [dish] = await db.update(dishesTable).set({ isAvailable: parsed.data.isAvailable }).where(eq(dishesTable.id, params.data.id)).returning();
  if (!dish) { res.status(404).json({ error: "Dish not found" }); return; }
  res.json({ ...dish, price: dish.price != null ? parseFloat(dish.price) : null });
});

// ── Allergens ────────────────────────────────────────────────

router.post("/dishes/:dishId/allergens", async (req, res): Promise<void> => {
  const params = AddAllergenParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = AddAllergenBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [allergen] = await db.insert(allergensTable).values({
    ...parsed.data,
    dishId: params.data.dishId,
    isAiSuggested: parsed.data.isAiSuggested ?? false,
    isConfirmed: parsed.data.isConfirmed ?? true,
  }).returning();
  res.status(201).json(allergen);
});

router.patch("/allergens/:id", async (req, res): Promise<void> => {
  const params = UpdateAllergenParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAllergenBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [allergen] = await db.update(allergensTable).set(parsed.data).where(eq(allergensTable.id, params.data.id)).returning();
  if (!allergen) { res.status(404).json({ error: "Allergen not found" }); return; }
  res.json(allergen);
});

router.delete("/allergens/:id", async (req, res): Promise<void> => {
  const params = DeleteAllergenParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [allergen] = await db.delete(allergensTable).where(eq(allergensTable.id, params.data.id)).returning();
  if (!allergen) { res.status(404).json({ error: "Allergen not found" }); return; }
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  restaurantsTable,
  menusTable,
  sectionsTable,
  dishesTable,
  allergensTable,
  dishViewsTable,
} from "@workspace/db";
import {
  CreateRestaurantBody,
  UpdateRestaurantBody,
  GetRestaurantParams,
  UpdateRestaurantParams,
  DeleteRestaurantParams,
  GetRestaurantAnalyticsSummaryParams,
  GetPopularDishesParams,
  GetTonightSpecialsParams,
  UpdateTonightSpecialsParams,
  UpdateTonightSpecialsBody,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";

const router: IRouter = Router();

// List restaurants
router.get("/restaurants", async (_req, res): Promise<void> => {
  const restaurants = await db.select().from(restaurantsTable).orderBy(restaurantsTable.name);
  res.json(restaurants);
});

// Create restaurant
router.post("/restaurants", async (req, res): Promise<void> => {
  const parsed = CreateRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") + "-" + nanoid(6);

  const [restaurant] = await db
    .insert(restaurantsTable)
    .values({ ...parsed.data, slug, tier: parsed.data.tier ?? "standard", supportedLanguages: parsed.data.supportedLanguages ?? [] })
    .returning();
  res.status(201).json(restaurant);
});

// Get restaurant
router.get("/restaurants/:id", async (req, res): Promise<void> => {
  const params = GetRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, params.data.id));
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.json(restaurant);
});

// Update restaurant
router.patch("/restaurants/:id", async (req, res): Promise<void> => {
  const params = UpdateRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [restaurant] = await db
    .update(restaurantsTable)
    .set(parsed.data)
    .where(eq(restaurantsTable.id, params.data.id))
    .returning();
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.json(restaurant);
});

// Delete restaurant
router.delete("/restaurants/:id", async (req, res): Promise<void> => {
  const params = DeleteRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [restaurant] = await db
    .delete(restaurantsTable)
    .where(eq(restaurantsTable.id, params.data.id))
    .returning();
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.sendStatus(204);
});

// Get analytics summary for a restaurant
router.get("/restaurants/:id/analytics/summary", async (req, res): Promise<void> => {
  const params = GetRestaurantAnalyticsSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const restaurantId = params.data.id;

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId));
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  // Get menus count
  const menus = await db.select().from(menusTable).where(eq(menusTable.restaurantId, restaurantId));
  const menuIds = menus.map((m) => m.id);

  if (menuIds.length === 0) {
    res.json({
      totalDishes: 0, availableDishes: 0, unavailableDishes: 0, translatedDishes: 0,
      allergensConfirmed: 0, allergensPendingReview: 0, totalMenuViews: 0,
      menus: 0, specialsCount: 0, languagesCovered: [],
    });
    return;
  }

  // Get sections
  const sections = await db
    .select()
    .from(sectionsTable)
    .where(sql`${sectionsTable.menuId} = ANY(${sql`ARRAY[${sql.join(menuIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
  const sectionIds = sections.map((s) => s.id);

  if (sectionIds.length === 0) {
    res.json({
      totalDishes: 0, availableDishes: 0, unavailableDishes: 0, translatedDishes: 0,
      allergensConfirmed: 0, allergensPendingReview: 0, totalMenuViews: 0,
      menus: menus.length, specialsCount: 0, languagesCovered: [],
    });
    return;
  }

  // Get dishes
  const dishes = await db
    .select()
    .from(dishesTable)
    .where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);

  const dishIds = dishes.map((d) => d.id);
  const availableDishes = dishes.filter((d) => d.isAvailable).length;
  const specialsCount = dishes.filter((d) => d.isSpecial).length;

  let allergensConfirmed = 0;
  let allergensPendingReview = 0;
  let totalMenuViews = 0;
  const languagesSet = new Set<string>();

  if (dishIds.length > 0) {
    const allergensList = await db
      .select()
      .from(allergensTable)
      .where(sql`${allergensTable.dishId} = ANY(${sql`ARRAY[${sql.join(dishIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
    allergensConfirmed = allergensList.filter((a) => a.isConfirmed).length;
    allergensPendingReview = allergensList.filter((a) => a.isAiSuggested && !a.isConfirmed).length;

    const views = await db
      .select()
      .from(dishViewsTable)
      .where(sql`${dishViewsTable.dishId} = ANY(${sql`ARRAY[${sql.join(dishIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
    totalMenuViews = views.length;
  }

  // Count translated dishes (dishes with at least one translation)
  let translatedDishes = 0;
  if (dishIds.length > 0) {
    const { dishTranslationsTable } = await import("@workspace/db");
    const translations = await db
      .select({ dishId: dishTranslationsTable.dishId, languageCode: dishTranslationsTable.languageCode })
      .from(dishTranslationsTable)
      .where(sql`${dishTranslationsTable.dishId} = ANY(${sql`ARRAY[${sql.join(dishIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
    const translatedDishIds = new Set(translations.map((t) => t.dishId));
    translatedDishes = translatedDishIds.size;
    translations.forEach((t) => languagesSet.add(t.languageCode));
  }

  res.json({
    totalDishes: dishes.length,
    availableDishes,
    unavailableDishes: dishes.length - availableDishes,
    translatedDishes,
    allergensConfirmed,
    allergensPendingReview,
    totalMenuViews,
    menus: menus.length,
    specialsCount,
    languagesCovered: Array.from(languagesSet),
  });
});

// Get popular dishes
router.get("/restaurants/:id/analytics/popular-dishes", async (req, res): Promise<void> => {
  const params = GetPopularDishesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const restaurantId = params.data.id;

  const menus = await db.select().from(menusTable).where(eq(menusTable.restaurantId, restaurantId));
  const menuIds = menus.map((m) => m.id);
  if (menuIds.length === 0) {
    res.json([]);
    return;
  }

  const sections = await db
    .select()
    .from(sectionsTable)
    .where(sql`${sectionsTable.menuId} = ANY(${sql`ARRAY[${sql.join(menuIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) {
    res.json([]);
    return;
  }

  const dishes = await db
    .select()
    .from(dishesTable)
    .where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
  const dishIds = dishes.map((d) => d.id);
  if (dishIds.length === 0) {
    res.json([]);
    return;
  }

  const views = await db
    .select()
    .from(dishViewsTable)
    .where(sql`${dishViewsTable.dishId} = ANY(${sql`ARRAY[${sql.join(dishIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);

  const viewCountMap = new Map<number, number>();
  for (const v of views) {
    viewCountMap.set(v.dishId, (viewCountMap.get(v.dishId) ?? 0) + 1);
  }

  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  const popularDishes = dishes
    .map((d) => ({
      dishId: d.id,
      name: d.name,
      sectionName: sectionMap.get(d.sectionId)?.name ?? "",
      viewCount: viewCountMap.get(d.id) ?? 0,
      price: d.price != null ? parseFloat(d.price) : null,
      currency: d.currency,
      imageUrl: d.imageUrl,
    }))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  res.json(popularDishes);
});

// Get tonight's specials
router.get("/restaurants/:id/specials", async (req, res): Promise<void> => {
  const params = GetTonightSpecialsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const restaurantId = params.data.id;
  const menus = await db.select().from(menusTable).where(eq(menusTable.restaurantId, restaurantId));
  const menuIds = menus.map((m) => m.id);
  if (menuIds.length === 0) { res.json([]); return; }

  const sections = await db
    .select()
    .from(sectionsTable)
    .where(sql`${sectionsTable.menuId} = ANY(${sql`ARRAY[${sql.join(menuIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length === 0) { res.json([]); return; }

  const specials = await db
    .select()
    .from(dishesTable)
    .where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`}) AND ${dishesTable.isSpecial} = true`);

  res.json(specials.map(d => ({ ...d, price: d.price != null ? parseFloat(d.price) : null })));
});

// Update tonight's specials
router.patch("/restaurants/:id/specials", async (req, res): Promise<void> => {
  const params = UpdateTonightSpecialsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTonightSpecialsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const restaurantId = params.data.id;
  const { dishIds } = parsed.data;

  const menus = await db.select().from(menusTable).where(eq(menusTable.restaurantId, restaurantId));
  const menuIds = menus.map((m) => m.id);
  if (menuIds.length === 0) { res.json([]); return; }

  const sections = await db
    .select()
    .from(sectionsTable)
    .where(sql`${sectionsTable.menuId} = ANY(${sql`ARRAY[${sql.join(menuIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
  const sectionIds = sections.map((s) => s.id);

  // Clear all specials first
  await db
    .update(dishesTable)
    .set({ isSpecial: false })
    .where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);

  if (dishIds.length > 0) {
    await db
      .update(dishesTable)
      .set({ isSpecial: true })
      .where(sql`${dishesTable.id} = ANY(${sql`ARRAY[${sql.join(dishIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
  }

  // Return new specials
  if (sectionIds.length === 0) { res.json([]); return; }
  const specials = await db
    .select()
    .from(dishesTable)
    .where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`}) AND ${dishesTable.isSpecial} = true`);

  res.json(specials.map(d => ({ ...d, price: d.price != null ? parseFloat(d.price) : null })));
});

export default router;

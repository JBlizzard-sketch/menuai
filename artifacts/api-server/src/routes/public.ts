import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  restaurantsTable,
  menusTable,
  sectionsTable,
  dishesTable,
  allergensTable,
  dishTranslationsTable,
  dishViewsTable,
} from "@workspace/db";
import {
  GetPublicMenuParams,
  RecordDishViewBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Public digital menu
router.get("/public/menu/:slug", async (req, res): Promise<void> => {
  const params = GetPublicMenuParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const lang = (typeof req.query.lang === "string" ? req.query.lang : "en");

  const [menu] = await db.select().from(menusTable).where(eq(menusTable.qrSlug, params.data.slug));
  if (!menu) { res.status(404).json({ error: "Menu not found" }); return; }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, menu.restaurantId));
  if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

  const sections = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.menuId, menu.id))
    .orderBy(sectionsTable.sortOrder);

  const sectionsWithDishes = await Promise.all(
    sections.map(async (section) => {
      const dishes = await db
        .select()
        .from(dishesTable)
        .where(sql`${dishesTable.sectionId} = ${section.id} AND ${dishesTable.isAvailable} = true`)
        .orderBy(dishesTable.sortOrder);

      const dishesWithDetails = await Promise.all(
        dishes.map(async (dish) => {
          const allergens = await db.select().from(allergensTable).where(sql`${allergensTable.dishId} = ${dish.id} AND ${allergensTable.isConfirmed} = true`);
          const translations = await db.select().from(dishTranslationsTable).where(eq(dishTranslationsTable.dishId, dish.id));

          // Apply translation if requested language is available and not English
          let displayName = dish.name;
          let displayDescription = dish.description;
          let culinaryExplanation: string | null = null;

          if (lang !== "en") {
            const translation = translations.find((t) => t.languageCode === lang);
            if (translation) {
              displayName = translation.name;
              displayDescription = translation.description ?? dish.description;
              culinaryExplanation = translation.culinaryExplanation;
            }
          }

          return {
            id: dish.id,
            sectionId: dish.sectionId,
            name: displayName,
            description: displayDescription,
            price: dish.price != null ? parseFloat(dish.price) : null,
            currency: dish.currency,
            imageUrl: dish.imageUrl,
            isAvailable: dish.isAvailable,
            isSpecial: dish.isSpecial,
            sortOrder: dish.sortOrder,
            allergens,
            dietaryLabels: dish.dietaryLabels ?? [],
            translations,
            culinaryExplanation,
            createdAt: dish.createdAt,
            updatedAt: dish.updatedAt,
          };
        })
      );

      return { ...section, dishes: dishesWithDetails };
    })
  );

  // Get specials across all sections
  const allDishIds = sectionsWithDishes.flatMap((s) => s.dishes.map((d) => d.id));
  const specials = sectionsWithDishes.flatMap((s) => s.dishes.filter((d) => d.isSpecial));

  // Determine available languages
  let availableLanguages: string[] = ["en"];
  if (allDishIds.length > 0) {
    const translations = await db
      .select({ languageCode: dishTranslationsTable.languageCode })
      .from(dishTranslationsTable)
      .where(sql`${dishTranslationsTable.dishId} = ANY(${sql`ARRAY[${sql.join(allDishIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`);
    const langSet = new Set(translations.map((t) => t.languageCode));
    availableLanguages = ["en", ...Array.from(langSet)];
  }

  res.json({
    restaurantName: restaurant.name,
    restaurantLogo: restaurant.logoUrl,
    menuName: menu.name,
    language: lang,
    availableLanguages,
    sections: sectionsWithDishes,
    specials,
  });
});

// Record a dish view
router.post("/public/menu/:slug/view", async (req, res): Promise<void> => {
  const params = GetPublicMenuParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = RecordDishViewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.insert(dishViewsTable).values({ dishId: parsed.data.dishId });
  res.sendStatus(204);
});

export default router;

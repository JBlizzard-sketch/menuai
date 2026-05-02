import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  menusTable,
  sectionsTable,
  dishesTable,
  allergensTable,
  dishTranslationsTable,
} from "@workspace/db";
import {
  ListMenusParams,
  CreateMenuParams,
  CreateMenuBody,
  GetMenuParams,
  UpdateMenuParams,
  UpdateMenuBody,
  DeleteMenuParams,
  TranslateMenuParams,
  TranslateMenuBody,
  DetectAllergensParams,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// List menus for a restaurant
router.get("/restaurants/:restaurantId/menus", async (req, res): Promise<void> => {
  const params = ListMenusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const menus = await db
    .select()
    .from(menusTable)
    .where(eq(menusTable.restaurantId, params.data.restaurantId))
    .orderBy(menusTable.createdAt);
  res.json(menus);
});

// Create menu
router.post("/restaurants/:restaurantId/menus", async (req, res): Promise<void> => {
  const params = CreateMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateMenuBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const qrSlug = nanoid(10);
  const [menu] = await db
    .insert(menusTable)
    .values({ ...parsed.data, restaurantId: params.data.restaurantId, qrSlug })
    .returning();
  res.status(201).json(menu);
});

// Get a full menu with sections and dishes
router.get("/menus/:id", async (req, res): Promise<void> => {
  const params = GetMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [menu] = await db.select().from(menusTable).where(eq(menusTable.id, params.data.id));
  if (!menu) {
    res.status(404).json({ error: "Menu not found" });
    return;
  }

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
        .where(eq(dishesTable.sectionId, section.id))
        .orderBy(dishesTable.sortOrder);

      const dishesWithDetails = await Promise.all(
        dishes.map(async (dish) => {
          const allergens = await db.select().from(allergensTable).where(eq(allergensTable.dishId, dish.id));
          const translations = await db.select().from(dishTranslationsTable).where(eq(dishTranslationsTable.dishId, dish.id));
          return {
            ...dish,
            price: dish.price != null ? parseFloat(dish.price) : null,
            allergens,
            dietaryLabels: dish.dietaryLabels ?? [],
            translations,
          };
        })
      );

      return { ...section, dishes: dishesWithDetails };
    })
  );

  res.json({ ...menu, sections: sectionsWithDishes });
});

// Update menu
router.patch("/menus/:id", async (req, res): Promise<void> => {
  const params = UpdateMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMenuBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [menu] = await db
    .update(menusTable)
    .set(parsed.data)
    .where(eq(menusTable.id, params.data.id))
    .returning();
  if (!menu) {
    res.status(404).json({ error: "Menu not found" });
    return;
  }
  res.json(menu);
});

// Delete menu
router.delete("/menus/:id", async (req, res): Promise<void> => {
  const params = DeleteMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [menu] = await db.delete(menusTable).where(eq(menusTable.id, params.data.id)).returning();
  if (!menu) {
    res.status(404).json({ error: "Menu not found" });
    return;
  }
  res.sendStatus(204);
});

// AI-translate a menu
router.post("/menus/:id/translate", async (req, res): Promise<void> => {
  const params = TranslateMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = TranslateMenuBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [menu] = await db.select().from(menusTable).where(eq(menusTable.id, params.data.id));
  if (!menu) {
    res.status(404).json({ error: "Menu not found" });
    return;
  }

  const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.menuId, menu.id));
  const sectionIds = sections.map((s) => s.id);
  const dishes = sectionIds.length > 0
    ? await db
      .select()
      .from(dishesTable)
      .where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`)
    : [];

  if (dishes.length === 0) {
    res.json({ translatedDishes: 0, languages: parsed.data.languages });
    return;
  }

  const languageNames: Record<string, string> = {
    fr: "French", es: "Spanish", ar: "Arabic", zh: "Chinese (Simplified)",
    de: "German", ja: "Japanese", it: "Italian", sw: "Swahili",
    pt: "Portuguese", ru: "Russian", ko: "Korean", hi: "Hindi",
  };

  let translatedCount = 0;

  for (const language of parsed.data.languages) {
    const langName = languageNames[language] ?? language;

    for (const dish of dishes) {
      try {
        const prompt = `You are a professional culinary translator specializing in restaurant menus. Translate the following dish from English to ${langName}.

Dish name: ${dish.name}
Description: ${dish.description ?? "No description"}

For Swahili or African dishes (nyama choma, ugali, sukuma wiki, etc.), provide rich contextual explanations in ${langName} rather than literal translations.
Preserve culinary terminology and feel — "pan-seared" should convey the technique elegantly, not literally.

Respond ONLY with a JSON object:
{
  "name": "translated dish name",
  "description": "translated description (or null if no description)",
  "culinaryExplanation": "a helpful 1-2 sentence explanation of the dish for international guests (in ${langName})"
}`;

        const response = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        });

        const content = response.choices[0]?.message?.content ?? "{}";
        let translation: { name?: string; description?: string; culinaryExplanation?: string } = {};
        try {
          translation = JSON.parse(content);
        } catch {
          translation = { name: dish.name };
        }

        // Upsert translation
        const existing = await db
          .select()
          .from(dishTranslationsTable)
          .where(sql`${dishTranslationsTable.dishId} = ${dish.id} AND ${dishTranslationsTable.languageCode} = ${language}`);

        if (existing.length > 0) {
          await db
            .update(dishTranslationsTable)
            .set({
              name: translation.name ?? dish.name,
              description: translation.description ?? null,
              culinaryExplanation: translation.culinaryExplanation ?? null,
            })
            .where(eq(dishTranslationsTable.id, existing[0].id));
        } else {
          await db.insert(dishTranslationsTable).values({
            dishId: dish.id,
            languageCode: language,
            name: translation.name ?? dish.name,
            description: translation.description ?? null,
            culinaryExplanation: translation.culinaryExplanation ?? null,
          });
        }
        translatedCount++;
      } catch (err) {
        req.log.error({ err, dishId: dish.id, language }, "Translation failed for dish");
      }
    }
  }

  res.json({ translatedDishes: translatedCount, languages: parsed.data.languages });
});

// AI-detect allergens for all dishes in a menu
router.post("/menus/:id/detect-allergens", async (req, res): Promise<void> => {
  const params = DetectAllergensParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [menu] = await db.select().from(menusTable).where(eq(menusTable.id, params.data.id));
  if (!menu) {
    res.status(404).json({ error: "Menu not found" });
    return;
  }

  const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.menuId, menu.id));
  const sectionIds = sections.map((s) => s.id);
  const dishes = sectionIds.length > 0
    ? await db.select().from(dishesTable).where(sql`${dishesTable.sectionId} = ANY(${sql`ARRAY[${sql.join(sectionIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`)
    : [];

  if (dishes.length === 0) {
    res.json({ processedDishes: 0, flaggedAllergens: 0 });
    return;
  }

  const validAllergens = ["gluten", "dairy", "nuts", "peanuts", "eggs", "soy", "shellfish", "fish", "sesame", "sulphites", "celery", "mustard", "lupin", "molluscs"];
  let flaggedCount = 0;

  for (const dish of dishes) {
    try {
      const prompt = `You are a food allergen specialist. Analyze the following dish and identify likely allergens.

Dish name: ${dish.name}
Description: ${dish.description ?? "No description"}

Based on the dish name and description, identify which of the following allergens are likely present. Be conservative — only flag allergens you are reasonably confident about based on the ingredients implied.

Valid allergens: gluten, dairy, nuts, peanuts, eggs, soy, shellfish, fish, sesame, sulphites, celery, mustard, lupin, molluscs

Respond ONLY with a JSON array of allergen names, e.g.: ["gluten", "dairy"]
If no allergens are clearly identified, respond with: []`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message?.content ?? "[]";
      let detectedAllergens: string[] = [];
      try {
        detectedAllergens = JSON.parse(content);
        detectedAllergens = detectedAllergens.filter((a) => validAllergens.includes(a));
      } catch {
        detectedAllergens = [];
      }

      for (const allergenType of detectedAllergens) {
        // Check if already exists
        const existing = await db
          .select()
          .from(allergensTable)
          .where(sql`${allergensTable.dishId} = ${dish.id} AND ${allergensTable.allergenType} = ${allergenType}`);
        if (existing.length === 0) {
          await db.insert(allergensTable).values({
            dishId: dish.id,
            allergenType: allergenType as typeof allergensTable.$inferInsert["allergenType"],
            isAiSuggested: true,
            isConfirmed: false,
          });
          flaggedCount++;
        }
      }
    } catch (err) {
      req.log.error({ err, dishId: dish.id }, "Allergen detection failed for dish");
    }
  }

  res.json({ processedDishes: dishes.length, flaggedAllergens: flaggedCount });
});

export default router;

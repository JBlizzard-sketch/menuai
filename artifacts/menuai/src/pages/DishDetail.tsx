import { useParams, Link } from "wouter";
import {
  useGetDish,
  getGetDishQueryKey,
  useUpdateDish,
  useToggleDishAvailability,
  useAddAllergen,
  useDeleteAllergen,
} from "@workspace/api-client-react";
import type { AddAllergenBodyAllergenType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Star, Globe, ShieldCheck, AlertTriangle, Plus, X } from "lucide-react";
import { useState } from "react";

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: "🌾", dairy: "🥛", nuts: "🌰", peanuts: "🥜", eggs: "🥚",
  soy: "🫘", shellfish: "🦐", fish: "🐟", sesame: "🌿", sulphites: "🍷",
  celery: "🥬", mustard: "🟡", lupin: "🌸", molluscs: "🦪",
};

const ALL_ALLERGENS = Object.keys(ALLERGEN_ICONS);

const LANG_NAMES: Record<string, string> = {
  fr: "🇫🇷 French", es: "🇪🇸 Spanish", ar: "🇸🇦 Arabic",
  zh: "🇨🇳 Chinese", de: "🇩🇪 German", ja: "🇯🇵 Japanese",
  it: "🇮🇹 Italian", sw: "🇰🇪 Swahili",
};

type Allergen = { id: number; allergenType: string; isAiSuggested: boolean; isConfirmed: boolean };
type Translation = { id: number; languageCode: string; name: string; description?: string | null; culinaryExplanation?: string | null };

export default function DishDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const [newAllergen, setNewAllergen] = useState<AddAllergenBodyAllergenType | "">("");
  const [selectedLang, setSelectedLang] = useState("fr");

  const { data: dish, isLoading } = useGetDish(id, {
    query: { enabled: !!id, queryKey: getGetDishQueryKey(id) },
  });

  const toggleAvailability = useToggleDishAvailability();
  const updateDish = useUpdateDish();
  const addAllergen = useAddAllergen();
  const deleteAllergen = useDeleteAllergen();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetDishQueryKey(id) });
  }

  function handleToggleAvailability(checked: boolean) {
    toggleAvailability.mutate(
      { id, data: { isAvailable: checked } },
      { onSuccess: invalidate }
    );
  }

  function handleToggleSpecial(checked: boolean) {
    updateDish.mutate(
      { id, data: { isSpecial: checked } },
      { onSuccess: invalidate }
    );
  }

  function handleAddAllergen() {
    if (!newAllergen) return;
    addAllergen.mutate(
      { dishId: id, data: { allergenType: newAllergen as AddAllergenBodyAllergenType, isConfirmed: true, isAiSuggested: false } },
      {
        onSuccess: () => {
          setNewAllergen("");
          invalidate();
        },
      }
    );
  }

  function handleRemoveAllergen(allergenId: number) {
    deleteAllergen.mutate({ id: allergenId }, { onSuccess: invalidate });
  }

  const allergens: Allergen[] = dish?.allergens ?? [];
  const translations: Translation[] = dish?.translations ?? [];
  const existingAllergenTypes = new Set(allergens.map((a) => a.allergenType));
  const availableAllergens = ALL_ALLERGENS.filter((a) => !existingAllergenTypes.has(a));

  const selectedTranslation = translations.find((t) => t.languageCode === selectedLang);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </Layout>
    );
  }

  if (!dish) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Dish not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>

        {/* Main card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-serif font-bold">{dish.name}</h1>
                {dish.description && (
                  <p className="text-muted-foreground mt-2 leading-relaxed">{dish.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold">{dish.currency} {typeof dish.price === "number" ? dish.price.toLocaleString() : dish.price}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={dish.isAvailable ?? false}
                  onCheckedChange={handleToggleAvailability}
                  disabled={toggleAvailability.isPending}
                />
                <span className="text-sm font-medium">
                  {dish.isAvailable ? "Available" : "86'd (unavailable)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={dish.isSpecial ?? false}
                  onCheckedChange={handleToggleSpecial}
                  disabled={updateDish.isPending}
                />
                <Star className={`h-4 w-4 ${dish.isSpecial ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Tonight's special</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allergens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Allergens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allergens.length === 0 ? (
              <p className="text-sm text-muted-foreground">No allergens recorded for this dish.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allergens.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border ${
                      a.isConfirmed
                        ? "bg-muted border-border"
                        : "bg-amber-50 border-amber-300 text-amber-800"
                    }`}
                  >
                    <span>{ALLERGEN_ICONS[a.allergenType] ?? "⚠️"}</span>
                    <span className="capitalize">{a.allergenType}</span>
                    {a.isAiSuggested && !a.isConfirmed && (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <button
                      onClick={() => handleRemoveAllergen(a.id)}
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availableAllergens.length > 0 && (
              <div className="flex gap-2">
                <Select value={newAllergen} onValueChange={(v) => setNewAllergen(v as AddAllergenBodyAllergenType)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Add allergen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAllergens.map((a) => (
                      <SelectItem key={a} value={a}>
                        {ALLERGEN_ICONS[a]} <span className="capitalize">{a}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!newAllergen || addAllergen.isPending}
                  onClick={handleAddAllergen}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Translations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Translations ({translations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {translations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No translations yet.{" "}
                <Link
                  href={`/menus/${dish.sectionId}`}
                  className="text-primary underline"
                >
                  Run AI translation from the menu page.
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {translations.map((t) => (
                    <button
                      key={t.languageCode}
                      onClick={() => setSelectedLang(t.languageCode)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selectedLang === t.languageCode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {LANG_NAMES[t.languageCode] ?? t.languageCode}
                    </button>
                  ))}
                </div>

                {selectedTranslation && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                    <div className="font-semibold text-lg">{selectedTranslation.name}</div>
                    {selectedTranslation.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedTranslation.description}
                      </p>
                    )}
                    {selectedTranslation.culinaryExplanation && (
                      <div className="mt-2 text-xs italic text-primary/80 border-l-2 border-primary/30 pl-3">
                        {selectedTranslation.culinaryExplanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

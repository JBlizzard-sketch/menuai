import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import {
  useGetMenu,
  getGetMenuQueryKey,
  useToggleDishAvailability,
  useUpdateDish,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, AlertTriangle, Star, ChevronLeft, QrCode, Eye } from "lucide-react";

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: "🌾", dairy: "🥛", nuts: "🌰", peanuts: "🥜", eggs: "🥚",
  soy: "🫘", shellfish: "🦐", fish: "🐟", sesame: "🌿", sulphites: "🍷",
  celery: "🥬", mustard: "🟡", lupin: "🌸", molluscs: "🦪",
};

type Allergen = { id: number; allergenType: string; isAiSuggested: boolean; isConfirmed: boolean };
type Dish = {
  id: number; name: string; description?: string | null;
  price: number | null; currency: string | null;
  isAvailable: boolean; isSpecial: boolean;
  allergens?: Allergen[]; translations?: unknown[];
  dietaryLabels?: string[];
};
type Section = { id: number; name: string; dishes?: Dish[] };

export default function MenuDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const { data: menu, isLoading } = useGetMenu(id, {
    query: { enabled: !!id, queryKey: getGetMenuQueryKey(id) },
  });

  const toggleAvailability = useToggleDishAvailability();
  const updateDish = useUpdateDish();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetMenuQueryKey(id) });
  }

  function handleToggleAvailability(dishId: number, checked: boolean) {
    toggleAvailability.mutate(
      { id: dishId, data: { isAvailable: checked } },
      { onSuccess: invalidate }
    );
  }

  function handleToggleSpecial(dishId: number, checked: boolean) {
    updateDish.mutate(
      { id: dishId, data: { isSpecial: checked } },
      { onSuccess: invalidate }
    );
  }

  const totalDishes = menu?.sections?.reduce(
    (acc: number, s: Section) => acc + (s.dishes?.length ?? 0), 0
  ) ?? 0;

  const pendingAllergens = menu?.sections?.reduce(
    (acc: number, s: Section) =>
      acc + (s.dishes?.reduce(
        (a: number, d: Dish) =>
          a + (d.allergens?.filter((al) => al.isAiSuggested && !al.isConfirmed).length ?? 0), 0
      ) ?? 0), 0
  ) ?? 0;

  const translatedCount = menu?.sections?.reduce(
    (acc: number, s: Section) =>
      acc + (s.dishes?.filter((d: Dish) => (d.translations?.length ?? 0) > 0).length ?? 0), 0
  ) ?? 0;

  return (
    <Layout>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/restaurants/${menu?.restaurantId}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Restaurant
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold">{menu?.name}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={menu?.status === "published" ? "default" : "secondary"}>
                  {menu?.status}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">{menu?.qrSlug}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <a href={`/public/${menu?.qrSlug}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-1.5" />
                  Preview
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/menus/${id}/allergens`}>
                  <AlertTriangle className={`h-4 w-4 mr-1.5 ${pendingAllergens > 0 ? "text-amber-600" : ""}`} />
                  Allergens{pendingAllergens > 0 && ` (${pendingAllergens})`}
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/menus/${id}/translate`}>
                  <Globe className="h-4 w-4 mr-1.5" />
                  Translate
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{totalDishes} dishes</span>
            <span>·</span>
            <span>{translatedCount} translated</span>
            {pendingAllergens > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-600 font-medium">{pendingAllergens} allergens to review</span>
              </>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {menu?.sections?.map((section: Section) => (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{section.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.dishes?.map((dish: Dish) => {
                    const hasPendingAllergens = dish.allergens?.some(
                      (a) => a.isAiSuggested && !a.isConfirmed
                    );
                    const confirmedAllergens = dish.allergens?.filter((a) => a.isConfirmed) ?? [];
                    const hasTranslations = (dish.translations?.length ?? 0) > 0;

                    return (
                      <div
                        key={dish.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          dish.isAvailable ? "bg-card" : "bg-muted/30 opacity-70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/dishes/${dish.id}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {dish.name}
                              </Link>
                              {dish.isSpecial && (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              )}
                              {hasPendingAllergens && (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              {hasTranslations && (
                                <Globe className="h-3.5 w-3.5 text-primary/60" />
                              )}
                            </div>
                            {dish.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {dish.description}
                              </p>
                            )}
                            {confirmedAllergens.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {confirmedAllergens.map((a) => (
                                  <span
                                    key={a.id}
                                    className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                                  >
                                    {ALLERGEN_ICONS[a.allergenType]} {a.allergenType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-sm font-medium">
                              {dish.currency} {dish.price != null ? dish.price.toLocaleString() : "—"}
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5" title="Tonight's special">
                                <Star className={`h-3.5 w-3.5 ${dish.isSpecial ? "text-amber-500" : "text-muted-foreground/30"}`} />
                                <Switch
                                  checked={dish.isSpecial}
                                  onCheckedChange={(v) => handleToggleSpecial(dish.id, v)}
                                  className="scale-75"
                                />
                              </div>
                              <div className="flex items-center gap-1.5" title="Available">
                                <Switch
                                  checked={dish.isAvailable}
                                  onCheckedChange={(v) => handleToggleAvailability(dish.id, v)}
                                  className="scale-75"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {dish.isAvailable ? "On" : "86'd"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* QR info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6 pb-6 flex items-center gap-4">
              <QrCode className="h-10 w-10 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">QR Code Link</div>
                <div className="text-sm text-muted-foreground font-mono mt-0.5">
                  /public/{menu?.qrSlug}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this link or generate a QR code for guests to scan
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}

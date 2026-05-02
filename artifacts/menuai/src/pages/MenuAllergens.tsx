import { useParams, Link } from "wouter";
import {
  useGetMenu,
  getGetMenuQueryKey,
  useDetectAllergens,
  useUpdateAllergen,
  useDeleteAllergen,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, X, ChevronLeft, Zap, ShieldCheck } from "lucide-react";

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: "🌾", dairy: "🥛", nuts: "🌰", peanuts: "🥜", eggs: "🥚",
  soy: "🫘", shellfish: "🦐", fish: "🐟", sesame: "🌿", sulphites: "🍷",
  celery: "🥬", mustard: "🟡", lupin: "🌸", molluscs: "🦪",
};

type Allergen = {
  id: number;
  allergenType: string;
  isAiSuggested: boolean;
  isConfirmed: boolean;
};

type Dish = {
  id: number;
  name: string;
  description?: string | null;
  allergens?: Allergen[];
};

type Section = {
  id: number;
  name: string;
  dishes?: Dish[];
};

export default function MenuAllergens() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const { data: menu, isLoading } = useGetMenu(id, {
    query: { enabled: !!id, queryKey: getGetMenuQueryKey(id) },
  });

  const detectAllergens = useDetectAllergens();
  const updateAllergen = useUpdateAllergen();
  const deleteAllergen = useDeleteAllergen();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetMenuQueryKey(id) });
  }

  function confirmAllergen(allergenId: number) {
    updateAllergen.mutate(
      { id: allergenId, data: { isConfirmed: true } },
      { onSuccess: invalidate }
    );
  }

  function rejectAllergen(allergenId: number) {
    deleteAllergen.mutate({ id: allergenId }, { onSuccess: invalidate });
  }

  function runDetection() {
    detectAllergens.mutate(
      { id },
      { onSuccess: invalidate }
    );
  }

  // Collect all dishes with AI-pending allergens
  const pendingDishes: Array<{ dish: Dish; section: Section; pending: Allergen[] }> = [];
  const confirmedDishes: Array<{ dish: Dish; confirmed: Allergen[] }> = [];

  menu?.sections?.forEach((section: Section) => {
    section.dishes?.forEach((dish) => {
      const pending = (dish.allergens ?? []).filter((a) => a.isAiSuggested && !a.isConfirmed);
      const confirmed = (dish.allergens ?? []).filter((a) => a.isConfirmed);
      if (pending.length > 0) pendingDishes.push({ dish, section, pending });
      if (confirmed.length > 0) confirmedDishes.push({ dish, confirmed });
    });
  });

  const totalPending = pendingDishes.reduce((sum, d) => sum + d.pending.length, 0);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/menus/${id}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Menu
            </Link>
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">Allergen Review</h1>
            {!isLoading && menu && (
              <p className="text-muted-foreground mt-1">{menu.name}</p>
            )}
          </div>
          <Button
            onClick={runDetection}
            disabled={detectAllergens.isPending}
            variant="outline"
          >
            {detectAllergens.isPending ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Detecting…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run AI Detection
              </>
            )}
          </Button>
        </div>

        {detectAllergens.isSuccess && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-2 text-sm text-green-700">
              <Check className="h-4 w-4 shrink-0" />
              AI detected {(detectAllergens.data as { flaggedAllergens?: number })?.flaggedAllergens ?? 0} new allergens — review them below
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : (
          <>
            {/* Pending review queue */}
            {totalPending > 0 ? (
              <Card className="border-amber-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Pending Review ({totalPending})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingDishes.map(({ dish, section, pending }) => (
                    <div key={dish.id} className="border rounded-lg p-4 space-y-3 bg-amber-50/30">
                      <div>
                        <div className="font-medium">{dish.name}</div>
                        <div className="text-xs text-muted-foreground">{section.name}</div>
                        {dish.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{dish.description}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pending.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1 border border-amber-300 bg-amber-100/60 rounded-full pl-2 pr-1 py-0.5"
                          >
                            <span className="text-sm">{ALLERGEN_ICONS[a.allergenType] ?? "⚠️"}</span>
                            <span className="text-xs font-medium capitalize text-amber-800">{a.allergenType}</span>
                            <span className="text-[10px] text-amber-600 ml-1">AI</span>
                            <button
                              onClick={() => confirmAllergen(a.id)}
                              className="ml-1 p-0.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                              title="Confirm"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => rejectAllergen(a.id)}
                              className="p-0.5 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => pending.forEach((a) => confirmAllergen(a.id))}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Confirm all
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => pending.forEach((a) => rejectAllergen(a.id))}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject all
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-6 pb-6 text-center">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-medium text-green-700">All clear</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    No AI-suggested allergens waiting for review
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmed allergens summary */}
            {confirmedDishes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    Confirmed Allergens ({confirmedDishes.reduce((s, d) => s + d.confirmed.length, 0)})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {confirmedDishes.map(({ dish, confirmed }) => (
                      <div key={dish.id} className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{dish.name}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {confirmed.map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                              {ALLERGEN_ICONS[a.allergenType] ?? ""} {a.allergenType}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

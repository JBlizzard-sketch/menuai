import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListRestaurants,
  getListRestaurantsQueryKey,
  useGetRestaurantAnalyticsSummary,
  getGetRestaurantAnalyticsSummaryQueryKey,
  useGetPopularDishes,
  getGetPopularDishesQueryKey,
  useGetTonightSpecials,
  getGetTonightSpecialsQueryKey,
  useUpdateTonightSpecials,
  useListMenus,
  getListMenusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Restaurant, Menu, Dish } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Eye, AlertTriangle, Globe, Utensils, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);

  const { data: restaurants, isLoading: restsLoading } = useListRestaurants({
    query: { queryKey: getListRestaurantsQueryKey() },
  });

  useEffect(() => {
    if (restaurants && restaurants.length > 0 && restaurantId === null) {
      setRestaurantId(restaurants[0].id);
    }
  }, [restaurants, restaurantId]);

  const activeId = restaurantId ?? restaurants?.[0]?.id ?? 0;

  const { data: analytics, isLoading: analyticsLoading } = useGetRestaurantAnalyticsSummary(activeId, {
    query: {
      enabled: activeId > 0,
      queryKey: getGetRestaurantAnalyticsSummaryQueryKey(activeId),
    },
  });

  const { data: popular, isLoading: popularLoading } = useGetPopularDishes(activeId, {
    query: {
      enabled: activeId > 0,
      queryKey: getGetPopularDishesQueryKey(activeId),
    },
  });

  const { data: specials, isLoading: specialsLoading } = useGetTonightSpecials(activeId, {
    query: {
      enabled: activeId > 0,
      queryKey: getGetTonightSpecialsQueryKey(activeId),
    },
  });

  const { data: menus } = useListMenus(activeId, {
    query: {
      enabled: activeId > 0,
      queryKey: getListMenusQueryKey(activeId),
    },
  });

  const updateSpecials = useUpdateTonightSpecials();
  const queryClient = useQueryClient();

  function toggleSpecial(dishId: number, isSpecial: boolean) {
    const currentIds = (specials ?? []).map((d: Dish) => d.id);
    const newIds = isSpecial
      ? [...currentIds, dishId]
      : currentIds.filter((id: number) => id !== dishId);
    updateSpecials.mutate(
      { id: activeId, data: { dishIds: newIds } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTonightSpecialsQueryKey(activeId) }) }
    );
  }

  const currentRestaurant = restaurants?.find((r: { id: number }) => r.id === activeId);
  const stat = (val: number | undefined, loading: boolean) =>
    loading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{val ?? 0}</div>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {currentRestaurant ? currentRestaurant.name : "Select a restaurant"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {restsLoading ? (
              <Skeleton className="h-10 w-48" />
            ) : (
              <Select
                value={String(activeId)}
                onValueChange={(v) => setRestaurantId(Number(v))}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants?.map((r: Restaurant) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Dishes</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>{stat(analytics?.totalDishes, analyticsLoading)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Menu Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>{stat(analytics?.totalMenuViews, analyticsLoading)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Translated</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>{stat(analytics?.translatedDishes, analyticsLoading)}</CardContent>
          </Card>
          <Card className={analytics?.allergensPendingReview ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Allergens Pending</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${analytics?.allergensPendingReview ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className={`text-3xl font-bold ${analytics?.allergensPendingReview ? "text-destructive" : ""}`}>
                  {analytics?.allergensPendingReview ?? 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tonight's Specials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Tonight's Specials
              </CardTitle>
            </CardHeader>
            <CardContent>
              {specialsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : specials && specials.length > 0 ? (
                <div className="space-y-3">
                  {specials.map((dish: Dish) => (
                    <div key={dish.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{dish.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {dish.currency} {dish.price?.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Special</Badge>
                        <Switch
                          checked={true}
                          onCheckedChange={() => toggleSpecial(dish.id, false)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No specials tonight</p>
                  {menus && menus.length > 0 && (
                    <Button variant="link" size="sm" asChild className="mt-2">
                      <Link href={`/menus/${menus[0].id}`}>Set from menu →</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Dishes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Most Viewed Dishes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {popularLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : popular && popular.length > 0 ? (
                <div className="space-y-2">
                  {popular.slice(0, 6).map((dish, idx: number) => (
                    <div key={dish.dishId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{dish.name}</div>
                        <div className="text-xs text-muted-foreground">{dish.sectionName}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {dish.viewCount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No view data yet</p>
                  <p className="text-xs mt-1">Share QR codes to start tracking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Menus quick nav */}
        {menus && menus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {menus.map((menu: Menu) => (
                  <Link
                    key={menu.id}
                    href={`/menus/${menu.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors group"
                  >
                    <div>
                      <div className="font-medium group-hover:text-primary transition-colors">{menu.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{menu.qrSlug}</div>
                    </div>
                    <Badge variant={menu.status === "published" ? "default" : "secondary"}>
                      {menu.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

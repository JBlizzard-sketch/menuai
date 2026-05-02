import { Layout } from "@/components/layout/Layout";
import { useListRestaurants, getListRestaurantsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function RestaurantsList() {
  const { data: restaurants, isLoading } = useListRestaurants({ query: { queryKey: getListRestaurantsQueryKey() } });

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif font-bold">Restaurants</h1>
        <Button asChild>
          <Link href="/restaurants/new">Add Restaurant</Link>
        </Button>
      </div>
      <div className="grid gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          restaurants?.map(r => (
            <Link key={r.id} href={`/restaurants/${r.id}`} className="block p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h2 className="text-xl font-bold">{r.name}</h2>
              <p className="text-muted-foreground">{r.neighborhood}</p>
            </Link>
          ))
        )}
      </div>
    </Layout>
  );
}

import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { useGetRestaurant, getGetRestaurantQueryKey, useListMenus, getListMenusQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function RestaurantDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: restaurant, isLoading } = useGetRestaurant(id, { query: { enabled: !!id, queryKey: getGetRestaurantQueryKey(id) } });
  const { data: menus } = useListMenus(id, { query: { enabled: !!id, queryKey: getListMenusQueryKey(id) } });

  return (
    <Layout>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-serif font-bold">{restaurant?.name}</h1>
            <Button asChild variant="outline">
              <Link href={`/restaurants/${id}/edit`}>Edit</Link>
            </Button>
          </div>
          <div className="grid gap-4">
            <h2 className="text-xl font-bold">Menus</h2>
            {menus?.map(m => (
              <Link key={m.id} href={`/menus/${m.id}`} className="block p-4 border rounded hover:border-primary">
                {m.name} ({m.status})
              </Link>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}

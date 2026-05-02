import { useParams, useLocation } from "wouter";
import { useGetPublicMenu, getGetPublicMenuQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";

export default function PublicMenu() {
  const params = useParams();
  const slug = params.slug || "";
  const [lang, setLang] = useState("en");
  
  const { data: menu, isLoading } = useGetPublicMenu(slug, { lang }, { 
    query: { 
      enabled: !!slug, 
      queryKey: getGetPublicMenuQueryKey(slug, { lang }) 
    } 
  });

  if (isLoading) return <div className="p-8 text-center">Loading menu...</div>;
  if (!menu) return <div className="p-8 text-center">Menu not found</div>;

  return (
    <div className="min-h-screen bg-background text-foreground max-w-md mx-auto shadow-2xl relative pb-20">
      <div className="p-6 text-center border-b">
        <h1 className="text-2xl font-serif font-bold">{menu.restaurantName}</h1>
        <h2 className="text-sm text-muted-foreground mt-1 uppercase tracking-widest">{menu.menuName}</h2>
      </div>
      
      <div className="p-4 flex gap-2 overflow-x-auto">
        {menu.availableLanguages.map(l => (
          <button 
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${lang === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-8">
        {menu.sections.map(section => (
          <div key={section.id} className="space-y-4">
            <h3 className="text-lg font-serif font-bold border-b pb-2">{section.name}</h3>
            <div className="space-y-6">
              {section.dishes.map(dish => (
                <div key={dish.id} className="flex flex-col">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{dish.name}</h4>
                    <span className="text-sm font-medium ml-4">{dish.price}</span>
                  </div>
                  {dish.description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {dish.description}
                    </p>
                  )}
                  {dish.allergens && dish.allergens.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dish.allergens.map(a => (
                        <span key={a.id} className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                          {a.allergenType}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

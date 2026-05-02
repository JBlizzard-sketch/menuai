import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import RestaurantsList from "@/pages/RestaurantsList";
import RestaurantCreate from "@/pages/RestaurantCreate";
import RestaurantDetail from "@/pages/RestaurantDetail";
import RestaurantEdit from "@/pages/RestaurantEdit";
import MenuDetail from "@/pages/MenuDetail";
import MenuTranslate from "@/pages/MenuTranslate";
import MenuAllergens from "@/pages/MenuAllergens";
import DishDetail from "@/pages/DishDetail";
import PublicMenu from "@/pages/PublicMenu";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/restaurants" component={RestaurantsList} />
      <Route path="/restaurants/new" component={RestaurantCreate} />
      <Route path="/restaurants/:id" component={RestaurantDetail} />
      <Route path="/restaurants/:id/edit" component={RestaurantEdit} />
      <Route path="/menus/:id" component={MenuDetail} />
      <Route path="/menus/:id/translate" component={MenuTranslate} />
      <Route path="/menus/:id/allergens" component={MenuAllergens} />
      <Route path="/dishes/:id" component={DishDetail} />
      <Route path="/public/:slug" component={PublicMenu} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

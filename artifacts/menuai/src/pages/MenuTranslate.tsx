import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetMenu,
  getGetMenuQueryKey,
  useTranslateMenu,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Globe, Check, ChevronLeft, Languages } from "lucide-react";

const LANGUAGES = [
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "sw", name: "Swahili", flag: "🇰🇪" },
];

export default function MenuTranslate() {
  const params = useParams();
  const id = Number(params.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<{ translatedDishes: number; languages: string[] } | null>(null);
  const queryClient = useQueryClient();

  const { data: menu, isLoading } = useGetMenu(id, {
    query: { enabled: !!id, queryKey: getGetMenuQueryKey(id) },
  });

  const translateMenu = useTranslateMenu();

  const totalDishes = menu?.sections?.reduce(
    (acc: number, s: { dishes?: unknown[] }) => acc + (s.dishes?.length ?? 0),
    0
  ) ?? 0;

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function selectAll() {
    setSelected(LANGUAGES.map((l) => l.code));
  }

  function getExistingLanguages(): Set<string> {
    const langs = new Set<string>();
    menu?.sections?.forEach((s: { dishes?: Array<{ translations?: Array<{ languageCode: string }> }> }) => {
      s.dishes?.forEach((d) => {
        d.translations?.forEach((t) => langs.add(t.languageCode));
      });
    });
    return langs;
  }

  const existingLangs = getExistingLanguages();

  function handleTranslate() {
    if (selected.length === 0) return;
    setResult(null);
    translateMenu.mutate(
      { id, data: { languages: selected } },
      {
        onSuccess: (data) => {
          setResult(data);
          queryClient.invalidateQueries({ queryKey: getGetMenuQueryKey(id) });
        },
      }
    );
  }

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

        <div>
          <h1 className="text-3xl font-serif font-bold">Translate Menu</h1>
          {!isLoading && menu && (
            <p className="text-muted-foreground mt-1">
              {menu.name} · {totalDishes} dish{totalDishes !== 1 ? "es" : ""}
            </p>
          )}
        </div>

        {result && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <div className="font-medium text-green-700">Translation complete</div>
                <div className="text-sm text-muted-foreground">
                  {result.translatedDishes} dish translations saved in{" "}
                  {result.languages.join(", ")}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Select Target Languages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select all 8 languages
            </Button>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => {
                const hasTranslations = existingLangs.has(lang.code);
                return (
                  <label
                    key={lang.code}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.includes(lang.code)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={selected.includes(lang.code)}
                      onCheckedChange={() => toggle(lang.code)}
                    />
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{lang.name}</div>
                      {hasTranslations && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Already translated
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {translateMenu.isPending && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 animate-spin" />
                Translating {totalDishes} dishes into {selected.length} language{selected.length !== 1 ? "s" : ""}…
              </div>
              <Progress value={undefined} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                This may take a minute for large menus. Each dish is translated individually for culinary accuracy.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={selected.length === 0 || translateMenu.isPending}
            onClick={handleTranslate}
            className="min-w-40"
          >
            {translateMenu.isPending ? (
              <>
                <Globe className="h-4 w-4 mr-2 animate-spin" />
                Translating…
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Translate ({selected.length} {selected.length === 1 ? "language" : "languages"})
              </>
            )}
          </Button>
        </div>

        {/* Preview existing translations */}
        {existingLangs.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Existing Translations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from(existingLangs).map((code) => {
                  const lang = LANGUAGES.find((l) => l.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="gap-1.5">
                      {lang?.flag} {lang?.name ?? code}
                    </Badge>
                  );
                })}
              </div>

              <div className="mt-4 space-y-4">
                {menu?.sections?.map((section: { id: number; name: string; dishes?: Array<{ id: number; name: string; translations?: Array<{ languageCode: string; name: string; description?: string | null }> }> }) => (
                  section.dishes?.map((dish) => {
                    if (!dish.translations || dish.translations.length === 0) return null;
                    const shownLang = Array.from(existingLangs)[0];
                    const t = dish.translations.find((tr) => tr.languageCode === shownLang);
                    if (!t) return null;
                    return (
                      <div key={dish.id} className="border-l-2 border-primary/30 pl-3">
                        <div className="text-xs text-muted-foreground font-mono">{dish.name}</div>
                        <div className="text-sm font-medium">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

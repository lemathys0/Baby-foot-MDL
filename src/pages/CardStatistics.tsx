// 📁 src/pages/CardStatistics.tsx
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCardByCode, codeToCardMap } from "@/lib/cardSystem";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getMarketStats, type MarketStats } from "@/lib/firebaseMarket";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  RefreshCcw,
  DollarSign,
  ShoppingBag,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

const CardStatistics = () => {
  const { user } = useAuth();
  const [searchCode, setSearchCode] = useState("");
  const [selectedStats, setSelectedStats] = useState<MarketStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<MarketStats[]>([]);

  const handleSearch = async () => {
  const input = searchCode.trim().toLowerCase();
  if (!input) {
    toast({ title: "Erreur", description: "Veuillez entrer un nom ou un code." });
    return;
  }

  setIsLoading(true);
  try {
    let targetCode = "";

    // 1. On cherche si c'est un code exact
    const directCard = getCardByCode(input.toUpperCase());
    if (directCard.found) {
      targetCode = directCard.code;
    } else {
      // 2. Sinon, on cherche par nom dans toutes les saisons
      for (const season of Object.keys(codeToCardMap)) {
        const cards = codeToCardMap[season];
        const foundCode = Object.keys(cards).find(code => {
          const nomSansExtension = cards[code].nom.toLowerCase().replace('.png', '');
          return nomSansExtension.includes(input) || cards[code].nom.toLowerCase().includes(input);
        });
        
        if (foundCode) {
          targetCode = foundCode;
          break; // On prend la première correspondance
        }
      }
    }

    if (!targetCode) {
      toast({ title: "Non trouvé", description: "Aucune carte ne correspond à ce nom ou code." });
      return;
    }

    // 3. Récupération des stats via le code trouvé
    const stats = await getMarketStats(targetCode);
    if (stats) {
      setSelectedStats(stats);
      if (!recentSearches.find(s => s.cardCode === stats.cardCode)) {
        setRecentSearches(prev => [stats, ...prev].slice(0, 5));
      }
    } else {
      toast({ title: "Aucune donnée", description: "Cette carte n'a pas encore de transactions enregistrées." });
    }
  } catch (error) {
    toast({ title: "Erreur", description: "Erreur lors de la recherche." });
  } finally {
    setIsLoading(false);
  }
};

  const getPriceChange = (history: Array<{ date: number; price: number }>) => {
    if (history.length < 2) return null;

    const oldest = history[0].price;
    const newest = history[history.length - 1].price;
    const change = ((newest - oldest) / oldest) * 100;

    return {
      percentage: Math.abs(change).toFixed(1),
      isIncrease: change > 0,
      value: newest - oldest,
    };
  };

  const PriceHistoryChart = ({ history }: { history: Array<{ date: number; price: number }> }) => {
    if (history.length === 0) return null;

    const maxPrice = Math.max(...history.map((h) => h.price));
    const minPrice = Math.min(...history.map((h) => h.price));
    const range = maxPrice - minPrice || 1;

    return (
      <div className="space-y-3">
        <div className="flex items-end gap-1 h-32 bg-muted/50 rounded-lg p-4">
          {history.map((item, i) => {
            const height = ((item.price - minPrice) / range) * 100;
            const isRecent = i === history.length - 1;
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t transition-all ${
                    isRecent
                      ? "bg-gradient-to-t from-green-600 to-green-400"
                      : "bg-gradient-to-t from-purple-600 to-purple-400"
                  }`}
                  style={{ height: `${Math.max(height, 10)}%` }}
                  title={`${item.price}€`}
                />
                <span className="text-[8px] text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Min: {minPrice}€</span>
          <span>Max: {maxPrice}€</span>
        </div>
      </div>
    );
  };

  const StatsCard = ({ stats }: { stats: MarketStats }) => {
    const priceChange = getPriceChange(stats.priceHistory);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {stats.cardCode}
                  {priceChange && (
                    <Badge
                      variant="outline"
                      className={
                        priceChange.isIncrease
                          ? "bg-green-500/10 text-green-600 border-green-500"
                          : "bg-red-500/10 text-red-600 border-red-500"
                      }
                    >
                      {priceChange.isIncrease ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {priceChange.percentage}%
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Données sur {stats.priceHistory.length} vente(s)
                </p>
              </div>
              <Badge className="bg-primary">
                <ShoppingBag className="h-3 w-3 mr-1" />
                {stats.totalSales} ventes
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                  <DollarSign className="h-4 w-4" />
                  Prix Moyen
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.averagePrice.toFixed(2)}€
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                  <TrendingDown className="h-4 w-4" />
                  Prix Min
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.lowestPrice}€
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-lg p-4 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                  <TrendingUp className="h-4 w-4" />
                  Prix Max
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.highestPrice}€
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-600 text-sm mb-2">
                  <Calendar className="h-4 w-4" />
                  Dernière Vente
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.lastSalePrice || "N/A"}€
                </div>
                {stats.lastSaleDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(stats.lastSaleDate).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Historique des Prix (30 derniers jours)
              </h3>
              <PriceHistoryChart history={stats.priceHistory} />
            </div>

            {priceChange && (
              <div className={`rounded-lg p-4 ${
                priceChange.isIncrease
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {priceChange.isIncrease ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    priceChange.isIncrease ? "text-green-600" : "text-red-600"
                  }`}>
                    Tendance {priceChange.isIncrease ? "Haussière" : "Baissière"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Le prix a {priceChange.isIncrease ? "augmenté" : "diminué"} de{" "}
                  <span className="font-semibold">{priceChange.percentage}%</span> (
                  {priceChange.isIncrease ? "+" : ""}{priceChange.value.toFixed(2)}€) sur la période.
                </p>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                💡 Recommandation de Prix
              </h4>
              <p className="text-sm text-muted-foreground">
                Pour vendre rapidement, fixez votre prix entre{" "}
                <span className="font-semibold text-foreground">
                  {(stats.averagePrice * 0.9).toFixed(2)}€
                </span>{" "}
                et{" "}
                <span className="font-semibold text-foreground">
                  {(stats.averagePrice * 1.1).toFixed(2)}€
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-purple-400" />
            Statistiques de Marché
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Analysez les tendances et l'historique des prix des cartes.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Nom du joueur ou code (ex: Lilwenn, N831...)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedStats && <StatsCard stats={selectedStats} />}

        {recentSearches.length > 0 && !selectedStats && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Recherches Récentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSearches.map((stats) => {
                const priceChange = getPriceChange(stats.priceHistory);
                
                return (
                  <Card
                    key={stats.cardCode}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSearchCode(stats.cardCode);
                      setSelectedStats(stats);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{stats.cardCode}</span>
                        {priceChange && (
                          <Badge
                            variant="outline"
                            className={
                              priceChange.isIncrease
                                ? "bg-green-500/10 text-green-600 border-green-500"
                                : "bg-red-500/10 text-red-600 border-red-500"
                            }
                          >
                            {priceChange.isIncrease ? "+" : "-"}{priceChange.percentage}%
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prix Moyen</span>
                        <span className="font-semibold">{stats.averagePrice.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ventes Totales</span>
                        <span className="font-semibold">{stats.totalSales}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {!selectedStats && recentSearches.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Recherchez une carte pour voir ses statistiques de marché
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Exemple: Lilwenn, N831, Romane, etc.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default CardStatistics;

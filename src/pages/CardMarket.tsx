// 📁 src/pages/CardMarket.tsx - VERSION CORRIGÉE
// ============================
// Marché des cartes avec chemins d'images corrigés

import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyOfferReceived } from "@/lib/firebaseNotifications";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  getOpenCardListings,
  buyCardListing,
  cancelCardListing,
  createOffer,
  getMarketStats,
  getSuggestedPrice,
  incrementListingViews,
  type CardListing,
  type MarketStats,
} from "@/lib/firebaseMarket";
import { motion } from "framer-motion";
import { logger } from '@/utils/logger';
import {
  Coins,
  XCircle,
  ShoppingCart,
  Filter,
  RefreshCcw,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Loader2,
  Flame,
  Info,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Composant pour afficher les images de cartes dans le marché
interface CardMarketImageProps {
  cardCode: string;
  cardName: string;
  className?: string;
}

const CardMarketImage = ({ cardCode, cardName, className }: CardMarketImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [season, setSeason] = useState<string>("season1");

  
  useEffect(() => {
    // ✅ Déterminer la saison à partir du code de carte
    const determineSeason = async () => {
      const { getCardByCode } = await import("@/lib/cardSystem");
      const cardInfo = getCardByCode(cardCode);
      if (cardInfo) {
        setSeason(cardInfo.season);
      }
    };
    determineSeason();
  }, [cardCode]);
  
  // ✅ FIX CRITIQUE: Chemin correct sans /public/
  const imagePath = `/images/cards/${season}/${cardName}`;
  
  if (imageError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-center p-4">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Image indisponible</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <img 
        src={imagePath}
        alt={cardName}
        className="w-full h-full object-cover"
        onError={() => {
          logger.warn(`⚠️ Image marché introuvable: ${imagePath}`);
          setImageError(true);
        }}
        loading="lazy"
      />
    </div>
  );
};

const CardMarket = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<CardListing[]>([]);
  const [filterMine, setFilterMine] = useState<"all" | "mine" | "others">("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recent" | "price-low" | "price-high" | "popular">("recent");
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // État pour les offres
  const [selectedListing, setSelectedListing] = useState<CardListing | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [marketStats, setMarketStats] = useState<Record<string, MarketStats>>({});

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const data = await getOpenCardListings();
      setListings(data);

      // Charger les stats de marché pour chaque carte unique
      const uniqueCardCodes = [...new Set(data.map((l) => l.cardCode))];
      const statsPromises = uniqueCardCodes.map(async (code) => {
        const stats = await getMarketStats(code);
        return { code, stats };
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, MarketStats> = {};
      statsResults.forEach(({ code, stats }) => {
        if (stats) statsMap[code] = stats;
      });
      setMarketStats(statsMap);
    } catch (error) {
      logger.error("❌ Erreur chargement marché:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les annonces du marché.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const filteredAndSortedListings = useMemo(() => {
  let filtered = listings.filter((l) => {
    // Filtre mine/others
    if (filterMine === "mine" && l.sellerId !== user?.uid) return false;
    if (filterMine === "others" && l.sellerId === user?.uid) return false;
    
    // ✅ Filtre prix (définir les variables AVANT de les utiliser)
    const priceOkMin = minPrice ? l.price >= Number(minPrice) : true;
    const priceOkMax = maxPrice ? l.price <= Number(maxPrice) : true;
    
    // ✅ Filtre recherche
    const searchOk = searchQuery 
      ? l.cardCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.cardName.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return priceOkMin && priceOkMax && searchOk;
  });

  // Tri
  switch (sortBy) {
    case "price-low":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "popular":
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case "recent":
    default:
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }

  return filtered;
}, [listings, filterMine, minPrice, maxPrice, searchQuery, sortBy, user?.uid]); // ✅ Ajouter searchQuery dans les dépendances

  const handleBuy = async (listingId: string) => {
    if (!user) return;
    setActionId(listingId);
    try {
      await buyCardListing(user.uid, listingId);
      toast({
        title: "Achat réussi ✅",
        description: "La carte a été ajoutée à votre collection.",
      });
      await loadListings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'acheter cette carte.",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (listingId: string) => {
    if (!user) return;
    setActionId(listingId);
    try {
      await cancelCardListing(user.uid, listingId);
      toast({
        title: "Annonce annulée",
        description: "La carte a été remise dans votre collection.",
      });
      await loadListings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler cette annonce.",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleOpenOfferDialog = async (listing: CardListing) => {
    setSelectedListing(listing);
    setShowOfferDialog(true);
    
    // Incrémenter les vues
    await incrementListingViews(listing.id);
    
    // Charger le prix suggéré
    const suggested = await getSuggestedPrice(listing.cardCode);
    setOfferAmount(suggested.toString());
  };

  const handleSendOffer = async () => {
    if (!user || !selectedListing) return;
    
    const amount = Number(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive",
      });
      return;
    }

    try {
      await createOffer(user.uid, selectedListing.id, amount, offerMessage);
      toast({
        title: "Offre envoyée ✅",
        description: "Le vendeur a été notifié de votre offre.",
      });
      setShowOfferDialog(false);
      setOfferAmount("");
      setOfferMessage("");
      await loadListings();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'offre.",
        variant: "destructive",
      });
    }
  };

  const getPriceComparison = (currentPrice: number, cardCode: string) => {
    const stats = marketStats[cardCode];
    if (!stats) return null;

    const avgPrice = stats.averagePrice;
    const diff = ((currentPrice - avgPrice) / avgPrice) * 100;
    
    return {
      percentage: Math.abs(diff).toFixed(1),
      isHigher: diff > 0,
      isGoodDeal: diff < -10,
    };
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl p-4">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Coins className="h-7 w-7 text-yellow-400" />
              Marché des Cartes
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Achetez et vendez vos cartes BabyDex entre joueurs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadListings}
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" />
              Filtres et Tri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Rechercher par nom ou code (ex: Lilwenn, N831)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>
    {searchQuery && (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSearchQuery("")}
        className="shrink-0"
      >
        <XCircle className="h-4 w-4" />
      </Button>
    )}
  </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filterMine === "all" ? "default" : "outline"}
                onClick={() => setFilterMine("all")}
              >
                Tout
              </Button>
              <Button
                size="sm"
                variant={filterMine === "mine" ? "default" : "outline"}
                onClick={() => setFilterMine("mine")}
              >
                Mes annonces
              </Button>
              <Button
                size="sm"
                variant={filterMine === "others" ? "default" : "outline"}
                onClick={() => setFilterMine("others")}
              >
                Annonces des autres
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Prix min (€)"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-32 text-xs"
              />
              <Input
                placeholder="Prix max (€)"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-32 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Trier par:</span>
              <Button
                size="sm"
                variant={sortBy === "recent" ? "default" : "outline"}
                onClick={() => setSortBy("recent")}
              >
                Récents
              </Button>
              <Button
                size="sm"
                variant={sortBy === "price-low" ? "default" : "outline"}
                onClick={() => setSortBy("price-low")}
              >
                Prix ↑
              </Button>
              <Button
                size="sm"
                variant={sortBy === "price-high" ? "default" : "outline"}
                onClick={() => setSortBy("price-high")}
              >
                Prix ↓
              </Button>
              <Button
                size="sm"
                variant={sortBy === "popular" ? "default" : "outline"}
                onClick={() => setSortBy("popular")}
              >
                Populaires
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des cartes */}
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Chargement des annonces...
          </div>
        ) : filteredAndSortedListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Aucune annonce disponible pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedListings.map((listing) => {
              const isMine = listing.sellerId === user?.uid;
              const priceComp = getPriceComparison(listing.price, listing.cardCode);
              
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="h-full flex flex-col relative overflow-hidden">
                    {priceComp?.isGoodDeal && (
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white gap-1 z-10">
                        <Flame className="h-3 w-3" />
                        Bon Deal
                      </Badge>
                    )}
                    
                    {/* ✅ Preview de la carte */}
                    <div className="relative h-48 bg-muted">
                      <CardMarketImage
                        cardCode={listing.cardCode}
                        cardName={listing.cardName}
                        className="h-full w-full"
                      />
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between gap-2">
                        <span className="truncate">
                          {listing.cardName.replace(/\.(png|jpg|gif)$/i, "")}
                        </span>
                        <Badge variant="outline" className="text-xs uppercase shrink-0">
                          {listing.rarity}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col justify-between space-y-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Code</span>
                          <span className="font-mono text-primary">
                            {listing.cardCode}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Prix</span>
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-foreground text-base">
                              {listing.price}€
                            </span>
                            {priceComp && (
                              <span className={`text-[10px] flex items-center gap-1 ${
                                priceComp.isHigher ? "text-red-500" : "text-green-500"
                              }`}>
                                {priceComp.isHigher ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {priceComp.isHigher ? "+" : "-"}{priceComp.percentage}% vs moy.
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Vendeur</span>
                          <span className="text-[11px] text-muted-foreground">
                            {isMine ? "Vous" : listing.sellerId.slice(0, 8) + "..."}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            <span>{listing.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            <span>{listing.offersCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{getTimeAgo(listing.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {isMine ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => handleCancel(listing.id)}
                            disabled={actionId === listing.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {actionId === listing.id ? "Annulation..." : "Annuler"}
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => handleBuy(listing.id)}
                              disabled={actionId === listing.id}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              {actionId === listing.id ? "Achat..." : "Acheter"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => handleOpenOfferDialog(listing)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog pour faire une offre */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faire une offre</DialogTitle>
            <DialogDescription>
              Proposez un prix pour {selectedListing?.cardName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedListing && marketStats[selectedListing.cardCode] && (
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span className="font-semibold">Statistiques de marché</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix demandé:</span>
                  <span className="font-semibold">{selectedListing.price}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix moyen:</span>
                  <span className="font-semibold">
                    {marketStats[selectedListing.cardCode].averagePrice.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière vente:</span>
                  <span className="font-semibold">
                    {marketStats[selectedListing.cardCode].lastSalePrice || "N/A"}€
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Votre offre (€)
              </label>
              <Input
                type="number"
                placeholder="Montant"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
              />
              {offerAmount && selectedListing && (
                <p className="mt-2 text-xs">
                  {Number(offerAmount) < selectedListing.price * 0.7 && (
                    <span className="text-destructive">⚠️ Offre très basse, risque de rejet</span>
                  )}
                  {Number(offerAmount) >= selectedListing.price * 0.7 &&
                    Number(offerAmount) < selectedListing.price * 0.9 && (
                      <span className="text-yellow-600">💡 Offre raisonnable</span>
                    )}
                  {Number(offerAmount) >= selectedListing.price * 0.9 && (
                    <span className="text-green-600">✓ Offre très compétitive</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Message (optionnel)
              </label>
              <Textarea
                placeholder="Ajoutez un message au vendeur..."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowOfferDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button onClick={handleSendOffer} className="flex-1">
                Envoyer l'offre
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CardMarket;

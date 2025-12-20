import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, 
  Gift, 
  Filter, 
  Sparkles, 
  Loader2, // ✅ Importation corrigée ici
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  X 
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { 
  openBoosterPack, 
  CardData,
  getRarityCategory 
} from "@/lib/firebaseCards";
import { createCardListing } from "@/lib/firebaseMarket";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAvailableSeasons, getSeasonDisplayName } from "@/lib/cardSystem";

// --- Types et Constantes ---
type Rarity = "bronze" | "silver" | "gold" | "espoir" | "icone" | "future-star" | "god" | "creator" | "unknown";
type AllCardData = CardData & { ownedCount: number; owned: boolean };

const BOOSTER_COST = 50;
const FREE_BOOSTER_COOLDOWN = 2 * 60 * 60 * 1000; 
const DAILY_BONUS = 5;

const rarityOrder: Record<Rarity, number> = {
  bronze: 1, silver: 2, gold: 3, espoir: 4, icone: 5, "future-star": 6, god: 7, creator: 8, unknown: 0,
};

const rarityLabels: Record<Rarity, string> = {
  bronze: "Bronze", silver: "Silver", gold: "Gold", espoir: "Espoir", icone: "Icône", "future-star": "Future Star", god: "GOD", creator: "CRÉATEUR", unknown: "Inconnu",
};

// --- Composant d'image de carte avec gestion de chemin par saison ---
const CardImage = ({ season, nom, alt, className }: { season: string; nom: string; alt: string; className?: string }) => {
  const [imageError, setImageError] = useState(false);
  
  // ✅ Chemin dynamique : /images/cards/season1/nom.png
  const imagePath = `/images/cards/${season}/${nom}`;
  
  if (imageError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50", className)}>
        <div className="text-center p-2">
          <span className="text-xl mb-1 block">⚽</span>
          <p className="text-[8px] text-muted-foreground uppercase">{nom}</p>
        </div>
      </div>
    );
  }
  
  return (
    <img 
      src={imagePath}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
};

// --- Composant de rendu de carte ---
function PlayerCardSimple({ rarity, season, nom, owned = true, onClick }: { rarity: Rarity, season: string, nom: string, owned?: boolean, onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl p-1 transition-all",
        `card-rarity-${rarity}`,
        !owned && "opacity-40 grayscale"
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-background/50 backdrop-blur-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <CardImage season={season} nom={nom} alt={nom} className="h-full w-full object-cover" />
        </div>
        <div className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-lg z-10",
            rarity === "bronze" && "bg-amber-600/90 text-white",
            rarity === "silver" && "bg-gray-400/90 text-background",
            rarity === "gold" && "bg-yellow-500/90 text-background",
            rarity === "espoir" && "bg-blue-500/90 text-white",
            rarity === "icone" && "bg-purple-500/90 text-white",
            rarity === "future-star" && "bg-cyan-500/90 text-white",
            rarity === "god" && "bg-purple-600/90 text-white",
            rarity === "creator" && "bg-pink-600/90 text-white",
            rarity === "unknown" && "bg-gray-500/90 text-white"
        )}>
          {rarityLabels[rarity]}
        </div>
        {!owned && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="text-2xl">🔒</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const BabyDex = () => {
  const { user } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState<string>("season1");
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [isOpeningBooster, setIsOpeningBooster] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allCards, setAllCards] = useState<AllCardData[]>([]);
  const [pulledCards, setPulledCards] = useState<CardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<AllCardData | null>(null);
  const [listingPrice, setListingPrice] = useState<string>("");
  const [isListing, setIsListing] = useState(false);
  
  const [fortune, setFortune] = useState(0);
  const [lastFreeBooster, setLastFreeBooster] = useState<number | null>(null);
  const [freeBoosterAvailable, setFreeBoosterAvailable] = useState(false);
  const [timeUntilFreeBooster, setTimeUntilFreeBooster] = useState<string>("");
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [isLastBoosterFree, setIsLastBoosterFree] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setFortune(userData.fortune || 0);
        setLastFreeBooster(userData.lastFreeBooster || null);
        
        const cardQuantities = userData.cards || {};
        const { codeToCardMap } = await import("@/lib/cardSystem");
        const seasons = getAvailableSeasons();
        setAvailableSeasons(seasons);
        
        const allCardsArray: AllCardData[] = [];
        for (const season of seasons) {
          const cardsInSeason = codeToCardMap[season] || {};
          for (const [code, cardInfo] of Object.entries(cardsInSeason)) {
            const ownedCount = cardQuantities[code] || 0;
            allCardsArray.push({
              code, 
              nom: cardInfo.nom, 
              rarity: cardInfo.rarity,
              season, 
              ownedCount, 
              owned: ownedCount > 0,
            });
          }
        }
        setAllCards(allCardsArray.sort((a, b) => a.season.localeCompare(b.season) || a.code.localeCompare(b.code)));
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger la collection.", variant: "destructive" });
    } finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const updateFreeBoosterStatus = () => {
      if (!lastFreeBooster) { setFreeBoosterAvailable(true); return; }
      const timeRemaining = FREE_BOOSTER_COOLDOWN - (Date.now() - lastFreeBooster);
      if (timeRemaining <= 0) { 
        setFreeBoosterAvailable(true); 
        setTimeUntilFreeBooster(""); 
      } else {
        setFreeBoosterAvailable(false);
        const h = Math.floor(timeRemaining / 3600000);
        const m = Math.floor((timeRemaining % 3600000) / 60000);
        const s = Math.floor((timeRemaining % 60000) / 1000);
        setTimeUntilFreeBooster(`${h}h ${m}m ${s}s`);
      }
    };
    const interval = setInterval(updateFreeBoosterStatus, 1000);
    return () => clearInterval(interval);
  }, [lastFreeBooster]);

  const handleOpenBooster = async (isFree: boolean = false) => {
    if (!user) return;
    if (!isFree && fortune < BOOSTER_COST) {
      toast({ title: "Pas assez d'argent", description: `Il vous faut ${BOOSTER_COST}€`, variant: "destructive" });
      return;
    }
    if (isFree && !freeBoosterAvailable) return;

    setIsOpeningBooster(true);
    setIsLastBoosterFree(isFree);

    try {
      // ✅ LOGIQUE : Si c'est gratuit, on utilise le mode "mixed" (S1 + S2) défini dans firebaseCards.ts
      const seasonToRequest = isFree ? "mixed" : selectedSeason;
      const newCards = await openBoosterPack(user.uid, seasonToRequest);
      
      setPulledCards(newCards.sort((a, b) => rarityOrder[getRarityCategory(a.rarity)] - rarityOrder[getRarityCategory(b.rarity)]));
      setCurrentCardIndex(0);
      
      const updates: any = isFree 
        ? { lastFreeBooster: Date.now() } 
        : { fortune: fortune - BOOSTER_COST };
      
      await update(ref(database, `users/${user.uid}`), updates);
      
      if (!isFree) setFortune(prev => prev - BOOSTER_COST);
      else setLastFreeBooster(Date.now());
      
      await loadData();
    } catch (error) {
      toast({ title: "Erreur", description: "Problème avec le booster.", variant: "destructive" });
    } finally { setIsOpeningBooster(false); }
  };

  const filteredCards = useMemo(() => {
    let filtered = allCards.filter(card => card.season === selectedSeason);
    if (filter !== "all") filtered = filtered.filter(card => getRarityCategory(card.rarity) === filter);
    return filtered;
  }, [allCards, selectedSeason, filter]);

  const handleCreateListing = async () => {
    if (!user || !selectedCard) return;
    const price = Number(listingPrice);
    if (!price || price <= 0) { toast({ title: "Prix invalide", variant: "destructive" }); return; }
    setIsListing(true);
    try {
      await createCardListing(user.uid, selectedCard.code, selectedCard.nom, selectedCard.rarity, price);
      toast({ title: "Carte mise en vente ✅" });
      setSelectedCard(null);
      await loadData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setIsListing(false); }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ma Collection</h1>
            <p className="text-muted-foreground">Gérez vos cartes et ouvrez des boosters</p>
          </div>
          <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
            <p className="text-primary font-bold text-xl flex items-center gap-2">
              <span className="text-2xl">💰</span> {fortune.toLocaleString()}€
            </p>
          </div>
        </div>

        {/* Sélecteur de saison */}
        <div className="flex flex-wrap gap-2 mb-6 bg-muted/30 p-2 rounded-lg inline-flex">
          {availableSeasons.map(s => (
            <Button 
              key={s} 
              variant={selectedSeason === s ? "default" : "ghost"} 
              onClick={() => setSelectedSeason(s)}
              className="rounded-md"
            >
              {getSeasonDisplayName(s)}
            </Button>
          ))}
        </div>

        {/* Actions Booster */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => handleOpenBooster(false)} 
              disabled={isOpeningBooster || fortune < BOOSTER_COST}
              className="flex-1 h-14 text-lg font-bold shadow-lg shadow-primary/20"
            >
               {isOpeningBooster ? <Loader2 className="animate-spin mr-2" /> : <Gift className="mr-2" />} 
               Booster {getSeasonDisplayName(selectedSeason)} ({BOOSTER_COST}€)
            </Button>
            <Button 
              onClick={() => handleOpenBooster(true)} 
              disabled={isOpeningBooster || !freeBoosterAvailable} 
              variant="secondary"
              className="flex-1 h-14 text-lg font-bold"
            >
              <Clock className="mr-2 h-5 w-5" /> 
              {freeBoosterAvailable ? "Pack Gratuit (S1+S2)" : timeUntilFreeBooster}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1 items-center justify-end">
            <span className="text-xs font-medium text-muted-foreground mr-2 flex items-center gap-1">
              <Filter className="h-3 w-3" /> FILTRER:
            </span>
            {["all", "bronze", "silver", "gold", "espoir", "icone", "future-star", "god", "creator"].map((r) => (
              <Button 
                key={r} 
                size="sm" 
                variant={filter === r ? "default" : "outline"} 
                onClick={() => setFilter(r as any)}
                className="text-[10px] h-7 px-2 uppercase font-bold"
              >
                {r === "all" ? "Tous" : rarityLabels[r as Rarity]}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse">Chargement de votre deck...</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {filteredCards.map(card => (
              <div key={card.code} className="relative">
                {card.ownedCount > 1 && (
                  <div className="absolute -top-2 -right-2 z-20 bg-primary text-white text-[10px] rounded-full h-6 w-6 flex items-center justify-center font-bold border-2 border-background shadow-md">
                    x{card.ownedCount}
                  </div>
                )}
                <PlayerCardSimple 
                  rarity={getRarityCategory(card.rarity) as Rarity} 
                  season={card.season} 
                  nom={card.nom} 
                  owned={card.owned} 
                  onClick={() => setSelectedCard(card)} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Détails Carte */}
      {/* Modal Détails Carte */}
<AnimatePresence>
  {selectedCard && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedCard(null)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-sm" 
        onClick={e => e.stopPropagation()}
      >
        <Card className="overflow-hidden border-2 border-slate-800">
          <CardHeader className="relative pb-2 bg-slate-900/50">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground hover:text-white" onClick={() => setSelectedCard(null)}>
              <X className="h-4 w-4" />
            </Button>
            <div className="text-center space-y-1">
              <CardTitle className="text-xl font-bold">
                {selectedCard.nom.replace('.png', '').replace('.jpg', '')}
              </CardTitle>
              {/* ✅ Ajout du numéro de la carte ici */}
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest opacity-70">
                ID: {selectedCard.code}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-6">
            <div className="w-48 mx-auto relative group">
                {/* Petit badge flottant sur la carte pour le numéro */}
                <div className="absolute -top-2 -right-2 z-10 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-mono text-white shadow-xl">
                  #{selectedCard.code}
                </div>
                
                <PlayerCardSimple 
                  rarity={getRarityCategory(selectedCard.rarity) as Rarity} 
                  season={selectedCard.season} 
                  nom={selectedCard.nom} 
                  owned={selectedCard.owned} 
                />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 p-2 rounded-lg text-center border border-slate-800">
                  <p className="text-muted-foreground mb-0.5">Rareté</p>
                  <p className="font-bold">{rarityLabels[getRarityCategory(selectedCard.rarity) as Rarity]}</p>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg text-center border border-slate-800">
                  <p className="text-muted-foreground mb-0.5">Saison</p>
                  <p className="font-bold">{getSeasonDisplayName(selectedCard.season)}</p>
                </div>
            </div>
            
            {selectedCard.owned && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <p className="text-sm font-semibold text-center">Mettre en vente sur le marché</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      type="number" 
                      placeholder="Prix" 
                      value={listingPrice} 
                      onChange={e => setListingPrice(e.target.value)} 
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                  <Button onClick={handleCreateListing} disabled={isListing}>
                    {isListing ? <Loader2 className="animate-spin h-4 w-4" /> : "Lister"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )}
</AnimatePresence>

      {/* Modal Ouverture Booster */}
      <AnimatePresence>
        {pulledCards.length > 0 && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 p-4 overflow-hidden">
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-8"
            >
              <h2 className="text-primary text-3xl font-black italic tracking-tighter mb-2">
                 {isLastBoosterFree ? "PACK MIXTE DÉBLOQUÉ !" : "NOUVEAU BOOSTER !"}
              </h2>
              <div className="h-1 w-32 bg-primary mx-auto rounded-full" />
            </motion.div>

            <motion.div 
              key={currentCardIndex} 
              initial={{ rotateY: 90, scale: 0.5, opacity: 0 }} 
              animate={{ rotateY: 0, scale: 1, opacity: 1 }} 
              transition={{ type: "spring", damping: 12 }}
              className="w-72 sm:w-80"
            >
                <PlayerCardSimple 
                  rarity={getRarityCategory(pulledCards[currentCardIndex].rarity) as Rarity} 
                  season={pulledCards[currentCardIndex].season} 
                  nom={pulledCards[currentCardIndex].nom} 
                />
                <div className="mt-6 text-center">
                  <p className="text-white font-bold text-2xl mb-1">{pulledCards[currentCardIndex].nom.split('.')[0]}</p>
                  <p className="text-primary/80 font-medium uppercase tracking-widest text-xs">
                    {getSeasonDisplayName(pulledCards[currentCardIndex].season)}
                  </p>
                </div>
            </motion.div>

            <div className="flex gap-4 mt-12 w-full max-w-xs">
                <Button 
                  disabled={currentCardIndex === 0} 
                  onClick={() => setCurrentCardIndex(c => c - 1)} 
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 text-white"
                >
                  <ChevronLeft className="mr-2" /> Précédent
                </Button>
                
                {currentCardIndex === pulledCards.length - 1 ? (
                  <Button onClick={() => setPulledCards([])} className="flex-1 font-bold">
                    Terminer
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentCardIndex(c => c + 1)} className="flex-1 font-bold">
                    Suivant <ChevronRight className="ml-2" />
                  </Button>
                )}
            </div>
            
            <p className="text-white/30 text-xs mt-8">
              Carte {currentCardIndex + 1} sur {pulledCards.length}
            </p>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default BabyDex;

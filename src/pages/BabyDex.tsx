import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Gift, Filter, Sparkles, Loader2, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Rarity = "bronze" | "silver" | "gold" | "espoir" | "icone" | "future-star" | "god" | "creator" | "unknown";
type AllCardData = CardData & { ownedCount: number; owned: boolean };

const BOOSTER_COST = 50;
const FREE_BOOSTER_COOLDOWN = 2 * 60 * 60 * 1000;
const DAILY_BONUS = 5;

// Ordre de rareté (du moins rare au plus rare)
const rarityOrder: Record<Rarity, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  espoir: 4,
  icone: 5,
  "future-star": 6,
  god: 7,
  creator: 8,
  unknown: 0,
};

const rarityLabels: Record<Rarity, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  espoir: "Espoir",
  icone: "Icône",
  "future-star": "Future Star",
  god: "GOD",
  creator: "CRÉATEUR",
  unknown: "Inconnu",
};

// Composant PlayerCard simplifié pour l'affichage dans la grille
function PlayerCardSimple({
  rarity,
  image,
  owned = true,
  onClick,
}: {
  rarity: Rarity;
  image?: string;
  owned?: boolean;
  onClick?: () => void;
}) {
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
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-background/80">
          {image ? (
            <img src={image} alt="Card" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="text-4xl">⚽</span>
          )}
        </div>

        <div
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            rarity === "bronze" && "bg-amber-600/80 text-foreground",
            rarity === "silver" && "bg-gray-400/80 text-background",
            rarity === "gold" && "bg-yellow-500/80 text-background",
            rarity === "espoir" && "bg-blue-500/80 text-white",
            rarity === "icone" && "bg-purple-500/80 text-white",
            rarity === "future-star" && "bg-cyan-500/80 text-white",
            rarity === "god" && "bg-purple-600/80 text-white",
            rarity === "creator" && "bg-pink-600/80 text-white",
            rarity === "unknown" && "bg-gray-500/80 text-white"
          )}
        >
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
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [isOpeningBooster, setIsOpeningBooster] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allCards, setAllCards] = useState<AllCardData[]>([]);
  const [pulledCards, setPulledCards] = useState<CardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<AllCardData | null>(null);
  
  const [fortune, setFortune] = useState(0);
  const [lastFreeBooster, setLastFreeBooster] = useState<number | null>(null);
  const [lastDailyBonus, setLastDailyBonus] = useState<number | null>(null);
  const [freeBoosterAvailable, setFreeBoosterAvailable] = useState(false);
  const [timeUntilFreeBooster, setTimeUntilFreeBooster] = useState<string>("");

  // ✅ Fonction de chargement des données mémorisée
  const loadTournamentData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setFortune(userData.fortune || 0);
        setLastFreeBooster(userData.lastFreeBooster || null);
        setLastDailyBonus(userData.lastDailyBonus || null);
        
        const cardQuantities = userData.cards || {};
        const season = "season1";
        
        // Importer la map des cartes
        const { codeToCardMap } = await import("@/lib/cardSystem");
        const cardsInSeason = codeToCardMap[season] || {};
        
        // ✅ MODIFICATION : Créer la liste de TOUTES les cartes
        const allCardsArray: AllCardData[] = [];
        
        for (const [code, cardInfo] of Object.entries(cardsInSeason)) {
          const ownedCount = cardQuantities[code] || 0;
          allCardsArray.push({
            code: code,
            nom: cardInfo.nom,
            rarity: cardInfo.rarity,
            season: season,
            ownedCount: ownedCount,
            owned: ownedCount > 0, // ✅ Indique si la carte est possédée
          });
        }
        
        // Trier par code
        setAllCards(allCardsArray.sort((a, b) => a.code.localeCompare(b.code)));
        
        await checkAndApplyDailyBonus(userData);
      }
    } catch (error) {
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger votre collection de cartes.",
        variant: "destructive",
      });
      console.error("Erreur de chargement des cartes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkAndApplyDailyBonus = useCallback(async (userData: any) => {
    if (!user) return;

    const now = Date.now();
    const accountCreatedAt = userData.createdAt ? new Date(userData.createdAt).getTime() : now;
    const lastBonus = userData.lastDailyBonus || accountCreatedAt;
    
    const timeSinceLastBonus = now - lastBonus;
    const oneDayInMs = 24 * 60 * 60 * 1000;

    if (timeSinceLastBonus >= oneDayInMs) {
      const userRef = ref(database, `users/${user.uid}`);
      const newFortune = (userData.fortune || 0) + DAILY_BONUS;
      
      await update(userRef, {
        fortune: newFortune,
        lastDailyBonus: now,
      });

      setFortune(newFortune);
      setLastDailyBonus(now);

      toast({
        title: "Bonus quotidien ! 🎁",
        description: `Vous avez reçu ${DAILY_BONUS}€`,
      });
    }
  }, [user]);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  useEffect(() => {
    const updateFreeBoosterStatus = () => {
      if (!lastFreeBooster) {
        setFreeBoosterAvailable(true);
        setTimeUntilFreeBooster("");
        return;
      }

      const now = Date.now();
      const timeSinceLastFree = now - lastFreeBooster;
      const timeRemaining = FREE_BOOSTER_COOLDOWN - timeSinceLastFree;

      if (timeRemaining <= 0) {
        setFreeBoosterAvailable(true);
        setTimeUntilFreeBooster("");
      } else {
        setFreeBoosterAvailable(false);
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
        setTimeUntilFreeBooster(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateFreeBoosterStatus();
    const interval = setInterval(updateFreeBoosterStatus, 1000);
    return () => clearInterval(interval);
  }, [lastFreeBooster]);

  const filteredCards = useMemo(() => {
    if (filter === "all") {
      return allCards;
    }
    return allCards.filter(card => getRarityCategory(card.rarity) === filter);
  }, [allCards, filter]);

  // ✅ Calculer le nombre de cartes possédées
  const ownedCardsCount = useMemo(() => {
    return allCards.filter(card => card.owned).length;
  }, [allCards]);

  const handleOpenBooster = async (isFree: boolean = false) => {
    if (!user) return;

    if (!isFree && fortune < BOOSTER_COST) {
      toast({
        title: "Pas assez d'argent",
        description: `Il vous faut ${BOOSTER_COST}€ pour ouvrir un booster.`,
        variant: "destructive",
      });
      return;
    }

    if (isFree && !freeBoosterAvailable) {
      toast({
        title: "Booster gratuit indisponible",
        description: `Prochain booster gratuit dans ${timeUntilFreeBooster}`,
        variant: "destructive",
      });
      return;
    }

    setIsOpeningBooster(true);
    try {
      const newCards = await openBoosterPack(user.uid);
      
      const sortedCards = newCards.sort((a, b) => {
        const rarityA = getRarityCategory(a.rarity);
        const rarityB = getRarityCategory(b.rarity);
        return rarityOrder[rarityA] - rarityOrder[rarityB];
      });
      
      setPulledCards(sortedCards);
      setCurrentCardIndex(0);
      
      const userRef = ref(database, `users/${user.uid}`);
      const updates: any = {};

      if (!isFree) {
        updates.fortune = fortune - BOOSTER_COST;
        setFortune(fortune - BOOSTER_COST);
      } else {
        updates.lastFreeBooster = Date.now();
        setLastFreeBooster(Date.now());
        setFreeBoosterAvailable(false);
      }

      await update(userRef, updates);
      await loadTournamentData();
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le booster.",
        variant: "destructive",
      });
    } finally {
      setIsOpeningBooster(false);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < pulledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const closeBoosterModal = () => {
    setPulledCards([]);
    setCurrentCardIndex(0);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground">BabyDex</h1>
        <p className="mt-1 text-muted-foreground">
          Collectionnez toutes les cartes des joueurs ! ({ownedCardsCount}/{allCards.length} cartes possédées)
        </p>
        <p className="text-sm text-primary font-semibold mt-2">
          💰 Fortune: {fortune.toLocaleString()}€
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
      >
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            className="w-full sm:w-auto"
            onClick={() => handleOpenBooster(false)}
            disabled={isOpeningBooster || fortune < BOOSTER_COST}
          >
            {isOpeningBooster ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gift className="mr-2 h-4 w-4" />
            )}
            {isOpeningBooster ? "Ouverture..." : `Ouvrir un booster (${BOOSTER_COST}€)`}
          </Button>
          
          <Button 
            className="w-full sm:w-auto"
            onClick={() => handleOpenBooster(true)}
            disabled={isOpeningBooster || !freeBoosterAvailable}
            variant={freeBoosterAvailable ? "default" : "secondary"}
          >
            {isOpeningBooster ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            {freeBoosterAvailable 
              ? "Booster gratuit !" 
              : `Gratuit dans ${timeUntilFreeBooster}`
            }
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {((["all", "bronze", "silver", "gold", "espoir", "icone", "future-star", "god", "creator"] as const).map((r) => (
            <Button
              key={r}
              variant={filter === r ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(r)}
            >
              {r === "all" ? <Filter className="h-4 w-4 mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {r === "all" ? "Tous" : r === "future-star" ? "Future Star" : r.charAt(0).toUpperCase() + r.slice(1)}
            </Button>
          )))}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {filteredCards.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">Aucune carte {filter} trouvée.</p>
              </div>
            )}

            {filteredCards.map((card) => {
              const imagePath = `/images/cards/${card.nom}`;
              const displayRarity = getRarityCategory(card.rarity);

              return (
                <motion.div
                  key={card.code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  {card.ownedCount > 1 && (
                    <div className="absolute top-0 right-0 z-10 -mt-2 -mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md">
                      x{card.ownedCount}
                    </div>
                  )}
                  <PlayerCardSimple
                    rarity={displayRarity as Rarity}
                    image={imagePath}
                    owned={card.owned}
                    onClick={() => setSelectedCard(card)}
                  />
                </motion.div>
              );
            })}
          </div>
        
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Légende des raretés</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs">
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-amber-600" />
                  <span className="text-muted-foreground">Bronze</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-gray-400" />
                  <span className="text-muted-foreground">Silver</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-yellow-500" />
                  <span className="text-muted-foreground">Gold</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-blue-500" />
                  <span className="text-muted-foreground">Espoir</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-purple-500" />
                  <span className="text-muted-foreground">Icône</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-cyan-500" />
                  <span className="text-muted-foreground">Future</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-purple-600" />
                  <span className="text-muted-foreground">God</span>
                </div>
                <div>
                  <div className="mx-auto mb-1 h-4 w-4 rounded bg-pink-600" />
                  <span className="text-muted-foreground">Créateur</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* MODAL DÉTAILS CARTE */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ scale: 0.5, y: -50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: -50 }}
              className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute -top-8 right-0 text-white hover:text-primary transition-colors z-[60]"
              >
                <X className="h-8 w-8" />
                <span className="sr-only">Fermer</span>
              </button>
              
              <Card className="border-2 border-primary/50 shadow-2xl">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-center text-lg">
                    {selectedCard.nom.replace(/\.(png|jpg|gif)$/i, '')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="relative w-full max-w-[200px] mx-auto">
                    <PlayerCardSimple
                      rarity={getRarityCategory(selectedCard.rarity) as Rarity}
                      image={`/images/cards/${selectedCard.nom}`}
                      owned={selectedCard.owned}
                    />
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-surface rounded-lg">
                      <span className="font-semibold text-muted-foreground">Code:</span>
                      <span className="text-primary font-mono">{selectedCard.code}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-surface rounded-lg">
                      <span className="font-semibold text-muted-foreground">Rareté:</span>
                      <span className="text-primary">{selectedCard.rarity}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-surface rounded-lg">
                      <span className="font-semibold text-muted-foreground">Saison:</span>
                      <span className="text-primary capitalize">{selectedCard.season}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-surface rounded-lg">
                      <span className="font-semibold text-muted-foreground">Statut:</span>
                      <span className={cn(
                        "font-bold",
                        selectedCard.owned ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {selectedCard.owned ? `Possédée (x${selectedCard.ownedCount})` : "Non possédée 🔒"}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setSelectedCard(null)} 
                    className="w-full"
                    variant="default"
                    size="sm"
                  >
                    Fermer
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL BOOSTER OUVERT */}
      <AnimatePresence>
        {pulledCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg p-4"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              className="w-full max-w-md relative"
            >
              <button
                onClick={closeBoosterModal}
                className="absolute -top-8 right-0 text-white hover:text-primary transition-colors z-[60]"
              >
                <X className="h-8 w-8" />
                <span className="sr-only">Fermer</span>
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-primary mb-2">
                  Booster Ouvert ! 🎉
                </h2>
                <p className="text-muted-foreground">
                  Carte {currentCardIndex + 1} sur {pulledCards.length}
                </p>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCardIndex}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="w-full max-w-sm mx-auto"
                >
                  {pulledCards[currentCardIndex] && (
                    <div>
                      <div className={`relative aspect-[3/4] overflow-hidden rounded-xl p-2 card-rarity-${getRarityCategory(pulledCards[currentCardIndex].rarity)}`}>
                        <div className="relative h-full overflow-hidden rounded-lg bg-background/50 backdrop-blur-sm">
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-background/80">
                            <img 
                              src={`/images/cards/${pulledCards[currentCardIndex].nom}`} 
                              alt={pulledCards[currentCardIndex].nom}
                              className="h-full w-full object-cover" 
                            />
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
                            <p className="text-xs text-muted-foreground mb-1">{pulledCards[currentCardIndex].code}</p>
                            <p className="font-bold text-foreground text-lg">
                              {pulledCards[currentCardIndex].nom.replace(/\.(png|jpg|gif)$/i, '')}
                            </p>
                          </div>

                          <div className={cn(
                            "absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "bronze" && "bg-amber-600/80 text-foreground",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "silver" && "bg-gray-400/80 text-background",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "gold" && "bg-yellow-500/80 text-background",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "espoir" && "bg-blue-500/80 text-white",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "icone" && "bg-purple-500/80 text-white",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "future-star" && "bg-cyan-500/80 text-white",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "god" && "bg-purple-600/80 text-white",
                            getRarityCategory(pulledCards[currentCardIndex].rarity) === "creator" && "bg-pink-600/80 text-white"
                          )}>
                            {rarityLabels[getRarityCategory(pulledCards[currentCardIndex].rarity) as Rarity]}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={handlePrevCard}
                  disabled={currentCardIndex === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                
                {currentCardIndex === pulledCards.length - 1 ? (
                  <Button 
                    onClick={closeBoosterModal}
                    className="flex-1"
                  >
                    Fermer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextCard}
                    className="flex-1"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AppLayout>
  );
};

export default BabyDex;

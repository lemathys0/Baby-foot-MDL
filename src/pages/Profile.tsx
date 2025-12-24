import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { motion } from "framer-motion";
import { 
  Settings, LogOut, UserPlus, Bell, Shield, Users, Search, Loader2, X, Check, 
  ShoppingBag, AlertTriangle, Info, TrendingUp, Eye, Sparkles, Package, 
  MessageCircle, MessageSquare, BarChart3, DollarSign, Calendar, ArrowUpRight, 
  ArrowDownRight, Clock, Flame, Send, TrendingDown 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { BadgesSection } from "@/components/profile/BadgesSection";
import { 
  notifyOfferReceived,
  notifyOfferAccepted,
  notifyOfferRejected,
  notifyOfferCountered,
  notifyAdminAnnouncement
} from "@/lib/firebaseNotifications";
import { FortuneHistoryCard } from "@/components/profile/FortuneHistoryCard";
import { ClubCard } from "@/components/profile/ClubCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { FriendProfileDialog } from "@/components/profile/FriendProfileDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ref, get, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { 
  getFriends, getPendingFriendRequests, sendFriendRequest, acceptFriendRequest, 
  declineFriendRequest, removeFriend, searchUsers, getUserSettings, updateUserSettings, 
  onFriendsUpdate, type Friend, type FriendRequest, type UserSettings 
} from "@/lib/firebaseFriends";
import { getUserTaxInfo, payTaxesManually, isLastWeekendOfMonth, getDaysUntilLastWeekend } from "@/lib/taxSystem";
import { calculateTaxRate } from "@/lib/utils";
import { SHOP_ITEMS, type ShopItem } from "@/lib/firebaseExtended";
import { applyTheme } from "@/lib/applyTheme";
import { logger } from '@/utils/logger';
import {
  getReceivedOffers, getSentOffers, acceptOffer, rejectOffer, counterOffer,
  getMarketStats, type Offer, type MarketStats
} from "@/lib/firebaseMarket";

interface TaxInfoCardProps {
  userId: string;
  fortune: number;
  bettingGains: number;
}

const TaxInfoCard = ({ userId, fortune, bettingGains }: TaxInfoCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [taxInfo, setTaxInfo] = useState<any>(null);

  const loadTaxInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getUserTaxInfo(userId);
      setTaxInfo(info);
    } catch (error) {
      logger.error("Erreur chargement taxes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!taxInfo && !isLoading) {
    loadTaxInfo();
  }

  const taxRate = calculateTaxRate(bettingGains);
  const taxesDue = Math.round(bettingGains * taxRate);
  const daysUntilTax = getDaysUntilLastWeekend();
  const isWeekendTax = isLastWeekendOfMonth();
  const alreadyPaid = taxInfo?.taxesPaid;
  const canPayNow = !alreadyPaid && isWeekendTax && fortune >= taxesDue;

  const getBracketInfo = (gained: number) => {
    if (gained >= 2000) return { next: null, toNext: 0, color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" };
    if (gained >= 1000) return { next: 2000, toNext: 2000 - gained, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" };
    if (gained >= 100) return { next: 1000, toNext: 1000 - gained, color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" };
    return { next: 100, toNext: 100 - gained, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" };
  };

  const bracket = getBracketInfo(bettingGains);

  const handlePayTaxes = async () => {
    if (!canPayNow) return;
    setIsLoading(true);
    try {
      const result = await payTaxesManually(userId);
      if (result.success) {
        toast({ title: "Paiement réussi! 💸", description: result.message });
        loadTaxInfo();
      } else {
        toast({ title: "Erreur", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!taxInfo) return (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </CardContent>
    </Card>
  );

  return (
    <Card className={`border-2 ${bracket.borderColor} bg-gradient-to-br from-secondary/5 to-transparent`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-secondary">
          <AlertTriangle className="h-5 w-5" />
          Système Fiscal - Dernier Week-end du Mois
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
          <div>
            <p className="text-sm font-medium">Statut</p>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
          </div>
          {alreadyPaid ? (
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">✓ PAYÉ</Badge>
          ) : isWeekendTax ? (
            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse">⏰ EN COURS</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground">⏳ NON DISPONIBLE</Badge>
          )}
        </div>

        {alreadyPaid && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-400 mb-1">✓ Taxes Payées</p>
                <p className="text-xs text-muted-foreground">
                  Vous avez déjà payé vos taxes ce mois-ci. Prochain paiement possible le mois prochain.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 rounded-lg ${bracket.bgColor} border ${bracket.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Taxes à payer</span>
            <span className={`text-3xl font-bold ${bracket.color}`}>
              {alreadyPaid ? "0" : taxesDue}€
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Taux actuel</span>
            <span className={`font-bold ${bracket.color}`}>{Math.round(taxRate * 100)}%</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Basé sur vos gains de paris</span>
            <span className="font-medium">{bettingGains}€</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Fortune actuelle</span>
            <span className="font-medium">{fortune}€</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Prochaine période de paiement</span>
            <span className="text-xs text-muted-foreground">
              {isWeekendTax ? "🔴 EN COURS" : `${daysUntilTax} jour(s)`}
            </span>
          </div>
          {isWeekendTax ? (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs font-semibold text-yellow-400">⏰ Le dernier week-end du mois est ACTIF !</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vous pouvez payer vos taxes maintenant jusqu'à dimanche minuit.
              </p>
            </div>
          ) : (
            <>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(5, ((30 - daysUntilTax) / 30) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Les taxes peuvent être payées le dernier week-end du mois (samedi-dimanche).
              </p>
            </>
          )}
        </div>

        {bracket.next && (
          <div className="p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Progression vers prochaine tranche</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Encore <span className="font-bold text-primary">{bracket.toNext}€</span> de gains pour atteindre 
              la tranche à {Math.round(calculateTaxRate(bracket.next) * 100)}%
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" />
            Barème d'imposition
          </h4>
          <div className="space-y-1.5">
            {[
              { range: "0€ - 99€", rate: 10, current: bettingGains < 100 },
              { range: "100€ - 999€", rate: 15, current: bettingGains >= 100 && bettingGains < 1000 },
              { range: "1000€ - 1999€", rate: 19, current: bettingGains >= 1000 && bettingGains < 2000 },
              { range: "2000€+", rate: 23, current: bettingGains >= 2000 }
            ].map((tier) => (
              <div 
                key={tier.range}
                className={`flex justify-between p-2.5 rounded-lg text-sm transition-all ${
                  tier.current 
                    ? "bg-secondary/20 border-2 border-secondary/40 font-bold" 
                    : "bg-surface-alt border border-transparent"
                }`}
              >
                <span className={tier.current ? "text-foreground" : "text-muted-foreground"}>
                  {tier.range}
                </span>
                <span className={tier.current ? "text-secondary" : "text-muted-foreground"}>
                  {tier.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {!isWeekendTax && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-400 mb-1">ℹ️ Paiement indisponible</p>
                <p className="text-xs text-muted-foreground">
                  Les taxes ne peuvent être payées que le dernier week-end du mois. 
                  Revenez dans {daysUntilTax} jour(s).
                </p>
              </div>
            </div>
          </div>
        )}

        {canPayNow ? (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handlePayTaxes} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Paiement en cours...
              </>
            ) : (
              <>💸 Payer {taxesDue}€ de taxes</>
            )}
          </Button>
        ) : alreadyPaid ? (
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            ✓ Déjà payé ce mois-ci
          </Button>
        ) : !isWeekendTax ? (
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            ⏳ Disponible le dernier week-end ({daysUntilTax}j)
          </Button>
        ) : fortune < taxesDue ? (
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            Fonds insuffisants ({fortune}€ / {taxesDue}€)
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
const EquippedItemsCard = ({ equipped, inventory }: { equipped: any, inventory: any }) => {
  const getItemDetails = (itemId: string): ShopItem | null => {
    logger.log("🔍 [EquippedItems] Recherche item:", itemId);
    if (!itemId || !SHOP_ITEMS || !Array.isArray(SHOP_ITEMS)) {
      logger.log("⚠️ [EquippedItems] ItemId vide ou SHOP_ITEMS invalide");
      return null;
    }
    const item = SHOP_ITEMS.find(item => item && item.id === itemId) || null;
    logger.log("✅ [EquippedItems] Item trouvé:", item?.name || "null");
    return item;
  };

  logger.log("🎨 [EquippedItems] Equipped data:", equipped);
  
  // Vérification plus robuste pour éviter les erreurs
  const equippedAvatar = (equipped?.avatar && equipped.avatar !== "") ? getItemDetails(equipped.avatar) : null;
  const equippedTheme = (equipped?.theme && equipped.theme !== "") ? getItemDetails(equipped.theme) : null;
  const equippedBanner = (equipped?.banner && equipped.banner !== "") ? getItemDetails(equipped.banner) : null;
  const equippedTitle = (equipped?.title && equipped.title !== "") ? getItemDetails(equipped.title) : null;
  const equippedEffect = (equipped?.effect && equipped.effect !== "") ? getItemDetails(equipped.effect) : null;
  
  logger.log("🎭 [EquippedItems] Items équipés:", {
    avatar: equippedAvatar?.name || "none",
    theme: equippedTheme?.name || "none",
    banner: equippedBanner?.name || "none",
    title: equippedTitle?.name || "none",
    effect: equippedEffect?.name || "none"
  });

  const totalItems = Object.keys(inventory || {}).reduce((acc, type) => {
    if (inventory && typeof inventory[type] === 'object') {
      return acc + Object.keys(inventory[type]).length;
    }
    return acc;
  }, 0);
  
  logger.log("📦 [EquippedItems] Total items dans l'inventaire:", totalItems);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Items Équipés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{equippedAvatar?.icon || "😊"}</div>
            <div>
              <p className="text-sm font-medium">{equippedAvatar?.name || "Avatar par défaut"}</p>
              <p className="text-xs text-muted-foreground">Avatar</p>
            </div>
          </div>
          {equippedAvatar && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
          <div className="flex items-center gap-3">
            {equippedTheme?.preview ? (
              <div
                className="w-8 h-8 rounded-lg border-2 border-white/20"
                style={{ backgroundColor: equippedTheme?.preview || "#1e293b" }}
              />
            ) : (
              <div className="text-3xl">🎨</div>
            )}
            <div>
              <p className="text-sm font-medium">{equippedTheme?.name || "Thème par défaut"}</p>
              <p className="text-xs text-muted-foreground">Thème</p>
            </div>
          </div>
          {equippedTheme && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          )}
        </div>

        {equippedBanner && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-3">
              {equippedBanner?.preview ? (
                <div
                  className="w-24 h-12 rounded-lg border-2 border-white/20 relative overflow-hidden"
                  style={{ background: (equippedBanner as any)?.preview || "linear-gradient(135deg, #1e293b 0%, #334155 100%)" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">{equippedBanner?.icon || "🎪"}</span>
                  </div>
                </div>
              ) : (
                <div className="text-3xl">{equippedBanner?.icon || "🎪"}</div>
              )}
              <div>
                <p className="text-sm font-medium">{equippedBanner?.name || "Bannière"}</p>
                <p className="text-xs text-muted-foreground">Bannière</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          </div>
        )}

        {equippedTitle && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/30 via-cyan-500/30 to-indigo-500/30 border border-cyan-400/60">
                <span className="text-xl">{equippedTitle?.icon || "👑"}</span>
                <span className="text-[11px] font-semibold tracking-wide uppercase text-cyan-100">
                  {(equippedTitle as any)?.preview || equippedTitle?.name || "Titre"}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Titre</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          </div>
        )}

        {equippedEffect && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{equippedEffect?.icon || "✨"}</div>
              <div>
                <p className="text-sm font-medium">{equippedEffect?.name || "Effet"}</p>
                <p className="text-xs text-muted-foreground">Effet</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Collection : {totalItems} items possédés
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const RecentMatchesCard = ({ userId }: { userId: string }) => {
  const [matches, setMatches] = useState<
    Array<{
      id: string;
      team1: string[];
      team2: string[];
      team1Names?: string[];
      team2Names?: string[];
      score1: number;
      score2: number;
      timestamp: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      setIsLoading(true);
      try {
        const matchesRef = ref(database, "matches");
        const snapshot = await get(matchesRef);
        if (!snapshot.exists()) {
          setMatches([]);
          return;
        }
        const all: typeof matches = [];
        snapshot.forEach((child) => {
          const val = child.val();
          if (!val) return;
          const team1: string[] = Array.isArray(val.team1) ? val.team1 : [];
          const team2: string[] = Array.isArray(val.team2) ? val.team2 : [];
          if (!team1.includes(userId) && !team2.includes(userId)) return;
          all.push({
            id: child.key || "",
            team1,
            team2,
            team1Names: val.team1Names,
            team2Names: val.team2Names,
            score1: val.score1,
            score2: val.score2,
            timestamp: val.timestamp || Date.now(),
          });
        });
        all.sort((a, b) => b.timestamp - a.timestamp);
        setMatches(all.slice(0, 6));
      } catch (error) {
        logger.error("Erreur chargement matchs récents:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMatches();
  }, [userId]);

  const computeCurrentStreak = () => {
    let streak = 0;
    for (const m of matches) {
      const isTeam1 = m.team1.includes(userId);
      const isTeam2 = m.team2.includes(userId);
      if (!isTeam1 && !isTeam2) continue;
      const team1Won = m.score1 > m.score2;
      const won = (isTeam1 && team1Won) || (isTeam2 && !team1Won);
      if (won) streak++;
      else break;
    }
    return streak;
  };

  const currentStreak = computeCurrentStreak();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Historique des derniers matchs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement des matchs...
          </div>
        ) : matches.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun match enregistré pour l'instant.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Série actuelle :{" "}
              <span className="font-semibold text-foreground">
                {currentStreak} victoire{currentStreak > 1 ? "s" : ""} d'affilée
              </span>
            </p>
            <div className="space-y-2">
              {matches.map((m) => {
                const isTeam1 = m.team1.includes(userId);
                const team1Won = m.score1 > m.score2;
                const won = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);
                const opponentNames =
                  isTeam1 ? m.team2Names || m.team2 : m.team1Names || m.team1;
                const date = new Date(m.timestamp);
                const labelDate = date.toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                });
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-alt px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-semibold ${
                          won ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {won ? "Victoire" : "Défaite"} {m.score1}-{m.score2}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        vs {Array.isArray(opponentNames) ? opponentNames.join(", ") : opponentNames}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {labelDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const FeaturedCardsCard = ({ cards }: { cards: Record<string, number> }) => {
  const entries = Object.entries(cards || {});
  const featured = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-secondary" />
          Cartes BabyDex mises en avant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {featured.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Ouvre quelques boosters dans le BabyDex pour commencer ta collection.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Sélection automatique de tes cartes les plus présentes (par code).
            </p>
            <div className="space-y-2">
              {featured.map(([code, count]) => (
                <div
                  key={code}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-alt px-2 py-1.5"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      {code.replace(/\.(png|jpg|jpeg|gif)$/i, "")}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Carte BabyDex
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    x{count}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
const MyOffersSection = ({ userId }: { userId: string }) => {
  const { userProfile } = useAuth();
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  useEffect(() => {
    loadOffers();
  }, [userId]);

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      const [received, sent] = await Promise.all([
        getReceivedOffers(userId),
        getSentOffers(userId),
      ]);
      setReceivedOffers(received);
      setSentOffers(sent);
    } catch (error) {
      logger.error("Erreur chargement offres:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (offerId: string) => {
    setActionId(offerId);
    try {
      const offer = receivedOffers.find(o => o.id === offerId);
      
      await acceptOffer(userId, offerId);
      
      if (offer) {
        await notifyOfferAccepted(
          offer.buyerId,
          userProfile?.username || "Un vendeur",
          offer.listingId
        ).catch(error => {
          logger.error("Erreur notification:", error);
        });
      }
      
      toast({ 
        title: "Offre acceptée ✅", 
        description: "La transaction a été effectuée et l'acheteur a été notifié." 
      });
      
      await loadOffers();
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (offerId: string) => {
    setActionId(offerId);
    try {
      const offer = receivedOffers.find(o => o.id === offerId);
      
      await rejectOffer(userId, offerId);
      
      if (offer) {
        await notifyOfferRejected(
          offer.buyerId,
          userProfile?.username || "Un vendeur",
          offer.listingId
        ).catch(error => {
          logger.error("Erreur notification:", error);
        });
      }
      
      toast({ 
        title: "Offre rejetée", 
        description: "L'acheteur a été notifié." 
      });
      
      await loadOffers();
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setActionId(null);
    }
  };

  const handleSendCounter = async () => {
    if (!selectedOffer || !counterAmount) return;
    
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ 
        title: "Erreur", 
        description: "Montant invalide", 
        variant: "destructive" 
      });
      return;
    }

    try {
      await counterOffer(userId, selectedOffer.id, amount);
      
      await notifyOfferCountered(
        selectedOffer.buyerId,
        userProfile?.username || "Un vendeur",
        amount,
        selectedOffer.listingId
      ).catch(error => {
        logger.error("Erreur notification:", error);
      });
      
      toast({
        title: "Contre-offre envoyée ✅",
        description: `Proposition de ${amount}€ envoyée à l'acheteur`,
      });
      
      setShowCounterDialog(false);
      setCounterAmount("");
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expirée";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h restantes`;
    const days = Math.floor(hours / 24);
    return `${days}j restantes`;
  };

  const getStatusBadge = (status: Offer["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500">En attente</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">Acceptée</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500">Rejetée</Badge>;
      case "countered":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500">Contre-offre</Badge>;
      case "expired":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500">Expirée</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Tabs defaultValue="received">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              Offres Reçues
              {receivedOffers.filter((o) => o.status === "pending").length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                  {receivedOffers.filter((o) => o.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Offres Envoyées
              {sentOffers.filter((o) => o.status === "countered").length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-blue-500">
                  {sentOffers.filter((o) => o.status === "countered").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : receivedOffers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Aucune offre reçue pour le moment.
                </CardContent>
              </Card>
            ) : (
              receivedOffers.map((offer) => {
                const isExpired = Date.now() > offer.expiresAt;
                const isPending = offer.status === "pending" && !isExpired;

                return (
                  <Card key={offer.id} className={isPending ? "border-yellow-500/50" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-sm">
                            Listing #{offer.listingId.slice(-6)}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            De: {offer.buyerId.slice(0, 6)}...
                          </p>
                        </div>
                        {getStatusBadge(offer.status)}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Montant proposé</span>
                          <span className="font-semibold text-lg">{offer.amount}€</span>
                        </div>

                        {offer.counterOffer && (
                          <div className="flex items-center justify-between bg-blue-500/10 p-2 rounded">
                            <span className="text-blue-600 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Contre-offre
                            </span>
                            <span className="font-semibold text-blue-600">{offer.counterOffer}€</span>
                          </div>
                        )}

                        {offer.message && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-xs italic">"{offer.message}"</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeRemaining(offer.expiresAt)}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(offer.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => handleReject(offer.id)}
                            disabled={actionId === offer.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {
                              setSelectedOffer(offer);
                              setCounterAmount((offer.amount * 1.1).toFixed(0));
                              setShowCounterDialog(true);
                            }}
                            disabled={actionId === offer.id}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Contre-offre
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => handleAccept(offer.id)}
                            disabled={actionId === offer.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accepter
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : sentOffers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Aucune offre envoyée pour le moment.
                </CardContent>
              </Card>
            ) : (
              sentOffers.map((offer) => (
                <Card key={offer.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-sm">
                          Listing #{offer.listingId.slice(-6)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          À: {offer.sellerId.slice(0, 6)}...
                        </p>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Montant proposé</span>
                        <span className="font-semibold text-lg">{offer.amount}€</span>
                      </div>

                      {offer.counterOffer && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-center">
                          <AlertTriangle className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                          <p className="text-blue-600 text-xs">
                            Le vendeur a proposé {offer.counterOffer}€
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeRemaining(offer.expiresAt)}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(offer.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faire une contre-offre</DialogTitle>
            <DialogDescription>
              Proposez un nouveau prix à l'acheteur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedOffer && (
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Offre initiale:</span>
                  <span className="font-semibold">{selectedOffer.amount}€</span>
                </div>
                {selectedOffer.message && (
                  <div className="text-xs italic text-muted-foreground pt-2 border-t">
                    "{selectedOffer.message}"
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Votre contre-offre (€)
              </label>
              <Input
                type="number"
                placeholder="Montant"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                💡 Proposez un prix intermédiaire pour maximiser vos chances
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCounterDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button onClick={handleSendCounter} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
const CardStatsSection = () => {
  const [searchCode, setSearchCode] = useState("");
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<MarketStats[]>([]);

  const handleSearch = async () => {
    const input = searchCode.trim().toLowerCase();
    logger.log("🔎 [Profile] Recherche pour:", input);
    
    if (!input) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez entrer un nom ou un code.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      let targetCode = "";

      const { getCardByCode, codeToCardMap } = await import("@/lib/cardSystem");
      const directCard = getCardByCode(input.toUpperCase());
      logger.log("🗂️ [Profile] Carte directe trouvée:", directCard);
      
      if (directCard && directCard.found) {
        targetCode = directCard.code;
      } else {
        logger.log("🔍 [Profile] Recherche par nom dans codeToCardMap...");
        let foundCode: string | null = null;
        
        for (const season of Object.keys(codeToCardMap)) {
          const cards = codeToCardMap[season];
          foundCode = Object.keys(cards).find(code => {
            const nomSansExtension = cards[code].nom
              .toLowerCase()
              .replace(/\.(png|jpg|jpeg|gif)$/i, '');
            
            return nomSansExtension.includes(input) || 
                   cards[code].nom.toLowerCase().includes(input);
          }) || null;
          
          if (foundCode) {
            logger.log("✅ [Profile] Code trouvé:", foundCode, "dans la saison:", season);
            break;
          }
        }
        
        if (!foundCode) {
          logger.log("❌ [Profile] Aucune carte trouvée pour:", input);
          toast({ 
            title: "Non trouvé", 
            description: `Aucune carte ne correspond à "${searchCode}". Vérifiez l'orthographe.`,
            variant: "destructive" 
          });
          setIsLoading(false);
          return;
        }
        
        targetCode = foundCode;
      }

      logger.log("🎯 [Profile] Code cible final:", targetCode);
      logger.log("📊 [Profile] Appel getMarketStats pour:", targetCode);
      
      const result = await getMarketStats(targetCode);
      logger.log("📈 [Profile] Stats récupérées:", result);
      logger.log("💰 [Profile] Prix history:", result?.priceHistory);
      
      if (!result) {
        toast({ 
          title: "Aucune donnée", 
          description: `La carte "${targetCode}" n'a pas encore été vendue sur le marché.`, 
          variant: "destructive" 
        });
        setStats(null);
      } else {
        setStats(result);
        
        setRecentSearches((prev) => {
          const filtered = prev.filter((s) => s.cardCode !== result.cardCode);
          return [result, ...filtered].slice(0, 3);
        });
        
        toast({
          title: "✅ Carte trouvée",
          description: `Statistiques de ${result.cardCode} chargées`,
        });
      }
    } catch (error: any) {
      logger.error("❌ [Profile] Erreur recherche stats:", error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de charger les statistiques.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceChange = (history: Array<{ date: number; price: number }>) => {
    if (!history || !Array.isArray(history) || history.length < 2) return null;
    const oldest = history[0].price;
    const newest = history[history.length - 1].price;
    const change = ((newest - oldest) / oldest) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      isIncrease: change > 0,
    };
  };

  const PriceHistoryChart = ({ history }: { history: Array<{ date: number; price: number }> }) => {
    logger.log("📊 [Profile] PriceHistoryChart appelé avec:", history);
    
    if (!history || !Array.isArray(history) || history.length === 0) {
      return (
        <div className="h-32 bg-muted/50 rounded-lg p-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
        </div>
      );
    }

    const validHistory = history.filter(h => {
      return h && 
             typeof h === 'object' && 
             typeof h.price === 'number' && 
             typeof h.date === 'number' &&
             h.price > 0;
    });
    
    logger.log("✅ [Profile] Historique valide filtré:", validHistory);
    
    if (validHistory.length === 0) {
      return (
        <div className="h-32 bg-muted/50 rounded-lg p-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Données invalides</p>
        </div>
      );
    }

    const maxPrice = Math.max(...validHistory.map((p) => p.price));
    const minPrice = Math.min(...validHistory.map((p) => p.price));
    const range = maxPrice - minPrice || 1;

    return (
      <div className="space-y-3">
        <div className="flex items-end gap-1 h-32 bg-muted/50 rounded-lg p-4">
          {validHistory.map((item, i) => {
            const height = ((item.price - minPrice) / range) * 100;
            const isRecent = i === validHistory.length - 1;

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
                  {new Date(item.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Min: {minPrice}€</span>
          <span>Max: {maxPrice}€</span>
          <span>Moyenne: {(validHistory.reduce((sum, h) => sum + h.price, 0) / validHistory.length).toFixed(2)}€</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            Rechercher une carte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 Recherche intelligente : tapez "Lilwenn" ou "N831", les deux fonctionnent !
            </p>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {stats.cardCode || "Carte inconnue"}
                  {stats.priceHistory && stats.priceHistory.length > 0 && getPriceChange(stats.priceHistory) && (
                    <Badge
                      variant="outline"
                      className={
                        getPriceChange(stats.priceHistory)!.isIncrease
                          ? "bg-green-500/10 text-green-600 border-green-500"
                          : "bg-red-500/10 text-red-600 border-red-500"
                      }
                    >
                      {getPriceChange(stats.priceHistory)!.isIncrease ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {getPriceChange(stats.priceHistory)!.percentage}%
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Données sur {stats.priceHistory?.length || 0} vente(s)
                </p>
              </div>
              <Badge className="bg-primary">
                <ShoppingBag className="h-3 w-3 mr-1" />
                {stats.totalSales || 0} ventes
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
                Historique des Prix
              </h3>
              {stats.priceHistory && stats.priceHistory.length > 0 ? (
                <PriceHistoryChart history={stats.priceHistory} />
              ) : (
                <div className="h-32 bg-muted/50 rounded-lg p-4 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
                </div>
              )}
            </div>

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
      )}

      {recentSearches.length > 0 && !stats && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recherches récentes</h3>
          <div className="grid grid-cols-1 gap-3">
            {recentSearches.map((search) => (
              <Card
                key={search.cardCode}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  setSearchCode(search.cardCode);
                  setStats(search);
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{search.cardCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {search.totalSales} ventes · Moy: {search.averagePrice.toFixed(2)}€
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
const Profile = () => {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Array<Friend>>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; username: string } | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "club" | "offers" | "market">("overview");
  
  const [agentData, setAgentData] = useState<{
    fortune: number;
    bettingGains: number;
    equipped: {
      avatar: string;
      theme: string;
      banner: string;
      title: string;
      effect: string;
    };
    inventory: any;
    cards: Record<string, number>;
  }>({
    fortune: 0,
    bettingGains: 0,
    equipped: { avatar: "", theme: "", banner: "", title: "", effect: "" },
    inventory: {},
    cards: {},
  });
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (!user) return;

    setIsLoadingAgent(true);
    const userRef = ref(database, `users/${user.uid}`);

    // ✅ Listener temps réel pour synchronisation automatique
    const unsubscribe = onValue(userRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const equipped = {
            avatar: data.avatar || "",
            theme: data.theme || "",
            banner: data.banner || "",
            title: data.title || "",
            effect: data.effect || "",
          };

          setAgentData({
            fortune: data.fortune || 0,
            bettingGains: data.bettingGains || 0,
            equipped,
            inventory: data.inventory || {},
            cards: data.cards || {},
          });

          if (equipped.theme) {
            const themeItem = SHOP_ITEMS.find(item => item.id === equipped.theme);
            if (themeItem && themeItem.preview) {
              applyTheme(themeItem.preview);
            }
          }

          logger.log("✅ [Profile] Données mises à jour en temps réel");
        }
      } catch (error) {
        logger.error("Erreur chargement données utilisateur:", error);
      } finally {
        setIsLoadingAgent(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const [friendsList, requests] = await Promise.all([
          getFriends(user.uid), 
          getPendingFriendRequests(user.uid)
        ]);
        setFriends(friendsList);
        setFriendRequests(requests);
      } catch (error) {
        logger.error("Erreur chargement amis:", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };
    loadFriends();
    const unsubscribe = onFriendsUpdate(user.uid, (updatedFriends) => { 
      setFriends(updatedFriends); 
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const userSettings = await getUserSettings(user.uid);
        setSettings(userSettings);
      } catch (error) {
        logger.error("Erreur chargement paramètres:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (!user || debouncedSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      const results = await searchUsers(debouncedSearchTerm, user.uid);
      setSearchResults(results);
    };
    search();
  }, [debouncedSearchTerm, user]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Déconnexion réussie", description: "À bientôt !" });
      navigate("/auth");
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: "Impossible de se déconnecter.", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!user || !settings) return;
    try {
      await updateUserSettings(user.uid, settings);
      toast({ 
        title: "Paramètres sauvegardés! ⚙️", 
        description: "Vos préférences ont été mises à jour." 
      });
      setShowSettings(false);
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: "Impossible de sauvegarder les paramètres.", 
        variant: "destructive" 
      });
    }
  };

  const handleSendFriendRequest = async (targetUserId: string, targetUsername: string) => {
    if (!user || !userProfile) return;
    setIsSendingRequest(targetUserId);
    try {
      await sendFriendRequest(user.uid, userProfile.username, targetUserId);
      toast({ 
        title: "Demande envoyée! 🤝", 
        description: `Demande d'ami envoyée à ${targetUsername}` 
      });
      setSearchTerm("");
      setSearchResults([]);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingRequest(null);
    }
  };

  const handleAcceptRequest = async (requestId: string, username: string) => {
    try {
      await acceptFriendRequest(requestId);
      toast({ 
        title: "Ami ajouté! ✅", 
        description: `${username} est maintenant votre ami` 
      });
      if (user) {
        const requests = await getPendingFriendRequests(user.uid);
        setFriendRequests(requests);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      toast({ title: "Demande refusée", description: "La demande a été refusée" });
      if (user) {
        const requests = await getPendingFriendRequests(user.uid);
        setFriendRequests(requests);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveFriend = async (friendId: string, friendUsername: string) => {
    if (!user) return;
    try {
      await removeFriend(user.uid, friendId);
      toast({ 
        title: "Ami supprimé", 
        description: `${friendUsername} a été retiré de vos amis` 
      });
      if (selectedFriend?.id === friendId) setSelectedFriend(null);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  if (!user || !userProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const profileData = userProfile || { 
    username: user?.displayName || "Joueur", 
    role: "player" as const, 
    eloRating: 1000, 
    wins: 0, 
    losses: 0 
  };

  return (
    <AppLayout>
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-6 flex justify-end gap-2"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowNotifications(true)} 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {friendRequests.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold animate-pulse">
              {friendRequests.length}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings className="h-5 w-5" />
        </Button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-4 sm:mb-6"
      >
        <ProfileHeader
          username={profileData.username}
          role={profileData.role}
          eloRating={profileData.eloRating}
          rank={1}
          equippedAvatar={agentData.equipped.avatar}
          equippedBanner={agentData.equipped.banner}
          equippedTitle={agentData.equipped.title}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview">Résumé</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="club">Club</TabsTrigger>
            <TabsTrigger value="offers">Offres</TabsTrigger>
            <TabsTrigger value="market">Marché</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <StatsGrid
              wins={profileData.wins}
              losses={profileData.losses}
              fortune={agentData.fortune}
              totalEarned={agentData.bettingGains}
            />
            {isLoadingAgent ? (
              <Card>
                <CardContent className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">Chargement...</p>
                </CardContent>
              </Card>
            ) : (
              <EquippedItemsCard
                equipped={agentData.equipped}
                inventory={agentData.inventory}
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => navigate("/shop")}
                >
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Boutique
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => navigate("/inventory")}
                >
                  <Package className="h-4 w-4 text-primary" />
                  Inventaire
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => navigate("/market")}
                >
                  <DollarSign className="h-4 w-4 text-primary" />
                  Marché des Cartes
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => navigate("/chat")}
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Messages
                </Button>
                {userProfile?.role === "admin" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => navigate("/admin")}
                  >
                    <Shield className="h-4 w-4" />
                    Panneau Admin
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setShowFriends(true)}
                >
                  <UserPlus className="h-4 w-4 text-primary" />
                  Gérer les amis
                  <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    {friends.length}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setShowPrivacy(true)}
                >
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Confidentialité
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 text-secondary hover:text-secondary"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-4 space-y-4">
            {user && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RecentMatchesCard userId={user.uid} />
                <FeaturedCardsCard cards={agentData.cards} />
              </div>
            )}
            {user && (
              <TaxInfoCard
                userId={user.uid}
                fortune={agentData.fortune}
                bettingGains={agentData.bettingGains}
              />
            )}
            {user && <BadgesSection userId={user.uid} />}
            {user && <FortuneHistoryCard userId={user.uid} />}
          </TabsContent>

          <TabsContent value="club" className="mt-4 space-y-4">
            {user && <ClubCard userId={user.uid} />}
          </TabsContent>

          <TabsContent value="offers" className="mt-4 space-y-4">
            {user && <MyOffersSection userId={user.uid} />}
          </TabsContent>

          <TabsContent value="market" className="mt-4 space-y-4">
            <CardStatsSection />
          </TabsContent>
        </Tabs>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.6 }} 
        className="mt-6"
      >
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Connecté en tant que: <span className="text-foreground">{user?.email}</span>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* DIALOGS - Suite dans partie 5b */}
{/* DIALOGS */}
      
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Demandes d'ami ({friendRequests.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {friendRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune demande en attente</p>
            ) : (
              friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-alt">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{request.fromUsername}</p>
                    <p className="text-xs text-muted-foreground">Demande d'ami</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.id, request.fromUsername)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeclineRequest(request.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFriends} onOpenChange={setShowFriends}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Mes Amis ({friends.length})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowFriends(false);
                setShowAddFriend(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un ami
            </Button>

            {isLoadingFriends ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Vous n'avez pas encore d'amis</p>
                <p className="text-sm mt-2">Ajoutez des amis pour jouer ensemble !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => {
                  const friendAvatar = (friend.avatar && friend.avatar !== "")
  ? SHOP_ITEMS.find((item) => item && item.id === friend.avatar) 
  : null;
                  const avatarIcon = friendAvatar?.icon || "😊";
                  
                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-alt hover:bg-surface-alt/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedFriend({ id: friend.id, username: friend.username });
                        setShowFriends(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {avatarIcon}
                        </div>
                        <div>
                          <p className="font-medium">{friend.username}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ELO: {friend.eloRating}</span>
                            <span>•</span>
                            <span
                              className={
                                friend.status === "online"
                                  ? "text-green-500 flex items-center gap-1"
                                  : "text-muted-foreground"
                              }
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  friend.status === "online" ? "bg-green-500" : "bg-muted-foreground"
                                }`}
                              />
                              {friend.status === "online" ? "En ligne" : "Hors ligne"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.id, friend.username);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Ajouter un ami
            </DialogTitle>
            <DialogDescription>
              Recherchez un joueur par son nom d'utilisateur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => {
                  const isAlreadyFriend = friends.some((f) => f.id === user.id);
                  const isSending = isSendingRequest === user.id;
                  const userAvatar = (user.avatar && user.avatar !== "")
  ? SHOP_ITEMS.find((item) => item && item.id === user.avatar) 
  : null;
                  const avatarIcon = userAvatar?.icon || "😊";

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-alt"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {avatarIcon}
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">ELO: {user.eloRating}</p>
                        </div>
                      </div>
                      {isAlreadyFriend ? (
                        <Badge variant="outline">Déjà ami</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSendFriendRequest(user.id, user.username)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchTerm.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Paramètres
            </DialogTitle>
          </DialogHeader>

          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : settings ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">Activer les notifications</Label>
                    <Switch
                      id="notifications"
                      checked={settings.notifications.enabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enabled: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="matchReminders">Rappels de matchs</Label>
                    <Switch
                      id="matchReminders"
                      checked={settings.notifications.matchReminders}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, matchReminders: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="friendRequests">Demandes d'ami</Label>
                    <Switch
                      id="friendRequests"
                      checked={settings.notifications.friendRequests}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, friendRequests: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Son</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound">Activer le son</Label>
                    <Switch
                      id="sound"
                      checked={settings.sound.enabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          sound: { ...settings.sound, enabled: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleSaveSettings} className="flex-1">
                  Sauvegarder
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Confidentialité
            </DialogTitle>
          </DialogHeader>

          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : settings ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Visibilité</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="profilePublic">Profil public</Label>
                      <p className="text-xs text-muted-foreground">
                        Permettre aux autres joueurs de voir votre profil
                      </p>
                    </div>
                    <Switch
                      id="profilePublic"
                      checked={settings.privacy.profilePublic}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, profilePublic: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showStats">Afficher les statistiques</Label>
                      <p className="text-xs text-muted-foreground">
                        Afficher vos stats sur votre profil public
                      </p>
                    </div>
                    <Switch
                      id="showStats"
                      checked={settings.privacy.showStats}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, showStats: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allowFriendRequests">Demandes d'ami</Label>
                      <p className="text-xs text-muted-foreground">
                        Autoriser les autres à vous envoyer des demandes
                      </p>
                    </div>
                    <Switch
                      id="allowFriendRequests"
                      checked={settings.privacy.allowFriendRequests}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, allowFriendRequests: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showOnlineStatus">Statut en ligne</Label>
                      <p className="text-xs text-muted-foreground">
                        Afficher votre statut en ligne aux autres
                      </p>
                    </div>
                    <Switch
                      id="showOnlineStatus"
                      checked={settings.privacy.showOnlineStatus}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, showOnlineStatus: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPrivacy(false)} className="flex-1">
                  Annuler
                </Button>
                <Button
                  onClick={async () => {
                    await handleSaveSettings();
                    setShowPrivacy(false);
                  }}
                  className="flex-1"
                >
                  Sauvegarder
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

     <FriendProfileDialog 
        isOpen={!!selectedFriend} 
        onClose={() => { 
          setSelectedFriend(null); 
          setShowFriends(true); 
        }} 
        friendId={selectedFriend?.id || ""} 
        friendUsername={selectedFriend?.username || ""} 
        onRemoveFriend={handleRemoveFriend} 
        canRemove={true} 
      /> 
    </AppLayout>
  );
};

export default Profile;

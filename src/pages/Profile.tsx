import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { motion } from "framer-motion";
import { Settings, LogOut, UserPlus, Bell, Shield, Users, Search, Loader2, X, Check, ShoppingBag, AlertTriangle, Info, TrendingUp, Eye, Sparkles, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { BadgesSection } from "@/components/profile/BadgesSection";
import { FortuneHistoryCard } from "@/components/profile/FortuneHistoryCard";
import { ClubCard } from "@/components/profile/ClubCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { FriendProfileDialog } from "@/components/profile/FriendProfileDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { getFriends, getPendingFriendRequests, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, searchUsers, getUserSettings, updateUserSettings, onFriendsUpdate, type Friend, type FriendRequest, type UserSettings } from "@/lib/firebaseFriends";
import { getUserTaxInfo, payTaxesManually, isLastWeekendOfMonth, getDaysUntilLastWeekend } from "@/lib/taxSystem";
import { calculateTaxRate } from "@/lib/utils";
import { SHOP_ITEMS, type ShopItem } from "@/lib/firebaseExtended";
import { applyTheme } from "@/lib/applyTheme";

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
      console.error("Erreur chargement taxes:", error);
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

  if (!taxInfo) return <Card><CardContent className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;

  return (
    <Card className={`border-2 ${bracket.borderColor} bg-gradient-to-br from-secondary/5 to-transparent`}>
      <CardHeader><CardTitle className="flex items-center gap-2 text-secondary"><AlertTriangle className="h-5 w-5" />Système Fiscal - Dernier Week-end du Mois</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
          <div><p className="text-sm font-medium">Statut</p><p className="text-xs text-muted-foreground">Ce mois-ci</p></div>
          {alreadyPaid ? <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">✓ PAYÉ</Badge> : isWeekendTax ? <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse">⏰ EN COURS</Badge> : <Badge className="bg-muted text-muted-foreground">⏳ NON DISPONIBLE</Badge>}
        </div>
        {alreadyPaid && <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30"><div className="flex items-start gap-2"><Info className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs font-semibold text-green-400 mb-1">✓ Taxes Payées</p><p className="text-xs text-muted-foreground">Vous avez déjà payé vos taxes ce mois-ci. Prochain paiement possible le mois prochain.</p></div></div></div>}
        <div className={`p-4 rounded-lg ${bracket.bgColor} border ${bracket.borderColor}`}>
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Taxes à payer</span><span className={`text-3xl font-bold ${bracket.color}`}>{alreadyPaid ? "0" : taxesDue}€</span></div>
          <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Taux actuel</span><span className={`font-bold ${bracket.color}`}>{Math.round(taxRate * 100)}%</span></div>
          <div className="flex items-center justify-between text-xs mt-1"><span className="text-muted-foreground">Basé sur vos gains de paris</span><span className="font-medium">{bettingGains}€</span></div>
          <div className="flex items-center justify-between text-xs mt-1"><span className="text-muted-foreground">Fortune actuelle</span><span className="font-medium">{fortune}€</span></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Prochaine période de paiement</span><span className="text-xs text-muted-foreground">{isWeekendTax ? "🔴 EN COURS" : `${daysUntilTax} jour(s)`}</span></div>
          {isWeekendTax ? <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"><p className="text-xs font-semibold text-yellow-400">⏰ Le dernier week-end du mois est ACTIF !</p><p className="text-xs text-muted-foreground mt-1">Vous pouvez payer vos taxes maintenant jusqu'à dimanche minuit.</p></div> : <><div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-2"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 transition-all duration-500 rounded-full" style={{ width: `${Math.max(5, ((30 - daysUntilTax) / 30) * 100)}%` }} /></div><p className="text-xs text-muted-foreground">Les taxes peuvent être payées le dernier week-end du mois (samedi-dimanche).</p></>}
        </div>
        {bracket.next && <div className="p-3 rounded-lg bg-surface-alt border border-border"><div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Progression vers prochaine tranche</span></div><p className="text-xs text-muted-foreground">Encore <span className="font-bold text-primary">{bracket.toNext}€</span> de gains pour atteindre la tranche à {Math.round(calculateTaxRate(bracket.next) * 100)}%</p></div>}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2"><Info className="h-4 w-4" />Barème d'imposition</h4>
          <div className="space-y-1.5">{[{ range: "0€ - 99€", rate: 10, current: bettingGains < 100 }, { range: "100€ - 999€", rate: 15, current: bettingGains >= 100 && bettingGains < 1000 }, { range: "1000€ - 1999€", rate: 19, current: bettingGains >= 1000 && bettingGains < 2000 }, { range: "2000€+", rate: 23, current: bettingGains >= 2000 }].map((tier) => <div key={tier.range} className={`flex justify-between p-2.5 rounded-lg text-sm transition-all ${tier.current ? "bg-secondary/20 border-2 border-secondary/40 font-bold" : "bg-surface-alt border border-transparent"}`}><span className={tier.current ? "text-foreground" : "text-muted-foreground"}>{tier.range}</span><span className={tier.current ? "text-secondary" : "text-muted-foreground"}>{tier.rate}%</span></div>)}</div>
        </div>
        {!isWeekendTax && <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30"><div className="flex items-start gap-2"><Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" /><div className="flex-1"><p className="text-xs font-semibold text-blue-400 mb-1">ℹ️ Paiement indisponible</p><p className="text-xs text-muted-foreground">Les taxes ne peuvent être payées que le dernier week-end du mois. Revenez dans {daysUntilTax} jour(s).</p></div></div></div>}
        {canPayNow ? <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handlePayTaxes} disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Paiement en cours...</> : <>💸 Payer {taxesDue}€ de taxes</>}</Button> : alreadyPaid ? <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>✓ Déjà payé ce mois-ci</Button> : !isWeekendTax ? <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>⏳ Disponible le dernier week-end ({daysUntilTax}j)</Button> : fortune < taxesDue ? <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>Fonds insuffisants ({fortune}€ / {taxesDue}€)</Button> : null}
      </CardContent>
    </Card>
  );
};

// NOUVEAU COMPOSANT : Affichage des items équipés
const EquippedItemsCard = ({ equipped, inventory }: { equipped: any, inventory: any }) => {
  const getItemDetails = (itemId: string): ShopItem | null => {
    return SHOP_ITEMS.find(item => item.id === itemId) || null;
  };

  const equippedAvatar = equipped.avatar ? getItemDetails(equipped.avatar) : null;
  const equippedTheme = equipped.theme ? getItemDetails(equipped.theme) : null;
  const equippedBanner = equipped.banner ? getItemDetails(equipped.banner) : null;
  const equippedEffect = equipped.effect ? getItemDetails(equipped.effect) : null;

  // Calculer le nombre total d'items possédés
  const totalItems = Object.keys(inventory || {}).reduce((acc, type) => {
    if (typeof inventory[type] === 'object') {
      return acc + Object.keys(inventory[type]).length;
    }
    return acc;
  }, 0);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Items Équipés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Avatar */}
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

        {/* Thème */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
          <div className="flex items-center gap-3">
            {equippedTheme?.preview ? (
              <div 
                className="w-8 h-8 rounded-lg border-2 border-white/20"
                style={{ backgroundColor: equippedTheme.preview }}
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

        {/* Bannière */}
        {equippedBanner && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{equippedBanner.icon}</div>
              <div>
                <p className="text-sm font-medium">{equippedBanner.name}</p>
                <p className="text-xs text-muted-foreground">Bannière</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          </div>
        )}

        {/* Effet */}
        {equippedEffect && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{equippedEffect.icon}</div>
              <div>
                <p className="text-sm font-medium">{equippedEffect.name}</p>
                <p className="text-xs text-muted-foreground">Effet</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Équipé
            </Badge>
          </div>
        )}

        {/* Stats de collection */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Collection : {totalItems} items possédés
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const Profile = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{id: string, username: string} | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [agentData, setAgentData] = useState<{ 
    fortune: number; 
    bettingGains: number;
    equipped: {
      avatar: string;
      theme: string;
      banner: string;
      effect: string;
    };
    inventory: Record<string, unknown>;
  }>({ 
    fortune: 0, 
    bettingGains: 0,
    equipped: { avatar: "", theme: "", banner: "", effect: "" },
    inventory: {}
  });
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState<string | null>(null);

  const profileData = userProfile || { username: user?.displayName || "Joueur", role: "player" as const, eloRating: 1000, wins: 0, losses: 0 };

  useEffect(() => {
    if (!user) return;
    const loadAgentData = async () => {
      setIsLoadingAgent(true);
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const equipped = {
            avatar: data.avatar || "",
            theme: data.theme || "",
            banner: data.banner || "",
            effect: data.effect || "",
          };
          
          setAgentData({ 
            fortune: data.fortune || 0, 
            bettingGains: data.bettingGains || 0,
            equipped,
            inventory: data.inventory || {}
          });
          
          // Appliquer le thème équipé
          if (equipped.theme) {
            const themeItem = SHOP_ITEMS.find(item => item.id === equipped.theme);
            if (themeItem && themeItem.preview) {
              applyTheme(themeItem.preview);
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement données utilisateur:", error);
      } finally {
        setIsLoadingAgent(false);
      }
    };
    loadAgentData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const [friendsList, requests] = await Promise.all([getFriends(user.uid), getPendingFriendRequests(user.uid)]);
        setFriends(friendsList);
        setFriendRequests(requests);
      } catch (error) {
        console.error("Erreur chargement amis:", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };
    loadFriends();
    const unsubscribe = onFriendsUpdate(user.uid, (updatedFriends) => { setFriends(updatedFriends); });
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
        console.error("Erreur chargement paramètres:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, [user]);

  // ✅ OPTIMISATION: Debounce de la recherche
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
      toast({ title: "Erreur", description: "Impossible de se déconnecter.", variant: "destructive" });
    }
  };

  const handleSaveSettings = async () => {
    if (!user || !settings) return;
    try {
      await updateUserSettings(user.uid, settings);
      toast({ title: "Paramètres sauvegardés! ⚙️", description: "Vos préférences ont été mises à jour." });
      setShowSettings(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
    }
  };

  const handleSendFriendRequest = async (targetUserId: string, targetUsername: string) => {
    if (!user || !userProfile) return;
    setIsSendingRequest(targetUserId);
    try {
      await sendFriendRequest(user.uid, userProfile.username, targetUserId);
      toast({ title: "Demande envoyée! 🤝", description: `Demande d'ami envoyée à ${targetUsername}` });
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
      toast({ title: "Ami ajouté! ✅", description: `${username} est maintenant votre ami` });
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
      toast({ title: "Ami supprimé", description: `${friendUsername} a été retiré de vos amis` });
      if (selectedFriend?.id === friendId) setSelectedFriend(null);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={() => setShowNotifications(true)} className="relative">
          <Bell className="h-5 w-5" />
          {friendRequests.length > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold animate-pulse">{friendRequests.length}</span>}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}><Settings className="h-5 w-5" /></Button>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8"><ProfileHeader username={profileData.username} role={profileData.role} eloRating={profileData.eloRating} rank={1} equippedAvatar={agentData.equipped.avatar} equippedBanner={agentData.equipped.banner} /></motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6"><StatsGrid wins={profileData.wins} losses={profileData.losses} fortune={agentData.fortune} totalEarned={agentData.bettingGains} /></motion.div>
      
      {/* NOUVEAU : Items Équipés */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
        {isLoadingAgent ? (
          <Card><CardContent className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Chargement...</p></CardContent></Card>
        ) : (
          <EquippedItemsCard equipped={agentData.equipped} inventory={agentData.inventory} />
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">{isLoadingAgent ? <Card><CardContent className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Chargement...</p></CardContent></Card> : user && <TaxInfoCard userId={user.uid} fortune={agentData.fortune} bettingGains={agentData.bettingGains} />}</motion.div>
      {user && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6"><BadgesSection userId={user.uid} /></motion.div>}
      {user && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"><FortuneHistoryCard userId={user.uid} /><ClubCard userId={user.uid} /></motion.div>}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg">Actions rapides</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => navigate("/shop")}><ShoppingBag className="h-4 w-4 text-primary" />Boutique</Button><Button variant="outline" className="w-full justify-start gap-3" onClick={() => navigate("/inventory")}><Package className="h-4 w-4 text-primary" />Inventaire</Button>
            {userProfile?.role === "admin" && <Button variant="outline" className="w-full justify-start gap-3 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" onClick={() => navigate("/admin")}><Shield className="h-4 w-4" />Panneau Admin</Button>}
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setShowFriends(true)}><UserPlus className="h-4 w-4 text-primary" />Gérer les amis<span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">{friends.length}</span></Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setShowPrivacy(true)}><Shield className="h-4 w-4 text-muted-foreground" />Confidentialité</Button>
            <Button variant="outline" className="w-full justify-start gap-3 text-secondary hover:text-secondary" onClick={handleLogout}><LogOut className="h-4 w-4" />Déconnexion</Button>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6"><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Connecté en tant que: <span className="text-foreground">{user?.email}</span></p></CardContent></Card></motion.div>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Demandes d'ami ({friendRequests.length})</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">{friendRequests.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune demande en attente</p> : friendRequests.map((request) => <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-alt"><div className="flex-1"><p className="text-sm font-medium">{request.fromUsername}</p><p className="text-xs text-muted-foreground">Demande d'ami</p></div><div className="flex gap-2"><Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.id, request.fromUsername)}><Check className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => handleDeclineRequest(request.id)}><X className="h-4 w-4" /></Button></div></div>)}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />Paramètres</DialogTitle></DialogHeader>
          {isLoadingSettings ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : settings ? <><div className="space-y-4"><div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Notifications</Label><p className="text-xs text-muted-foreground">Recevoir des notifications</p></div><Switch checked={settings.notifications.enabled} onCheckedChange={(checked) => setSettings({ ...settings, notifications: { ...settings.notifications, enabled: checked } })} /></div><div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Sons</Label><p className="text-xs text-muted-foreground">Activer les effets sonores</p></div><Switch checked={settings.sound.enabled} onCheckedChange={(checked) => setSettings({ ...settings, sound: { ...settings.sound, enabled: checked } })} /></div><div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Mode sombre</Label><p className="text-xs text-muted-foreground">Thème de l'application</p></div><Switch checked={settings.appearance.darkMode} onCheckedChange={(checked) => setSettings({ ...settings, appearance: { ...settings.appearance, darkMode: checked } })} /></div></div><div className="flex gap-2 mt-4"><Button onClick={() => setShowSettings(false)} variant="outline" className="flex-1">Annuler</Button><Button onClick={handleSaveSettings} variant="default" className="flex-1">Sauvegarder</Button></div></> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showFriends} onOpenChange={setShowFriends}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Amis ({friends.length})</DialogTitle></DialogHeader>
          <Button className="w-full" onClick={() => { setShowFriends(false); setShowAddFriend(true); }}><UserPlus className="h-4 w-4 mr-2" />Ajouter un ami</Button>
          <div className="space-y-2 max-h-96 overflow-y-auto">{isLoadingFriends ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : friends.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucun ami pour le moment</p> : friends.map((friend) => <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-alt group hover:bg-surface-alt/80 transition-colors"><div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => { setSelectedFriend({ id: friend.id, username: friend.username }); setShowFriends(false); }}><div className="relative"><div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div><div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${friend.status === "online" ? "bg-green-500" : "bg-gray-500"}`} /></div><div><p className="font-medium flex items-center gap-2">{friend.username}<Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" /></p><p className="text-xs text-muted-foreground">ELO: {friend.eloRating}</p></div></div><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.id, friend.username); }}><X className="h-4 w-4 text-destructive" /></Button></div>)}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" />Rechercher un joueur</DialogTitle></DialogHeader>
          <Input placeholder="Entrez un nom d'utilisateur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" />
          <div className="space-y-2 max-h-64 overflow-y-auto">{searchResults.length === 0 && searchTerm.length >= 2 ? <p className="text-center text-muted-foreground py-8">Aucun joueur trouvé</p> : searchResults.map((result) => <div key={result.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-alt"><div><p className="font-medium">{result.username}</p><p className="text-xs text-muted-foreground">ELO: {result.eloRating}</p></div><Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleSendFriendRequest(result.id, result.username)} disabled={isSendingRequest === result.id}>{isSendingRequest === result.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}</Button></div>)}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Confidentialité</DialogTitle></DialogHeader>
          {isLoadingSettings ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : settings ? <><div className="space-y-4"><div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Profil public</Label><p className="text-xs text-muted-foreground">Tout le monde peut voir votre profil</p></div><Switch checked={settings.privacy.profilePublic} onCheckedChange={(checked) => setSettings({ ...settings, privacy: { ...settings.privacy, profilePublic: checked } })} /></div><div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Afficher les statistiques</Label><p className="text-xs text-muted-foreground">Montrer vos stats aux autres</p></div><Switch checked={settings.privacy.showStats} onCheckedChange={(checked) => setSettings({ ...settings, privacy: { ...settings.privacy, showStats: checked } })} /></div><div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Demandes d'amis</Label><p className="text-xs text-muted-foreground">Autoriser les demandes d'amis</p></div><Switch checked={settings.privacy.allowFriendRequests} onCheckedChange={(checked) => setSettings({ ...settings, privacy: { ...settings.privacy, allowFriendRequests: checked } })} /></div></div><div className="flex gap-2 mt-4"><Button onClick={() => setShowPrivacy(false)} variant="outline" className="flex-1">Annuler</Button><Button onClick={handleSaveSettings} variant="default" className="flex-1">Sauvegarder</Button></div></> : null}
        </DialogContent>
      </Dialog>
      <FriendProfileDialog isOpen={!!selectedFriend} onClose={() => { setSelectedFriend(null); setShowFriends(true); }} friendId={selectedFriend?.id || ""} friendUsername={selectedFriend?.username || ""} onRemoveFriend={handleRemoveFriend} canRemove={true} />
    </AppLayout>
  );
};

export default Profile;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Sparkles, Check, Lock, TrendingUp, Star, Zap, Gift, Search, Filter, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { SHOP_ITEMS, buyShopItem, equipItem, buyLootbox, type ShopItem } from "@/lib/firebaseExtended";

const rarityConfig = {
  common: {
    label: "Commun",
    color: "bg-gray-500",
    textColor: "text-gray-400",
    borderColor: "border-gray-500/50",
    bgGlow: "bg-gray-500/10"
  },
  rare: {
    label: "Rare",
    color: "bg-blue-500",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/50",
    bgGlow: "bg-blue-500/10"
  },
  epic: {
    label: "Épique",
    color: "bg-purple-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/50",
    bgGlow: "bg-purple-500/10"
  },
  legendary: {
    label: "Légendaire",
    color: "bg-orange-500",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/50",
    bgGlow: "bg-orange-500/10"
  },
  mythic: {
    label: "Mythique",
    color: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500",
    textColor: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400",
    borderColor: "border-pink-500/50",
    bgGlow: "bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-cyan-500/10"
  }
};

const categoryConfig = {
  all: { label: "Tout", icon: ShoppingBag },
  avatar: { label: "Avatars", icon: Star },
  theme: { label: "Thèmes", icon: Sparkles },
  banner: { label: "Bannières", icon: TrendingUp },
  effect: { label: "Effets", icon: Zap },
  lootbox: { label: "Lootboxes", icon: Gift }
};

type CategoryType = keyof typeof categoryConfig;

const ShopPage = () => {
  const { user } = useAuth();
  const [fortune, setFortune] = useState(0);
  const [inventory, setInventory] = useState<{ [key: string]: any }>({});
  const [equipped, setEquipped] = useState({
    avatar: "",
    theme: "",
    banner: "",
    effect: "",
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CategoryType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "rarity">("price-asc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFortune(data.fortune || 0);
          setInventory(data.inventory || {});
          setEquipped({
            avatar: data.avatar || data.equippedAvatar || "",
            theme: data.theme || data.equippedTheme || "",
            banner: data.banner || data.equippedBanner || "",
            effect: data.effect || data.equippedEffect || "",
          });
        }
      } catch (error) {
        console.error("Erreur chargement données:", error);
      }
    };

    loadUserData();
  }, [user]);

  const filteredAndSortedItems = SHOP_ITEMS
    .filter(item => {
      const matchesCategory = filter === "all" || item.type === filter;
      const matchesSearch = searchTerm === "" || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rarity") {
        const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
        return rarityOrder[b.rarity || "common"] - rarityOrder[a.rarity || "common"];
      }
      return 0;
    });

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;

    if (fortune < item.price) {
      toast({
        title: "Fonds insuffisants 💸",
        description: `Il vous faut ${item.price}€ (vous avez ${fortune}€)`,
        variant: "destructive",
      });
      return;
    }

    // Pour les lootboxes, on peut acheter à l'infini
    if (item.type === "lootbox") {
      setLoading(true);
      try {
        await buyLootbox(user.uid, item.id, item.price);
        
        // Recharger les données
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFortune(data.fortune || 0);
          setInventory(data.inventory || {});
        }

        toast({
          title: "🎁 Lootbox achetée!",
          description: `${item.name} a été ajoutée à votre inventaire`,
        });
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Pour les items normaux, vérifier si déjà possédé
    if (checkOwnership(item)) {
      toast({
        title: "Déjà possédé",
        description: "Vous possédez déjà cet item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await buyShopItem(user.uid, item.id, item.type, item.price);
      
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setFortune(data.fortune || 0);
        setInventory(data.inventory || {});
        
        setEquipped({
          avatar: data.avatar || "",
          theme: data.theme || "",
          banner: data.banner || "",
          effect: data.effect || "",
        });
      }

      toast({
        title: "Achat réussi! 🎉",
        description: `${item.name} a été ajouté à votre inventaire`,
      });

      if (item.type === "theme") {
        const hasOtherThemes = Object.keys(inventory.theme || {}).length === 0;
        if (hasOtherThemes) {
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (item: ShopItem) => {
    if (!user) return;

    if (!checkOwnership(item)) {
      toast({
        title: "Item non possédé",
        description: "Vous devez d'abord acheter cet item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await equipItem(user.uid, item.id, item.type);
      
      setEquipped(prev => ({
        ...prev,
        [item.type]: item.id,
      }));

      toast({
        title: "Équipé! ✅",
        description: `${item.name} est maintenant actif`,
      });

      if (item.type === "theme") {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkOwnership = (item: ShopItem) => {
    // Les lootboxes ne sont jamais marquées comme "possédées" pour permettre achat infini
    if (item.type === "lootbox") {
      return false;
    }
    
    if (inventory[item.type] && typeof inventory[item.type] === 'object') {
      return !!inventory[item.type][item.id];
    }
    return !!inventory[item.id];
  };

  const getLootboxCount = (lootboxId: string): number => {
    if (inventory.lootbox && inventory.lootbox[lootboxId]) {
      return inventory.lootbox[lootboxId];
    }
    if (inventory[lootboxId]) {
      return inventory[lootboxId];
    }
    return 0;
  };

  const stats = {
    total: SHOP_ITEMS.filter(i => i.type !== "lootbox").length,
    owned: SHOP_ITEMS.filter(item => item.type !== "lootbox" && checkOwnership(item)).length,
    affordable: filteredAndSortedItems.filter(item => fortune >= item.price).length
  };

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-8 w-8 text-primary" />
              Boutique Premium
            </h1>
            <p className="mt-1 text-muted-foreground">
              Personnalisez votre expérience de jeu
            </p>
          </div>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Votre fortune</p>
            <p className="text-3xl font-bold text-primary">{fortune}€</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.affordable} item(s) disponible(s)
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.owned}/{stats.total}</p>
                <p className="text-sm text-muted-foreground">Items possédés</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.affordable}</p>
                <p className="text-sm text-muted-foreground">À votre portée</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Star className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round((stats.owned / stats.total) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Collection</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Catégories</p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(categoryConfig) as CategoryType[]).map((cat) => {
                          const Icon = categoryConfig[cat].icon;
                          return (
                            <Button
                              key={cat}
                              variant={filter === cat ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFilter(cat)}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {categoryConfig[cat].label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Trier par</p>
                      <div className="flex gap-2">
                        <Button
                          variant={sortBy === "price-asc" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortBy("price-asc")}
                        >
                          Prix ↑
                        </Button>
                        <Button
                          variant={sortBy === "price-desc" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortBy("price-desc")}
                        >
                          Prix ↓
                        </Button>
                        <Button
                          variant={sortBy === "rarity" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSortBy("rarity")}
                        >
                          Rareté
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {filteredAndSortedItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">
                Aucun item trouvé
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Essayez de modifier vos filtres ou votre recherche
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedItems.map((item, index) => {
              const owned = checkOwnership(item);
              const isEquipped = equipped[item.type as keyof typeof equipped] === item.id;
              const canAfford = fortune >= item.price;
              const rarity = rarityConfig[item.rarity || "common"];
              const lootboxCount = item.type === "lootbox" ? getLootboxCount(item.id) : 0;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                >
                  <Card className={`relative overflow-hidden h-full transition-all ${
                    isEquipped 
                      ? `border-2 ${rarity.borderColor} shadow-lg` 
                      : "border-border hover:border-primary/50"
                  } ${rarity.bgGlow}`}>
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white ${rarity.color} shadow-lg z-10`}>
                      {rarity.label}
                    </div>

                    {isEquipped && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-lg z-10 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Équipé
                      </div>
                    )}

                    {lootboxCount > 0 && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10 shadow-lg">
                        {lootboxCount}
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-center h-24 text-6xl mb-2">
                        {item.type === "theme" && item.preview ? (
                          <div 
                            className="w-20 h-20 rounded-lg shadow-xl border-2 border-white/20"
                            style={{ backgroundColor: item.preview }}
                          />
                        ) : (
                          <span>{item.icon || item.preview || "🎁"}</span>
                        )}
                      </div>
                      <CardTitle className="text-center text-lg">
                        {item.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground text-center line-clamp-2">
                        {item.description}
                      </p>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-2xl font-bold ${rarity.textColor}`}>
                          {item.price}€
                        </span>
                        {item.type !== "lootbox" && (
                          <Badge variant={owned ? "default" : "outline"}>
                            {owned ? "Possédé" : "Non possédé"}
                          </Badge>
                        )}
                      </div>

                      {item.type === "lootbox" ? (
                        <Button
                          className="w-full"
                          onClick={() => handleBuy(item)}
                          disabled={!canAfford || loading}
                          variant={canAfford ? "default" : "secondary"}
                        >
                          {!canAfford ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Fonds insuffisants
                            </>
                          ) : (
                            <>
                              <Gift className="h-4 w-4 mr-2" />
                              Acheter
                            </>
                          )}
                        </Button>
                      ) : !owned ? (
                        <Button
                          className="w-full"
                          onClick={() => handleBuy(item)}
                          disabled={!canAfford || loading}
                          variant={canAfford ? "default" : "secondary"}
                        >
                          {!canAfford ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Fonds insuffisants
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Acheter
                            </>
                          )}
                        </Button>
                      ) : isEquipped ? (
                        <Button className="w-full" variant="outline" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Équipé
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleEquip(item)}
                          disabled={loading}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Équiper
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default ShopPage;

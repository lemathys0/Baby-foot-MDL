import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Gift, Sparkles, Star, Loader2, X, PartyPopper } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ref, get, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { SHOP_ITEMS, equipItem, openLootbox, type ShopItem, type LootboxReward, type ItemType } from "@/lib/firebaseExtended";
import { logger } from '@/utils/logger';

const rarityConfig = {
  common: {
    label: "Commun",
    color: "bg-gray-500",
    textColor: "text-gray-400",
    borderColor: "border-gray-500/50",
    glowColor: "shadow-gray-500/50"
  },
  rare: {
    label: "Rare",
    color: "bg-blue-500",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/50",
    glowColor: "shadow-blue-500/50"
  },
  epic: {
    label: "Épique",
    color: "bg-purple-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/50",
    glowColor: "shadow-purple-500/50"
  },
  legendary: {
    label: "Légendaire",
    color: "bg-orange-500",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/50",
    glowColor: "shadow-orange-500/50"
  },
  mythic: {
    label: "Mythique",
    color: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500",
    textColor: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400",
    borderColor: "border-pink-500/50",
    glowColor: "shadow-pink-500/50"
  }
};

interface LootboxResult {
  rewards: LootboxReward[];
  fortuneBonus: number;
}

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<{ [key: string]: any }>({});
  const [equipped, setEquipped] = useState({
    avatar: "",
    theme: "",
    banner: "",
    title: "",
    effect: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEquipping, setIsEquipping] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"items" | "lootboxes">("items");
  const [isOpening, setIsOpening] = useState(false);
  const [lootboxResult, setLootboxResult] = useState<LootboxResult | null>(null);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const userRef = ref(database, `users/${user.uid}`);

    // ✅ Listener temps réel pour synchronisation automatique de l'inventaire
    const unsubscribe = onValue(userRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setInventory(data.inventory || {});
          setEquipped({
            avatar: data.avatar || "",
            theme: data.theme || "",
            banner: data.banner || "",
            title: data.title || "",
            effect: data.effect || "",
          });
          logger.log("✅ [Inventory] Inventaire mis à jour en temps réel");
        }
      } catch (error) {
        logger.error("Erreur chargement inventaire:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'inventaire",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const loadInventory = async () => {
    // Cette fonction n'est plus nécessaire car l'inventaire est chargé en temps réel
    // On la garde pour compatibilité mais elle ne sera plus appelée
  };

  const handleEquip = async (itemId: string, itemType: ItemType) => {
    if (!user) return;

    setIsEquipping(true);
    try {
      await equipItem(user.uid, itemId, itemType);
      
      setEquipped(prev => ({
        ...prev,
        [itemType]: itemId,
      }));

      const item = SHOP_ITEMS.find(i => i.id === itemId);
      toast({
        title: "Équipé! ✅",
        description: `${item?.name || itemId} est maintenant actif`,
      });

      if (itemType === "theme") {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEquipping(false);
    }
  };

  const handleOpenLootbox = async (lootboxId: string) => {
    if (!user) return;

    setIsOpening(true);
    try {
      const result = await openLootbox(user.uid, lootboxId);
      
      // Afficher l'animation de récompenses
      setLootboxResult(result);
      setShowRewards(true);
      
      // Recharger l'inventaire
      await loadInventory();
      
      toast({
        title: "🎉 Lootbox ouverte!",
        description: `Vous avez reçu ${result.rewards.length} items et ${result.fortuneBonus}€!`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsOpening(false);
    }
  };

  const getOwnedItems = () => {
    const items: ShopItem[] = [];
    
    SHOP_ITEMS.forEach(item => {
      if (inventory[item.type] && typeof inventory[item.type] === 'object') {
        if (inventory[item.type][item.id]) {
          items.push(item);
        }
      } else if (inventory[item.id]) {
        items.push(item);
      }
    });

    return items;
  };

  const getLootboxes = () => {
    const lootboxes: Array<ShopItem & { count: number }> = [];
    
    SHOP_ITEMS.forEach(item => {
      if (item.type === "lootbox") {
        let count = 0;
        if (inventory.lootbox && inventory.lootbox[item.id]) {
          count = inventory.lootbox[item.id];
        } else if (inventory[item.id]) {
          count = inventory[item.id];
        }
        
        if (count > 0) {
          lootboxes.push({ ...item, count });
        }
      }
    });

    return lootboxes;
  };

  const ownedItems = getOwnedItems().filter(item => item.type !== "lootbox");
  const ownedLootboxes = getLootboxes();

  const itemsByType = {
    avatar: ownedItems.filter(i => i.type === "avatar"),
    theme: ownedItems.filter(i => i.type === "theme"),
    banner: ownedItems.filter(i => i.type === "banner"),
    title: ownedItems.filter(i => i.type === "title"),
    effect: ownedItems.filter(i => i.type === "effect"),
  };

  const stats = {
    total: ownedItems.length,
    avatars: itemsByType.avatar.length,
    themes: itemsByType.theme.length,
    banners: itemsByType.banner.length,
    titles: itemsByType.title.length,
    effects: itemsByType.effect.length,
    lootboxes: ownedLootboxes.reduce((sum, lb) => sum + lb.count, 0),
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de l'inventaire...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Mon Inventaire
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gérez vos items et équipements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.avatars}</p>
              <p className="text-xs text-muted-foreground">Avatars</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.themes}</p>
              <p className="text-xs text-muted-foreground">Thèmes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mx-auto mb-2">🎯</div>
              <p className="text-2xl font-bold">{stats.banners}</p>
              <p className="text-xs text-muted-foreground">Bannières</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mx-auto mb-2">🏷️</div>
              <p className="text-2xl font-bold">{stats.titles}</p>
              <p className="text-xs text-muted-foreground">Titres</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mx-auto mb-2">⚡</div>
              <p className="text-2xl font-bold">{stats.effects}</p>
              <p className="text-xs text-muted-foreground">Effets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Gift className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{stats.lootboxes}</p>
              <p className="text-xs text-muted-foreground">Lootboxes</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant={selectedTab === "items" ? "default" : "outline"} onClick={() => setSelectedTab("items")}>
            <Package className="h-4 w-4 mr-2" />
            Items ({stats.total})
          </Button>
          <Button variant={selectedTab === "lootboxes" ? "default" : "outline"} onClick={() => setSelectedTab("lootboxes")}>
            <Gift className="h-4 w-4 mr-2" />
            Lootboxes ({stats.lootboxes})
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {selectedTab === "items" ? (
            <motion.div key="items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {ownedItems.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">Inventaire vide</p>
                    <p className="text-sm text-muted-foreground">Achetez des items dans la boutique pour les voir ici</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(itemsByType).map(([type, items]) => 
                    items.length > 0 && (
                      <Card key={type}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 capitalize">
                            {type === "avatar" && <Star className="h-5 w-5 text-primary" />}
                            {type === "theme" && <Sparkles className="h-5 w-5 text-primary" />}
                            {type === "banner" && <div className="text-xl">🎯</div>}
                            {type === "title" && <div className="text-xl">🏷️</div>}
                            {type === "effect" && <div className="text-xl">⚡</div>}
                            {type}s ({items.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {items.map((item) => {
                              const isEquipped = equipped[type as keyof typeof equipped] === item.id;
                              const rarity = rarityConfig[item.rarity || "common"];
                              return (
                                <motion.div key={item.id} whileHover={{ scale: 1.05 }} className={`p-3 rounded-lg border-2 transition-all text-center ${isEquipped ? `${rarity.borderColor} bg-primary/5` : "border-border hover:border-primary/50"}`}>
                                  {item.type === "theme" && item.preview ? (
                                    <div
                                      className="w-16 h-16 rounded-lg mx-auto mb-2 border-2 border-white/20"
                                      style={{ backgroundColor: item.preview }}
                                    />
                                  ) : item.type === "banner" && item.preview ? (
                                    <div
                                      className="w-full h-16 rounded-lg mx-auto mb-2 border-2 border-white/20 relative overflow-hidden"
                                      style={{ background: item.preview }}
                                    >
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl">{item?.icon || "🎨"}</span>
                                      </div>
                                    </div>
                                  ) : item.type === "title" && item.preview ? (
                                    <div className="flex flex-col items-center gap-1 mb-1">
                                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-500/20 to-indigo-500/20 border border-cyan-400/50">
                                        <span className="text-base">{item?.icon || "👑"}</span>
                                        <span className="text-[9px] font-semibold tracking-wide uppercase text-cyan-100 line-clamp-1">
                                          {item.preview}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-4xl mb-2">{item?.icon || item?.preview || "✨"}</div>
                                  )}
                                  <p className="text-xs font-medium mb-1 line-clamp-1">{item.name}</p>
                                  {isEquipped ? (
                                    <Badge variant="default" className="w-full text-xs">Équipé ✓</Badge>
                                  ) : (
                                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleEquip(item.id, item.type)} disabled={isEquipping}>Équiper</Button>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="lootboxes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {ownedLootboxes.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Gift className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">Aucune lootbox</p>
                    <p className="text-sm text-muted-foreground">Achetez des lootboxes dans la boutique</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedLootboxes.map((lootbox) => {
                    const rarity = rarityConfig[lootbox.rarity || "common"];
                    return (
                      <motion.div key={lootbox.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.03 }}>
                        <Card className={`border-2 ${rarity.borderColor} relative overflow-hidden`}>
                          {lootbox.count > 1 && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                              {lootbox.count}
                            </div>
                          )}
                          <CardHeader>
                            <motion.div 
                              className="text-6xl text-center mb-2"
                              animate={{ rotate: [0, -10, 10, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            >
                              {lootbox.icon || "🎁"}
                            </motion.div>
                            <CardTitle className="text-center">{lootbox.name}</CardTitle>
                            <Badge className={`${rarity.color} text-white mx-auto`}>{rarity.label}</Badge>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground text-center mb-4">{lootbox.description}</p>
                            <Button 
                              className="w-full" 
                              onClick={() => handleOpenLootbox(lootbox.id)}
                              disabled={isOpening}
                            >
                              {isOpening ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Ouverture...
                                </>
                              ) : (
                                <>
                                  <Gift className="h-4 w-4 mr-2" />
                                  Ouvrir
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de récompenses */}
        <AnimatePresence>
          {showRewards && lootboxResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setShowRewards(false)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="border-2 border-primary shadow-2xl">
                  <CardHeader className="text-center pb-4">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="text-6xl mb-4"
                    >
                      🎉
                    </motion.div>
                    <CardTitle className="text-3xl">Récompenses obtenues!</CardTitle>
                    <p className="text-muted-foreground mt-2">
                      Bonus de fortune: <span className="text-primary font-bold">{lootboxResult.fortuneBonus}€</span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {lootboxResult.rewards.map((reward, index) => {
                        const item = SHOP_ITEMS.find(i => i.id === reward.itemId);
                        const rarity = rarityConfig[reward.rarity];
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0, rotateY: 180 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            transition={{ delay: index * 0.2, duration: 0.5 }}
                            className={`p-4 rounded-lg border-2 ${rarity.borderColor} ${rarity.color} bg-opacity-10 text-center`}
                          >
                            <div className="text-5xl mb-2">{item?.icon || item?.preview || "🎁"}</div>
                            <p className="text-sm font-medium mb-1">{item?.name}</p>
                            <Badge className={`${rarity.color} text-white text-xs`}>
                              {rarity.label}
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                    <Button className="w-full" size="lg" onClick={() => setShowRewards(false)}>
                      <PartyPopper className="h-4 w-4 mr-2" />
                      Génial!
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
};

export default Inventory;

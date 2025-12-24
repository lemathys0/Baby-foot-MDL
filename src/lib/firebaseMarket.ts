import { ref, get, update, push, runTransaction } from "firebase/database";
import { database } from "./firebase";
import { addFortuneHistoryEntry } from "./firebaseExtended";
import { logger } from "@/utils/logger";

export interface CardListing {
  id: string;
  cardCode: string;
  cardName: string;
  rarity: string;
  sellerId: string;
  price: number;
  createdAt: number;
  status: "open" | "sold" | "cancelled";
  buyerId?: string;
  views?: number;
  offersCount?: number;
  finalPrice?: number;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  message?: string;
  status: "pending" | "accepted" | "rejected" | "countered" | "expired";
  createdAt: number;
  expiresAt: number;
  counterOffer?: number;
}

export interface MarketStats {
  cardCode: string;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  totalSales: number;
  lastSalePrice?: number;
  lastSaleDate?: number;
  priceHistory: Array<{ date: number; price: number }>;
}

// Fonction utilitaire pour créer des notifications
async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId?: string
): Promise<void> {
  try {
    const notifId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await update(ref(database), {
      [`notifications/${userId}/${notifId}`]: {
        userId,
        type,
        title,
        message,
        relatedId,
        read: false,
        createdAt: Date.now(),
      },
    });
  } catch (error) {
    logger.error("Erreur création notification:", error);
  }
}

export async function createCardListing(
  userId: string,
  cardCode: string,
  cardName: string,
  rarity: string,
  price: number
): Promise<void> {
  if (!userId) throw new Error("Utilisateur non authentifié");
  if (price <= 0) throw new Error("Le prix doit être supérieur à 0");

  const userRef = ref(database, `users/${userId}`);
  const rootRef = ref(database);

  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    throw new Error("Utilisateur introuvable");
  }

  const userData = snapshot.val() || {};
  const cards = userData.cards || {};
  const currentCount: number = cards[cardCode] || 0;

  if (currentCount <= 0) {
    throw new Error("Vous ne possédez pas cette carte");
  }

  const listingRef = push(ref(database, "cardMarket"));
  const listingId = listingRef.key!;

  const updates: Record<string, unknown> = {};
  updates[`users/${userId}/cards/${cardCode}`] = currentCount - 1;
  updates[`cardMarket/${listingId}`] = {
    cardCode,
    cardName,
    rarity,
    sellerId: userId,
    price,
    createdAt: Date.now(),
    status: "open",
    views: 0,
    offersCount: 0,
  };

  await update(rootRef, updates);
}

export async function getOpenCardListings(): Promise<CardListing[]> {
  const marketRef = ref(database, "cardMarket");
  const snapshot = await get(marketRef);
  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, any>;
  const listings: CardListing[] = [];

  for (const [id, value] of Object.entries(data)) {
    const listing = value as any;
    if (listing.status === "open") {
      listings.push({
        id,
        cardCode: listing.cardCode,
        cardName: listing.cardName,
        rarity: listing.rarity,
        sellerId: listing.sellerId,
        price: listing.price,
        createdAt: listing.createdAt,
        status: listing.status,
        buyerId: listing.buyerId,
        views: listing.views || 0,
        offersCount: listing.offersCount || 0,
      });
    }
  }

  return listings.sort((a, b) => b.createdAt - a.createdAt);
}

export async function incrementListingViews(listingId: string): Promise<void> {
  const listingRef = ref(database, `cardMarket/${listingId}`);
  const snapshot = await get(listingRef);
  
  if (!snapshot.exists()) return;
  
  const listing = snapshot.val();
  const currentViews = listing.views || 0;
  
  await update(ref(database), {
    [`cardMarket/${listingId}/views`]: currentViews + 1,
  });
}

export async function cancelCardListing(
  userId: string,
  listingId: string
): Promise<void> {
  const listingRef = ref(database, `cardMarket/${listingId}`);
  const snapshot = await get(listingRef);
  if (!snapshot.exists()) {
    throw new Error("Annonce introuvable");
  }

  const listing = snapshot.val() as CardListing;
  if (listing.sellerId !== userId) {
    throw new Error("Vous ne pouvez pas annuler cette annonce");
  }
  if (listing.status !== "open") {
    throw new Error("Cette annonce n'est plus ouverte");
  }

  const rootRef = ref(database);
  const userRef = ref(database, `users/${userId}`);
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.exists() ? userSnapshot.val() : {};
  const cards = userData.cards || {};
  const currentCount: number = cards[listing.cardCode] || 0;

  const updates: Record<string, unknown> = {};
  updates[`users/${userId}/cards/${listing.cardCode}`] = currentCount + 1;
  updates[`cardMarket/${listingId}/status`] = "cancelled";

  await update(rootRef, updates);
}

// ✅ FIX CRITIQUE: Utiliser runTransaction pour gérer les permissions
// ✅ SOLUTION SÉCURISÉE: Vérifications + Transaction atomique
export async function buyCardListing(
  buyerId: string,
  listingId: string
): Promise<void> {
  if (!buyerId) throw new Error("Utilisateur non authentifié");

  // 🔒 ÉTAPE 1: Vérifications de sécurité (AVANT toute modification)
  const listingRef = ref(database, `cardMarket/${listingId}`);
  const snapshot = await get(listingRef);
  if (!snapshot.exists()) {
    throw new Error("Annonce introuvable");
  }

  const listing = snapshot.val() as CardListing;
  if (listing.status !== "open") {
    throw new Error("Cette annonce n'est plus disponible");
  }
  if (listing.sellerId === buyerId) {
    throw new Error("Vous ne pouvez pas acheter votre propre annonce");
  }

  // 🔒 Récupérer les données actuelles des deux utilisateurs
  const sellerRef = ref(database, `users/${listing.sellerId}`);
  const buyerRef = ref(database, `users/${buyerId}`);
  const [sellerSnap, buyerSnap] = await Promise.all([
    get(sellerRef),
    get(buyerRef),
  ]);

  if (!buyerSnap.exists()) {
    throw new Error("Acheteur introuvable");
  }
  if (!sellerSnap.exists()) {
    throw new Error("Vendeur introuvable");
  }

  const sellerData = sellerSnap.val() || {};
  const buyerData = buyerSnap.val() || {};

  // 🔒 VÉRIFICATION: L'acheteur a-t-il assez d'argent ?
  const buyerFortune: number = buyerData.fortune || 0;
  if (buyerFortune < listing.price) {
    throw new Error("Fonds insuffisants pour acheter cette carte");
  }

  // 🔒 VÉRIFICATION: Le vendeur possède-t-il toujours la carte ?
  // (au cas où l'annonce n'a pas été mise à jour correctement)
  const buyerCards = buyerData.cards || {};
  const buyerCurrentCount: number = buyerCards[listing.cardCode] || 0;
  const sellerFortune: number = sellerData.fortune || 0;

  // 🔒 Calcul des nouvelles valeurs
  const newBuyerFortune = buyerFortune - listing.price;
  const newSellerFortune = sellerFortune + listing.price;

  // ✅ ÉTAPE 2: Transaction atomique (tout ou rien)
  // Si une des opérations échoue, RIEN n'est appliqué
  const updates: Record<string, unknown> = {};
  
  // Mise à jour acheteur (retire l'argent + ajoute la carte)
  updates[`users/${buyerId}/fortune`] = newBuyerFortune;
  updates[`users/${buyerId}/cards/${listing.cardCode}`] = buyerCurrentCount + 1;
  
  // Mise à jour vendeur (ajoute l'argent)
  updates[`users/${listing.sellerId}/fortune`] = newSellerFortune;
  
  // Mise à jour listing (marque comme vendu)
  updates[`cardMarket/${listingId}/status`] = "sold";
  updates[`cardMarket/${listingId}/buyerId`] = buyerId;
  updates[`cardMarket/${listingId}/finalPrice`] = listing.price;
  updates[`cardMarket/${listingId}/soldAt`] = Date.now();

  try {
    // ✅ Toutes les modifications appliquées en une seule opération atomique
    await update(ref(database), updates);
  } catch (error) {
    logger.error("❌ Erreur lors de la transaction:", error);
    throw new Error("La transaction a échoué. Aucune modification n'a été effectuée.");
  }

  // 🔒 ÉTAPE 3: Vérification post-transaction (optionnelle mais recommandée)
  const verifyBuyerSnap = await get(buyerRef);
  const verifyBuyerData = verifyBuyerSnap.val() || {};
  
  if (verifyBuyerData.fortune !== newBuyerFortune) {
    logger.error("⚠️ ALERTE: La fortune de l'acheteur ne correspond pas!");
    // Vous pouvez logger cette anomalie pour investigation
  }

  // 📊 Historique des fortunes (ne bloque pas si échoue)
  try {
    await Promise.all([
      addFortuneHistoryEntry(
        buyerId,
        newBuyerFortune,
        -listing.price,
        `Achat carte: ${listing.cardName}`
      ),
      addFortuneHistoryEntry(
        listing.sellerId,
        newSellerFortune,
        listing.price,
        `Vente carte: ${listing.cardName}`
      ),
    ]);
  } catch (error) {
    logger.error("⚠️ Erreur historique (non bloquant):", error);
  }

  // 🔔 Notification au vendeur (ne bloque pas si échoue)
  try {
    await createNotification(
      listing.sellerId,
      "listing_sold",
      "Carte vendue ! 🎉",
      `Votre ${listing.cardName} a été vendue pour ${listing.price}€`,
      listingId
    );
  } catch (error) {
    logger.error("⚠️ Erreur notification (non bloquant):", error);
  }

  // 📈 Stats de marché (ne bloque pas si échoue)
  try {
    await updateMarketStats(listing.cardCode, listing.price);
  } catch (error) {
    logger.error("⚠️ Erreur stats (non bloquant):", error);
  }
}

export async function createOffer(
  buyerId: string,
  listingId: string,
  amount: number,
  message?: string
): Promise<string> {
  if (!buyerId) throw new Error("Utilisateur non authentifié");
  if (amount <= 0) throw new Error("Le montant doit être supérieur à 0");

  const listingRef = ref(database, `cardMarket/${listingId}`);
  const snapshot = await get(listingRef);
  
  if (!snapshot.exists()) {
    throw new Error("Annonce introuvable");
  }

  const listing = snapshot.val();
  if (listing.status !== "open") {
    throw new Error("Cette annonce n'est plus disponible");
  }
  if (listing.sellerId === buyerId) {
    throw new Error("Vous ne pouvez pas faire une offre sur votre propre annonce");
  }

  const buyerRef = ref(database, `users/${buyerId}`);
  const buyerSnap = await get(buyerRef);
  const buyerData = buyerSnap.val() || {};
  const buyerFortune = buyerData.fortune || 0;

  if (buyerFortune < amount) {
    throw new Error("Fonds insuffisants pour cette offre");
  }

  const offerRef = push(ref(database, "cardOffers"));
  const offerId = offerRef.key!;
  const now = Date.now();
  const expiresAt = now + 48 * 60 * 60 * 1000;

  const offer: Offer = {
    id: offerId,
    listingId,
    buyerId,
    sellerId: listing.sellerId,
    amount,
    message,
    status: "pending",
    createdAt: now,
    expiresAt,
  };

  const currentOffersCount = listing.offersCount || 0;

  await update(ref(database), {
    [`cardOffers/${offerId}`]: offer,
    [`cardMarket/${listingId}/offersCount`]: currentOffersCount + 1,
  });

  // Notification au vendeur
  await createNotification(
    listing.sellerId,
    "offer_received",
    "Nouvelle offre reçue 💰",
    `Une offre de ${amount}€ a été faite pour votre ${listing.cardName}`,
    offerId
  );

  return offerId;
}

export async function acceptOffer(
  sellerId: string,
  offerId: string
): Promise<void> {
  const offerRef = ref(database, `cardOffers/${offerId}`);
  const snapshot = await get(offerRef);

  if (!snapshot.exists()) {
    throw new Error("Offre introuvable");
  }

  const offer = snapshot.val() as Offer;
  
  if (offer.sellerId !== sellerId) {
    throw new Error("Vous n'êtes pas le vendeur de cette annonce");
  }
  if (offer.status !== "pending") {
    throw new Error("Cette offre n'est plus valide");
  }
  if (Date.now() > offer.expiresAt) {
    throw new Error("Cette offre a expiré");
  }

  const listingRef = ref(database, `cardMarket/${offer.listingId}`);
  const listingSnap = await get(listingRef);
  const listing = listingSnap.val();

  const buyerRef = ref(database, `users/${offer.buyerId}`);
  const sellerRef = ref(database, `users/${sellerId}`);
  const [buyerSnap, sellerSnap] = await Promise.all([
    get(buyerRef),
    get(sellerRef),
  ]);

  const buyerData = buyerSnap.val() || {};
  const sellerData = sellerSnap.val() || {};

  const buyerFortune = buyerData.fortune || 0;
  const sellerFortune = sellerData.fortune || 0;

  if (buyerFortune < offer.amount) {
    throw new Error("L'acheteur n'a plus les fonds suffisants");
  }

  const buyerCards = buyerData.cards || {};
  const buyerCurrentCount = buyerCards[listing.cardCode] || 0;

  // ✅ Étape 1: Mettre à jour l'acheteur
  await update(ref(database), {
    [`users/${offer.buyerId}/fortune`]: buyerFortune - offer.amount,
    [`users/${offer.buyerId}/cards/${listing.cardCode}`]: buyerCurrentCount + 1,
  });

  // ✅ Étape 2: Mettre à jour le vendeur
  await update(ref(database), {
    [`users/${sellerId}/fortune`]: sellerFortune + offer.amount,
  });

  // ✅ Étape 3: Mettre à jour le listing et l'offre
  await update(ref(database), {
    [`cardMarket/${offer.listingId}/status`]: "sold",
    [`cardMarket/${offer.listingId}/buyerId`]: offer.buyerId,
    [`cardMarket/${offer.listingId}/finalPrice`]: offer.amount,
    [`cardOffers/${offerId}/status`]: "accepted",
  });

  await Promise.all([
    addFortuneHistoryEntry(
      offer.buyerId,
      buyerFortune - offer.amount,
      -offer.amount,
      `Achat carte: ${listing.cardName} (offre acceptée)`
    ),
    addFortuneHistoryEntry(
      sellerId,
      sellerFortune + offer.amount,
      offer.amount,
      `Vente carte: ${listing.cardName} (offre acceptée)`
    ),
  ]);

  // Notification à l'acheteur
  await createNotification(
    offer.buyerId,
    "offer_accepted",
    "Offre acceptée ! ✅",
    `Votre offre de ${offer.amount}€ pour ${listing.cardName} a été acceptée`,
    offerId
  );

  await updateMarketStats(listing.cardCode, offer.amount);
}

export async function rejectOffer(
  sellerId: string,
  offerId: string
): Promise<void> {
  const offerRef = ref(database, `cardOffers/${offerId}`);
  const snapshot = await get(offerRef);

  if (!snapshot.exists()) {
    throw new Error("Offre introuvable");
  }

  const offer = snapshot.val() as Offer;
  
  if (offer.sellerId !== sellerId) {
    throw new Error("Vous n'êtes pas le vendeur");
  }
  if (offer.status !== "pending") {
    throw new Error("Cette offre n'est plus valide");
  }

  await update(ref(database), {
    [`cardOffers/${offerId}/status`]: "rejected",
  });

  // Notification à l'acheteur
  const listingRef = ref(database, `cardMarket/${offer.listingId}`);
  const listingSnap = await get(listingRef);
  const listing = listingSnap.val();

  await createNotification(
    offer.buyerId,
    "offer_rejected",
    "Offre rejetée ❌",
    `Votre offre de ${offer.amount}€ pour ${listing.cardName} a été rejetée`,
    offerId
  );
}

export async function counterOffer(
  sellerId: string,
  offerId: string,
  counterAmount: number
): Promise<void> {
  const offerRef = ref(database, `cardOffers/${offerId}`);
  const snapshot = await get(offerRef);

  if (!snapshot.exists()) {
    throw new Error("Offre introuvable");
  }

  const offer = snapshot.val() as Offer;
  
  if (offer.sellerId !== sellerId) {
    throw new Error("Vous n'êtes pas le vendeur");
  }
  if (offer.status !== "pending") {
    throw new Error("Cette offre n'est plus valide");
  }
  if (counterAmount <= 0) {
    throw new Error("Le montant doit être supérieur à 0");
  }

  await update(ref(database), {
    [`cardOffers/${offerId}/status`]: "countered",
    [`cardOffers/${offerId}/counterOffer`]: counterAmount,
  });

  // Notification à l'acheteur
  const listingRef = ref(database, `cardMarket/${offer.listingId}`);
  const listingSnap = await get(listingRef);
  const listing = listingSnap.val();

  await createNotification(
    offer.buyerId,
    "offer_countered",
    "Contre-offre reçue 🔄",
    `Le vendeur propose ${counterAmount}€ pour ${listing.cardName} (votre offre: ${offer.amount}€)`,
    offerId
  );
}

export async function getOffersForListing(listingId: string): Promise<Offer[]> {
  const offersRef = ref(database, "cardMarket");
  const snapshot = await get(offersRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Offer>;
  const offers: Offer[] = [];

  for (const [id, offer] of Object.entries(data)) {
    if (offer.listingId === listingId) {
      offers.push({ ...offer, id });
    }
  }

  return offers.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReceivedOffers(sellerId: string): Promise<Offer[]> {
  const offersRef = ref(database, "cardOffers");
  const snapshot = await get(offersRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Offer>;
  const offers: Offer[] = [];

  for (const [id, offer] of Object.entries(data)) {
    if (offer.sellerId === sellerId && offer.status === "pending") {
      offers.push({ ...offer, id });
    }
  }

  return offers.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSentOffers(buyerId: string): Promise<Offer[]> {
  const offersRef = ref(database, "cardOffers");
  const snapshot = await get(offersRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Offer>;
  const offers: Offer[] = [];

  for (const [id, offer] of Object.entries(data)) {
    if (offer.buyerId === buyerId) {
      offers.push({ ...offer, id });
    }
  }

  return offers.sort((a, b) => b.createdAt - a.createdAt);
}

async function updateMarketStats(
  cardCode: string,
  salePrice: number
): Promise<void> {
  const statsRef = ref(database, `marketStats/${cardCode}`);
  const snapshot = await get(statsRef);

  const now = Date.now();
  let stats: MarketStats;

  if (snapshot.exists()) {
    stats = snapshot.val();
    stats.totalSales += 1;
    stats.lastSalePrice = salePrice;
    stats.lastSaleDate = now;
    stats.priceHistory.push({ date: now, price: salePrice });

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    stats.priceHistory = stats.priceHistory.filter(
      (h) => h.date > thirtyDaysAgo
    );

    const prices = stats.priceHistory.map((h) => h.price);
    stats.averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    stats.lowestPrice = Math.min(...prices);
    stats.highestPrice = Math.max(...prices);
  } else {
    stats = {
      cardCode,
      totalSales: 1,
      lastSalePrice: salePrice,
      lastSaleDate: now,
      averagePrice: salePrice,
      lowestPrice: salePrice,
      highestPrice: salePrice,
      priceHistory: [{ date: now, price: salePrice }],
    };
  }

  await update(ref(database), {
    [`marketStats/${cardCode}`]: stats,
  });
}

// Fonction à ajouter/modifier dans firebaseMarket.ts

export async function getMarketStats(
  cardCode: string
): Promise<MarketStats | null> {
  logger.log("🔍 [getMarketStats] Recherche stats pour:", cardCode);
  
  const statsRef = ref(database, `marketStats/${cardCode}`);
  const snapshot = await get(statsRef);

  if (!snapshot.exists()) {
    logger.log("❌ [getMarketStats] Aucune stats trouvée pour:", cardCode);
    return null;
  }

  const rawData = snapshot.val();
  logger.log("📦 [getMarketStats] Données brutes:", rawData);
  logger.log("📊 [getMarketStats] Type priceHistory:", typeof rawData.priceHistory);
  logger.log("📊 [getMarketStats] priceHistory:", rawData.priceHistory);
  
  // 🔥 FIX CRITIQUE: Convertir priceHistory en array si c'est un objet
  let priceHistory: Array<{ date: number; price: number }> = [];
  
  if (rawData.priceHistory) {
    if (Array.isArray(rawData.priceHistory)) {
      // C'est déjà un array
      priceHistory = rawData.priceHistory;
      logger.log("✅ [getMarketStats] priceHistory est un array:", priceHistory.length, "entrées");
    } else if (typeof rawData.priceHistory === 'object') {
      // C'est un objet, on le convertit en array
      priceHistory = Object.values(rawData.priceHistory);
      logger.log("🔄 [getMarketStats] priceHistory converti d'objet vers array:", priceHistory.length, "entrées");
    }
  } else {
    logger.log("⚠️ [getMarketStats] Aucun priceHistory trouvé");
  }
  
  // Filtrer les entrées invalides
  priceHistory = priceHistory.filter(item => 
    item && 
    typeof item === 'object' && 
    typeof item.date === 'number' && 
    typeof item.price === 'number' && 
    item.price > 0
  );
  
  logger.log("✅ [getMarketStats] priceHistory filtré:", priceHistory.length, "entrées valides");
  
  const stats: MarketStats = {
    cardCode: rawData.cardCode || cardCode,
    totalSales: rawData.totalSales || 0,
    lastSalePrice: rawData.lastSalePrice,
    lastSaleDate: rawData.lastSaleDate,
    averagePrice: rawData.averagePrice || 0,
    lowestPrice: rawData.lowestPrice || 0,
    highestPrice: rawData.highestPrice || 0,
    priceHistory: priceHistory,
  };
  
  logger.log("📈 [getMarketStats] Stats finales:", stats);
  
  return stats;
}

export async function getSuggestedPrice(cardCode: string): Promise<number> {
  const stats = await getMarketStats(cardCode);
  
  if (!stats || stats.totalSales === 0) {
    return 10;
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentPrices = stats.priceHistory
    .filter((h) => h.date > sevenDaysAgo)
    .map((h) => h.price);

  if (recentPrices.length === 0) {
    return Math.round(stats.averagePrice);
  }

  return Math.round(recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length);
}

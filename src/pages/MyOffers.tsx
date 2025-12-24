import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getReceivedOffers,
  getSentOffers,
  acceptOffer,
  rejectOffer,
  counterOffer,
  type Offer,
} from "@/lib/firebaseMarket";
import { motion } from "framer-motion";
import { logger } from '@/utils/logger';
import {
  MessageSquare,
  Check,
  X,
  RefreshCcw,
  Clock,
  TrendingUp,
  Send,
  AlertCircle,
} from "lucide-react";

const MyOffers = () => {
  const { user } = useAuth();
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Dialog contre-offre
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState("");

  const loadOffers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [received, sent] = await Promise.all([
        getReceivedOffers(user.uid),
        getSentOffers(user.uid),
      ]);
      setReceivedOffers(received);
      setSentOffers(sent);
    } catch (error) {
      logger.error("Erreur chargement offres:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les offres.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [user]);

  const handleAccept = async (offerId: string) => {
    if (!user) return;
    setActionId(offerId);
    try {
      await acceptOffer(user.uid, offerId);
      toast({
        title: "Offre acceptée ✅",
        description: "La transaction a été effectuée avec succès.",
      });
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accepter l'offre.",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (offerId: string) => {
    if (!user) return;
    setActionId(offerId);
    try {
      await rejectOffer(user.uid, offerId);
      toast({
        title: "Offre rejetée",
        description: "L'acheteur a été notifié.",
      });
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejeter l'offre.",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleOpenCounterDialog = (offer: Offer) => {
    setSelectedOffer(offer);
    setCounterAmount((offer.amount * 1.1).toFixed(0)); // +10% par défaut
    setShowCounterDialog(true);
  };

  const handleSendCounter = async () => {
    if (!user || !selectedOffer) return;
    
    const amount = Number(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive",
      });
      return;
    }

    try {
      await counterOffer(user.uid, selectedOffer.id, amount);
      toast({
        title: "Contre-offre envoyée ✅",
        description: "L'acheteur a été notifié.",
      });
      setShowCounterDialog(false);
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la contre-offre.",
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

  const OfferCard = ({ offer, isReceived }: { offer: Offer; isReceived: boolean }) => {
    const isExpired = Date.now() > offer.expiresAt;
    const isPending = offer.status === "pending" && !isExpired;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={isPending && isReceived ? "border-yellow-500/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-sm">
                  Listing #{offer.listingId.slice(-6)}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {isReceived ? (
                    <>De: {offer.buyerId.slice(0, 6)}...</>
                  ) : (
                    <>À: {offer.sellerId.slice(0, 6)}...</>
                  )}
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

            {isPending && isReceived && (
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
                  onClick={() => handleOpenCounterDialog(offer)}
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

            {offer.status === "countered" && !isReceived && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-center">
                <AlertCircle className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-blue-600 text-xs">
                  Le vendeur a proposé {offer.counterOffer}€
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl p-4">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-blue-400" />
              Mes Offres
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Gérez vos offres d'achat et de vente.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadOffers}
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="received" className="relative">
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

          <TabsContent value="received" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground text-sm">
                Chargement...
              </div>
            ) : receivedOffers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Aucune offre reçue pour le moment.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivedOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} isReceived={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground text-sm">
                Chargement...
              </div>
            ) : sentOffers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Aucune offre envoyée pour le moment.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sentOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} isReceived={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog contre-offre */}
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
    </AppLayout>
  );
};

export default MyOffers;

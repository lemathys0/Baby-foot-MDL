// 📁 src/pages/Challenges.tsx
// Page des défis directs entre joueurs

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Swords, Trophy, Clock, X, Check, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserChallenges,
  acceptChallenge,
  declineChallenge,
  cancelChallenge,
  createChallenge,
  Challenge,
} from "@/lib/challengeSystem";
import { getFriends, Friend } from "@/lib/firebaseFriends";
import { logger } from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";

export default function Challenges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [challengeType, setChallengeType] = useState<"1v1" | "2v2">("1v1");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [challengeStake, setChallengeStake] = useState<number>(0);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const [challengesData, friendsData] = await Promise.all([
        getUserChallenges(user.uid),
        getFriends(user.uid),
      ]);

      setChallenges(challengesData);
      setFriends(friendsData);
    } catch (error) {
      logger.error("Erreur chargement défis:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les défis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!user || !selectedFriend) return;

    try {
      setIsCreating(true);
      const friend = friends.find((f) => f.id === selectedFriend);
      if (!friend) return;

      await createChallenge(
        user.uid,
        user.displayName || "Joueur",
        selectedFriend,
        friend.username,
        challengeType,
        challengeMessage,
        challengeStake
      );

      toast({
        title: "Défi envoyé!",
        description: `Votre défi à ${friend.username} a été envoyé`,
      });

      setShowCreateDialog(false);
      setSelectedFriend("");
      setChallengeMessage("");
      setChallengeStake(0);
      loadData();
    } catch (error: any) {
      logger.error("Erreur création défi:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le défi",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      await acceptChallenge(challengeId, user.uid);
      toast({
        title: "Défi accepté!",
        description: "Rendez-vous au baby-foot!",
      });
      loadData();
    } catch (error: any) {
      logger.error("Erreur acceptation défi:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      await declineChallenge(challengeId, user.uid);
      toast({
        title: "Défi refusé",
        description: "Le défi a été refusé",
      });
      loadData();
    } catch (error: any) {
      logger.error("Erreur refus défi:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      await cancelChallenge(challengeId, user.uid);
      toast({
        title: "Défi annulé",
        description: "Le défi a été annulé",
      });
      loadData();
    } catch (error: any) {
      logger.error("Erreur annulation défi:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTimeLeft = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) return "Expiré";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = (status: Challenge["status"]) => {
    const variants = {
      pending: { variant: "secondary" as const, text: "En attente" },
      accepted: { variant: "default" as const, text: "Accepté" },
      declined: { variant: "destructive" as const, text: "Refusé" },
      expired: { variant: "outline" as const, text: "Expiré" },
      completed: { variant: "default" as const, text: "Terminé" },
    };

    const { variant, text } = variants[status];
    return <Badge variant={variant}>{text}</Badge>;
  };

  const pendingChallenges = challenges.filter((c) => c.status === "pending");
  const activeChallenges = challenges.filter((c) => c.status === "accepted");
  const pastChallenges = challenges.filter((c) =>
    ["declined", "expired", "completed"].includes(c.status)
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Défis</h1>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Send className="w-4 h-4 mr-2" />
            Nouveau défi
          </Button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {pendingChallenges.length}
              </div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-500">
                {activeChallenges.length}
              </div>
              <div className="text-sm text-muted-foreground">Actifs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {pastChallenges.filter((c) => c.status === "completed").length}
              </div>
              <div className="text-sm text-muted-foreground">Terminés</div>
            </CardContent>
          </Card>
        </div>

        {/* Défis en attente */}
        {pendingChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Défis en attente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingChallenges.map((challenge) => {
                const isReceived = challenge.challengedId === user?.uid;

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Swords className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-semibold">
                            {isReceived
                              ? `${challenge.challengerUsername} vous défie!`
                              : `Défi envoyé à ${challenge.challengedUsername}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {challenge.type === "1v1" ? "1v1" : "2v2"}
                            {challenge.stake && challenge.stake > 0
                              ? ` • ${challenge.stake}€ en jeu`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {formatTimeLeft(challenge.expiresAt)}
                        </span>
                      </div>
                    </div>

                    {challenge.message && (
                      <div className="text-sm italic text-muted-foreground pl-8">
                        "{challenge.message}"
                      </div>
                    )}

                    <div className="flex gap-2 pl-8">
                      {isReceived ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptChallenge(challenge.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineChallenge(challenge.id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelChallenge(challenge.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Défis actifs */}
        {activeChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Défis actifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeChallenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border rounded-lg border-green-500/50 bg-green-500/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-semibold">
                          {challenge.challengerId === user?.uid
                            ? `Défi contre ${challenge.challengedUsername}`
                            : `Défi contre ${challenge.challengerUsername}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {challenge.type === "1v1" ? "1v1" : "2v2"}
                          {challenge.stake && challenge.stake > 0
                            ? ` • ${challenge.stake}€ en jeu`
                            : ""}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(challenge.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 pl-8">
                    Rendez-vous au baby-foot pour jouer ce match!
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Historique */}
        {pastChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pastChallenges.slice(0, 5).map((challenge) => (
                <div
                  key={challenge.id}
                  className="p-4 border rounded-lg opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold">
                          {challenge.challengerId === user?.uid
                            ? `${challenge.challengedUsername}`
                            : `${challenge.challengerUsername}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {challenge.type === "1v1" ? "1v1" : "2v2"}
                          {challenge.winnerId === user?.uid && " • Victoire 🏆"}
                          {challenge.winnerId &&
                            challenge.winnerId !== user?.uid &&
                            " • Défaite"}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(challenge.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Aucun défi */}
        {challenges.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Swords className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Aucun défi pour le moment
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Créer votre premier défi
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dialog création de défi */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-background rounded-lg p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Nouveau défi</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCreateDialog(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Défier
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg bg-background"
                    value={selectedFriend}
                    onChange={(e) => setSelectedFriend(e.target.value)}
                  >
                    <option value="">Sélectionner un ami</option>
                    {friends.map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {friend.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={challengeType === "1v1" ? "default" : "outline"}
                      onClick={() => setChallengeType("1v1")}
                      className="flex-1"
                    >
                      1v1
                    </Button>
                    <Button
                      variant={challengeType === "2v2" ? "default" : "outline"}
                      onClick={() => setChallengeType("2v2")}
                      className="flex-1"
                    >
                      2v2
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Message (optionnel)
                  </label>
                  <Textarea
                    placeholder="Ajouter un message..."
                    value={challengeMessage}
                    onChange={(e) => setChallengeMessage(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Mise (optionnel)
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={challengeStake || ""}
                    onChange={(e) => setChallengeStake(Number(e.target.value))}
                    min={0}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleCreateChallenge}
                    disabled={!selectedFriend || isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Envoyer le défi"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

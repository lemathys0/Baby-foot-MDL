// 📁 src/pages/Rivalries.tsx
// Page des rivalités entre joueurs

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, Trophy, TrendingUp, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserRivalries,
  getTopRivalries,
  Rivalry,
} from "@/lib/rivalrySystem";
import { logger } from "@/utils/logger";
import { Progress } from "@/components/ui/progress";

export default function Rivalries() {
  const { user } = useAuth();
  const [userRivalries, setUserRivalries] = useState<Rivalry[]>([]);
  const [topRivalries, setTopRivalries] = useState<Rivalry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "global">("mine");

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const [myRivalries, globalRivalries] = await Promise.all([
        getUserRivalries(user.uid),
        getTopRivalries(10),
      ]);

      setUserRivalries(myRivalries);
      setTopRivalries(globalRivalries);
    } catch (error) {
      logger.error("Erreur chargement rivalités:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIntensityBadge = (intensity: Rivalry["intensity"]) => {
    const variants = {
      casual: { variant: "secondary" as const, text: "Casual", icon: "🟢" },
      heated: { variant: "default" as const, text: "Intense", icon: "🟡" },
      legendary: { variant: "destructive" as const, text: "Légendaire", icon: "🔥" },
    };

    const { variant, text, icon } = variants[intensity];
    return (
      <Badge variant={variant}>
        {icon} {text}
      </Badge>
    );
  };

  const getWinRate = (rivalry: Rivalry, userId?: string) => {
    if (!userId) return 50;

    const isPlayer1 = rivalry.player1Id === userId;
    const wins = isPlayer1 ? rivalry.player1Wins : rivalry.player2Wins;
    const total = rivalry.totalMatches;

    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  const getRivalryStatus = (rivalry: Rivalry, userId?: string) => {
    if (!userId) return { text: "Équilibré", color: "text-yellow-500" };

    const winRate = getWinRate(rivalry, userId);

    if (winRate >= 70) return { text: "Dominant", color: "text-green-500" };
    if (winRate >= 55) return { text: "Favori", color: "text-blue-500" };
    if (winRate >= 45) return { text: "Équilibré", color: "text-yellow-500" };
    if (winRate >= 30) return { text: "Challengé", color: "text-orange-500" };
    return { text: "En difficulté", color: "text-red-500" };
  };

  const RivalryCard = ({
    rivalry,
    showUserPerspective = false,
  }: {
    rivalry: Rivalry;
    showUserPerspective?: boolean;
  }) => {
    const isPlayer1 = showUserPerspective && rivalry.player1Id === user?.uid;
    const playerWins = isPlayer1 ? rivalry.player1Wins : rivalry.player2Wins;
    const rivalWins = isPlayer1 ? rivalry.player2Wins : rivalry.player1Wins;
    const playerName = isPlayer1
      ? rivalry.player1Username
      : rivalry.player2Username;
    const rivalName = isPlayer1
      ? rivalry.player2Username
      : rivalry.player1Username;

    const winRate = getWinRate(rivalry, user?.uid);
    const status = getRivalryStatus(rivalry, user?.uid);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border rounded-lg space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame
              className={`w-6 h-6 ${
                rivalry.intensity === "legendary"
                  ? "text-red-500"
                  : rivalry.intensity === "heated"
                  ? "text-orange-500"
                  : "text-yellow-500"
              }`}
            />
            <div>
              {showUserPerspective ? (
                <>
                  <div className="font-semibold text-lg">
                    vs {rivalName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {rivalry.totalMatches} matchs •{" "}
                    <span className={status.color}>{status.text}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-lg">
                    {rivalry.player1Username} vs {rivalry.player2Username}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {rivalry.totalMatches} matchs joués
                  </div>
                </>
              )}
            </div>
          </div>
          {getIntensityBadge(rivalry.intensity)}
        </div>

        {showUserPerspective ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Votre taux de victoire</span>
                <span className="font-semibold">{winRate}%</span>
              </div>
              <Progress value={winRate} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {playerWins}
                </div>
                <div className="text-xs text-muted-foreground">Victoires</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {rivalWins}
                </div>
                <div className="text-xs text-muted-foreground">Défaites</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {rivalry.totalMatches}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="font-semibold text-lg">
                {rivalry.player1Username}
              </div>
              <div className="text-3xl font-bold text-primary mt-2">
                {rivalry.player1Wins}
              </div>
              <div className="text-sm text-muted-foreground">victoires</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {rivalry.player2Username}
              </div>
              <div className="text-3xl font-bold text-primary mt-2">
                {rivalry.player2Wins}
              </div>
              <div className="text-sm text-muted-foreground">victoires</div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Dernier match:{" "}
          {new Date(rivalry.lastMatchDate).toLocaleDateString("fr-FR")}
        </div>
      </motion.div>
    );
  };

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
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold">Rivalités</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "mine" ? "default" : "outline"}
            onClick={() => setActiveTab("mine")}
            className="flex-1"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Mes rivalités
          </Button>
          <Button
            variant={activeTab === "global" ? "default" : "outline"}
            onClick={() => setActiveTab("global")}
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Top rivalités
          </Button>
        </div>

        {/* Statistiques rapides */}
        {activeTab === "mine" && userRivalries.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-primary">
                  {userRivalries.length}
                </div>
                <div className="text-sm text-muted-foreground">Rivalités</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {
                    userRivalries.filter((r) => r.intensity === "heated" || r.intensity === "legendary")
                      .length
                  }
                </div>
                <div className="text-sm text-muted-foreground">Intenses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {userRivalries.filter((r) => r.intensity === "legendary").length}
                </div>
                <div className="text-sm text-muted-foreground">Légendaires</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mes rivalités */}
        {activeTab === "mine" && (
          <>
            {userRivalries.length > 0 ? (
              <div className="space-y-4">
                {userRivalries.map((rivalry) => (
                  <RivalryCard
                    key={rivalry.id}
                    rivalry={rivalry}
                    showUserPerspective={true}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">
                    Aucune rivalité pour le moment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Jouez des matchs en 1v1 pour créer des rivalités!
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Top rivalités globales */}
        {activeTab === "global" && (
          <>
            {topRivalries.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Les rivalités les plus intenses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topRivalries.map((rivalry, index) => (
                    <div key={rivalry.id} className="relative">
                      <div className="absolute -left-4 top-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <RivalryCard rivalry={rivalry} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flame className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Aucune rivalité enregistrée pour le moment
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

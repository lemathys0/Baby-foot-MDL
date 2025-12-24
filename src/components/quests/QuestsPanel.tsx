import { motion } from "framer-motion";
import { Target, Trophy, Calendar, Gift, Clock, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuests } from "@/hooks/useQuests";
import { useAuth } from "@/contexts/AuthContext";
import { Quest } from "@/lib/questSystem";

const QuestCard = ({
  quest,
  onClaim,
  isClaiming,
}: {
  quest: Quest;
  onClaim: () => void;
  isClaiming: boolean;
}) => {
  const progress = Math.round((quest.progress / quest.target) * 100);
  const isCompleted = quest.completed;
  const isClaimed = !!quest.claimedAt;

  const getCategoryIcon = () => {
    switch (quest.category) {
      case 'match':
        return <Trophy className="h-4 w-4" />;
      case 'social':
        return <Target className="h-4 w-4" />;
      case 'collection':
        return <Gift className="h-4 w-4" />;
      case 'progression':
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getCategoryColor = () => {
    switch (quest.category) {
      case 'match':
        return 'text-rarity-gold';
      case 'social':
        return 'text-primary';
      case 'collection':
        return 'text-rarity-epic';
      case 'progression':
        return 'text-rarity-legendary';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className={`relative overflow-hidden transition-all ${
        isCompleted && !isClaimed
          ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-transparent'
          : ''
      }`}>
        {isCompleted && !isClaimed && (
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-bl-full" />
        )}

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icône */}
            <div className={`p-2 rounded-lg bg-surface ${getCategoryColor()}`}>
              {getCategoryIcon()}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    {quest.title}
                    {isCompleted && (
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {isClaimed ? 'Réclamé' : 'Terminé'}
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">{quest.description}</p>
                </div>
              </div>

              {/* Progression */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {quest.progress} / {quest.target}
                  </span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Récompenses */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs">
                  {quest.reward.fortune && (
                    <Badge variant="secondary" className="font-medium">
                      💰 {quest.reward.fortune}
                    </Badge>
                  )}
                  {quest.reward.packs && (
                    <Badge variant="secondary" className="font-medium">
                      📦 {quest.reward.packs}
                    </Badge>
                  )}
                  {quest.reward.badge && (
                    <Badge variant="secondary" className="font-medium">
                      🏅 Badge
                    </Badge>
                  )}
                </div>

                {isCompleted && !isClaimed && (
                  <Button
                    size="sm"
                    onClick={onClaim}
                    disabled={isClaiming}
                    className="text-xs h-7"
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    Réclamer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const QuestsPanel = () => {
  const { user } = useAuth();
  const { quests, isLoading, isClaiming, claimReward, stats } = useQuests(user?.uid);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quests) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header avec statistiques */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Quêtes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quotidiennes</p>
                <div className="flex items-center gap-2">
                  <Progress value={stats?.dailyProgress || 0} className="flex-1" />
                  <span className="text-sm font-medium">
                    {stats?.dailyCompleted}/{stats?.dailyTotal}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Hebdomadaires</p>
                <div className="flex items-center gap-2">
                  <Progress value={stats?.weeklyProgress || 0} className="flex-1" />
                  <span className="text-sm font-medium">
                    {stats?.weeklyCompleted}/{stats?.weeklyTotal}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs pour différents types de quêtes */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily" className="gap-2">
            <Clock className="h-4 w-4" />
            Quotidiennes
            {(stats?.dailyCompleted || 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {stats?.dailyCompleted}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Calendar className="h-4 w-4" />
            Hebdomadaires
            {(stats?.weeklyCompleted || 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {stats?.weeklyCompleted}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-3 mt-4">
          {quests.daily.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucune quête quotidienne disponible
              </CardContent>
            </Card>
          ) : (
            quests.daily.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={() => claimReward('daily', quest.id)}
                isClaiming={isClaiming}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-3 mt-4">
          {quests.weekly.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucune quête hebdomadaire disponible
              </CardContent>
            </Card>
          ) : (
            quests.weekly.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={() => claimReward('weekly', quest.id)}
                isClaiming={isClaiming}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

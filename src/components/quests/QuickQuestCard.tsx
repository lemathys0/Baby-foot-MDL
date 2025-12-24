import { motion } from "framer-motion";
import { Target, ArrowRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useQuests } from "@/hooks/useQuests";

export const QuickQuestCard = () => {
  const { user } = useAuth();
  const { quests, stats } = useQuests(user?.uid);

  if (!quests) return null;

  // Trouver la première quête non complétée
  const activeQuest = quests.daily.find(q => !q.completed);

  // Compter les quêtes complétées
  const completedCount = (stats?.dailyCompleted || 0) + (stats?.weeklyCompleted || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Link to="/quests">
        <Card className="group cursor-pointer hover:border-primary/50 transition-all overflow-hidden relative">
          {completedCount > 0 && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full" />
          )}

          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icône */}
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5" />
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Quêtes du jour
                    {completedCount > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                        {completedCount} ✓
                      </span>
                    )}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>

                {activeQuest ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">
                      {activeQuest.title}: {activeQuest.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(activeQuest.progress / activeQuest.target) * 100}
                        className="flex-1 h-1.5"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activeQuest.progress}/{activeQuest.target}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">
                      Toutes les quêtes quotidiennes complétées !
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

import { motion } from "framer-motion";
import { Trophy, X, Percent, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsGridProps {
  wins: number;
  losses: number;
  fortune: number;
  totalEarned: number;
}

export function StatsGrid({ wins, losses, fortune, totalEarned }: StatsGridProps) {
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const stats = [
    {
      label: "Victoires",
      value: wins,
      icon: Trophy,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Défaites",
      value: losses,
      icon: X,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: Percent,
      color: "text-rarity-gold",
      bgColor: "bg-rarity-gold/10",
    },
    {
      label: "Fortune",
      value: `${fortune}€`,
      icon: Coins,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}


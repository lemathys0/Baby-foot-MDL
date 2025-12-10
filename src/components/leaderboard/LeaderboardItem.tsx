import { motion } from "framer-motion";
import { User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardItemProps {
  rank: number;
  username: string;
  avatar?: string;
  eloRating: number;
  wins: number;
  losses: number;
  index: number;
}

export function LeaderboardItem({
  rank,
  username,
  avatar,
  eloRating,
  wins,
  losses,
  index,
}: LeaderboardItemProps) {
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return "bg-rarity-gold/20 border-rarity-gold text-rarity-gold glow-gold";
      case 2:
        return "bg-rarity-silver/20 border-rarity-silver text-rarity-silver";
      case 3:
        return "bg-rarity-bronze/20 border-rarity-bronze text-rarity-bronze";
      default:
        return "bg-surface-alt border-border text-muted-foreground";
    }
  };

  const getRankIcon = () => {
    if (rank <= 3) {
      return <Trophy className="h-4 w-4" />;
    }
    return <span className="text-sm font-bold">{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary/50",
        rank <= 3 ? getRankStyle() : "bg-surface border-border"
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2",
          getRankStyle()
        )}
      >
        {getRankIcon()}
      </div>

      {/* Avatar */}
      <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
        {avatar ? (
          <img src={avatar} alt={username} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="flex-1">
        <p className="font-semibold text-foreground">{username}</p>
        <p className="text-sm text-muted-foreground">
          {wins}V / {losses}D
        </p>
      </div>

      {/* ELO */}
      <div className="text-right">
        <p className="text-2xl font-bold text-primary text-glow-cyan">{eloRating}</p>
        <p className="text-xs text-muted-foreground">ELO</p>
      </div>
    </motion.div>
  );
}


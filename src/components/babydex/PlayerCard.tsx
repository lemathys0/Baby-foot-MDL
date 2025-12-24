import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { memo } from "react";

type Rarity = "bronze" | "silver" | "gold" | "espoir" | "icone" | "future-star" | "god" | "creator" | "unknown";

interface PlayerCardProps {
  name: string;
  code: string;
  rarity: Rarity;
  image?: string;
  owned?: boolean;
  onClick?: () => void;
}

const rarityLabels: Record<Rarity, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  espoir: "Espoir",
  icone: "Icône",
  "future-star": "Future Star",
  god: "GOD",
  creator: "CRÉATEUR",
  unknown: "Inconnu",
};

export const PlayerCard = memo(function PlayerCard({
  name,
  code,
  rarity,
  image,
  owned = true,
  onClick,
}: PlayerCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl p-1 transition-all",
        `card-rarity-${rarity}`,
        !owned && "opacity-40 grayscale"
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-background/50 backdrop-blur-sm">
        {/* Card Image */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-background/80">
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">⚽</span>
          )}
        </div>

        {/* Card Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-xs text-muted-foreground">{code}</p>
          <p className="truncate font-bold text-foreground">{name}</p>
        </div>

        {/* Rarity Badge */}
        <div
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            rarity === "bronze" && "bg-rarity-bronze/80 text-foreground",
            rarity === "silver" && "bg-rarity-silver/80 text-background",
            rarity === "gold" && "bg-rarity-gold/80 text-background",
            rarity === "espoir" && "bg-blue-500/80 text-white",
            rarity === "icone" && "bg-purple-500/80 text-white",
            rarity === "future-star" && "bg-cyan-500/80 text-white",
            rarity === "god" && "bg-primary/80 text-primary-foreground",
            rarity === "creator" && "bg-secondary/80 text-secondary-foreground",
            rarity === "unknown" && "bg-gray-500/80 text-white"
          )}
        >
          {rarityLabels[rarity]}
        </div>

        {/* Owned indicator */}
        {!owned && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="text-2xl">🔒</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Ne re-render que si les props essentielles changent
  return (
    prevProps.code === nextProps.code &&
    prevProps.owned === nextProps.owned &&
    prevProps.image === nextProps.image
  );
});

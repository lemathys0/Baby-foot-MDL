// ✅ Skeleton Loaders - Meilleure UX pendant le chargement
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "text" | "card";
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  const variantClasses = {
    default: "h-4 w-full",
    circular: "h-12 w-12 rounded-full",
    text: "h-4 w-3/4",
    card: "h-32 w-full rounded-lg",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
    />
  );
}

// Skeleton pour les items de leaderboard
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface-alt p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" className="h-12 w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton pour les cartes
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

// Skeleton pour les listes de joueurs
export function PlayerListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded">
          <Skeleton variant="circular" className="h-10 w-10" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}


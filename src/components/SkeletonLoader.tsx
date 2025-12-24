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

// ✅ Skeleton pour le profil utilisateur
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header avec avatar et stats */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-6">
          <Skeleton variant="circular" className="h-24 w-24" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Badges section */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ✅ Skeleton pour l'inventaire
export function InventorySkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Grid d'items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-32 w-full rounded" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ Skeleton pour la liste de matchs
export function MatchListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-8 w-16" />
            <div className="flex-1">
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ✅ Skeleton pour la grille de cartes (BabyDex, Market)
export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ✅ Skeleton pour le tournoi
export function TournamentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-4 w-20 mx-auto mb-2" />
              <Skeleton className="h-6 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Matchs */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ Skeleton générique pour page entière
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Users, Clock, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QueuePlayer {
  id: string;
  username: string;
  eloRating: number;
}

interface MatchQueueProps {
  queuedPlayers: QueuePlayer[];
  isInQueue: boolean;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
  isJoining?: boolean;
  isLeaving?: boolean;
}

export function MatchQueue({
  queuedPlayers,
  isInQueue,
  onJoinQueue,
  onLeaveQueue,
  isJoining = false,
  isLeaving = false,
}: MatchQueueProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-surface-alt/50">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          File d'attente
          <span className="ml-auto rounded-full bg-primary/20 px-3 py-1 text-sm text-primary">
            {queuedPlayers.length}/4
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Queue Slots */}
        <div className="mb-6 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((slot) => {
            const player = queuedPlayers[slot];
            return (
              <motion.div
                key={slot}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: slot * 0.1 }}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                  player
                    ? "border-primary bg-primary/10 neon-border-cyan"
                    : "border-border bg-surface-alt"
                }`}
              >
                {player ? (
                  <>
                    <span className="text-2xl">👤</span>
                    <span className="mt-1 text-xs font-medium truncate w-full text-center px-1">
                      {player.username}
                    </span>
                    <span className="text-[10px] text-primary">{player.eloRating}</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-1 text-xs text-muted-foreground">En attente</span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action Button */}
        {isInQueue ? (
          <Button
            variant="neon-magenta"
            className="w-full"
            onClick={onLeaveQueue}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Départ...
              </>
            ) : (
              "Quitter la file"
            )}
          </Button>
        ) : (
          <Button 
            variant="neon" 
            className="w-full" 
            onClick={onJoinQueue}
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejoindre...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Rejoindre la file
              </>
            )}
          </Button>
        )}

        {queuedPlayers.length === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg bg-primary/20 p-3 text-center"
          >
            <p className="font-semibold text-primary text-glow-cyan">
              🎮 Match prêt à démarrer !
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

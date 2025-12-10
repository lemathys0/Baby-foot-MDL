import { motion } from "framer-motion";
import { Coins, TrendingUp, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FortuneDisplayProps {
  fortune: number;
  totalEarned: number;
  taxRate: number;
  taxDue: number;
}

export function FortuneDisplay({
  fortune,
  totalEarned,
  taxRate,
  taxDue,
}: FortuneDisplayProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Économie
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Fortune */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between rounded-lg bg-surface-alt p-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fortune</p>
                <p className="text-2xl font-bold text-primary text-glow-cyan">
                  {fortune.toLocaleString()}€
                </p>
              </div>
            </div>
          </motion.div>

          {/* Total Earned */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between rounded-lg bg-surface-alt p-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rarity-gold/20 p-2">
                <TrendingUp className="h-5 w-5 text-rarity-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gagné (à vie)</p>
                <p className="text-xl font-bold text-rarity-gold">
                  {totalEarned.toLocaleString()}€
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tax Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/5 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/20 p-2">
                <Percent className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Impôt ({taxRate}%)
                </p>
                <p className="text-xl font-bold text-secondary">
                  {taxDue.toLocaleString()}€ dû
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}


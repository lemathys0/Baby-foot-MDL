import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { getFortuneHistory, type FortuneHistory } from "@/lib/firebaseExtended";

interface FortuneHistoryCardProps {
  userId: string;
}

export function FortuneHistoryCard({ userId }: FortuneHistoryCardProps) {
  const [history, setHistory] = useState<FortuneHistory[]>([]);
  const [period, setPeriod] = useState<1 | 7 | 30>(7);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId, period]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getFortuneHistory(userId, period);
      setHistory(data);
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculer les statistiques
  const currentFortune = history[history.length - 1]?.fortune || 0;
  const startFortune = history[0]?.fortune || 0;
  const totalChange = currentFortune - startFortune;
  const percentChange = startFortune > 0 ? ((totalChange / startFortune) * 100).toFixed(1) : 0;

  // Formater les données pour le graphique
  const chartData = history.map(entry => ({
    date: new Date(entry.timestamp).toLocaleDateString('fr-FR', { 
      month: 'short', 
      day: 'numeric' 
    }),
    fortune: entry.fortune,
    timestamp: entry.timestamp,
  }));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-bold text-primary">{payload[0].value}€</p>
          <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Si pas d'historique
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Historique de Fortune
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Aucune donnée d'historique disponible
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Commence à jouer pour voir ton évolution !
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Historique de Fortune</CardTitle>
          </div>
          
          {/* Sélecteur de période */}
          <div className="flex gap-2">
            {[1, 7, 30].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as 1 | 7 | 30)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-alt text-muted-foreground hover:bg-surface"
                }`}
              >
                {p}j
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-surface-alt">
            <p className="text-xs text-muted-foreground">Évolution</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-bold ${totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalChange >= 0 ? '+' : ''}{totalChange}€
              </p>
              {totalChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={`text-xs ${totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalChange >= 0 ? '+' : ''}{percentChange}%
            </p>
          </div>

          <div className="p-3 rounded-lg bg-surface-alt">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-xl font-bold">{history.length}</p>
            <p className="text-xs text-muted-foreground">
              {history.filter(h => h.change > 0).length} ↑ / {history.filter(h => h.change < 0).length} ↓
            </p>
          </div>
        </div>

        {/* Graphique */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fortuneGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px' }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px' }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="fortune"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#fortuneGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transactions récentes */}
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold mb-2">Transactions récentes</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.slice(-5).reverse().map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-alt text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${entry.change > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium text-xs">{entry.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-xs ${entry.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {entry.change > 0 ? '+' : ''}{entry.change}€
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

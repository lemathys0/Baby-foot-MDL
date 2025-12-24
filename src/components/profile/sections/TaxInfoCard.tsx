import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Info, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getUserTaxInfo, payTaxesManually, isLastWeekendOfMonth, getDaysUntilLastWeekend } from "@/lib/taxSystem";
import { calculateTaxRate } from "@/lib/utils";
import { logger } from '@/utils/logger';

interface TaxInfoCardProps {
  userId: string;
  fortune: number;
  bettingGains: number;
}

export const TaxInfoCard = ({ userId, fortune, bettingGains }: TaxInfoCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [taxInfo, setTaxInfo] = useState<any>(null);

  const loadTaxInfo = async () => {
    setIsLoading(true);
    try {
      const info = await getUserTaxInfo(userId);
      setTaxInfo(info);
    } catch (error) {
      logger.error("Erreur chargement taxes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!taxInfo && !isLoading) {
    loadTaxInfo();
  }

  const taxRate = calculateTaxRate(bettingGains);
  const taxesDue = Math.round(bettingGains * taxRate);
  const daysUntilTax = getDaysUntilLastWeekend();
  const isWeekendTax = isLastWeekendOfMonth();
  const alreadyPaid = taxInfo?.taxesPaid;
  const canPayNow = !alreadyPaid && isWeekendTax && fortune >= taxesDue;

  const getBracketInfo = (gained: number) => {
    if (gained >= 2000) return { next: null, toNext: 0, color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" };
    if (gained >= 1000) return { next: 2000, toNext: 2000 - gained, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" };
    if (gained >= 100) return { next: 1000, toNext: 1000 - gained, color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" };
    return { next: 100, toNext: 100 - gained, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" };
  };

  const bracket = getBracketInfo(bettingGains);

  const handlePayTaxes = async () => {
    if (!canPayNow) return;
    setIsLoading(true);
    try {
      const result = await payTaxesManually(userId);
      if (result.success) {
        toast({ title: "Paiement réussi! 💸", description: result.message });
        loadTaxInfo();
      } else {
        toast({ title: "Erreur", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!taxInfo) return (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </CardContent>
    </Card>
  );

  return (
    <Card className={`border-2 ${bracket.borderColor} bg-gradient-to-br from-secondary/5 to-transparent`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-secondary">
          <AlertTriangle className="h-5 w-5" />
          Système Fiscal - Dernier Week-end du Mois
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
          <div>
            <p className="text-sm font-medium">Statut</p>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
          </div>
          {alreadyPaid ? (
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">✓ PAYÉ</Badge>
          ) : isWeekendTax ? (
            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse">⏰ EN COURS</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground">⏳ NON DISPONIBLE</Badge>
          )}
        </div>

        {alreadyPaid && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-400 mb-1">✓ Taxes Payées</p>
                <p className="text-xs text-muted-foreground">
                  Vous avez déjà payé vos taxes ce mois-ci. Prochain paiement possible le mois prochain.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 rounded-lg ${bracket.bgColor} border ${bracket.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Taxes à payer</span>
            <span className={`text-3xl font-bold ${bracket.color}`}>
              {alreadyPaid ? "0" : taxesDue}€
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Taux actuel</span>
            <span className={`font-bold ${bracket.color}`}>{Math.round(taxRate * 100)}%</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Basé sur vos gains de paris</span>
            <span className="font-medium">{bettingGains}€</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Fortune actuelle</span>
            <span className="font-medium">{fortune}€</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Prochaine période de paiement</span>
            <span className="text-xs text-muted-foreground">
              {isWeekendTax ? "🔴 EN COURS" : `${daysUntilTax} jour(s)`}
            </span>
          </div>
          {isWeekendTax ? (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs font-semibold text-yellow-400">⏰ Le dernier week-end du mois est ACTIF !</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vous pouvez payer vos taxes maintenant jusqu'à dimanche minuit.
              </p>
            </div>
          ) : (
            <>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(5, ((30 - daysUntilTax) / 30) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Les taxes peuvent être payées le dernier week-end du mois (samedi-dimanche).
              </p>
            </>
          )}
        </div>

        {bracket.next && (
          <div className="p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Progression vers prochaine tranche</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Encore <span className="font-bold text-primary">{bracket.toNext}€</span> de gains pour atteindre
              la tranche à {Math.round(calculateTaxRate(bracket.next) * 100)}%
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" />
            Barème d'imposition
          </h4>
          <div className="space-y-1.5">
            {[
              { range: "0€ - 99€", rate: 10, current: bettingGains < 100 },
              { range: "100€ - 999€", rate: 15, current: bettingGains >= 100 && bettingGains < 1000 },
              { range: "1000€ - 1999€", rate: 19, current: bettingGains >= 1000 && bettingGains < 2000 },
              { range: "2000€+", rate: 23, current: bettingGains >= 2000 }
            ].map((tier) => (
              <div
                key={tier.range}
                className={`flex justify-between p-2.5 rounded-lg text-sm transition-all ${
                  tier.current
                    ? "bg-secondary/20 border-2 border-secondary/40 font-bold"
                    : "bg-surface-alt border border-transparent"
                }`}
              >
                <span className={tier.current ? "text-foreground" : "text-muted-foreground"}>
                  {tier.range}
                </span>
                <span className={tier.current ? "text-secondary" : "text-muted-foreground"}>
                  {tier.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {!isWeekendTax && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-400 mb-1">ℹ️ Paiement indisponible</p>
                <p className="text-xs text-muted-foreground">
                  Les taxes ne peuvent être payées que le dernier week-end du mois.
                  Revenez dans {daysUntilTax} jour(s).
                </p>
              </div>
            </div>
          </div>
        )}

        {canPayNow ? (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handlePayTaxes}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Paiement en cours...
              </>
            ) : (
              <>💸 Payer {taxesDue}€ de taxes</>
            )}
          </Button>
        ) : alreadyPaid ? (
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            ✓ Déjà payé ce mois-ci
          </Button>
        ) : !isWeekendTax ? (
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            ⏳ Disponible le dernier week-end ({daysUntilTax}j)
          </Button>
        ) : fortune < taxesDue ? (
          <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
            Fonds insuffisants ({fortune}€ / {taxesDue}€)
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};

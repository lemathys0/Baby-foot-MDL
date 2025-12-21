import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, Trash2, 
  TrendingUp, Zap, DollarSign, User, Clock, Filter,
  Loader2, Eye, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  getSuspiciousActivities, 
  resolveActivity, 
  deleteActivity,
  getAntiCheatStats,
  type SuspiciousActivity 
} from "@/lib/firebaseAntiCheat";
import { toast } from "@/hooks/use-toast";

export const AntiCheatTab = () => {
  const [activities, setActivities] = useState<SuspiciousActivity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [activitiesData, statsData] = await Promise.all([
        getSuspiciousActivities(),
        getAntiCheatStats(),
      ]);
      
      setActivities(activitiesData);
      setStats(statsData);
    } catch (error) {
      console.error("Erreur chargement anti-cheat:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données anti-cheat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (activityId: string) => {
    setActionId(activityId);
    try {
      await resolveActivity(activityId);
      toast({
        title: "✅ Activité résolue",
        description: "L'activité a été marquée comme résolue",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm("⚠️ Supprimer définitivement cette activité ?")) return;
    
    setActionId(activityId);
    try {
      await deleteActivity(activityId);
      toast({
        title: "🗑️ Activité supprimée",
        description: "L'activité a été supprimée",
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return { 
          label: "Critique", 
          color: "text-red-500", 
          bg: "bg-red-500/10", 
          border: "border-red-500" 
        };
      case "medium":
        return { 
          label: "Moyen", 
          color: "text-yellow-500", 
          bg: "bg-yellow-500/10", 
          border: "border-yellow-500" 
        };
      case "low":
        return { 
          label: "Faible", 
          color: "text-blue-500", 
          bg: "bg-blue-500/10", 
          border: "border-blue-500" 
        };
      default:
        return { 
          label: "Inconnu", 
          color: "text-gray-500", 
          bg: "bg-gray-500/10", 
          border: "border-gray-500" 
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "fortune_spike": return <DollarSign className="h-4 w-4" />;
      case "elo_spike": return <TrendingUp className="h-4 w-4" />;
      case "rapid_actions": return <Zap className="h-4 w-4" />;
      case "negative_value": return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "fortune_spike": return "Pic de fortune";
      case "elo_spike": return "Pic d'ELO";
      case "rapid_actions": return "Actions rapides";
      case "negative_value": return "Valeur négative";
      default: return type;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === "resolved" && !activity.resolved) return false;
    if (filter === "unresolved" && activity.resolved) return false;
    if (typeFilter !== "all" && activity.type !== typeFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 text-center">
            <XCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
            <p className="text-2xl font-bold text-red-500">{stats?.unresolved || 0}</p>
            <p className="text-xs text-muted-foreground">Non résolues</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-500" />
            <p className="text-2xl font-bold text-green-500">
              {(stats?.total || 0) - (stats?.unresolved || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Résolues</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold">
              {stats?.bySeverity?.high || 0}
            </p>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution par type */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribution par type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.byType).map(([type, count]: [string, any]) => (
                <div key={type} className="flex items-center justify-between p-2 rounded bg-muted">
                  <span className="text-xs flex items-center gap-2">
                    {getTypeIcon(type)}
                    {getTypeLabel(type)}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-sm font-medium self-center flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Statut:
            </span>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Tout
            </Button>
            <Button
              size="sm"
              variant={filter === "unresolved" ? "default" : "outline"}
              onClick={() => setFilter("unresolved")}
            >
              Non résolues
            </Button>
            <Button
              size="sm"
              variant={filter === "resolved" ? "default" : "outline"}
              onClick={() => setFilter("resolved")}
            >
              Résolues
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium self-center">Type:</span>
            <Button
              size="sm"
              variant={typeFilter === "all" ? "default" : "outline"}
              onClick={() => setTypeFilter("all")}
            >
              Tout
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "fortune_spike" ? "default" : "outline"}
              onClick={() => setTypeFilter("fortune_spike")}
            >
              Fortune
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "elo_spike" ? "default" : "outline"}
              onClick={() => setTypeFilter("elo_spike")}
            >
              ELO
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "rapid_actions" ? "default" : "outline"}
              onClick={() => setTypeFilter("rapid_actions")}
            >
              Actions rapides
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des activités */}
      <div className="space-y-2">
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 text-green-500 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {filter === "unresolved" 
                  ? "✅ Aucune activité suspecte non résolue" 
                  : "Aucune activité trouvée"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map((activity, index) => {
            const severity = getSeverityConfig(activity.severity);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`${activity.resolved ? "opacity-60" : ""} ${severity.bg} border ${severity.border}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`rounded-lg ${severity.bg} p-2 ${severity.color}`}>
                        {getTypeIcon(activity.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className={`${severity.color} ${severity.border}`}>
                                {severity.label}
                              </Badge>
                              <Badge variant="outline">
                                {getTypeLabel(activity.type)}
                              </Badge>
                              {activity.resolved && (
                                <Badge variant="default" className="bg-green-500">
                                  ✓ Résolu
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-sm mb-1">
                              <User className="inline h-3 w-3 mr-1" />
                              {activity.username}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {activity.description}
                            </p>
                            
                            {/* Valeurs */}
                            {(activity.oldValue !== undefined || activity.newValue !== undefined) && (
                              <div className="flex items-center gap-3 text-xs">
                                {activity.oldValue !== undefined && (
                                  <span className="text-muted-foreground">
                                    Ancien: <span className="font-mono font-bold">{activity.oldValue}</span>
                                  </span>
                                )}
                                {activity.oldValue !== undefined && activity.newValue !== undefined && (
                                  <span>→</span>
                                )}
                                {activity.newValue !== undefined && (
                                  <span className={severity.color}>
                                    Nouveau: <span className="font-mono font-bold">{activity.newValue}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.timestamp).toLocaleString("fr-FR")}
                          </span>
                          
                          <div className="flex gap-1">
                            {!activity.resolved && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleResolve(activity.id)}
                                disabled={actionId === activity.id}
                                className="h-7 text-xs"
                              >
                                {actionId === activity.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(activity.id)}
                              disabled={actionId === activity.id}
                              className="h-7 text-xs"
                            >
                              {actionId === activity.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

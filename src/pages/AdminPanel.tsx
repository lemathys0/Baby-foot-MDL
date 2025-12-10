import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Shield, Users, Trophy, Coins, Settings, TrendingUp, 
  Loader2, AlertTriangle, Check, X, Plus, Trash2,
  UserPlus, DollarSign, Award, Zap, Clock, Target, Edit,
  BarChart3, Activity, Ban, Gift, Calendar, Eye, Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get, update, remove, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const AdminPanel = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [appStats, setAppStats] = useState({
    totalUsers: 0,
    totalMatches: 0,
    totalTournaments: 0,
    totalBets: 0,
    totalFortune: 0,
    activeUsers: 0,
  });

  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showFortuneDialog, setShowFortuneDialog] = useState(false);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserElo, setNewUserElo] = useState("1000");
  const [editUserElo, setEditUserElo] = useState("");
  const [editUserFortune, setEditUserFortune] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [fortuneAmount, setFortuneAmount] = useState("");
  const [fortuneAction, setFortuneAction] = useState<"add" | "remove">("add");
  const [selectedBadge, setSelectedBadge] = useState("");

  const BADGES = [
    { id: "founder", name: "Fondateur", icon: "👑", color: "gold" },
    { id: "veteran", name: "Vétéran", icon: "⚔️", color: "silver" },
    { id: "champion", name: "Champion", icon: "🏆", color: "gold" },
    { id: "collector", name: "Collectionneur", icon: "🎴", color: "purple" },
    { id: "millionaire", name: "Millionnaire", icon: "💰", color: "green" },
  ];

  useEffect(() => {
    if (user && userProfile) {
      setIsAdmin(userProfile.role === "admin");
      if (userProfile.role === "admin") {
        loadAdminData();
      }
    }
  }, [user, userProfile]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const usersArray = Object.entries(usersData).map(([id, data]: [string, any]) => ({
          id,
          ...data
        }));
        setUsers(usersArray);

        const totalFortune = usersArray.reduce((sum, u) => sum + (u.fortune || 0), 0);
        const activeUsers = usersArray.filter(u => {
          const lastActive = u.lastActive || 0;
          return Date.now() - lastActive < 24 * 60 * 60 * 1000;
        }).length;
        
        const matchesRef = ref(database, 'matches');
        const matchesSnapshot = await get(matchesRef);
        let totalMatches = 0;
        let matchesArray: any[] = [];
        
        if (matchesSnapshot.exists()) {
          const matchesData = matchesSnapshot.val();
          matchesArray = Object.entries(matchesData).map(([id, data]: [string, any]) => ({
            id,
            ...data
          }));
          totalMatches = matchesArray.length;
        }
        setMatches(matchesArray);

        const tournamentsRef = ref(database, 'tournaments');
        const tournamentsSnapshot = await get(tournamentsRef);
        let totalTournaments = 0;
        
        if (tournamentsSnapshot.exists()) {
          totalTournaments = Object.keys(tournamentsSnapshot.val()).length;
        }

        setAppStats({
          totalUsers: usersArray.length,
          totalMatches,
          totalTournaments,
          totalBets: 0,
          totalFortune,
          activeUsers,
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur chargement données admin:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserUsername) {
      toast({
        title: "Erreur",
        description: "Remplissez tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const newUserId = userCredential.user.uid;

      const userRef = ref(database, `users/${newUserId}`);
      await set(userRef, {
        username: newUserUsername,
        email: newUserEmail,
        eloRating: parseInt(newUserElo),
        fortune: 100,
        wins: 0,
        losses: 0,
        role: "player",
        banned: false,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Utilisateur créé",
        description: `${newUserUsername} a été ajouté`,
      });

      setShowAddUserDialog(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserUsername("");
      setNewUserElo("1000");
      
      loadAdminData();
    } catch (error: any) {
      console.error("Erreur création utilisateur:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${selectedUser.id}`);
      const updates: any = {};

      if (editUserElo) updates.eloRating = parseInt(editUserElo);
      if (editUserFortune) updates.fortune = parseInt(editUserFortune);
      if (editUserRole) updates.role = editUserRole;

      await update(userRef, updates);

      toast({
        title: "✅ Utilisateur modifié",
        description: "Les modifications ont été sauvegardées",
      });

      setShowEditUserDialog(false);
      setSelectedUser(null);
      setEditUserElo("");
      setEditUserFortune("");
      setEditUserRole("");
      
      loadAdminData();
    } catch (error: any) {
      console.error("Erreur modification utilisateur:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`⚠️ Supprimer définitivement ${username} ?\n\nCette action est irréversible.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${userId}`);
      await remove(userRef);

      toast({
        title: "🗑️ Utilisateur supprimé",
        description: `${username} a été retiré de la base de données`,
      });
      
      loadAdminData();
    } catch (error: any) {
      console.error("Erreur suppression utilisateur:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageFortune = async () => {
    if (!selectedUser || !fortuneAmount) return;

    const amount = parseInt(fortuneAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${selectedUser.id}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const currentFortune = snapshot.val().fortune || 0;
        const newFortune = fortuneAction === "add" 
          ? currentFortune + amount 
          : Math.max(0, currentFortune - amount);
        
        await update(userRef, { fortune: newFortune });
        
        toast({
          title: "💰 Fortune mise à jour",
          description: `${fortuneAction === "add" ? "+" : "-"}${amount}€`,
        });
        
        setShowFortuneDialog(false);
        setFortuneAmount("");
        loadAdminData();
      }
    } catch (error: any) {
      console.error("Erreur gestion fortune:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiveBadge = async () => {
    if (!selectedUser || !selectedBadge) return;

    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${selectedUser.id}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const currentBadges = snapshot.val().badges || [];
        
        if (currentBadges.includes(selectedBadge)) {
          toast({
            title: "Badge déjà possédé",
            description: "L'utilisateur a déjà ce badge",
            variant: "destructive",
          });
        } else {
          await update(userRef, { 
            badges: [...currentBadges, selectedBadge] 
          });
          
          toast({
            title: "🏅 Badge attribué",
            description: `Badge "${BADGES.find(b => b.id === selectedBadge)?.name}" donné à ${selectedUser.username}`,
          });
        }
        
        setShowBadgeDialog(false);
        setSelectedBadge("");
        loadAdminData();
      }
    } catch (error: any) {
      console.error("Erreur attribution badge:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    if (!confirm(`⚠️ Bannir ${username} ?\n\nL'utilisateur ne pourra plus se connecter.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        toast({
          title: "Erreur",
          description: "Utilisateur introuvable",
          variant: "destructive",
        });
        return;
      }

      await update(userRef, { 
        banned: true,
        bannedAt: new Date().toISOString(),
        bannedBy: user?.uid || "admin"
      });

      toast({
        title: "🚫 Utilisateur banni",
        description: `${username} a été banni et ne peut plus se connecter`,
      });
      
      await loadAdminData();
    } catch (error: any) {
      console.error("Erreur bannissement:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de bannir l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    if (!confirm(`✅ Débannir ${username} ?\n\nL'utilisateur pourra à nouveau se connecter.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        toast({
          title: "Erreur",
          description: "Utilisateur introuvable",
          variant: "destructive",
        });
        return;
      }

      await update(userRef, { 
        banned: false,
        unbannedAt: new Date().toISOString(),
        unbannedBy: user?.uid || "admin"
      });

      toast({
        title: "✅ Utilisateur débanni",
        description: `${username} peut maintenant se reconnecter`,
      });
      
      await loadAdminData();
    } catch (error: any) {
      console.error("Erreur débannissement:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de débannir l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm(`⚠️ Supprimer ce match ?\n\nCette action est irréversible.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const matchRef = ref(database, `matches/${matchId}`);
      await remove(matchRef);

      toast({
        title: "🗑️ Match supprimé",
        description: "Le match a été supprimé",
      });
      
      loadAdminData();
    } catch (error: any) {
      console.error("Erreur suppression match:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAllELO = async () => {
    if (!confirm("⚠️ ATTENTION : Remettre tous les ELO à 1000 ?\n\nCette action est irréversible.")) {
      return;
    }

    setIsLoading(true);
    try {
      const updates: { [key: string]: any } = {};
      
      users.forEach((u) => {
        updates[`users/${u.id}/eloRating`] = 1000;
      });

      await update(ref(database), updates);

      toast({
        title: "🔄 ELO reset",
        description: "Tous les joueurs sont à 1000 ELO",
      });

      loadAdminData();
    } catch (error: any) {
      console.error("Erreur reset ELO:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFortuneToAll = async () => {
    if (!confirm("💰 Ajouter 500€ à tous les joueurs ?")) return;

    setIsLoading(true);
    try {
      const updates: { [key: string]: any } = {};
      
      users.forEach((u) => {
        updates[`users/${u.id}/fortune`] = (u.fortune || 0) + 500;
      });

      await update(ref(database), updates);

      toast({
        title: "💰 Fortune distribuée",
        description: "500€ ajoutés à tous les joueurs",
      });

      loadAdminData();
    } catch (error: any) {
      console.error("Erreur ajout fortune:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllMatches = async () => {
    if (!confirm("⚠️ DANGER : Supprimer TOUS les matchs ?\n\nCette action est IRRÉVERSIBLE.")) {
      return;
    }

    setIsLoading(true);
    try {
      const matchesRef = ref(database, 'matches');
      await remove(matchesRef);

      toast({
        title: "🗑️ Matchs supprimés",
        description: "Tous les matchs ont été effacés",
      });

      loadAdminData();
    } catch (error: any) {
      console.error("Erreur suppression matchs:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas les permissions d'administrateur
          </p>
          <Button onClick={() => navigate("/")}>
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/20 p-3">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Panneau d'Administration</h1>
                <p className="text-muted-foreground">Gestion complète de l'application</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              <X className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-2xl font-bold">{appStats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Utilisateurs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="mx-auto mb-2 h-6 w-6 text-green-500" />
              <p className="text-2xl font-bold">{appStats.activeUsers}</p>
              <p className="text-xs text-muted-foreground">Actifs 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
              <p className="text-2xl font-bold">{appStats.totalMatches}</p>
              <p className="text-xs text-muted-foreground">Matchs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="mx-auto mb-2 h-6 w-6 text-purple-500" />
              <p className="text-2xl font-bold">{appStats.totalTournaments}</p>
              <p className="text-xs text-muted-foreground">Tournois</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-2 h-6 w-6 text-blue-500" />
              <p className="text-2xl font-bold">{appStats.totalBets}</p>
              <p className="text-xs text-muted-foreground">Paris</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Coins className="mx-auto mb-2 h-6 w-6 text-green-500" />
              <p className="text-2xl font-bold">{appStats.totalFortune}€</p>
              <p className="text-xs text-muted-foreground">Fortune totale</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="users">👤 Utilisateurs</TabsTrigger>
              <TabsTrigger value="matches">⚽ Matchs</TabsTrigger>
              <TabsTrigger value="stats">📊 Statistiques</TabsTrigger>
              <TabsTrigger value="actions">⚡ Actions</TabsTrigger>
              <TabsTrigger value="logs">📋 Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                <div className="relative flex-1 w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowAddUserDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un utilisateur
                </Button>
              </div>

              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <Card key={u.id} className={u.banned ? "opacity-50 border-destructive border-2" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="rounded-full bg-primary/20 p-3 flex-shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold truncate">{u.username}</p>
                              {u.role === "admin" && (
                                <Badge variant="default">Admin</Badge>
                              )}
                              {u.banned && (
                                <Badge variant="destructive">Banni</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span>⚡ {u.eloRating || 1000} ELO</span>
                              <span>💰 {u.fortune || 0}€</span>
                              <span>🏆 {u.wins || 0}W - {u.losses || 0}L</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowFortuneDialog(true);
                            }}
                            title="Gérer la fortune"
                          >
                            <Coins className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowBadgeDialog(true);
                            }}
                            title="Donner un badge"
                          >
                            <Award className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditUserElo(u.eloRating?.toString() || "1000");
                              setEditUserFortune(u.fortune?.toString() || "0");
                              setEditUserRole(u.role || "player");
                              setShowEditUserDialog(true);
                            }}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {u.banned ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUnbanUser(u.id, u.username)}
                              disabled={u.role === "admin"}
                              title="Débannir"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleBanUser(u.id, u.username)}
                              disabled={u.role === "admin"}
                              title="Bannir"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={u.role === "admin"}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>



            <TabsContent value="matches" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Historique des matchs ({matches.length})</h2>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllMatches}
                  disabled={isLoading || matches.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tout supprimer
                </Button>
              </div>

              <div className="space-y-2">
                {matches.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Aucun match enregistré
                    </CardContent>
                  </Card>
                ) : (
                  matches.slice(0, 50).map((match) => (
                    <Card key={match.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Équipe 1</p>
                                <p className="font-bold">{match.team1Names?.join(" & ") || "?"}</p>
                                <p className="text-2xl font-bold text-primary">{match.score1 || 0}</p>
                              </div>
                              <div className="text-muted-foreground">VS</div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Équipe 2</p>
                                <p className="font-bold">{match.team2Names?.join(" & ") || "?"}</p>
                                <p className="text-2xl font-bold text-primary">{match.score2 || 0}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(match.date || match.timestamp).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMatch(match);
                                setShowMatchDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteMatch(match.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <h2 className="text-xl font-bold">Statistiques détaillées</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Top 5 Joueurs (ELO)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {users
                      .sort((a, b) => (b.eloRating || 1000) - (a.eloRating || 1000))
                      .slice(0, 5)
                      .map((u, index) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{u.username}</span>
                          </div>
                          <span className="font-bold text-primary">{u.eloRating || 1000}</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Coins className="h-5 w-5 text-green-500" />
                      Top 5 Fortunes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {users
                      .sort((a, b) => (b.fortune || 0) - (a.fortune || 0))
                      .slice(0, 5)
                      .map((u, index) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{u.username}</span>
                          </div>
                          <span className="font-bold text-green-500">{u.fortune || 0}€</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Top 5 Victoires
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {users
                      .sort((a, b) => (b.wins || 0) - (a.wins || 0))
                      .slice(0, 5)
                      .map((u, index) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{u.username}</span>
                          </div>
                          <span className="font-bold text-yellow-500">{u.wins || 0}W</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Activité récente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {users
                      .filter(u => u.lastActive)
                      .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
                      .slice(0, 5)
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                          <span className="font-medium">{u.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(u.lastActive).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <h2 className="text-xl font-bold">Actions rapides</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Actions dangereuses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleResetAllELO}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Reset tous les ELO à 1000
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleDeleteAllMatches}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer tous les matchs
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      Actions sécurisées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleAddFortuneToAll}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Ajouter 500€ à tous
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={loadAdminData}
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Recharger les données
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <h2 className="text-xl font-bold">Logs d'activité</h2>
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Système de logs en développement
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* DIALOGS */}
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input 
                type="text" 
                placeholder="Nom d'utilisateur"
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
              />
              <Input 
                type="email" 
                placeholder="Email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Input 
                type="password" 
                placeholder="Mot de passe (min 6 caractères)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="ELO initial (1000)"
                value={newUserElo}
                onChange={(e) => setNewUserElo(e.target.value)}
              />
              <Button className="w-full" onClick={handleAddUser} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Créer l'utilisateur
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">ELO</label>
                <Input
                  type="number"
                  placeholder="ELO"
                  value={editUserElo}
                  onChange={(e) => setEditUserElo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fortune</label>
                <Input
                  type="number"
                  placeholder="Fortune"
                  value={editUserFortune}
                  onChange={(e) => setEditUserFortune(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Rôle</label>
                <Select value={editUserRole} onValueChange={setEditUserRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Joueur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleEditUser} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showFortuneDialog} onOpenChange={setShowFortuneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gérer la fortune de {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Fortune actuelle: <span className="font-bold text-foreground">{selectedUser?.fortune || 0}€</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={fortuneAction === "add" ? "default" : "outline"}
                  onClick={() => setFortuneAction("add")}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
                <Button
                  variant={fortuneAction === "remove" ? "default" : "outline"}
                  onClick={() => setFortuneAction("remove")}
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Retirer
                </Button>
              </div>
              <Input
                type="number"
                placeholder="Montant (€)"
                value={fortuneAmount}
                onChange={(e) => setFortuneAmount(e.target.value)}
                min="1"
              />
              <Button className="w-full" onClick={handleManageFortune} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DollarSign className="mr-2 h-4 w-4" />
                )}
                Confirmer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attribuer un badge à {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {BADGES.map((badge) => (
                  <Button
                    key={badge.id}
                    variant={selectedBadge === badge.id ? "default" : "outline"}
                    onClick={() => setSelectedBadge(badge.id)}
                    className="w-full justify-start"
                  >
                    <span className="text-2xl mr-3">{badge.icon}</span>
                    <div className="text-left">
                      <p className="font-bold">{badge.name}</p>
                    </div>
                  </Button>
                ))}
              </div>
              <Button 
                className="w-full" 
                onClick={handleGiveBadge} 
                disabled={isLoading || !selectedBadge}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                Donner le badge
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails du match</DialogTitle>
            </DialogHeader>
            {selectedMatch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Équipe 1</p>
                    <p className="font-bold mb-2">{selectedMatch.team1Names?.join(" & ") || "?"}</p>
                    <p className="text-3xl font-bold text-primary">{selectedMatch.score1 || 0}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary/10">
                    <p className="text-sm text-muted-foreground mb-1">Équipe 2</p>
                    <p className="font-bold mb-2">{selectedMatch.team2Names?.join(" & ") || "?"}</p>
                    <p className="text-3xl font-bold text-secondary">{selectedMatch.score2 || 0}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-surface-alt">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedMatch.date || selectedMatch.timestamp).toLocaleString('fr-FR')}
                  </p>
                </div>
                {selectedMatch.eloChanges && (
                  <div className="p-4 rounded-lg bg-surface-alt">
                    <p className="text-sm text-muted-foreground mb-2">Changements ELO</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedMatch.eloChanges).map(([player, change]: [string, any]) => (
                        <div key={player} className="flex justify-between">
                          <span>{player}</span>
                          <span className={change > 0 ? "text-green-500" : "text-red-500"}>
                            {change > 0 ? "+" : ""}{change}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPanel;

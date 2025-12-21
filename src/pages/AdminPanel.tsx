import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Shield, Users, Trophy, Coins, Settings, TrendingUp, 
  Loader2, AlertTriangle, Check, X, Plus, Trash2,
  UserPlus, DollarSign, Award, Zap, Clock, Target, Edit,
  BarChart3, Activity, Ban, Gift, Calendar, Eye, Search,
  MessageSquare, Send, Megaphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AntiCheatTab } from "@/components/admin/AntiCheatTab";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get, update, remove, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { sendAdminInfo } from "@/lib/firebaseChat";

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
  const [showInfoMessageDialog, setShowInfoMessageDialog] = useState(false);
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
  const [infoMessage, setInfoMessage] = useState("");
  const [isSendingInfo, setIsSendingInfo] = useState(false);

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

  const handleSendInfoMessage = async () => {
    if (!user || !userProfile || !infoMessage.trim()) {
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    if (userProfile.role !== "admin") {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent envoyer des messages d'info",
        variant: "destructive",
      });
      return;
    }

    setIsSendingInfo(true);
    try {
      await sendAdminInfo(user.uid, userProfile.username, infoMessage, userProfile.role);
      
      toast({
        title: "📢 Message envoyé",
        description: "Le message d'information a été diffusé à tous les joueurs",
      });

      setInfoMessage("");
      setShowInfoMessageDialog(false);
    } catch (error: any) {
      console.error("Erreur envoi message info:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSendingInfo(false);
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
      <div className="container mx-auto p-3 sm:p-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/20 p-2 sm:p-3">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Admin Panel</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Gestion complète</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                onClick={() => setShowInfoMessageDialog(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Megaphone className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Message Info</span>
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} size="sm">
                <X className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Retour</span>
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3"
        >
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <Users className="mx-auto mb-1 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <p className="text-base sm:text-lg md:text-xl font-bold">{appStats.totalUsers}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <Activity className="mx-auto mb-1 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <p className="text-base sm:text-lg md:text-xl font-bold">{appStats.activeUsers}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Actifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <Trophy className="mx-auto mb-1 h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              <p className="text-base sm:text-lg md:text-xl font-bold">{appStats.totalMatches}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Matchs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <Award className="mx-auto mb-1 h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              <p className="text-base sm:text-lg md:text-xl font-bold">{appStats.totalTournaments}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Tournois</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <Target className="mx-auto mb-1 h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              <p className="text-base sm:text-lg md:text-xl font-bold">{appStats.totalBets}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Paris</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:p-3 text-center">
              <Coins className="mx-auto mb-1 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <p className="text-base sm:text-lg md:text-xl font-bold">{appStats.totalFortune}€</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="users" className="space-y-3 sm:space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 gap-1 h-auto p-1">
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2 py-1.5">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="anticheat" className="text-xs sm:text-sm px-2 py-1.5">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Anti-Cheat</span>
            </TabsTrigger>
                  <TabsTrigger value="matches" className="text-xs sm:text-sm px-2 py-1.5">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Matchs</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs sm:text-sm px-2 py-1.5">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="actions" className="text-xs sm:text-sm px-2 py-1.5 hidden lg:flex">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Actions</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs sm:text-sm px-2 py-1.5 hidden lg:flex">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
                <Button onClick={() => setShowAddUserDialog(true)} size="sm" className="text-xs sm:text-sm h-8 sm:h-10 shrink-0">
                  <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Ajouter</span>
                </Button>
              </div>

              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <Card key={u.id} className={u.banned ? "opacity-50 border-destructive border-2" : ""}>
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="rounded-full bg-primary/20 p-1.5 sm:p-2 shrink-0">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              <p className="font-bold text-xs sm:text-sm truncate">{u.username}</p>
                              {u.role === "admin" && (
                                <Badge variant="default" className="text-[10px] px-1 py-0">Admin</Badge>
                              )}
                              {u.banned && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">Banni</Badge>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{u.email}</p>
                            <div className="flex gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                              <span>⚡{u.eloRating || 1000}</span>
                              <span>💰{u.fortune || 0}€</span>
                              <span>🏆{u.wins || 0}W-{u.losses || 0}L</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowFortuneDialog(true);
                            }}
                            className="h-7 w-7 p-0"
                            title="Fortune"
                          >
                            <Coins className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowBadgeDialog(true);
                            }}
                            className="h-7 w-7 p-0"
                            title="Badge"
                          >
                            <Award className="h-3 w-3" />
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
                            className="h-7 w-7 p-0"
                            title="Modifier"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {u.banned ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUnbanUser(u.id, u.username)}
                              disabled={u.role === "admin"}
                              className="bg-green-600 hover:bg-green-700 h-7 w-7 p-0"
                              title="Débannir"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleBanUser(u.id, u.username)}
                              disabled={u.role === "admin"}
                              className="h-7 w-7 p-0"
                              title="Bannir"
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={u.role === "admin"}
                            className="h-7 w-7 p-0"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
<TabsContent value="matches" className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold">Matchs ({matches.length})</h2>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllMatches}
                  disabled={isLoading || matches.length === 0}
                  size="sm"
                  className="text-xs"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Supprimer
                </Button>
              </div>

              <div className="space-y-2">
                {matches.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-xs sm:text-sm text-muted-foreground">
                      Aucun match
                    </CardContent>
                  </Card>
                ) : (
                  matches.slice(0, 50).map((match) => (
                    <Card key={match.id}>
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                            <div className="text-center flex-1">
                              <p className="text-[10px] text-muted-foreground">Équipe 1</p>
                              <p className="font-bold text-xs truncate">{match.team1Names?.join(" & ") || "?"}</p>
                              <p className="text-lg sm:text-xl font-bold text-primary">{match.score1 || 0}</p>
                            </div>
                            <div className="text-muted-foreground text-xs">VS</div>
                            <div className="text-center flex-1">
                              <p className="text-[10px] text-muted-foreground">Équipe 2</p>
                              <p className="font-bold text-xs truncate">{match.team2Names?.join(" & ") || "?"}</p>
                              <p className="text-lg sm:text-xl font-bold text-primary">{match.score2 || 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {new Date(match.date || match.timestamp).toLocaleString('fr-FR', { 
                                day: '2-digit', 
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedMatch(match);
                                  setShowMatchDialog(true);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteMatch(match.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="anticheat" className="space-y-3">
  <AntiCheatTab />
</TabsContent>

            <TabsContent value="stats" className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold">Statistiques</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Top 5 ELO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {users
                      .sort((a, b) => (b.eloRating || 1000) - (a.eloRating || 1000))
                      .slice(0, 5)
                      .map((u, index) => (
                        <div key={u.id} className="flex items-center justify-between p-1.5 rounded bg-muted text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1">#{index + 1}</Badge>
                            <span className="font-medium truncate">{u.username}</span>
                          </div>
                          <span className="font-bold text-primary">{u.eloRating || 1000}</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Coins className="h-4 w-4 text-green-500" />
                      Top 5 Fortune
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {users
                      .sort((a, b) => (b.fortune || 0) - (a.fortune || 0))
                      .slice(0, 5)
                      .map((u, index) => (
                        <div key={u.id} className="flex items-center justify-between p-1.5 rounded bg-muted text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1">#{index + 1}</Badge>
                            <span className="font-medium truncate">{u.username}</span>
                          </div>
                          <span className="font-bold text-green-500">{u.fortune || 0}€</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold">Actions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Dangereuses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="destructive"
                      className="w-full text-xs h-8"
                      onClick={handleResetAllELO}
                    >
                      <TrendingUp className="mr-2 h-3 w-3" />
                      Reset ELO
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full text-xs h-8"
                      onClick={handleDeleteAllMatches}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Supprimer matchs
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Sécurisées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-xs h-8"
                      onClick={handleAddFortuneToAll}
                    >
                      <DollarSign className="mr-2 h-3 w-3" />
                      +500€ à tous
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-xs h-8"
                      onClick={loadAdminData}
                    >
                      <Award className="mr-2 h-3 w-3" />
                      Recharger
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-3">
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Logs en développement
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* DIALOG - Message d'Information */}
        <Dialog open={showInfoMessageDialog} onOpenChange={setShowInfoMessageDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" />
                Envoyer un message d'information
              </DialogTitle>
              <DialogDescription>
                Ce message sera diffusé à tous les joueurs dans le canal "📢 Informations Admin"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Conseils d'utilisation :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Utilisez pour les annonces importantes</li>
                      <li>Maintenances, événements, mises à jour</li>
                      <li>Tous les joueurs recevront la notification</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Écrivez votre message d'information ici...&#10;&#10;Exemple :&#10;🎉 Nouveau tournoi ce week-end !&#10;Inscriptions ouvertes dès maintenant."
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  className="min-h-[150px] text-sm"
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    Maximum 500 caractères
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {infoMessage.length}/500
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInfoMessageDialog(false);
                    setInfoMessage("");
                  }}
                  className="flex-1"
                  disabled={isSendingInfo}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSendInfoMessage}
                  disabled={isSendingInfo || !infoMessage.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingInfo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOGS - Autres */}
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Ajouter utilisateur</DialogTitle>
              <DialogDescription>Créez un nouveau compte utilisateur.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input 
                type="text" 
                placeholder="Nom d'utilisateur"
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
              <Input 
                type="email" 
                placeholder="Email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
              <Input 
                type="password" 
                placeholder="Mot de passe"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
              <Input 
                type="number" 
                placeholder="ELO (1000)"
                value={newUserElo}
                onChange={(e) => setNewUserElo(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
              <Button className="w-full text-xs sm:text-sm h-8 sm:h-10" onClick={handleAddUser} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                )}
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Modifier {selectedUser?.username}</DialogTitle>
              <DialogDescription>Modifiez les informations de cet utilisateur.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">ELO</label>
                <Input
                  type="number"
                  value={editUserElo}
                  onChange={(e) => setEditUserElo(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Fortune</label>
                <Input
                  type="number"
                  value={editUserFortune}
                  onChange={(e) => setEditUserFortune(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Rôle</label>
                <Select value={editUserRole} onValueChange={setEditUserRole}>
                  <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player" className="text-xs sm:text-sm">Joueur</SelectItem>
                    <SelectItem value="admin" className="text-xs sm:text-sm">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full text-xs sm:text-sm h-8 sm:h-10" onClick={handleEditUser} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Check className="mr-2 h-3 w-3" />}
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showFortuneDialog} onOpenChange={setShowFortuneDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Fortune - {selectedUser?.username}</DialogTitle>
              <DialogDescription>Gérez la fortune de cet utilisateur.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Actuelle: <span className="font-bold text-foreground">{selectedUser?.fortune || 0}€</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={fortuneAction === "add" ? "default" : "outline"}
                  onClick={() => setFortuneAction("add")}
                  size="sm"
                  className="text-xs h-8"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Ajouter
                </Button>
                <Button
                  variant={fortuneAction === "remove" ? "default" : "outline"}
                  onClick={() => setFortuneAction("remove")}
                  size="sm"
                  className="text-xs h-8"
                >
                  <X className="mr-1 h-3 w-3" />
                  Retirer
                </Button>
              </div>
              <Input
                type="number"
                placeholder="Montant"
                value={fortuneAmount}
                onChange={(e) => setFortuneAmount(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
              <Button className="w-full text-xs sm:text-sm h-8 sm:h-10" onClick={handleManageFortune} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <DollarSign className="mr-2 h-3 w-3" />}
                Confirmer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Badge - {selectedUser?.username}</DialogTitle>
              <DialogDescription>Ajoutez ou retirez des badges à cet utilisateur.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {BADGES.map((badge) => (
                  <Button
                    key={badge.id}
                    variant={selectedBadge === badge.id ? "default" : "outline"}
                    onClick={() => setSelectedBadge(badge.id)}
                    className="justify-start text-xs sm:text-sm h-auto py-2"
                  >
                    <span className="text-xl mr-2">{badge.icon}</span>
                    <span className="font-bold">{badge.name}</span>
                  </Button>
                ))}
              </div>
              <Button 
                className="w-full text-xs sm:text-sm h-8 sm:h-10" 
                onClick={handleGiveBadge} 
                disabled={isLoading || !selectedBadge}
              >
                {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Gift className="mr-2 h-3 w-3" />}
                Donner
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base">Détails du match</DialogTitle>
              <DialogDescription>Consultez les détails complets de ce match.</DialogDescription>
            </DialogHeader>
            {selectedMatch && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-primary/10">
                    <p className="text-[10px] text-muted-foreground mb-1">Équipe 1</p>
                    <p className="font-bold text-xs mb-1 truncate">{selectedMatch.team1Names?.join(" & ") || "?"}</p>
                    <p className="text-2xl font-bold text-primary">{selectedMatch.score1 || 0}</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-secondary/10">
                    <p className="text-[10px] text-muted-foreground mb-1">Équipe 2</p>
                    <p className="font-bold text-xs mb-1 truncate">{selectedMatch.team2Names?.join(" & ") || "?"}</p>
                    <p className="text-2xl font-bold text-secondary">{selectedMatch.score2 || 0}</p>
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-muted">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-xs sm:text-sm">
                    {new Date(selectedMatch.date || selectedMatch.timestamp).toLocaleString('fr-FR')}
                  </p>
                </div>
                {selectedMatch.eloChanges && (
                  <div className="p-2 sm:p-3 rounded-lg bg-muted">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Changements ELO</p>
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedMatch.eloChanges).map(([player, change]: [string, any]) => (
                        <div key={player} className="flex justify-between">
                          <span className="truncate">{player}</span>
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

// 📁 src/components/NotificationCenter.tsx
// Centre de notifications avec UI complète

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationPayload,
} from "@/lib/firebaseNotifications";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

interface Notification extends NotificationPayload {
  id: string;
  read: boolean;
  createdAt: number;
}

const getNotificationIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    friend_request: "👥",
    friend_accepted: "✅",
    match_invite: "⚽",
    match_started: "🎮",
    match_completed: "🏆",
    bet_won: "💰",
    bet_lost: "😢",
    tournament_starting: "🏆",
    tournament_completed: "🏅",
    club_invitation: "🏛️",
    fortune_received: "💵",
    badge_earned: "🏅",
    new_message: "💬",
    offer_received: "💼",
    offer_accepted: "✅",
    offer_rejected: "❌",
    admin_announcement: "📢",
  };
  return icons[type] || "🔔";
};

const getNotificationColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    friend_request: "border-blue-500/50 bg-blue-500/5",
    friend_accepted: "border-green-500/50 bg-green-500/5",
    match_completed: "border-primary/50 bg-primary/5",
    bet_won: "border-green-500/50 bg-green-500/5",
    bet_lost: "border-red-500/50 bg-red-500/5",
    tournament_starting: "border-yellow-500/50 bg-yellow-500/5",
    fortune_received: "border-green-500/50 bg-green-500/5",
    badge_earned: "border-purple-500/50 bg-purple-500/5",
    new_message: "border-blue-500/50 bg-blue-500/5",
    offer_received: "border-orange-500/50 bg-orange-500/5",
    admin_announcement: "border-red-500/50 bg-red-500/5",
  };
  return colors[type] || "border-muted bg-muted/5";
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
};

export const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les notifications
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const notifs = await getUserNotifications(user.uid, 50);
        setNotifications(notifs as Notification[]);
        
        // Compter les non lues
        const unread = notifs.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Erreur chargement notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Écouter les changements en temps réel
    const unreadRef = ref(database, `users/${user.uid}/unreadNotifications`);
    const unsubscribe = onValue(unreadRef, (snapshot) => {
      if (snapshot.exists()) {
        setUnreadCount(snapshot.val());
        loadNotifications(); // Recharger les notifications
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user) return;

    // Marquer comme lue
    if (!notification.read) {
      await markNotificationAsRead(user.uid, notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Naviguer vers l'action
    if (notification.actionUrl) {
      setIsOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    await markAllNotificationsAsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <>
      {/* Bouton cloche */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </Button>

      {/* Dialog notifications */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="default" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </DialogTitle>
              {notifications.length > 0 && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Tout lire
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="h-[calc(80vh-80px)]">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    Aucune notification
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      layout
                    >
                      <Card
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${
                          !notification.read
                            ? `border-2 ${getNotificationColor(notification.type)}`
                            : "opacity-60"
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl flex-shrink-0">
                              {notification.icon || getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-sm">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {notification.body}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                                {notification.priority === "high" && (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                    Important
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

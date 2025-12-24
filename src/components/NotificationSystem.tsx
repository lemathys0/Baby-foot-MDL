import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { ref, update, onValue, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { Bell, Check, X, MessageSquare, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from '@/utils/logger';

export interface Notification {
  id: string;
  userId: string;
  type: "offer_received" | "offer_accepted" | "offer_rejected" | "offer_countered" | "listing_sold";
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: number;
}

export const NotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const previousUnreadCountRef = useRef(0);

  // 📱 Demander la permission pour les notifications
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // 📳 Fonction de vibration
  const vibrate = (pattern: number | number[] = 200) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // 🔔 Envoyer notification système avec son et vibration
  const sendSystemNotification = (notif: Notification) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new window.Notification(notif.title, {
        body: notif.message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: notif.id,
        requireInteraction: false,
        silent: false,
      });

      vibrate([100, 50, 100]);
      setTimeout(() => notification.close(), 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (notif.relatedId) {
          logger.log("Navigation vers:", notif.relatedId);
        }
      };
    }
  };

  // 🔥 Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    if (!user) return;

    const notifRef = ref(database, `notifications/${user.uid}`);
    
    const unsubscribe = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifArray: Notification[] = Object.entries(data)
          .map(([id, value]: [string, any]) => {
            // ✅ Vérification de sécurité
            if (!value || typeof value !== 'object') return null;
            
            return {
              id,
              ...value,
            } as Notification;
          })
          .filter((notif): notif is Notification => notif !== null); // ✅ Filtrer les null
        
        // Trier par date décroissante
        notifArray.sort((a, b) => b.createdAt - a.createdAt);
        
        // 🔔 Détecter les NOUVELLES notifications non lues
        const currentUnreadCount = notifArray.filter(n => !n.read).length;
        const hasNewNotification = currentUnreadCount > previousUnreadCountRef.current;
        
        if (hasNewNotification) {
          const newestNotif = notifArray
            .filter(n => !n.read)
            .sort((a, b) => b.createdAt - a.createdAt)[0];
          
          if (newestNotif && (Date.now() - newestNotif.createdAt < 10000)) {
            sendSystemNotification(newestNotif);
          }
        }
        
        previousUnreadCountRef.current = currentUnreadCount;
        setNotifications(notifArray);
      } else {
        setNotifications([]);
        previousUnreadCountRef.current = 0;
      }
    });

    return () => {
      off(notifRef);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await update(ref(database), {
        [`notifications/${user.uid}/${notificationId}/read`]: true,
      });
    } catch (error) {
      logger.error("Erreur marquage notification:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const updates: Record<string, boolean> = {};
      notifications.forEach((notif) => {
        if (!notif.read) {
          updates[`notifications/${user.uid}/${notif.id}/read`] = true;
        }
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    } catch (error) {
      logger.error("Erreur marquage toutes notifications:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      await update(ref(database), {
        [`notifications/${user.uid}/${notificationId}`]: null,
      });
    } catch (error) {
      logger.error("Erreur suppression notification:", error);
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "offer_received":
      case "offer_countered":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "offer_accepted":
        return <Check className="h-4 w-4 text-green-500" />;
      case "offer_rejected":
        return <X className="h-4 w-4 text-red-500" />;
      case "listing_sold":
        return <DollarSign className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                // ✅ Vérification de sécurité supplémentaire
                if (!notif || !notif.type) {
                  logger.warn('Notification invalide détectée:', notif);
                  return null;
                }

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notif.read ? "bg-blue-500/5" : ""
                    }`}
                    onClick={() => {
                      if (!notif.read) {
                        markAsRead(notif.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcon(notif.type)}</div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground leading-tight">
                          {notif.message}
                        </p>
                        
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(notif.createdAt)}
                          </span>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export async function createNotification(
  userId: string,
  type: Notification["type"],
  title: string,
  message: string,
  relatedId?: string
): Promise<void> {
  try {
    const newNotifKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification: Omit<Notification, "id"> = {
      userId,
      type,
      title,
      message,
      relatedId: relatedId || "",
      read: false,
      createdAt: Date.now(),
    };
    
    await update(ref(database), {
      [`notifications/${userId}/${newNotifKey}`]: notification,
    });
  } catch (error) {
    logger.error("Erreur création notification:", error);
  }
}

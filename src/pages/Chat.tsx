import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Users, Plus, Search, X, Trash2, UserPlus, ArrowLeft, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notifyNewMessage } from "@/lib/firebaseNotifications";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserChats,
  getChatMessages,
  onChatMessages,
  onUserChats,
  sendMessage,
  createOrGetPrivateChat,
  createGroupChat,
  addMemberToGroup,
  removeMemberFromGroup,
  deleteGroupChat,
  searchUsers,
  createAdminChat,
  createAdminInfoChannel,
  toReadableChat,
  toReadableMessage,
  type Chat,
  type ChatMessage,
} from "@/lib/firebaseChat";
import { Loader2 } from "lucide-react";

const ChatComponent = () => {
  const { user, userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<Array<{ id: string; username: string }>>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    if (userProfile?.role === "admin") {
      createAdminChat(user.uid).catch(console.error);
      createAdminInfoChannel(user.uid).catch(console.error);
    }

    loadChats();

    const unsubscribe = onUserChats(user.uid, (updatedChats) => {
      setChats(updatedChats);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  useEffect(() => {
    if (!selectedChat || !user) return;

    loadMessages();

    const unsubscribe = onChatMessages(selectedChat.id, (updatedMessages) => {
      setMessages(updatedMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChats = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userChats = await getUserChats(user.uid, userProfile?.role);
      setChats(userChats);
      if (userChats.length > 0 && !selectedChat) {
        setSelectedChat(userChats[0]);
      }
    } catch (error) {
      console.error("Erreur chargement chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;
    try {
      const chatMessages = await getChatMessages(selectedChat.id);
      setMessages(chatMessages);
    } catch (error) {
      console.error("Erreur chargement messages:", error);
    }
  };

  // ✅ CORRIGÉ: handleSendMessage avec notifications intégrées
  const handleSendMessage = async () => {
    if (!selectedChat || !user || !userProfile || !messageText.trim()) return;

    // Vérifier si c'est le canal info admin et si l'utilisateur est admin
    if (selectedChat.id === "admin_info" && userProfile.role !== "admin") {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent envoyer des messages ici",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // 1. Envoyer le message
      await sendMessage(selectedChat.id, user.uid, userProfile.username, messageText);
      
      // 2. ✅ Notifier tous les membres du chat (sauf l'expéditeur)
      const chatMembers = Array.isArray(selectedChat.m) ? selectedChat.m : [];
      const notificationPromises = chatMembers
        .filter(memberId => memberId !== user.uid)
        .map(memberId => 
          notifyNewMessage(
            memberId,
            userProfile.username,
            messageText.substring(0, 50) + (messageText.length > 50 ? "..." : ""),
            selectedChat.id
          ).catch(error => {
            console.error(`❌ Erreur notification pour ${memberId}:`, error);
          })
        );
      
      // Envoyer toutes les notifications en parallèle (sans bloquer l'UI)
      await Promise.allSettled(notificationPromises);
      
      // 3. Réinitialiser le champ de texte
      setMessageText("");
      
      console.log(`✅ Message envoyé avec ${notificationPromises.length} notification(s)`);
    } catch (error: any) {
      console.error("❌ Erreur envoi message:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!user || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchUsers(query, user.uid);
      setSearchResults(results);
    } catch (error) {
      console.error("Erreur recherche:", error);
    }
  };

  const handleCreatePrivateChat = async (userId: string, username: string) => {
    if (!user || !userProfile) return;

    try {
      const chatId = await createOrGetPrivateChat(user.uid, userId, userProfile.username, username);
      await loadChats();
      
      const newChat = chats.find(c => c.id === chatId) || await getUserChats(user.uid).then(chats => chats.find(c => c.id === chatId));
      if (newChat) {
        setSelectedChat(newChat);
        setShowMobileChat(true);
      }
      
      setSearchQuery("");
      setSearchResults([]);
      toast({
        title: "Chat créé",
        description: `Chat avec ${username} créé`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le chat",
        variant: "destructive",
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !userProfile || !groupName.trim() || selectedMembers.length === 0) {
      toast({
        title: "Erreur",
        description: "Nom du groupe et au moins un membre requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const memberIds = selectedMembers.map(m => m.id);
      const memberNames = selectedMembers.reduce((acc, m) => {
        acc[m.id] = m.username;
        return acc;
      }, {} as { [userId: string]: string });

      const chatId = await createGroupChat(user.uid, userProfile.username, groupName, memberIds, memberNames);
      await loadChats();
      
      const newChat = chats.find(c => c.id === chatId) || await getUserChats(user.uid).then(chats => chats.find(c => c.id === chatId));
      if (newChat) {
        setSelectedChat(newChat);
        setShowMobileChat(true);
      }
      
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      toast({
        title: "Groupe créé",
        description: `Groupe "${groupName}" créé`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le groupe",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async (userId: string, username: string) => {
    if (!selectedChat || !user) return;

    try {
      await addMemberToGroup(selectedChat.id, userId, username, user.uid);
      await loadChats();
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      toast({
        title: "Membre ajouté",
        description: `${username} a été ajouté au groupe`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le membre",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedChat || !user) return;

    try {
      await removeMemberFromGroup(selectedChat.id, userId, user.uid);
      await loadChats();
      toast({
        title: "Membre retiré",
        description: "Le membre a été retiré du groupe",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le membre",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedChat || !user || !userProfile) return;

    const chatName = getChatDisplayName(selectedChat);
    if (!confirm(`⚠️ Supprimer le groupe "${chatName}" ?`)) return;

    try {
      await deleteGroupChat(selectedChat.id, user.uid, userProfile.role);
      await loadChats();
      setSelectedChat(null);
      setShowMobileChat(false);
      toast({
        title: "Groupe supprimé",
        description: "Le groupe a été supprimé",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le groupe",
        variant: "destructive",
      });
    }
  };

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.t === "admin_info") return "📢 Infos Admin";
    if (chat.t === "group") return chat.n || "Groupe sans nom";
    if (chat.mn && user) {
      const members = Array.isArray(chat.m) ? chat.m : [];
      const otherUserId = members.find(id => id !== user.uid);
      return otherUserId ? (chat.mn[otherUserId] || "Utilisateur") : "Chat privé";
    }
    return "Chat privé";
  };

  const getChatIcon = (chat: Chat) => {
    if (chat.id === "admin_info") return <Info className="h-3 w-3 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />;
    if (chat.t === "group") return <Users className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />;
    return <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />;
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Hier";
    } else if (days < 7) {
      return date.toLocaleDateString("fr-FR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  const isAdminInfoChannel = selectedChat?.id === "admin_info";
  const isReadOnly = isAdminInfoChannel && userProfile?.role !== "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-2 md:gap-4">
      {/* Liste des chats */}
      <Card className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0 flex-col`}>
        <CardHeader className="border-b p-3 md:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Messages
            </CardTitle>
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" title="Créer un groupe">
                  <Users className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] md:max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer un groupe</DialogTitle>
                  <DialogDescription>Créez un nouveau groupe de discussion.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Nom du groupe"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <div>
                    <Input
                      placeholder="Rechercher des membres..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearchUsers(e.target.value);
                      }}
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-surface-alt cursor-pointer"
                            onClick={() => {
                              if (!selectedMembers.find(m => m.id === user.id)) {
                                setSelectedMembers([...selectedMembers, user]);
                              }
                            }}
                          >
                            <span className="text-sm">{user.username}</span>
                            {selectedMembers.find(m => m.id === user.id) && (
                              <span className="text-xs text-primary">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Membres sélectionnés:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-xs"
                          >
                            {member.username}
                            <button
                              onClick={() => setSelectedMembers(selectedMembers.filter(m => m.id !== member.id))}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={handleCreateGroup} className="w-full" disabled={!groupName.trim() || selectedMembers.length === 0}>
                    Créer le groupe
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                className="pl-8 text-sm"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 md:max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-surface-alt cursor-pointer"
                    onClick={() => handleCreatePrivateChat(user.id, user.username)}
                  >
                    <span className="text-xs md:text-sm">{user.username}</span>
                    <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-xs md:text-sm">
                Aucun chat. Recherchez un utilisateur ou créez un groupe !
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`p-2 md:p-3 cursor-pointer hover:bg-surface-alt transition ${
                    selectedChat?.id === chat.id ? "bg-primary/10 border-l-2 border-primary" : ""
                  } ${chat.id === "admin_info" ? "bg-blue-500/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getChatIcon(chat)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs md:text-sm truncate">{getChatDisplayName(chat)}</p>
                        {chat.lm && (
                          <p className="text-xs text-muted-foreground truncate">
                            {chat.lm.un}: {chat.lm.tx}
                          </p>
                        )}
                      </div>
                    </div>
                    {chat.lm && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatTime(chat.lm.ts)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zone de chat */}
      {selectedChat ? (
        <Card className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          <CardHeader className="border-b p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden -ml-2"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg min-w-0">
                  {getChatIcon(selectedChat)}
                  <span className="truncate">{getChatDisplayName(selectedChat)}</span>
                  {selectedChat.t === "group" && selectedChat.m && (
                    <span className="text-xs md:text-sm text-muted-foreground font-normal flex-shrink-0">
                      ({selectedChat.m.length})
                    </span>
                  )}
                </CardTitle>
              </div>
              {selectedChat.t === "group" && !selectedChat.ac && (
                <div className="flex gap-1 md:gap-2">
                  <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[90vw] md:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Ajouter un membre</DialogTitle>
                        <DialogDescription>Recherchez et ajoutez un joueur au groupe.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <Input
                          placeholder="Rechercher un utilisateur..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearchUsers(e.target.value);
                          }}
                        />
                        {searchResults.length > 0 && (
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {searchResults
                              .filter(u => !selectedChat.m.includes(u.id))
                              .map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 rounded hover:bg-surface-alt cursor-pointer"
                                  onClick={() => handleAddMember(user.id, user.username)}
                                >
                                  <span className="text-sm">{user.username}</span>
                                  <Button size="sm" variant="ghost">
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  {selectedChat.cb === user?.uid && (
                    <Button size="sm" variant="destructive" onClick={handleDeleteGroup}>
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {isAdminInfoChannel && (
              <div className="mt-2 p-2 rounded-lg bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">
                📢 Canal d'informations officiel - {userProfile?.role === "admin" ? "Vous pouvez envoyer des messages" : "Lecture seule"}
              </div>
            )}
            {selectedChat.t === "group" && selectedChat.mn && !isAdminInfoChannel && (
              <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
                {selectedChat.m.slice(0, 5).map((memberId) => {
                  const memberName = selectedChat.mn?.[memberId] || "Utilisateur";
                  return (
                    <div
                      key={memberId}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-alt text-xs"
                    >
                      {memberName}
                      {!selectedChat.ac && memberId !== user?.uid && selectedChat.cb === user?.uid && (
                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          className="ml-1 text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {selectedChat.m.length > 5 && (
                  <div className="px-2 py-0.5 rounded bg-surface-alt text-xs">
                    +{selectedChat.m.length - 5}
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  {isAdminInfoChannel 
                    ? "Aucune annonce pour le moment" 
                    : "Aucun message. Commencez la conversation !"}
                </div>
              ) : (
                messages.map((message) => {
                  const readableMsg = toReadableMessage(message);
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${readableMsg.userId === user?.uid ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${
                          readableMsg.userId === user?.uid
                            ? "bg-primary text-primary-foreground"
                            : isAdminInfoChannel 
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-surface-alt"
                        }`}
                      >
                        {readableMsg.userId !== user?.uid && (
                          <p className="text-xs font-medium mb-1 opacity-70">{readableMsg.username}</p>
                        )}
                        <p className="text-xs md:text-sm break-words whitespace-pre-wrap">{readableMsg.text}</p>
                        <p className={`text-xs mt-1 ${readableMsg.userId === user?.uid ? "opacity-70" : "text-muted-foreground"}`}>
                          {formatTime(readableMsg.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            {!isReadOnly && (
              <div className="border-t p-2 md:p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={isAdminInfoChannel ? "Message d'information..." : "Tapez un message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSending}
                    className="text-sm"
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()} size="sm">
                    {isSending ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="hidden md:flex flex-1 items-center justify-center">
          <CardContent className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Sélectionnez un chat ou créez-en un nouveau</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChatComponent;

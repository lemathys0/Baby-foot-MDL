// 💬 src/lib/firebaseChat.ts
// Système de chat privé et groupes - VERSION OPTIMISÉE

import { ref, get, set, push, update, onValue, off, remove, query, orderByChild, limitToLast } from "firebase/database";
import { database } from "./firebase";

// ============================
// 📋 TYPES
// ============================

export type ChatType = "private" | "group" | "admin_info";

export interface Chat {
  id: string;
  t: ChatType; // type (raccourci)
  n?: string; // name
  m: string[]; // members
  mn?: { [userId: string]: string }; // memberNames
  ca: number; // createdAt
  cb: string; // createdBy
  ac?: boolean; // isAdminChat
  lm?: { // lastMessage
    tx: string; // text
    ts: number; // timestamp
    ui: string; // userId
    un: string; // username
  };
}

export interface ChatMessage {
  id: string;
  ui: string; // userId
  un: string; // username
  tx: string; // text
  ts: number; // timestamp
}

// Helpers pour convertir entre format optimisé et format lisible
export function toReadableChat(chat: Chat): any {
  return {
    id: chat.id,
    type: chat.t,
    name: chat.n,
    members: chat.m,
    memberNames: chat.mn,
    createdAt: chat.ca,
    createdBy: chat.cb,
    isAdminChat: chat.ac,
    lastMessage: chat.lm ? {
      text: chat.lm.tx,
      timestamp: chat.lm.ts,
      userId: chat.lm.ui,
      username: chat.lm.un
    } : undefined
  };
}

export function toReadableMessage(msg: ChatMessage): any {
  return {
    id: msg.id,
    userId: msg.ui,
    username: msg.un,
    text: msg.tx,
    timestamp: msg.ts
  };
}

// ============================
// 🔧 FONCTIONS UTILITAIRES
// ============================

function createPrivateChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}

/**
 * Créer le chat admin par défaut (non supprimable)
 */
export async function createAdminChat(adminUserId: string): Promise<void> {
  try {
    const adminChatRef = ref(database, "chats/admin_chat");
    const snapshot = await get(adminChatRef);
    
    if (snapshot.exists()) return;

    const adminChat: Chat = {
      id: "admin_chat",
      t: "group",
      n: "💬 Chat Administrateur",
      m: [adminUserId],
      mn: {},
      ca: Date.now(),
      cb: adminUserId,
      ac: true,
    };

    await set(adminChatRef, adminChat);
    await set(ref(database, `userChats/${adminUserId}/admin_chat`), true);
    console.log("✅ Chat admin créé");
  } catch (error) {
    console.error("Erreur création chat admin:", error);
    throw error;
  }
}

/**
 * Créer la section info admin (lecture seule pour les joueurs)
 */
export async function createAdminInfoChannel(adminUserId: string): Promise<void> {
  try {
    const infoChannelRef = ref(database, "chats/admin_info");
    const snapshot = await get(infoChannelRef);
    
    if (snapshot.exists()) {
      console.log("✅ Canal info admin existe déjà");
      return;
    }

    const infoChannel: Chat = {
      id: "admin_info",
      t: "admin_info",
      n: "📢 Informations Admin",
      m: [], // Tous les joueurs y ont accès automatiquement
      mn: {},
      ca: Date.now(),
      cb: adminUserId,
      ac: true,
    };

    await set(infoChannelRef, infoChannel);
    console.log("✅ Canal info admin créé");
  } catch (error) {
    console.error("Erreur création canal info:", error);
    throw error;
  }
}

// ============================
// 💬 CRÉER DES CHATS
// ============================

export async function createOrGetPrivateChat(
  userId1: string,
  userId2: string,
  username1: string,
  username2: string
): Promise<string> {
  try {
    const chatId = createPrivateChatId(userId1, userId2);
    const chatRef = ref(database, `chats/${chatId}`);
    const snapshot = await get(chatRef);

    if (snapshot.exists()) return chatId;

    const chat: Chat = {
      id: chatId,
      t: "private",
      m: [userId1, userId2],
      mn: {
        [userId1]: username1,
        [userId2]: username2,
      },
      ca: Date.now(),
      cb: userId1,
    };

    // Utiliser set au lieu d'update pour créer le chat en une seule opération
    await set(chatRef, chat);
    
    // Puis ajouter les index utilisateurs
    await Promise.all([
      set(ref(database, `userChats/${userId1}/${chatId}`), true),
      set(ref(database, `userChats/${userId2}/${chatId}`), true)
    ]);

    return chatId;
  } catch (error) {
    console.error("Erreur création chat privé:", error);
    throw error;
  }
}

export async function createGroupChat(
  creatorId: string,
  creatorUsername: string,
  name: string,
  memberIds: string[],
  memberNames: { [userId: string]: string }
): Promise<string> {
  try {
    if (!name || name.trim().length === 0) {
      throw new Error("Le nom du groupe est requis");
    }

    if (memberIds.length < 1) {
      throw new Error("Un groupe doit contenir au moins 1 autre membre");
    }

    const allMembers = [...new Set([creatorId, ...memberIds])];
    const allMemberNames = {
      [creatorId]: creatorUsername,
      ...memberNames,
    };

    const chatRef = push(ref(database, "chats"));
    const chatId = chatRef.key!;

    const chat: Chat = {
      id: chatId,
      t: "group",
      n: name.trim(),
      m: allMembers,
      mn: allMemberNames,
      ca: Date.now(),
      cb: creatorId,
      ac: false,
    };

    // Créer le chat d'abord
    await set(chatRef, chat);
    
    // Puis ajouter les index utilisateurs en parallèle
    await Promise.all(
      allMembers.map((memberId) =>
        set(ref(database, `userChats/${memberId}/${chatId}`), true)
      )
    );

    return chatId;
  } catch (error) {
    console.error("Erreur création groupe:", error);
    throw error;
  }
}

// ============================
// 📨 ENVOYER DES MESSAGES
// ============================

export async function sendMessage(
  chatId: string,
  userId: string,
  username: string,
  text: string
): Promise<void> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Le message ne peut pas être vide");
    }

    const chatRef = ref(database, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);

    if (!chatSnapshot.exists()) {
      throw new Error("Chat introuvable");
    }

    const chat = chatSnapshot.val() as Chat;
    
    // S'assurer que chat.m est un tableau (peut être undefined pour admin_info)
    const members = Array.isArray(chat.m) ? chat.m : [];
    
    // Ajouter automatiquement au chat admin si nécessaire
    if (chat.ac && !members.includes(userId)) {
      const updates: { [path: string]: any } = {};
      updates[`chats/${chatId}/m`] = [...members, userId];
      updates[`chats/${chatId}/mn/${userId}`] = username;
      updates[`userChats/${userId}/${chatId}`] = true;
      await update(ref(database), updates);
    } else if (!chat.ac && !members.includes(userId)) {
      throw new Error("Vous n'êtes pas membre de ce chat");
    }

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    const message: ChatMessage = {
      id: newMessageRef.key!,
      ui: userId,
      un: username,
      tx: text.trim(),
      ts: Date.now(),
    };

    const updates: { [path: string]: any } = {};
    updates[`chats/${chatId}/messages/${message.id}`] = message;
    updates[`chats/${chatId}/lm`] = {
      tx: message.tx,
      ts: message.ts,
      ui: message.ui,
      un: message.un,
    };

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur envoi message:", error);
    throw error;
  }
}

/**
 * Envoyer un message admin info (seulement pour les admins)
 * IMPORTANT: Crée automatiquement le canal s'il n'existe pas
 */
export async function sendAdminInfo(
  adminUserId: string,
  adminUsername: string,
  text: string,
  userRole: string
): Promise<void> {
  try {
    if (userRole !== "admin") {
      throw new Error("Seuls les administrateurs peuvent envoyer des infos");
    }

    // S'assurer que le canal admin_info existe
    await createAdminInfoChannel(adminUserId);

    // Envoyer le message
    await sendMessage("admin_info", adminUserId, `📢 ${adminUsername}`, text);
  } catch (error) {
    console.error("Erreur envoi info admin:", error);
    throw error;
  }
}

// ============================
// 📖 RÉCUPÉRER DES DONNÉES
// ============================

export async function getUserChats(userId: string, userRole?: string): Promise<Chat[]> {
  try {
    const userChatsRef = ref(database, `userChats/${userId}`);
    const snapshot = await get(userChatsRef);

    const chatIds = snapshot.exists() ? Object.keys(snapshot.val()) : [];
    
    // Ajouter automatiquement le canal info admin pour tous
    if (!chatIds.includes("admin_info")) {
      chatIds.push("admin_info");
      await set(ref(database, `userChats/${userId}/admin_info`), true);
    }

    const chats: Chat[] = [];

    const chatPromises = chatIds.map(async (chatId) => {
      const chatRef = ref(database, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);
      if (chatSnapshot.exists()) {
        const chatData = chatSnapshot.val();
        // S'assurer que m est toujours un tableau
        if (!Array.isArray(chatData.m)) {
          chatData.m = [];
        }
        return { id: chatId, ...chatData } as Chat;
      }
      return null;
    });

    const chatResults = await Promise.all(chatPromises);
    chats.push(...chatResults.filter((chat): chat is Chat => chat !== null));

    // Trier: admin_info en haut, puis par dernier message
    return chats.sort((a, b) => {
      if (a.id === "admin_info") return -1;
      if (b.id === "admin_info") return 1;
      if (a.id === "admin_chat") return -1;
      if (b.id === "admin_chat") return 1;
      const aTime = a.lm?.ts || a.ca;
      const bTime = b.lm?.ts || b.ca;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Erreur récupération chats:", error);
    return [];
  }
}

export async function getChatMessages(
  chatId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    // Utiliser orderByKey au lieu de orderByChild si l'index n'est pas configuré
    let messagesQuery;
    try {
      messagesQuery = query(messagesRef, orderByChild("ts"), limitToLast(limit));
    } catch (indexError) {
      console.warn("Index non configuré, utilisation de orderByKey", indexError);
      messagesQuery = query(messagesRef, limitToLast(limit));
    }
    
    const snapshot = await get(messagesQuery);

    if (!snapshot.exists()) return [];

    const messages = Object.values(snapshot.val()) as ChatMessage[];
    return messages.sort((a, b) => a.ts - b.ts);
  } catch (error) {
    console.error("Erreur récupération messages:", error);
    return [];
  }
}

export function onChatMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  limit: number = 50
): () => void {
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  
  // Utiliser orderByKey si l'index n'est pas disponible
  let messagesQuery;
  try {
    messagesQuery = query(messagesRef, orderByChild("ts"), limitToLast(limit));
  } catch (indexError) {
    console.warn("Index non configuré, utilisation de orderByKey", indexError);
    messagesQuery = query(messagesRef, limitToLast(limit));
  }

  const unsubscribe = onValue(
    messagesQuery,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const messages = Object.values(snapshot.val()) as ChatMessage[];
      callback(messages.sort((a, b) => a.ts - b.ts));
    },
    (error) => {
      console.error("Erreur écoute messages:", error);
      callback([]);
    }
  );

  return () => off(messagesQuery, "value", unsubscribe);
}

export function onUserChats(
  userId: string,
  callback: (chats: Chat[]) => void
): () => void {
  const userChatsRef = ref(database, `userChats/${userId}`);

  const unsubscribe = onValue(
    userChatsRef,
    async (snapshot) => {
      const chatIds = snapshot.exists() ? Object.keys(snapshot.val()) : [];
      
      // Ajouter le canal info admin automatiquement
      if (!chatIds.includes("admin_info")) {
        chatIds.push("admin_info");
        await set(ref(database, `userChats/${userId}/admin_info`), true);
      }
      
      const chatPromises = chatIds.map(async (chatId) => {
        const chatRef = ref(database, `chats/${chatId}`);
        const chatSnapshot = await get(chatRef);
        if (chatSnapshot.exists()) {
          const chatData = chatSnapshot.val();
          // S'assurer que m est toujours un tableau
          if (!Array.isArray(chatData.m)) {
            chatData.m = [];
          }
          return { id: chatId, ...chatData } as Chat;
        }
        return null;
      });

      const chatResults = await Promise.all(chatPromises);
      const chats = chatResults.filter((chat): chat is Chat => chat !== null);

      // Trier: admin_info et admin_chat en haut
      chats.sort((a, b) => {
        if (a.id === "admin_info") return -1;
        if (b.id === "admin_info") return 1;
        if (a.id === "admin_chat") return -1;
        if (b.id === "admin_chat") return 1;
        const aTime = a.lm?.ts || a.ca;
        const bTime = b.lm?.ts || b.ca;
        return bTime - aTime;
      });

      callback(chats);
    },
    (error) => {
      console.error("Erreur écoute chats:", error);
      callback([]);
    }
  );

  return () => off(userChatsRef, "value", unsubscribe);
}

// ============================
// 👥 GESTION DES GROUPES
// ============================

export async function addMemberToGroup(
  chatId: string,
  userId: string,
  username: string,
  currentUserId: string
): Promise<void> {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);

    if (!chatSnapshot.exists()) {
      throw new Error("Chat introuvable");
    }

    const chat = chatSnapshot.val() as Chat;
    
    // S'assurer que m est un tableau
    const members = Array.isArray(chat.m) ? chat.m : [];

    if (chat.ac) {
      throw new Error("Impossible de modifier les chats système");
    }

    if (chat.t !== "group") {
      throw new Error("Ce n'est pas un groupe");
    }

    if (!members.includes(currentUserId)) {
      throw new Error("Vous n'êtes pas membre de ce groupe");
    }

    if (members.includes(userId)) {
      throw new Error("L'utilisateur est déjà membre");
    }

    const updates: { [path: string]: any } = {};
    updates[`chats/${chatId}/m`] = [...members, userId];
    updates[`chats/${chatId}/mn/${userId}`] = username;
    updates[`userChats/${userId}/${chatId}`] = true;

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur ajout membre:", error);
    throw error;
  }
}

export async function removeMemberFromGroup(
  chatId: string,
  userId: string,
  currentUserId: string
): Promise<void> {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);

    if (!chatSnapshot.exists()) {
      throw new Error("Chat introuvable");
    }

    const chat = chatSnapshot.val() as Chat;
    
    // S'assurer que m est un tableau
    const members = Array.isArray(chat.m) ? chat.m : [];

    if (chat.ac) {
      throw new Error("Impossible de modifier les chats système");
    }

    if (chat.t !== "group") {
      throw new Error("Ce n'est pas un groupe");
    }

    if (members.length <= 2) {
      throw new Error("Un groupe doit contenir au moins 2 membres");
    }

    const updates: { [path: string]: any } = {};
    updates[`chats/${chatId}/m`] = members.filter((id) => id !== userId);
    updates[`chats/${chatId}/mn/${userId}`] = null;
    updates[`userChats/${userId}/${chatId}`] = null;

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur retrait membre:", error);
    throw error;
  }
}

export async function deleteGroupChat(
  chatId: string,
  userId: string,
  userRole?: string
): Promise<void> {
  try {
    const chatRef = ref(database, `chats/${chatId}`);
    const chatSnapshot = await get(chatRef);

    if (!chatSnapshot.exists()) {
      throw new Error("Chat introuvable");
    }

    const chat = chatSnapshot.val() as Chat;
    
    // S'assurer que m est un tableau
    const members = Array.isArray(chat.m) ? chat.m : [];

    if (chat.ac) {
      throw new Error("Les chats système ne peuvent pas être supprimés");
    }

    if (chat.t !== "group") {
      throw new Error("Seuls les groupes peuvent être supprimés");
    }

    if (chat.cb !== userId && userRole !== "admin") {
      throw new Error("Permission refusée");
    }

    const updates: { [path: string]: any } = {};

    members.forEach((memberId) => {
      updates[`userChats/${memberId}/${chatId}`] = null;
    });

    updates[`chats/${chatId}`] = null;

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erreur suppression groupe:", error);
    throw error;
  }
}

// ============================
// 🔍 RECHERCHE D'UTILISATEURS
// ============================

export async function searchUsers(query: string, currentUserId: string): Promise<Array<{ id: string; username: string }>> {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const users = snapshot.val();
    const results: Array<{ id: string; username: string }> = [];
    const searchLower = query.toLowerCase().trim();

    Object.entries(users).forEach(([userId, userData]: [string, any]) => {
      if (userId === currentUserId) return;

      const username = userData.username || "";
      if (username.toLowerCase().includes(searchLower)) {
        results.push({ id: userId, username });
      }
    });

    return results.slice(0, 20);
  } catch (error) {
    console.error("Erreur recherche utilisateurs:", error);
    return [];
  }
}

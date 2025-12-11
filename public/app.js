

// app.js - Quelque part en haut avec les autres variables globales

// Définition des paliers de taxation progressifs (en € et en %)
window.TAX_BRACKETS = [
    // La recherche se fait du bas vers le haut. Le dernier seuil atteint est le taux appliqué.
    { threshold: 0, rate: 10 },     // 3% à partir de 0 €
    { threshold: 99, rate: 15 },   // 5% à partir de 501 €
    { threshold: 999, rate: 19 },  // 8% à partir de 2001 €
    { threshold: 1999, rate: 23 }  // 10% à partir de 5001 €
];

window.TAX_PENALTY_RATE = 5;  // Pénalité de 5% si non payé à temps

// =========================
// 🔹 DOM ELEMENTS
// =========================


// ... le reste de vos initialisations
const pseudoInput = document.getElementById("pseudo");
const passwordInput = document.getElementById("password"); // L'ID 'password' est correct dans votre HTML
const registerBtn = document.getElementById("register-btn"); 
const loginBtn = document.getElementById("local-login-btn"); // Utiliser l'ID du bouton de connexion locale
const authForms = document.getElementById("auth-forms"); // Conteneur du formulaire


// Références aux éléments DOM des formulaires de connexion et d'inscription

const currentFortuneEl = document.getElementById("current-fortune");
const currentTaxRateEl = document.getElementById("current-tax-rate");
const taxDueEl = document.getElementById("tax-due");
const taxStatusEl = document.getElementById("tax-status");
const taxBracketsListEl = document.getElementById("tax-brackets-list");
const payTaxButton = document.getElementById("pay-tax-button");
const taxBlockMessageEl = document.getElementById("tax-block-message");

const pseudoRegisterInput = document.getElementById("pseudo-register-input");
const googleLoginBtn = document.getElementById("google-login-btn");
const logoutBtn = document.getElementById("logout-btn");
const localLoginBtn = document.getElementById("local-login-btn");
const userInfo = document.getElementById("user-info"); // L'élément qui causait le problème.

const addCardForm = document.getElementById("add-card-form");
const cardCodeInput = document.getElementById("card-code");

const taxPotTotalEl = document.getElementById("tax-pot-total");
const unpaidTaxListEl = document.getElementById("unpaid-tax-list");

const loginSection = document.getElementById("login-section");
const mainHeader = document.getElementById("main-header");

// File d’attente
const queueForm = document.getElementById("queue-form");
const playerNameInput = document.getElementById("player-name");
const queueListEl = document.getElementById("queue-list");
const currentPlayerEl = document.getElementById("currentPlayer");
const nextBtn = document.getElementById("next-btn");

// Classement
const rankingListEl = document.getElementById("ranking");

// Matchs (références pour pari.js)
// Matchs (références pour pari.js)
// ⚡️ CORRECTION : Rendre les références globales pour pari.js
window.matchListEl = document.getElementById("match-list");
window.createMatchForm = document.getElementById("create-match-form");
window.firebaseListeners = {};

// Booster
const profileBalanceEl = document.getElementById("profile-balance");
const boosterReveal = document.getElementById("booster-reveal");
const boosterCurrentCard = document.getElementById("booster-current-card");
const nextCardBtn = document.getElementById("next-card-btn");
const boosterCardsContainer = document.getElementById("booster-cards-container");
const boosterMsg = document.getElementById("booster-msg");
const booster20Btn = document.getElementById("booster-20-btn");
const booster50Btn = document.getElementById("booster-50-btn");
const boosterBalanceEl = document.getElementById("booster-balance");
const freeBoosterBtn = document.getElementById("free-booster-btn");

// 💡 NOUVEAU: Élément pour les messages utilisateur (doit exister dans le HTML)
const appMessageEl = document.getElementById("app-message");

// ⭐️ NOUVELLE FONCTIONNALITÉ: GESTION DES AMIS (RÉFÉRENCES DOM)
const changePseudoForm = document.getElementById('change-pseudo-form');
const newPseudoInput = document.getElementById('new-pseudo');
const pseudoMessage = document.getElementById('pseudo-message');
const friendListContainer = document.getElementById('friend-list');
const friendCountSpan = document.getElementById('friend-count');
const addFriendForm = document.getElementById('add-friend-form');
const friendUsernameInput = document.getElementById('friend-username');
const friendRequestMessage = document.getElementById('friend-request-message');
const friendRequestsContainer = document.getElementById('friend-requests-received');


window.tournamentState = {}; // État du tournoi mis à jour par le listener
const tournamentStateRef = db.collection('currentTournament').doc('state');



window.configRef = firebase.database().ref('config');
// =========================
// 👁️ FONCTIONS DE VISIBILITÉ DU MOT DE PASSE
// =========================

/**
 * Bascule la visibilité d'un champ de mot de passe donné.
 * @param {string} inputId L'ID de l'élément input du mot de passe.
 * @param {string} iconId L'ID de l'élément icône (l'œil).
 */
function togglePasswordVisibility(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);

    if (passwordInput && toggleIcon) {
        // Basculer le type entre 'password' et 'text'
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Basculer l'icône (utiliser des classes Font Awesome, par exemple)
        // Supposons que 'fa-eye' est l'œil ouvert et 'fa-eye-slash' est l'œil barré
        if (type === 'text') {
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        } else {
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        }
    } else {
        console.warn(`Champ de mot de passe ou icône non trouvé : ${inputId} / ${iconId}`);
    }
}



/**
 * 💡 NOUVELLE FONCTION: Affiche un message visuel à l'utilisateur.
 * @param {string} msg - Le message à afficher.
 * @param {string} type - 'success', 'error', 'info'.
 */
function displayMessage(msg, type = 'info') {
// ... (Fonction existante - Code omis pour la clarté du code)
    if (!appMessageEl) {
        // Fallback à la console si l'élément DOM n'est pas trouvé
        console.log(`[${type.toUpperCase()}] ${msg}`);
        return;
    }

    // Réinitialisation des styles pour le message
    appMessageEl.style.cssText = `
        position: fixed;
        top: 100px;
        right: 10px;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000000000;
        color: white;
        transition: opacity 0.3s, transform 0.3s;
        transform: translateX(0);
        opacity: 1;
        font-weight: bold;
    `;
    appMessageEl.textContent = msg;
    appMessageEl.style.display = 'block';

    // Styles spécifiques au type
    if (type === 'error') {
        appMessageEl.style.backgroundColor = '#f44336'; // Rouge
    } else if (type === 'success') {
        appMessageEl.style.backgroundColor = '#4CAF50'; // Vert
    } else { // info
        appMessageEl.style.backgroundColor = '#2196F3'; // Bleu
    }

    // Masque le message après 5 secondes
    setTimeout(() => {
        appMessageEl.style.opacity = 0;
        appMessageEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
             appMessageEl.style.display = 'none';
        }, 300); // Temps pour la transition CSS
    }, 1100);
}


// =========================
// 🔹 LOGIN / LOGOUT
// =========================
// ===================================
// ✅ CORRECTION : GESTION DE LA PERSISTANCE (Reconnexion automatique)
// ===================================

// Cet écouteur est le moyen le plus fiable de savoir si un utilisateur
// est connecté (y compris après un rechargement de page), car il attend
// que le SDK de Firebase ait restauré la session.
firebase.auth().onAuthStateChanged(user => {
    
    // Référence aux éléments DOM pour la connexion (pour les masquer ou les afficher)
    const loginSection = document.getElementById('login-section');
    const mainHeader = document.getElementById('main-header');
    
    // Si la logique de maintenance est présente, elle devrait être ici
    // if (window.isMaintenanceModeActive && (!user || (user && !window.currentUser.isAdmin))) {
    //     window.showSection('maintenance-screen');
    //     return;
    // }

    if (user) {
        // Utilisateur connecté (session restaurée)
        // loginSuccess s'occupe d'aller chercher les données complètes de l'utilisateur
        // dans la Realtime Database via l'écouteur userRef.on('value', ...)
        loginSuccess(user); 
        
    } else {
        // Utilisateur déconnecté ou session expirée
        window.currentUser = null;
        
        // Nettoyage de l'UI si nécessaire
        if (loginSuccess.initialized) {
            loginSuccess.initialized = false; // Réinitialise pour une prochaine connexion
        }
        localStorage.removeItem("currentUser"); // S'assurer que le localStorage est nettoyé
        
        // Afficher la section de connexion et masquer l'en-tête
        if (loginSection) loginSection.style.display = "block";
        if (mainHeader) mainHeader.style.display = "none";

        // Afficher la section de connexion (et masquer toutes les autres)
        window.showSection('login-section'); 
    }
});
let bonusAnimationId = null; // Variable nécessaire pour annuler l'animation

function checkAndGrantBonus(userData) {
    const uid = window.currentUser.uid;
    const userRef = window.usersRef.child(uid);
    const bonusTimerEl = document.getElementById("bonusTimer");

    // Annuler toute animation en cours avant de démarrer la nouvelle logique
    // C'est crucial car cette fonction est appelée par le listener principal (.on) à chaque changement.
    if (bonusAnimationId) {
        cancelAnimationFrame(bonusAnimationId);
        bonusAnimationId = null;
    }

    // S'assurer que les données existent et que l'élément d'affichage est là
    if (!userData || !bonusTimerEl) return;

    const createdAt = userData.createdAt || 0;
    const bonusClaimed = userData.bonusClaimed || false;
    const nowTs = Date.now();

    // Si bonus déjà obtenu
    if (bonusClaimed) {
        bonusTimerEl.textContent = "✅ Bonus de fidélité déjà débloqué !";
        return; // Arrêt propre
    }

    // Temps écoulé depuis la création
    const hoursSinceCreation = (nowTs - createdAt) / (1000 * 60 * 60);

    if (hoursSinceCreation >= 24) {
        // 🎁 BONUS DISPONIBLE : On le débloque immédiatement
        const newBalance = (userData.balance || 0) + 5;
        
        // Mise à jour de la DB (déclenche le listener principal)
        userRef.update({
            balance: newBalance,
            bonusClaimed: true
        });

        bonusTimerEl.textContent = "🎉 Bonus de 5€ ajouté !";
        displayMessage("🎁 Bonus de 5€ débloqué ! Merci de ta fidélité.", "success");
        // La mise à jour du `bonusClaimed` à `true` dans la DB va déclencher une dernière fois 
        // le listener principal, qui appellera cette fonction, qui s'arrêtera sur le `if (bonusClaimed)`.

    } else {
        // 🕐 AFFICHAGE du compte à rebours
        const targetTs = createdAt + (24 * 60 * 60 * 1000); // Timestamp où le bonus sera disponible
        
        function updateCountdown() {
            const now = Date.now();
            const diff = targetTs - now; // Différence entre le temps cible et maintenant

            if (diff <= 0) {
                // Temps écoulé, plus besoin d'animation, on réappelle la fonction pour appliquer le bonus
                if (bonusAnimationId) {
                    cancelAnimationFrame(bonusAnimationId); // 🛑 Arrêt de l'animation
                    bonusAnimationId = null;
                }
                
                // On relance la fonction, qui va entrer dans le bloc `if (hoursSinceCreation >= 24)` et mettre à jour la DB.
                checkAndGrantBonus(userData); 
                return; // Arrêt du cycle d'animation
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            bonusTimerEl.textContent = `⏳ Bonus de 5€ disponible dans ${hours}h ${minutes}m ${seconds}s`;
            
            // ✅ Enregistrer l'ID de l'appel pour pouvoir l'annuler à la prochaine itération ou à la déconnexion
            bonusAnimationId = requestAnimationFrame(updateCountdown);
        }

        updateCountdown();
    }
}


// DANS app.js

// DANS app.js

// Fonction d'aide pour afficher l'écran de blocage (appelée au login ou en temps réel)
function handleBlockedUser(user) {
// ... (Fonction existante - Code omis pour la clarté du code)
    // Récupération des éléments DOM
    const mainHeader = document.getElementById('main-header'); 
    const fsMessage = document.getElementById('fullScreenMessage');
    const fsTitle = document.getElementById('fs-title');
    const fsBody = document.getElementById('fs-body');
    const fsRequestBtn = document.getElementById('fs-request-btn');

    // 1. Masquer la barre de navigation et toutes les sections (sauf l'écran de message lui-même)
    if (mainHeader) mainHeader.style.display = "none";
    document.querySelectorAll('section').forEach(s => {
        if (s.id !== 'fullScreenMessage') {
            s.style.display = 'none';
        }
    });

    // 2. Afficher l'écran géant
    fsTitle.textContent = "🛑 COMPTE BLOQUÉ";
    fsBody.textContent = "Votre compte a été bloqué par l'administration pour activité suspecte. Vous ne pouvez plus utiliser l'application.";
    
    fsRequestBtn.style.display = 'block'; 
    fsMessage.style.display = 'flex'; // Affichage de l'overlay

    // 3. Attacher l'événement de demande
    fsRequestBtn.onclick = null;
    fsRequestBtn.onclick = () => {
        const message = prompt("Expliquez pourquoi vous pensez que votre compte devrait être réactivé :");
        if (message) {
            reportSuspiciousActivity(
                "Demande de Réactivation", 
                `L'utilisateur ${user.name} (UID: ${user.uid}) demande la réactivation. Message: ${message}`
            );
            displayMessage("Votre demande a été envoyée à l'administration.", 'info'); 
            fsRequestBtn.disabled = true;
            fsRequestBtn.textContent = 'Demande envoyée';
        }
    };

    if (window.currentUser) {
        window.currentUser.isBlocked = true;
    }
}

let isInitialAuthCheckComplete = false; // Maintenu pour la cohérence globale (doit être vérifié dans DOMContentLoaded)

/**
 * Gère le succès de la connexion (ou la réauthentification).
 * Attache le listener de profil en temps réel et gère l'initialisation de l'application.
 * * @param {object} user L'objet utilisateur retourné par Firebase Auth.
 */
function loginSuccess(user) {
    // 1. Initialise window.currentUser avec les données de base de l'Auth API
    window.currentUser = {
        uid: user.uid,
        name: user.displayName || 'Aucun',
        email: user.email,
        // ... (autres propriétés Auth)
    };

    // Récupération des éléments DOM pour la connexion
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const loginSection = document.getElementById('login-section');
    const mainHeader = document.getElementById('main-header');

    // 🚨 NOUVEAU : Logique de l'écouteur d'acceptation de la Charte (n'est attachée qu'une seule fois)
    // On utilise une propriété statique de la fonction pour garantir l'exécution unique
    if (!loginSuccess.charterListenerAttached) {
        const acceptCharterBtn = document.getElementById('accept-charter-btn');
        if (acceptCharterBtn) {
            acceptCharterBtn.addEventListener('click', () => {
                // Masquer la modal immédiatement
                document.getElementById('welcome-charter-modal').style.display = 'none';

                // Mettre à jour Firebase. Cela déclenchera le listener 'userRef.on("value")' ci-dessous
                if (window.currentUser && window.usersRef) {
                    window.usersRef.child(window.currentUser.uid).update({
                        charterAccepted: true
                    }).then(() => {
                        // Le listener en temps réel va gérer l'initialisation de l'app (point 🚀 ci-dessous)
                        displayMessage("Charte acceptée ! Bienvenue.", 'success');
                    }).catch(error => {
                        displayMessage("Erreur lors de l'enregistrement de l'acceptation: " + error.message, 'error');
                    });
                }
            });
            loginSuccess.charterListenerAttached = true; // Empêche l'attachement futur
        }
    }


    // ===============================================
    // 🟢 ÉTAPE CRUCIALE : LISTENER DE PROFIL (Léger et Critique)
    // ===============================================
    const userRef = window.usersRef.child(user.uid);

    // Stockage de la référence pour l'annuler à la déconnexion
    window.firebaseListeners = window.firebaseListeners || {};
    window.firebaseListeners.userProfile = userRef;

    // Ce listener gère les mises à jour en temps réel des données les plus importantes
    userRef.on('value', snapshot => {
        const userData = snapshot.val() || {};

        // Si les données utilisateur ont été supprimées, on déconnecte
        if (!userData || userData.deleted) { // Ajout d'une vérification pour un éventuel flag de suppression
            firebase.auth().signOut();
            return;
        }
        
        // Récupérer le statut de blocage avant la mise à jour complète de l'objet
        const currentBlockStatus = window.currentUser ? window.currentUser.isBlocked : false;

        // ⚡️ Mise à jour de window.currentUser avec TOUTES les données en temps réel
        Object.assign(window.currentUser, userData, {
            name: userData.name || user.displayName || 'Aucun'
        });

        // ===============================================
        // 🛑 NOUVEAU : VÉRIFICATION DU MODE MAINTENANCE
        // ===============================================
        // Utiliser window.currentUser.isAdmin car il est mis à jour ci-dessus
        if (window.isMaintenanceModeActive && !window.currentUser.isAdmin) {
            // Si un admin active le mode MAINTENANCE pendant que l'utilisateur est connecté,
            // on le renvoie à l'écran de maintenance.
            window.showSection('maintenance-screen');
            return;
        }

        // ===============================================
        // 🚨 NOUVEAU : LOGIQUE DE CHARTE EN TEMPS RÉEL (Bloque l'UI jusqu'à l'acceptation)
        // ===============================================
        if (!window.currentUser.charterAccepted) {
            // L'utilisateur n'a pas encore accepté la charte. On bloque l'accès à l'app.
            document.getElementById('welcome-charter-modal').style.display = 'flex';

            // Masque toutes les sections SAUF la charte (et les messages globaux)
            document.querySelectorAll('section').forEach(section => {
                if (section.id !== 'welcome-charter-modal' && section.id !== 'fullScreenMessage' ) { // Permet de garder le système de message global
                    section.style.display = 'none';
                }
            });
            // On arrête ici pour ne pas charger l'UI normale
            return;
        }

        // Si la charte est acceptée, on s'assure que la modale est masquée
        const charterModal = document.getElementById('welcome-charter-modal');
        if (charterModal) charterModal.style.display = 'none';

        // ===============================================
        // 🚨 LOGIQUE ANTI-TRICHE EN TEMPS RÉEL (DOIT rester ici)
        // ===============================================

        // a) Blocage immédiat
        if (window.currentUser.isBlocked && !currentBlockStatus) {
            if (typeof handleBlockedUser === 'function') handleBlockedUser(window.currentUser);
            else console.error("handleBlockedUser n'est pas défini.");
            return; // Arrêter la mise à jour de l'UI normale
        }

        // b) Déblocage
        if (!window.currentUser.isBlocked && currentBlockStatus) {
            // L'utilisateur a été débloqué pendant sa session.
            firebase.auth().signOut().then(() => {
                displayMessage("✅ Votre compte a été réactivé. Veuillez vous reconnecter.", 'success');
                const fsMessage = document.getElementById('fullScreenMessage');
                if (fsMessage) fsMessage.style.display = 'none';
            });
            return;
        }

        if (typeof window.loadTaxesPanel === 'function') { window.loadTaxesPanel(); } 
        if (window.currentUser.isAdmin && typeof window.loadAdminTaxesPanel === 'function') { window.loadAdminTaxesPanel(); }
        
        // c) Message Admin en temps réel
        if (window.currentUser.adminMessage) {
            displayMessage(`[Message Admin] : ${window.currentUser.adminMessage}`, 'info');
            // Réinitialisation immédiate du message dans la DB après affichage
            window.usersRef.child(window.currentUser.uid).update({ adminMessage: null });
        }
        
        // ===============================================
        // 🔹 ACTUALISATION LÉGÈRE ET ESSENTIELLE DU PROFIL
        // ===============================================

        // Mettre à jour l'affichage de l'en-tête (Nom)
        if (userInfo) userInfo.textContent = `Utilisateur : ${window.currentUser.name}`;

        // Mises à jour qui dépendent des données utilisateur qui changent souvent (solde, temps de bonus)
        // On vérifie l'existence des fonctions avant l'appel
        if (typeof updateBoosterBalance === 'function') updateBoosterBalance();
        if (typeof startFreeBoosterCountdown === 'function') startFreeBoosterCountdown();
        if (typeof checkAndGrantBonus === 'function') checkAndGrantBonus(userData);

        // Mise à jour des stats du profil
        if (typeof updateProfileStats === 'function') {
            updateProfileStats({
                wins: userData.totalWins || 0,
                losses: userData.totalLosses || 0,
                earnings: userData.totalWon || 0
            });
        }

        // Mettre à jour localement APRÈS la mise à jour complète
        localStorage.setItem("currentUser", JSON.stringify(window.currentUser));

        // ✅ L'APPEL CORRECT EST ICI : APRÈS QUE window.currentUser.isAdmin A ÉTÉ CHARGÉ
        if (typeof checkAdminStatus === 'function') checkAdminStatus();

        // ===============================================
        // 🚀 INITIALISATION ET DÉMARRAGE DES LISTENERS DÉCOUPLÉS (1 seule fois après Charte)
        // ===============================================
        // Utilise une propriété statique de la fonction pour garantir l'exécution unique
        if (!loginSuccess.initialized) {

            // --- Initialisation de l'interface (1 seule fois) ---
            if (logoutBtn) logoutBtn.style.display = "inline-block";
            if (loginSection) loginSection.style.display = "none";
            if (mainHeader) mainHeader.style.display = 'flex'; // On assure la visibilité

            // 🛑 AFFICHAGE DE LA PAGE DE LA LISTE D'ATTENTE (QUEUE)
            showSection("queue");

            if (typeof window.checkBalanceAnomaly === 'function') {
                window.checkBalanceAnomaly(window.currentUser);
            }

            // --- Démarrage des listeners permanents (qui contiennent leur propre .on()) ---

            // 1. Classement
            if (typeof setupRankingListener === 'function') setupRankingListener();

            // 2. BabyDex
            if (typeof setupBabyDexListener === 'function') setupBabyDexListener();

            // 3. Amis
            if (typeof setupFriendListListener === 'function') setupFriendListListener();
            if (typeof setupFriendRequestsListener === 'function') setupFriendRequestsListener();

            // 4. Tournoi
            if (typeof window.setupTournamentListeners === 'function') {
                window.setupTournamentListeners();
            }

            if (typeof checkAchievements === 'function') {
                checkAchievements(userData); 
                window.loadTaxesPanel();// Appelle la fonction de vérification
            }

            loginSuccess.initialized = true; // Empêche l'exécution future
        }

    }, (error) => {
        console.error("Erreur de l'écouteur en temps réel:", error);
        displayMessage("Erreur critique lors du chargement du profil.", 'error');
    });
}

// Initialisation des propriétés statiques (si nécessaire, sinon JS gère le undefined)
loginSuccess.initialized = false;
loginSuccess.charterListenerAttached = false;

// Google login
if (googleLoginBtn) {
// ... (Fonction existante - Code omis pour la clarté du code)
    googleLoginBtn.onclick = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            if (!user) return;

            const userRef = usersRef.child(user.uid);
            userRef.once("value").then(snap => {
                if (!snap.exists()) {
                    // ✅ FIX 1: Initialisation du solde de 15€ pour les nouveaux utilisateurs Google
                    userRef.set({ 
                        name: user.displayName,
                        balance: 15, // Solde de départ pour les paris et les boosters
                        totalWon: 0,
                        taxPaidForCurrentPeriod: false, // Doit être réinitialisé chaque semaine
                        hasUnpaidTaxPenalty: false,
                        totalWins: 0, 
                        totalLosses: 0,
                        totalBabyCards: 0,
                        createdAt: Date.now(),
                        bonusClaimed: false,
                        lastBonusTimestamp: 0,
                        isAdmin: false,
                        charterAccepted: false, // 🚨 NOUVEAU : Ajout de l'état de la charte
                        // Initialisation des collections amis/requests
                        friends: {}, 
                        friendRequests: { sent: {}, received: {} }
                    });
                    displayMessage("Compte Google créé et connecté ! Solde de 15€ offert.", 'success');
                } else {
                    userRef.update({ name: user.displayName }); 
                    displayMessage(`Bienvenue, ${user.displayName} !`, 'success');
                }
            });

            // L'objet user n'a pas toutes les données, loginSuccess va s'en charger via l'écouteur
            loginSuccess(user); 
            // La mise à jour de localStorage sera gérée dans loginSuccess après la fusion des données
        } catch (err) {
            // ❌ REMPLACÉ: console.error
            displayMessage("Erreur de connexion Google. Réessayez.", 'error');
            console.error("Erreur connexion Google :", err);
        }
    };
}

// Logout
if (logoutBtn) {
    // Récupération des éléments DOM une seule fois
    const loginSection = document.getElementById('login-section');
    const mainHeader = document.getElementById('main-header');
    const userInfo = document.getElementById('user-info');
    
    logoutBtn.onclick = async () => {
        try {
            // Annuler l'écouteur Firebase pour ne pas créer d'erreurs d'UI après la déconnexion
            if (window.currentUser && window.firebaseListeners && window.firebaseListeners.userProfile) {
                window.firebaseListeners.userProfile.off('value'); // Annule l'écouteur de profil
                delete window.firebaseListeners.userProfile;
            }

            // 💡 CORRECTION ADMIN : Détacher l'écouteur des signalements AVANT la déconnexion
            if (typeof cleanupAdminListeners === 'function') {
                cleanupAdminListeners();
            }
            
            // Déconnexion Firebase Auth
            await firebase.auth().signOut();
        } catch (e) {
            console.error("Erreur de signOut :", e);
        }
        
        // 1. Nettoyage de l'état
        window.currentUser = null;
        loginSuccess.initialized = false; // Réinitialise pour une prochaine connexion
        localStorage.removeItem("currentUser");

        // 2. Afficher la section de Connexion et Masquer l'En-tête
        if (loginSection) loginSection.style.display = "block";
        if (mainHeader) mainHeader.style.display = "none";
        if (userInfo) userInfo.textContent = "Utilisateur : Aucun";
        // if (logoutBtn) logoutBtn.style.display = "none"; // Optionnel, car il devrait être masqué avec mainHeader

        // 3. ⚡️ CORRECTION : Masquer TOUTES les sections d'application, y compris 'profile'
        document.querySelectorAll('section').forEach(section => {
            if (section.id !== 'login-section' && section.id !== 'welcome-charter-modal' && section.id !== 'maintenance-screen') {
                section.style.display = 'none';
            }
        });

        displayMessage("Déconnexion réussie.", 'info');
    };
}
// ===================================
// 🔹 CONNEXION LOCALE (SÉCURISÉE)
// ===================================

// Register (local)
if (registerBtn) {
// ... (Fonction existante - Code omis pour la clarté du code)
    registerBtn.onclick = async () => {
        // Récupère directement les valeurs du DOM (comme vous l'avez fait)
        const pseudo = document.getElementById("pseudo").value.trim();
        const password = document.getElementById("password").value.trim();
        
        if (!pseudo || !password) return displayMessage("Remplis les deux champs !", 'error');

        // Remplacer AUTH_DOMAIN par la valeur en dur de votre domaine (que l'on devine être "@babyfoot.app")
        const internalDomain = "@babyfoot.app";
        
        // ⚡️ CORRECTION FINALE : Utiliser la variable 'pseudo' pour construire l'email
        const email = pseudo.toLowerCase() + internalDomain; // Ajout du toLowerCase pour la cohérence

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user) {
                await user.updateProfile({
                    displayName: pseudo
                });

                // ✅ Initialisation du solde de 15€ pour les nouveaux utilisateurs locaux
                await usersRef.child(user.uid).set({
                    name: pseudo,
                    balance: 15, // Solde de départ pour les paris et les boosters
                    totalWon: 0,
                    totalWins: 0, 
                    totalLosses: 0,
                    totalCards: 0,
                    taxPaidForCurrentPeriod: false, // Doit être réinitialisé chaque semaine
                    hasUnpaidTaxPenalty: false,
                    totalBabyCards: 0,
                    google: false,
                    createdAt: Date.now(),
                    bonusClaimed: false,
                    lastBonusTimestamp: 0,
                    isAdmin: false,
                    charterAccepted: false, // 🚨 NOUVEAU : Ajout de l'état de la charte
                    // Initialisation des collections amis/requests
                    friends: {}, 
                    friendRequests: { sent: {}, received: {} }
                });

                // L'objet user n'a pas toutes les données, loginSuccess va s'en charger via l'écouteur
                loginSuccess(user);
                // La mise à jour de localStorage sera gérée dans loginSuccess après la fusion des données
                
                displayMessage("Compte créé et connecté ! Solde de 15€ offert.", 'success');
            }
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                // L'erreur Firebase dit 'email already in use', 
                // mais comme l'email est le pseudo, on affiche ce message :
                displayMessage("Ce pseudo existe déjà !", 'error');
            } else if (err.code === 'auth/weak-password') {
                displayMessage("Le mot de passe doit faire au moins 6 caractères !", 'error');
            } else {
                displayMessage("Erreur lors de la création du compte.", 'error');
                console.error("Erreur : " + err.message);
            }
        }
    };
}

// Local login
if (localLoginBtn) {
// ... (Fonction existante - Code omis pour la clarté du code)
    localLoginBtn.onclick = async () => {
        const pseudo = document.getElementById("pseudo").value.trim();
        const password = document.getElementById("password").value.trim();
        // ❌ REMPLACÉ: console.error
        if (!pseudo || !password) return displayMessage("Remplis les deux champs !", 'error');

        // ⚡️ CORRECTION : Remplacer la constante AUTH_DOMAIN manquante par sa valeur en dur
        const internalDomain = "@babyfoot.app"; 
        const email = pseudo.toLowerCase() + internalDomain; // Ajout du toLowerCase pour la cohérence

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user) {
                const name = user.displayName || pseudo; 
                
                // L'objet user n'a pas toutes les données, loginSuccess va s'en charger via l'écouteur
                loginSuccess(user);
                // La mise à jour de localStorage sera gérée dans loginSuccess après la fusion des données
                displayMessage(`Connexion réussie pour ${name} !`, 'success'); // 💡 Message de succès
            }
        } catch (err) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                // ❌ REMPLACÉ: console.error
                displayMessage("Pseudo ou mot de passe incorrect !", 'error');
            } else {
                // ❌ REMPLACÉ: console.error
                displayMessage("Erreur de connexion.", 'error');
                console.error("Erreur de connexion : " + err.message);
            }
        }
    };
}

// =========================
// 🔹 CARTES (Système unifié)
// =========================
if (addCardForm) {
// ... (Fonction existante - Code omis pour la clarté du code)
  addCardForm.addEventListener("submit", e => {
    e.preventDefault();
    // ❌ REMPLACÉ: console.error
    if (!window.currentUser) return displayMessage("Connecte-toi pour ajouter une carte !", 'error');
    const code = cardCodeInput.value.trim().toUpperCase();
    // ❌ REMPLACÉ: console.error
    if (!code) return displayMessage("Entre un code de carte !", 'error');

    const cardInfo = findCardByCode(code);
    if (!cardInfo) {
      // ❌ REMPLACÉ: console.error
      return displayMessage("Code non reconnu ! Vérifie le code.", 'error');
    }

    const userRef = usersRef.child(window.currentUser.uid);
    userRef.once("value").then(async snap => {
      const data = snap.val() || {};
      const existing = data.babyDeck || [];
      
      const has = existing.some(c => c.code === code);
      // ❌ REMPLACÉ: console.error
      if (has) return displayMessage("Carte déjà possédée dans le Baby-Dex !", 'info');

      const newCard = {
        code: cardInfo.code,
        nom: cardInfo.nom,
        rarity: cardInfo.rarity,
        obtainedAt: now()
      };
      const updated = [...existing, newCard];
      
      await userRef.update({ 
        babyDeck: updated, 
        totalBabyCards: updated.length 
      });
      
      renderBabyDex(); 
      cardCodeInput.value = "";
      // ❌ REMPLACÉ: console.log
      displayMessage(`Carte ${cardInfo.nom.replace('.png', '')} ajoutée au Baby-Dex !`, 'success');
    });
  });
}

// =========================
// 🔹 SHOW SECTION helper
// =========================
function showSection(id) {
  document.querySelectorAll("section").forEach(sec => sec.style.display = "none");
  const sec = document.getElementById(id);
  if (sec) sec.style.display = "block";
}

// =========================
// 🔹 FILE D’ATTENTE
// =========================
if (queueForm) {
// ... (Fonction existante - Code omis pour la clarté du code)
  queueForm.addEventListener("submit", e => {
    e.preventDefault();
    // ❌ REMPLACÉ: console.error
    if (!window.currentUser) return displayMessage("Connecte-toi pour t'inscrire à la file !", 'error');
    const name = playerNameInput.value.trim();
    // ❌ REMPLACÉ: console.error
    if (!name) return displayMessage("Entre ton prénom pour t'inscrire !", 'error');
    const userRef = usersRef.child(window.currentUser.uid);
    
    userRef.update({ playerName: name });
    userRef.once("value").then(snap => {
      const user = snap.val() || {};
      if (!user.name) {
        userRef.update({ name: name });
      }
    });

    queueRef.child(window.currentUser.uid).set({ name, timestamp: Date.now() });
    playerNameInput.value = "";
    displayMessage(`${name} a été ajouté à la file d'attente.`, 'info');
  });
}

if (queueRef) {
// ... (Fonction existante - Code omis pour la clarté du code)
  queueRef.orderByChild("timestamp").on("value", snap => {
    const data = snap.val() || {};
    if (!queueListEl) return; 
    queueListEl.innerHTML = "";
    const players = Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp);
    players.forEach(([_, player], i) => {
      const li = document.createElement("li");
      li.textContent = `${player.name}${i === 0 ? " (joue maintenant)" : ""}`;
      queueListEl.appendChild(li);
    });
    if (currentPlayerEl) currentPlayerEl.textContent = players.length ? `Joueur actuel : ${players[0][1].name}` : "Joueur actuel : Aucun";
  });
}

if (nextBtn) {
// ... (Fonction existante - Code omis pour la clarté du code)
  nextBtn.addEventListener("click", () => {
    queueRef.orderByChild("timestamp").limitToFirst(1).once("value", snap => {
      const first = snap.val();
      // ❌ REMPLACÉ: console.error
      if (!first) return displayMessage("La file d'attente est vide !", 'info');
      const uid = Object.keys(first)[0];
      queueRef.child(uid).remove().then(() => {
        displayMessage("Joueur suivant appelé. La file avance !", 'success'); // 💡 Message de succès/info
      });
    });
  });
}

// ======================
// 🔹 CLASSEMENT général (CORRIGÉ - Affichage par Gain Total)
// ======================
window.updateRanking = function() {
    // ⚡️ S'assurer que les références DOM et Firebase sont prêtes
    if (!rankingListEl || typeof window.usersRef === 'undefined') {
        console.error("Élément de classement ou référence Firebase non disponible.");
        return;
    }

    // 1. Récupérer tous les utilisateurs
    window.usersRef.once("value").then(snap => {
        const users = snap.val() || {};

        // 2. Convertir l'objet en tableau et calculer les métriques
        const userArray = Object.keys(users).map(uid => {
            const user = users[uid];
            
            const wins = user.totalWins || 0; 
            const losses = user.totalLosses || 0; 
            const totalWon = user.totalWon || 0;
            const balance = user.balance || 0; // ⬅️ NOUVEAUTÉ : Récupération du Solde (Balance)
            
            // Le ratio n'est plus nécessaire pour le tri, mais peut être conservé si vous voulez l'afficher
            const totalMatches = wins + losses;
            const ratio = totalMatches > 0 ? wins / totalMatches : 0; 
            
            return {
                uid,
                name: user.name || 'Inconnu',
                wins,
                losses,
                totalWon,
                balance, // ⬅️ Ajout de la métrique 'balance'
                ratio
            };
        })
        .filter(user => user.wins + user.losses > 0); // Filtrer ceux qui n'ont pas joué

        // 3. Trier le tableau (Priorité : Solde décroissant, puis Victoires décroissantes en cas d'égalité)
        userArray.sort((a, b) => {
            // Tri principal : Solde décroissant (balance)
            if (b.balance !== a.balance) {
                return b.balance - a.balance; // ⬅️ CHANGEMENT : Tri par 'balance'
            }
            // Tri secondaire : Victoires décroissantes
            return b.wins - a.wins; 
        });

        // 4. Afficher le classement
        rankingListEl.innerHTML = ''; // Vider la liste existante

        if (userArray.length === 0) {
            rankingListEl.innerHTML = '<li>Aucun joueur n\'a encore joué de match.</li>';
            return;
        }

        userArray.forEach((user, index) => {
            const li = document.createElement('li');
            const rank = index + 1;
            
            // Affichage du Solde formaté en euros ⬅️ CORRECTION
            const balanceDisplay = user.balance.toFixed(2) + ' €'; // ⬅️ CHANGEMENT : Affiche 'balance'
            
            li.innerHTML = `
                <span class="rank-number">${rank}.</span>
                <span class="rank-name">${user.name}</span>
                <span class="rank-stats">${balanceDisplay}</span>
            `;

            // Ajout de classes CSS pour le style (à styliser dans style.css)
            if (rank === 1) li.classList.add('rank-gold');
            else if (rank === 2) li.classList.add('rank-silver');
            else if (rank === 3) li.classList.add('rank-bronze');

            rankingListEl.appendChild(li);
        });

        console.log("🏆 Classement mis à jour avec succès (trié par Solde)."); // ⬅️ CHANGEMENT du message

    }).catch(error => {
        console.error("Erreur lors de la récupération du classement:", error);
        if (rankingListEl) rankingListEl.innerHTML = '<li>Erreur de chargement du classement.</li>';
    });
};

// =========================
// 🔹 BOOSTER + stockage des cartes
// =========================
let currentDrawnCards = [];
let currentCardIndex = 0;

function updateBoosterBalance() {
// ... (Fonction existante - Code omis pour la clarté du code)
  if (!window.currentUser) return;
  usersRef.child(window.currentUser.uid).once("value").then(snap => {
    const user = snap.val() || {};
    if (boosterBalanceEl) {
      // ✅ FIX 2: Afficher la nouvelle 'balance' (solde actuel) au lieu de 'totalWon'
      boosterBalanceEl.textContent = ((user.balance || 0)).toFixed(2) + " €"; 
    }
  });
}

async function showNextCard() {
// ... (Fonction existante - Code omis pour la clarté du code)
    if (currentCardIndex >= currentDrawnCards.length) {
        if (boosterReveal) boosterReveal.style.display = "none";
        if (boosterCardsContainer) boosterCardsContainer.innerHTML = "";
        currentDrawnCards.forEach(c => {
            const img = document.createElement("img");
            img.src = `./images/${c.nom}`;
            img.style.width = "80px";
            img.style.margin = "5px";
            if (boosterCardsContainer) boosterCardsContainer.appendChild(img);
        });
        if (boosterMsg) boosterMsg.textContent = `🎉 Tu as obtenu ${currentDrawnCards.length} nouvelles cartes !`;
        updateBoosterBalance();
        return;
    }

    const card = currentDrawnCards[currentCardIndex];
    const src = `./images/${card.nom}`;

    if (!boosterCurrentCard) {
        currentCardIndex++;
        return;
    }

    // Réinitialisation de l'animation
    boosterCurrentCard.style.transition = "transform 1s ease-out, opacity 1s ease-out";
    boosterCurrentCard.style.opacity = 0;
    boosterCurrentCard.style.transform = "scale(0) rotateY(90deg)"; // L'effet de rotation commence à 90deg

    // Pré-chargement de l'image
    await preloadImage(src);  // Attendre que l'image soit prête

    setTimeout(() => {
        boosterCurrentCard.src = src;
        boosterCurrentCard.style.opacity = 1;

        // Animation spécifique selon la rareté
        switch(card.rarity) {
            case "Bronze-NR":
            case "Bronze-R":
                // Animation simple mais marquante pour les cartes bronze
                boosterCurrentCard.style.transition = "transform 1.5s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 1.5s";
                boosterCurrentCard.style.transform = "scale(1.2) rotateY(0deg)";
                boosterCurrentCard.style.animation = "pulse 1s infinite";
                break;

            case "Silver-NR":
            case "Silver-R":
                // Effet de **flou léger** puis un zoom fluide pour les cartes silver
                boosterCurrentCard.style.transition = "transform 1.5s ease, opacity 1s ease-in-out";
                boosterCurrentCard.style.transform = "scale(1.15) rotateY(0deg)";
                boosterCurrentCard.style.filter = "blur(2px)";
                setTimeout(() => {
                    boosterCurrentCard.style.filter = "blur(0px)";
                }, 500);
                break;

            case "Gold-NR":
            case "Gold-R":
                // Animation avec **explosion de lumière** autour de la carte
                boosterCurrentCard.style.transition = "transform 1s, opacity 1s ease-out";
                boosterCurrentCard.style.transform = "scale(1.3) rotateY(0deg)";
                boosterCurrentCard.style.animation = "flash 1s ease-out";
                break;

            case "Espoir":
                // Animation avec effet lumineux pour les cartes Espoir
                boosterCurrentCard.style.transition = "transform 1s ease-in-out, opacity 1s ease-out";
                boosterCurrentCard.style.transform = "scale(1.5) rotateY(0deg)";
                boosterCurrentCard.style.filter = "brightness(2)";
                break;

            case "Icone":
                // Effet de **rotation 3D** avec des particules qui apparaissent autour de la carte
                boosterCurrentCard.style.transition = "transform 1.5s ease-in-out";
                boosterCurrentCard.style.transform = "rotateX(360deg) scale(1.2)";
                boosterCurrentCard.style.animation = "shine 2s linear infinite";
                break;

            case "Future-star":
            case "Hist.Maker":
            case "God":
            case "Createur":
            case "PikaPika":
            case "BouBou":
                // Effet ultra-spectaculaire, effet de halo multicolore et de glow avec mouvement répétitif
                boosterCurrentCard.style.transition = "transform 3s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 2s";
                boosterCurrentCard.style.transform = "rotateY(720deg) scale(2)";
                
                // Animation de halo lumineux et de mouvement (avance et recule plusieurs fois)
                boosterCurrentCard.style.animation = "moveBackAndForth 3s ease-in-out 3, superGlow 3s ease-in-out infinite";
                break;
        }

        // Réduction de l'image après 15 secondes
        setTimeout(() => {
            boosterCurrentCard.style.transition = "transform 1s ease-in-out";  // Transition pour la réduction
            boosterCurrentCard.style.transform = "scale(1)";  // Redimensionner l'image à sa taille originale
            
            // Active le bouton "Suivant" après 15 secondes
            if (nextCardBtn) nextCardBtn.disabled = false;
        }, 15000);  // Réduit l'image après 15 secondes

    }, 500); // Attente avant de commencer la transition de carte

    currentCardIndex++;
}






function revealCards(cardObjs) {
// ... (Fonction existante - Code omis pour la clarté du code)
  currentDrawnCards = cardObjs;
  currentCardIndex = 0;
  if (boosterReveal) boosterReveal.style.display = "block";
  if (boosterCardsContainer) boosterCardsContainer.innerHTML = "";
  if (boosterMsg) boosterMsg.textContent = "";
  showNextCard();
}

function openBooster(cost, cardCount) {
    const boosterMsg = document.getElementById('booster-msg');
    
    if (!window.currentUser) return displayMessage("Connecte-toi pour acheter un booster !", 'error');

    window.usersRef.child(window.currentUser.uid).once("value").then(async snap => {
        const user = snap.val() || {};

        if ((user.balance || 0) < cost) {
            displayMessage(`Solde insuffisant pour ce booster ! (Manque ${(cost - (user.balance || 0)).toFixed(2)}€)`, 'error');
            if (boosterMsg) boosterMsg.textContent = "💸 Solde insuffisant pour ce booster !";
            return;
        }

        const nowTs = now();
        
        // Tirage pondéré aléatoire sur toutes les saisons
        const drawn = drawWeightedRandomCards(cardCount, "season1");

        // Tri du moins rare au plus rare
        const rarityOrder = { 
            "Bronze-NR": 0, 
            "Bronze-R": 1, 
            "Silver-NR": 2, 
            "Silver-R": 3, 
            "Gold-NR": 4, 
            "Gold-R": 5, 
            "Espoir": 6, 
            "Icone": 7, 
            "Future-star": 8, 
            "Hist.Maker": 9, 
            "God": 10, 
            "Createur": 11,
            "PikaPika":12, 
            "BouBou" : 13
        };
        drawn.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

        // Préparer pour le stockage détaillé (persisted array)
        const persisted = drawn.map(c => ({
            code: c.code,
            nom: c.nom,
            rarity: c.rarity,
            obtainedAt: nowTs
        }));

        // ===============================================
        // ⚡️ NOUVELLE LOGIQUE DE QUANTITÉ (POUR L'ÉCHANGE)
        // ===============================================
        const existingQuantities = user.cards || {};
        const cardQuantityUpdates = {};
        let newTotalCards = user.totalBabyCards || 0;
        
        // 1. Calculer les nouvelles quantités
        persisted.forEach(card => {
            const currentCount = existingQuantities[card.code] || 0;
            cardQuantityUpdates[card.code] = currentCount + 1;
            newTotalCards++; // Chaque carte tirée augmente le total
        });
        
        // 2. Mise à jour de l'objet des quantités de cartes
        const finalCardQuantities = {
            ...existingQuantities, // Conserver les cartes non tirées
            ...cardQuantityUpdates // Écraser/mettre à jour les cartes tirées
        };
        
        // 3. Mise à jour de l'historique détaillé (pour la compatibilité)
        const updatedDeck = (user.babyDeck || []).concat(persisted);

        // Mise à jour unique vers Firebase
        await window.usersRef.child(window.currentUser.uid).update({
            // Mises à jour du compte et du temps
            balance: (user.balance || 0) - cost,
            lastBoosterTime: nowTs,
            
            // Nouvelle structure essentielle pour le trading
            cards: finalCardQuantities, 
            
            // Ancienne structure (historique)
            babyDeck: updatedDeck,
            totalBabyCards: newTotalCards
        });
        // ===============================================

        renderBabyDex();
        revealCards(persisted);
        displayMessage(`Booster ${cost}€ ouvert ! ${cardCount} cartes obtenues.`, 'success');
    });
}



function openFreeBooster(cardCount) {
    const boosterMsg = document.getElementById('booster-msg');
    
    if (!window.currentUser) return displayMessage("Connecte-toi pour obtenir le booster gratuit !", 'error');

    window.usersRef.child(window.currentUser.uid).once("value").then(async snap => {
        const user = snap.val() || {};
        const nowTs = now();
        const lastFree = user.lastFreeBoosterTime || 0;
        // COOLDOWN fixé à 2 heures
        const COOLDOWN = 2 * 60 * 60 * 1000;

        if (nowTs - lastFree < COOLDOWN) {
            // Calcul du temps restant en millisecondes
            const msRemaining = COOLDOWN - (nowTs - lastFree);
            
            // Conversion en minutes totales (arrondi supérieur)
            const totalMinutes = Math.ceil(msRemaining / 60000); 

            let timeDisplay;

            if (totalMinutes >= 60) {
                // Affichage en heures et minutes si le temps est >= 1 heure
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                // Construction du message (ex: "1 h et 30 min" ou juste "2 h")
                timeDisplay = `${hours} h` + (minutes > 0 ? ` et ${minutes} min` : '');
            } else {
                // Affichage en minutes seulement si le temps est < 1 heure
                timeDisplay = `${totalMinutes} min`;
            }
            
            // Message corrigé (sans **)
            const message = `⏱ Booster gratuit disponible dans ${timeDisplay}.`; 
            
            if (boosterMsg) boosterMsg.textContent = message;
            displayMessage(message, 'info');
            return;
        }

        // Tirage pondéré aléatoire sur toutes les saisons
        const drawn = drawWeightedRandomCards(cardCount, "season1");

        // Tri du moins rare au plus rare
        const rarityOrder = { 
            "Bronze-NR": 0, 
            "Bronze-R": 1, 
            "Silver-NR": 2, 
            "Silver-R": 3, 
            "Gold-NR": 4, 
            "Gold-R": 5, 
            "Espoir": 6, 
            "Icone": 7, 
            "Future-star": 8, 
            "Hist.Maker": 9, 
            "God": 10, 
            "Createur": 11,
            "PikaPika":12,
            "BouBou" : 13
        };
        drawn.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

        const persisted = drawn.map(c => ({
            code: c.code,
            nom: c.nom,
            rarity: c.rarity,
            obtainedAt: nowTs
        }));

        // ===============================================
        // ⚡️ NOUVELLE LOGIQUE DE QUANTITÉ (POUR L'ÉCHANGE)
        // ===============================================
        const existingQuantities = user.cards || {};
        const cardQuantityUpdates = {};
        let newTotalCards = user.totalBabyCards || 0;
        
        persisted.forEach(card => {
            const currentCount = existingQuantities[card.code] || 0;
            cardQuantityUpdates[card.code] = currentCount + 1;
            newTotalCards++;
        });

        const finalCardQuantities = {
            ...existingQuantities,
            ...cardQuantityUpdates
        };
        
        const updatedDeck = (user.babyDeck || []).concat(persisted);

        await window.usersRef.child(window.currentUser.uid).update({
            // Mise à jour du temps de cooldown
            lastFreeBoosterTime: nowTs,
            
            // Nouvelle structure essentielle pour le trading
            cards: finalCardQuantities,

            // Ancienne structure (historique)
            babyDeck: updatedDeck,
            totalBabyCards: newTotalCards
        });
        // ===============================================

        renderBabyDex();
        revealCards(persisted);
        if (boosterMsg) boosterMsg.textContent = "🎁 Booster gratuit ouvert !";
        displayMessage("Booster gratuit ouvert et cartes ajoutées au Baby-Dex !", 'success');
    });
}




function startFreeBoosterCountdown() {
// ... (Fonction existante - Code omis pour la clarté du code)
  if (!freeBoosterBtn) return; 

  // Utilisation de setInterval, mais elle peut être gourmande en ressources.
  // Une amélioration serait d'utiliser setTimeout et de la réactiver après le calcul.
  setInterval(() => {
    if (!window.currentUser) return;
    
    usersRef.child(window.currentUser.uid).once("value").then(snap => {
      const user = snap.val() || {};
      const lastFree = user.lastFreeBoosterTime || 0;
      const nowTs = now();
      
      const COOLDOWN = 2*60*60*1000;
      const remainingMs = COOLDOWN - (nowTs - lastFree);
      
      if (!freeBoosterBtn) return; 
      
      if (remainingMs > 0) {
        const min = Math.floor(remainingMs / 60000);
        const sec = Math.floor((remainingMs % 60000) / 1000);
        freeBoosterBtn.textContent = `Booster Gratuit (${min}m ${sec}s)`;
        freeBoosterBtn.disabled = true;
      } else {
        freeBoosterBtn.textContent = "Booster Gratuit Disponible !";
        freeBoosterBtn.disabled = false;
      }
    });
  }, 1000);
}

// =========================
// 🔹 BABY-DEX (rendu)
// =========================

function renderBabyDex() {
  // 1. Définir l'ordre de rareté (du moins rare: 0 au plus rare: 7)
  const RARITY_ORDER = {
    "Bronze-NR": 0,
    "Bronze-R": 1,
    "Silver-NR": 2,
    "Silver-R": 3,
    "Gold-NR": 4,
    "Gold-R": 5,
    "Espoir": 6,
    "Icone": 7,
    "Future-star": 8,
    "Hist.Maker": 9, // Basé sur la liste de la saison 1 fournie
    "Createur": 10,
    "God": 11,
    "PikaPika":12,
    "BouBou":13
    // Ajoutez ici d'autres raretés si nécessaire
  };

  if (!window.currentUser) return;

  const container = document.getElementById("baby-cards-container");
  if (!container) return;
  container.innerHTML = "";

  // Ciblage direct sur la 'season1'
  const season1Cards = window.codeToCardMap.season1 || {};
  const allCards = [];

  // Création du tableau de cartes à partir de la seule Saison 1
  for (const [code, info] of Object.entries(season1Cards)) {
    allCards.push({ code, nom: info.nom, rarity: info.rarity, season: 'season1' });
  }

  // 🛑 MODIFICATION CLÉ: Tri du tableau 'allCards' par rareté
  allCards.sort((a, b) => {
    const orderA = RARITY_ORDER[a.rarity] !== undefined ? RARITY_ORDER[a.rarity] : 100; // 100 si inconnu (mettre à la fin)
    const orderB = RARITY_ORDER[b.rarity] !== undefined ? RARITY_ORDER[b.rarity] : 100;

    // Trier par ordre de rareté
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // En cas d'égalité de rareté, trier par nom pour une cohérence
    return a.nom.localeCompare(b.nom);
  });
  // 🛑 FIN DE LA MODIFICATION CLÉ

  // Récupération des cartes possédées de l'utilisateur (méthode Firebase Realtime Database)
  usersRef.child(window.currentUser.uid).once("value").then(snap => {
    const user = snap.val() || {};
    // Assurez-vous que babyDeck est un tableau de {code: 'CODE', quantity: N}
    // Note: Dans le code précédent, vous utilisiez map(c => c.code), ce qui suppose que c est un objet avec une propriété code.
    // Si votre structure Firebase est { code1: {quantity: N}, code2: {quantity: N}, ...}, vous devrez adapter cette ligne.
    // En se basant sur la structure fournie: `new Set((user.babyDeck || []).map(c => c.code))`
    const ownedCodes = new Set((user.babyDeck || []).map(c => c.code));

    allCards.forEach(card => {
      const div = document.createElement("div");
      div.className = "baby-card-box"; 

      const img = document.createElement("img");
      img.src = `./images/${card.nom}`;
      img.style.width = "80px";
      img.style.borderRadius = "8px";
      img.style.margin = "5px";

      if (!ownedCodes.has(card.code)) {
        // Carte manquante: Grisée
        img.style.filter = "grayscale(100%)";
        img.style.opacity = 0.5;
      } else {
        // Carte possédée: Bordure or
        img.style.border = "2px solid gold"; 
      }

      const label = document.createElement("p");
      // Afficher la rareté
      label.textContent = `${card.rarity}`; 
      label.style.fontSize = "0.8rem";
      label.style.margin = "2px 0";
      label.style.textAlign = "center";
      
      // Ajouter un titre pour afficher le nom complet de la carte au survol (utile quand l'image est grisée)
      img.title = card.nom.replace('.png', '');

      div.appendChild(img);
      div.appendChild(label);
      container.appendChild(div);
    });
  });
}

// =========================
// 🔹 Événements boutons
// =========================
if (booster20Btn) booster20Btn.onclick = () => openBooster(35, 4);
if (booster50Btn) booster50Btn.onclick = () => openBooster(70, 6);
if (nextCardBtn) nextCardBtn.onclick = () => showNextCard();
if (freeBoosterBtn) freeBoosterBtn.onclick = () => openFreeBooster(4);

updateBoosterBalance();

window._app = {
  drawWeightedRandomCards,
  revealCards,
  openBooster,
  openFreeBooster,
  updateBoosterBalance,
  renderBabyDex,
  displayMessage // 💡 Ajout pour les tests éventuels
};




// =========================
// 🔹 BONUS QUOTIDIEN 5€ (24h après la création et ensuite toutes les 24h)
// =========================
function giveDailyBonus() {
// ... (Fonction existante - Code omis pour la clarté du code)
    if (!window.currentUser) return;

    const uid = window.currentUser.uid;
    const nowTs = Date.now();
    const COOLDOWN = 24 * 60 * 60 * 1000; // 24 heures en ms
    const lastBonusKey = "lastDailyBonus_" + uid;

    // Récupérer la date de création du compte depuis Firebase
    usersRef.child(uid).once("value").then(snap => {
        const user = snap.val() || {};
        const accountCreatedAt = user.createdAt || 0;

        // Vérifier si 24h se sont écoulées depuis la création du compte
        if (nowTs - accountCreatedAt < COOLDOWN) {
            const remainingMs = COOLDOWN - (nowTs - accountCreatedAt);
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

            displayMessage(`⏳ Bonus disponible dans ${hours}h ${minutes}m ${seconds}s`, "info");
            return;
        }

        // Vérifier la date du dernier bonus
        const lastBonusTs = user.lastBonusTimestamp || 0;

        if (nowTs - lastBonusTs < COOLDOWN) {
            // Il reste du temps avant le prochain bonus
            const remainingMs = COOLDOWN - (nowTs - lastBonusTs);
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

            displayMessage(`⏳ Bonus disponible dans ${hours}h ${minutes}m ${seconds}s`, "info");
            return;
        }

        // Donne le bonus
        const currentBalance = parseFloat(user.balance || 0);
        const newBalance = currentBalance + 5;

        // Mettez à jour le solde et le dernier timestamp du bonus dans Firebase
        usersRef.child(uid).update({
            balance: newBalance,
            lastBonusTimestamp: nowTs
        }).then(() => {
            displayMessage("🎉 Bonus de 5€ débloqué !", "success");
            updateBoosterBalance();
        });
    });
}

// Donne le bonus au chargement si connecté
window.addEventListener("load", () => {
    giveDailyBonus();
});


// Fonction pour vérifier si l'utilisateur est un admin et afficher l'onglet
// DANS app.js, dans checkAdminStatus()
function checkAdminStatus() {
// ... (Fonction existante - Code omis pour la clarté du code)
    const adminBtn = document.getElementById('admin-btn');
    if (window.currentUser && window.currentUser.isAdmin) {
        adminBtn.style.display = 'inline-block';
        
        // 🚨 NOUVEAU LISTENER : Notifications en temps réel des signalements
        window.reportsRef.on('child_added', snapshot => {
            if (window.currentUser.isAdmin && snapshot.val()) {
                const report = snapshot.val();
                // Afficher une alerte ou un message discret pour l'admin
                displayMessage(`🔔 NOUVEAU SIGNALEMENT : ${report.type}`, 'warning');
                // Optionnel : Ajouter un badge sur le bouton admin
                adminBtn.textContent = '👨‍💼 Admin (Nouveau)';
            }
        });

    } else {
        adminBtn.style.display = 'none';
        // S'assurer de retirer le listener si l'utilisateur n'est plus admin
        window.reportsRef.off('child_added'); 
    }
}

// Appeler cette fonction après la connexion ou lors du chargement de la page
window.onload = () => {
    checkAdminStatus();
    window.showSection('login-section');
};

// Fonction pour charger les signalements depuis Firebase
// DANS app.js (ou le script admin)

/**
 * Charge les informations détaillées d'un utilisateur signalé et les affiche
 * dans l'élément HTML correspondant au rapport individuel.
 */
function loadReportedUserInfo(uid, reportId) {
    const userInfoDiv = document.getElementById(`user-info-${reportId}`);
    
    // Si l'UID n'a pas pu être extrait
    if (uid === 'UNKNOWN_UID' || !uid) {
        userInfoDiv.innerHTML = `<p style="color:red; font-weight:bold;">⚠️ Impossible de charger les infos : UID non trouvé dans le message.</p>`;
        return;
    }

    // Récupération des données utilisateur détaillées
    window.usersRef.child(uid).once('value').then(snap => {
        const user = snap.val();
        if (user) {
            // 🛠️ CORRIGÉ : Priorise 'name' puis 'pseudo'. Solde en Octets.
            userInfoDiv.innerHTML = `
                <div style="border-left: 3px solid #03a9f4; padding-left: 10px; margin-top: 10px; font-size: 0.9em; text-align: left;">
                    <p style="margin: 0;"><strong>UID :</strong> ${uid}</p>
                    <p style="margin: 0;"><strong>Nom/Pseudo :</strong> ${user.name || user.pseudo || 'Inconnu'}</p>
                    <p style="margin: 0;"><strong>Statut Admin :</strong> <span style="font-weight: bold; color: ${user.isAdmin ? '#f44336' : '#4caf50'};">${user.isAdmin ? 'OUI' : 'NON'}</span></p>
                    <p style="margin: 0;"><strong>Solde :</strong> ${user.balance ? user.balance.toFixed(2) + ' Octets' : '0.00 Octets'}</p>
                    <p style="margin: 0;"><strong>Total Gagné :</strong> ${user.totalWon ? user.totalWon.toFixed(2) + ' €' : 'N/A'}</p>
                </div>
            `;
        } else {
            userInfoDiv.innerHTML = `<p style="color: orange;">Utilisateur avec UID ${uid} introuvable dans la base de données.</p>`;
        }
    });
}







// DANS app.js (ou le script admin)

function loadReportedUserInfo(uid, reportId) {
// ... (Fonction existante - Code omis pour la clarté du code)
    const userInfoDiv = document.getElementById(`user-info-${reportId}`);
    
    window.usersRef.child(uid).once('value').then(snap => {
        const user = snap.val();
        if (user) {
            userInfoDiv.innerHTML = `
                <p><strong>Utilisateur (UID):</strong> ${user.name || 'Inconnu'} (${uid})</p>
                <p><strong>Statut Admin :</strong> ${user.isAdmin ? 'OUI' : 'NON'}</p>
                <p><strong>Solde :</strong> ${user.balance ? user.balance.toFixed(2) + ' €' : 'N/A'}</p>
                <p><strong>Total Gagné :</strong> ${user.totalWon ? user.totalWon.toFixed(2) + ' €' : 'N/A'}</p>
            `;
        } else {
            userInfoDiv.innerHTML = `<p>Utilisateur avec UID ${uid} introuvable.</p>`;
        }
    });
}

// DANS app.js (ou le script admin)

function attachAdminActionListeners() {
// ... (Fonction existante - Code omis pour la clarté du code)
    // Événement pour bloquer le compte
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.onclick = (e) => {
            const uid = e.target.getAttribute('data-uid');
            if (confirm(`Êtes-vous sûr de vouloir BLOQUER l'utilisateur ${uid} ?`)) {
                // Mettre à jour Firebase: définir un flag 'isBlocked: true'
                window.usersRef.child(uid).update({ isBlocked: true })
                    .then(() => displayMessage(`Compte ${uid} BLOQUÉ.`, 'success'))
                    .catch(err => displayMessage(`Erreur lors du blocage: ${err.message}`, 'error'));
            }
        };
    });

    // Événement pour afficher un message (simple alert côté client ici)
    document.querySelectorAll('.message-btn').forEach(btn => {
        btn.onclick = (e) => {
            const uid = e.target.getAttribute('data-uid');
            const message = prompt(`Entrez le message à afficher pour l'utilisateur ${uid} à la prochaine connexion:`);
            if (message) {
                // Vous devriez enregistrer le message dans Firebase pour que l'utilisateur le voie au login
                window.usersRef.child(uid).update({ adminMessage: message })
                    .then(() => displayMessage(`Message enregistré pour ${uid}.`, 'success'))
                    .catch(err => displayMessage(`Erreur lors de l'envoi du message: ${err.message}`, 'error'));
            }
        };
    });

    // Événement pour marquer le signalement comme résolu (le supprime de la liste)
    document.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.onclick = (e) => {
            const reportId = e.target.getAttribute('data-id');
            if (confirm(`Marquer le signalement ${reportId} comme résolu ?`)) {
                window.reportsRef.child(reportId).remove()
                    .then(() => {
                        displayMessage('Signalement marqué comme résolu et supprimé.', 'success');
                        loadSuspiciousReports(); // Recharger la liste
                    })
                    .catch(err => displayMessage(`Erreur lors de la suppression: ${err.message}`, 'error'));
            }
        };
    });
}

// DANS app.js


// Nouvelle fonction pour gérer les actions dans le panneau des demandes
function attachRequestActionListeners() {
// ... (Fonction existante - Code omis pour la clarté du code)
    // 1. Débloquer l'utilisateur (et supprimer le rapport)
    document.querySelectorAll('.unblock-request-btn').forEach(btn => {
        btn.onclick = (e) => {
            const uid = e.target.getAttribute('data-uid');
            const reportId = e.target.getAttribute('data-id');
            
            if (confirm(`Êtes-vous sûr de vouloir DÉBLOQUER l'utilisateur ${uid} ?`)) {
                // Débloquer l'utilisateur dans la base
                window.usersRef.child(uid).update({ isBlocked: null })
                    .then(() => {
                        // Supprimer la demande de la liste des rapports
                        return window.reportsRef.child(reportId).remove();
                    })
                    .then(() => {
                        displayMessage(`Compte ${uid} débloqué et demande traitée.`, 'success');
                        loadReactivationRequests(); // Recharger la liste
                        // Optionnel : Recharger aussi la liste des utilisateurs bloqués si l'admin est sur cet onglet
                        if (document.getElementById('blockedUsersPanel').style.display === 'block') {
                            loadBlockedUsers();
                        }
                    })
                    .catch(err => displayMessage(`Erreur de traitement: ${err.message}`, 'error'));
            }
        };
    });

    // 2. Marquer la demande comme Traitée (et supprimer le rapport)
    document.querySelectorAll('.resolve-request-btn').forEach(btn => {
        btn.onclick = (e) => {
            const reportId = e.target.getAttribute('data-id');
            if (confirm(`Marquer cette demande comme Traitée et la supprimer ?`)) {
                window.reportsRef.child(reportId).remove()
                    .then(() => {
                        displayMessage('Demande marquée comme traitée et supprimée.', 'success');
                        loadReactivationRequests(); // Recharger la liste
                    })
                    .catch(err => displayMessage(`Erreur lors de la suppression: ${err.message}`, 'error'));
            }
        };
    });
}

// ===================================
// ⭐️ NOUVELLE FONCTIONNALITÉ: GESTION DU PROFIL ET DES STATS
// ===================================

/**
 * Met à jour les éléments de statistiques sur la page.
 */
function updateProfileStats(stats) {
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const earnings = stats.earnings || 0;

    const ratio = (wins + losses) > 0 ? (wins / (wins + losses)).toFixed(2) : '0.00';

    const statsWins = document.getElementById('stats-wins');
    const statsLosses = document.getElementById('stats-losses');
    const statsRatio = document.getElementById('stats-ratio');
    const statsBetEarnings = document.getElementById('stats-bet-earnings');

    if (statsWins) statsWins.textContent = wins;
    if (statsLosses) statsLosses.textContent = losses;
    if (statsRatio) statsRatio.textContent = ratio;
    if (statsBetEarnings) statsBetEarnings.textContent = `${earnings.toFixed(2)} €`;
}

// ⚡️ CORRECTION DU CHANGEMENT DE PSEUDO (Utilise Realtime DB)
if (changePseudoForm) {
    changePseudoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = window.currentUser;
        const newPseudo = newPseudoInput.value.trim();

        if (!user) {
            pseudoMessage.textContent = "Vous devez être connecté pour changer de pseudo.";
            pseudoMessage.style.color = 'red';
            return;
        }

        if (newPseudo.length < 3) {
            pseudoMessage.textContent = "Le pseudo doit contenir au moins 3 caractères.";
            pseudoMessage.style.color = 'orange';
            return;
        }

        try {
            // ⚡️ CORRECTION 1 : Utiliser l'objet utilisateur ACTUEL de l'Auth API
            const firebaseUser = firebase.auth().currentUser;
            
            if (!firebaseUser) {
                // Ce cas ne devrait pas arriver si window.currentUser existe, mais c'est une sécurité
                pseudoMessage.textContent = "Erreur d'authentification. Veuillez vous reconnecter.";
                pseudoMessage.style.color = 'red';
                return;
            }

            // 1. Mettre à jour le displayName de l'objet Firebase Auth
            await firebaseUser.updateProfile({ // ⬅️ APPEL CORRIGÉ
                displayName: newPseudo
            });
            
            // 2. Mettre à jour le pseudo dans la base de données Realtime (window.usersRef)
            await window.usersRef.child(user.uid).update({
                name: newPseudo, 
                pseudo: newPseudo
            });

            // ... le reste de votre code (Mise à jour de window.currentUser, affichage, etc.)
// ...
            
            // 2. Mettre à jour le pseudo dans la base de données Realtime (window.usersRef)
            // C'EST LE FIX CRITIQUE : on met à jour le champ 'name' utilisé par loginSuccess
            await window.usersRef.child(user.uid).update({
                name: newPseudo, 
                pseudo: newPseudo // On garde 'pseudo' si vous l'utilisez ailleurs
            });

            // 3. Mettre à jour l'objet global et l'affichage
            if (window.currentUser) {
                window.currentUser.name = newPseudo;
                localStorage.setItem("currentUser", JSON.stringify(window.currentUser));
            }

            // 4. Mettre à jour l'affichage sur la page
            document.getElementById('user-info').textContent = `Utili   sateur : ${newPseudo}`;
            
            pseudoMessage.textContent = `✅ Pseudo mis à jour : ${newPseudo}`;
            pseudoMessage.style.color = 'green';
            newPseudoInput.value = ''; // Vider le champ

        } catch (error) {
            console.error("Erreur lors de la mise à jour du pseudo : ", error);
            pseudoMessage.textContent = "❌ Échec de la mise à jour du pseudo. Réessayez.";
            pseudoMessage.style.color = 'red';
        }
    });
}


// ===================================
// ⭐️ NOUVELLE FONCTIONNALITÉ: GESTION DES AMIS
// ===================================

/**
 * 1. CHARGEMENT ET AFFICHAGE DES AMIS ACTUELS
 */
// ===============================================
// 🔄 Fonction loadFriendList (Actualisation en temps réel des amis et de leurs pseudos)
// ===============================================
// Stocke les listeners pour les pseudos des amis pour les annuler.
window.friendPseudoListeners = {}; 

function loadFriendList() {
    if (!window.currentUser || !friendListContainer) return;

    const friendsRef = usersRef.child(window.currentUser.uid).child('friends');
    
    // Annuler tous les anciens listeners de pseudos au cas où l'utilisateur change
    Object.values(window.friendPseudoListeners).forEach(ref => ref.off());
    window.friendPseudoListeners = {}; 

    // Écouteur principal pour la LISTE des amis (ajout/suppression)
    friendsRef.on('value', async (snapshot) => {
        // Nettoyer l'affichage
        friendListContainer.innerHTML = '';
        const friendsData = snapshot.val();
        const friendUids = friendsData ? Object.keys(friendsData) : [];
        
        if (friendCountSpan) friendCountSpan.textContent = friendUids.length;

        if (friendUids.length === 0) {
            friendListContainer.innerHTML = '<li>Vous n\'avez pas encore d\'amis.</li>';
            return;
        }

        // --- 🟢 Charger et S'abonner aux PSEUDOS des amis ---
        friendUids.forEach(uid => {
            const friendRef = usersRef.child(uid);
            
            // 🛑 Vérifie si le listener pour ce pseudo est déjà actif pour éviter les doublons
            if (window.friendPseudoListeners[uid]) {
                // Si l'écouteur existe, on ne le recrée pas.
                // On s'assure juste que l'élément DOM de l'ami sera mis à jour.
                return; 
            }

            // Créer un élément LI DOM une seule fois pour cet ami
            const li = document.createElement('li');
            li.setAttribute('data-friend-uid', uid);
            friendListContainer.appendChild(li);

            // S'abonner aux changements du pseudo de l'ami
            friendRef.on('value', friendSnap => {
                const friendData = friendSnap.val();
                
                if (friendData && friendSnap.exists()) {
                    // Mettre à jour le LI existant
                    li.textContent = `🤝 ${friendData.name || 'Utilisateur Inconnu'}`;
                } else {
                    // Cas où l'ami n'existe plus ou a été supprimé
                    li.textContent = `❌ Utilisateur supprimé (${uid})`;
                }
            });

            // Sauvegarder la référence de l'écouteur du pseudo
            window.friendPseudoListeners[uid] = friendRef;
        });

        console.log(`Liste d'amis mise à jour. ${friendUids.length} écouteurs de pseudos actifs.`);
    });
    
    // ⚠️ Stocker la référence principale pour l'annuler à la déconnexion
    window.firebaseListeners.friendsList = friendsRef; 
}

/**
 * 2. CHARGEMENT ET AFFICHAGE DES DEMANDES D'AMIS REÇUES
 */
function loadFriendRequests() {
    const uid = window.currentUser.uid;
    const receivedRef = firebase.database().ref(`users/${uid}/friendRequests/received`);
    
    // Annuler l'ancien listener si l'utilisateur change (sécurité)
    if (window.firebaseListeners.friendRequests) {
        window.firebaseListeners.friendRequests.off();
    }
    
    // NOUVEAU: ABONNEMENT EN TEMPS RÉEL
    receivedRef.on('value', snapshot => {
        const receivedRequests = snapshot.val() || {};
        
        // 👈 Appelez ici la fonction qui met à jour le DOM
        renderFriendRequestsUI(receivedRequests);
        
        console.log("Liste des requêtes reçues mise à jour en temps réel.");
    });
    
    // Stocker la nouvelle référence pour pouvoir l'annuler
    window.firebaseListeners.friendRequests = receivedRef;
}

/**
 * 3. LOGIQUE D'ACCEPTATION/REJET DES DEMANDES
 * @param {string} senderUid - UID de l'utilisateur qui a envoyé la demande
 * @param {string} action - 'accept' ou 'reject'
 * @param {string} senderName - Pseudo de l'émetteur
 */
async function handleFriendRequest(senderUid, action, senderName) {
    const myUid = window.currentUser.uid;
    const myName = window.currentUser.name;

    try {
        // Supprimer la demande reçue (pour moi)
        await usersRef.child(myUid).child('friendRequests/received').child(senderUid).remove();
        
        // Supprimer la demande envoyée (pour l'émetteur)
        await usersRef.child(senderUid).child('friendRequests/sent').child(myUid).remove();
        
        if (action === 'accept') {
            // Ajouter comme ami dans les deux sens
            await usersRef.child(myUid).child('friends').child(senderUid).set(true);
            await usersRef.child(senderUid).child('friends').child(myUid).set(true);
            
            displayMessage(`✅ Vous êtes maintenant ami avec ${senderName} !`, 'success');
        } else {
            displayMessage(`❌ Vous avez refusé la demande de ${senderName}.`, 'info');
        }
        
        // La fonction loadFriendRequests se rafraîchira automatiquement grâce à l'écouteur 'on'
        
    } catch (error) {
        console.error(`Erreur lors de l'action ${action} sur la demande d'ami :`, error);
        displayMessage(`❌ Échec de l'action. Réessayez.`, 'error');
    }
}


/**
 * 4. GESTION DE L'ENVOI DE LA DEMANDE D'AMI
 */
if (addFriendForm) {
    addFriendForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Références DOM pour le formulaire et le message
        const friendUsernameInput = document.getElementById('friend-username');
        const friendRequestMessage = document.getElementById('friend-request-message');
        
        const sender = window.currentUser;
        const targetPseudo = friendUsernameInput.value.trim();

        // Réinitialisation du message
        friendRequestMessage.textContent = '';
        friendRequestMessage.style.color = 'red';

        if (!sender) {
            friendRequestMessage.textContent = "Connectez-vous pour envoyer une demande.";
            friendRequestMessage.style.color = 'red';
            return;
        }

        if (sender.name.toLowerCase() === targetPseudo.toLowerCase()) {
            friendRequestMessage.textContent = "Vous ne pouvez pas vous ajouter vous-même.";
            friendRequestMessage.style.color = 'orange';
            return;
        }

        try {
            // =========================================================
            // ⚡️ FIX CRITIQUE 1 : Recherche de l'UID par pseudo (Insensible à la casse)
            // =========================================================
            const usersSnapshot = await usersRef.once('value');
            let targetUid = null;
            let foundTargetPseudo = null; // Pour stocker le pseudo exact dans la DB (casse respectée)

            usersSnapshot.forEach(childSnapshot => {
                const userData = childSnapshot.val();
                
                // Comparaison insensible à la casse
                if (userData.name && userData.name.toLowerCase() === targetPseudo.toLowerCase()) {
                    targetUid = childSnapshot.key; // On récupère l'UID
                    foundTargetPseudo = userData.name; // On stocke le pseudo exact de la DB
                    return true; // Arrête la boucle forEach
                }
            });

            if (!targetUid) {
                friendRequestMessage.textContent = "❌ Utilisateur non trouvé.";
                friendRequestMessage.style.color = 'red';
                return;
            }
            
            // On utilise le pseudo exact trouvé si on a fait une recherche insensible à la casse
            // Si le pseudo est sensible à la casse (ex: "Alex" vs "alex"), la demande sera faite au bon user.
            const finalTargetPseudo = foundTargetPseudo || targetPseudo; 


            // 2. Vérifier si l'amitié existe déjà ou si une demande est en cours (LOGIQUE CONSERVÉE)
            const friendsData = await usersRef.child(sender.uid).child('friends').once('value');
            if (friendsData.hasChild(targetUid)) {
                friendRequestMessage.textContent = `🟡 Vous êtes déjà ami avec ${finalTargetPseudo}.`;
                friendRequestMessage.style.color = 'orange';
                return;
            }

            const sentRequests = await usersRef.child(sender.uid).child('friendRequests/sent').once('value');
            if (sentRequests.hasChild(targetUid)) {
                friendRequestMessage.textContent = `🟡 Demande déjà envoyée à ${finalTargetPseudo}.`;
                friendRequestMessage.style.color = 'orange';
                return;
            }
            
            // ====================================================================
            // ⚡️ FIX CRITIQUE 2 : Envoyer la demande (Écriture avec les métadonnées)
            // ====================================================================
            
            const senderData = { pseudo: sender.name, timestamp: Date.now() };
            const receiverData = { pseudo: finalTargetPseudo, timestamp: Date.now() };

            // Écriture chez le destinataire : Il reçoit l'info de QUI a envoyé (le pseudo de l'expéditeur)
            // C'est cette ligne qui fait que l'utilisateur reçoit la demande.
            await usersRef.child(targetUid).child('friendRequests/received').child(sender.uid).set(senderData);
            
            // Écriture chez l'expéditeur : Il garde l'info à QUI il a envoyé (le pseudo du destinataire)
            await usersRef.child(sender.uid).child('friendRequests/sent').child(targetUid).set(receiverData);
            
            // 4. Mettre à jour la liste des demandes envoyées immédiatement (optionnel, si vous avez une fonction loadFriendRequests)
            if (typeof loadFriendRequests === 'function') {
                loadFriendRequests();
            }
            
            friendRequestMessage.textContent = `✅ Demande d'ami envoyée à ${finalTargetPseudo} !`;
            friendRequestMessage.style.color = 'green';
            friendUsernameInput.value = '';

        } catch (error) {
            console.error("Erreur lors de l'envoi de la demande d'ami :", error);
            friendRequestMessage.textContent = "❌ Échec de l'envoi. Erreur interne.";
            friendRequestMessage.style.color = 'red';
        }
    });
}


/**
 * Charge et affiche les demandes d'amis reçues pour l'utilisateur actuel.
 * Cette fonction est appelée lors du chargement de la section 'Profil'.
 */
async function loadFriendRequests() {
    const requestsListEl = document.getElementById('friend-requests-list');
    
    // Si la liste n'existe pas (mauvaise section affichée), on sort.
    if (!requestsListEl) return; 

    requestsListEl.innerHTML = ''; // Nettoyer la liste avant de la remplir

    const currentUser = window.currentUser;

    if (!currentUser || !currentUser.uid) {
        requestsListEl.innerHTML = '<li>Connectez-vous pour voir les demandes.</li>';
        return;
    }

    try {
        // 1. Lire les demandes reçues dans la base de données
        const path = `users/${currentUser.uid}/friendRequests/received`;
        const snapshot = await firebase.database().ref(path).once('value');
        const requests = snapshot.val();
        
        if (!requests) {
            requestsListEl.innerHTML = '<li>Aucune demande d\'ami reçue pour le moment.</li>';
            return;
        }

        let requestCount = 0;

        // 2. Parcourir les demandes et créer le HTML
        for (const senderUid in requests) {
            const requestData = requests[senderUid];
            const senderPseudo = requestData.pseudo || 'Utilisateur inconnu'; // Utilise le pseudo stocké
            requestCount++;

            const li = document.createElement('li');
            li.innerHTML = `
                <span>${senderPseudo}</span>
                <div>
                    <button class="action-btn accept-request-btn" data-uid="${senderUid}" data-pseudo="${senderPseudo}">Accepter</button>
                    <button class="finish-btn reject-request-btn" data-uid="${senderUid}">Refuser</button>
                </div>
            `;
            requestsListEl.appendChild(li);
        }

        // 3. Attacher les écouteurs d'événements aux boutons nouvellement créés
        attachFriendRequestListeners();
        
        // Optionnel : Ajouter un badge de notification si vous avez un endroit pour l'afficher.
        // if (requestCount > 0) { /* Code pour afficher la notification */ }

    } catch (error) {
        console.error("Erreur lors du chargement des demandes d'amis :", error);
        requestsListEl.innerHTML = '<li>Erreur de chargement.</li>';
    }
}



/**
 * Logique pour accepter une demande d'ami.
 * Effectue une double écriture (ami chez l'expéditeur et ami chez le destinataire)
 * et une double suppression (suppression de la demande envoyée et reçue).
 * @param {string} senderUid UID de l'utilisateur qui a envoyé la demande.
 * @param {string} senderPseudo Pseudo de l'utilisateur qui a envoyé la demande.
 */
async function acceptFriendRequest(senderUid, senderPseudo) {
    const receiver = window.currentUser;
    const receiverPseudo = receiver.name;
    const usersRef = window.usersRef; // Assurez-vous que cette référence est globale

    if (!receiver || !usersRef) return displayMessage("Erreur interne: Connexion manquante.", 'error');

    try {
        // --- 1. Écriture chez l'expéditeur (Sender) ---
        // Ajout du destinataire (Receiver) à la liste des amis de l'expéditeur
        await usersRef.child(senderUid).child('friends').child(receiver.uid).set({
            pseudo: receiverPseudo,
            addedAt: Date.now()
        });
        // Suppression de la demande envoyée de l'expéditeur vers le destinataire
        await usersRef.child(senderUid).child('friendRequests/sent').child(receiver.uid).remove();


        // --- 2. Écriture chez le destinataire (Receiver - l'utilisateur actuel) ---
        // Ajout de l'expéditeur (Sender) à la liste des amis de l'utilisateur actuel
        await usersRef.child(receiver.uid).child('friends').child(senderUid).set({
            pseudo: senderPseudo,
            addedAt: Date.now()
        });
        // Suppression de la demande reçue de l'utilisateur actuel
        await usersRef.child(receiver.uid).child('friendRequests/received').child(senderUid).remove();

        
        // --- 3. Mise à jour de l'interface ---
        // Met à jour les demandes reçues
        if (typeof loadFriendRequests === 'function') loadFriendRequests(); 
        // Met à jour la liste des amis
        if (typeof loadFriendsList === 'function') loadFriendsList(); 

        displayMessage(`✅ Vous êtes maintenant ami avec ${senderPseudo} !`, 'success');

    } catch (error) {
        console.error("Erreur lors de l'acceptation de la demande :", error);
        displayMessage("❌ Échec de l'acceptation de la demande. Réessayez.", 'error');
    }
}


/**
 * Logique pour refuser une demande d'ami.
 * Supprime la référence de la demande chez l'expéditeur et le destinataire.
 * @param {string} senderUid UID de l'utilisateur qui a envoyé la demande.
 */
async function rejectFriendRequest(senderUid) {
    const receiver = window.currentUser;
    const usersRef = window.usersRef;

    if (!receiver || !usersRef) return displayMessage("Erreur interne: Connexion manquante.", 'error');

    try {
        // Suppression de la demande reçue par l'utilisateur actuel
        await usersRef.child(receiver.uid).child('friendRequests/received').child(senderUid).remove();
        
        // Suppression de la demande envoyée chez l'expéditeur
        await usersRef.child(senderUid).child('friendRequests/sent').child(receiver.uid).remove();

        // Mise à jour de la liste des demandes reçues
        if (typeof loadFriendRequests === 'function') loadFriendRequests(); 

        displayMessage("ℹ️ Demande d'ami refusée.", 'info');

    } catch (error) {
        console.error("Erreur lors du refus de la demande :", error);
        displayMessage("❌ Échec du refus de la demande. Réessayez.", 'error');
    }
}


/**
 * Attache les écouteurs d'événements aux boutons d'acceptation et de refus.
 * Cette fonction DOIT être appelée après la création dynamique des éléments (dans loadFriendRequests).
 */
function attachFriendRequestListeners() {
    // Écouteurs pour les boutons Accepter
    document.querySelectorAll('.accept-request-btn').forEach(button => {
        // Utilise once pour éviter les doubles clics/appels si la fonction est appelée plusieurs fois
        button.onclick = async () => {
            const senderUid = button.getAttribute('data-uid');
            const senderPseudo = button.getAttribute('data-pseudo');
            await acceptFriendRequest(senderUid, senderPseudo);
        };
    });

    // Écouteurs pour les boutons Refuser
    document.querySelectorAll('.reject-request-btn').forEach(button => {
        // Utilise once pour éviter les doubles clics/appels si la fonction est appelée plusieurs fois
        button.onclick = async () => {
            const senderUid = button.getAttribute('data-uid');
            await rejectFriendRequest(senderUid);
        };
    });
}


// ====================================================
// 🔄 SYSTÈME D'ÉCHANGE DE CARTES
// ====================================================

// Assurez-vous que cette variable est déclarée au début de app.js
window.firebaseListeners = window.firebaseListeners || {}; 

// Variable globale pour stocker les sélections de cartes de l'échange en cours
let tradeSelection = {
    offer: [], // Cartes de l'utilisateur à offrir (codes)
    request: [] // Cartes de l'ami à demander (codes)
};

/**
 * Retrouve l'objet carte complet à partir de son code.
 * Nécessite que 'window.codeToCardMap' soit chargé.
 */
function findCardByCode(code) {
    if (!window.codeToCardMap) return null;
    for (const seasonKey in window.codeToCardMap) {
        if (window.codeToCardMap[seasonKey][code]) {
            return window.codeToCardMap[seasonKey][code];
        }
    }
    return null;
}

/**
 * Fonction principale pour charger toutes les données de la section Échange.
 */
function loadTradeData() {
    loadFriendsForTrade();
    loadActiveTrades(); // Maintenant en temps réel
}

/**
 * Charge la liste des amis de l'utilisateur actuel et les insère dans le sélecteur d'échange.
 * NOTE: Cette fonction peut rester en .once() car la liste d'amis est déjà gérée en TdR
 * par loadFriendList. Nous n'avons besoin de la charger qu'au moment d'ouvrir le formulaire.
 */
async function loadFriendsForTrade() {
    const friendSelect = document.getElementById('trade-friend-select');
    friendSelect.innerHTML = '<option value="">-- Choisir un ami --</option>';

    const currentUser = window.currentUser;
    if (!currentUser) return;

    try {
        const friendsSnapshot = await window.usersRef.child(currentUser.uid).child('friends').once('value');
        const friends = friendsSnapshot.val();

        if (friends) {
            // Pour chaque ami, on récupère le pseudo (pas seulement l'UID)
            const friendUids = Object.keys(friends);
            
            // Attendre la résolution de toutes les promesses de pseudo
            const friendPromises = friendUids.map(uid => 
                window.usersRef.child(uid).once('value')
            );
            const friendSnaps = await Promise.all(friendPromises);

            friendSnaps.forEach((friendSnap) => {
                const friendUid = friendSnap.key;
                const friendData = friendSnap.val();

                // On utilise le pseudo réel stocké dans la DB
                const pseudo = friendData?.name || `Utilisateur Inconnu (${friendUid})`;

                const option = document.createElement('option');
                option.value = friendUid;
                option.textContent = pseudo;
                friendSelect.appendChild(option);
            });
        } else {
            friendSelect.innerHTML = '<option value="">Vous n\'avez pas d\'amis.</option>';
        }
        
        // Attacher l'écouteur après le chargement
        friendSelect.onchange = loadCardsForTradeSelection;

    } catch (error) {
        console.error("Erreur de chargement des amis pour l'échange :", error);
    }
}

/**
 * Charge les cartes de l'utilisateur et de l'ami sélectionné dans le formulaire.
 */
async function loadCardsForTradeSelection() {
    const friendSelect = document.getElementById('trade-friend-select');
    const friendUid = friendSelect.value;
    const userOfferContainer = document.getElementById('user-cards-to-offer');
    const friendRequestContainer = document.getElementById('friend-cards-to-request');
    const currentUser = window.currentUser;

    tradeSelection = { offer: [], request: [] }; // Réinitialiser
    
    if (!friendUid || !currentUser) {
        userOfferContainer.innerHTML = '<p>Sélectionnez un ami pour commencer.</p>';
        friendRequestContainer.innerHTML = '<p>Sélectionnez un ami pour voir sa collection.</p>';
        return;
    }

    try {
        // --- 1. Cartes de l'utilisateur actuel (à offrir - DOUBLONS) ---
        const userCardsSnapshot = await window.usersRef.child(currentUser.uid).child('cards').once('value');
        const userQuantities = userCardsSnapshot.val() || {};
        
        const userOfferableCards = {};
        for (const code in userQuantities) {
            if (userQuantities[code] > 0) {
                userOfferableCards[code] = userQuantities[code] - 1; // Quantité disponible
            }
        }
        
        renderSelectableCards(userOfferContainer, userOfferableCards, 'offer');
        
        // --- 2. Cartes de l'ami sélectionné (à demander) ---
        const friendCardsSnapshot = await window.usersRef.child(friendUid).child('cards').once('value');
        const friendQuantities = friendCardsSnapshot.val() || {};

        renderSelectableCards(friendRequestContainer, friendQuantities, 'request');

    } catch (error) {
        console.error("Erreur de chargement des collections pour l'échange :", error);
        userOfferContainer.innerHTML = '<p>Erreur de chargement.</p>';
        friendRequestContainer.innerHTML = '<p>Erreur de chargement.</p>';
    }
}

/**
 * Génère et attache le HTML des cartes et les écouteurs de sélection.
 * Remplace generateCardListHTML et attachCardSelectionListeners.
 */
function renderSelectableCards(container, cardQuantities, type) {
    container.innerHTML = '';
    container.className = 'babydex-grid trade-cards-slider-container'; 

    let cardCount = 0;
    
    for (const seasonKey in window.codeToCardMap) {
        for (const cardCode in window.codeToCardMap[seasonKey]) {
            const card = window.codeToCardMap[seasonKey][cardCode];
            const quantity = cardQuantities[cardCode] || 0;

            if (quantity > 1) {
                cardCount++;
                const rarityClass = `rarity-${card.rarity.replace(/[^a-zA-Z0-9]/g, '-')}`;
                const isSelected = tradeSelection[type].includes(cardCode);
                const class_name = type === 'offer' ? 'selected-offer' : 'selected-request';

                const quantityBadge = type === 'offer' 
                    ? `<span class="card-quantity-badge" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; padding: 4px 8px; font-size: 0.7rem; z-index: 1;">x${quantity}</span>`
                    : '';

                const div = document.createElement("div");
                div.className = `baby-card-box-small card-item ${isSelected ? class_name : ''}`;
                div.dataset.code = cardCode;
                div.dataset.type = type;
                div.style.position = 'relative';

                div.innerHTML = `
                    ${quantityBadge}
                    <span class="card-rarity ${rarityClass}" style="font-size:0.6rem;">${card.rarity}</span>
                    <img src="./images/${card.nom}" alt="${card.nom}">
                    <p style="font-size: 0.65rem; margin: 2px 0;">${cardCode}</p>
                `;

                // Attacher l'écouteur de clic
                div.onclick = () => handleCardSelection(div, cardCode, type);
                container.appendChild(div);
            }
        }
    }
    
    if (cardCount === 0) {
        const message = (type === 'offer') 
            ? 'Vous n\'avez pas de cartes en double disponibles à l\'échange.'
            : 'Cet ami n\'a pas de cartes.';
        container.innerHTML = `<p style="grid-column: 1 / -1;">${message}</p>`;
    }
}

/**
 * Gère le clic de sélection/désélection d'une carte.
 */
function handleCardSelection(cardEl, code, type) {
    const array = tradeSelection[type];
    const class_name = type === 'offer' ? 'selected-offer' : 'selected-request';
    
    if (array.includes(code)) {
        // Désélectionner
        tradeSelection[type] = array.filter(c => c !== code);
        cardEl.classList.remove(class_name);
    } else {
        // Sélectionner (limite optionnelle de 5 cartes)
        if (array.length >= 5) {
            return displayMessage("Limite de 5 cartes par échange atteinte.", 'info');
        }
        tradeSelection[type].push(code);
        cardEl.classList.add(class_name);
    }
}

// Logique pour afficher/masquer le formulaire d'échange (Gardé)
const startNewTradeBtn = document.getElementById('start-new-trade-btn');
const tradeFormContainer = document.getElementById('trade-initiation-form-container');

if (startNewTradeBtn && tradeFormContainer) {
    startNewTradeBtn.onclick = () => {
        const isVisible = tradeFormContainer.style.display === 'block';
        
        tradeFormContainer.style.display = isVisible ? 'none' : 'block';
        startNewTradeBtn.textContent = isVisible ? 'Démarrer un Nouvel Échange' : 'Masquer le Formulaire';
        
        if (!isVisible) {
            loadFriendsForTrade();
            loadCardsForTradeSelection(); // Appel au nouveau loader
        }
    };
}

// Logique de soumission du formulaire d'échange (Gardé)
const initiateTradeForm = document.getElementById('initiate-trade-form');
if (initiateTradeForm) {
    initiateTradeForm.addEventListener('submit', initiateTrade);
}


/**
 * Fonction asynchrone pour envoyer la proposition d'échange à Firebase.
 */
async function initiateTrade(e) {
    e.preventDefault();
    
    // CORRECTION: Récupérer l'élément select et définir friendPseudo
    const friendSelect = document.getElementById('trade-friend-select');
    const friendUid = friendSelect.value;
    
    const friendPseudo = friendSelect.options[friendSelect.selectedIndex].textContent; 

    const sender = window.currentUser;

    if (tradeSelection.offer.length === 0 && tradeSelection.request.length === 0) {
        return displayMessage("❌ Vous devez offrir ET/OU demander au moins une carte.", 'error');
    }
    if (!friendUid || friendPseudo.startsWith('-- Choisir un ami --')) { // Vérification renforcée
        return displayMessage("❌ Veuillez sélectionner un ami valide.", 'error');
    }
    if (!sender) return displayMessage("Erreur : Utilisateur non connecté.", 'error');

    try {
        // VÉRIFICATION CRITIQUE: L'utilisateur a-t-il toujours les doublons ?
        const userCardsSnapshot = await window.usersRef.child(sender.uid).child('cards').once('value');
        const userQuantities = userCardsSnapshot.val() || {};
        
        for (const code of tradeSelection.offer) {
            if ((userQuantities[code] || 0) < 2) {
                return displayMessage(`❌ Vous n'avez plus de carte en double pour la carte ${code}.`, 'error');
            }
        }

        // Création de l'objet de proposition d'échange
        const newTrade = {
            senderUid: sender.uid,
            senderPseudo: sender.name,
            receiverUid: friendUid,
            receiverPseudo: friendPseudo, // AJOUT: Le pseudo du destinataire
            offeredCards: tradeSelection.offer.reduce((acc, code) => ({ ...acc, [code]: true }), {}),
            requestedCards: tradeSelection.request.reduce((acc, code) => ({ ...acc, [code]: true }), {}),
            status: 'pending', 
            timestamp: Date.now()
        };
        
        // 1. Écriture dans le nœud général des échanges (crée un ID unique)
        const tradeRef = await firebase.database().ref('trades').push(newTrade);
        const tradeId = tradeRef.key;

        // 2. Mise à jour de l'index de l'expéditeur et du destinataire
        const updates = {};
        updates[`users/${sender.uid}/activeTrades/outgoing/${tradeId}`] = true;
        updates[`users/${friendUid}/activeTrades/incoming/${tradeId}`] = true;

        await firebase.database().ref().update(updates);
        
        // Nettoyage et succès
        displayMessage(`✅ Proposition d'échange envoyée à ${friendPseudo} !`, 'success'); 
        loadActiveTrades(); // Rafraîchir les listes (via l'écouteur TdR)
        tradeFormContainer.style.display = 'none';
        tradeSelection = { offer: [], request: [] }; // Réinitialiser
        initiateTradeForm.reset();

    } catch (error) {
        console.error("Erreur lors de l'envoi de la proposition d'échange :", error);
        displayMessage("❌ Échec de l'envoi de l'échange. Erreur interne.", 'error');
    }
}



/**
 * Charge les échanges en cours (reçus et envoyés) pour l'utilisateur en temps réel.
 * REMPLACEMENT du .once par un .on pour une actualisation instantanée.
 */
/**
 * Charge les échanges en cours (reçus et envoyés) pour l'utilisateur en temps réel.
 * REMPLACEMENT du .once par un .on pour une actualisation instantanée.
 */
function loadActiveTrades() {
    const incomingList = document.getElementById('incoming-trades-list');
    const outgoingList = document.getElementById('outgoing-trades-list');
    const currentUser = window.currentUser;

    if (!currentUser || !incomingList || !outgoingList) {
        console.warn("Utilisateur non connecté ou éléments DOM manquants pour l'échange.");
        return;
    }
    
    const activeTradesRef = window.usersRef.child(currentUser.uid).child('activeTrades');

    // 1. Annulation de l'ancien listener (Anti-doublons et anti-fuite mémoire)
    if (window.firebaseListeners.activeTrades) {
        activeTradesRef.off('value', window.firebaseListeners.activeTrades);
        delete window.firebaseListeners.activeTrades;
    }

    // 2. Écouteur en temps réel sur l'index des échanges actifs
    const activeTradesListener = async (activeTradesSnapshot) => {
        
        // Affichage initial du chargement
        incomingList.innerHTML = '<li>Actualisation des échanges reçus...</li>';
        outgoingList.innerHTML = '<li>Actualisation des échanges envoyés...</li>';

        const activeTrades = activeTradesSnapshot.val() || {};
        
        const incomingIds = Object.keys(activeTrades.incoming || {});
        const outgoingIds = Object.keys(activeTrades.outgoing || {});

        const allTradeIds = [...incomingIds, ...outgoingIds];
        
        if (allTradeIds.length === 0) {
            incomingList.innerHTML = '<li>Aucune demande d\'échange en attente.</li>';
            outgoingList.innerHTML = '<li>Aucune proposition d\'échange en attente.</li>';
            return;
        }

        // Récupération des détails de tous les échanges actifs (toujours en .once pour les détails)
        const tradesDetailsPromises = allTradeIds.map(tradeId => 
            firebase.database().ref('trades').child(tradeId).once('value')
        );
        const tradesSnapshots = await Promise.all(tradesDetailsPromises);
        
        incomingList.innerHTML = ''; // Nettoyer pour le rendu final
        outgoingList.innerHTML = '';
        
        let hasIncoming = false;
        let hasOutgoing = false;

        tradesSnapshots.forEach(snapshot => {
    const trade = snapshot.val();
    const tradeId = snapshot.key;

    if (trade && trade.status === 'pending') {
        const isIncoming = trade.receiverUid === currentUser.uid;
        const targetList = isIncoming ? incomingList : outgoingList;
        
        const offerCount = Object.keys(trade.offeredCards || {}).length;
        const requestCount = Object.keys(trade.requestedCards || {}).length;
        
        let title; // Déclaration de la variable 'title'

        // 💥 ALTERNATIVE SÉCURISÉE (If/Else) pour éviter l'erreur de syntaxe
        if (isIncoming) {
    title = "De " + trade.senderPseudo;
} else {
    title = "À " + (trade.receiverPseudo || trade.receiverUid) + " (En attente)";
}

        // FIN ALTERNATIVE

        const listItem = document.createElement('li');
        listItem.className = 'trade-item pending-trade';
        listItem.dataset.tradeId = tradeId;

        listItem.innerHTML =
    '<div style="font-weight: bold;">' + title + '</div>' +
    '<div>Offre: ' + offerCount + ' carte(s) | Demande: ' + requestCount + ' carte(s)</div>' +
    '<button onclick="window.showTradeDetails(\'' + tradeId + '\')" class="secondary-btn">Voir détails</button>';

        
        targetList.appendChild(listItem);

        if (isIncoming) hasIncoming = true;
        else hasOutgoing = true;
    }
});
        
        // Afficher les messages par défaut si aucune carte en attente n'a été trouvée
        if (!hasIncoming) incomingList.innerHTML = '<li>Aucune demande d\'échange en attente.</li>';
        if (!hasOutgoing) outgoingList.innerHTML = '<li>Aucune proposition d\'échange en attente.</li>';

        console.log("Liste des échanges actifs mise à jour en temps réel.");
    };
    
    // Attacher le nouveau listener
    activeTradesRef.on('value', activeTradesListener, (error) => {
        console.error("Erreur de l'écouteur des activeTrades:", error);
    });
    
    // Stocker la référence de l'écouteur
    window.firebaseListeners.activeTrades = activeTradesListener;
}

/**
 * Affiche les détails d'un échange spécifique dans une modale.
 * Cette fonction est appelée par le bouton "Voir détails" dans loadActiveTrades.
 * @param {string} tradeId L'ID de l'échange à afficher.
 */
async function showTradeDetails(tradeId) {
    // Le code ci-dessous utilise 'tradeDetailsModal' et 'tradeDetailsContent'
    const modal = document.getElementById('tradeDetailsModal');
    const content = document.getElementById('tradeDetailsContent'); // ID corrigé/vérifié
    const currentUser = window.currentUser;

    if (!modal || !content) {
        return displayMessage("Erreur : Les éléments de la modale sont introuvables.", 'error');
    }

    // Afficher un état de chargement
    content.innerHTML = '<p>Chargement des détails de l\'échange...</p>';
    modal.style.display = 'block';

    try {
        const tradeSnapshot = await firebase.database().ref('trades').child(tradeId).once('value');
        const trade = tradeSnapshot.val();

        if (!trade) {
            content.innerHTML = '<p>Détails de l\'échange introuvables.</p>';
            return;
        }

        const isIncoming = trade.receiverUid === currentUser.uid;
        // Utiliser le pseudo stocké, sinon l'UID (en cas de problème).
        const friendPseudo = isIncoming ? trade.senderPseudo : (trade.receiverPseudo || trade.receiverUid); 

        const title = isIncoming 
            ? `Demande d'échange de ${trade.senderPseudo}`
            : `Votre proposition à ${friendPseudo}`;

        // Fonctions utilitaires pour générer les listes de cartes
        const generateCardListHTML = (cardCodes) => {
            const list = Object.keys(cardCodes || {});
            if (list.length === 0) return '<li>(Aucune carte)</li>';
            
            return list.map(code => {
                const card = findCardByCode(code);
                const rarityClass = card ? `rarity-${card.rarity.replace(/[^a-zA-Z0-9]/g, '-')}` : 'rarity-unknown';
                return `<li class="${rarityClass}">${card ? card.nom.replace('.png', '') : code} (${card ? card.rarity : 'Inconnu'})</li>`;
            }).join('');
        };
        
        // Contenu dynamique de la modale
        content.innerHTML = `
            <h3>${title}</h3>
            <p><strong>Statut :</strong> ${trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}</p>
            
            <div class="trade-offer-details" style="display: flex; justify-content: space-around; gap: 20px; text-align: left;">
                <div class="offer-section" style="flex: 1;">
                    <h4>${isIncoming ? 'Il vous offre :' : 'Vous offrez :'}<hr></h4>
                    <ul style="list-style-type: none; padding: 0;">${generateCardListHTML(isIncoming ? trade.offeredCards : trade.requestedCards)}</ul>
                </div>
                <div class="request-section" style="flex: 1;">
                    <h4>${isIncoming ? 'Il vous demande :' : 'Vous demandez :'}<hr></h4>
                    <ul style="list-style-type: none; padding: 0;">${generateCardListHTML(isIncoming ? trade.requestedCards : trade.offeredCards)}</ul>
                </div>
            </div>

            <div class="modal-actions" style="margin-top: 25px; text-align: center;">
                ${isIncoming && trade.status === 'pending'
                    ? `
                    <button onclick="window.acceptTrade('${tradeId}')" class="action-btn" style="margin-right: 10px;">Accepter l'échange</button>
                    <button onclick="window.rejectTrade('${tradeId}')" class="secondary-btn">Refuser</button>
                    `
                    : trade.status === 'pending'
                    ? `
                    <button onclick="window.cancelTrade('${tradeId}')" class="secondary-btn">Annuler ma proposition</button>
                    `
                    : '' // Si l'échange est terminé, aucun bouton d'action n'est affiché
                }
            </div>
        `;
        
        // La fermeture est gérée par le bouton X de la modale, pas besoin d'un autre bouton.

    } catch (error) {
        console.error("Erreur lors de l'affichage des détails de l'échange :", error);
        content.innerHTML = '<p>❌ Erreur de chargement. Vérifiez la console.</p>';
    }
}
window.showTradeDetails = showTradeDetails;

/**
 * Gère le rejet ou l'annulation d'un échange.
 * (Remplace rejectTrade et cancelTrade)
 */
async function manageTradeStatus(tradeId, action) {
    if (!['accept', 'reject', 'cancel'].includes(action)) return;
    
    if (action !== 'accept' && !confirm(`Êtes-vous sûr de vouloir ${action === 'reject' ? 'rejeter' : 'annuler'} cet échange ?`)) return;
    
    if (action === 'accept') {
        return acceptTrade(tradeId);
    }
    
    try {
        const tradeSnapshot = await firebase.database().ref('trades').child(tradeId).once('value');
        const trade = tradeSnapshot.val();

        if (!trade || trade.status !== 'pending') {
            displayMessage("Échange déjà terminé ou non trouvé.", 'info');
            return;
        }

        const newStatus = action === 'cancel' ? 'cancelled' : 'rejected';
        
        const updates = {};
        // 🛑 Ces suppressions de références déclenchent l'écouteur .on('value') dans loadActiveTrades sur les deux côtés.
        updates[`users/${trade.senderUid}/activeTrades/outgoing/${tradeId}`] = null;
        updates[`users/${trade.receiverUid}/activeTrades/incoming/${tradeId}`] = null;
        updates[`trades/${tradeId}/status`] = newStatus;
        
        await firebase.database().ref().update(updates);
        
        document.getElementById('tradeDetailsModal').style.display='none';
        // loadActiveTrades n'est plus strictement nécessaire ici car le .on l'a déjà mis à jour, 
        // mais le laisser ne fait pas de mal pour un refresh manuel après succès.
        loadActiveTrades(); 
        displayMessage(`✅ Échange ${newStatus === 'cancelled' ? 'annulé' : 'refusé'} avec succès.`, 'success');

    } catch (error) {
        console.error(`Erreur lors de l'opération ${action} :`, error);
        displayMessage("❌ Échec de la finalisation de l'échange. Réessayez.", 'error');
    }
}

// Remplacement des anciennes fonctions globales pour l'interface
window.rejectTrade = (tradeId) => manageTradeStatus(tradeId, 'reject');
window.cancelTrade = (tradeId) => manageTradeStatus(tradeId, 'cancel');
window.showTradeDetails = showTradeDetails; // Laissez-le pour le chargement

/**
 * Finalise l'échange : retire/ajoute les cartes via transactions atomiques.
 * (Logique renforcée pour garantir l'intégrité des données)
 */
async function acceptTrade(tradeId) {
    if (!confirm("Voulez-vous vraiment accepter cet échange ?")) return;

    document.getElementById('tradeDetailsModal').style.display = 'none';
    displayMessage("🚀 Traitement de l'échange en cours...", 'info');

    try {
        const tradeSnapshot = await firebase.database().ref('trades').child(tradeId).once('value');
        const trade = tradeSnapshot.val();
        
        if (!trade || trade.status !== 'pending') {
            return displayMessage("❌ L'échange n'est plus en attente ou a déjà été traité.", 'error');
        }

        const receiverUid = window.currentUser.uid;
        const senderUid = trade.senderUid;
        // Utiliser le pseudo du sender pour le message final
        const senderPseudo = trade.senderPseudo || senderUid; 
        const offeredCodes = Object.keys(trade.offeredCards || {});
        const requestedCodes = Object.keys(trade.requestedCards || {});

        let success = true;

        // 1. Transaction sur les cartes de l'ACCEPTEUR (Receiver - VOUS) - (Quantités)
        const receiverCardsRef = window.usersRef.child(receiverUid).child('cards');
        await receiverCardsRef.transaction(currentCards => {
            const newCards = currentCards || {};
            
            // DÉBIT: Retrait de vos cartes (demandées par l'ami)
            for (const code of requestedCodes) {
                if ((newCards[code] || 0) < 1) {
                    success = false; // Carte manquante : échec de la transaction
                    return; 
                }
                newCards[code] -= 1;
                if (newCards[code] <= 0) delete newCards[code];
            }

            // CRÉDIT: Réception des cartes offertes par l'ami
            for (const code of offeredCodes) {
                newCards[code] = (newCards[code] || 0) + 1;
            }
            return newCards;
        });

        if (!success) {
            return displayMessage("❌ Échec: Vous ne possédez plus toutes les cartes demandées.", 'error');
        }


        // 2. Transaction sur les cartes de l'EXPÉDITEUR (Sender - AMI) - (Quantités)
        const senderCardsRef = window.usersRef.child(senderUid).child('cards');
        await senderCardsRef.transaction(currentCards => {
            const newCards = currentCards || {};
            
            // DÉBIT: Retrait des cartes offertes (doivent être des doublons)
            for (const code of offeredCodes) {
                if ((newCards[code] || 0) < 2) { // Vérifie qu'il garde un exemplaire (la vérification à l'initiation garantit qu'il a au moins 2)
                    success = false; 
                    return; 
                }
                newCards[code] -= 1;
                // Si newCards[code] est > 0, on garde la clé.
            }

            // CRÉDIT: Réception des cartes demandées
            for (const code of requestedCodes) {
                newCards[code] = (newCards[code] || 0) + 1;
            }
            return newCards;
        });

        if (!success) {
            return displayMessage(`❌ Échec: L'ami (${senderPseudo}) n'avait plus les cartes offertes en double. Échange annulé.`, 'error');
        }

        // --- 3. MISE À JOUR CRITIQUE DU BABY-DEX (Array de cartes objets) ---
        // Doit être faite après la validation des transactions de quantité.
        
        const [receiverSnap, senderSnap] = await Promise.all([
            window.usersRef.child(receiverUid).once('value'),
            window.usersRef.child(senderUid).once('value')
        ]);

        const receiverData = receiverSnap.val() || {};
        const senderData = senderSnap.val() || {};
        const nowTs = Date.now();
        
        // Fonction d'aide locale pour retirer et ajouter des cartes dans le BabyDeck (Array)
        const processDeckUpdate = (currentDeck, giveCodes, receiveCodes) => {
            let tempDeck = [...currentDeck]; 
            let mutableGiveCodes = [...giveCodes]; // Copie mutable des codes à donner

            // 3.1. Retrait des cartes données (une par une, plus robuste que le .filter)
            const newDeckAfterRemoval = [];
            tempDeck.forEach(card => {
                const index = mutableGiveCodes.findIndex(code => code === card.code);
                if (index !== -1) {
                    // Retire le code de la liste des codes à retirer, mais pas du deck temporaire pour le moment
                    mutableGiveCodes.splice(index, 1); 
                } else {
                    newDeckAfterRemoval.push(card); // Garde la carte dans le nouveau deck
                }
            });

            // 3.2. Ajout des cartes reçues
            const receivedCards = receiveCodes.map(code => {
                const card = findCardByCode(code);
                // Crée un nouvel objet carte pour le BabyDeck
                return { 
                    code, 
                    nom: card?.nom || "Inconnue.png", 
                    rarity: card?.rarity || "Inconnue", 
                    obtainedAt: nowTs 
                };
            });

            return newDeckAfterRemoval.concat(receivedCards);
        };

        // 4. Mise à jour du Baby-Dex du RECEVEUR (VOUS)
        const updatedReceiverDeck = processDeckUpdate(
            receiverData.babyDeck || [], 
            requestedCodes, // Cartes données par le Receveur (Vous)
            offeredCodes // Cartes reçues par le Receveur (Vous)
        );
        
        // 5. Mise à jour du Baby-Dex de l'EXPÉDITEUR (AMI) - NOUVEAU
        const updatedSenderDeck = processDeckUpdate(
            senderData.babyDeck || [], 
            offeredCodes, // Cartes données par l'Expéditeur (Ami)
            requestedCodes // Cartes reçues par l'Expéditeur (Ami)
        );

        // --- 6. Mise à jour atomique de l'état de l'échange et des decks ---
        const combinedUpdates = {};

        // Statut et Références actives
        combinedUpdates[`trades/${tradeId}/status`] = 'accepted';
        combinedUpdates[`users/${senderUid}/activeTrades/outgoing/${tradeId}`] = null;
        combinedUpdates[`users/${receiverUid}/activeTrades/incoming/${tradeId}`] = null;

        // Mises à jour des decks
        combinedUpdates[`users/${receiverUid}/babyDeck`] = updatedReceiverDeck;
        combinedUpdates[`users/${receiverUid}/totalBabyCards`] = updatedReceiverDeck.length;
        combinedUpdates[`users/${senderUid}/babyDeck`] = updatedSenderDeck;
        combinedUpdates[`users/${senderUid}/totalBabyCards`] = updatedSenderDeck.length;

        // Exécuter toutes les mises à jour atomiquement
        await firebase.database().ref().update(combinedUpdates);

        // Si tout est bon, mettre à jour l'interface
        if (typeof renderBabyDex === 'function') renderBabyDex();
        // loadActiveTrades est appelé ici, mais le .on s'est déjà déclenché 
        // par la mise à jour atomique, donc c'est une double sécurité.
        loadActiveTrades(); 
        displayMessage(`🎉 Échange accepté avec ${senderPseudo} ! ${offeredCodes.length} carte(s) reçue(s).`, 'success');

    } catch (error) {
        // ❌ Erreur critique
        console.error("Erreur critique lors de l'acceptation de l'échange :", error);
        displayMessage("❌ Échec critique lors de la finalisation de l'échange.", 'error');
    }
}
// =========================================================
// 🔄 GESTION DES MISES À JOUR DU SERVICE WORKER (PWA)
// =========================================================

/**
 * Configure les écouteurs pour détecter, notifier et appliquer une mise à jour du Service Worker.
 * @param {ServiceWorkerRegistration} registration - L'objet d'enregistrement du Service Worker.
 */
window.setupServiceWorkerUpdate = (registration) => {
    const updateBanner = document.getElementById('update-banner');
    const updateButton = document.getElementById('update-button');
    let installingWorker;

    // 1. Écouter l'événement 'updatefound' sur le Service Worker
    registration.addEventListener('updatefound', () => {
        installingWorker = registration.installing;
        if (!installingWorker) return;

        // 🚨 LOG DE DIAGNOSTIC CRITIQUE
        // Ce log doit s'afficher dans la console dès que la nouvelle version est téléchargée
        console.log(`🚨 Nouvelle version détectée. Fichier SW en cours d'installation : ${installingWorker.scriptURL}`); 

        // 2. Attendre que le nouveau SW soit complètement installé (état 'installed')
        installingWorker.addEventListener('statechange', () => {
            // Un SW 'installed' et un contrôleur existant (ancien SW) = nouvelle version en attente (waiting)
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✅ Nouvelle version du Service Worker installée et en attente.');
                
                // Montrer le bandeau de mise à jour
                if (updateBanner) {
                    updateBanner.style.display = 'block';
                    updateButton.style.display = 'inline-block'; 
                }
            }
        });
    });

    // 3. Gérer le clic sur le bouton "Mettre à jour maintenant"
    if (updateButton) {
        updateButton.addEventListener('click', () => {
            if (registration.waiting) {
                // Envoyer le message 'SKIP_WAITING' au Service Worker en attente
                console.log('Envoi du message SKIP_WAITING pour forcer l\'activation.');
                registration.waiting.postMessage('SKIP_WAITING');
                
                // Masquer le bandeau immédiatement pour un meilleur UX
                if (updateBanner) updateBanner.style.display = 'none';
            }
        });
    }

    // 4. Recharger la page après que le nouveau SW ait pris le contrôle
    // Le 'controllerchange' se déclenche immédiatement après le self.skipWaiting()
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            console.log('Nouveau Service Worker actif. Rechargement de la page pour appliquer la mise à jour.');
            window.location.reload();
            refreshing = true;
        }
    });
}

// ======================================
// 🔹 CHARGEMENT & MISE À JOUR DES STATS DE PROFIL
// ======================================
window.loadProfileData = function(userUid) {
    // S'assure que la référence à la base de données existe
    if (typeof window.usersRef === 'undefined' || !userUid) {
        console.error("Firebase n'est pas initialisé ou l'UID est manquant.");
        return;
    }

    // Écoute en temps réel du nœud principal de l'utilisateur
    // 'on' est préférable à 'once' pour que les stats se mettent à jour automatiquement
    window.usersRef.child(userUid).on('value', (snapshot) => {
        const userData = snapshot.val();
        if (!userData) return;

        console.log("🔥 Mise à jour des données utilisateur en temps réel.");

        // === 1. MISE À JOUR DU SOLDE (ARGENT) ===
        const balance = userData.balance || 0;
        const boosterBalanceEl = document.getElementById('booster-balance');
        if (boosterBalanceEl) boosterBalanceEl.textContent = `${balance.toFixed(2)} €`;


        // === 2. MISE À JOUR DES STATS ===
        const wins = userData.wins || 0;
        const losses = userData.losses || 0;
        const betEarnings = userData.betEarnings || 0;

        // Met à jour les éléments du DOM
        document.getElementById('stats-wins').textContent = wins;
        document.getElementById('stats-losses').textContent = losses;
        document.getElementById('stats-bet-earnings').textContent = `${betEarnings.toFixed(2)} €`;

        // Calcul et mise à jour du Ratio V/D
        const totalMatches = wins + losses;
        const ratio = totalMatches > 0 ? (wins / totalMatches).toFixed(2) : '0.00';
        document.getElementById('stats-ratio').textContent = ratio;
        
        // Mise à jour du pseudo affiché
        const userInfoEl = document.getElementById('user-info');
        if (userInfoEl) userInfoEl.textContent = `Utilisateur : ${userData.name || 'Chargement...'}`;

        // ... (Vous pouvez ajouter ici d'autres éléments dynamiques si besoin)
    });
};

// ======================================
// 🔹 MISE À JOUR DES STATS DE PROFIL
// ======================================
// Cette fonction est appelée par le listener en temps réel dans loginSuccess
window.updateProfileStats = function({ wins, losses, earnings }) {
    
    // --- 1. MISE À JOUR DES STATS DE MATCH ---
    const totalMatches = wins + losses;
    const ratio = totalMatches > 0 ? (wins / totalMatches) : 0;
    const ratioDisplay = (ratio * 100).toFixed(0); // Affichage en pourcentage (ex: "65")
    
    // Les ID des éléments HTML de la section Profil doivent exister
    const statsWinsEl = document.getElementById('stats-wins');
    const statsLossesEl = document.getElementById('stats-losses');
    const statsRatioEl = document.getElementById('stats-ratio');
    
    if (statsWinsEl) statsWinsEl.textContent = wins;
    if (statsLossesEl) statsLossesEl.textContent = losses;
    if (statsRatioEl) statsRatioEl.textContent = `${ratioDisplay}%`;
    
    
    // --- 2. MISE À JOUR DES GAINS ---
    // Les gains (userData.totalWon) sont injectés ici
    const betEarningsEl = document.getElementById('stats-bet-earnings');
    if (betEarningsEl) betEarningsEl.textContent = `${(earnings || 0).toFixed(2)} €`;

    console.log("📈 Statistiques de profil mises à jour (Wins/Losses/Ratio/Gains).");
};

// ======================================
// 🔹 ENREGISTREMENT DU RÉSULTAT DU TOURNOI (Firestore)
// ======================================
/**
 * Enregistre le résultat d'un match de tournoi dans Firestore.
 * @param {string} matchIdStr - ID du match (chaîne de caractères).
 * @param {string} roundName - Nom du tour (ex: 'round1').
 * @param {string} winnerTeamName - Nom de l'équipe gagnante.
 */
window.recordMatchResult = async function(matchIdStr, roundName, winnerTeamName) {

    // Suppositions basées sur les logs :
    // - window.tournamentState est mis à jour par le listener de Firestore
    // - tournamentStateRef est la référence vers db.collection('currentTournament').doc('state')
    // - window.updatePlayerStats(userUid, isWinner) est la fonction renommée

    const messageElement = document.getElementById('record-message');
    const recordBtn = document.querySelector('#record-match-form button[type="submit"]');
    const stateRef = window.tournamentStateRef; // Utilise la référence globale

    if (!firebase.auth().currentUser) {
        messageElement.textContent = "Vous devez être connecté pour enregistrer un match.";
        return;
    }
    if (typeof window.tournamentState === 'undefined' || !window.tournamentState.bracket) {
        messageElement.textContent = "Erreur: État du tournoi non chargé.";
        return;
    }

    recordBtn.disabled = true;

    try {
        const currentBracket = window.tournamentState.bracket[roundName]; 

        if (!currentBracket || !Array.isArray(currentBracket)) {
            throw new Error("Tournoi non trouvé ou structure de round invalide.");
        }

        // 🚨 CORRECTION DÉCISIVE pour l'erreur "Match non trouvé" : 
        // On s'assure de comparer les IDs en STRING.
        const match = currentBracket.find(m => m.id.toString() === matchIdStr); 

        if (!match) {
            throw new Error("Match non trouvé dans le tour actuel."); 
        }

        // Logique de validation et de mise à jour du match
        const winner = match.team1.name === winnerTeamName ? match.team1 : match.team2;
        const loser = match.team1.name !== winnerTeamName ? match.team1 : match.team2;

        if (!winner || !loser) {
            throw new Error("Erreur: Équipe gagnante ou perdante introuvable.");
        }

        // 1. Mise à jour des stats des joueurs
        const winnerP1Uid = winner.player1.uid;
        const winnerP2Uid = winner.player2.uid;
        const loserP1Uid = loser.player1.uid;
        const loserP2Uid = loser.player2.uid;

        // Utiliser la fonction renommée pour les stats
        if (winnerP1Uid) window.updatePlayerStats(winnerP1Uid, true);
        if (winnerP2Uid) window.updatePlayerStats(winnerP2Uid, true);
        if (loserP1Uid) window.updatePlayerStats(loserP1Uid, false);
        if (loserP2Uid) window.updatePlayerStats(loserP2Uid, false);

        // 2. Préparation de la mise à jour du bracket
        match.status = 'completed';
        match.winner = winnerTeamName;
        match.loser = loser.name;
        match.validation = {
            status: 'VALIDATED', 
            validatedBy: firebase.auth().currentUser.uid,
            validatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Créer une copie de l'objet pour la mise à jour de Firestore
        const newBracket = { ...window.tournamentState.bracket };
        const matchIndex = newBracket[roundName].findIndex(m => m.id.toString() === matchIdStr);

        if (matchIndex !== -1) {
            newBracket[roundName][matchIndex] = match;
        } else {
             throw new Error("Erreur interne: Impossible de trouver l'index du match pour la mise à jour.");
        }

        // 3. Mettre à jour Firestore
        await stateRef.update({ bracket: newBracket });

        messageElement.style.color = 'green';
        messageElement.textContent = `Résultat enregistré et validé ! ${winnerTeamName} a gagné.`;

    } catch (error) {
        console.error("Erreur lors de l'enregistrement du match:", error);
        messageElement.style.color = 'red';
        messageElement.textContent = `Erreur: ${error.message}`;

    } finally {
        if (recordBtn) recordBtn.disabled = false;
    }
};



/**
 * Vérifie le nombre d'équipes et gère l'affichage du formulaire d'inscription.
 * @param {Array<Object>} teams - La liste actuelle des équipes inscrites.
 */
function manageRegistrationFormVisibility(teams) {
    const MAX_TEAMS = 8;
    // Remplacez 'registration-form' et 'registration-message' par les IDs réels dans votre HTML
    const registrationForm = document.getElementById('registration-form');
    const registrationMessage = document.getElementById('registration-message');

    if (!registrationForm || !registrationMessage) {
        console.error("Éléments DOM du formulaire d'inscription non trouvés.");
        return;
    }

    if (teams.length >= MAX_TEAMS) {
        // Le tournoi est complet
        registrationForm.style.display = 'none';
        registrationMessage.innerHTML = "✅ **Le tournoi est complet** (8 équipes maximum). Veuillez revenir pour le prochain événement.";
        registrationMessage.style.color = 'orange';
    } else {
        // Il y a des places disponibles
        registrationForm.style.display = 'block';
        const remaining = MAX_TEAMS - teams.length;
        registrationMessage.innerHTML = `Il reste **${remaining} places** disponibles (sur ${MAX_TEAMS}).`;
        registrationMessage.style.color = 'green';
    }
}


// Cette fonction est appelée par le `showSection('tournament')` dans le HTML
// Cette fonction est appelée par le `showSection('tournament')` dans le HTML
window.showSection = (sectionId) => {
    // 1. Cacher toutes les sections
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    
    const targetSection = document.getElementById(sectionId);
    
    if (targetSection) {
        // 2. Afficher la section cible
        targetSection.style.display = 'block';
        
        // 3. Logique spécifique au Tournoi
        if (sectionId === 'tournament') {
            // Charger l'état du tournoi et les équipes
            if (typeof loadTournamentTeams === 'function') loadTournamentTeams();
            
            // 🚀 NOUVEAUTÉ : Charger les pseudos pour la datalist d'inscription
            if (typeof loadAllPseudos === 'function') loadAllPseudos(); 
        }
        
        // 4. (Facultatif) Ajoutez ici d'autres logiques si vous avez besoin de maintenir
        // des appels spécifiques pour d'autres sections (ex: showAdminSubPanel).
        // Le code suivant dépend de la structure de votre index.html si showAdminSubPanel est appelé ici.
        // Exemple (si vous l'aviez dans la logique précédente) :
        // if (sectionId === 'admin' && typeof showAdminSubPanel === 'function') {
        //     showAdminSubPanel('adminPanel1'); 
        // }
    }
};




// ======================================
// 🔹 FONCTION HELPER : MISE À JOUR STATS JOUEURS (RTDB)
// Ceci était l'ancien recordMatchResult.
// ======================================
window.updatePlayerStats = function(userUid, isWinner) {
    if (!userUid || typeof window.usersRef === 'undefined') {
        console.error("UID utilisateur ou référence Firebase manquant pour la mise à jour des stats.");
        return;
    }

    const userStatsRef = window.usersRef.child(userUid);

    // Utilisation d'une transaction pour garantir une mise à jour sécurisée
    userStatsRef.transaction(currentData => {
        if (currentData === null) {
            currentData = { totalWins: 0, totalLosses: 0, totalWon: 0, balance: 15 };
        }
        
        if (isWinner) {
            currentData.totalWins = (currentData.totalWins || 0) + 1;
        } else {
            currentData.totalLosses = (currentData.totalLosses || 0) + 1;
        }

        return currentData; 
    })
    .then(() => {
        console.log(`Statistiques de match enregistrées: Victoire=${isWinner}`);
    })
    .catch(error => {
        console.error("Échec de l'enregistrement du résultat du match:", error);
    });
};


// app.js (ou un nouveau fichier de listeners)

function setupRankingListener() {
    // Écoute seulement le nœud global des utilisateurs (pour le classement)
    // Utilisez un listener de classement optimisé pour n'obtenir que les tops (si possible)
    window.usersRef.orderByChild('totalWon').limitToLast(10).on('value', snapshot => {
        // ... Logique de mise à jour du classement ici ...
        updateRanking(snapshot.val()); // updateRanking ne dépend plus de window.currentUser
    });
}

function setupBabyDexListener() {
    // Écoute seulement le nœud des cartes de l'utilisateur
    const deckRef = window.usersRef.child(window.currentUser.uid).child('babyDeck');
    deckRef.on('value', snapshot => {
        window.currentUser.babyDeck = snapshot.val() || {};
        renderBabyDex(); // Rechargement du Baby-Dex uniquement quand une carte change
    });
}

// ... et ainsi de suite pour loadFriendList/loadFriendRequests, que vous renommerez en setupFriendListListener, etc.

// DANS app.js (ou un fichier de listeners)

function setupFriendListListener() {
    // Écoute seulement la liste d'amis de l'utilisateur
    const friendsRef = window.usersRef.child(window.currentUser.uid).child('friends');
    friendsRef.on('value', () => {
        loadFriendList(); // loadFriendList() n'a plus besoin d'être appelée par le listener principal
    });
}

function setupFriendRequestsListener() {
    // Écoute seulement les demandes d'amis
    const requestsRef = window.usersRef.child(window.currentUser.uid).child('friendRequests');
    requestsRef.on('value', () => {
        loadFriendRequests(); // loadFriendRequests() n'a plus besoin d'être appelée par le listener principal
    });
}




window.isMaintenanceModeActive = false;
// DANS app.js, à la fin du fichier

// DANS app.js, à la fin du fichier

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 🚨 VÉRIFICATION ASYNCHRONE DE LA MAINTENANCE EN PREMIER 🚨
    configRef.child('isMaintenance').once('value')
        .then(snapshot => {
            const isMaintenance = snapshot.val() || false;
            window.isMaintenanceModeActive = isMaintenance; 
            
            // LOG : État de maintenance et Utilisateur Auth
            console.log(`[APP] Mode Maintenance DB : ${isMaintenance ? 'ACTIF' : 'INACTIF'}`);
            
            const user = firebase.auth().currentUser;
            const isAdmin = user && user.isAdmin; // Utilisateur Auth n'a pas forcément isAdmin

            // LOG : Statut utilisateur
            console.log(`[APP] Utilisateur connecté : ${user ? user.uid : 'NON'}. Admin : ${isAdmin ? 'OUI' : 'NON'}`);

            // CAS 1 : Maintenance active et l'utilisateur n'est PAS un admin connecté
            if (isMaintenance && (!user || !isAdmin)) { 
                console.warn("[APP] Maintenance active. Affichage de l'écran de maintenance.");
                window.showSection('maintenance-screen'); // 🎯 Affiche l'écran
                return; // Stoppe tout le reste
            }

            // CAS 2 : La maintenance est inactive, ou c'est un admin connecté, on continue :
            console.log("[APP] Maintenance inactive ou utilisateur Admin. Poursuite du chargement.");

            if (user) {
                // Utilisateur trouvé (déjà connecté)
                loginSuccess(user);
            } else {
                // Aucun utilisateur trouvé (déconnecté)
                window.currentUser = null;
                showSection('login-section'); 
            }
        })
        .catch(error => {
            console.error("[APP] Erreur critique de chargement de la config Firebase:", error);
            // En cas d'erreur critique de Firebase, afficher la maintenance par sécurité
            window.showSection('maintenance-screen');
        });
});


// DANS app.js (Ajoutez cette nouvelle fonction ou vérifiez que la vôtre fait ceci)

/**
 * Enregistre l'acceptation de la charte par l'utilisateur actuel et lance l'application.
 */
function acceptCharter() {
    if (!window.currentUser) {
        console.error("Erreur: Aucun utilisateur connecté pour accepter la charte.");
        window.showSection('login-section'); // Retour à la connexion par sécurité
        return;
    }
    
    // 1. 💾 Sauvegarder l'acceptation dans Firebase
    window.usersRef.child(window.currentUser.uid).child('charterAccepted').set(true)
        .then(() => {
            console.log("[CHARTE] Charte acceptée et sauvegardée pour l'UID:", window.currentUser.uid);
            
            // 2. 📝 Mettre à jour l'objet utilisateur en mémoire
            window.currentUser.charterAccepted = true; 
            
            // 3. 🖼️ Cacher la modale de la charte
            document.getElementById('welcome-charter-modal').style.display = 'none';

            // 4. 🚀 Afficher l'application principale
            // NOTE : Remplacez 'queue-section' par l'ID de votre section principale si elle est différente.
            window.showSection('queue-section'); 
            
            // 5. Mettre à jour le header qui contient la navigation
            document.getElementById('main-header').style.display = 'flex';

        })
        .catch(error => {
            console.error("[CHARTE] Erreur de sauvegarde de l'acceptation de la charte:", error);
            window.displayMessage("Erreur critique lors de la sauvegarde de la charte. Veuillez réessayer.", 'error');
        });
}


// app.js - Ajouter cette nouvelle fonction

// app.js - Modification de la fonction existante

/**
 * Vérifie si le paiement de la taxe est actuellement autorisé (du Vendredi 18h00 au Lundi 07h30).
 * @returns {boolean} True si le paiement est autorisé, False sinon.
 */
function isTaxPaymentWindowOpen() {
    const now = new Date();
    const day = now.getDay(); // Dimanche = 0, Lundi = 1, ..., Vendredi = 5, Samedi = 6
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Période ouverte :
    
    // 1. Vendredi (5) après 18h00
    if (day === 5 && hour >= 18) {
        return true;
    }
    
    // 2. Samedi (6) et Dimanche (0)
    if (day === 6 || day === 0) {
        return true;
    }
    
    // 3. Lundi (1) avant 7h30
    if (day === 1 && (hour < 7 || (hour === 7 && minute < 30))) {
        return true;
    }
    
    // Autres moments : bloqué (Semaine en journée)
    return false;
}

// app.js - Ajouter cette nouvelle fonction

// app.js - Quelque part avec vos autres fonctions de chargement (ex: loadProfile)

/**
 * Met à jour le solde dans la carte "Économie" du profil.
 * @param {number} balance - Le solde de l'utilisateur.
 */
function updateProfileBalance(balance) {
    const profileBalanceEl = document.getElementById('profile-balance');
    if (profileBalanceEl) {
        // Utiliser la fonction formatCurrency() que vous avez définie
        profileBalanceEl.textContent = "Solde actuel : " + formatCurrency(balance);
    }
}

// Mise à jour de app.js pour uniformiser l'utilisation du terme 'balance'
// Mise à jour de app.js pour uniformiser l'utilisation du terme 'balance'

// ** DÉBUT DE LA CORRECTION **
// S'assurer que les références Firebase existent
// Note: Il faut s'assurer que 'firebase' est déjà chargé (via une balise <script>)
// et que la DB est initialisée.
if (typeof firebase !== 'undefined' && firebase.database) {
    // Supposition: window.usersRef est défini ailleurs. Nous ajoutons la référence pour la cagnotte.
    // L'ID 'taxPot/currentAmount' est un chemin commun pour une cagnotte unique.
    window.taxPotRef = firebase.database().ref('taxPot/currentAmount');
    console.log("✅ DEBUG INIT: window.taxPotRef initialisé.");
} else {
    console.error("❌ DEBUG INIT: L'objet 'firebase' ou 'firebase.database' n'est pas défini. Les fonctionnalités DB échoueront.");
}
// ** FIN DE LA CORRECTION **

// Mise à jour de app.js pour uniformiser l'utilisation du terme 'balance'

// ** DÉBUT DE LA CORRECTION **
// S'assurer que les références Firebase existent
// Note: Il faut s'assurer que 'firebase' est déjà chargé (via une balise <script>)
// et que la DB est initialisée.
if (typeof firebase !== 'undefined' && firebase.database) {
    // Supposition: window.usersRef est défini ailleurs. Nous ajoutons la référence pour la cagnotte.
    // L'ID 'taxPot/currentAmount' est un chemin commun pour une cagnotte unique.
    window.taxPotRef = firebase.database().ref('taxPot/currentAmount');
    console.log("✅ DEBUG INIT: window.taxPotRef initialisé.");
} else {
    console.error("❌ DEBUG INIT: L'objet 'firebase' ou 'firebase.database' n'est pas défini. Les fonctionnalités DB échoueront.");
}
// ** FIN DE LA CORRECTION **


// ✅ AJOUT CRITIQUE : DÉFINITION DE LA FONCTION DE PÉRIODE DE TAXE MANQUANTE
/**
 * Vérifie si l'heure actuelle se situe entre Vendredi 18h00 et Lundi 07h30 (Heure Locale).
 * Ceci définit la "Période Fiscale" où les taxes peuvent être payées.
 */
function isBetweenFriday18hToMonday7h30() {
    const now = new Date();
    const day = now.getDay(); // Dimanche = 0, Lundi = 1, ..., Samedi = 6
    const hour = now.getHours();
    const minute = now.getMinutes();

    // 1. Période Vendredi (Vendredi 18h00 à 23h59)
    const isFridayOpen = day === 5 && (hour >= 18);

    // 2. Période Samedi (Toute la journée)
    const isSaturday = day === 6;

    // 3. Période Dimanche (Toute la journée)
    const isSunday = day === 0; 

    // 4. Période Lundi (Lundi 00h00 à 07h29)
    const isMondayEarly = day === 1 && (hour < 7 || (hour === 7 && minute < 30));

    return isFridayOpen || isSaturday || isSunday || isMondayEarly;
}


// ✅ FONCTION isTaxPeriodOpen UTILISE MAINTENANT LA FONCTION DÉFINIE
window.isTaxPeriodOpen = () => {
    return isBetweenFriday18hToMonday7h30(); 
    // Si vous voulez toujours tester, vous pouvez commenter la ligne ci-dessus
    // et décommenter la ligne ci-dessous (à faire dans la console JS, pas dans ce fichier)
    // return true; 
};


window.loadTaxesPanel = () => {
    console.log("✅ DEBUG TAXES: Fonction loadTaxesPanel démarrée.");

    if (!window.currentUser || !window.currentUser.uid) {
        console.error("❌ DEBUG TAXES: ERREUR - window.currentUser ou son UID n'est pas défini.");
        return;
    }

    const uid = window.currentUser.uid;
    console.log(`👤 DEBUG TAXES: UID de l'utilisateur: ${uid}`);

    // Définition des éléments DOM nécessaires pour la mise à jour
    const currentFortuneEl = document.getElementById('current-fortune');
    const currentTaxRateEl = document.getElementById('current-tax-rate'); 
    
    // Bloc CORRIGÉ qui correspond aux IDs de votre HTML
    const taxDueEl = document.getElementById('tax-due-amount'); 
    const taxStatusEl = document.getElementById('tax-status-message'); 
    const payTaxButton = document.getElementById('pay-tax-btn'); 
    
    // L'ID #tax-block-message est déjà correct
    const taxBlockMessageEl = document.getElementById('tax-block-message'); 

    // On s'abonne aux changements des données utilisateur sur Firebase
    // NOTE IMPORTANTE: Le listener s'attache ici et peut se déclencher immédiatement.
    window.usersRef.child(uid).on('value', (snapshot) => {
        console.log("🔔 DEBUG TAXES: Listener Firebase déclenché.");
        
        const userData = snapshot.val();

        // 🚩 LOG CRITIQUE 1: VÉRIFIER LES DONNÉES BRUTES
        if (!userData) {
            console.error("❌ DEBUG TAXES: snapshot.val() est NULL. Le nœud utilisateur n'existe pas dans la BDD !");
            return;
        }
        console.log("💾 DEBUG TAXES: Données utilisateur RAW (snapshot.val()):", userData); 

        // 1. 💰 Récupération du solde (Balance)
        const balance = userData.balance || 0; 
        let hasUnpaidTaxPenalty = userData.hasUnpaidTaxPenalty || false; // Déclaration avec 'let'
        const taxPaidForCurrentPeriod = userData.taxPaidForCurrentPeriod || false;

        // Mettre à jour l'objet window.currentUser avec les données DB (y compris 'balance')
        // Ceci est important pour que toutes les fonctions suivantes travaillent avec des données fraîches.
        window.currentUser = { ...window.currentUser, ...userData };
        window.currentUser.balance = balance; 
        
        // ⚠️ CORRECTION CRITIQUE POUR LE DÉBOGAGE : 
        // Après avoir mis à jour window.currentUser avec les données de la DB, on vérifie 
        // si la console a écrasé hasUnpaidTaxPenalty. Si oui, on utilise cette valeur.
        // Sinon, on utilise la valeur DB par défaut.
        if (window.currentUser.hasUnpaidTaxPenalty) {
             hasUnpaidTaxPenalty = true;
        } else {
             // S'assurer que hasUnpaidTaxPenalty est mis à jour depuis la DB si le test n'est pas actif
             hasUnpaidTaxPenalty = userData.hasUnpaidTaxPenalty || false;
        }
        
        // Fin de la Correction

        // ✅ LOG D'ÉTAT : Maintenant que les variables sont définies
        console.log(`✅ DEBUG TAXES STATUT: Pénalité impayée: ${hasUnpaidTaxPenalty}, Taxe déjà payée: ${taxPaidForCurrentPeriod}.`); 

        // 🚩 LOG CRITIQUE 2: VÉRIFIER LA BALANCE EXTRAITE
        console.log(`💸 DEBUG TAXES: Balance extraite: ${balance} (Type: ${typeof balance}).`);
        if (balance === 0) {
              console.warn("⚠️ DEBUG TAXES: La balance est à ZÉRO. Vérifiez la valeur de 'balance' pour cet UID dans Firebase.");
        }
        
        // Mise à jour de la carte de stats générale (si la fonction existe)
        if (typeof updateProfileBalance === 'function') updateProfileBalance(balance); 

        // Mise à jour du Solde Actuel dans le panneau de taxes
        if (currentFortuneEl) {
            currentFortuneEl.textContent = formatCurrency(balance);
            console.log(`🖼️ DEBUG TAXES: Mise à jour de l'affichage du solde: ${formatCurrency(balance)}`);
        } else {
             console.error("❌ DEBUG TAXES: Élément DOM #current-fortune non trouvé.");
        }

        // 2. 🧮 Calcul et affichage des taxes
        const baseRate = calculateBaseTaxRate(balance);
        let finalRate = baseRate;
        
        if (hasUnpaidTaxPenalty) {
            finalRate += window.TAX_PENALTY_RATE;
        }
        
        const taxDueAmount = (balance * finalRate / 100);

        // 🚩 LOG CRITIQUE 3: VÉRIFIER LES CALCULS
        console.log(`📊 DEBUG TAXES: Taux final: ${finalRate}% (Base: ${baseRate}% / Pénalité: ${hasUnpaidTaxPenalty ? window.TAX_PENALTY_RATE : 0}%)`);
        console.log(`💰 DEBUG TAXES: Montant de la taxe due: ${taxDueAmount} (${formatCurrency(taxDueAmount)})`);


        // ... Reste des mises à jour DOM et de la logique
        if (currentTaxRateEl) currentTaxRateEl.textContent = finalRate + ' %';
        if (taxDueEl) taxDueEl.textContent = formatCurrency(taxDueAmount);
        
        // 3. ⏱️ Gestion du statut de paiement
        const isPeriodOpen = isTaxPeriodOpen(); 
        
        // 🚩 NOUVEAU LOG : Période de paiement
        console.log(`📅 DEBUG TAXES PÉRIODE: Période ouverte pour paiement (isTaxPeriodOpen) : ${isPeriodOpen}.`);
        
        let statusText = '';
        let statusClass = 'status-message'; 
        let isPayable = false;
        let blockMessage = '';

        if (taxPaidForCurrentPeriod) {
            statusText = '✅ Taxes payées pour la période actuelle.';
            statusClass += ' success';
            isPayable = false;
        } else if (balance <= 0) {
             statusText = '💰 Solde de 0 €. Aucune taxe due.';
             statusClass += ' info';
             isPayable = false;
        } else if (!isPeriodOpen) {
            statusText = '⏳ En attente de la période de paiement (Vendredi 18h00 - Lundi 07h30).';
            statusClass += ' warning';
            isPayable = false;
        } else {
            statusText = '⚠️ Taxes dues pour la période actuelle.';
            statusClass += ' error';
            isPayable = true;
        }

        if (hasUnpaidTaxPenalty) {
            statusText += ` (Pénalité de ${window.TAX_PENALTY_RATE}% ajoutée).`;
            blockMessage = '⛔ ATTENTION : Vous avez une pénalité d\'impayé.';
        }

        if (taxStatusEl) {
            taxStatusEl.className = statusClass;
            taxStatusEl.textContent = statusText;
        }
        
        if (payTaxButton) {
            // C'EST CETTE LIGNE QUI DÉSACTIVE LE BOUTON APRES UN PAIEMENT RÉUSSI
            payTaxButton.disabled = !isPayable;
            // ATTACHEMENT DU GESTIONNAIRE D'ÉVÉNEMENT payTax
            payTaxButton.onclick = payTax; 
            
            // 🚩 LOG DU BOUTON
            console.log(`🔘 DEBUG TAXES BOUTON: État final du bouton 'Payer la Taxe': Désactivé = ${payTaxButton.disabled} (isPayable: ${isPayable}).`);
        }
        if (taxBlockMessageEl) {
            taxBlockMessageEl.textContent = blockMessage;
        }
        
    });
};


/**
 * Gère le processus de paiement des taxes par l'utilisateur.
 * @summary Uniformisation: utilise uniquement 'balance' pour le solde.
 */
function payTax() {
    // Récupération des éléments DOM nécessaires pour la fonction
    const payTaxButton = document.getElementById('pay-tax-btn'); 
    const taxBlockMessageEl = document.getElementById('tax-block-message'); 

    // Désactiver le bouton immédiatement pour éviter les clics multiples
    if (payTaxButton) payTaxButton.disabled = true;
    if (taxBlockMessageEl) taxBlockMessageEl.textContent = "Paiement en cours, veuillez patienter...";

    // Vérifications de base
    if (!window.taxPotRef) {
        console.error("❌ ERREUR PAIEMENT: window.taxPotRef n'est pas défini.");
        window.displayMessage("Erreur de connexion : Référence à la cagnotte non trouvée. Veuillez recharger.", "error");
        if (payTaxButton) payTaxButton.disabled = false; // Réactiver si erreur
        if (taxBlockMessageEl) taxBlockMessageEl.textContent = "";
        return; 
    }
    
    if (!window.currentUser) {
        if (payTaxButton) payTaxButton.disabled = false; 
        if (taxBlockMessageEl) taxBlockMessageEl.textContent = "";
        return;
    }
    
    if (!isTaxPeriodOpen()) {
        window.displayMessage("Paiement impossible. La période de paiement est terminée.", "error");
        if (payTaxButton) payTaxButton.disabled = false; 
        if (taxBlockMessageEl) taxBlockMessageEl.textContent = "";
        return;
    }
    
    // ⚠️ Utiliser window.currentUser.balance partout !
    const { uid, balance, hasUnpaidTaxPenalty } = window.currentUser;
    const currentBalance = balance || 0; 
    
    let baseRate = calculateBaseTaxRate(currentBalance);
    let finalRate = baseRate + (hasUnpaidTaxPenalty ? window.TAX_PENALTY_RATE : 0);
    const taxDue = currentBalance * (finalRate / 100);

    console.log(`🎯 DEBUG PAIEMENT: Montant de la taxe à payer: ${taxDue}`);

    if (taxDue <= 0 || currentBalance < taxDue) {
        console.error("❌ ERREUR PAIEMENT: Solde insuffisant ou taxe nulle.", { taxDue, currentBalance });
        window.displayMessage("Erreur: Montant de la taxe invalide ou solde insuffisant.", "error");
        if (payTaxButton) payTaxButton.disabled = false; // Réactiver si erreur
        if (taxBlockMessageEl) taxBlockMessageEl.textContent = "Échec du paiement: solde insuffisant.";
        return;
    }

    const newBalance = currentBalance - taxDue;

    // Mise à jour de l'utilisateur et de la cagnotte via transaction
    const updates = {};
    // 🛑 CORRECTION CRITIQUE: Les clés doivent être relatives au child(uid) de la référence
    // window.usersRef.child(uid).update(updates) s'attend à des clés comme 'balance', non 'users/uid/balance'
    updates['balance'] = newBalance; 
    updates['taxPaidForCurrentPeriod'] = true;
    updates['hasUnpaidTaxPenalty'] = false; 
    
    // =========================================================================
    // ÉTAPE 1: Transaction sur la Cagnotte (Tax Pot)
    // =========================================================================
    console.log("➡️ DEBUG PAIEMENT: Tentative d'ajout de la taxe à la cagnotte...");
    
    window.taxPotRef.transaction((currentValue) => {
        const currentPot = currentValue || 0;
        return currentPot + taxDue;
    }).then((result) => {
        
        if (result.committed === false) {
             console.warn("⚠️ DEBUG PAIEMENT: Transaction sur la cagnotte annulée (non 'committed'). Réessayez.");
             window.displayMessage("Échec de la transaction. Quelqu'un a modifié la cagnotte en même temps, veuillez réessayez.", "warning");
             if (payTaxButton) payTaxButton.disabled = false;
             if (taxBlockMessageEl) taxBlockMessageEl.textContent = "Transaction annulée.";
             return;
        }
        
        console.log("✅ DEBUG PAIEMENT: Cagnotte mise à jour avec succès. Début mise à jour utilisateur.");

        // =========================================================================
        // ÉTAPE 2: Mise à jour des données de l'utilisateur (Balance & Statut)
        // =========================================================================
        // Utilise la bonne structure d'updates pour la référence child(uid)
        window.usersRef.child(uid).update(updates)
            .then(() => {
                console.log("✅ DEBUG PAIEMENT: Mise à jour utilisateur (solde/statut) réussie.");
                
                // Mise à jour de l'objet utilisateur en mémoire IMMÉDIATEMENT
                window.currentUser.balance = newBalance; 
                window.currentUser.taxPaidForCurrentPeriod = true;
                window.currentUser.hasUnpaidTaxPenalty = false;

                // Affichage du succès
                window.displayMessage(`Taxe de ${formatCurrency(taxDue)} payée. Nouveau solde: ${formatCurrency(newBalance)}.`, "success");
                
                // Recharger le panneau (le bouton se désactivera ici)
                loadTaxesPanel(); 
                if (taxBlockMessageEl) taxBlockMessageEl.textContent = "";

            })
            .catch(error => {
                // ERREUR CRITIQUE 2: La cagnotte a été créditée, mais l'utilisateur n'a pas été débité.
                console.error("❌ ERREUR CRITIQUE PAIEMENT: Échec de la mise à jour utilisateur. Erreur:", error);
                window.displayMessage("Erreur critique : La taxe a été ajoutée à la cagnotte, mais votre solde/statut n'a PAS été mis à jour. Veuillez contacter un admin.", "error");
                
                // Réactiver le bouton
                if (payTaxButton) payTaxButton.disabled = false;
                if (taxBlockMessageEl) taxBlockMessageEl.textContent = "Échec de la mise à jour finale. Contactez l'admin.";
            });

    }).catch(error => {
        // ERREUR CRITIQUE 1: Échec de la transaction sur la cagnotte (connexion, règles, etc.)
        console.error("❌ ERREUR CRITIQUE PAIEMENT: Échec de la transaction de la cagnotte. Erreur:", error);
        window.displayMessage("Erreur lors de l'ajout à la cagnotte des taxes. Paiement non effectué.", "error");
        
        // Réactiver le bouton
        if (payTaxButton) payTaxButton.disabled = false;
        if (taxBlockMessageEl) taxBlockMessageEl.textContent = "Échec du paiement. Réessayez ou contactez l'admin.";
    });
}

// app.js - Nouvelle fonction

/**
 * Calcule le timestamp de la date limite de paiement de la taxe (Lundi 7h30).
 * Si nous sommes avant ce Lundi, calcule le Lundi précédent.
 * @param {Date} now - La date et l'heure actuelles.
 * @returns {number} Le timestamp de la dernière date limite (Lundi 7h30).
 */
function getLastTaxDeadline(now) {
    const deadlineHour = 7;
    const deadlineMinute = 30;

    let deadline = new Date(now);
    deadline.setHours(deadlineHour, deadlineMinute, 0, 0);

    // Si nous sommes déjà Lundi après 7h30, la date limite était CE Lundi
    // Sinon, la date limite était le Lundi PRÉCÉDENT
    const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...

    let daysToSubtract;
    if (dayOfWeek === 1 && (now.getHours() > deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() >= deadlineMinute))) {
        // C'est Lundi APRÈS 7h30 : La deadline était aujourd'hui.
        daysToSubtract = 0;
    } else if (dayOfWeek === 1) {
        // C'est Lundi AVANT 7h30 : La deadline était le Lundi PRECEDENT (7 jours avant)
        daysToSubtract = 7;
    } else {
        // Tous les autres jours : La deadline était le Lundi PRÉCÉDENT.
        // Calcul pour revenir au Lundi (jour 1)
        daysToSubtract = dayOfWeek - 1;
        if (daysToSubtract < 0) { // Si c'est Dimanche (0), revient à -1 jour, on veut 6 jours en arrière pour le Lundi précédent.
            daysToSubtract = 6;
        }
        daysToSubtract += 7; // On veut toujours le Lundi PRÉCÉDENT, donc on ajoute 7 jours pour s'assurer d'être à la bonne semaine
    }
    
    // Le calcul est délicat, mais une méthode plus simple est de toujours revenir au Lundi le plus proche, puis s'ajuster
    let lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Retourne au Lundi de cette semaine (ou la précédente)
    lastMonday.setHours(deadlineHour, deadlineMinute, 0, 0);

    // Si cette deadline est DANS LE FUTUR (car on est Dimanche par exemple), on revient à la semaine passée
    if (lastMonday.getTime() > now.getTime()) {
        lastMonday.setDate(lastMonday.getDate() - 7);
    }
    
    // Si la deadline était ce Lundi après 7h30, on veut cette date (cas du Lundi après 7h30)
    // Le calcul doit être précis sur la date limite.

    // On utilise la formule la plus simple pour la date limite passée :
    let deadlineTime = new Date(now);
    // On recule pour trouver le dernier Lundi
    deadlineTime.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    deadlineTime.setHours(deadlineHour, deadlineMinute, 0, 0);

    // Si on est Lundi > 7h30, on prend la date d'aujourd'hui.
    // Si on est avant Lundi 7h30, on prend la semaine passée.
    if (dayOfWeek === 1 && (now.getHours() < deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() < deadlineMinute))) {
        deadlineTime.setDate(deadlineTime.getDate() - 7);
    } else if (dayOfWeek !== 1 && deadlineTime.getTime() > now.getTime()) {
        // Cas où on recule et on se retrouve dans le futur (ex: Dimanche, on recule de -6, on arrive Lundi prochain)
        deadlineTime.setDate(deadlineTime.getDate() - 7);
    }
    
    return deadlineTime.getTime();
}

// app.js - Nouvelle fonction

/**
 * Vérifie si le statut de la taxe doit être réinitialisé pour une nouvelle semaine.
 */
function checkAndResetWeeklyTaxStatus() {
    if (!window.currentUser || !window.currentUser.uid) return;
    
    const now = new Date();
    // Le timestamp du dernier Lundi 7h30 (date limite passée)
    const lastDeadline = getLastTaxDeadline(now); 
    
    // La date de la dernière réinitialisation enregistrée pour l'utilisateur
    const lastReset = window.currentUser.lastTaxResetTimestamp || 0; 
    
    // Si la dernière réinitialisation est antérieure à la dernière date limite, 
    // ou si c'est la première connexion et qu'on a dépassé un Lundi 7h30 :
    if (lastReset < lastDeadline) {
        
        // 1. Appliquer la pénalité si la taxe de la semaine passée n'a PAS été payée
        if (!window.currentUser.taxPaidForCurrentPeriod) {
            window.currentUser.hasUnpaidTaxPenalty = true;
            window.displayMessage("Pénalité de taxe appliquée ! Le taux a augmenté.", "error");
        } else {
            // Si la taxe a été payée, on enlève la pénalité (au cas où elle était active)
            window.currentUser.hasUnpaidTaxPenalty = false;
        }

        // 2. Réinitialiser le statut de paiement pour la nouvelle période
        window.currentUser.taxPaidForCurrentPeriod = false; 
        
        // 3. Mettre à jour le timestamp de réinitialisation
        window.currentUser.lastTaxResetTimestamp = now.getTime();
        
        // 4. Mettre à jour Firebase avec le nouveau statut
        window.usersRef.child(window.currentUser.uid).update({
            taxPaidForCurrentPeriod: false,
            hasUnpaidTaxPenalty: window.currentUser.hasUnpaidTaxPenalty,
            lastTaxResetTimestamp: window.currentUser.lastTaxResetTimestamp
        }).catch(error => {
            console.error("Erreur de réinitialisation de taxe:", error);
        });
    }
}

// IMPORTANT : Appelez cette fonction dans la logique d'initialisation (e.g., dans initApp ou onAuthStateChanged)
// pour que la vérification se fasse dès la connexion de l'utilisateur.

// app.js - Nouvelle fonction

/**
 * Détermine le taux d'imposition de base en fonction du solde de l'utilisateur.
 * @param {number} fortune - Le solde (fortune) de l'utilisateur.
 * @returns {number} Le taux d'imposition de base en pourcentage.
 */
function calculateBaseTaxRate(fortune) {
    let baseRate = 0;

    // Parcourir les paliers définis
    for (const bracket of window.TAX_BRACKETS) {
        if (fortune >= bracket.threshold) {
            // Le taux est mis à jour à chaque palier franchi
            baseRate = bracket.rate;
        }
    }
    // Si la fortune est de 0, le taux de base sera 3% (selon le premier palier)
    return baseRate;
}


// app.js - Quelque part avec vos autres fonctions utilitaires

/**
 * Formatage de la monnaie en €
 * @param {number} amount
 * @returns {string} Montant formaté.
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number') return 'N/A';
    // Assurez-vous que la fonction toFixed est utilisée pour la décimale
    return amount.toFixed(2).replace('.', ',') + ' €'; 
}

/**
 * Vérifie si nous sommes dans la période de paiement des taxes (Vendredi 18h à Lundi 7h30).
 * @returns {boolean} True si le paiement est autorisé, False sinon.
 */
function isTaxPeriodOpen() {
    const now = new Date();
    const day = now.getDay(); // 0=Dimanche, 5=Vendredi, 6=Samedi
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // ❌ LIGNE SUPPRIMÉE : console.log(`... ${taxPeriodOpen}.`);
    
    // Période 1: Vendredi (Jour 5) après 18h00
    const isFridayOpen = (day === 5 && (hours >= 18));

    // Période 2: Samedi (Jour 6) - Toujours ouvert
    const isSaturdayOpen = (day === 6);

    // Période 3: Dimanche (Jour 0) - Toujours ouvert
    const isSundayOpen = (day === 0);

    // Période 4: Lundi (Jour 1) avant 7h30
    const isMondayOpen = (day === 1 && (hours < 7 || (hours === 7 && minutes < 30)));

    return isFridayOpen || isSaturdayOpen || isSundayOpen || isMondayOpen;
}

if (payTaxButton) {
    payTaxButton.addEventListener('click', payTax);
}

// app.js - Quelque part après la fonction loadTaxesPanel()

/**
 * Charge et affiche les informations fiscales pour l'administrateur:
 * - Le montant total de la cagnotte des taxes.
 * - La liste des utilisateurs ayant une pénalité de taxe impayée.
 */
window.loadAdminTaxesPanel = () => {
    // Mesure de sécurité: vérifier le rôle (même si showAdminSubPanel devrait déjà le faire)
    if (!window.currentUser || !window.currentUser.isAdmin) {
        window.displayMessage("Accès refusé. Vous n'êtes pas administrateur.", "error");
        if (taxPotTotalEl) taxPotTotalEl.textContent = 'Accès non autorisé';
        if (unpaidTaxListEl) unpaidTaxListEl.innerHTML = '<li>Accès non autorisé.</li>';
        return;
    }

    // 1. Charger la Cagnotte Totale des Taxes (Realtime Database)
    if (window.taxPotRef && taxPotTotalEl) {
        window.taxPotRef.once('value')
            .then(snapshot => {
                // Le montant de la cagnotte (peut être 0 si vide)
                const totalPot = snapshot.val() || 0; 
                taxPotTotalEl.textContent = formatCurrency(totalPot);
            })
            .catch(error => {
                console.error("Erreur lecture cagnotte taxes:", error);
                taxPotTotalEl.textContent = 'Erreur de chargement';
            });
    }

    // 2. Charger la liste des Utilisateurs et filtrer ceux avec pénalité
    if (window.usersRef && unpaidTaxListEl) {
        unpaidTaxListEl.innerHTML = '<li>Chargement des utilisateurs impayés...</li>'; // Placeholder
        
        // Charger tous les utilisateurs pour le filtrage
        window.usersRef.once('value')
            .then(snapshot => {
                const users = snapshot.val();
                let unpaidUsersHtml = '';
                let penaltyCount = 0;

                if (users) {
                    Object.keys(users).forEach(uid => {
                        const user = users[uid];
                        
                        // Filtrer ceux qui ont la pénalité active (hasUnpaidTaxPenalty: true)
                        if (user.hasUnpaidTaxPenalty === true) {
                            penaltyCount++;
                            unpaidUsersHtml += `
                                <li class="report-item">
                                    <span class="report-user">👤 ${user.pseudo || 'Utilisateur inconnu'}</span> 
                                    <span class="report-date" style="color:red; font-weight:bold;">🚨 PÉNALITÉ ACTIVE</span>
                                    <p class="report-message">
                                        Fortune actuelle : ${formatCurrency(user.fortune || 0)}
                                    </p>
                                    <button class="action-button small-btn" onclick="adminRemoveTaxPenalty('${uid}', '${user.pseudo}')">
                                        Retirer Pénalité
                                    </button>
                                </li>
                            `;
                        }
                    });
                }

                if (penaltyCount === 0) {
                    unpaidUsersHtml = '<li style="color: green; font-weight: bold;">🎉 Aucun utilisateur n\'a de taxe impayée ou de pénalité en cours.</li>';
                }
                
                unpaidTaxListEl.innerHTML = unpaidUsersHtml;
            })
            .catch(error => {
                console.error("Erreur lecture liste utilisateurs:", error);
                unpaidTaxListEl.innerHTML = '<li>Erreur lors du chargement des impayés.</li>';
            });
    }
};

/**
 * Fonction Administrateur pour retirer manuellement la pénalité de taxe.
 * Cette fonction est appelée directement par le bouton dans la liste.
 * @param {string} uid L'UID de l'utilisateur.
 * @param {string} pseudo Le pseudo de l'utilisateur pour le message de confirmation.
 */
function adminRemoveTaxPenalty(uid, pseudo) {
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer la pénalité de taxe impayée pour ${pseudo}?`)) {
        return;
    }
    
    // Mettre à jour Firebase: annuler la pénalité et marquer comme payé pour la période
    window.usersRef.child(uid).update({
        hasUnpaidTaxPenalty: false,
        taxPaidForCurrentPeriod: true 
    })
    .then(() => {
        window.displayMessage(`Pénalité de taxe retirée avec succès pour ${pseudo}.`, "success");
        // Recharger le panneau pour mettre à jour la liste immédiatement
        loadAdminTaxesPanel(); 
    })
    .catch(error => {
        console.error("Erreur lors du retrait de la pénalité:", error);
        window.displayMessage("Erreur lors du retrait de la pénalité.", "error");
    });
};

// app.js

/**
 * Calcule le montant de taxe dû en fonction du solde de l'utilisateur.
 * @param {number} balance - Le solde (fortune) de l'utilisateur.
 * @returns {number} Le montant de la taxe en € (ou Octets).
 */
function calculateTaxDue(balance) {
    // Si le solde est inférieur au premier seuil (0 €), la taxe est de 0
    if (balance <= 0) return 0;
    
    // Récupère le taux approprié (e.g., 3, 5, 8, ou 10)
    const baseRate = calculateBaseTaxRate(balance); 
    
    // Calcule le montant
    const taxAmount = balance * (baseRate / 100);
    
    // On peut arrondir à deux décimales
    return parseFloat(taxAmount.toFixed(2));
}

// app.js

/**
 * Met à jour l'interface utilisateur du profil après la connexion et affiche le statut de la taxe.
 * Cette fonction injecte le squelette HTML complet, que loadTaxesPanel remplira.
 * @param {object} user - L'objet utilisateur courant (incluant les données RTDB).
 */
function updateUserProfileUI(user) {
    const userInfoEl = document.getElementById('user-info');
    
    // **IMPORTANT : Exécuter la logique de vérification de la taxe avant l'affichage**
    if (typeof checkAndApplyTaxLogic === 'function') {
        checkAndApplyTaxLogic(user); 
    }

    const balance = user.balance || 0;
    const totalWon = user.totalWon || 0;
    const isAdmin = user.isAdmin || false;
    
    // Mise à jour de l'élément d'information utilisateur
    // CE BLOC HTML injecté dans #user-info DOIT CONTENIR les IDs pour le résumé.
    userInfoEl.innerHTML = `
        <div class="user-profile-card">
            <p>👋 Bonjour, <strong>${user.name || user.pseudo || user.email}</strong></p>
            <p>Statut: ${isAdmin ? '<span style="color:#f44336; font-weight:bold;">Administrateur</span>' : 'Joueur'}</p>
            <hr>
            
            <div class="tax-panel-summary">
                <p>💰 Solde : **<span id="current-fortune-summary">${formatCurrency(balance)}</span>**</p>
                <p>🏆 Total Gagné (vie) : **${formatCurrency(totalWon)}**</p>
                <hr>
                
                <p>Montant dû : <strong id="tax-due-amount-summary">Chargement...</strong></p>
                
                <div id="tax-status-container">
                    <p id="tax-status-message-summary" class="status-message">Chargement du statut...</p>
                    <button id="pay-tax-btn-summary" class="button small" disabled>Payer la Taxe</button>
                    <p id="tax-block-message-summary" style="color:red;"></p>
                </div>
            </div>
            <button id="logout-btn" class="button secondary small">Déconnexion</button>
        </div>
    `;
    
    // ---
    // NOTE: Il faudra peut-être mettre à jour loadTaxesPanel pour cibler ces nouveaux IDs
    // s'il ne cible pas déjà les IDs de la sous-section. Si vous nous donniez le code
    // de loadTaxesPanel, nous pourrions le corriger en 10 secondes pour cibler les deux endroits !
    // ---

    // Affiche la section principale de l'application
    window.showSection('queue-section'); 
    document.getElementById('main-header').style.display = 'flex';
}
// ====================================================================
// 🏆 DÉFINITION DES SUCCÈS
// ====================================================================

const ACHIEVEMENTS = [
    {
        id: 'firstWin',
        name: 'Premier Sang',
        description: 'Gagner son tout premier pari.',
        criteria: (stats) => stats.totalWins >= 1,
    },
    {
        id: 'tenWins',
        name: 'Le Gagneur',
        description: 'Atteindre 10 victoires au total.',
        criteria: (stats) => stats.totalWins >= 10,
    },
    {
        id: 'bigEarner',
        name: 'Le Millionnaire',
        description: 'Accumuler un total de 1000€ de gains.',
        criteria: (stats) => stats.totalWon >= 1000,
    },
    {
        id: 'highRoller',
        name: 'Flambeur',
        description: 'Parier un total de 500€ (somme des paris).',
        criteria: (stats) => stats.totalBetsAmount >= 500,
    },
    // Nouveaux Succès
    {
        id: 'marathoner',
        name: 'Marathonien',
        description: 'Participer à 50 parties (victoires + défaites).',
        criteria: (stats) => (stats.totalWins + stats.totalLosses) >= 50,
    },
    {
        id: 'unstoppable',
        name: 'Inarrêtable',
        description: 'Atteindre une série de 5 victoires consécutives.',
        criteria: (stats) => stats.maxWinStreak >= 5,
    },
    {
        id: 'betMaster',
        name: 'Maître Parieur',
        description: 'Placer 100 paris au total.',
        criteria: (stats) => stats.totalBetsCount >= 100,
    },
    {
        id: 'deepPockets',
        name: 'Grand Pari',
        description: 'Placer un seul pari de 100€ ou plus (suivi du plus gros pari).',
        criteria: (stats) => stats.maxSingleBet >= 100,
    }
];

// ====================================================================
// 🧠 LOGIQUE DE VÉRIFICATION ET DÉBLOCAGE
// ====================================================================

/**
 * Vérifie si un succès doit être débloqué et exécute la transaction.
 * @param {object} userData - L'objet utilisateur complet (via le listener Firebase)
 */
function checkAchievements(userData) {
    if (!userData || !window.currentUser || !window.usersRef) return;

    // Récupère TOUTES les stats nécessaires pour la vérification
    const userStats = {
        totalWins: userData.totalWins || 0,
        totalWon: userData.totalWon || 0,
        totalBetsAmount: userData.totalBetsAmount || 0,
        totalLosses: userData.totalLosses || 0, // NOUVEAU
        maxWinStreak: userData.maxWinStreak || 0, // NOUVEAU
        totalBetsCount: userData.totalBetsCount || 0, // NOUVEAU
        maxSingleBet: userData.maxSingleBet || 0, // NOUVEAU
    };
    
    const unlockedAchievements = userData.achievements || {};

    ACHIEVEMENTS.forEach(achievement => {
        const achievementData = unlockedAchievements[achievement.id];
        // Gère la rétro-compatibilité: si c'est un timestamp (ancien format) ou un objet avec rewardGranted: true
        const isRewardGranted = achievementData && (typeof achievementData === 'object' ? achievementData.rewardGranted : true);
        
        // Si le critère est rempli ET que le déblocage n'a pas été traité
        if (achievement.criteria(userStats) && !isRewardGranted) {
            
            // Lancer une transaction sécurisée pour débloquer
            const userRef = window.usersRef.child(window.currentUser.uid);
            
            userRef.transaction(currentData => {
                if (currentData === null) return currentData; 
                
                // Double vérification (pour éviter la re-déclenchement en cas de course)
                const currentAchievementData = currentData.achievements && currentData.achievements[achievement.id];
                const alreadyRewarded = currentAchievementData && (typeof currentAchievementData === 'object' ? currentAchievementData.rewardGranted : true);

                if (alreadyRewarded) {
                    return currentData;
                }
                
                // 1. Débloquer et marquer la récompense comme donnée
                currentData.achievements = currentData.achievements || {};
                
                // Sauvegarde l'objet avec la date et le flag de récompense
                currentData.achievements[achievement.id] = {
                    unlockedAt: currentAchievementData && typeof currentAchievementData === 'object' ? currentAchievementData.unlockedAt : Date.now(),
                    rewardGranted: true
                };
                
                // 🛑 LIGNE DE RÉCOMPENSE EN ARGENT RETIRÉE
                
                return currentData;
            }).then(result => {
                if (result.committed) {
                    // Message simple de déblocage
                    window.displayMessage(`🎉 SUCCÈS DÉBLOQUÉ : ${achievement.name}!`, 'success');
                }
            }).catch(error => {
                console.error("Erreur de transaction lors du déblocage de succès:", error);
            });
        }
    });
}


// ====================================================================
// 🖼️ AFFICHAGE DANS L'INTERFACE
// ====================================================================

/**
 * Génère le texte de progression pour l'affichage.
 */
function getProgressText(achievement, userData) {
    const wins = userData.totalWins || 0;
    const won = userData.totalWon || 0;
    const betsAmount = userData.totalBetsAmount || 0;
    const losses = userData.totalLosses || 0; // NOUVEAU
    const maxStreak = userData.maxWinStreak || 0; // NOUVEAU
    const betsCount = userData.totalBetsCount || 0; // NOUVEAU
    const maxBet = userData.maxSingleBet || 0; // NOUVEAU
    
    switch (achievement.id) {
        case 'firstWin':
            return `${wins} / 1 victoire`;
        case 'tenWins':
            return `${wins} / 10 victoires`;
        case 'bigEarner':
            return `${won.toFixed(2)}€ / 1000.00€`;
        case 'highRoller':
            return `${betsAmount.toFixed(2)}€ / 500.00€`;
        // Cas des nouveaux succès
        case 'marathoner':
            return `${wins + losses} / 50 parties jouées`;
        case 'unstoppable':
            return `${maxStreak} / 5 de série de victoire`;
        case 'betMaster':
            return `${betsCount} / 100 paris placés`;
        case 'deepPockets':
            return `${maxBet.toFixed(2)}€ / 100.00€ sur un pari`;
        default:
            return '';
    }
}

/**
 * Affiche la liste des succès dans la section dédiée.
 */
function renderAchievements() {
    const listEl = document.getElementById('achievements-list');
    if (!listEl || !window.currentUser) return;
    
    // Les données des succès débloqués par l'utilisateur
    const unlocked = window.currentUser.achievements || {};
    listEl.innerHTML = ''; // Nettoyer la liste
    
    ACHIEVEMENTS.forEach(ach => {
        const achievementData = unlocked[ach.id];
        const isUnlocked = !!achievementData;

        // Déterminer le timestamp de déblocage (supporte l'ancien format 'timestamp' ou le nouveau '{unlockedAt: timestamp}')
        let unlockTime = null;
        if (isUnlocked) {
            if (typeof achievementData === 'object' && achievementData.unlockedAt) {
                unlockTime = achievementData.unlockedAt; // Nouveau format
            } else if (typeof achievementData === 'number') {
                unlockTime = achievementData; // Ancien format (juste le timestamp)
            }
        }

        const dateUnlocked = unlockTime ? new Date(unlockTime).toLocaleDateString() : 'Verrouillé';
        
        const achievementDiv = document.createElement('div');
        achievementDiv.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        // La progression ou le statut de déblocage
        const statusText = isUnlocked 
            ? 'Débloqué le ' + dateUnlocked 
            : 'Progression: ' + getProgressText(ach, window.currentUser);

        achievementDiv.innerHTML = `
            <span class="icon">${isUnlocked ? '🏆' : '🔒'}</span>
            <div class="details">
                <h4 class="name">${ach.name}</h4>
                <p class="description">${ach.description}</p>
                
                <p class="status">${statusText}</p>
            </div>
        `;
        listEl.appendChild(achievementDiv);
    });
}

// Intercepter la navigation pour appeler renderAchievements lorsque l'onglet est sélectionné
if (window.showSection) {
    const originalShowSection = window.showSection;
    window.showSection = (sectionId) => {
        originalShowSection(sectionId);
        if (sectionId === 'achievements-section') {
            // S'assurer que les données sont à jour avant le rendu
            if (window.currentUser) {
                renderAchievements();
            }
        }
    };
}
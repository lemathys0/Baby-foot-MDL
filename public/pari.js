// =========================
// 🔹 PARIS / MATCHS
// =========================

// Références globales (assumées définies dans firebase-config.js) :
// window.matchesRef, window.usersRef, window.currentUser, etc.

// Création d’un match
if (createMatchForm) {
  createMatchForm.addEventListener("submit", e => {
    e.preventDefault();

    const team1 = document.getElementById("team1").value.trim();
    const team2 = document.getElementById("team2").value.trim();
    const oddsTeam1 = parseFloat(document.getElementById("oddsTeam1").value);
    const oddsTeam2 = parseFloat(document.getElementById("oddsTeam2").value);

    // Utilisation du système de message
    if (!team1 || !team2 || isNaN(oddsTeam1) || isNaN(oddsTeam2)) {
      displayMessage("Erreur : Veuillez remplir toutes les informations (nom des équipes et cotes).", 'error'); // ✅
      return;
    }

    // Ajout dans la Realtime Database
    window.matchesRef.push({
      team1,
      team2,
      oddsTeam1,
      oddsTeam2,
      finished: false,
      winner: null,
      bets: {},
      // 🚨 NOUVEAU: Ajout de l'horodatage de création pour la restriction de pari de 2 minutes
      createdAt: firebase.database.ServerValue.TIMESTAMP 
    }).then(() => {
        checkOdds(oddsTeam1, oddsTeam2);
        displayMessage(`Match créé : ${team1} vs ${team2}. Bon jeu !`, 'success'); // ✅ Message de succès
    });

    createMatchForm.reset();
  });
}

// Constante de temps (2 minutes en millisecondes)
const BETTING_DURATION_MS = 2 * 60 * 1000;


// Stocker les intervalles pour pouvoir les effacer lors de la mise à jour de la liste
const matchTimers = {};

// ===================================
// GESTION DU TIMER (À placer dans pari.js)
// ===================================

/**
 * Met à jour l'affichage du temps restant pour un pari.
 * @param {string} matchId ID du pari/match.
 * @param {number} createdAt Horodatage de création du pari.
 */
function updateBettingTimer(matchId, createdAt) {
    const timerElement = document.getElementById(`match-timer-${matchId}`);
    const betBtn = document.querySelector(`#bet-form-${matchId} button[type="submit"]`);

    // S'assurer que les éléments existent
    if (!timerElement) {
        clearInterval(matchTimers[matchId]);
        delete matchTimers[matchId];
        return;
    }

    const now = Date.now();
    const elapsedTime = now - createdAt;
    const timeLeft = BETTING_DURATION_MS - elapsedTime;

    if (timeLeft <= 0) {
        // Temps écoulé : Désactiver et arrêter le timer
        timerElement.textContent = "⏱️ Paris Clôturés";
        timerElement.classList.add('timer-expired');
        
        if (betBtn && !betBtn.disabled) {
             betBtn.disabled = true;
             betBtn.textContent = "Clôturé";
             displayMessage(`Le temps de pari pour ${matchId} est écoulé.`, 'warning', 3000);
        }
        
        clearInterval(matchTimers[matchId]);
        delete matchTimers[matchId];
        
    } else {
        // Temps restant
        const secondsTotal = Math.floor(timeLeft / 1000);
        const minutes = Math.floor(secondsTotal / 60);
        const remainingSeconds = secondsTotal % 60;

        timerElement.textContent = `⏱️ ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        timerElement.classList.remove('timer-expired');

        // S'assurer que le bouton est actif tant qu'il reste du temps
        if (betBtn) {
            betBtn.disabled = false;
            betBtn.textContent = "Parier";
        }
    }
}

/**
 * Gère le placement d'un pari (débit du solde et enregistrement du pari).
 * Mise à jour pour inclure le suivi des statistiques de succès.
 */
/**
 * Gère le placement d'un pari (débit du solde et enregistrement du pari).
 * Mise à jour pour inclure le suivi des statistiques de succès.
 */
/**
 * Gère le placement d'un pari (débit du solde et enregistrement du pari).
 * @param {string} matchId ID Firebase du match.
 * @param {number} amount Montant du pari.
 * @param {string} selectedTeam Équipe sélectionnée.
 */
function handleBetPlacement(matchId, amount, selectedTeam) {
    const userId = window.currentUser.uid;
    const userRef = window.usersRef.child(userId); 
    const matchBetsRef = window.matchesRef.child(matchId).child('bets');

    // 1. Récupérer les données du match pour vérifier l'heure de création
    window.matchesRef.child(matchId).once('value')
        .then(snapshot => {
            const match = snapshot.val();
            
            if (!match) {
                displayMessage("Erreur : Match introuvable.", 'error');
                return;
            }

            // ... (Logique de restriction de temps, inchangée) ...
            const currentTime = Date.now();
            const creationTime = match.createdAt;
            
            if (creationTime) {
                const timeElapsed = currentTime - creationTime;

                if (timeElapsed > BETTING_DURATION_MS) { 
                    displayMessage(
                        "Pari refusé : La période de pari initiale (2 minutes) est terminée pour ce match.", 
                        'warning'
                    );
                    return; 
                }
            } else {
                console.warn(`Le match ${matchId} n'a pas d'horodatage de création. Pari autorisé par défaut.`);
            }
            // ... (Fin de la logique de restriction de temps) ...


            // ====================================================================
            // 2. 🔑 LOGIQUE ATOMIQUE DE TRANSACTION (DÉBIT ET MISE À JOUR DES STATS)
            // ====================================================================

            userRef.transaction(currentData => { 
                
                if (currentData === null) return currentData; 

                const currentBalance = currentData.balance || 0;
                
                if (currentBalance < amount) {
                    // Refuser la transaction (important : ceci est géré dans le callback de complétion)
                    return; // Aborte la transaction
                }
                
                // 1. Débit du solde
                currentData.balance = currentBalance - amount; 
                
                // 2. 🟢 MISE À JOUR DES STATS DE SUCCÈS (Pari placé)
                
                // Succès 'Flambeur' (HighRoller) : Total cumulé des paris
                // S'assurer que 'totalBetsAmount' est correctement incrémenté
                currentData.totalBetsAmount = (currentData.totalBetsAmount || 0) + amount; // 🚨 CORRECTION POUR FLAMBEUR
                
                // Succès 'Maître Parieur' (BetMaster) : Nombre total de paris
                // S'assurer que 'totalBetsCount' est correctement incrémenté
                currentData.totalBetsCount = (currentData.totalBetsCount || 0) + 1; // 🚨 CORRECTION POUR MAÎTRE PARIEUR
                
                // Succès 'DeepPockets' (Plus gros pari unique - si vous l'avez)
                const currentMaxBet = currentData.maxSingleBet || 0;
                if (amount > currentMaxBet) {
                    currentData.maxSingleBet = amount;
                }
                
                // Retourner l'objet utilisateur mis à jour
                return currentData; 
                
            }, (error, committed, snapshot) => {
                if (error) {
                    console.error("Erreur de transaction du solde:", error);
                    displayMessage("Erreur serveur lors du débit du solde. Veuillez réessayer.", 'error');
                } else if (!committed) {
                    // La transaction a été annulée (probablement solde insuffisant)
                    displayMessage("Erreur : Solde insuffisant pour placer ce pari.", 'error'); // Affiche le message d'échec
                } else {
                    // 🎉 SUCCÈS : Le solde est débité et les stats sont mises à jour.

                    // 🟢 Appel de vérification des succès
                    if (typeof window.checkAchievements === 'function' && snapshot.val()) {
                         window.checkAchievements(snapshot.val()); // 🚨 VÉRIFICATION DE SUCCÈS
                    }

                    // Enregistrement du pari.
                    const betData = {
                        userId: userId,
                        amount: amount,
                        team: selectedTeam,
                        timestamp: Date.now()
                    };
                    
                    matchBetsRef.push(betData)
                        .then(() => {
                            displayMessage(`Pari de ${amount} crédits sur ${selectedTeam} placé avec succès !`, 'success');
                        })
                        .catch(err => {
                            console.error("Erreur CRITIQUE: Solde débité, mais pari non enregistré.", err);
                            displayMessage("Pari non enregistré ! Contactez l'admin pour récupérer votre solde.", 'error');
                        });
                }
            });

        })
        .catch(error => {
            console.error("Erreur lors de la vérification du match pour le pari:", error);
            displayMessage("Erreur technique lors du placement du pari.", 'error');
        });
}

/**
 * Clôture un match en vérifiant qu'il ne l'a pas été auparavant (double sécurité)
 * et enregistre l'utilisateur qui a validé le résultat.
 *
 * @param {string} matchId ID du match.
 */
function finishMatch(matchId) {
    // 1. Récupérer les données du match pour le prompt
    window.matchesRef.child(matchId).once('value', snapshot => {
        const match = snapshot.val();
        
        // 🚨 Vérification préliminaire de l'utilisateur et du match
        if (!window.currentUser || !window.currentUser.uid) { 
            displayMessage("Erreur : Vous devez être connecté pour terminer un match.", 'error');
            return;
        }
        if (!match) {
            displayMessage("Erreur : Match introuvable ou déjà supprimé.", 'error');
            return;
        }

        // 2. Prompt (saisie du gagnant)
        const winnerTeam = prompt(`Entrez le nom de l'équipe gagnante pour le match ${match.team1} vs ${match.team2} (tapez "${match.team1}" ou "${match.team2}") :`);
        
        if (!winnerTeam) return;

        if (winnerTeam !== match.team1 && winnerTeam !== match.team2) {
            displayMessage("Nom de l'équipe gagnante invalide.", 'error');
            return;
        }
        
        const matchRef = window.matchesRef.child(matchId);
        
        // 3. 🔑 TRANSACTION ATOMIQUE pour la double sécurité et la traçabilité
        matchRef.transaction(currentMatch => {
            if (currentMatch === null) {
                displayMessage("Erreur : Match introuvable pour la clôture (dans la transaction).", 'error');
                return; // Annule la transaction
            }

            // 🛑 DOUBLE SÉCURITÉ : Empêcher la re-validation
            if (currentMatch.finished === true) {
                const finisherInfo = currentMatch.finishedByName || currentMatch.finishedByUID || 'un autre administrateur';
                displayMessage(`Erreur : Le match a déjà été clôturé par ${finisherInfo}. Les gains ne seront pas distribués deux fois.`, 'warning');
                return; // Annule la transaction (retourne undefined)
            }

            // 📝 Mise à jour des champs
            currentMatch.finished = true;
            currentMatch.winner = winnerTeam;
            currentMatch.finishedByUID = window.currentUser.uid; 
            currentMatch.finishedByName = window.currentUser.name || 'Admin';
            
            return currentMatch; // Met à jour l'objet dans Firebase

        }, (error, committed, snapshot) => {
            if (error) {
                console.error("Erreur de transaction lors de la validation du match:", error);
                displayMessage("Erreur serveur lors de la validation. Veuillez réessayer.", 'error');
            } else if (!committed) {
                // La transaction a été annulée (déjà terminée)
                // Le message d'erreur est géré dans le bloc 'if (currentMatch.finished === true)'
            } else {
                // 🎉 SUCCÈS : Le match a été validé une seule fois
                displayMessage(`Match ${match.team1} vs ${match.team2} terminé ! Gagnant : ${winnerTeam}. Distribution des gains en cours...`, 'success');
                
                // Lancer la distribution des gains
                if (typeof processBetWinnings === 'function') {
                    processBetWinnings(matchId, winnerTeam); 
                }
            }
        });
    }); // Fin de once('value', ...)
}

// pari.js (Dans le bloc de l'écouteur des matchs)
if (matchListEl) {
    window.matchesRef.on("value", snapshot => {
        matchListEl.innerHTML = "";
        const matches = snapshot.val();
        if (!matches) return;

        // 🧹 ÉTAPE CRITIQUE : Nettoyer tous les anciens timers avant de les recréer/redémarrer
        Object.values(matchTimers).forEach(clearInterval);
        Object.keys(matchTimers).forEach(key => delete matchTimers[key]);
        
        // ----------------------------------------------------
        // 1. Tri du plus RÉCENT au plus ANCIEN
        // ----------------------------------------------------
        let sortedMatches = Object.entries(matches);
        sortedMatches.sort(([idA, matchA], [idB, matchB]) => {
            return idB.localeCompare(idA); 
        });
        // ----------------------------------------------------

        // 2. Boucle sur les matchs triés
        sortedMatches.forEach(([id, match]) => { 
            
            // 🛑 GESTION DU CHRONO ET DU STATUT 
            let timerIsActive = false;
            if (!match.finished && match.createdAt) {
                const now = Date.now();
                const timeDiff = now - match.createdAt;
                if (timeDiff < BETTING_DURATION_MS) {
                    timerIsActive = true;
                }
            }

            // --- Début de la création de la carte (HTML) ---
            const card = document.createElement("div");
            card.className = "match-card";
            const totalBets = match.bets ? Object.keys(match.bets).length : 0;
            
            card.innerHTML = `
                 <div id="match-timer-${id}" class="match-timer">
                     ⏱️ ${timerIsActive ? 'Actif...' : 'Terminé'}
                 </div>
                 <div class="match-header">
                     <h3>⚽ ${match.team1} <span class="vs">vs</span> ${match.team2}</h3>
                 </div>
                 <div class="teams-container">
                    <div class="team-box">
                        <h4>${match.team1}</h4>
                        <p class="odds">Cote : <strong>${match.oddsTeam1}</strong></p>
                        <button id="bet1-${id}" class="bet-btn" ${match.finished || !timerIsActive ? "disabled" : ""}> 
                            Parier ${match.team1}
                        </button>
                    </div>
                    <div class="team-box">
                        <h4>${match.team2}</h4>
                        <p class="odds">Cote : <strong>${match.oddsTeam2}</strong></p>
                        <button id="bet2-${id}" class="bet-btn" ${match.finished || !timerIsActive ? "disabled" : ""}> 
                            Parier ${match.team2}
                        </button>
                    </div>
                 </div>
                 <p class="text-xs text-gray-500 mt-2">${totalBets} pari(s) déjà placé(s)</p>
                 <div class="bet-section">
                    ${
                        match.finished
                        ? `<p class="match-ended">✅ Match terminé<br><span class="winner">🏆 Gagnant : ${match.winner || "Non défini"}</span></p>`
                        : `<input type="number" placeholder="Montant en €" min="1" id="bet-${id}" ${!timerIsActive ? "disabled" : ""}>
                           <button id="finish-${id}" class="finish-btn">🏁 Terminer le match</button>`
                    }
                 </div>
                 <ul id="bet-list-${id}" class="bet-list"></ul>
             `;

            matchListEl.appendChild(card);
            
            // 🚀 Démarrer le chrono si le match est actif
            if (timerIsActive) {
                // Initialise le chrono immédiatement
                updateBettingTimer(id, match.createdAt);
                // Démarre l'intervalle de 1 seconde
                matchTimers[id] = setInterval(() => updateBettingTimer(id, match.createdAt), 1000);
            }


            // Références locales (Définition D'ABORD)
            const betListEl = document.getElementById(`bet-list-${id}`);
            const betInput = document.getElementById(`bet-${id}`);
            const bet1Btn = document.getElementById(`bet1-${id}`);
            const bet2Btn = document.getElementById(`bet2-${id}`);
            const finishBtn = document.getElementById(`finish-${id}`);
            
            // Afficher les paris existants
            if (match.bets) {
                Object.entries(match.bets).forEach(([uid, bet]) => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                      <strong>${bet.name || uid}</strong> a parié 
                      <strong>${bet.amount}€</strong> sur 
                      <em>${bet.team}</em>
                    `;
                    betListEl.appendChild(li);

                    // Désactiver si l'utilisateur a déjà parié
                    if (window.currentUser && uid === window.currentUser.uid) {
                        if (bet1Btn) bet1Btn.disabled = true;
                        if (bet2Btn) bet2Btn.disabled = true;
                        if (betInput) betInput.disabled = true;
                    }
                });
            }

            // ======================
            // 🔹 Fonction : Placer un pari
            // ======================
            // NOTE: Cette fonction est définie dans la boucle forEach, d'où l'accès aux variables 'id', 'match', 'betInput', 'bet1Btn', 'bet2Btn', 'matchTimers', 'BETTING_DURATION_MS'
            function placeBet(team) {
                // 1. VÉRIFICATIONS CLIENT INITIALES (Conservées)
                if (!window.currentUser) {
                    displayMessage("Erreur : Connecte-toi d’abord pour parier !", 'error');
                    return;
                }
                if (!betInput) return;

                const amount = parseFloat(betInput.value);
                if (isNaN(amount) || amount <= 0) {
                    displayMessage("Erreur : Le montant du pari est invalide (doit être > 0) !", 'error');
                    return;
                }

                // 2. 🚨 VÉRIFICATION CRITIQUE DU TEMPS (Lecture Firebase)
                // On doit lire l'état actuel du match, y compris son horodatage
                window.matchesRef.child(id).once('value')
                    .then(snapshot => {
                        const currentMatchData = snapshot.val();
                        
                        // Vérification de l'existence et du statut de fin
                        if (!currentMatchData || currentMatchData.finished) {
                            displayMessage("Pari refusé : Le match est terminé ou n'existe plus.", 'error');
                            return;
                        }

                        // Vérification du temps de pari basée sur l'horodatage stocké (Sécurité serveur)
                        const currentTime = Date.now();
                        const creationTime = currentMatchData.createdAt;
                        
                        if (creationTime) {
                            const timeElapsed = currentTime - creationTime;

                            // Assurez-vous que BETTING_DURATION_MS est bien défini dans votre scope global
                            if (timeElapsed > BETTING_DURATION_MS) { 
                                displayMessage("Pari refusé : La période de pari est écoulée !", 'error');
                                
                                // Vous pouvez ajouter ici la logique pour désactiver les boutons
                                if (bet1Btn) bet1Btn.disabled = true;
                                if (bet2Btn) bet2Btn.disabled = true;
                                
                                return; 
                            }
                        }

                        // 3. SI LA VÉRIFICATION PASSE, on procède à la TRANSACTION ATOMIQUE
                        
                        // Le reste de votre logique transactionnelle (débit du solde)
                        const userRef = window.usersRef.child(window.currentUser.uid);
                        const matchRef = window.matchesRef.child(id);

                        userRef.transaction(user => {
                            if (!user) {
                                // Initialisation si l'utilisateur n'existe pas
                                user = {
                                    name: window.currentUser.name,
                                    balance: 15,
                                    totalWon: 0,
                                    cards: [],
                                    totalCards: 0
                                };
                            }

                            const currentBalance = user.balance || 0;

                            if (currentBalance < amount) {
                                displayMessage(`Solde insuffisant ! (Solde actuel : ${currentBalance.toFixed(2)}€).`, 'error');
                                return; // Annule la transaction
                            }
                            user.balance = currentBalance - amount;
                            return user;
                        })
                        .then(result => {
                            if (!result.committed) {
                                return; // La transaction a été annulée
                            }

                            // Enregistrement du pari
                            const odds = team === currentMatchData.team1 ? currentMatchData.oddsTeam1 : currentMatchData.oddsTeam2;
                            const potentialGain = amount * odds;

                            matchRef.child("bets").child(window.currentUser.uid).set({
                                name: window.currentUser.name,
                                team,
                                amount,
                                potentialGain
                            }).then(() => {
                                // Mise à jour de l'UI après succès
                                if (bet1Btn) bet1Btn.disabled = true;
                                if (bet2Btn) bet2Btn.disabled = true;
                                if (betInput) betInput.disabled = true;

                                displayMessage(`Pari de ${amount}€ sur ${team} placé ! Gain potentiel : ${potentialGain.toFixed(2)}€`, 'success');

                                if (typeof window.updateRanking === 'function') {
                                    window.updateRanking();
                                }
                            });
                        })
                        .catch(error => {
                            console.error("Erreur de transaction lors du pari:", error);
                            displayMessage("Une erreur technique est survenue lors du débit de votre solde.", 'error');
                        });
                    })
            }

            // Écouteurs d'événements pour les boutons de pari
            if (bet1Btn) {
                bet1Btn.addEventListener('click', () => placeBet(match.team1));
            }
            if (bet2Btn) {
                bet2Btn.addEventListener('click', () => placeBet(match.team2));
            }
            
            // Écouteur pour le bouton de fin de match (Admin)
            if (finishBtn) {
    // La fonction finishMatch(matchId) N'EST PLUS DÉFINIE ICI. Elle est maintenant globale.
    // 
    // 3. Attacher l'écouteur en utilisant une fonction fléchée anonyme
    //    Ceci garantit que l'ID (id) est capturé par la closure et passé en argument.
    finishBtn.addEventListener('click', () => finishMatch(id));
    
    // L'ancienne ligne commentée était : 
    // finishBtn.addEventListener('click', () => yourFunctionToFinishMatch(id));
}
        
        }); // Fin de Object.entries(matches).forEach
  }); // Fin de window.matchesRef.on("value", snapshot =>

} // Fin de if (matchListEl)

/// SYSTEME ANTI TRICHE \\\\

// Fonction pour signaler une activité suspecte
function reportSuspiciousActivity(type, message) {
    const reportsRef = window.reportsRef; // Référence à la collection de signalements
    const newReport = {
        type: type,
        message: message,
        timestamp: Date.now()
    };

    // Enregistrer le signalement dans Firebase
    reportsRef.push(newReport).then(() => {
        console.log("Signalement ajouté !");
    }).catch(error => {
        console.error("Erreur lors du signalement :", error);
    });
}


// Vérification des cotes (MODIFIÉ)
function checkOdds(oddsTeam1, oddsTeam2) {
    const maxOdds = 10; // Par exemple, si la cote dépasse 10, ça devient suspect
    
    if (oddsTeam1 > maxOdds || oddsTeam2 > maxOdds) {
        let userId = 'Inconnu';
        let userName = 'Inconnu';
        
        // Ajout des informations utilisateur
        if (window.currentUser) {
            userId = window.currentUser.uid;
            userName = window.currentUser.name || userId;
        }

        // Envoi du signalement aux admins
        reportSuspiciousActivity(
            "Cote trop élevée", 
            `Utilisateur ${userName} (UID: ${userId}) a créé un match avec cotes suspectes : ${oddsTeam1} vs ${oddsTeam2}`
        );
    }
}

// Vérification des gains cumulés excessifs
function checkTotalAccumulatedGains(userId, amount) {
    const userRef = window.usersRef.child(userId);
    userRef.once("value").then(snapshot => {
        const user = snapshot.val();
        const maxGainsInPeriod = 200; 

        // Cible l'accumulation totale
        if (user && user.totalWon >= maxGainsInPeriod) {
            reportSuspiciousActivity(
                "Gains cumulés excessifs", 
                `Utilisateur ${user.name} (UID: ${userId}) a gagné plus de ${maxGainsInPeriod}€ (Total: ${user.totalWon.toFixed(2)}€)`
            );
        }
    });
}


// Vérification de l'anomalie de solde au login
function checkBalanceAnomaly(user) {
    // Seuil de solde suspect (votre valeur de -1)
    const SUSPECT_BALANCE_THRESHOLD = -1; 

    // Récupérer le solde actuel ou 0 si non défini (pour les nouveaux comptes)
    const currentBalance = user.balance || 0; 
    
    // Vérifie si le solde est anormalement bas
    if (currentBalance < SUSPECT_BALANCE_THRESHOLD) {
        reportSuspiciousActivity(
            "Anomalie de solde au login",
            `L'utilisateur ${user.name} (UID: ${user.uid}) a un solde suspect de ${currentBalance.toFixed(2)}€. (Peut-être une tentative de modification)`
        );
    }
}


// ===============================================
// 🚨 SYSTÈME ANTI-TRICHE : DÉTECTION D'ACCUMULATION DE PETITS GAINS & RATIO & SÉQUENCES
// ===============================================

// Seuils pour la détection des micro-gains suspects (tranche basse)
const MICRO_GAIN_THRESHOLD = 5;       // Un gain inférieur à 5€ est considéré comme "petit"
const MATCH_WINDOW = 50;              // Le nombre de matchs récents à analyser
const MICRO_WIN_RATIO_THRESHOLD = 0.80; // Ratio : 80% des matchs joués étaient des micro-gains

// Seuil pour la détection d'un taux de victoire suspect (pour les gains > 5€)
const HIGH_WIN_RATIO_THRESHOLD = 0.90; // 90% de victoires sur la fenêtre d'analyse
const MIN_MATCHES_FOR_CHECK = 15;     // Le nombre minimum de matchs pour déclencher la vérification des ratios (éviter les faux positifs initiaux)

// NOUVEAU SEUIL POUR LES SÉQUENCES
const MAX_CONSECUTIVE_WINS = 5;       // Déclenchement du signalement après 5 victoires d'affilée


/**
 * 1. Enregistre le résultat du pari de l'utilisateur (victoire et montant)
 * Si l'utilisateur a parié et gagné, met à jour les compteurs sur son profil.
 * @param {string} uid - L'UID de l'utilisateur.
 * @param {number} profit - Le gain ou la perte (positif pour gain, 0 pour perte).
 * @param {boolean} isWin - True si c'est une victoire, False sinon.
 */
async function recordBetResult(uid, profit, isWin) {
    // Appel de la vérification des gains cumulés excessifs
    if (typeof checkTotalAccumulatedGains === 'function') {
        checkTotalAccumulatedGains(uid, profit);
    }
    
    // Si l'utilisateur n'a ni gagné ni perdu (pari non placé ou match annulé)
    if (!isWin && profit > 0) { 
        console.error("Erreur de logique: isWin est false mais profit est positif.");
        return;
    }
    
    // Le gain n'est un micro-gain que s'il est strictement inférieur au seuil
    const isMicroWin = isWin && (profit < MICRO_GAIN_THRESHOLD);

    try {
        const userSnapshot = await window.usersRef.child(uid).once("value");
        const userData = userSnapshot.val() || {};
        
        // Initialisation des compteurs de RATIO (pour la fenêtre de 50 matchs)
        let recentMatchesPlayed = userData.recentMatchesPlayed || 0;
        let recentMicroWins = userData.recentMicroWins || 0;
        let recentWins = userData.recentWins || 0; 
        
        // Initialisation du compteur de SÉQUENCE (pour la détection instantanée)
        let consecutiveWins = userData.consecutiveWins || 0;

        // Mise à jour des compteurs de RATIO
        recentMatchesPlayed++;
        if (isWin) {
            recentWins++;
        }
        if (isMicroWin) {
            recentMicroWins++;
        }

        // Mise à jour du compteur de SÉQUENCE
        if (isWin) {
            consecutiveWins++;
        } else {
            consecutiveWins = 0; // Réinitialisation en cas de défaite
        }

        const updates = {
            recentMatchesPlayed: recentMatchesPlayed,
            recentMicroWins: recentMicroWins,
            recentWins: recentWins,
            consecutiveWins: consecutiveWins, // Sauvegarder le compteur de séquence
        };

        // Si la fenêtre d'analyse est atteinte, réinitialiser les compteurs de RATIO
        if (recentMatchesPlayed >= MATCH_WINDOW) {
            updates.recentMatchesPlayed = 0;
            updates.recentMicroWins = 0;
            updates.recentWins = 0;
        }

        await window.usersRef.child(uid).update(updates);
        
        
        // 🚨 VÉRIFICATION INSTANTANÉE: Si l'utilisateur atteint le seuil de victoires consécutives
        checkConsecutiveWins(uid, consecutiveWins); 

        // 🚨 VÉRIFICATION DE RATIO: Si le nombre minimum de matchs est atteint
        if (recentMatchesPlayed >= MIN_MATCHES_FOR_CHECK) { 
             checkMicroGainAnomaly(uid, recentMatchesPlayed, recentMicroWins);
             checkHighWinRatio(uid, recentMatchesPlayed, recentWins); 
        }

    } catch (error) {
        console.error("Erreur lors de l'enregistrement du résultat de pari:", error);
    }
}

/**
 * 2. Vérifie si l'utilisateur a un ratio de micro-gains suspect (pour les très petits gains).
 * @param {string} uid - L'UID de l'utilisateur.
 * @param {number} totalPlayed - Nombre total de matchs joués récemment.
 * @param {number} microWins - Nombre de micro-gains récents.
 */
function checkMicroGainAnomaly(uid, totalPlayed, microWins) {
    if (totalPlayed === 0) return;

    const winRatio = microWins / totalPlayed;

    // Si le ratio de micro-gains dépasse le seuil défini (par exemple, 80%)
    if (winRatio >= MICRO_WIN_RATIO_THRESHOLD) {
        // Déclenche le signalement
        reportSuspiciousActivity(
            "Accumulation de Micro-Gains (tranche basse)",
            `L'utilisateur (UID: ${uid}) est suspecté de botting/collusion. Ratio de micro-gains: ${(winRatio * 100).toFixed(1)}% (${microWins}/${totalPlayed} gains < ${MICRO_GAIN_THRESHOLD}€).`
        );
        console.warn(`Anomalie de Micro-Gains détectée pour l'UID: ${uid}`);
    }
}

/**
 * 3. Vérifie si l'utilisateur a un taux de victoire anormalement élevé (couvre les gains > 5€).
 * @param {string} uid - L'UID de l'utilisateur.
 * @param {number} totalPlayed - Nombre total de matchs joués récemment.
 * @param {number} totalWins - Nombre total de victoires récentes.
 */
function checkHighWinRatio(uid, totalPlayed, totalWins) {
    if (totalPlayed === 0) return;

    const winRatio = totalWins / totalPlayed;

    // Si le taux de victoire dépasse le seuil (par exemple, 90%)
    if (winRatio >= HIGH_WIN_RATIO_THRESHOLD) {
        // Déclenche le signalement
        reportSuspiciousActivity(
            "Taux de Victoire Anormalement Élevé",
            `L'utilisateur (UID: ${uid}) est suspecté de triche par accumulation. Taux de victoire: ${(winRatio * 100).toFixed(1)}% (${totalWins}/${totalPlayed} victoires).`
        );
        console.warn(`Anomalie de Taux de Victoire Élevé détectée pour l'UID: ${uid}`);
    }
}

/**
 * 4. NOUVEAU: Vérifie si l'utilisateur a atteint un seuil de victoires consécutives.
 * @param {string} uid - L'UID de l'utilisateur.
 * @param {number} consecutiveWins - Nombre de victoires consécutives actuelles.
 */
function checkConsecutiveWins(uid, consecutiveWins) {
    // Si la séquence atteint ou dépasse le seuil
    if (consecutiveWins >= MAX_CONSECUTIVE_WINS) {
        reportSuspiciousActivity(
            "Séquence de Victoires Anormale (Streak)",
            `L'utilisateur (UID: ${uid}) a atteint ${consecutiveWins} victoires consécutives. Détection de séquence anormale.`
        );
        console.warn(`Séquence de Victoires Anormale détectée pour l'UID: ${uid}`);
    }
}
/**
 * Calcule et distribue les gains aux parieurs gagnants.
 * Mise à jour pour inclure le suivi des succès.
 * @param {string} matchId ID Firebase du match.
 * @param {string} winnerTeam Nom de l'équipe gagnante.
 */
/**
 * Calcule et distribue les gains aux parieurs gagnants.
 * Mise à jour pour inclure le suivi des succès.
 * @param {string} matchId ID Firebase du match.
 * @param {string} winnerTeam Nom de l'équipe gagnante.
 */
function processBetWinnings(matchId, winnerTeam) {
    // 1. Référence au nœud des paris du match
    const betsRef = window.matchesRef.child(matchId).child('bets');

    // 2. Récupérer tous les paris du match
    betsRef.once('value', betsSnapshot => {
        const bets = betsSnapshot.val();
        if (!bets) {
            console.log(`[GAINS] Aucun pari à traiter pour le match ${matchId}.`);
            return;
        }

        console.log(`[GAINS] Traitement de ${Object.keys(bets).length} paris...`);

        // 3. Boucler sur chaque pari
        Object.entries(bets).forEach(([uid, bet]) => {
            
            const userRef = window.usersRef.child(uid);

            // Vérifier si le parieur a gagné
            if (bet.team === winnerTeam) {
                const gain = bet.potentialGain;

                if (gain > 0) {
                    // 4. TRANSACTION: Ajouter le gain et mettre à jour les statistiques de VICTOIRE
                    userRef.transaction(user => {
                        if (user) {
                            const currentBalance = user.balance || 0;
                            const currentTotalWon = user.totalWon || 0;
                            const currentTotalWins = user.totalWins || 0;
                            
                            // Statut de la série (consecutiveWins)
                            const currentConsecutiveWins = user.consecutiveWins || 0; 
                            const currentMaxWinStreak = user.maxWinStreak || 0;
                            
                            // 1. Mise à jour du solde et des gains totaux
                            user.balance = currentBalance + gain;
                            user.totalWon = currentTotalWon + gain; 
                            
                            // 2. 🟢 AJOUTS POUR LES SUCCÈS (GAGNANT)
                            user.totalWins = currentTotalWins + 1; // firstWin / tenWins
                            
                            // Mise à jour de la série actuelle
                            const newConsecutiveWins = currentConsecutiveWins + 1;
                            user.consecutiveWins = newConsecutiveWins;
                            
                            // Mise à jour du record de série (unstoppable)
                            user.maxWinStreak = Math.max(currentMaxWinStreak, newConsecutiveWins);
                            
                            // 3. Déclenchement de la vérification des succès
                            if (typeof window.checkAchievements === 'function') {
                                window.checkAchievements(user); 
                            }
                            
                            return user; 
                        }
                        return user; 
                    })
                    .then(result => {
                        if (result.committed) {
                            displayMessage(`🏆 ${bet.name} a gagné ${gain.toFixed(2)}€ ! Solde mis à jour.`, 'success');
                            
                            if (typeof window.updateRanking === 'function') {
                                window.updateRanking();
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`Erreur de transaction pour l'UID ${uid}:`, error);
                        displayMessage(`Erreur technique de gain pour ${bet.name}.`, 'error');
                    });
                }
            } else {
                // Le parieur a perdu (son solde a déjà été déduit lors du pari)
                console.log(`[GAINS] ${bet.name} a perdu. Rien à distribuer.`);
                
                // 🟢 AJOUTS POUR LES SUCCÈS (PERDANT)
                // Transaction pour mettre à jour totalLosses et réinitialiser consecutiveWins
                userRef.transaction(user => {
                    if (user) {
                        const currentTotalLosses = user.totalLosses || 0;
                        
                        // Succès 'marathoner'
                        user.totalLosses = currentTotalLosses + 1; 
                        
                        // Réinitialisation de la série
                        user.consecutiveWins = 0; 
                        
                        // Déclenchement de la vérification des succès
                        if (typeof window.checkAchievements === 'function') {
                            window.checkAchievements(user); 
                        }
                        
                        return user; 
                    }
                    return user;
                })
                .then(result => {
                    if (result.committed) {
                        console.log(`[SUCCÈS] Mise à jour des stats de défaite pour l'UID ${uid} terminée.`);
                    }
                })
                .catch(error => {
                    console.error(`Erreur de transaction de défaite pour l'UID ${uid}:`, error);
                });
            }
        });
    });
}
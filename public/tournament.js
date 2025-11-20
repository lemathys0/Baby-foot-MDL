// =====================================
// 🏆 GESTION DU TOURNOI (tournament.js)
// =====================================

// ⚠️ ASSUMPTION: 'db', 'window.currentUser', 'displayMessage' et 'window.updatePlayerStats' 
// sont définis et disponibles globalement par 'firebase-config.js' et 'app.js'.

// --- CONSTANTES ET RÉFÉRENCES ---

const TOURNAMENT_MIN_TEAMS = 2; 
const MAX_TEAMS = 8; // Limite à 8 équipes

// 🛑 NOUVELLES CONSTANTES POUR LA DATE DE DÉMARRAGE
const TOURNAMENT_START_DAY = 4; // Jeudi (0=Dimanche, 1=Lundi, ..., 4=Jeudi)
const TOURNAMENT_START_HOUR = 13; // 13h00

// Références Firestore (attachées à window pour un accès facile)
window.tournamentState = {}; 
window.teamsList = []; // 🚨 AJOUT CRITIQUE : Liste des équipes en temps réel.
// ATTENTION: Assurez-vous que 'db' est bien défini par 'firebase-config.js'
window.tournamentStateRef = db.collection('currentTournament').doc('state');
window.teamsRef = db.collection('currentTournament').doc('teams'); 
window.allUsersRef = db.collection('users'); // Réf. pour récupérer les pseudos complétés

// Réf. DOM (Doivent exister dans index.html)
let bracketDisplay;
let bracketContainer;
let statusElement;
let teamsListElement;
let countElement;
let startBtn;
let nextRoundBtn;
// Suppression de 'let endTournamentBtn;'
let recordMatchForm;
let recordMatchFormContainer; 
let recordMessageElement; 

const resetTestBtn = document.getElementById('reset-tournament-test-btn');
const forceStartBtn = document.getElementById('force-start-tournament-btn');


// =====================================
// 📝 FONCTIONS D'INSCRIPTION ET DÉSINSCRIPTION
// =====================================



window.registerTeam = async function(event) {
    if (event) {
        event.preventDefault(); 
    }
    
    // 1. Récupération des valeurs du formulaire
    const teamNameInput = document.getElementById('team-name');
    const player1PseudoElement = document.getElementById('player1-pseudo');
    const player2PseudoElement = document.getElementById('player2-pseudo');
    
    const player1Pseudo = player1PseudoElement ? player1PseudoElement.value.trim() : null;
    const player2Pseudo = player2PseudoElement ? player2PseudoElement.value.trim() : null;
    const teamName = teamNameInput ? teamNameInput.value.trim() : (window.currentUser ? `${window.currentUser.name}'s Team` : 'Nouvelle Équipe');

    // 🛑 VALIDATIONS DE BASE (Hors Transaction)
    if (window.tournamentState.status !== 'registration') {
        displayMessage("L'inscription est fermée. Le tournoi est en cours ou terminé.", 'error');
        return;
    }
    if (!window.currentUser || !window.currentUser.uid) {
        displayMessage("Vous devez être connecté pour vous inscrire.", 'error');
        return;
    }
    if (!teamName || !player1Pseudo || !player2Pseudo) {
        displayMessage("Veuillez remplir tous les champs du formulaire.", 'error');
        return;
    }
    
    // Vérification de la longueur du nom d'équipe
    if (teamName.length < 3 || teamName.length > 20) {
        displayMessage("Le nom d'équipe doit contenir entre 3 et 20 caractères.", 'warning');
        return;
    }
    
    // Vérification des caractères interdits
    if (/[^a-zA-Z0-9\s-]/.test(teamName)) {
        displayMessage("Le nom d'équipe ne peut contenir que des lettres, chiffres, espaces ou tirets.", 'warning');
        return;
    }

    // 2. Lancement de la transaction Firestore pour les vérifications d'état et d'unicité
    try {
        await window.teamsRef.firestore.runTransaction(async (transaction) => {
            const teamsDoc = await transaction.get(window.teamsRef);
            const teamsData = teamsDoc.data() || { list: [] };
            let teams = teamsData.list;
            
            // VÉRIFICATION N°1 : Leader déjà inscrit (contournée si Admin)
            const teamIndex = teams.findIndex(t => t.leaderUid === window.currentUser.uid);
            
            // Si l'utilisateur n'est PAS un admin, la vérification s'applique
            if (teamIndex !== -1 && !window.currentUser.isAdmin) {
                throw new Error("ALREADY_REGISTERED"); 
            }

            // VÉRIFICATION N°2 : Nom d'équipe déjà pris (Unicité) - Reste ACTIF
            const nameIsTaken = teams.some(t => t.name.toLowerCase() === teamName.toLowerCase());
            if (nameIsTaken) {
                throw new Error("TEAM_NAME_TAKEN"); 
            }
            
            // VÉRIFICATION N°3 : Tournoi plein
            if (teams.length >= MAX_TEAMS) {
                throw new Error("TOURNAMENT_FULL");
            }

            // 3. Inscription de la nouvelle équipe
            let leaderUidToUse = window.currentUser.uid;
            
            // Si l'utilisateur est Admin ET a déjà une équipe, on génère un UID factice.
            if (window.currentUser.isAdmin && teamIndex !== -1) {
                // CORRIGÉ: Utilisation d'un UID plus unique
                leaderUidToUse = `TEST_ADMIN_UID_${window.currentUser.uid}_${teams.length + 1}`; 
                displayMessage(`[MODE TEST ADMIN] UID leader remplacé par ${leaderUidToUse}.`, 'warning');
            }

            teams.push({
                leaderUid: leaderUidToUse, 
                name: teamName, 
                player1: player1Pseudo,
                player2: player2Pseudo,
                score: 0,
                members: [window.currentUser.uid], // Le leader est le seul membre initial
            });

            // Mise à jour finale
            transaction.set(window.teamsRef, { list: teams });
        });

        // Succès : Actions UI après confirmation de la transaction
        displayMessage(`✅ Équipe '${teamName}' inscrite !`, 'success');
        
        // Effacer les champs du formulaire
        if (teamNameInput) teamNameInput.value = '';
        if (player1PseudoElement) player1PseudoElement.value = '';
        if (player2PseudoElement) player2PseudoElement.value = '';

    } catch(error) {
        console.error("Erreur de transaction lors de l'inscription:", error);
        
        // Gérer les erreurs spécifiques
        if (error.message === "ALREADY_REGISTERED") {
            displayMessage("Vous êtes déjà inscrit au tournoi en tant que leader d'équipe.", 'warning');
        } else if (error.message === "TOURNAMENT_FULL") {
             displayMessage(`Le tournoi est complet (${MAX_TEAMS} équipes maximum).`, 'error');
        } else if (error.message === "TEAM_NAME_TAKEN") { 
             displayMessage(`Le nom d'équipe '${teamName}' est déjà pris. Veuillez en choisir un autre.`, 'warning');
        } else {
            // Gérer les erreurs réelles de Firestore (ex: réseau, permissions)
            displayMessage("❌ Erreur lors de l'inscription. Veuillez réessayer.", 'error');
        }
    }
};

/**
 * Désinscription d'une équipe du tournoi (par le leader uniquement).
 */
window.unregisterTeam = async function() {
    if (!window.currentUser || !window.tournamentState.status || window.tournamentState.status !== 'registration') {
        displayMessage("Impossible de se désinscrire : vous n'êtes pas connecté ou l'inscription est fermée.", 'error');
        return;
    }
    if (!confirm("Êtes-vous sûr de vouloir désinscrire votre équipe ?")) return;

    try {
        await window.teamsRef.firestore.runTransaction(async (transaction) => {
            const teamsDoc = await transaction.get(window.teamsRef);
            const teamsData = teamsDoc.data() || { list: [] };
            let teams = teamsData.list;

            const teamIndex = teams.findIndex(t => t.leaderUid === window.currentUser.uid);

            if (teamIndex === -1) {
                throw new Error("NOT_REGISTERED");
            }

            // Supprimer l'équipe
            const teamName = teams[teamIndex].name;
            teams.splice(teamIndex, 1);

            // Mettre à jour la liste des équipes
            transaction.set(window.teamsRef, { list: teams });
            return teamName; // Retourne le nom pour le message de succès

        }).then(teamName => {
            displayMessage(`L'équipe '${teamName}' a été désinscrite.`, 'info');
        }).catch(error => {
            if (error.message === "NOT_REGISTERED") {
                displayMessage("Votre équipe n'est pas inscrite.", 'warning');
            } else {
                console.error("Erreur lors de la désinscription:", error);
                displayMessage("Erreur lors de la désinscription. Veuillez réessayer.", 'error');
            }
        });
    } catch (error) {
        console.error("Erreur de désinscription:", error);
    }
};

// =====================================
// 📊 FONCTIONS D'AFFICHAGE (UI)
// =====================================

/**
 * AFFICHE LE VAINQUEUR EN PLEIN ÉCRAN
 * @param {string} winnerName 
 */
function displayWinnerFullScreen(winnerName) {
    const fullScreenMessage = document.getElementById('fullScreenMessage');
    const fsTitle = document.getElementById('fs-title');
    const fsBody = document.getElementById('fs-body');
    const fsRequestBtn = document.getElementById('fs-request-btn'); // Ne pas oublier de le cacher

    if (!fullScreenMessage || !fsTitle || !fsBody) {
        // Fallback si les éléments ne sont pas trouvés
        displayMessage(`🏆 Le Tournoi est terminé ! Le vainqueur est : ${winnerName} !`, 'success');
        return;
    }

    // Styles et contenu pour la victoire
    fsTitle.innerHTML = `🏆 Félicitations 🏆`;
    fsBody.innerHTML = `
        <h1 style="font-size: 4em; font-weight: bold; color: #333; text-shadow: 2px 2px 4px #aaa;">
            ${winnerName}
        </h1>
        <p style="font-size: 1.5em; margin-top: 20px;">
            est le vainqueur de ce tournoi !
        </p>
    `;
    
    // Assurez-vous que le bouton de demande de réactivation est masqué
    fsRequestBtn.style.display = 'none'; 
    
    // Afficher l'overlay
    fullScreenMessage.style.backgroundColor = 'rgba(76, 175, 80, 0.9)'; // Vert de victoire
    fullScreenMessage.style.display = 'flex'; // Utiliser flex pour centrer
}


/**
 * Met à jour la liste des équipes inscrites dans l'UI.
 */
function renderTeamsList(teams) {
    if (!teamsListElement) return;

    teamsListElement.innerHTML = '';
    
    // Trier les équipes par nom
    teams.sort((a, b) => a.name.localeCompare(b.name));

    teams.forEach((team, index) => {
        const li = document.createElement('li');
        let status = '';

        if (window.currentUser && team.leaderUid === window.currentUser.uid) {
            status = ' (Votre Équipe)';
        }

        li.innerHTML = `
            <strong>${index + 1}. ${team.name}${status}</strong><br>
            Joueurs: ${team.player1} & ${team.player2}
        `;
        teamsListElement.appendChild(li);
    });

    if (countElement) {
        countElement.textContent = `Équipes Inscrites : ${teams.length} / ${MAX_TEAMS}`;
        if (teams.length === MAX_TEAMS) {
            countElement.classList.add('full');
        } else {
            countElement.classList.remove('full');
        }
    }
}

/**
 * Rend l'affichage du tableau de tournoi (Bracket).
 */
function renderBracket(bracket) {
    // Utiliser l'élément spécifique à l'intérieur de #tournament-bracket
    const contentTarget = bracketDisplay; 
    
    if (!contentTarget) { 
        console.error("L'élément #bracket-display est manquant.");
        return;
    }

    contentTarget.innerHTML = ''; // Nettoyer l'ancien tableau des rounds

    // Mettre à jour le statut
    const bracketStatus = document.getElementById('bracket-status');
    if (bracketStatus) {
        if (window.tournamentState.status === 'registration') {
            bracketStatus.textContent = 'Aucun tournoi en cours. Inscrivez votre équipe !';
            return;
        }

        // 🏆 LOGIQUE POUR L'ÉTAT TERMINÉ (AFFICHAGE DU VAINQUEUR)
        if (window.tournamentState.status === 'finished') {
            const winnerName = window.tournamentState.winner || 'INCONNU';
            
            const winnerDiv = document.createElement('div');
            // Style inline pour assurer la visibilité
            winnerDiv.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2 style="font-size: 2.5em; color: #4CAF50; margin-top: 30px;">
                        🏆 VAINQUEUR DU TOURNOI 🏆
                    </h2>
                    <h1 style="font-size: 3em; font-weight: bold; color: #333; text-shadow: 2px 2px 4px #aaa;">
                        ${winnerName}
                    </h1>
                </div>
            `;
            contentTarget.appendChild(winnerDiv);

            bracketStatus.textContent = 'Tournoi terminé !';
            return; // Sortir après l'affichage du gagnant
        }
    }

    if (window.tournamentState.status === 'registration' || !bracket) return;


    const rounds = Object.keys(bracket).sort((a, b) => {
        return parseInt(a.replace('round', '')) - parseInt(b.replace('round', ''));
    });

    rounds.forEach(roundKey => {
        const round = bracket[roundKey];
        const roundNum = parseInt(roundKey.replace('round', ''));
        const roundDiv = document.createElement('div');
        roundDiv.classList.add('bracket-round');
        roundDiv.innerHTML = `<h3>Tour ${roundNum}</h3>`;

        const matchList = document.createElement('ul');
        matchList.classList.add('bracket-match-list');

        round.matches.forEach(match => {
            const matchLi = document.createElement('li');
            matchLi.classList.add('bracket-match');
            matchLi.dataset.matchId = match.id;
            matchLi.dataset.round = roundNum;

            let team1Class = '';
            let team2Class = '';
            let matchStatusClass = 'match-pending';
            let team1Display = match.team1 || 'À déterminer';
            let team2Display = match.team2 || 'À déterminer';

            if (match.winner) {
                matchStatusClass = 'match-completed';
                if (match.winner === match.team1) {
                    team1Class = 'team-winner';
                    team2Class = 'team-loser';
                    // Scores dans l'ordre team1/team2
                    team1Display = `${match.team1} <span class="score">(${match.score1})</span>`;
                    team2Display = `${match.team2} <span class="score">(${match.score2})</span>`;
                } else {
                    team1Class = 'team-loser';
                    team2Class = 'team-winner';
                    // Scores dans l'ordre team1/team2
                    team1Display = `${match.team1} <span class="score">(${match.score1})</span>`;
                    team2Display = `${match.team2} <span class="score">(${match.score2})</span>`;
                }
            } else if (match.team1 && match.team2) {
                matchStatusClass = 'match-pending';
            } else {
                matchStatusClass = 'match-future';
            }

            matchLi.classList.add(matchStatusClass);

            matchLi.innerHTML = `
                <div class="match-info ${team1Class} team1">
                    <span class="team">${team1Display}</span>
                    <button class="record-btn" data-team-name="${match.team1}" data-match-id="${match.id}" data-round="${roundNum}" style="${(match.winner || !match.team1) ? 'display:none;' : ''}">V</button>
                </div>
                <div class="match-info ${team2Class} team2">
                    <span class="team">${team2Display}</span>
                    <button class="record-btn" data-team-name="${match.team2}" data-match-id="${match.id}" data-round="${roundNum}" style="${(match.winner || !match.team2) ? 'display:none;' : ''}">V</button>
                </div>
            `;
            matchList.appendChild(matchLi);
        });

        roundDiv.appendChild(matchList);
        contentTarget.appendChild(roundDiv); // AJOUTÉ : Utiliser contentTarget
    });

    // Écouteurs pour les boutons 'V' (Victoire)
    document.querySelectorAll('.record-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const teamName = e.target.dataset.teamName;
            const matchId = e.target.dataset.matchId;
            const round = e.target.dataset.round;
            showMatchRecordForm(matchId, round, teamName);
        });
    });
}

/**
 * Met à jour l'affichage de l'état du tournoi (Rendue global pour compatibilité app.js).
 */
window.updateTournamentUI = function(teams) {
    // Utilisation de l'opérateur de chaînage optionnel (?) pour éviter le crash si status est undefined
    if (statusElement) {
        statusElement.textContent = `État actuel: ${window.tournamentState.status?.toUpperCase() || 'CHARGEMENT'} (Tour ${window.tournamentState.currentRound || 0})`;
    }

    // Masquer l'écran plein écran si le tournoi n'est pas terminé
    const fullScreenMessage = document.getElementById('fullScreenMessage');
    if(fullScreenMessage && window.tournamentState.status !== 'finished') {
        fullScreenMessage.style.display = 'none';
    }

    // Afficher/Masquer les éléments selon l'état
    const isRegistration = window.tournamentState.status === 'registration';
    const isInProgress = window.tournamentState.status === 'in_progress';
    const isFinished = window.tournamentState.status === 'finished';

    const registrationForm = document.getElementById('tournament-registration-form');
    const registrationStatus = document.getElementById('registration-status'); 
    const bracketSection = document.getElementById('tournament-bracket-section'); 

    if (registrationForm) registrationForm.style.display = isRegistration ? 'block' : 'none';
    if (registrationStatus) registrationStatus.style.display = isRegistration ? 'block' : 'none';
    
    // Afficher le bracket si en cours OU terminé (pour voir le vainqueur)
    if (bracketContainer) bracketContainer.style.display = isInProgress || isFinished ? 'block' : 'none';

    // 🛑 LOGIQUE DE GESTION DU BOUTON D'INSCRIPTION (Garde-fou UI)
    const registerBtn = document.getElementById('register-team-btn');
    if (registerBtn) {
        if (isRegistration) {
            registerBtn.disabled = false;
            registerBtn.textContent = "Inscrire l'Équipe"; // Réactive le bouton
        } else {
            // Désactive le bouton si undefined (non chargé) ou si le statut est autre (fermé)
            registerBtn.disabled = true;
            registerBtn.textContent = window.tournamentState.status ? "Inscription Fermée" : "Chargement du statut... 🔄";
        }
    }

    // Logique pour les boutons Admin (Start/Next Round)
    // Le bouton 'startBtn' est affiché si l'inscription est ouverte ET qu'il y a assez d'équipes.
    if (startBtn) startBtn.style.display = isRegistration && teams.length >= TOURNAMENT_MIN_TEAMS ? 'block' : 'none';
    
    // Le bouton NextRound doit être masqué si le tournoi est fini
    if (nextRoundBtn) {
        const currentRoundKey = `round${window.tournamentState.currentRound}`;
        // 🚨 FIX : Utiliser le chaînage optionnel pour éviter le crash si 'bracket' est undefined
        const currentRoundData = window.tournamentState.bracket?.[currentRoundKey] || null;
        const roundComplete = currentRoundData && isRoundComplete(currentRoundData);
        
        // AJOUT DU STATUT DE DÉBOGAGE DANS L'UI
        const bracketStatus = document.getElementById('bracket-status');
        if (bracketStatus && isInProgress) {
            bracketStatus.textContent = `Tournoi en cours (Tour ${window.tournamentState.currentRound}) | Tour ${window.tournamentState.currentRound} : ${roundComplete ? 'COMPLET' : 'MATCHS RESTANTS'}`;
        }
        
        // Afficher le bouton si le tournoi est en cours ET le tour actuel est complet. MASQUER si 'finished'.
        nextRoundBtn.style.display = isInProgress && roundComplete ? 'block' : 'none'; 
    }
    

    // Afficher le bouton de désinscription si l'utilisateur est leader et l'inscription est ouverte
    const unregisterBtn = document.getElementById('unregister-team-btn');
    const isLeader = teams.some(t => t.leaderUid === window.currentUser?.uid);

    if (unregisterBtn) {
        unregisterBtn.style.display = isRegistration && isLeader ? 'block' : 'none';
    }

    // Utilisation de la liste des équipes passée en argument (qui vient du listener)
    renderTeamsList(teams); 
    renderBracket(window.tournamentState.bracket);
}

// =====================================
// ⚙️ FONCTIONS DE GESTION DU TOURNOI
// =====================================

/**
 * Lance le tournoi, génère le bracket initial et passe à 'in_progress'.
 */
async function startTournament(force = false) {
    if (window.tournamentState.status !== 'registration') {
        displayMessage("Le tournoi a déjà commencé ou est terminé.", 'warning');
        return;
    }

    // 🛑 NOUVELLE RÈGLE : VÉRIFICATION DE LA DATE ET DE L'HEURE (SAUF POUR LES ADMINS)
    if (!window.currentUser?.isAdmin) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        
        // Vérifie si c'est Jeudi (4) et si l'heure est 13h00
        if (currentDay !== TOURNAMENT_START_DAY || currentHour !== TOURNAMENT_START_HOUR) {
            displayMessage("Le tournoi ne peut être lancé que le **Jeudi à 13h00**.", 'error');
            return;
        }
    }


    try {
        await window.teamsRef.firestore.runTransaction(async (transaction) => {
            const teamsDoc = await transaction.get(window.teamsRef);
            const teamsData = teamsDoc.data() || { list: [] };
            let teams = teamsData.list;
            
            if (!force && teams.length < TOURNAMENT_MIN_TEAMS) {
                throw new Error("NOT_ENOUGH_TEAMS");
            }
            if (teams.length > MAX_TEAMS) {
                // Si la limite est dépassée (suite à un bug), on prend les MAX_TEAMS premières
                teams = teams.slice(0, MAX_TEAMS);
            }

            // Générer le bracket pour le tour 1
            const bracket = generateBracket(teams);

            // Mise à jour de l'état et du bracket
            const newState = {
                status: 'in_progress',
                currentRound: 1,
                bracket: bracket
            };
            
            transaction.set(window.tournamentStateRef, newState);
        });

        displayMessage("Le tournoi a démarré ! Le tableau des matchs est prêt.", 'success');
    } catch(error) {
        console.error("Erreur au démarrage du tournoi:", error);
        if (error.message === "NOT_ENOUGH_TEAMS") {
            displayMessage(`Pas assez d'équipes pour démarrer (min ${TOURNAMENT_MIN_TEAMS}).`, 'error');
        } else {
            displayMessage("Erreur lors du démarrage du tournoi.", 'error');
        }
    }
}

/**
 * Passe au tour suivant et génère les nouveaux matchs à partir des gagnants du tour actuel.
 */
window.nextRound = async function() {
    if (window.tournamentState.status !== 'in_progress') {
        displayMessage("Le tournoi n'est pas en cours.", 'warning');
        return;
    }
    
    // 🚨 FIX: Vérification de l'existence du bracket avant d'accéder au round
    const currentRoundKey = `round${window.tournamentState.currentRound}`;
    const currentRound = window.tournamentState.bracket?.[currentRoundKey];

    if (!currentRound || !isRoundComplete(currentRound)) {
        displayMessage("Le tour actuel n'est pas terminé. Tous les matchs doivent être enregistrés.", 'error');
        return;
    }

    // 🛑 DÉBUT DE LA CORRECTION ANTI-SPAM
    if (nextRoundBtn) {
        nextRoundBtn.disabled = true;
        nextRoundBtn.textContent = "Génération du tour... 🔄";
    }
    // 🛑 FIN DE LA CORRECTION ANTI-SPAM

    let isFinished = false; // Flag pour la logique post-transaction
    let winnerName = null;

    try {
        await window.tournamentStateRef.firestore.runTransaction(async (transaction) => {
            const stateDoc = await transaction.get(window.tournamentStateRef);
            const teamsDoc = await transaction.get(window.teamsRef);
            const state = stateDoc.data();
            const teamsData = teamsDoc.data() || { list: [] };
            const teams = teamsData.list; // Teams list lue dans la transaction
            
            // 🛑 VÉRIFICATION CRITIQUE DANS LA TRANSACTION
            if (!state || state.status !== 'in_progress' || state.currentRound !== window.tournamentState.currentRound) {
                throw new Error("STATE_CHANGED");
            }
            const currentRoundKeyInState = `round${state.currentRound}`;
            const winners = getRoundWinners(state.bracket[currentRoundKeyInState], teams); 

            // Si un seul gagnant, le tournoi est terminé
            if (winners.length === 1) {
                isFinished = true; // Mettre à jour le flag
                winnerName = winners[0].name;

                // Mise à jour de l'état et du gagnant
                const updatedState = { 
                    ...state, 
                    status: 'finished', 
                    winner: winnerName, // <--- C'est ici que le vainqueur est enregistré
                };
                transaction.set(window.tournamentStateRef, updatedState);
                
            } else {
                // Sinon, générer le tour suivant
                const nextRoundNum = state.currentRound + 1;
                const nextRoundBracket = generateBracket(winners, nextRoundNum, state.bracket); 

                const updatedState = { 
                    ...state, 
                    currentRound: nextRoundNum,
                    bracket: nextRoundBracket
                };
                transaction.set(window.tournamentStateRef, updatedState);
            }
        });

        // La transaction s'est terminée avec succès.
        
        // 🛑 UTILISATION DE window.teamsList pour les stats/UI (le listener va gérer l'UI)
        if (isFinished) {
             // Affichage plein écran AVEC un délai
             setTimeout(() => {
                displayWinnerFullScreen(winnerName);
                
                // Maintient la cohérence
                window.updateTournamentUI(window.teamsList); 
                
                // Mise à jour des stats du vainqueur (HORS transaction)
                const winnerTeam = window.teamsList.find(t => t.name === winnerName);
                if (winnerTeam && typeof window.updatePlayerStats === 'function') {
                    window.updatePlayerStats(winnerTeam.leaderUid, true); 
                }
             }, 500); // Délai de 500ms
             
        } else {
             displayMessage(`✅ Passage au Tour ${window.tournamentState.currentRound + 1}.`, 'success');
             // Mise à jour UI immédiate pour le tour suivant
             window.updateTournamentUI(window.teamsList);
        }

    } catch(error) {
        console.error("Erreur lors du passage au tour suivant:", error);
        if (error.message === "STATE_CHANGED") {
             displayMessage("Erreur de synchronisation : L'état du tournoi a changé. Veuillez réessayer.", 'error');
        } else {
             displayMessage("Erreur lors du passage au tour suivant. Veuillez réessayer.", 'error');
        }
    } finally {
        // 🛑 FIN DE LA CORRECTION ANTI-SPAM
        if (nextRoundBtn) {
            nextRoundBtn.disabled = false;
            nextRoundBtn.textContent = "Passer au Tour Suivant";
        }
    }
}


/**
 * Enregistre le résultat d'un match (appelé depuis le formulaire).
 * Contournement critique : utilise window.tournamentState pour l'état initial.
 */
window.recordMatchResult = async function(matchId, roundNum, winnerTeamName, score1, score2) {
    // Le premier check est basé sur l'état global (mis à jour par le listener)
    if (window.tournamentState.status !== 'in_progress') {
        displayMessage("Impossible d'enregistrer le match : le tournoi n'est pas en cours.", 'error');
        return;
    }
    if (isNaN(score1) || isNaN(score2)) {
        displayMessage("Les scores doivent être des nombres.", 'error');
        return;
    }

    try {
        const winnerUid = await window.tournamentStateRef.firestore.runTransaction(async (transaction) => {
            
            // 🛑 ÉTAPE 1 : LECTURE DANS LA TRANSACTION
            // SEULEMENT 'teamsDoc' est lu. Nous utilisons la variable globale 'window.tournamentState'.
            const teamsDoc = await transaction.get(window.teamsRef);
            
            // 🏆 CORRECTIF DE CONTOURNEMENT : Utiliser l'état connu globalement.
            const state = window.tournamentState; 
            
            if (!state || state.status !== 'in_progress') {
                 throw new Error("Tournament not in progress.");
            }
            
            // Clonage sécurisé à partir de la variable globale
            // JSON.parse(JSON.stringify) est utilisé ici pour un deep clone complet.
            let newState = JSON.parse(JSON.stringify(state));

            const teamsData = teamsDoc.data() || { list: [] };
            const teams = teamsData.list;

            // 🚨 SÉCURITÉ N°3 : VÉRIFICATION DE LA STRUCTURE DU ROUND
            const roundKey = `round${roundNum}`;
            const round = newState.bracket?.[roundKey]; 

            if (!round) {
                throw new Error("Round not found in state.");
            }
            
            const matchIndex = round.matches.findIndex(m => m.id === matchId);

            if (matchIndex === -1) {
                throw new Error("Match not found.");
            }
            
            const match = round.matches[matchIndex];

            if (match.winner) {
                throw new Error("MATCH_ALREADY_RECORDED");
            }

            // Déterminer le perdant et trouver l'UID du gagnant
            let loser;
            let finalWinnerUid = null;

            if (winnerTeamName === match.team1) {
                loser = match.team2;
            } else if (winnerTeamName === match.team2) {
                loser = match.team1;
            } else {
                throw new Error("Winner team name does not match match teams.");
            }
            
            const winnerTeam = teams.find(t => t.name === winnerTeamName);
            finalWinnerUid = winnerTeam?.leaderUid ?? null; 

            // Mettre à jour les données du match
            match.winner = winnerTeamName;
            match.loser = loser;
            match.score1 = score1; 
            match.score2 = score2; 

            // Gestion des forfaits (score 1-0 ou 0-1)
            const isForfaitScore = (score1 === 1 && score2 === 0) || (score1 === 0 && score2 === 1);
            match.advancedByBye = match.advancedByBye || isForfaitScore;


            // Mettre à jour le match du tour suivant
            if (match.nextMatchSlot) {
                // Fonction updateNextRoundMatch MAINTENANT DÉFINIE !
                const updatedBracket = updateNextRoundMatch(newState.bracket, match); 
                newState.bracket = updatedBracket; 
            }

            // Écriture de la transaction
            const stateToSave = cleanObjectForFirestore(newState);
            transaction.set(window.tournamentStateRef, stateToSave);

            return finalWinnerUid;
        });

        // Succès : Logique post-transaction
        displayMessage(`Résultat du match ${matchId} enregistré : ${winnerTeamName} gagne.`, 'success');
        window.hideMatchRecordForm();
        if (winnerUid && typeof window.updatePlayerStats === 'function') {
            window.updatePlayerStats(winnerUid, true);
        }

    } catch (error) {
        // Gestion des messages d'erreur détaillés
        if (error.message === "MATCH_ALREADY_RECORDED") {
            displayMessage("Ce match a déjà été enregistré.", 'warning');
        } else if (error.message === "Tournament not in progress.") {
            displayMessage("Erreur : Le document d'état du tournoi est **manquant, vide ou le statut est incorrect**. (Problème de lecture transactionnelle)", 'error');
        } else if (error.message === "Round not found in state.") {
            displayMessage(`Erreur : Le round n°${roundNum} est introuvable dans la structure du bracket. Vérifiez le champ \`bracket\` dans Firestore.`, 'error');
        } else if (error.code === 'aborted' && error.message.includes('reads to be executed before all writes')) {
            displayMessage("Erreur critique: Problème de synchronisation des données. Veuillez réessayer immédiatement.", 'error');
        } else {
            console.error("Erreur lors de l'enregistrement du match (Générique):", error);
            displayMessage("Erreur inattendue lors de l'enregistrement du match.", 'error');
        }
    }
};
// ----------------------------------------------------
// ⚠️ Fonction utilitaire à ajouter dans tournament.js
// ----------------------------------------------------

/**
 * Nettoie un objet en remplaçant toutes les valeurs 'undefined' par 'null'.
 * Nécessaire car Firestore ne supporte pas 'undefined'.
 */
function cleanObjectForFirestore(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cleanObjectForFirestore(item));
    }

    const cleaned = {};
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue; 
        const value = obj[key];
        cleaned[key] = (value === undefined) ? null : cleanObjectForFirestore(value);
    }
    return cleaned;
}
// =====================================
// 🛠️ FONCTIONS UTILITAIRES DE BRACKET
// =====================================

/**
 * Vérifie si tous les matchs d'un tour sont terminés.
 */
function isRoundComplete(round) {
    if (!round || !round.matches) {
        return false;
    }

    return round.matches.every(match => {
        // Condition 1: Le match a un gagnant (cas normal : score enregistré)
        const hasWinner = match.winner && match.winner !== '';

        // Condition 2: Le match est un 'BYE' (l'une des équipes est absente)
        // La présence d'un 'null' ou d'un autre marqueur comme 'BYE' dans l'une des équipes signale un bye.
        // J'utilise ici l'absence de valeur ('falsy' comme null, undefined ou chaîne vide).
        const isBye = !match.team1 || !match.team2 || match.team1 === 'BYE' || match.team2 === 'BYE';
        
        // Le match est complet s'il y a un gagnant OU s'il s'agit d'un bye.
        return hasWinner || isBye;
    });
}
/**
 * Récupère les gagnants d'un tour.
 */
function getRoundWinners(round, teams) {
    if (!round || !round.matches) return [];
    const teamMap = new Map(teams.map(t => [t.name, t]));
    
    // Filtrer les matchs où il y a un gagnant, et récupérer les données complètes de l'équipe
    return round.matches
        .filter(match => match.winner)
        .map(match => teamMap.get(match.winner))
        .filter(team => team); // Filtrer les équipes qui n'existent plus (ne devrait pas arriver)
}




/**
 * Génère le bracket pour un tour donné.
 */
/**
 * Génère le bracket du tournoi pour le premier tour ou pour les tours suivants.
 * 🏆 Correction : Marque immédiatement les Byes comme terminés et avance les gagnants.
 */
function generateBracket(teams, startRound = 1, existingBracket = {}) {
    const bracket = { ...existingBracket };
    const roundKey = `round${startRound}`;
    const roundMatches = [];
    
    // Mélange des équipes uniquement pour le tour 1
    const shuffledTeams = startRound === 1 ? teams.sort(() => 0.5 - Math.random()) : teams;
    const numTeams = shuffledTeams.length;
    const numMatches = Math.ceil(numTeams / 2); // Ex: 4 équipes -> 2 matchs

    // Calculer le nombre de matchs du tour suivant
    const nextRoundNumMatches = Math.ceil(numMatches / 2); // Ex: 2 matchs -> 1 match (la finale)
    
    // Remplissage du tour avec les matchs
    for (let i = 0; i < numMatches; i++) {
        const team1 = shuffledTeams[i * 2]?.name || null;
        // ⚠️ VÉRIFICATION CRITIQUE : Si une équipe est null, c'est un Bye.
        const team2 = shuffledTeams[i * 2 + 1]?.name || null; 
        
        let nextMatchSlot = null;
        
        // Calcul du slot du match suivant
        if (nextRoundNumMatches >= 1) {
            const nextMatchIndex = Math.floor(i / 2) + 1;
            if (nextMatchIndex <= nextRoundNumMatches) {
                nextMatchSlot = {
                    nextMatchId: `M${startRound + 1}_${nextMatchIndex}`, 
                    slot: (i % 2) + 1
                };
            }
        }
        
        let match = {
            id: `M${startRound}_${i + 1}`,
            team1: team1,
            team2: team2,
            winner: null,
            loser: null,
            score1: null,
            score2: null,
            advancedByBye: false,
            nextMatchSlot: nextMatchSlot,
        };

        // 🛑 ÉTAPE D'AUTOMATISATION DES BYES POUR LE TOUR 1
        if (startRound === 1 && team1 && !team2) {
            // C'est un match Bye (team1 vs null)
            match.winner = team1;
            // On utilise "Bye" comme perdant pour le rendre explicite dans les logs/l'UI
            match.loser = "Bye"; 
            match.score1 = 1; // Score 1-0 standard pour un forfait/bye
            match.score2 = 0;
            match.advancedByBye = true; // Flag pour le rendre clair dans l'UI
            
            // ⭐ AVANCER IMMÉDIATEMENT LE GAGNANT DANS LE TOUR SUIVANT
            // Ceci est une CORRECTION MAJEURE.
            if (match.nextMatchSlot) {
                // Nécessite d'appeler updateNextRoundMatch qui doit être disponible globalement
                // Note : Cette fonction doit être définie dans tournament.js (voir l'encadré ci-dessous)
                const updatedBracket = updateNextRoundMatch(bracket, match); 
                // Nous mettons à jour le bracket au fur et à mesure que nous avançons les byes
                // pour que les prochains matchs Byes puissent en tenir compte.
                Object.assign(bracket, updatedBracket);
            }
        }
        
        roundMatches.push(match);
    }

    bracket[roundKey] = { matches: roundMatches };
    return bracket;
}

// =====================================
// 🛑 FONCTIONS ADMIN (MAINTENANT SEULEMENT POUR TEST/RESET)
// =====================================

/**
 * Réinitialise l'état du tournoi (pour les tests).
 */
window.resetTournament = async function() {
    if (!confirm("ATTENTION : Êtes-vous sûr de vouloir RÉINITIALISER le tournoi ? L'état actuel sera perdu !")) return;
    try {
        await window.tournamentStateRef.set({ status: 'registration', currentRound: 0, bracket: {}, winner: null }); // Ajout de winner: null
        await window.teamsRef.set({ list: [] }); // Réinitialiser la liste des équipes
        displayMessage("Le tournoi a été réinitialisé à la phase d'inscription.", 'warning');
    } catch (error) {
        console.error("Erreur lors de la réinitialisation du tournoi:", error);
        displayMessage("Erreur lors de la réinitialisation.", 'error');
    }
}

/**
 * Force le démarrage sans tenir compte du nombre minimum d'équipes (Admin).
 */
window.forceStartTournament = function() {
    if (confirm("Voulez-vous VRAIMENT FORCER le démarrage du tournoi, même si le nombre minimum d'équipes n'est pas atteint ?")) {
        // Note: L'appel à startTournament(true) contourne la vérification d'heure dans startTournament
        startTournament(true);
    }
}

// ⚠️ Suppression de la fonction window.endTournament pour empêcher la fin manuelle du tournoi.


// =====================================
// 🖥️ AFFICHAGE DU FORMULAIRE DE RÉSULTAT
// =====================================

/**
 * Affiche le formulaire d'enregistrement de match et scrolle vers lui.
 */
window.showMatchRecordForm = function(matchId, roundNum, winningTeamCandidate) {
    if (!recordMatchForm || !recordMatchFormContainer) { 
        console.error("Éléments DOM pour le formulaire d'enregistrement de match manquants.");
        return;
    }
    
    // Vérification de l'existence du bracket et du round
    const roundKey = `round${roundNum}`;
    const roundData = window.tournamentState.bracket?.[roundKey];
    
    if (!roundData) {
        displayMessage("Erreur: Le tournoi n'est pas initialisé ou le round est introuvable.", 'error');
        return;
    }

    const match = roundData.matches.find(m => m.id === matchId);
    if (!match) {
        displayMessage("Erreur: Match introuvable.", 'error');
        return;
    }

    // 🏆 CORRECTION CRITIQUE DU BYE : Bloque l'ouverture du formulaire
    // VÉRIFIEZ null, undefined, ET la chaîne "null"
    const team1Missing = !match.team1 || match.team1 === 'null';
    const team2Missing = !match.team2 || match.team2 === 'null';

    if (team1Missing || team2Missing) {
        displayMessage("Ce match est un 'Bye' et le résultat ne peut pas être enregistré manuellement.", 'warning');
        return;
    }
    
    // Si le match a déjà un gagnant, on ne peut pas le modifier.
    if (match.winner) {
         displayMessage("Ce match est déjà enregistré.", 'warning');
         return;
    }
    
    // Remplir le formulaire avec les données du match
    document.getElementById('record-match-id').value = matchId;
    document.getElementById('record-round-num').value = roundNum;
    

    // Afficher les équipes dans le titre
    document.getElementById('current-match-teams').textContent = `${match.team1} vs ${match.team2}`;

    // Créer les options pour le gagnant
    const winnerSelect = document.getElementById('record-winner-name');
    winnerSelect.innerHTML = ''; 

    // Ajouter l'équipe 1
    let option1 = document.createElement('option');
    option1.value = match.team1;
    option1.textContent = match.team1;
    winnerSelect.appendChild(option1);

    // Ajouter l'équipe 2
    let option2 = document.createElement('option');
    option2.value = match.team2;
    option2.textContent = match.team2;
    winnerSelect.appendChild(option2);

    // Pré-sélectionner l'équipe si le bouton 'V' a été cliqué
    if (winningTeamCandidate) {
        winnerSelect.value = winningTeamCandidate;
    }

    // Rendre le formulaire visible et défiler
    recordMatchFormContainer.style.display = 'block';
    recordMatchForm.reset(); // Nettoyer les scores précédents
    recordMatchFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.hideMatchRecordForm = function() {
    if (recordMatchFormContainer) {
        recordMatchFormContainer.style.display = 'none';
    }
    if (recordMatchForm) {
        recordMatchForm.reset();
    }
}

// =====================================
// 👂 FONCTIONS D'ÉCOUTE FIREBASE
// =====================================

/**
 * Configure les écouteurs en temps réel pour l'état du tournoi et la liste des équipes.
 */
function setupTournamentListener() {
    
    // 🚨 ÉCOUTEUR CRITIQUE N°1 : Pour la liste des équipes (teamsRef)
    // Se déclenche à chaque inscription/désinscription pour mettre à jour l'UI.
    window.teamsRef.onSnapshot((teamsDoc) => {
        const teamsData = teamsDoc.data();
        window.teamsList = teamsData?.list || [];
        console.log("✅ Liste des équipes mise à jour:", window.teamsList.length);
        
        // Mettre à jour l'UI quand la liste des équipes change (inscription/désinscription)
        window.updateTournamentUI(window.teamsList); 

    }, (error) => {
        console.error("Erreur lors de la lecture de la liste des équipes:", error);
        displayMessage("Erreur de connexion aux données des équipes.", 'error');
    });


    // ÉCOUTEUR N°2 : Pour l'état du tournoi (status, currentRound, bracket)
    window.tournamentStateRef.onSnapshot(async (stateDoc) => {
        if (stateDoc.exists) {
            window.tournamentState = stateDoc.data();
            console.log("✅ État du tournoi mis à jour:", window.tournamentState.status, "Tour", window.tournamentState.currentRound);
            
            // Mettre à jour l'interface utilisateur en utilisant la liste d'équipe globale
            // L'autre listener assure que window.teamsList est à jour.
            window.updateTournamentUI(window.teamsList);

            // Gérer l'affichage plein écran si l'état est 'finished'
            if (window.tournamentState.status === 'finished' && window.tournamentState.winner) {
                 displayWinnerFullScreen(window.tournamentState.winner);
            }

        } else {
            // Le document n'existe pas (première exécution ou réinitialisation)
            window.tournamentState = { status: 'registration', currentRound: 0, bracket: {} };
            // Mettre à jour l'UI en utilisant la liste d'équipes (vide ou chargée)
            window.updateTournamentUI(window.teamsList);
        }
    }, (error) => {
        console.error("Erreur lors de la lecture de l'état du tournoi:", error);
        displayMessage("Erreur de connexion aux données du tournoi.", 'error');
    });
}


// =====================================
// 👂 ÉCOUTEURS D'ÉVÉNEMENTS DOM
// =====================================

document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ ASSIGNATION DES RÉFÉRENCES DOM
    bracketDisplay = document.getElementById('bracket-display'); 
    bracketContainer = document.getElementById('tournament-bracket'); 
    statusElement = document.getElementById('tournament-status');
    teamsListElement = document.getElementById('tournament-teams-list');
    countElement = document.getElementById('teams-count');
    startBtn = document.getElementById('start-tournament-btn');
    nextRoundBtn = document.getElementById('next-round-btn');
    // Suppression de : endTournamentBtn = document.getElementById('end-tournament-btn');
    recordMatchForm = document.getElementById('record-match-form');
    recordMatchFormContainer = document.getElementById('record-match-form-container'); 
    recordMessageElement = document.getElementById('record-message'); 
    
    // Ajout des listeners aux boutons admin (si non déjà faits)
    if (startBtn) startBtn.addEventListener('click', () => startTournament());
    if (nextRoundBtn) nextRoundBtn.addEventListener('click', window.nextRound);
    if (resetTestBtn) resetTestBtn.addEventListener('click', window.resetTournament);
    if (forceStartBtn) forceStartBtn.addEventListener('click', () => startTournament(true));

    // Suppression du bloc de code qui ajoutait l'écouteur pour le bouton de fin manuelle (force-end-tournament-btn)
    // const forceEndBtn = document.getElementById('force-end-tournament-btn');
    // if (forceEndBtn) forceEndBtn.addEventListener('click', window.endTournament);

    // Écouteur pour la soumission du formulaire d'enregistrement de match
    if (recordMatchForm) {
        recordMatchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const matchId = document.getElementById('record-match-id').value;
            const roundNum = parseInt(document.getElementById('record-round-num').value);
            const winnerTeamName = document.getElementById('record-winner-name').value;
            
            // 🌟 CORRECTION DU SCORE INVERSÉ: on lit le score du gagnant et le score du perdant 🌟
            const scoreWinner = parseInt(document.getElementById('record-score1').value); 
            const scoreLoser = parseInt(document.getElementById('record-score2').value);  
            
            // Validation de base des scores
            if (isNaN(scoreWinner) || isNaN(scoreLoser)) {
                 displayMessage("Les scores doivent être des nombres valides.", 'error');
                 return;
            }
            if (scoreWinner <= scoreLoser) {
                 displayMessage("Le score du gagnant doit être strictement supérieur à celui du perdant.", 'error');
                 return;
            }

            // 🚨 FIX: Vérification de l'existence du bracket et du round
            const roundData = window.tournamentState.bracket?.[`round${roundNum}`];
            const match = roundData?.matches.find(m => m.id === matchId);
            
            if (!match) {
                 displayMessage("Erreur interne: Match introuvable ou bracket non initialisé.", 'error');
                 return;
            }

            let scoreTeam1, scoreTeam2;
            // Réattribuer les scores selon la position Team1 / Team2 dans le match
            if (winnerTeamName === match.team1) {
                scoreTeam1 = scoreWinner; // team1 est le gagnant, donc score1 = scoreWinner
                scoreTeam2 = scoreLoser;  // team2 est le perdant, donc score2 = scoreLoser
            } else { // winnerTeamName === match.team2
                scoreTeam1 = scoreLoser;  // team1 est le perdant, donc score1 = scoreLoser
                scoreTeam2 = scoreWinner; // team2 est le gagnant, donc score2 = scoreWinner
            }
            
            // Passer les scores réattribués dans l'ordre team1, team2
            window.recordMatchResult(matchId, roundNum, winnerTeamName, scoreTeam1, scoreTeam2);
        });
    }

    // Écouteur pour le bouton d'annulation du formulaire de match
    document.getElementById('cancel-record-btn')?.addEventListener('click', window.hideMatchRecordForm);
    
    // ===================================
    // 🚀 DÉMARRAGE CRITIQUE DE L'ÉCOUTEUR
    // ===================================
    setupTournamentListener();
});

/**
 * Génère le HTML pour un match spécifique.
 */
/**
 * Génère le HTML pour un match spécifique.
 */
function getMatchHtml(match, roundNum) {
    
    // 1. Gérer les matchs VIDES (en attente des gagnants précédents)
    if (!match.team1 && !match.team2) {
        return `<div class="match match-empty" data-match-id="${match.id}">En attente...</div>`;
    }
    
    // 2. Gérer les matchs BYE (où une équipe est absente)
    // Un match Bye est défini si team1 ou team2 est null, "null", ou si advancedByBye est true.
    const isTeam1Bye = !match.team1 || match.team1 === 'null';
    const isTeam2Bye = !match.team2 || match.team2 === 'null';
    const isBye = isTeam1Bye || isTeam2Bye || match.advancedByBye;
    
    // Si c'est un Bye MAIS QU'IL N'A PAS ENCORE ÉTÉ MARQUÉ COMME JOUÉ
    if (isBye && !match.winner) {
        // Déterminer l'équipe qui avance
        const winner = isTeam1Bye ? match.team2 : match.team1;
        // Déterminer l'information sur l'adversaire 'manquant'
        const loserInfo = isTeam1Bye ? (match.team1 ?? 'Bye') : (match.team2 ?? 'Bye');
        
        // Rendu du match Bye sans bouton de validation
        return `
            <div class="match match-bye" data-match-id="${match.id}">
                <div class="match-info team-winner">
                    <span class="team">${winner}</span>
                    <span class="score" style="font-weight: bold; color: #ff9800;">AVANCÉ</span>
                </div>
                <div class="match-info team-loser">
                    <span class="team" style="color:#777; font-style: italic;">(${loserInfo})</span>
                    <span class="score"></span>
                </div>
                </div>
        `;
    }
    
    // 3. Gérer les matchs JOUÉS (Byes joués ou matchs normaux terminés)
    if (match.winner) {
        // Le cas où le match a été validé (Bye avancé ou match normal)
        const winnerScore = match.team1 === match.winner ? match.score1 : match.score2;
        const loser = match.team1 === match.winner ? match.team2 : match.team1;
        const loserScore = match.team1 === match.winner ? match.score2 : match.score1;
        
        const isAdvancedBye = match.advancedByBye;
        const winnerTeamClass = isAdvancedBye ? 'team-winner advanced-bye' : 'team-winner';

        return `
            <div class="match match-played match-completed" data-match-id="${match.id}">
                <div class="match-info ${winnerTeamClass}">
                    <span class="team">${match.winner}</span>
                    <span class="score">${winnerScore}</span>
                </div>
                <div class="match-info team-loser">
                    <span class="team">${loser}</span>
                    <span class="score">${loserScore}</span>
                </div>
            </div>
        `;
    }

    // 4. Gérer les matchs À JOUER (avec deux équipes et pas de gagnant)
    // 🏆 CORRECTION DU BYE : Le bouton ne s'affiche QUE si les deux équipes sont présentes
    const team1Exists = match.team1 && match.team1 !== 'null';
    const team2Exists = match.team2 && match.team2 !== 'null';
    const showButton = window.currentUser?.isAdmin && team1Exists && team2Exists && !match.winner;

    return `
        <div class="match match-pending" data-match-id="${match.id}">
            <div class="match-info team-pending">
                <span class="team">${match.team1}</span>
                <span class="score">?</span>
            </div>
            <div class="match-info team-pending">
                <span class="team">${match.team2}</span>
                <span class="score">?</span>
            </div>
            ${showButton ? 
                `<button class="record-match-btn" onclick="window.showMatchRecordForm('${match.id}', ${roundNum})">V</button>` : ''}
        </div>
    `;
}

/**
 * Met à jour le match du tour suivant dans le bracket avec le gagnant du match actuel.
 * Gère également la propagation des Byes automatiques si l'adversaire est manquant.
 * @param {Object} bracket L'objet complet du bracket.
 * @param {Object} match Le match qui vient d'être terminé.
 * @returns {Object} Le bracket mis à jour.
 */
function updateNextRoundMatch(bracket, match) {
    if (!match.nextMatchSlot) return bracket;

    const nextRoundNumber = match.nextMatchSlot.round;
    const nextMatchId = match.nextMatchSlot.matchId;
    const nextSlot = match.nextMatchSlot.slot;
    
    const nextRoundKey = `round${nextRoundNumber}`;
    const nextRound = bracket[nextRoundKey];

    if (!nextRound) return bracket;

    const nextMatch = nextRound.matches.find(m => m.id === nextMatchId);

    if (nextMatch) {
        // Mettre à jour l'équipe dans le slot
        nextMatch[nextSlot] = match.winner;
        
        // Mettre à jour l'état avancé par Bye si le match précédent était un Bye
        if (match.advancedByBye) {
             nextMatch.advancedByBye = true;
        }

        // 🚨 GÉRER LES BYE AUTOMATIQUES (si l'autre équipe est 'null')
        const otherSlot = nextSlot === 'team1' ? 'team2' : 'team1';
        
        // Si l'équipe opposée est vide ('null' ou non définie), c'est un Bye.
        // On termine immédiatement le match suivant et on propage la victoire.
        if (!nextMatch[otherSlot] || nextMatch[otherSlot] === 'null' || nextMatch[otherSlot] === '') {
            nextMatch.winner = match.winner;
            nextMatch.loser = nextMatch[otherSlot] || 'null'; // L'adversaire est le perdant
            nextMatch.score1 = nextSlot === 'team1' ? 1 : 0; // 1-0 ou 0-1 pour le Bye
            nextMatch.score2 = nextSlot === 'team2' ? 1 : 0;
            nextMatch.advancedByBye = true;
            
            // Appel récursif pour propager le Bye immédiatement au tour suivant
            if (nextMatch.nextMatchSlot) {
                return updateNextRoundMatch(bracket, nextMatch); 
            }
        }
    }

    return bracket; // Retourne le bracket modifié
}
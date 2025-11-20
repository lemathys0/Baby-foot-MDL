let reportsListenerRef = null;


function showAdminPanel() {
// ... (Fonction existante - Code omis pour la clarté du code)
    if (window.currentUser && window.currentUser.isAdmin) {
        // 1. Appeler showSection pour masquer TOUTES les autres sections et afficher celle-ci
        window.showSection('adminPanel'); 

        // 2. Charger les données spécifiques à l'admin
        
        window.showAdminSubPanel('reports'); 
    }
}

// DANS app.js


// DANS app.js

/**
 * Gère l'affichage des différents sous-panneaux d'administration 
 * et déclenche le chargement des données spécifiques à chaque onglet.
 * * @param {string} panelId L'ID du sous-panneau à afficher (ex: 'reports', 'maintenancePanel').
 */
function showAdminSubPanel(panelId) {
    // 1. Masquer tous les sous-panneaux d'administration (pour n'afficher que le ciblé)
    document.querySelectorAll('.admin-sub-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    // 2. Afficher le panneau cible
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
        targetPanel.style.display = 'block';
        
        // 3. Charger les données spécifiques du sous-panneau
        
        if (panelId === 'reports') {
            // Charger les rapports suspects
            if (typeof loadSuspiciousReports === 'function') loadSuspiciousReports();
            
        } else if (panelId === 'blockedUsersPanel') {
            // Charger la liste des utilisateurs bloqués
            if (typeof loadBlockedUsers === 'function') loadBlockedUsers();
            
        } else if (panelId === 'requestsPanel') {
            // Charger les demandes de réactivation
            if (typeof loadReactivationRequests === 'function') loadReactivationRequests(); 
            
        } 
        // 🚀 AJOUT CLÉ : PANNEAU DE MAINTENANCE
        else if (panelId === 'maintenancePanel') { 
            // Charger l'état et l'interface de gestion de la maintenance
            if (typeof loadMaintenancePanel === 'function') loadMaintenancePanel();
        }
    }
}

// Attacher l'événement au bouton (si ce n'est pas déjà fait)
document.getElementById('admin-btn').onclick = showAdminPanel;


/**
 * Charge tous les signalements, les regroupe par utilisateur signalé, 
 * charge les pseudos réels (via /name), et affiche les "dossiers".
 */
/**
 * Charge les signalements suspects depuis Firebase et les affiche,
 * en s'assurant qu'un seul écouteur est actif.
 */
// DANS admin.js

// Assurez-vous que cette variable est toujours déclarée en haut de votre fichier admin.js
// let reportsListenerRef = null; 

function loadSuspiciousReports() {
    const reportsRef = window.reportsRef;
    const reportList = document.getElementById('suspiciousReports');
    
    // 💡 CORRECTION DÉFINITIVE : Détacher TOUS les écouteurs sur ce chemin Firebase.
    // Ceci supprime les "écouteurs fantômes" des sessions précédentes après un rafraîchissement.
    reportsRef.off(); 
    reportsListenerRef = null; // Réinitialiser pour une nouvelle affectation
    
    reportList.innerHTML = '<li>Chargement des signalements...</li>'; 
    
    // 1. Définir la fonction de rappel (Listener Callback)
    const listenerCallback = (snapshot) => {
        // Cette partie s'exécute à chaque changement de données
        reportList.innerHTML = ''; 
        const reports = snapshot.val();
        
        if (!reports) {
            reportList.innerHTML = '<li class="no-report">Aucun signalement suspect.</li>';
            return;
        }

        const groupedReports = {};
        const uniqueUids = new Set();

        // 1. REGROUPEMENT ET IDENTIFICATION DES UIDs UNIQUES
        Object.entries(reports).forEach(([reportId, report]) => {
            const uidMatch = report.message.match(/UID:\\s*([a-zA-Z0-9]+)/);
            // Si l'UID n'est pas trouvé, on utilise un ID spécial pour les regrouper
            const reportedUid = uidMatch ? uidMatch[1] : 'UNKNOWN_UID'; 
            
            uniqueUids.add(reportedUid);
            
            if (!groupedReports[reportedUid]) {
                groupedReports[reportedUid] = {
                    reportedUid: reportedUid,
                    reportedName: 'Chargement du nom...', // Placeholder temporaire
                    reports: [] 
                };
            }

            groupedReports[reportedUid].reports.push({
                reportId: reportId,
                reportDetails: report
            });
        });

        if (Object.keys(groupedReports).length === 0) {
            reportList.innerHTML = '<li class="no-report">Aucun signalement suspect.</li>';
            return;
        }


        // 2. RÉCUPÉRATION DES NOMS RÉELS DE LA BASE DE DONNÉES (ASYNCHRONE)
        const namePromises = [];
        const uidToNameMap = {};
        
        uniqueUids.forEach(uid => {
            if (uid !== 'UNKNOWN_UID') {
                const namePromise = window.usersRef.child(uid).child('name').once('value')
                    .then(nameSnapshot => {
                        const name = nameSnapshot.val();
                        uidToNameMap[uid] = name || `(Nom non trouvé) UID: ${uid}`;
                    })
                    .catch(error => {
                        console.error(`Erreur de chargement du nom pour l'UID ${uid}:`, error);
                        uidToNameMap[uid] = `(Erreur de nom) UID: ${uid}`;
                    });
                namePromises.push(namePromise);
            } else {
                uidToNameMap['UNKNOWN_UID'] = '⚠️ UID INEXTRAYABLE du message';
            }
        });

        // Attendre que tous les noms soient chargés
        Promise.all(namePromises).then(() => {
            
            // 3. MISE À JOUR DES NOMS ET AFFICHAGE DES DOSSIERS
            const finalGroups = Object.values(groupedReports).map(group => {
                group.reportedName = uidToNameMap[group.reportedUid] || group.reportedName; 
                return group;
            });
            
            const sortedGroups = finalGroups.sort((a, b) => b.reports.length - a.reports.length);

            sortedGroups.forEach(group => {
                const reportedUid = group.reportedUid;
                const totalReports = group.reports.length;
                
                const dossierLi = document.createElement('li');
                dossierLi.className = 'admin-dossier';

                // Génération du HTML du dossier
                dossierLi.innerHTML = `
                    <div class="dossier-header" data-uid="${reportedUid}">
                        <h3>🚨 Dossier : ${group.reportedName}</h3>
                        <span class="report-count">${totalReports} signalement${totalReports > 1 ? 's' : ''}</span>
                        <button class="toggle-dossier-btn">Détails (${totalReports})</button>
                        
                        <div class="admin-actions-dossier">
                            <button class="admin-btn block-btn" data-uid="${reportedUid}">🔒 Bloquer</button>
                            <button class="admin-btn message-btn" data-uid="${reportedUid}">💬 Afficher message</button>
                        </div>
                    </div>
                    
                    <ul class="individual-reports" style="display:none;" id="reports-list-${reportedUid}">
                    </ul>
                    <hr>
                `;
                
                const individualReportsList = dossierLi.querySelector(`#reports-list-${reportedUid}`);
                
                // 4. AJOUT DES RAPPORTS INDIVIDUELS DANS LE DOSSIER
                group.reports.forEach(reportItem => {
                    const report = reportItem.reportDetails;
                    const li = document.createElement('li');
                    li.className = 'admin-report-item';
                    
                    li.innerHTML = `
                        <h4>➡️ ${report.type}</h4>
                        <p><strong>Rapport ID :</strong> ${reportItem.reportId}</p>
                        <p><strong>Message :</strong> ${report.message}</p>
                        <p><strong>Date :</strong> ${new Date(report.timestamp).toLocaleString()}</p>
                        <div id="user-info-${reportItem.reportId}">Chargement des infos utilisateur...</div>
                        <div class="admin-actions">
                            <button class="admin-btn resolve-btn" data-id="${reportItem.reportId}">✅ Résolu</button>
                        </div>
                    `;
                    individualReportsList.appendChild(li);

                    // 🛠️ Appel de l'ancienne fonction pour les détails de l'utilisateur (maintenant loadReportedUserInfo)
                    loadReportedUserInfo(reportedUid, reportItem.reportId);
                });

                reportList.appendChild(dossierLi);
                
                // 5. LOGIQUE POUR DÉPLIER/PLIER LE DOSSIER
                const toggleButton = dossierLi.querySelector('.toggle-dossier-btn');
                toggleButton.addEventListener('click', () => {
                    const list = document.getElementById(`reports-list-${reportedUid}`);
                    const isHidden = list.style.display === 'none';
                    list.style.display = isHidden ? 'block' : 'none';
                    toggleButton.textContent = isHidden ? `Masquer les détails (${totalReports})` : `Détails (${totalReports})`;
                });
            });
            
            // 6. ATTRIBUER LES GESTIONNAIRES D'ÉVÉNEMENTS
            attachAdminActionListeners();
        });
    };
    
    // 2. Créer l'écouteur permanent (.on) et lui passer la fonction de rappel
    reportsRef.on('value', listenerCallback, (error) => {
        console.error("Erreur de lecture des signalements:", error);
        reportList.innerHTML = '<li class="error-report">Erreur de chargement des signalements.</li>';
    });

    // 3. Stocker la fonction de rappel (pour le détachement futur)
    reportsListenerRef = listenerCallback;
}

/**
 * Attache les gestionnaires d'événements aux boutons d'action de l'administration.
 */
function attachAdminActionListeners() {
    // Événement pour bloquer le compte
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.onclick = (e) => {
            const uid = e.target.getAttribute('data-uid');
            if (confirm(`Êtes-vous sûr de vouloir BLOQUER l'utilisateur ${uid} ? Cette action est immédiate.`)) {
                window.usersRef.child(uid).update({ isBlocked: true })
                    .then(() => displayMessage(`Compte ${uid} BLOQUÉ.`, 'success'))
                    .catch(err => displayMessage(`Erreur lors du blocage: ${err.message}`, 'error'));
            }
        };
    });

    // Événement pour afficher un message
    document.querySelectorAll('.message-btn').forEach(btn => {
        btn.onclick = (e) => {
            const uid = e.target.getAttribute('data-uid');
            const message = prompt(`Entrez le message à afficher pour l'utilisateur ${uid} à la prochaine connexion:`);
            if (message) {
                window.usersRef.child(uid).update({ adminMessage: message })
                    .then(() => displayMessage(`Message enregistré pour ${uid}. Il apparaîtra à la prochaine connexion.`, 'success'))
                    .catch(err => displayMessage(`Erreur lors de l'envoi du message: ${err.message}`, 'error'));
            }
        };
    });

    // Événement pour marquer le signalement comme résolu
    document.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.onclick = (e) => {
            const reportId = e.target.getAttribute('data-id');
            if (confirm(`Marquer le signalement ${reportId} comme résolu et le supprimer de la liste ?`)) {
                window.reportsRef.child(reportId).remove()
                    .then(() => {
                        displayMessage('Signalement marqué comme résolu et supprimé.', 'success');
                        // 🏆 Recharger la liste pour rafraîchir l'affichage des dossiers
                        loadSuspiciousReports(); 
                    })
                    .catch(err => displayMessage(`Erreur lors de la suppression: ${err.message}`, 'error'));
            }
        };
    });
}

function loadBlockedUsers() {
// ... (Fonction existante - Code omis pour la clarté du code)
    const listEl = document.getElementById('blocked-users-list');
    listEl.innerHTML = '<li>Chargement des utilisateurs bloqués...</li>';

    window.usersRef.orderByChild('isBlocked').equalTo(true).once('value').then(snapshot => {
        listEl.innerHTML = '';
        const users = snapshot.val();
        if (!users) {
            listEl.innerHTML = '<li>Aucun compte actuellement bloqué.</li>';
            return;
        }

        Object.entries(users).forEach(([uid, user]) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <p><strong>${user.name || 'Inconnu'}</strong> (UID: ${uid})</p>
                <p>Solde: ${user.balance.toFixed(2)}€</p>
                <button class="admin-btn unblock-btn" data-uid="${uid}">🔓 Débloquer</button>
            `;
            listEl.appendChild(li);
        });
        
        // Attacher les gestionnaires d'événements
        document.querySelectorAll('.unblock-btn').forEach(btn => {
            btn.onclick = (e) => {
                const uid = e.target.getAttribute('data-uid');
                if (confirm(`Êtes-vous sûr de vouloir DÉBLOQUER l'utilisateur ${uid} ?`)) {
                    window.usersRef.child(uid).update({ isBlocked: null }) // Supprimer le flag 'isBlocked'
                        .then(() => {
                            displayMessage(`Compte ${uid} DÉBLOQUÉ.`, 'success');
                            loadBlockedUsers(); // Recharger la liste
                        })
                        .catch(err => displayMessage(`Erreur de déblocage: ${err.message}`, 'error'));
                }
            };
        });
    });
}

// DANS app.js

function loadReactivationRequests() {
// ... (Fonction existante - Code omis pour la clarté du code)
    const reportsRef = window.reportsRef;
    const requestList = document.getElementById('reactivation-requests-list');
    requestList.innerHTML = '<li>Chargement des demandes de réactivation...</li>';

    reportsRef.once("value").then(snapshot => {
        requestList.innerHTML = ''; 
        const reports = snapshot.val();
        
        if (!reports) {
            requestList.innerHTML = '<li>Aucune demande de réactivation en attente.</li>';
            return;
        }

        let foundRequests = false;

        Object.entries(reports).forEach(([reportId, report]) => {
            // Filtrer uniquement les demandes de réactivation
            if (report.type === "Demande de Réactivation") {
                foundRequests = true;
                const li = document.createElement('li');
                li.className = 'admin-request-item';
                
                // Extraire l'UID (comme dans loadSuspiciousReports)
                const uidMatch = report.message.match(/UID:\s*([a-zA-Z0-9]+)/);
                const reportedUid = uidMatch ? uidMatch[1] : null;

                li.innerHTML = `
                    <h4>📧 Nouvelle Demande</h4>
                    <p><strong>Date :</strong> ${new Date(report.timestamp).toLocaleString()}</p>
                    <p><strong>Message :</strong> ${report.message}</p>
                    <div id="request-user-info-${reportId}">Chargement des infos utilisateur...</div>
                    <div class="admin-actions">
                        ${reportedUid ? `
                            <button class="admin-btn unblock-request-btn" data-uid="${reportedUid}" data-id="${reportId}">🔓 Débloquer le compte</button>
                        ` : '<p>UID non trouvé.</p>'}
                        <button class="admin-btn resolve-request-btn" data-id="${reportId}">🗑️ Marquer comme Traité</button>
                    </div>
                    <hr>
                `;
                requestList.appendChild(li);

                if (reportedUid) {
                    loadReportedUserInfo(reportedUid, `request-user-info-${reportId}`);
                }
            }
        });
        
        if (!foundRequests) {
            requestList.innerHTML = '<li>Aucune demande de réactivation en attente.</li>';
        }
        
        // Attacher les gestionnaires d'événements spécifiques aux demandes
        attachRequestActionListeners();
    });
}


// DANS admin.js

const configRef = firebase.database().ref('config');

// DANS admin.js

// DANS admin.js

/**
 * Change l'état du mode maintenance dans la base de données.
 * @param {boolean} newState - L'état désiré (true pour Actif, false pour Inactif).
 */
function toggleMaintenanceMode(newState) {
    // LOG 1: Vérifie si la fonction est appelée
    console.log(`[ADMIN LOG 1] Fonction toggleMaintenanceMode appelée. État demandé: ${newState ? 'ACTIF' : 'INACTIF'}`);
    
    // Vérification de la référence
    if (!window.configRef) {
        console.error("[ADMIN LOG ERREUR] La référence Firebase 'configRef' est introuvable. Avez-vous utilisé window.configRef dans app.js ?");
        displayMessage("Erreur critique : La connexion admin est incomplète.", 'error');
        return;
    }

    window.configRef.child('isMaintenance').set(newState)
        .then(() => {
            // LOG 2: Succès de l'écriture (DOIT S'AFFICHER)
            console.log(`[ADMIN LOG 2] Mode maintenance mis à jour avec succès dans Firebase.`);
            displayMessage(`Mode maintenance ${newState ? 'activé' : 'désactivé'} avec succès !`, 'success');
            // Recharger le panneau pour mettre à jour le bouton
            loadMaintenancePanel(); 
        })
        .catch(error => {
            // LOG 3: Échec (Devrait s'afficher si l'écriture Firebase a échoué)
            console.error("[ADMIN LOG 3] Erreur de mise à jour maintenance Firebase:", error);
            displayMessage("Erreur Firebase lors de la mise à jour du mode maintenance.", 'error');
        });
}

/**
 * Charge l'état actuel et affiche le panneau de contrôle de maintenance.
 */
function loadMaintenancePanel() {
    const maintenancePanel = document.getElementById('maintenancePanelContent');
    if (!maintenancePanel) return;

    configRef.child('isMaintenance').once('value')
        .then(snapshot => {
            const isMaintenance = snapshot.val() || false;
            
            maintenancePanel.innerHTML = `
                <h3>État Actuel : ${isMaintenance ? '🔴 EN MAINTENANCE' : '🟢 EN LIGNE'}</h3>
                <p>Cliquez sur le bouton pour basculer l'état de l'application pour les utilisateurs non-admin.</p>
                <button 
                    class="admin-btn ${isMaintenance ? 'red-btn' : 'green-btn'}"
                    onclick="toggleMaintenanceMode(${!isMaintenance})"
                >
                    ${isMaintenance ? '🟢 Passer en Ligne' : '🔴 Activer Maintenance'}
                </button>
            `;
        })
        .catch(error => {
            maintenancePanel.innerHTML = `<p class="error">Impossible de charger l'état de maintenance : ${error.message}</p>`;
        });
}

// DANS admin.js (Ajoutez cette nouvelle fonction)

// DANS admin.js (Assurez-vous d'avoir ceci)
// ...
function cleanupAdminListeners() {
    const reportsRef = window.reportsRef;
    
    // reportsListenerRef doit être déclaré en haut de admin.js: let reportsListenerRef = null;
    if (reportsListenerRef) {
        reportsRef.off('value', reportsListenerRef);
        reportsListenerRef = null; 
    }
}
// Contient la logique d'enregistrement du jeton FCM
function setupFCM() {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
        console.log("Les Notifications Push ne sont pas supportées.");
        return;
    }

    // 1. Initialiser le service de messagerie
    const messaging = firebase.messaging();

    // 2. Demander la permission à l'utilisateur
    messaging.requestPermission()
        .then(() => {
            console.log('Permission de notification accordée.');
            // 3. Obtenir le jeton de l'appareil
            return messaging.getToken();
        })
        .then(token => {
            console.log('FCM Token:', token);
            // 4. SAUVEGARDER le jeton dans le profil de l'utilisateur
            // Les références globales (window.currentUser, window.usersRef) DOIVENT être définies ici.
            if (window.currentUser && window.currentUser.uid) {
                window.usersRef.child(window.currentUser.uid).update({
                    fcmToken: token 
                });
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération du jeton FCM:', error);
            // Si l'utilisateur refuse la permission, vous ne pouvez rien faire.
        });
}
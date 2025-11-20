// server.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialise Firebase Admin SDK (mets ton fichier de clé JSON ici)
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

// Middleware
app.use(cors()); // Autorise toutes les origines (pour le dev)
app.use(express.json()); // Pour lire le JSON dans le body

// Endpoint pour réinitialiser le mot de passe depuis le front
// Body attendu : { username: "user1", newPassword: "nouveauMDP" }
app.post("/reset-password-admin", async (req, res) => {
  const { username, newPassword } = req.body;
  const email = username + "@babyfoot.app"; // Même logique que tes comptes

  try {
    // Récupérer l'utilisateur par email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Changer son mot de passe
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });

    res.send({ success: true, message: "Mot de passe réinitialisé !" });
  } catch (error) {
    console.error(error);
    res.status(400).send({ success: false, message: error.message });
  }
});

// Test serveur
app.get("/", (req, res) => {
  res.send("Serveur en ligne !");
});

// Lancement du serveur
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

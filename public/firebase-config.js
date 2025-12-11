// ⚡ Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyApyoqW8rFKIulAYU1xJv2ojmh7FU2Mckw",
  authDomain: "reservation-baby-foo.firebaseapp.com",
  databaseURL: "https://reservation-baby-foo-default-rtdb.firebaseio.com",
  projectId: "reservation-baby-foo",
  storageBucket: "reservation-baby-foo.firebasestorage.app",
  messagingSenderId: "582244585795",
  appId: "1:582244585795:web:1cefc115beaa407bbb9ff6",
  measurementId: "G-C99S4GES1V"
};

// 🔥 Initialise Firebase
firebase.initializeApp(firebaseConfig);

// ===============================
// 🗄️ Realtime Database
// ===============================
const rtdb = firebase.database();
const queueRef = rtdb.ref("queue");
const currentRef = rtdb.ref("currentPlayer");
const matchesRef = rtdb.ref("matches");
const usersRef = rtdb.ref("users");
const taxPotRef = rtdb.ref('taxPot');

// ===============================
// 🔥 Firestore
// ===============================
const db = firebase.firestore();
const cardsRef = db.collection("cards");
const profilesRef = db.collection("profiles");

// (Optionnel) Expose pour débogage global
window.firebaseRefs = { queueRef, currentRef, matchesRef, usersRef, cardsRef, profilesRef };

// ✅ Expose les références globalement (important pour app.js et pari.js)
window.rtdb = rtdb;
window.db = db;
window.queueRef = queueRef;
window.matchesRef = matchesRef;
window.usersRef = usersRef;
window.cardsRef = cardsRef;
window.profilesRef = profilesRef;
window.reportsRef = firebase.database().ref('suspicious_reports');


if (firebase.analytics) {
    firebase.analytics(); // L'appel lui-même démarre la collecte
}

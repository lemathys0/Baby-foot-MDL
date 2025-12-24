# 📱 Guide d'Accès aux Quêtes

## 🎯 Comment accéder aux Quêtes sur Mobile

### **Méthode 1 : Via la Navigation Principale** ⭐

La navigation en bas de l'écran contient maintenant **6 onglets** :

```
┌──────────────────────────────────────────────────┐
│  🏠      🏆      👥      🎯      📚      👤     │
│ Accueil Classe Match  Quêtes BabyDex Profil   │
└──────────────────────────────────────────────────┘
```

**L'icône Quêtes (🎯) affiche :**
- ✅ Un **badge rouge** avec le nombre de quêtes complétées à réclamer
- ✅ Animation **pulse** pour attirer l'attention
- ✅ Compteur dynamique (ex: "3" = 3 quêtes prêtes)

**Comment ça fonctionne :**
1. Quand vous complétez une quête (jouer un match, gagner, etc.)
2. Un badge rouge apparaît sur l'icône Quêtes
3. Cliquez sur l'icône pour voir vos quêtes
4. Réclamez vos récompenses !

---

### **Méthode 2 : Carte Rapide sur l'Accueil** 🏠

Sur la **page d'accueil**, une nouvelle carte "Quêtes du jour" s'affiche :

```
┌─────────────────────────────────────┐
│ 🎯 Quêtes du jour          [3 ✓]   │
│                                     │
│ Joueur actif: Jouer 3 matchs       │
│ ████████░░░░░░░░░░  2/3             │
│                                  →  │
└─────────────────────────────────────┘
```

**Fonctionnalités :**
- ✅ Affiche la quête active en cours
- ✅ Barre de progression en temps réel
- ✅ Compteur de quêtes complétées
- ✅ Clic direct vers la page Quêtes

---

## 🎨 Système de Badges/Notifications

### **Badge Rouge sur l'icône Quêtes**

Le badge apparaît automatiquement quand :
- Une quête quotidienne est complétée
- Une quête hebdomadaire est complétée
- Vous avez des récompenses à récupérer

**Exemples visuels :**

```
Sans quêtes complétées :    Avec quêtes complétées :
     🎯                           🎯
   Quêtes                       Quêtes
                                  ╱  ╲
                                 │ 2 │ ← Badge rouge
                                  ╲  ╱
```

---

## 📊 Page Quêtes - Vue Complète

Quand vous accédez à `/quests`, vous verrez :

### **1. En-tête avec Statistiques**
```
┌──────────────────────────────────────┐
│ 🎯 Quêtes                            │
│ Complète des quêtes pour gagner      │
│ des récompenses                      │
│                                      │
│ Quotidiennes: ████░░  3/4  (75%)    │
│ Hebdomadaires: ██░░░░  1/4  (25%)   │
└──────────────────────────────────────┘
```

### **2. Onglets Quotidiennes/Hebdomadaires**
```
┌──────────────────────────────────────┐
│  [Quotidiennes]  [Hebdomadaires]    │
└──────────────────────────────────────┘
```

### **3. Cartes de Quêtes**
```
┌──────────────────────────────────────┐
│ 🏆 Joueur actif            [Terminé] │
│ Jouer 3 matchs                       │
│ ████████████████████  3/3  100%      │
│ 💰 10  📦 0  🏅 0       [Réclamer]  │
└──────────────────────────────────────┘
```

**Statuts possibles :**
- 🔵 **En cours** - Barre de progression
- ✅ **Terminé** - Badge vert + bouton "Réclamer"
- ✓ **Réclamé** - Badge gris

---

## ⚡ Progression Automatique

Les quêtes se mettent à jour **automatiquement** quand vous :

| Action | Quête mise à jour |
|--------|-------------------|
| Jouer un match | "Jouer X matchs" (+1) |
| Gagner un match 1v1 | "Gagner X matchs 1v1" (+1) |
| Gagner un match 2v2 | "Gagner X matchs 2v2" (+1) |
| Récupérer le bonus quotidien | "Assidu" (+1) |
| Ouvrir un pack de cartes | "Collectionneur" (+1) |
| Envoyer un message | "Social" (+1) |
| Gagner de l'ELO | "Ascension" (+ELO gagné) |

**Pas besoin de faire quoi que ce soit** - Le système track automatiquement !

---

## 🎁 Types de Récompenses

Chaque quête offre des récompenses différentes :

### **Quotidiennes** (5-20 Fortune)
- 💰 **Fortune** : 5-20 coins
- Récompenses immédiates au clic

### **Hebdomadaires** (50-150 Fortune + Bonus)
- 💰 **Fortune** : 50-150 coins
- 📦 **Packs de cartes** : 1-2 packs
- 🏅 **Badges spéciaux** : Achievements uniques

---

## 🔔 Notifications (À venir)

**Phase 2** inclura des notifications push pour :
- ✅ Quête complétée
- ✅ Récompense prête à récupérer
- ✅ Nouvelles quêtes quotidiennes disponibles
- ✅ Rappel si quêtes sur le point d'expirer

---

## 🚀 Tips & Astuces

### **Maximiser vos gains :**
1. **Vérifiez les quêtes quotidiennes chaque jour** à minuit
2. **Complétez les quêtes faciles en premier** (bonus quotidien, etc.)
3. **Planifiez vos matchs** selon les quêtes actives
4. **Surveillez le badge rouge** sur l'icône Quêtes
5. **Réclamez vos récompenses rapidement** pour débloquer de nouvelles quêtes

### **Réinitialisation :**
- **Quotidiennes** : Minuit (00:00)
- **Hebdomadaires** : Lundi à 00:00

### **Progression :**
Les quêtes s'empilent ! Vous pouvez :
- Compléter plusieurs quêtes en un match
- Progresser sur daily + weekly simultanément
- Accumuler les récompenses

---

## 📱 Responsive Design

L'interface s'adapte automatiquement :
- **Mobile** : Navigation en bas avec 6 onglets
- **Tablet** : Disposition optimisée
- **Desktop** : Vue large avec toutes les quêtes visibles

---

## ❓ FAQ

**Q: Où sont mes quêtes ?**
→ Cliquez sur l'icône 🎯 dans la barre du bas OU sur la carte "Quêtes du jour" sur l'accueil

**Q: Le badge rouge ne disparaît pas ?**
→ Assurez-vous d'avoir cliqué sur "Réclamer" pour chaque quête complétée

**Q: Combien de temps avant expiration ?**
→ Quotidiennes : jusqu'à minuit / Hebdomadaires : jusqu'au lundi

**Q: Puis-je refaire les mêmes quêtes ?**
→ Oui ! Elles se réinitialisent chaque jour/semaine avec de nouvelles sélections

**Q: Les quêtes sont-elles obligatoires ?**
→ Non, c'est optionnel mais recommandé pour gagner de la Fortune facilement

---

## 🎯 Résumé Rapide

**3 façons d'accéder aux Quêtes :**

1. 🎯 **Icône dans la navigation** (en bas) - Avec badge rouge si complétées
2. 🏠 **Carte sur l'accueil** - Affiche la progression actuelle
3. 🔗 **URL directe** - `/quests` dans le navigateur

**Tous les chemins mènent aux quêtes !** 🚀

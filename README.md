# 🃏 Blackjack Français ENHC

Un jeu de blackjack français implémentant les règles ENHC (European No Hole Card) avec stratégie de base intégrée.

## 🎮 Règles du Jeu

### Configuration
- **6 jeux de cartes** mélangés automatiquement
- **ENHC (European No Hole Card)** - Le croupier ne tire sa deuxième carte qu'après que toutes les mains du joueur soient terminées
- **Croupier reste sur 17 souple (S17)** - Le croupier ne tire pas sur un 17 souple (As + 6)

### Actions Disponibles
- **Double** : Autorisé sur toutes les mains ET après split
- **Split** : Maximum 3 mains (2 resplits possibles)
- **As splittés** : Une seule carte supplémentaire autorisée
- **Abandon** : Possible seulement contre un 10 du croupier (pas contre un As)
- **Assurance** : Disponible quand le croupier montre un As (paiement 2:1)

### Paiements
- **Blackjack naturel** : 3:2 (150% de la mise)
- **Victoire normale** : 1:1 (100% de la mise)
- **Assurance** : 2:1 (200% de la mise d'assurance)
- **Abandon** : Récupération de 50% de la mise

## 🎯 Fonctionnalités

### Interface de Jeu
- **Gestion des crédits** avec mise ajustable
- **Affichage des cartes** avec design moderne
- **Mains multiples** pour les splits
- **Messages informatifs** pour les actions importantes

### Stratégie de Base Intégrée
- **Tableaux complets** pour tous les scénarios :
  - Totaux durs (5-21)
  - Totaux souples (A,2 à A,9)
  - Paires (A,A à 10,10)
- **Légende des actions** :
  - **T** = Tirer
  - **R** = Rester
  - **D** = Doubler (sinon tirer)
  - **S** = Séparer
  - **A** = Abandonner

### Aide Visuelle
- **Indicateur de main active** lors des splits
- **Valeurs calculées automatiquement** (dur/souple/blackjack/crevé)
- **Boutons d'action intelligents** activés selon le contexte
- **Interface responsive** pour mobile et desktop

## 🚀 Utilisation

### Démarrage
1. Ouvrez `index.html` dans votre navigateur
2. Ajustez votre mise avec les boutons de mise
3. Cliquez sur "Distribuer" pour commencer

### Pendant le Jeu
1. **Observez votre main** et celle du croupier
2. **Consultez la stratégie** (cliquez sur l'œil pour afficher/masquer)
3. **Choisissez votre action** selon la stratégie optimale
4. **Gérez vos splits** si vous séparez des paires

### Conseils
- Suivez la stratégie de base pour optimiser vos chances
- L'abandon n'est possible que contre un 10 du croupier
- L'assurance est généralement défavorable (sauf comptage de cartes)
- Attention aux règles ENHC : le croupier ne vérifie pas immédiatement son blackjack

## 🔧 Technologies Utilisées

- **HTML5** : Structure sémantique
- **CSS3** : Design moderne avec animations
- **JavaScript ES6+** : Logique de jeu orientée objet
- **Responsive Design** : Compatible mobile et desktop

## 📱 Compatibilité

- **Navigateurs modernes** (Chrome, Firefox, Safari, Edge)
- **Appareils mobiles** et tablettes
- **Pas de dépendances externes** - fonctionne hors ligne

## 🎲 Algorithmes

### Gestion des Cartes
- **Mélange de Fisher-Yates** pour randomisation optimale
- **Rechargement automatique** quand moins de 20 cartes restantes
- **Calcul intelligent des As** (1 ou 11 selon l'optimal)

### Logique ENHC
- **Distribution séquentielle** : Joueur d'abord, puis croupier
- **Vérification différée** du blackjack croupier
- **Gestion des situations spéciales** (assurance, abandon)

## 🏆 Prochaines Améliorations Possibles

- Historique des parties
- Statistiques détaillées
- Sauvegarde locale des crédits
- Mode entraînement avec conseils
- Sons et animations avancées
- Multiplayer en réseau

---

*Jouez de manière responsable. Ce jeu est à des fins de divertissement uniquement.*

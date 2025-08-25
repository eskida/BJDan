// Classe pour représenter une carte
class Card {
    constructor(suit, value, name) {
        this.suit = suit;
        this.value = value;
        this.name = name;
    }

    getValue(aceAsEleven = false) {
        if (this.value === 1) {
            return aceAsEleven ? 11 : 1;
        }
        return Math.min(this.value, 10);
    }

    isRed() {
        return this.suit === '♥' || this.suit === '♦';
    }

    toString() {
        return `${this.name}${this.suit}`;
    }
}

// Classe pour le jeu de cartes
class Deck {
    constructor(numDecks = 6) {
        this.cards = [];
        this.createDeck(numDecks);
        this.shuffle();
    }

    createDeck(numDecks) {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = [
            { value: 1, name: 'A' },
            { value: 2, name: '2' },
            { value: 3, name: '3' },
            { value: 4, name: '4' },
            { value: 5, name: '5' },
            { value: 6, name: '6' },
            { value: 7, name: '7' },
            { value: 8, name: '8' },
            { value: 9, name: '9' },
            { value: 10, name: '10' },
            { value: 11, name: 'J' },
            { value: 12, name: 'Q' },
            { value: 13, name: 'K' }
        ];

        for (let deck = 0; deck < numDecks; deck++) {
            for (let suit of suits) {
                for (let cardInfo of values) {
                    this.cards.push(new Card(suit, cardInfo.value, cardInfo.name));
                }
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    dealCard() {
        if (this.cards.length < 20) {
            this.createDeck(6);
            this.shuffle();
        }
        return this.cards.pop();
    }
}

// Classe pour une main
class Hand {
    constructor() {
        this.cards = [];
        this.bet = 0;
        this.isFinished = false;
        this.isSplit = false;
        this.isDoubled = false;
        this.isSurrendered = false;
        this.canDouble = true;
        this.canSplit = false;
    }

    addCard(card) {
        this.cards.push(card);
        this.updateCanDouble();
        this.updateCanSplit();
    }

    getValue() {
        let total = 0;
        let aces = 0;

        for (let card of this.cards) {
            if (card.value === 1) {
                aces++;
                total += 11;
            } else {
                total += card.getValue();
            }
        }

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    isSoft() {
        let total = 0;
        let aces = 0;

        for (let card of this.cards) {
            if (card.value === 1) {
                aces++;
                total += 11;
            } else {
                total += card.getValue();
            }
        }

        return total <= 21 && aces > 0 && total !== this.getValue();
    }

    isBusted() {
        return this.getValue() > 21;
    }

    isBlackjack() {
        // Un Blackjack ne peut pas venir d'une main splitée
        return this.cards.length === 2 && this.getValue() === 21 && !this.isSplit;
    }

    updateCanDouble() {
        this.canDouble = this.cards.length === 2 && !this.isFinished;
    }

    updateCanSplit() {
        if (this.cards.length === 2) {
            const card1 = this.cards[0];
            const card2 = this.cards[1];
            this.canSplit = card1.getValue() === card2.getValue();
        } else {
            this.canSplit = false;
        }
    }
}

// Classe principale du jeu multi-boxes
class BlackjackGame {
    constructor() {
        this.deck = new Deck(6);
        this.dealerHand = new Hand();
        
        // 6 boxes indépendantes
        this.boxes = Array.from({length: 6}, (_, i) => ({
            id: i + 1,
            bet: 0,
            hands: [], // Chaque box peut avoir plusieurs mains (split)
            currentHandIndex: 0,
            isActive: false,
            isFinished: false
        }));
        
        this.gameState = 'betting'; // 'betting', 'playing', 'dealer', 'finished'
        this.currentBoxIndex = 0; // Box actuellement jouée
        this.insuranceBets = Array(6).fill(0);
        
        // Système de probabilités
        this.probabilitiesVisible = false;
        
        // Système d'assurance multi-boxes
        this.currentInsuranceBoxIndex = 0;
        this.eligibleInsuranceBoxes = [];
        this.insuranceDecisions = Array(6).fill(null);
        
        // Sauvegarder les dernières mises pour repeat
        this.lastBets = Array(6).fill(0);
        
        // Système de sauvegarde
        this.credits = 1000;
        this.playerStats = this.getDefaultStats();
        this.saveKey = 'blackjack_french_save';
        this.loadGameData();
        
        this.initializeUI();
        this.updateUI();
        
        // Sauvegarde automatique
        setInterval(() => this.saveGameData(), 30000);
        window.addEventListener('beforeunload', () => this.saveGameData());
    }

    initializeUI() {
        // Gestionnaires pour les boutons de mise de chaque box
        for (let boxNum = 1; boxNum <= 6; boxNum++) {
            // Boutons de mise
            const betButtons = document.querySelectorAll(`[data-box="${boxNum}"][data-amount]`);
            betButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const amount = parseInt(btn.dataset.amount);
                    this.addBetToBox(boxNum, amount);
                });
            });

            // Bouton clear
            const clearBtn = document.querySelector(`[data-box="${boxNum}"].clear-bet`);
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearBoxBet(boxNum));
            }

            // Boutons d'action
            const hitBtn = document.querySelector(`.hit-btn[data-box="${boxNum}"]`);
            const standBtn = document.querySelector(`.stand-btn[data-box="${boxNum}"]`);
            const doubleBtn = document.querySelector(`.double-btn[data-box="${boxNum}"]`);
            const splitBtn = document.querySelector(`.split-btn[data-box="${boxNum}"]`);
            const surrenderBtn = document.querySelector(`.surrender-btn[data-box="${boxNum}"]`);

            if (hitBtn) hitBtn.addEventListener('click', () => this.hit(boxNum));
            if (standBtn) standBtn.addEventListener('click', () => this.stand(boxNum));
            if (doubleBtn) doubleBtn.addEventListener('click', () => this.double(boxNum));
            if (splitBtn) splitBtn.addEventListener('click', () => this.split(boxNum));
            if (surrenderBtn) surrenderBtn.addEventListener('click', () => this.surrender(boxNum));
        }

        // Contrôles généraux
        document.getElementById('deal').addEventListener('click', () => this.deal());
        document.getElementById('repeat-bets').addEventListener('click', () => this.repeatLastBets());
        document.getElementById('clear-all-bets').addEventListener('click', () => this.clearAllBets());
        
        // Boutons de l'en-tête
        document.getElementById('toggle-strategy').addEventListener('click', () => this.toggleStrategy());
        document.getElementById('show-stats').addEventListener('click', () => this.showStats());
        document.getElementById('toggle-probabilities').addEventListener('click', () => this.toggleProbabilities());
        document.getElementById('reset-credits').addEventListener('click', () => this.resetCredits());
        document.getElementById('reset-stats').addEventListener('click', () => this.resetStats());

        // Assurance
        // Événements pour l'assurance
        const takeInsuranceBtn = document.getElementById('take-insurance');
        const declineInsuranceBtn = document.getElementById('decline-insurance');
        if (takeInsuranceBtn) takeInsuranceBtn.addEventListener('click', () => this.takeInsurance());
        if (declineInsuranceBtn) declineInsuranceBtn.addEventListener('click', () => this.declineInsurance());

        // Messages
        document.getElementById('message-close').addEventListener('click', () => this.hideMessage());
        document.getElementById('message-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('message-overlay')) {
                this.hideMessage();
            }
        });
    }

    addBetToBox(boxNum, amount) {
        if (this.gameState !== 'betting') return;
        
        const box = this.boxes[boxNum - 1];
        const newBet = box.bet + amount;
        
        if (newBet <= this.credits) {
            box.bet = newBet;
            this.updateBoxDisplay(boxNum);
            this.updateDealButton();
            this.saveGameData();
        }
    }

    clearBoxBet(boxNum) {
        if (this.gameState !== 'betting') return;
        
        const box = this.boxes[boxNum - 1];
        box.bet = 0;
        this.updateBoxDisplay(boxNum);
        this.updateDealButton();
        this.saveGameData();
    }

    repeatLastBets() {
        if (this.gameState !== 'betting') return;
        
        let totalLastBets = this.lastBets.reduce((sum, bet) => sum + bet, 0);
        if (totalLastBets === 0) {
            this.showMessage("Aucune mise précédente à répéter !");
            return;
        }
        
        if (totalLastBets > this.credits) {
            this.showMessage("Crédits insuffisants pour répéter les mises précédentes !");
            return;
        }
        
        // Appliquer les dernières mises
        for (let i = 0; i < 6; i++) {
            this.boxes[i].bet = this.lastBets[i];
            this.updateBoxDisplay(i + 1);
        }
        
        this.updateDealButton();
        this.saveGameData();
        this.showMessage("Mises précédentes répétées !");
    }

    clearAllBets() {
        if (this.gameState !== 'betting') return;
        
        for (let i = 0; i < 6; i++) {
            this.boxes[i].bet = 0;
            this.updateBoxDisplay(i + 1);
        }
        
        this.updateDealButton();
        this.saveGameData();
    }

    getTotalBets() {
        return this.boxes.reduce((total, box) => total + box.bet, 0);
    }

    updateBoxDisplay(boxNum) {
        const box = this.boxes[boxNum - 1];
        const boxElement = document.getElementById(`box-${boxNum}`);
        const betElement = document.getElementById(`box-bet-${boxNum}`);
        const valueElement = document.getElementById(`box-value-${boxNum}`);
        const cardsContainer = document.getElementById(`box-cards-${boxNum}`);
        
        // Mise
        betElement.textContent = box.bet;
        
        // Style de la box
        if (box.bet > 0) {
            boxElement.classList.add('has-bet');
        } else {
            boxElement.classList.remove('has-bet');
        }
        
        // Réafficher toutes les cartes pour gérer les splits
        cardsContainer.innerHTML = '';
        
        // Valeur des cartes et affichage
        if (box.hands.length > 0 && box.hands[0]) {
            
            if (box.hands.length > 1) {
                // Affichage pour les mains splittées
                box.hands.forEach((hand, handIndex) => {
                    const handContainer = document.createElement('div');
                    handContainer.className = `hand-container ${handIndex === box.currentHandIndex ? 'active-hand' : ''}`;
                    
                    const handLabel = document.createElement('div');
                    handLabel.className = 'hand-label';
                    handLabel.textContent = `Main ${handIndex + 1}`;
                    handContainer.appendChild(handLabel);
                    
                    const handCards = document.createElement('div');
                    handCards.className = 'hand-cards';
                    hand.cards.forEach(card => {
                        const cardElement = this.createCardElement(card, false);
                        handCards.appendChild(cardElement);
                    });
                    handContainer.appendChild(handCards);
                    
                    const handValue = document.createElement('div');
                    handValue.className = 'hand-value';
                    let valueText = hand.getValue().toString();
                    if (hand.isBlackjack()) valueText += ' (BJ)';
                    else if (hand.isBusted()) valueText += ' (Crevé)';
                    else if (hand.isSoft()) valueText += ' (Souple)';
                    if (hand.isFinished) valueText += ' ✓';
                    handValue.textContent = valueText;
                    handContainer.appendChild(handValue);
                    
                    cardsContainer.appendChild(handContainer);
                });
                
                // Affichage global de la box splittée
                const currentHand = box.hands[box.currentHandIndex];
                let valueText = `Main ${box.currentHandIndex + 1}: ${currentHand.getValue()}`;
                if (currentHand.isBlackjack()) valueText += ' (BJ)';
                else if (currentHand.isBusted()) valueText += ' (Crevé)';
                else if (currentHand.isSoft()) valueText += ' (Souple)';
                
                valueElement.textContent = valueText;
            } else {
                // Affichage normal pour une main simple
                const hand = box.hands[0];
                hand.cards.forEach(card => {
                    const cardElement = this.createCardElement(card, false);
                    cardsContainer.appendChild(cardElement);
                });
                
                let valueText = hand.getValue().toString();
                if (hand.isBlackjack()) valueText += ' (BJ)';
                else if (hand.isBusted()) valueText += ' (Crevé)';
                else if (hand.isSoft()) valueText += ' (Souple)';
                
                valueElement.textContent = valueText;
            }
        } else {
            valueElement.textContent = '-';
        }
        
        // Mettre à jour les probabilités si elles sont visibles
        if (this.probabilitiesVisible && box.hands.length > 0 && this.dealerHand.cards.length > 0) {
            this.updateProbabilities(boxNum);
        }
    }

    updateDealButton() {
        const dealBtn = document.getElementById('deal');
        const totalBets = this.getTotalBets();
        
        dealBtn.disabled = totalBets === 0 || totalBets > this.credits || this.gameState !== 'betting';
    }

    deal() {
        if (this.gameState !== 'betting') return;
        
        const totalBets = this.getTotalBets();
        if (totalBets === 0 || totalBets > this.credits) return;

        // Sauvegarder les mises pour repeat
        for (let i = 0; i < 6; i++) {
            this.lastBets[i] = this.boxes[i].bet;
        }

        // Déduire les crédits
        this.credits -= totalBets;
        
        // Réinitialiser les variables d'assurance
        this.insuranceBets = Array(6).fill(0);
        this.currentInsuranceBoxIndex = 0;
        this.eligibleInsuranceBoxes = [];
        this.insuranceDecisions = Array(6).fill(null);
        
        // Préparer les boxes actives
        this.boxes.forEach((box, index) => {
            if (box.bet > 0) {
                box.isActive = true;
                box.hands = [new Hand()];
                box.hands[0].bet = box.bet;
                box.currentHandIndex = 0;
                box.isFinished = false;
                
                // Vider les cartes
                document.getElementById(`box-cards-${index + 1}`).innerHTML = '';
            } else {
                box.isActive = false;
            }
        });

        // Préparer le croupier
        this.dealerHand = new Hand();
        document.getElementById('dealer-cards').innerHTML = '';
        
        this.gameState = 'playing';
        this.currentBoxIndex = 0;
        
        // Distribution ENHC (European No Hole Card)
        this.distributionSequence();
    }

    distributionSequence() {
        // Distribution ENHC: 1 carte par box active, puis croupier, puis 2e carte par box
        const activeBoxes = this.boxes.filter(box => box.isActive);
        let distributionOrder = [];
        
        // Première carte pour chaque box active
        activeBoxes.forEach((box, index) => {
            distributionOrder.push({ type: 'player', boxIndex: this.boxes.indexOf(box) });
        });
        
        // Une carte pour le croupier
        distributionOrder.push({ type: 'dealer' });
        
        // Deuxième carte pour chaque box active
        activeBoxes.forEach((box, index) => {
            distributionOrder.push({ type: 'player', boxIndex: this.boxes.indexOf(box) });
        });
        
        this.executeDistribution(distributionOrder, 0);
    }

    executeDistribution(sequence, index) {
        if (index >= sequence.length) {
            // Distribution terminée
            setTimeout(() => {
                this.checkInitialConditions();
                this.findFirstActiveBox();
                
                // Activer automatiquement les probabilités si elles ne sont pas déjà visibles
                if (!this.probabilitiesVisible) {
                    this.toggleProbabilities();
                }
                
                this.updateUI();
            }, 500);
            return;
        }

        setTimeout(() => {
            const action = sequence[index];
            if (action.type === 'player') {
                this.dealCardToBox(action.boxIndex + 1);
            } else if (action.type === 'dealer') {
                this.dealCardToDealer();
            }
            
            this.executeDistribution(sequence, index + 1);
        }, 600);
    }

    dealCardToBox(boxNum) {
        const box = this.boxes[boxNum - 1];
        if (!box.isActive || !box.hands[box.currentHandIndex]) return;
        
        const card = this.deck.dealCard();
        const hand = box.hands[box.currentHandIndex];
        hand.addCard(card);
        
        // Afficher la carte
        const cardsContainer = document.getElementById(`box-cards-${boxNum}`);
        const cardElement = this.createCardElement(card, true);
        cardsContainer.appendChild(cardElement);
        
        this.updateBoxDisplay(boxNum);
        
        // Mettre à jour les probabilités si elles sont visibles
        if (this.probabilitiesVisible) {
            this.updateProbabilities(boxNum);
        }
    }

    dealCardToDealer() {
        const card = this.deck.dealCard();
        this.dealerHand.addCard(card);
        
        const dealerCards = document.getElementById('dealer-cards');
        const cardElement = this.createCardElement(card, true);
        dealerCards.appendChild(cardElement);
        
        this.updateDealerDisplay();
    }

    createCardElement(card, isNew = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.isRed() ? 'red' : ''}`;
        
        if (isNew) {
            cardDiv.classList.add('dealing');
            setTimeout(() => cardDiv.classList.remove('dealing'), 800);
        }
        
        const valueSpan = document.createElement('div');
        valueSpan.className = 'card-value';
        valueSpan.textContent = card.name;
        
        const suitSpan = document.createElement('div');
        suitSpan.className = 'card-suit';
        suitSpan.textContent = card.suit;
        
        cardDiv.appendChild(valueSpan);
        cardDiv.appendChild(suitSpan);
        
        return cardDiv;
    }

    checkInitialConditions() {
        // Offrir l'assurance si le croupier a un As
        if (this.dealerHand.cards[0].value === 1) {
            this.showInsuranceOffer();
            return; // Attendre la décision d'assurance avant de traiter les BJ
        }
        
        // Si pas d'As, vérifier directement les blackjacks
        this.checkInitialBlackjacks();
    }

    findFirstActiveBox() {
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (box.isActive && !box.isFinished) {
                // Chercher une main active dans cette box
                for (let handIndex = 0; handIndex < box.hands.length; handIndex++) {
                    const hand = box.hands[handIndex];
                    if (!hand.isFinished && !hand.isBlackjack()) {
                        // Main active trouvée
                        this.currentBoxIndex = i;
                        box.currentHandIndex = handIndex;
                        this.updateActiveBox();
                        return;
                    }
                }
            }
        }
        // Toutes les boxes sont finies, passer au croupier
        this.playDealer();
    }

    updateActiveBox() {
        // Retirer la classe active de toutes les boxes
        this.boxes.forEach((box, index) => {
            const boxElement = document.getElementById(`box-${index + 1}`);
            boxElement.classList.remove('active');
            
            const controls = document.getElementById(`box-controls-${index + 1}`);
            controls.style.display = 'none';
        });

        // Activer la box courante
        if (this.currentBoxIndex < this.boxes.length && this.boxes[this.currentBoxIndex].isActive) {
            const boxElement = document.getElementById(`box-${this.currentBoxIndex + 1}`);
            boxElement.classList.add('active');
            
            // Mettre à jour l'affichage et les contrôles
            this.updateBoxDisplay(this.currentBoxIndex + 1);
            this.updateActionButtons(this.currentBoxIndex + 1);
        }
    }

    updateBoxControls(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        
        const hitBtn = document.querySelector(`.hit-btn[data-box="${boxNum}"]`);
        const standBtn = document.querySelector(`.stand-btn[data-box="${boxNum}"]`);
        const doubleBtn = document.querySelector(`.double-btn[data-box="${boxNum}"]`);
        const splitBtn = document.querySelector(`.split-btn[data-box="${boxNum}"]`);
        const surrenderBtn = document.querySelector(`.surrender-btn[data-box="${boxNum}"]`);

        if (hand && !hand.isFinished) {
            hitBtn.disabled = false;
            standBtn.disabled = false;
            doubleBtn.disabled = !hand.canDouble || this.credits < hand.bet;
            splitBtn.disabled = !hand.canSplit || box.hands.length >= 3 || this.credits < hand.bet;
            
            // Abandon possible sauf contre As et première main seulement
            const dealerCard = this.dealerHand.cards[0];
            surrenderBtn.disabled = dealerCard.getValue() === 1 || hand.cards.length !== 2 || box.hands.length > 1;
        } else {
            [hitBtn, standBtn, doubleBtn, splitBtn, surrenderBtn].forEach(btn => {
                if (btn) btn.disabled = true;
            });
        }
    }

    hit(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        
        if (!hand || hand.isFinished) return;
        
        this.dealCardToBox(boxNum);
        
        setTimeout(() => {
            if (hand.isBusted()) {
                this.finishCurrentHand(boxNum);
            } else {
                hand.canDouble = false;
                this.updateBoxControls(boxNum);
            }
        }, 700);
    }

    stand(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        hand.isFinished = true;
        this.nextHand(boxNum);
    }

    double(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        
        if (!hand || !hand.canDouble || this.credits < hand.bet) return;
        
        this.credits -= hand.bet;
        hand.bet *= 2;
        hand.isDoubled = true;
        
        // Mettre à jour l'affichage immédiatement
        this.updateUI();
        
        this.dealCardToBox(boxNum);
        
        setTimeout(() => {
            this.finishCurrentHand(boxNum);
        }, 1000);
    }

    split(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        
        if (!hand || !hand.canSplit || box.hands.length >= 3 || this.credits < hand.bet) return;
        
        this.credits -= hand.bet;
        
        // Mettre à jour l'affichage immédiatement
        this.updateUI();
        
        // Créer nouvelle main
        const newHand = new Hand();
        newHand.bet = hand.bet;
        newHand.isSplit = true;
        
        // Déplacer une carte vers la nouvelle main
        const cardToMove = hand.cards.pop();
        newHand.addCard(cardToMove);
        hand.isSplit = true;
        
        // Ajouter la nouvelle main après la main actuelle
        box.hands.splice(box.currentHandIndex + 1, 0, newHand);
        
        // Distribuer une carte à chaque main
        setTimeout(() => {
            // Carte pour la première main (main actuelle)
            this.dealCardToBox(boxNum);
            setTimeout(() => {
                // Passer à la deuxième main et lui donner une carte
                const currentIndex = box.currentHandIndex;
                box.currentHandIndex++;
                this.dealCardToBox(boxNum);
                // Revenir à la main actuelle pour continuer à jouer
                box.currentHandIndex = currentIndex;
                
                // Si As split, finir automatiquement les deux mains
                if (hand.cards[0].value === 1) {
                    // As splité = une carte seulement, marquer comme fini
                    hand.isFinished = true;
                    newHand.isFinished = true;
                    
                    // Passer à la main suivante ou box suivante
                    this.nextHand(boxNum);
                } else {
                    // Mettre à jour l'affichage et les boutons pour la première main
                    this.updateBoxDisplay(boxNum);
                    this.updateActionButtons(boxNum);
                    
                    // S'assurer que les probabilités sont mises à jour
                    if (this.probabilitiesVisible) {
                        this.updateProbabilities(boxNum);
                    }
                }
            }, 800);
        }, 800);
        
        this.updateUI();
    }

    updateActionButtons(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        const controls = document.getElementById(`box-controls-${boxNum}`);
        
        if (!box.isActive || !hand || hand.isFinished) {
            controls.style.display = 'none';
            return;
        }
        
        // Si la main est un blackjack NATUREL (pas splitée), ne pas afficher les contrôles
        if (hand.isBlackjack()) {
            // Vérifier si le croupier a un As pour l'assurance
            const dealerHasAce = this.dealerHand.cards.length > 0 && this.dealerHand.cards[0].value === 1;
            if (!dealerHasAce) {
                controls.style.display = 'none';
                return;
            }
            // Si le croupier a un As, on laisse le joueur attendre l'offre d'assurance
            controls.style.display = 'none';
            return;
        }
        
        // Afficher les contrôles seulement pour la box en cours de jeu
        if (this.currentBoxIndex === boxNum - 1 && this.gameState === 'playing') {
            controls.style.display = 'flex';
            
            // Activer/désactiver les boutons selon les règles
            const hitBtn = controls.querySelector('.hit-btn');
            const standBtn = controls.querySelector('.stand-btn');
            const doubleBtn = controls.querySelector('.double-btn');
            const splitBtn = controls.querySelector('.split-btn');
            const surrenderBtn = controls.querySelector('.surrender-btn');
            
            if (hitBtn) hitBtn.disabled = false;
            if (standBtn) standBtn.disabled = false;
            if (doubleBtn) doubleBtn.disabled = !hand.canDouble || this.credits < hand.bet;
            if (splitBtn) splitBtn.disabled = !hand.canSplit || this.credits < hand.bet || box.hands.length >= 3;
            if (surrenderBtn) {
                const dealerCard = this.dealerHand.cards[0];
                surrenderBtn.disabled = hand.cards.length !== 2 || dealerCard.getValue() === 1;
            }
        } else {
            controls.style.display = 'none';
        }
    }

    surrender(boxNum) {
        const box = this.boxes[boxNum - 1];
        const hand = box.hands[box.currentHandIndex];
        
        const dealerCard = this.dealerHand.cards[0];
        if (dealerCard.getValue() === 1 || hand.cards.length !== 2) return;
        
        this.credits += Math.floor(hand.bet / 2);
        hand.isSurrendered = true;
        hand.isFinished = true;
        
        // Mettre à jour l'affichage immédiatement
        this.updateUI();
        
        this.nextHand(boxNum);
    }

    finishCurrentHand(boxNum) {
        const box = this.boxes[boxNum - 1];
        box.hands[box.currentHandIndex].isFinished = true;
        this.nextHand(boxNum);
    }

    nextHand(boxNum) {
        const box = this.boxes[boxNum - 1];
        
        // S'assurer que la main actuelle est marquée comme finie
        if (box.currentHandIndex < box.hands.length) {
            box.hands[box.currentHandIndex].isFinished = true;
        }
        
        // Chercher la prochaine main non-finie dans cette box
        for (let i = box.currentHandIndex + 1; i < box.hands.length; i++) {
            const nextHand = box.hands[i];
            if (!nextHand.isFinished) {
                // Main trouvée, basculer sur cette main
                box.currentHandIndex = i;
                this.updateBoxDisplay(boxNum);
                this.updateActionButtons(boxNum);
                
                // Mettre à jour les probabilités si visibles
                if (this.probabilitiesVisible) {
                    this.updateProbabilities(boxNum);
                }
                return;
            }
        }
        
        // Toutes les mains de cette box sont finies
        box.isFinished = true;
        this.updateBoxDisplay(boxNum);
        document.getElementById(`box-controls-${boxNum}`).style.display = 'none';
        
        // Retirer l'indicateur actif de cette box
        document.getElementById(`box-${boxNum}`).classList.remove('active');
        
        // Chercher la prochaine box active
        this.findFirstActiveBox();
    }

    playDealer() {
        this.gameState = 'dealer';
        
        // Cacher tous les contrôles des boxes
        this.boxes.forEach((_, index) => {
            document.getElementById(`box-controls-${index + 1}`).style.display = 'none';
            document.getElementById(`box-${index + 1}`).classList.remove('active');
        });
        
        // Le croupier tire jusqu'à 17
        this.dealerDrawCards();
    }

    dealerDrawCards() {
        const drawCard = () => {
            if (this.dealerHand.getValue() < 17) {
                setTimeout(() => {
                    this.dealCardToDealer();
                    drawCard();
                }, 1000);
            } else {
                setTimeout(() => {
                    this.determineWinners();
                }, 1000);
            }
        };
        
        drawCard();
    }

    // Animation pour les blackjacks
    animateBlackjackBox(boxNum) {
        const boxElement = document.getElementById(`box-${boxNum}`);
        boxElement.classList.add('blackjack-animation');
        
        setTimeout(() => {
            boxElement.classList.remove('blackjack-animation');
        }, 2000);
    }

    // Afficher le résultat sur une box spécifique
    showBoxResult(boxNum, handIndex, result, amount, type) {
        const boxElement = document.getElementById(`box-${boxNum}`);
        
        // Créer l'élément de résultat s'il n'existe pas
        let resultElement = boxElement.querySelector('.box-result');
        if (!resultElement) {
            resultElement = document.createElement('div');
            resultElement.className = 'box-result';
            boxElement.appendChild(resultElement);
        }

        // Définir le contenu selon le type de résultat
        let icon, color, text;
        switch (type) {
            case 'win':
                icon = '🎉';
                color = '#4CAF50';
                text = `+${amount}`;
                break;
            case 'loss':
                icon = '💸';
                color = '#f44336';
                text = `-${amount}`;
                break;
            case 'push':
                icon = '🤝';
                color = '#ffd700';
                text = '±0';
                break;
            case 'blackjack':
                icon = '🃏';
                color = '#FFD700';
                text = `BJ +${amount}`;
                break;
            case 'surrender':
                icon = '🏳️';
                color = '#ff9800';
                text = `-${amount}`;
                break;
            default:
                icon = '';
                color = '#fff';
                text = result;
        }

        resultElement.innerHTML = `
            <div class="result-icon">${icon}</div>
            <div class="result-text" style="color: ${color}">${text}</div>
        `;
        
        resultElement.classList.add('show');
        
        // Marquer l'élément comme permanent pour qu'il reste affiché
        resultElement.setAttribute('data-permanent', 'true');
    }

    determineWinners() {
        const dealerValue = this.dealerHand.getValue();
        const dealerBusted = this.dealerHand.isBusted();
        let resultMessages = [];
        let totalWinnings = 0;
        let totalLosses = 0;

        // Traiter les résultats avec délai progressif pour l'animation
        let boxDelay = 0;
        this.boxes.forEach((box, boxIndex) => {
            if (!box.isActive) return;
            
            box.hands.forEach((hand, handIndex) => {
                const boxNum = boxIndex + 1;
                const handNum = box.hands.length > 1 ? ` (Main ${handIndex + 1})` : '';
                
                setTimeout(() => {
                    if (hand.isSurrendered) {
                        const lossAmount = Math.floor(hand.bet / 2);
                        totalLosses += lossAmount;
                        resultMessages.push(`Box ${boxNum}${handNum}: Abandon (-${lossAmount})`);
                        this.showBoxResult(boxNum, handIndex, 'Abandon', lossAmount, 'surrender');
                    } else if (hand.isBusted()) {
                        totalLosses += hand.bet;
                        resultMessages.push(`Box ${boxNum}${handNum}: Crevé (-${hand.bet})`);
                        this.showBoxResult(boxNum, handIndex, 'Crevé', hand.bet, 'loss');
                    } else if (dealerBusted) {
                        const winAmount = hand.isBlackjack() ? Math.floor(hand.bet * 1.5) : hand.bet;
                        this.credits += hand.bet + winAmount;
                        totalWinnings += winAmount;
                        resultMessages.push(`Box ${boxNum}${handNum}: Victoire (+${winAmount})`);
                        const resultType = hand.isBlackjack() ? 'blackjack' : 'win';
                        this.showBoxResult(boxNum, handIndex, 'Victoire', winAmount, resultType);
                    } else if (hand.getValue() > dealerValue) {
                        const winAmount = hand.isBlackjack() ? Math.floor(hand.bet * 1.5) : hand.bet;
                        this.credits += hand.bet + winAmount;
                        totalWinnings += winAmount;
                        resultMessages.push(`Box ${boxNum}${handNum}: Victoire (+${winAmount})`);
                        const resultType = hand.isBlackjack() ? 'blackjack' : 'win';
                        this.showBoxResult(boxNum, handIndex, 'Victoire', winAmount, resultType);
                    } else if (hand.getValue() === dealerValue) {
                        this.credits += hand.bet;
                        resultMessages.push(`Box ${boxNum}${handNum}: Égalité (±0)`);
                        this.showBoxResult(boxNum, handIndex, 'Égalité', 0, 'push');
                    } else {
                        totalLosses += hand.bet;
                        resultMessages.push(`Box ${boxNum}${handNum}: Défaite (-${hand.bet})`);
                        this.showBoxResult(boxNum, handIndex, 'Défaite', hand.bet, 'loss');
                    }
                    
                    // Mettre à jour l'affichage des crédits après chaque résultat
                    this.updateUI();
                    
                    // Mettre à jour les statistiques
                    this.updateStatistics(hand, dealerValue, dealerBusted);
                }, boxDelay);
                
                boxDelay += 300; // 300ms entre chaque box
            });
        });

        // Afficher le résumé global après tous les résultats individuels
        setTimeout(() => {
            this.showGameResults(dealerValue, dealerBusted, resultMessages, totalWinnings, totalLosses);
            this.showNewRoundButton();
        }, boxDelay + 1000);
    }

    showNewRoundButton() {
        this.gameState = 'finished';
        
        // Créer ou montrer le bouton nouvelle manche
        let newRoundBtn = document.getElementById('new-round-btn');
        if (!newRoundBtn) {
            newRoundBtn = document.createElement('button');
            newRoundBtn.id = 'new-round-btn';
            newRoundBtn.className = 'new-round-button';
            newRoundBtn.textContent = '🔄 Nouvelle Manche';
            newRoundBtn.onclick = () => this.startNewRound();
            
            // Insérer le bouton après les contrôles de mise
            const mainControls = document.querySelector('.main-controls');
            mainControls.insertAdjacentElement('afterend', newRoundBtn);
        }
        
        newRoundBtn.style.display = 'block';
        
        // Cacher les contrôles de mise pendant qu'on affiche les résultats
        document.querySelector('.main-controls').style.display = 'none';
    }

    startNewRound() {
        // Cacher le bouton nouvelle manche
        const newRoundBtn = document.getElementById('new-round-btn');
        if (newRoundBtn) {
            newRoundBtn.style.display = 'none';
        }
        
        // Réafficher les contrôles de mise
        document.querySelector('.main-controls').style.display = 'flex';
        
        // Réinitialiser pour une nouvelle partie
        this.resetForNewGame();
    }

    resetForNewGame() {
        this.gameState = 'betting';
        
        // Réinitialiser les boxes
        this.boxes.forEach((box, index) => {
            box.bet = 0;
            box.hands = [];
            box.currentHandIndex = 0;
            box.isActive = false;
            box.isFinished = false;
            
            // Supprimer seulement les résultats permanents
            const boxElement = document.getElementById(`box-${index + 1}`);
            const resultElements = boxElement.querySelectorAll('.box-result[data-permanent="true"]');
            resultElements.forEach(el => el.remove());
            
            this.updateBoxDisplay(index + 1);
            boxElement.classList.remove('active', 'has-bet', 'blackjack-animation');
            document.getElementById(`box-controls-${index + 1}`).style.display = 'none';
        });
        
        // Réinitialiser le croupier
        this.dealerHand = new Hand();
        document.getElementById('dealer-cards').innerHTML = '';
        
        this.updateDealButton();
        this.updateDealerDisplay();
        this.saveGameData();
    }

    updateDealerDisplay() {
        const dealerValue = document.getElementById('dealer-value');
        
        if (this.gameState === 'dealer' || this.gameState === 'finished') {
            let value = this.dealerHand.getValue();
            if (this.dealerHand.isBusted()) {
                value += ' (Crevé)';
            } else if (this.dealerHand.isBlackjack()) {
                value += ' (BJ)';
            }
            dealerValue.textContent = value;
        } else if (this.dealerHand.cards.length > 0) {
            dealerValue.textContent = this.dealerHand.cards[0].getValue();
        } else {
            dealerValue.textContent = '-';
        }
    }

    updateUI() {
        document.getElementById('credits').textContent = this.credits;
        
        // Mettre à jour toutes les boxes
        this.boxes.forEach((box, index) => {
            this.updateBoxDisplay(index + 1);
        });
        
        this.updateDealerDisplay();
        this.updateDealButton();
        this.saveGameData(); // Sauvegarder après chaque mise à jour
    }

    // Nouvelle méthode pour mettre à jour les statistiques
    updateStatistics(hand, dealerValue, dealerBusted) {
        this.playerStats.handsPlayed++;
        
        if (hand.isSurrendered) {
            this.playerStats.surrenders++;
            return;
        }
        
        if (hand.isBusted()) {
            this.playerStats.losses++;
            this.playerStats.busts++;
            return;
        }
        
        if (dealerBusted) {
            this.playerStats.wins++;
            if (hand.isBlackjack()) {
                this.playerStats.blackjacks++;
            }
            return;
        }
        
        const playerValue = hand.getValue();
        
        if (playerValue > dealerValue) {
            this.playerStats.wins++;
            if (hand.isBlackjack()) {
                this.playerStats.blackjacks++;
            }
        } else if (playerValue === dealerValue) {
            this.playerStats.pushes++;
        } else {
            this.playerStats.losses++;
        }
        
        // Mettre à jour les gains/pertes
        if (hand.isBlackjack() && (dealerBusted || playerValue > dealerValue)) {
            const winnings = Math.floor(hand.bet * 1.5);
            this.playerStats.totalWinnings += winnings;
        } else if (playerValue > dealerValue || dealerBusted) {
            this.playerStats.totalWinnings += hand.bet;
        } else if (playerValue < dealerValue && !dealerBusted) {
            this.playerStats.totalWinnings -= hand.bet;
        }
    }

    // Méthodes reprises de l'ancien code pour compatibilité
    getDefaultStats() {
        return {
            gamesPlayed: 0,
            wins: 0, // Nouvelle propriété
            losses: 0, // Nouvelle propriété  
            pushes: 0, // Nouvelle propriété
            blackjacks: 0,
            busts: 0, // Nouvelle propriété
            totalWinnings: 0,
            totalLosses: 0,
            biggestWin: 0,
            biggestLoss: 0,
            handsPlayed: 0,
            handsSplit: 0,
            handsDoubled: 0,
            surrenders: 0,
            insurancesTaken: 0,
            lastPlayed: Date.now()
        };
    }

    loadGameData() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                this.credits = data.credits || 1000;
                this.playerStats = data.playerStats || this.getDefaultStats();
            } else {
                this.credits = 1000;
                this.playerStats = this.getDefaultStats();
            }
        } catch (error) {
            console.error('Erreur de chargement:', error);
            this.credits = 1000;
            this.playerStats = this.getDefaultStats();
        }
    }

    saveGameData() {
        try {
            const dataToSave = {
                credits: this.credits,
                playerStats: this.playerStats,
                lastSaved: Date.now()
            };
            localStorage.setItem(this.saveKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
        }
    }

    showMessage(text) {
        const messageOverlay = document.getElementById('message-overlay');
        const messageContent = document.getElementById('message-content');
        const messageButtons = document.getElementById('message-buttons');
        
        messageContent.textContent = text;
        messageButtons.innerHTML = '';
        messageOverlay.classList.add('visible');
    }

    hideMessage() {
        const messageOverlay = document.getElementById('message-overlay');
        messageOverlay.classList.remove('visible');
    }

    showGameResults(dealerValue, dealerBusted, resultMessages, totalWinnings, totalLosses) {
        this.showSubtleResults(dealerValue, dealerBusted, resultMessages, totalWinnings, totalLosses);
    }

    // Système de probabilités
    toggleProbabilities() {
        this.probabilitiesVisible = !this.probabilitiesVisible;
        const button = document.getElementById('toggle-probabilities');
        
        if (this.probabilitiesVisible) {
            button.classList.add('active');
            this.showAllProbabilities();
        } else {
            button.classList.remove('active');
            this.hideAllProbabilities();
        }
    }

    showAllProbabilities() {
        for (let i = 1; i <= 6; i++) {
            const box = this.boxes[i - 1];
            if (box.isActive && box.hands.length > 0) {
                this.updateProbabilities(i);
                document.getElementById(`box-probabilities-${i}`).style.display = 'block';
            }
        }
    }

    hideAllProbabilities() {
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`box-probabilities-${i}`).style.display = 'none';
        }
    }

    updateProbabilities(boxNum) {
        const box = this.boxes[boxNum - 1];
        if (!box.isActive || box.hands.length === 0) return;

        const hand = box.hands[box.currentHandIndex] || box.hands[0];
        const dealerUpCard = this.dealerHand.cards.length > 0 ? this.dealerHand.cards[0] : null;

        if (!dealerUpCard) return;

        const probabilities = this.calculateAdvancedProbabilities(hand, dealerUpCard);
        
        document.getElementById(`prob-bust-${boxNum}`).textContent = `${probabilities.bust}%`;
        document.getElementById(`prob-win-${boxNum}`).textContent = `${probabilities.win}%`;
        document.getElementById(`prob-push-${boxNum}`).textContent = `${probabilities.push}%`;
        document.getElementById(`prob-action-${boxNum}`).textContent = probabilities.recommendation;
    }

    calculateAdvancedProbabilities(hand, dealerUpCard) {
        const playerValue = hand.getValue();
        const dealerUpValue = dealerUpCard.getValue();
        
        // Si blackjack, calculer les vraies probabilités
        if (hand.isBlackjack()) {
            // Probabilité que le croupier fasse 21 selon sa carte visible
            let dealerMake21Prob = 0;
            
            if (dealerUpValue === 11) { // As visible
                // Le croupier peut faire BJ si sa carte cachée est 10,J,Q,K
                dealerMake21Prob = 30.8; // 4 cartes sur 13 ≈ 30.8%
            } else if (dealerUpValue === 10) { // 10,J,Q,K visible
                // Le croupier peut faire BJ si sa carte cachée est As
                dealerMake21Prob = 7.7; // 1 carte sur 13 ≈ 7.7%
            } else {
                // Pour les autres cartes (2-9), probabilité de faire 21
                switch(dealerUpValue) {
                    case 2: dealerMake21Prob = 7.4; break;
                    case 3: dealerMake21Prob = 7.2; break;
                    case 4: dealerMake21Prob = 6.8; break;
                    case 5: dealerMake21Prob = 6.2; break;
                    case 6: dealerMake21Prob = 5.8; break;
                    case 7: dealerMake21Prob = 8.1; break;
                    case 8: dealerMake21Prob = 7.8; break;
                    case 9: dealerMake21Prob = 7.5; break;
                    default: dealerMake21Prob = 7.0; break;
                }
            }

            return {
                bust: 0,
                win: Math.round(100 - dealerMake21Prob),
                push: Math.round(dealerMake21Prob),
                recommendation: "BJ!"
            };
        }
        
        // Simulation simple basée sur les cartes restantes
        const remainingCards = this.getRemainingCards();
        let bustCount = 0;
        let winCount = 0;
        let pushCount = 0;
        let totalSimulations = 0;

        // Calculer probabilité de bust du joueur
        for (let card of remainingCards) {
            const testHand = new Hand();
            hand.cards.forEach(c => testHand.addCard(c));
            testHand.addCard(card);
            
            if (testHand.isBusted()) {
                bustCount++;
            }
            totalSimulations++;
        }

        // Probabilités du croupier selon sa carte visible
        const dealerBustProb = this.calculateDealerBustProbability(dealerUpValue);
        const dealerStandProb = 100 - dealerBustProb;
        
        // Calcul approximatif des probabilités de victoire et égalité
        let playerWinProb = 0;
        let playerPushProb = 0;

        if (playerValue <= 21) {
            if (playerValue === 21) {
                playerWinProb = Math.max(70, dealerBustProb + 20);
                playerPushProb = Math.min(15, dealerStandProb * 0.1);
            } else if (playerValue >= 19) {
                playerWinProb = dealerBustProb + (21 - playerValue) * 8;
                playerPushProb = Math.max(5, (21 - playerValue) * 2);
            } else if (playerValue >= 17) {
                playerWinProb = dealerBustProb + (21 - playerValue) * 4;
                playerPushProb = Math.max(8, (21 - playerValue) * 3);
            } else {
                playerWinProb = Math.max(15, dealerBustProb - (17 - playerValue) * 2);
                playerPushProb = Math.max(3, (21 - playerValue));
            }
        }

        // Recommandation stratégique de base
        const recommendation = this.getBasicStrategyRecommendation(hand, dealerUpCard);

        return {
            bust: totalSimulations > 0 ? Math.round((bustCount / totalSimulations) * 100) : 0,
            win: Math.min(95, Math.max(5, Math.round(playerWinProb))),
            push: Math.min(25, Math.max(2, Math.round(playerPushProb))),
            recommendation: recommendation
        };
    }

    getBasicStrategyRecommendation(hand, dealerUpCard) {
        const playerValue = hand.getValue();
        const dealerValue = dealerUpCard.getValue();
        
        // Paires - Selon le tableau exact
        if (hand.canSplit) {
            const cardValue = hand.cards[0].getValue();
            
            if (cardValue === 1) return "SPLIT"; // A,A toujours split
            if (cardValue === 10) return "STAND"; // 10,10 jamais split
            
            if (cardValue === 9) {
                if (dealerValue === 7 || dealerValue === 10 || dealerValue === 1) return "STAND";
                return "SPLIT";
            }
            
            if (cardValue === 8) return "SPLIT"; // 8,8 toujours split
            
            if (cardValue === 7) {
                if (dealerValue <= 7) return "SPLIT";
                return "HIT";
            }
            
            if (cardValue === 6) {
                if (dealerValue <= 6) return "SPLIT";
                return "HIT";
            }
            
            if (cardValue === 5) {
                if (dealerValue <= 9) return "DOUBLE";
                return "HIT";
            }
            
            if (cardValue === 4) {
                if (dealerValue === 5 || dealerValue === 6) return "SPLIT";
                return "HIT";
            }
            
            if (cardValue === 2 || cardValue === 3) {
                if (dealerValue <= 7) return "SPLIT";
                return "HIT";
            }
        }
        
        // Mains souples (avec As = 11)
        if (hand.isSoft()) {
            if (playerValue >= 19) return "STAND"; // A,8+
            
            if (playerValue === 18) { // A,7
                if (dealerValue === 2) return "STAND";
                if (dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
                if (dealerValue === 7 || dealerValue === 8) return "STAND";
                return "HIT"; // vs 9, 10, A
            }
            
            if (playerValue === 17) { // A,6
                if (dealerValue >= 2 && dealerValue <= 6) return "DOUBLE";
                return "HIT";
            }
            
            if (playerValue === 15 || playerValue === 16) { // A,4 / A,5
                if (dealerValue >= 4 && dealerValue <= 6) return "DOUBLE";
                return "HIT";
            }
            
            if (playerValue === 13 || playerValue === 14) { // A,2 / A,3
                if (dealerValue >= 4 && dealerValue <= 6) return "DOUBLE";
                return "HIT";
            }
            
            return "HIT";
        }
        
        // Mains dures (sans As = 11)
        if (playerValue >= 17) return "STAND";
        
        if (playerValue === 16) {
            if (dealerValue <= 6) return "STAND";
            if (dealerValue >= 7 && dealerValue <= 10) return "ABANDON"; // Abandon vs 7,8,9,10
            return "HIT"; // vs As (pas d'abandon autorisé)
        }
        
        if (playerValue === 15) {
            if (dealerValue <= 6) return "STAND";
            if (dealerValue >= 7 && dealerValue <= 10) return "ABANDON"; // Abandon vs 7,8,9,10
            return "HIT"; // vs As (pas d'abandon autorisé)
        }
        
        if (playerValue === 13 || playerValue === 14) {
            if (dealerValue <= 6) return "STAND";
            if (dealerValue >= 9 && dealerValue <= 10) return "ABANDON"; // Abandon vs 9,10 pour 14
            return "HIT";
        }
        
        if (playerValue === 12) {
            if (dealerValue >= 4 && dealerValue <= 6) return "STAND";
            if (dealerValue === 10) return "ABANDON"; // Abandon vs 10 pour 12
            return "HIT";
        }
        
        if (playerValue === 11) {
            if (dealerValue === 1) return "HIT"; // vs As
            return "DOUBLE";
        }
        
        if (playerValue === 10) {
            if (dealerValue >= 10) return "HIT";
            return "DOUBLE";
        }
        
        if (playerValue === 9) {
            if (dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
            return "HIT";
        }
        
        // 5-8
        return "HIT";
    }

    getRemainingCards() {
        // Approximation des cartes restantes dans le deck
        const usedCards = [];
        
        // Cartes du croupier
        this.dealerHand.cards.forEach(card => usedCards.push(card));
        
        // Cartes des joueurs
        this.boxes.forEach(box => {
            if (box.isActive) {
                box.hands.forEach(hand => {
                    hand.cards.forEach(card => usedCards.push(card));
                });
            }
        });

        // Simuler les cartes possibles (simplification)
        const standardDeck = [];
        for (let value = 1; value <= 13; value++) {
            for (let i = 0; i < 24; i++) { // 6 decks * 4 cartes
                standardDeck.push({ getValue: () => Math.min(value, 10) });
            }
        }

        return standardDeck.slice(usedCards.length);
    }

    calculateDealerBustProbability(dealerUpValue) {
        // Probabilités approximatives de bust du croupier selon sa carte visible
        const bustProbabilities = {
            1: 12,  // As
            2: 35,  // 2
            3: 37,  // 3
            4: 40,  // 4
            5: 42,  // 5
            6: 42,  // 6
            7: 26,  // 7
            8: 24,  // 8
            9: 23,  // 9
            10: 21  // 10, J, Q, K
        };

        return bustProbabilities[Math.min(dealerUpValue, 10)] || 25;
    }

    showSubtleResults(dealerValue, dealerBusted, resultMessages, totalWinnings, totalLosses) {
        const netResult = totalWinnings - totalLosses;
        const subtleResults = document.getElementById('subtle-results');
        const resultIcon = document.getElementById('result-icon');
        const resultSummary = document.getElementById('result-summary');
        const resultDetails = document.getElementById('result-details');

        // Icône et message principal
        if (netResult > 0) {
            resultIcon.textContent = '🎉';
            resultSummary.textContent = `Victoire +${netResult}`;
            resultSummary.style.color = '#4CAF50';
        } else if (netResult < 0) {
            resultIcon.textContent = '😞';
            resultSummary.textContent = `Défaite ${netResult}`;
            resultSummary.style.color = '#f44336';
        } else {
            resultIcon.textContent = '🤝';
            resultSummary.textContent = 'Égalité';
            resultSummary.style.color = '#ffd700';
        }

        // Détails
        let details = `Croupier: ${dealerValue}${dealerBusted ? ' (Crevé)' : ''}\n\n`;
        details += resultMessages.slice(0, 3).join('\n'); // Limiter à 3 lignes
        if (resultMessages.length > 3) {
            details += `\n... et ${resultMessages.length - 3} autre(s)`;
        }
        details += `\n\nSolde: ${this.credits}`;

        resultDetails.textContent = details;

        // Afficher avec animation
        subtleResults.style.display = 'block';
        
        // Masquer automatiquement après 5 secondes
        setTimeout(() => {
            if (subtleResults.style.display !== 'none') {
                subtleResults.style.display = 'none';
            }
        }, 5000);

        // Clic pour fermer immédiatement
        subtleResults.onclick = () => {
            subtleResults.style.display = 'none';
        };
    }

    // Méthodes vides pour compatibilité (à implémenter si nécessaire)
    showProbabilities() {
        this.toggleProbabilities();
    }

    toggleStrategy() {
        const existingModal = document.getElementById('strategy-modal');
        if (existingModal) {
            existingModal.remove();
            document.getElementById('toggle-strategy').textContent = '👁️';
        } else {
            this.createStrategyModal();
            document.getElementById('toggle-strategy').textContent = '🙈';
        }
    }

    createStrategyModal() {
        const strategyHTML = `
            <div id="strategy-modal" class="stats-modal" style="display: block;">
                <div class="stats-content">
                    <div class="stats-header">
                        <h3>📋 Stratégie de Base - Blackjack Français ENHC</h3>
                        <button class="close-btn" onclick="document.getElementById('strategy-modal').remove(); document.getElementById('toggle-strategy').textContent = '👁️';">✕</button>
                    </div>
                    <div class="stats-body">
                        <div class="strategy-section">
                            <h4>Totaux Durs (sans As compté 11)</h4>
                            <table class="strategy-chart">
                                <tr><th>Total\\Croupier</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>A</th></tr>
                                <tr><td>5-8</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>9</td><td>T</td><td>D</td><td>D</td><td>D</td><td>D</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>10</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>T</td><td>T</td></tr>
                                <tr><td>11</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>T</td></tr>
                                <tr><td>12</td><td>T</td><td>T</td><td>R</td><td>R</td><td>R</td><td>T</td><td>T</td><td>T</td><td>A</td><td>T</td></tr>
                                <tr><td>13-14</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>T</td><td>T</td><td>A</td><td>A</td><td>T</td></tr>
                                <tr><td>15</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>A</td><td>A</td><td>A</td><td>A</td><td>T</td></tr>
                                <tr><td>16</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>A</td><td>A</td><td>A</td><td>A</td><td>T</td></tr>
                                <tr><td>17+</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td></tr>
                            </table>
                        </div>
                        <div class="strategy-section">
                            <h4>Totaux Souples (avec As = 11)</h4>
                            <table class="strategy-chart">
                                <tr><th>Main\\Croupier</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>A</th></tr>
                                <tr><td>A,2 / A,3</td><td>T</td><td>T</td><td>D</td><td>D</td><td>D</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>A,4 / A,5</td><td>T</td><td>T</td><td>D</td><td>D</td><td>D</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>A,6</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>A,7</td><td>R</td><td>D</td><td>D</td><td>D</td><td>D</td><td>R</td><td>R</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>A,8 / A,9</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td></tr>
                            </table>
                        </div>
                        <div class="strategy-section">
                            <h4>Paires</h4>
                            <table class="strategy-chart">
                                <tr><th>Paire\\Croupier</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>A</th></tr>
                                <tr><td>A,A</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td></tr>
                                <tr><td>10,10</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td><td>R</td></tr>
                                <tr><td>9,9</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>R</td><td>S</td><td>S</td><td>R</td><td>R</td></tr>
                                <tr><td>8,8</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td></tr>
                                <tr><td>7,7</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>6,6</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>5,5</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>T</td><td>T</td></tr>
                                <tr><td>4,4</td><td>T</td><td>T</td><td>S</td><td>S</td><td>S</td><td>T</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                                <tr><td>3,3 / 2,2</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>T</td><td>T</td><td>T</td><td>T</td></tr>
                            </table>
                        </div>
                        <div class="strategy-legend">
                            <p><strong>Légende :</strong> T=Tirer • R=Rester • D=Doubler • S=Séparer • A=Abandonner</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', strategyHTML);
    }

    showStats() {
        const statsModal = document.getElementById('stats-modal');
        if (statsModal) {
            statsModal.style.display = 'block';
            this.updateStatsDisplay();
        } else {
            this.createStatsModal();
        }
    }

    resetCredits() {
        this.credits = 1000;
        this.updateUI();
        this.showMessage("💰 Crédits réinitialisés à 1000 !");
    }

    resetStats() {
        this.playerStats = this.getDefaultStats();
        this.showMessage("📊 Statistiques réinitialisées !");
    }

    showStats() {
        const statsModal = document.getElementById('stats-modal');
        if (statsModal) {
            statsModal.style.display = 'block';
            this.updateStatsDisplay();
        } else {
            this.createStatsModal();
        }
    }

    createStatsModal() {
        const statsHTML = `
            <div id="stats-modal" class="stats-modal" style="display: block;">
                <div class="stats-content">
                    <div class="stats-header">
                        <h3>📊 Statistiques de Jeu</h3>
                        <button class="close-btn" onclick="document.getElementById('stats-modal').style.display='none'">✕</button>
                    </div>
                    <div class="stats-body" id="stats-display">
                        <!-- Contenu des stats généré dynamiquement -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', statsHTML);
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const statsDisplay = document.getElementById('stats-display');
        if (!statsDisplay) return;

        const totalHands = this.playerStats.handsPlayed;
        const winRate = totalHands > 0 ? ((this.playerStats.wins / totalHands) * 100).toFixed(1) : 0;
        const pushRate = totalHands > 0 ? ((this.playerStats.pushes / totalHands) * 100).toFixed(1) : 0;
        const blackjackRate = totalHands > 0 ? ((this.playerStats.blackjacks / totalHands) * 100).toFixed(1) : 0;
        const bustRate = totalHands > 0 ? ((this.playerStats.busts / totalHands) * 100).toFixed(1) : 0;

        statsDisplay.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card">
                    <h4>🎯 Mains Jouées</h4>
                    <span class="stat-number">${totalHands}</span>
                </div>
                <div class="stat-card">
                    <h4>🏆 Victoires</h4>
                    <span class="stat-number">${this.playerStats.wins}</span>
                    <span class="stat-percent">(${winRate}%)</span>
                </div>
                <div class="stat-card">
                    <h4>💔 Défaites</h4>
                    <span class="stat-number">${this.playerStats.losses}</span>
                    <span class="stat-percent">(${(100 - winRate - pushRate).toFixed(1)}%)</span>
                </div>
                <div class="stat-card">
                    <h4>🤝 Égalités</h4>
                    <span class="stat-number">${this.playerStats.pushes}</span>
                    <span class="stat-percent">(${pushRate}%)</span>
                </div>
                <div class="stat-card">
                    <h4>🃏 Blackjacks</h4>
                    <span class="stat-number">${this.playerStats.blackjacks}</span>
                    <span class="stat-percent">(${blackjackRate}%)</span>
                </div>
                <div class="stat-card">
                    <h4>💥 Busts</h4>
                    <span class="stat-number">${this.playerStats.busts}</span>
                    <span class="stat-percent">(${bustRate}%)</span>
                </div>
                <div class="stat-card">
                    <h4>💰 Gains Nets</h4>
                    <span class="stat-number ${this.playerStats.totalWinnings >= 0 ? 'positive' : 'negative'}">
                        ${this.playerStats.totalWinnings >= 0 ? '+' : ''}${this.playerStats.totalWinnings}
                    </span>
                </div>
                <div class="stat-card">
                    <h4>📈 Gain/Main</h4>
                    <span class="stat-number ${(this.playerStats.totalWinnings / Math.max(totalHands, 1)) >= 0 ? 'positive' : 'negative'}">
                        ${(this.playerStats.totalWinnings / Math.max(totalHands, 1)).toFixed(2)}
                    </span>
                </div>
            </div>
        `;
    }

    handlePlayerBlackjack(boxNum) {
        // Gérer le blackjack du joueur
    }

    showInsuranceOffer() {
        // Trouver toutes les boxes actives qui peuvent prendre l'assurance
        const eligibleBoxes = [];
        this.boxes.forEach((box, index) => {
            if (box.isActive && box.hands.length > 0) {
                eligibleBoxes.push(index + 1);
            }
        });

        if (eligibleBoxes.length === 0) return;

        this.gameState = 'insurance';
        this.currentInsuranceBoxIndex = 0;
        this.eligibleInsuranceBoxes = eligibleBoxes;
        this.insuranceDecisions = Array(6).fill(null); // null = pas décidé, true = pris, false = refusé
        
        this.showInsuranceForCurrentBox();
    }

    showInsuranceForCurrentBox() {
        if (this.currentInsuranceBoxIndex >= this.eligibleInsuranceBoxes.length) {
            // Toutes les décisions d'assurance sont prises
            this.finishInsurancePhase();
            return;
        }

        const boxNum = this.eligibleInsuranceBoxes[this.currentInsuranceBoxIndex];
        const box = this.boxes[boxNum - 1];
        
        // Mettre en évidence la box courante
        this.boxes.forEach((_, index) => {
            document.getElementById(`box-${index + 1}`).classList.remove('active');
        });
        document.getElementById(`box-${boxNum}`).classList.add('active');
        
        // Afficher l'offre d'assurance
        const insuranceOffer = document.getElementById('insurance-offer');
        const message = insuranceOffer.querySelector('span');
        message.textContent = `🃏 Box ${boxNum}: Le croupier a un As - Voulez-vous prendre une assurance? (Coût: ${Math.floor(box.hands[0].bet / 2)})`;
        
        insuranceOffer.style.display = 'block';
        
        // Vérifier si le joueur a assez de crédits
        const insuranceCost = Math.floor(box.hands[0].bet / 2);
        const takeBtn = document.getElementById('take-insurance');
        if (this.credits < insuranceCost) {
            takeBtn.disabled = true;
            takeBtn.textContent = 'Pas assez de crédits';
        } else {
            takeBtn.disabled = false;
            takeBtn.textContent = `Assurance (${insuranceCost})`;
        }
    }

    takeInsurance() {
        const boxNum = this.eligibleInsuranceBoxes[this.currentInsuranceBoxIndex];
        const box = this.boxes[boxNum - 1];
        const insuranceCost = Math.floor(box.hands[0].bet / 2);
        
        if (this.credits >= insuranceCost) {
            this.credits -= insuranceCost;
            this.insuranceBets[boxNum - 1] = insuranceCost;
            this.insuranceDecisions[boxNum - 1] = true;
            
            this.showMessage(`Box ${boxNum}: Assurance prise pour ${insuranceCost} crédits`);
            
            // Passer à la box suivante
            this.currentInsuranceBoxIndex++;
            setTimeout(() => {
                this.showInsuranceForCurrentBox();
            }, 1000);
        }
        
        this.updateUI();
    }

    declineInsurance() {
        const boxNum = this.eligibleInsuranceBoxes[this.currentInsuranceBoxIndex];
        this.insuranceDecisions[boxNum - 1] = false;
        
        this.showMessage(`Box ${boxNum}: Assurance refusée`);
        
        // Passer à la box suivante
        this.currentInsuranceBoxIndex++;
        setTimeout(() => {
            this.showInsuranceForCurrentBox();
        }, 1000);
    }

    finishInsurancePhase() {
        // Cacher l'offre d'assurance
        document.getElementById('insurance-offer').style.display = 'none';
        
        // Retirer la mise en évidence
        this.boxes.forEach((_, index) => {
            document.getElementById(`box-${index + 1}`).classList.remove('active');
        });
        
        // Vérifier si le croupier a blackjack
        if (this.dealerHand.cards.length >= 2 && this.dealerHand.isBlackjack()) {
            this.handleDealerBlackjackWithInsurance();
        } else {
            // Continuer le jeu normal
            this.gameState = 'playing';
            this.checkInitialBlackjacks();
        }
    }

    handleDealerBlackjackWithInsurance() {
        this.showMessage("🃏 Le croupier a un Blackjack!");
        
        // Payer les assurances et gérer les mains
        this.boxes.forEach((box, index) => {
            if (box.isActive) {
                const boxNum = index + 1;
                
                // Payer l'assurance si prise
                if (this.insuranceBets[index] > 0) {
                    const insurancePayout = this.insuranceBets[index] * 2; // Assurance paie 2:1
                    this.credits += insurancePayout;
                    this.showMessage(`Box ${boxNum}: Assurance payée ${insurancePayout} crédits!`);
                }
                
                // Gérer la main principale
                const hand = box.hands[0];
                if (hand.isBlackjack()) {
                    // Push - égalité BJ vs BJ
                    this.credits += hand.bet;
                    this.playerStats.pushes++;
                    this.showMessage(`Box ${boxNum}: Égalité (BJ vs BJ) - Mise rendue`);
                } else {
                    // Joueur perd
                    this.playerStats.losses++;
                    this.showMessage(`Box ${boxNum}: Perdu contre BJ croupier`);
                }
                
                box.isFinished = true;
            }
        });
        
        this.updateUI();
        
        // Montrer le bouton nouvelle manche au lieu de redémarrer automatiquement
        setTimeout(() => {
            this.showNewRoundButton();
        }, 3000);
    }

    checkInitialBlackjacks() {
        // Vérifier les blackjacks des joueurs après la phase d'assurance
        let hasPlayerBlackjack = false;
        this.boxes.forEach((box, index) => {
            if (box.isActive && box.hands[0].isBlackjack()) {
                hasPlayerBlackjack = true;
                // Animation blackjack sur la box au lieu de notification
                this.animateBlackjackBox(index + 1);
                box.isFinished = true;
            }
        });

        if (hasPlayerBlackjack) {
            setTimeout(() => {
                this.findFirstActiveBox();
            }, 2000);
        } else {
            this.findFirstActiveBox();
        }
    }
}

// Optimisations mobiles
class MobileOptimizations {
    constructor() {
        this.initTouchOptimizations();
        this.preventZoom();
        this.handleOrientationChange();
    }

    initTouchOptimizations() {
        // Améliorer le feedback tactile des boutons
        const buttons = document.querySelectorAll('.btn, .box-controls button');
        buttons.forEach(button => {
            // Ajout de feedback tactile
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
                button.style.transition = 'transform 0.1s ease';
            });
            
            button.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    button.style.transform = 'scale(1)';
                }, 100);
            });

            // Empêcher le double-tap zoom sur les boutons
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                button.click();
            });
        });

        // Gestionnaire pour les cartes (effet de survol sur mobile)
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('touchstart', () => {
                card.classList.add('card-touched');
            });
            
            card.addEventListener('touchend', () => {
                setTimeout(() => {
                    card.classList.remove('card-touched');
                }, 200);
            });
        });
    }

    preventZoom() {
        // Empêcher le zoom par pinch
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Empêcher le double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    handleOrientationChange() {
        // Gérer le changement d'orientation
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculer les dimensions après rotation
                window.scrollTo(0, 0);
                
                // Mettre à jour la hauteur de la zone de jeu
                const gameArea = document.querySelector('.game-area');
                if (gameArea) {
                    gameArea.style.minHeight = `${window.innerHeight - 120}px`;
                }
            }, 100);
        });

        // Ajuster la hauteur initiale
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
    }

    // Vibration pour le feedback tactile (si supporté)
    vibrate(pattern = [50]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
}

// Détection mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
           || window.innerWidth <= 768;
}

// Initialiser le jeu
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
    
    // Initialiser les optimisations mobiles si nécessaire
    if (isMobileDevice()) {
        new MobileOptimizations();
        
        // Ajouter une classe CSS pour les styles mobiles spécifiques
        document.body.classList.add('mobile-device');
        
        console.log('🎰 Mode mobile activé - Optimisations tactiles chargées');
    }
});

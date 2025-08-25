<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Blackjack Français ENHC

Ce projet implémente un jeu de blackjack français avec les règles ENHC (European No Hole Card).

## Règles spécifiques à implémenter :
- 6 jeux de cartes
- ENHC (pas de carte fermée pour le croupier)
- Croupier reste sur 17 souple (S17)
- Double sur toutes mains et après split
- Split maximum 3 mains (2 resplits)
- As split = une carte seulement
- Abandon seulement contre 10 (pas contre As)
- Assurance disponible à 2:1

## Stratégie de base intégrée
Le projet inclut la stratégie de base optimale pour ces règles avec les tableaux pour :
- Totaux durs (5-21)
- Totaux souples (A,2 à A,9)
- Paires (A,A à 2,2)

## Technologies
- HTML5 pour la structure
- CSS3 pour le design moderne
- JavaScript pur pour la logique de jeu

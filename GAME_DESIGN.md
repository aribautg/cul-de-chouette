# Cul de Chouette — Game Design Document

## 1. Vision

Application web jouable du jeu de dés "Cul de Chouette", inspiré de la série TV Kaamelott.
Esthétique RPG Maker / gaming médiéval-fantaisie, rappelant l'univers de la série.

**Stack technique** : HTML/CSS/JavaScript (Vanilla), jouable en local navigateur.

---

## 2. Résolution des incohérences

### 2.1 Artichette vs Bleu-Rouge (3-4-3)

**Problème** : Les deux règles s'appliquent à la même combinaison 3-4-3.

**Résolution** :
- En ★★ (quand le Bleu-Rouge n'existe pas encore) → c'est une **Artichette**
- En ★★★ (quand le Bleu-Rouge est introduit) → la combinaison 3-4-3 devient un **Bleu-Rouge** qui REMPLACE l'Artichette
- L'Artichette est supprimée en ★★★ et ★★★★ car le Bleu-Rouge est plus intéressant mécaniquement
- **Exception** : L'Artichette réapparaît UNIQUEMENT via la Tichette (★★★★) en tant que résultat d'un Sirop

**Explication in-game** : "En difficulté ★★★, le Bleu-Rouge remplace l'Artichette sur la combinaison 3-4-3. L'Artichette ne peut plus apparaître que via un Sirop (voir Tichette)."

### 2.2 Valeur de la Bévue (10 pts vs 5 pts)

**Problème** : Le wiki dit 10 pts dans la section Bévue, mais 5 pts dans la section Flan.

**Résolution** : La Bévue coûte **10 pts** à tous les niveaux. La mention de 5 pts dans le Flan est considérée comme une erreur du wiki. Cohérence = une seule valeur partout.

### 2.3 Flan (6-5-2) vs Néant

**Problème** : 6-5-2 ne correspond à aucune combinaison scorante, donc devrait être un Néant.

**Résolution** :
- En ★★★★ : La combinaison 6-5-2 est un **Flan** (prioritaire sur le Néant)
- Le joueur NE gagne PAS de Grelottine sur un Flan
- Le joueur doit crier "À Kadoc !" pour obtenir son Flan. S'il ne le fait pas à temps, c'est traité comme un Néant
- **Explication in-game** : "La combinaison 6-5-2 est un Flan. Vous devez crier 'À Kadoc !' pour l'obtenir. Sinon, c'est un Néant."

### 2.4 Velute 1-2-3 = Suite-Velutée

**Résolution** : En ★★+, la combinaison 1-2-3 déclenche la **Suite-Velutée** qui est une règle spécifique combinant Suite + Velute. Pas d'ambiguïté : c'est toujours la Suite-Velutée qui s'applique, jamais les deux séparément. En ★, 1-2-3 est simplement une Suite.

### 2.5 Néant Soufflé (1-4-6) vs Soufflette (4-2-1)

Pas d'incohérence réelle, juste des noms proches. L'app affiche clairement :
- **Soufflette** = 4-2-1 (un défi)
- **Néant Soufflé** = 1-4-6 (récupérer une Grelottine via annonce)

### 2.6 Tichette : "interdit d'expliquer"

**Résolution** : La méta-règle "interdit d'expliquer" est conservée comme easter egg narratif mais l'app propose un tutoriel intégré accessible à tout moment. Le jeu est une app, pas une table physique — cette contrainte n'a pas de sens en numérique. Un message humoristique "Normalement on n'a pas le droit de vous expliquer ça..." précède le tutoriel.

---

## 3. Niveaux de difficulté et règles par niveau

### Niveau ★ (Découverte)

**Combinaisons** :
- Chouette (2 dés identiques) → valeur²
- Velute (somme de 2 dés = 3ème) → 2 × valeur_max²
- Chouette-Velute (1-1-2, 2-2-4, 3-3-6) → "Pas mou le caillou !" → valeur de la Velute
- Cul de Chouette (3 dés identiques) → 40 + 10×valeur
- Suite (3 consécutifs) → "Grelotte ça picote !" → dernier = -10 pts
- Néant (rien) → 0 pts, gagne une Grelottine

**Actions** :
- Grelottine (défi entre joueurs possédant une Grelottine)
- Sirop (relancer un dé sur une Chouette pour tenter le Cul de Chouette)
- Civet (obtenu sur Sirop de 6 raté, permet de parier sur une combinaison)
- Bévue (-10 pts)
- Chante-Sloubi (rejoindre une partie en cours)

### Niveau ★★ (Intermédiaire)

Tout le niveau ★ +

**Combinaisons** :
- Suite-Velutée (1-2-3) → Suite + possibilité de Velute
- Artichette (4-3-4) → "Raitournelle!" ou "Artichette!"
- Soufflette (4-2-1) → défi 3 lancers

**Actions** :
- Poulette (Grelottine échouée + Néant)
- Passe-Grelot (immunité Grelottine transférable)
- Rigodon (annuler une Grelottine)
- Attrape-Oiseau (siroter à la place d'un autre)
- Contre-Sirop (sirop raté + pas de mise réussie)
- Civet Doublé
- Cul de Chouette Doublé (risque d'élimination)
- Achat / Double Achat (-30 pts pour jouer le cul d'un autre)
- Les Graines ("Je ne mange pas de graines !")

### Niveau ★★★ (Avancé)

Tout le niveau ★★ SAUF Artichette (remplacée) +

**Modifications** :
- **Bleu-Rouge (3-4-3) REMPLACE Artichette** → relance avec paris de tous les joueurs

**Combinaisons** :
- Bleu-Rouge (3-4-3) → 9 pts + relance avec paris
- Pélican (relance 6-6-6 sur Bleu-Rouge) → "Pélican !" → 28 pts
- Néant Soufflé (1-4-6) → "Mécréant !"
- Cul de Chouette Doublé Diminué

**Actions** :
- Verdier (paris sur Velute de 6 après chouettes 6-4, 6-2 ou 4-2)
- Jarret (obtenu sur Néant de relance Bleu-Rouge)
- Mi-Jarret / Bi-Jarret / Jarret-Souple / Jarret-Sifflet

### Niveau ★★★★ (Expert / Complet)

Tout le niveau ★★★ +

**Combinaisons** :
- Tichette (Artichette via Sirop) → défi complexe de paris
- Flan (6-5-2) → "À Kadoc !" → obtient un Flan

**Actions** :
- Flan (inverser la combinaison d'un adversaire)
- Double Flan / Contre-Flan
- Civet-Filoché (obtenu sur Civet raté quand mise = combinaison)
- Civet-Filoché Doublé

---

## 4. Game State — Ce que l'app doit tracker

### Par joueur :
- Score (points)
- Grelottine (oui/non)
- Civet (oui/non)
- Civet-Filoché (oui/non)
- Flan (oui/non)
- Jarret (type: aucun / jarret / jarret-souple / jarret-sifflet)
- Passe-Grelot (oui/non)
- Rigodon (oui/non)
- Éliminé (oui/non)
- Avatar + nom

### Global :
- Tour actuel (qui joue)
- Nombre de tours écoulés
- Niveau de difficulté sélectionné
- Historique des actions (log)
- Sens du jeu (anti-horaire)
- Mode scores négatifs (oui/non)

---

## 5. Interface — Architecture des écrans

### 5.1 Écran titre
- Logo "Cul de Chouette" style parchemin / RPG
- Fond : château médiéval pixelisé (style RPG Maker)
- Boutons : "Nouvelle Partie", "Règles", "Crédits"
- Musique d'ambiance médiévale

### 5.2 Configuration de partie
- Choix du niveau (★ à ★★★★) avec description
- Nombre de joueurs (2-16)
- Noms + avatars (style portraits RPG médiévaux)
- Option : scores négatifs (oui/non)
- Objectif : 343 pts (fixe)

### 5.3 Écran de jeu principal

```
┌─────────────────────────────────────────────────────┐
│  [Tour X] [Joueur actif + avatar]    [⚙️] [📜 Log] │
│─────────────────────────────────────────────────────│
│                                                     │
│              ╔═══════════════════╗                   │
│              ║   ZONE DE DÉS    ║                   │
│              ║  🎲  🎲  │  🎲   ║                   │
│              ║ Chouettes │ Cul   ║                   │
│              ╚═══════════════════╝                   │
│                                                     │
│         ┌─────────────────────────┐                 │
│         │   ZONE D'ANNONCES       │                 │
│         │   Boutons contextuels   │                 │
│         │   selon la combinaison  │                 │
│         └─────────────────────────┘                 │
│                                                     │
│    ┌─────────────────────────────────────────┐      │
│    │         ZONE D'EXPLICATION              │      │
│    │   "Vous avez fait une Chouette de       │      │
│    │    4 (16 pts). Voulez-vous siroter?"    │      │
│    └─────────────────────────────────────────┘      │
│─────────────────────────────────────────────────────│
│ [👤 J1: 45] [👤 J2: 102] [👤 J3: 78] [👤 J4: 23]  │
│  🛡️🎯       🛡️           🎲🏺         🛡️          │
└─────────────────────────────────────────────────────┘
```

**Bandeau bas (Scoreboard)** :
- Portraits des joueurs (cliquables → ouvre le dashboard personnel)
- Score actuel de chaque joueur
- Icônes des objets possédés (Grelottine, Civet, Flan, Jarret, etc.)
- Joueur actif mis en surbrillance dorée

### 5.4 Dashboard personnel (modal/overlay au clic sur avatar)

```
┌─────────────────────────────────────┐
│  [Portrait]  PERCEVAL               │
│  Score : 142 pts                    │
│─────────────────────────────────────│
│  INVENTAIRE :                       │
│  🛡️ Grelottine    ✅               │
│  🏺 Civet          ❌               │
│  🎯 Flan           ✅               │
│  ⚔️ Jarret         ❌               │
│  🔄 Passe-Grelot   ❌               │
│  🎵 Rigodon        ❌               │
│─────────────────────────────────────│
│  HISTORIQUE RÉCENT :                │
│  Tour 5 : Chouette de 3 (+9 pts)   │
│  Tour 7 : Bévue (-10 pts)          │
│  Tour 9 : Sirop réussi (+80 pts)   │
│─────────────────────────────────────│
│              [Fermer]               │
└─────────────────────────────────────┘
```

### 5.5 Zone d'annonces (contextuelle)

Selon la combinaison, l'app affiche les actions possibles :
- Sur Chouette → boutons "Je sirote !" / "Attrape-Oiseau !" (si ★★+)
- Sur Suite → bouton "Grelotte ça picote !" (chronomètre pour le dernier)
- Sur Chouette-Velute → bouton "Pas mou le caillou !" (premier à cliquer)
- Sur Néant → notification "Vous gagnez une Grelottine"
- Entre les tours → bouton "Grelottine !" si applicable

### 5.6 Zone d'explication

Toujours visible. Explique EN FRANÇAIS ce qui se passe et pourquoi :
- "C'est un Bleu-Rouge (3-4-3). Vous gagnez 9 pts. Tous les joueurs doivent maintenant miser sur la valeur de la relance."
- "Attention : en difficulté ★★★, la combinaison 3-4-3 est un Bleu-Rouge et non une Artichette."

---

## 6. Esthétique

### Palette de couleurs
- **Fond principal** : Bleu nuit / violet foncé (#1a1a2e, #16213e)
- **Accents** : Or/doré (#d4af37), rouge sang (#8b0000)
- **Texte** : Parchemin (#f4e4c1)
- **Éléments UI** : Pierre/bois (#4a3728, #6b4423)
- **Succès/gain** : Vert émeraude (#2d6b4f)
- **Erreur/perte** : Rouge profond (#a82039)

### Typographie
- Titres : Police médiévale (MedievalSharp, Cinzel)
- Corps : Police lisible thématique (Crimson Text, Lora)
- Annonces : Police impact/bold pour les cris

### Éléments visuels
- Dés en 3D style pierre/os avec animation de lancer
- Boutons style "plaque de métal gravée"
- Bordures de fenêtres en bois sculpté
- Fond : texture parchemin + motifs celtiques subtils
- Avatars : portraits style pixel art médiéval (chevaliers, paysans, rois)
- Icônes des objets en pixel art 32x32
- Particules dorées sur les gains importants
- Effets de tremblement sur les pertes

### Inspirations directes
- RPG Maker (menus, fenêtres de dialogue avec bordures)
- Kaamelott (palette sombre, pierre, torches, ambiance taverne)
- Darkest Dungeon (narration, ambiance)
- Slay the Spire (cartes, interface gaming claire)

---

## 7. Architecture technique

```
cul-de-chouette/
├── index.html
├── css/
│   ├── main.css
│   ├── theme.css
│   ├── components.css
│   ├── animations.css
│   └── scoreboard.css
├── js/
│   ├── main.js
│   ├── game/
│   │   ├── GameEngine.js
│   │   ├── GameState.js
│   │   ├── Player.js
│   │   ├── Dice.js
│   │   ├── TurnManager.js
│   │   └── rules/
│   │       ├── RuleEngine.js
│   │       ├── combinations.js
│   │       └── actions.js
│   ├── ui/
│   │   ├── UIManager.js
│   │   ├── DiceRenderer.js
│   │   ├── Scoreboard.js
│   │   ├── PlayerDashboard.js
│   │   ├── ActionPanel.js
│   │   ├── ExplanationBox.js
│   │   └── GameLog.js
│   └── utils/
│       ├── constants.js
│       └── helpers.js
├── assets/
│   ├── images/
│   ├── fonts/
│   └── sounds/
└── README.md
```

---

## 8. Gestion multijoueur local (hot-seat)

Le jeu est en **hot-seat** (même écran, joueurs se passent le contrôle).

Pour les réactions en temps réel (Suite, Chouette-Velute, etc.) :
- Chaque joueur se voit assigner une touche (configurable)
- Countdown de 3-5 secondes selon le niveau
- Le plus rapide (premier à presser sa touche) remporte la priorité
- En cas d'égalité (même frame), départage aléatoire

---

## 9. Priorités d'implémentation

1. **Phase 1** : Moteur de jeu ★ (combinaisons de base + Sirop + Grelottine + Civet)
2. **Phase 2** : Interface complète (dés, scoreboard, dashboard, explications)
3. **Phase 3** : Règles ★★ (Artichette, Soufflette, Achats, Attrape-Oiseau)
4. **Phase 4** : Règles ★★★ (Bleu-Rouge, Jarret, Verdier, Pélican)
5. **Phase 5** : Règles ★★★★ (Flan, Tichette, Civet-Filoché)
6. **Phase 6** : Polish (sons, animations, esthétique finale)

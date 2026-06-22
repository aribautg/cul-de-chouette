import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { Dice } from './Dice.js';
import { RuleEngine } from './rules/RuleEngine.js';
import { GAME_PHASE, COMBINATION_TYPES, WINNING_SCORE, SUITE_PENALTY } from '../utils/constants.js';

export class GameEngine {
  constructor() {
    this.state = new GameState();
    this.dice = new Dice();
    this.ruleEngine = null;
    this.eventListeners = {};
  }

  // === Event system ===
  on(event, callback) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }

  // === Setup ===
  setupGame(config) {
    this.state.difficulty = config.difficulty;
    this.state.allowNegativeScores = config.allowNegativeScores;
    this.ruleEngine = new RuleEngine(config.difficulty);

    this.state.players = config.players.map((p, i) =>
      new Player(p.name, p.avatarId, p.keyBinding || (i + 1).toString())
    );

    this.state.phase = GAME_PHASE.ROLLING_CHOUETTES;
    this.state.turnNumber = 1;
    this.state.currentPlayerIndex = 0;

    this.state.addLog({
      type: 'gameStart',
      message: `Partie lancée en difficulté ${'★'.repeat(config.difficulty)} avec ${this.state.players.length} joueurs.`
    });

    this.emit('gameStarted', {
      players: this.state.players,
      difficulty: this.state.difficulty
    });

    this.emit('turnStart', {
      player: this.state.currentPlayer,
      turn: this.state.turnNumber
    });
  }

  // === Actions de jeu ===

  rollChouettes() {
    if (this.state.phase !== GAME_PHASE.ROLLING_CHOUETTES) return;

    const result = this.dice.rollChouettes();
    this.state.phase = GAME_PHASE.ROLLING_CUL;

    this.emit('chouettesRolled', {
      dice: result,
      player: this.state.currentPlayer
    });

    // Vérifier si Verdier est possible (★★★+)
    if (this.state.difficulty >= 3) {
      const [d1, d2] = result;
      const sorted = [d1, d2].sort((a, b) => a - b);
      if ((sorted[0] === 2 && sorted[1] === 6) ||
          (sorted[0] === 4 && sorted[1] === 6) ||
          (sorted[0] === 2 && sorted[1] === 4)) {
        this.emit('verdierPossible', { chouettes: result });
      }
    }

    return result;
  }

  rollCul() {
    if (this.state.phase !== GAME_PHASE.ROLLING_CUL) return;

    const result = this.dice.rollCul();
    this.state.phase = GAME_PHASE.RESOLVING;

    const allDice = this.dice.getAll();
    const combination = this.ruleEngine.analyze(allDice);
    this.state.lastCombination = combination;

    this.emit('culRolled', {
      die: result,
      allDice,
      combination
    });

    this.resolveCombination(combination);
    return result;
  }

  resolveCombination(combination) {
    const player = this.state.currentPlayer;
    const actions = this.ruleEngine.getAvailableActions(
      combination, player, this.state.players
    );

    this.state.addLog({
      type: 'combination',
      player: player.name,
      combination: combination.type,
      description: combination.description
    });

    // Cas auto-résolu : Néant
    if (combination.type === COMBINATION_TYPES.NEANT) {
      if (!player.hasItem('grelottine')) {
        const canGet = this.state.allowNegativeScores || player.score >= 30;
        if (canGet) {
          player.giveItem('grelottine');
          this.emit('itemGained', { player, item: 'grelottine' });
        }
      }
      this.emit('combinationResolved', { combination, actions: [] });
      this.prepareNextTurn();
      return;
    }

    // Cas avec actions à résoudre
    if (actions.length > 0) {
      this.state.pendingActions = actions;
      this.state.phase = GAME_PHASE.ACTION;
      this.emit('actionsAvailable', { combination, actions });
    } else {
      // Attribution directe des points
      if (combination.points > 0) {
        player.addScore(combination.points, combination.description);
        this.emit('scoreChanged', { player, points: combination.points, reason: combination.description });
      }
      this.checkWinCondition(player);
      this.prepareNextTurn();
    }
  }

  // === Résolution des actions ===

  /**
   * Le joueur choisit de siroter
   */
  doSirop(player) {
    const combination = this.state.lastCombination;
    if (combination.type !== COMBINATION_TYPES.CHOUETTE) return;

    const siropDie = this.dice.rollSirop();
    const result = this.ruleEngine.resolveSirop(combination.value, siropDie);

    this.state.addLog({
      type: 'sirop',
      player: player.name,
      result: result.success ? 'réussi' : 'raté',
      die: siropDie
    });

    if (result.success) {
      player.addScore(result.points, result.description);
      this.emit('scoreChanged', { player, points: result.points, reason: result.description });
    } else {
      player.addScore(result.points, result.description); // points négatifs
      this.emit('scoreChanged', { player, points: result.points, reason: result.description });

      // Sirop de 6 raté → Civet
      if (result.givesCivet && !player.hasItem('civet')) {
        player.giveItem('civet');
        this.emit('itemGained', { player, item: 'civet' });
      }
    }

    this.emit('siropResolved', { player, result, die: siropDie });
    this.checkWinCondition(player);

    // ★★★★ : Vérifier si le résultat du sirop forme une Artichette (Tichette)
    if (!result.success && this.state.difficulty >= 4) {
      const chouettes = this.dice.chouettes;
      const allDiceAfterSirop = [...chouettes, siropDie].sort((a, b) => a - b);
      if (allDiceAfterSirop[0] === 3 && allDiceAfterSirop[1] === 3 && allDiceAfterSirop[2] === 4) {
        this.emit('tichetteTriggered', { player, dice: allDiceAfterSirop });
        return result; // Ne pas prepareNextTurn, la Tichette va prendre le relais
      }
    }

    this.prepareNextTurn();

    return result;
  }

  /**
   * Le joueur ne sirote pas, prend les points de la Chouette
   */
  skipSirop(player) {
    const combination = this.state.lastCombination;
    if (combination.type !== COMBINATION_TYPES.CHOUETTE) return;

    player.addScore(combination.points, combination.description);
    this.emit('scoreChanged', { player, points: combination.points, reason: combination.description });
    this.checkWinCondition(player);
    this.prepareNextTurn();
  }

  /**
   * Résolution de la Suite (le dernier à réagir perd)
   */
  resolveSuite(lastPlayerIndex) {
    const loser = this.state.players[lastPlayerIndex];
    loser.removeScore(SUITE_PENALTY, 'Dernier à réagir sur la Suite');
    this.emit('scoreChanged', {
      player: loser,
      points: -SUITE_PENALTY,
      reason: 'Dernier à crier "Grelotte ça picote !"'
    });
  }

  /**
   * Résolution de la Suite pour un joueur spécifique (cas d'égalité)
   */
  resolveSuiteForPlayer(playerIndex) {
    const loser = this.state.players[playerIndex];
    loser.removeScore(SUITE_PENALTY, 'Égalité sur la Suite : dernier à réagir');
    this.emit('scoreChanged', {
      player: loser,
      points: -SUITE_PENALTY,
      reason: 'Égalité : dernier à crier "Grelotte ça picote !"'
    });
  }

  /**
   * Résolution Chouette-Velute (premier à réagir gagne)
   */
  resolveChouetteVelute(winnerIndex) {
    const combination = this.state.lastCombination;
    const winner = this.state.players[winnerIndex];
    winner.addScore(combination.points, `Chouette-Velute gagnée : "Pas mou le caillou !"`);
    this.emit('scoreChanged', {
      player: winner,
      points: combination.points,
      reason: 'Chouette-Velute : "Pas mou le caillou !"'
    });
    this.checkWinCondition(winner);
  }

  /**
   * Résolution Chouette-Velute en cas d'égalité
   */
  resolveChouetteVeluteEquality(tiedPlayerIndexes) {
    const combination = this.state.lastCombination;
    tiedPlayerIndexes.forEach(idx => {
      const player = this.state.players[idx];
      player.removeScore(combination.points, 'Chouette-Velute à égalité : perte de points');
      this.emit('scoreChanged', {
        player,
        points: -combination.points,
        reason: 'Égalité sur la Chouette-Velute : les joueurs concernés perdent les points.'
      });
    });
  }

  /**
   * Résolution de la Soufflette
   */
  launchSoufflette(targetIndex) {
    // Démarre le défi Soufflette
    const target = this.state.players[targetIndex];
    this.emit('souffletteLaunched', {
      challenger: this.state.currentPlayer,
      target
    });
    // Le UI gèrera les 3 lancers du défié
  }

  resolveSoufflette(targetIndex, attempt, success) {
    const challenger = this.state.currentPlayer;
    const target = this.state.players[targetIndex];

    if (success) {
      const pointsByAttempt = { 1: 50, 2: 40, 3: 30 };
      const pts = pointsByAttempt[attempt];
      challenger.removeScore(pts, `Soufflette perdue (réussie au lancer ${attempt})`);
      target.addScore(pts, `Soufflette gagnée au lancer ${attempt}`);
      this.emit('scoreChanged', { player: challenger, points: -pts, reason: `Soufflette : le soufflé a réussi au lancer ${attempt}` });
      this.emit('scoreChanged', { player: target, points: pts, reason: `Soufflette réussie au lancer ${attempt}` });
    } else {
      challenger.addScore(30, 'Soufflette gagnée (le soufflé a échoué)');
      target.removeScore(30, 'Soufflette échouée');
      this.emit('scoreChanged', { player: challenger, points: 30, reason: 'Le soufflé a échoué sa Soufflette' });
      this.emit('scoreChanged', { player: target, points: -30, reason: 'Soufflette échouée : -30 pts' });
    }

    this.checkWinCondition(challenger);
    this.checkWinCondition(target);
    this.prepareNextTurn();
  }

  // === Grelottine ===

  launchGrelottine(challengerIndex, targetIndex, combinationType, bet) {
    const challenger = this.state.players[challengerIndex];
    const target = this.state.players[targetIndex];

    const check = this.ruleEngine.canLaunchGrelottine(
      challenger, target, this.state.allowNegativeScores
    );

    if (!check.valid) {
      this.emit('actionFailed', { reason: check.reason });
      return false;
    }

    const maxBet = this.ruleEngine.getMaxGrelottineBet(challenger, target, combinationType);
    if (bet > maxBet) {
      this.emit('actionFailed', { reason: `La mise maximale est de ${maxBet} pts.` });
      return false;
    }

    // Retirer les Grelottines
    challenger.removeItem('grelottine');
    target.removeItem('grelottine');

    this.emit('grelottineLaunched', {
      challenger,
      target,
      combinationType,
      bet,
      maxBet
    });

    return true;
  }

  resolveGrelottine(targetIndex, success, bet) {
    const challenger = this.state.currentPlayer;
    const target = this.state.players[targetIndex];

    if (success) {
      target.addScore(bet, 'Défi Grelottine réussi');
      challenger.removeScore(bet, 'Défi Grelottine perdu');
      this.emit('scoreChanged', { player: target, points: bet, reason: 'Défi Grelottine réussi !' });
      this.emit('scoreChanged', { player: challenger, points: -bet, reason: 'Défi Grelottine perdu' });
      // Le gagnant gagne un Passe-Grelot et un Rigodon
      if (!target.hasItem('passeGrelot')) target.giveItem('passeGrelot');
      if (!target.hasItem('rigodon')) target.giveItem('rigodon');
    } else {
      challenger.addScore(bet, 'Défi Grelottine gagné');
      target.removeScore(bet, 'Défi Grelottine échoué');
      this.emit('scoreChanged', { player: challenger, points: bet, reason: 'Défi Grelottine gagné !' });
      this.emit('scoreChanged', { player: target, points: -bet, reason: 'Défi Grelottine échoué' });
    }

    this.checkWinCondition(challenger);
    this.checkWinCondition(target);
  }

  // === Utilitaires ===

  checkWinCondition(player) {
    if (this.ruleEngine.checkWin(player)) {
      this.state.winner = player;
      this.state.phase = GAME_PHASE.GAME_OVER;
      this.emit('gameOver', { winner: player });
      return true;
    }
    return false;
  }

  prepareNextTurn() {
    if (this.state.phase === GAME_PHASE.GAME_OVER) return;

    this.state.phase = GAME_PHASE.BETWEEN_TURNS;
    this.emit('turnEnd', { player: this.state.currentPlayer, turn: this.state.turnNumber });

    // Petit délai pour laisser le joueur voir le résultat
    this.emit('readyForNextTurn', {});
  }

  startNextTurn() {
    if (this.state.phase === GAME_PHASE.GAME_OVER) return;
    this.state.nextTurn();
    this.dice.reset();
    this.emit('turnStart', {
      player: this.state.currentPlayer,
      turn: this.state.turnNumber
    });
  }

  // === Civet ===

  useCivet(playerIndex, bet, targetCombination) {
    const player = this.state.players[playerIndex];
    if (!player.hasItem('civet')) {
      this.emit('actionFailed', { reason: 'Vous n\'avez pas de Civet.' });
      return false;
    }
    if (bet < 1 || bet > 102) {
      this.emit('actionFailed', { reason: 'La mise doit être entre 1 et 102 pts.' });
      return false;
    }

    player.removeItem('civet');
    this.emit('civetUsed', { player, bet, targetCombination });
    return true;
  }

  resolveCivet(playerIndex, bet, success, combinationPoints) {
    const player = this.state.players[playerIndex];

    if (success) {
      player.addScore(bet + combinationPoints, `Civet réussi (+${bet} mise + ${combinationPoints} combinaison)`);
      this.emit('scoreChanged', { player, points: bet + combinationPoints, reason: 'Civet réussi !' });
    } else {
      player.addScore(-bet + combinationPoints, `Civet raté (-${bet} mise + ${combinationPoints} combinaison)`);
      this.emit('scoreChanged', { player, points: -bet + combinationPoints, reason: 'Civet raté' });

      // ★★★★ : Civet-Filoché si mise perdue = combinaison gagnée
      if (this.state.difficulty >= 4 && bet === combinationPoints && !player.hasItem('civetFiloche')) {
        player.giveItem('civetFiloche');
        this.emit('itemGained', { player, item: 'civetFiloche' });
      }
    }

    this.checkWinCondition(player);
  }

  // === Getters utiles pour l'UI ===

  getState() {
    return {
      phase: this.state.phase,
      currentPlayer: this.state.currentPlayer,
      players: this.state.players,
      turnNumber: this.state.turnNumber,
      difficulty: this.state.difficulty,
      lastCombination: this.state.lastCombination,
      pendingActions: this.state.pendingActions,
      winner: this.state.winner,
      log: this.state.log
    };
  }
}

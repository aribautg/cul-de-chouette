import { GAME_PHASE, DIFFICULTY } from '../utils/constants.js';

export class GameState {
  constructor() {
    this.phase = GAME_PHASE.SETUP;
    this.difficulty = DIFFICULTY.STAR_1;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.turnNumber = 0;
    this.allowNegativeScores = true;
    this.log = [];
    this.lastCombination = null;
    this.pendingActions = [];
    this.winner = null;
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  get activePlayers() {
    return this.players.filter(p => !p.eliminated);
  }

  nextTurn() {
    // Sens anti-horaire
    let nextIndex = this.currentPlayerIndex;
    do {
      nextIndex = (nextIndex + 1) % this.players.length;
    } while (this.players[nextIndex].eliminated && nextIndex !== this.currentPlayerIndex);

    this.currentPlayerIndex = nextIndex;
    this.turnNumber++;
    this.lastCombination = null;
    this.pendingActions = [];
    this.phase = GAME_PHASE.ROLLING_CHOUETTES;
  }

  addLog(entry) {
    this.log.push({
      turn: this.turnNumber,
      timestamp: Date.now(),
      ...entry
    });
  }

  reset() {
    this.phase = GAME_PHASE.SETUP;
    this.currentPlayerIndex = 0;
    this.turnNumber = 0;
    this.log = [];
    this.lastCombination = null;
    this.pendingActions = [];
    this.winner = null;
    this.players.forEach(p => p.reset());
  }
}

/**
 * GameRoom — Une salle de jeu avec son propre état de partie.
 * Le moteur de jeu tourne côté serveur pour éviter la triche.
 */
export class GameRoom {
  constructor(code, config) {
    this.code = code;
    this.hostId = config.hostId;
    this.difficulty = config.difficulty || 1;
    this.allowNegativeScores = config.allowNegativeScores !== false;
    this.players = [];
    this.started = false;
    this.createdAt = Date.now();

    // État de jeu
    this.currentPlayerIndex = 0;
    this.turnNumber = 0;
    this.chouettes = [null, null];
    this.cul = null;
    this.phase = 'lobby'; // lobby, rolling_chouettes, rolling_cul, resolving, action, between_turns, game_over
    this.lastCombination = null;

    // Buzz state
    this.buzzActive = false;
    this.buzzMode = null;
    this.buzzOrder = [];
    this.buzzTimeout = null;
  }

  addPlayer(socketId, name, avatarId) {
    this.players.push({
      id: socketId,
      name,
      avatarId,
      score: 0,
      items: {
        grelottine: false,
        civet: false,
        civetFiloche: false,
        flan: false,
        jarret: null,
        passeGrelot: false,
        rigodon: false
      },
      eliminated: false
    });
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.id !== socketId);
  }

  getPlayerName(socketId) {
    const p = this.players.find(p => p.id === socketId);
    return p ? p.name : 'Inconnu';
  }

  getPlayersInfo() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      score: p.score,
      items: { ...p.items },
      eliminated: p.eliminated,
      isHost: p.id === this.hostId
    }));
  }

  getCurrentPlayerId() {
    if (this.players.length === 0) return null;
    return this.players[this.currentPlayerIndex].id;
  }

  // === Logique de jeu ===

  startGame() {
    this.started = true;
    this.turnNumber = 1;
    this.currentPlayerIndex = 0;
    this.phase = 'rolling_chouettes';
  }

  rollDie() {
    return Math.floor(Math.random() * 6) + 1;
  }

  rollChouettes() {
    this.chouettes = [this.rollDie(), this.rollDie()];
    this.phase = 'rolling_cul';
    return [...this.chouettes];
  }

  rollCul() {
    this.cul = this.rollDie();
    this.phase = 'resolving';
    const allDice = [...this.chouettes, this.cul];
    const combination = this.detectCombination(allDice);
    this.lastCombination = combination;

    // Auto-start buzz for buzz-worthy combinations
    const buzzTypes = ['suite', 'suiteVelutee', 'chouetteVelute', 'artichette', 'neantSouffle'];
    if (buzzTypes.includes(combination.type)) {
      const mode = (combination.type === 'suite' || combination.type === 'suiteVelutee') ? 'lastLoses' : 'firstWins';
      this.startBuzz(mode, 5000);
    }

    return { die: this.cul, allDice, combination };
  }

  detectCombination(dice) {
    const [d1, d2, d3] = dice;
    const sorted = [...dice].sort((a, b) => a - b);

    // Flan (6-5-2) — ★★★★
    if (this.difficulty >= 4 && sorted[0] === 2 && sorted[1] === 5 && sorted[2] === 6) {
      return { type: 'flan', points: 0, dice, description: 'Flan ! (6-5-2)' };
    }

    // Néant Soufflé (1-4-6) — ★★★
    if (this.difficulty >= 3 && sorted[0] === 1 && sorted[1] === 4 && sorted[2] === 6) {
      return { type: 'neantSouffle', points: 0, dice, description: 'Néant Soufflé ! (1-4-6)' };
    }

    // Soufflette (4-2-1) — ★★
    if (this.difficulty >= 2 && sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 4) {
      return { type: 'soufflette', points: 0, dice, description: 'Soufflette ! (4-2-1)' };
    }

    // Bleu-Rouge (3-3-4) — ★★★
    if (this.difficulty >= 3 && sorted[0] === 3 && sorted[1] === 3 && sorted[2] === 4) {
      return { type: 'bleuRouge', points: 9, dice, description: 'Bleu-Rouge ! (3-4-3)' };
    }

    // Artichette (3-3-4) — ★★ seulement
    if (this.difficulty === 2 && sorted[0] === 3 && sorted[1] === 3 && sorted[2] === 4) {
      return { type: 'artichette', points: 16, dice, description: 'Artichette ! (4-3-4)' };
    }

    // Cul de Chouette (3 identiques)
    if (d1 === d2 && d2 === d3) {
      const pts = 40 + 10 * d1;
      return { type: 'culDeChouette', points: pts, value: d1, dice, description: `Cul de Chouette de ${d1} !` };
    }

    // Suite (3 consécutifs)
    if (sorted[1] - sorted[0] === 1 && sorted[2] - sorted[1] === 1) {
      if (this.difficulty >= 2 && sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
        return { type: 'suiteVelutee', points: 0, velutePoints: 18, dice, description: 'Suite-Velutée ! (1-2-3)' };
      }
      return { type: 'suite', points: 0, dice, description: `Suite ! (${sorted.join('-')})` };
    }

    // Chouette-Velute (paire dont la somme = 3ème)
    if (d1 === d2 && d1 + d2 === d3) {
      const pts = 2 * d3 * d3;
      return { type: 'chouetteVelute', points: pts, value: d3, dice, description: `Chouette-Velute de ${d3} !` };
    }
    if (d1 === d3 && d1 + d3 === d2) {
      const pts = 2 * d2 * d2;
      return { type: 'chouetteVelute', points: pts, value: d2, dice, description: `Chouette-Velute de ${d2} !` };
    }
    if (d2 === d3 && d2 + d3 === d1) {
      const pts = 2 * d1 * d1;
      return { type: 'chouetteVelute', points: pts, value: d1, dice, description: `Chouette-Velute de ${d1} !` };
    }

    // Velute (somme de 2 = 3ème)
    const veluteCheck = this._checkVelute(d1, d2, d3);
    if (veluteCheck) {
      const pts = 2 * veluteCheck * veluteCheck;
      return { type: 'velute', points: pts, value: veluteCheck, dice, description: `Velute de ${veluteCheck} !` };
    }

    // Chouette (2 identiques)
    const chouetteVal = this._checkChouette(d1, d2, d3);
    if (chouetteVal) {
      const pts = chouetteVal * chouetteVal;
      return { type: 'chouette', points: pts, value: chouetteVal, dice, description: `Chouette de ${chouetteVal} !` };
    }

    // Néant
    return { type: 'neant', points: 0, dice, description: 'Néant...' };
  }

  _checkVelute(d1, d2, d3) {
    if (d1 + d2 === d3) return d3;
    if (d1 + d3 === d2) return d2;
    if (d2 + d3 === d1) return d1;
    return null;
  }

  _checkChouette(d1, d2, d3) {
    if (d1 === d2) return d1;
    if (d1 === d3) return d1;
    if (d2 === d3) return d2;
    return null;
  }

  // === Buzz ===

  startBuzz(mode, timeoutMs = 5000) {
    this.buzzActive = true;
    this.buzzMode = mode; // 'firstWins' | 'lastLoses'
    this.buzzOrder = [];
    this.buzzTimeout = setTimeout(() => this.resolveBuzz(), timeoutMs);
  }

  registerBuzz(socketId, timestamp) {
    if (!this.buzzActive) return null;
    if (this.buzzOrder.find(b => b.id === socketId)) return null;

    const player = this.players.find(p => p.id === socketId);
    if (!player) return null;

    const position = this.buzzOrder.length + 1;
    this.buzzOrder.push({ id: socketId, timestamp, position });

    const result = { position, playerName: player.name, resolved: false };

    // firstWins : résoudre dès le premier buzz
    if (this.buzzMode === 'firstWins') {
      result.resolved = true;
      result.resolution = this.resolveBuzz();
    }
    // lastLoses : résoudre si tous ont buzzé
    else if (this.buzzOrder.length >= this.players.filter(p => !p.eliminated).length) {
      result.resolved = true;
      result.resolution = this.resolveBuzz();
    }

    return result;
  }

  resolveBuzz() {
    this.buzzActive = false;
    clearTimeout(this.buzzTimeout);

    const activePlayers = this.players.filter(p => !p.eliminated);
    const buzzedIds = this.buzzOrder.map(b => b.id);

    if (this.buzzMode === 'firstWins') {
      if (this.buzzOrder.length === 0) {
        return { mode: 'firstWins', winner: null, timedOut: true };
      }
      return { mode: 'firstWins', winnerId: this.buzzOrder[0].id, timedOut: false };
    }

    if (this.buzzMode === 'lastLoses') {
      const notBuzzed = activePlayers.filter(p => !buzzedIds.includes(p.id));
      if (notBuzzed.length > 0) {
        return { mode: 'lastLoses', losers: notBuzzed.map(p => ({ id: p.id, name: p.name })), timedOut: true };
      }
      const last = this.buzzOrder[this.buzzOrder.length - 1];
      return { mode: 'lastLoses', losers: [{ id: last.id, name: this.getPlayerName(last.id) }], timedOut: false };
    }

    return { mode: this.buzzMode, error: 'unknown' };
  }

  // === Actions ===

  handleAction(socketId, action, params) {
    const player = this.players.find(p => p.id === socketId);
    if (!player) return { success: false, error: 'Joueur introuvable.' };

    switch (action) {
      case 'sirop': return this._doSirop(player);
      case 'skipSirop': return this._skipSirop(player);
      case 'encaisser': return this._encaisser(player);
      default:
        return { success: true, broadcast: true, action, params, playerId: socketId };
    }
  }

  _doSirop(player) {
    if (!this.lastCombination || this.lastCombination.type !== 'chouette') {
      return { success: false, error: 'Sirop impossible ici.' };
    }
    const chouetteVal = this.lastCombination.value;
    const die = this.rollDie();
    const success = die === chouetteVal;

    if (success) {
      const pts = 40 + 10 * chouetteVal;
      player.score += pts;
      return { success: true, broadcast: true, action: 'sirop', siropSuccess: true, die, points: pts, playerId: player.id };
    } else {
      const penalty = chouetteVal * chouetteVal;
      player.score -= penalty;
      const givesCivet = chouetteVal === 6 && !player.items.civet;
      if (givesCivet) player.items.civet = true;
      return { success: true, broadcast: true, action: 'sirop', siropSuccess: false, die, points: -penalty, playerId: player.id, givesCivet };
    }
  }

  _skipSirop(player) {
    if (!this.lastCombination || this.lastCombination.type !== 'chouette') {
      return { success: false, error: 'Pas de chouette à encaisser.' };
    }
    player.score += this.lastCombination.points;
    return { success: true, broadcast: true, action: 'skipSirop', points: this.lastCombination.points, playerId: player.id };
  }

  _encaisser(player) {
    if (!this.lastCombination) return { success: false };
    player.score += this.lastCombination.points;
    return { success: true, broadcast: true, action: 'encaisser', points: this.lastCombination.points, playerId: player.id };
  }

  // === Tour suivant ===

  nextTurn() {
    let next = this.currentPlayerIndex;
    do {
      next = (next + 1) % this.players.length;
    } while (this.players[next].eliminated && next !== this.currentPlayerIndex);

    this.currentPlayerIndex = next;
    this.turnNumber++;
    this.chouettes = [null, null];
    this.cul = null;
    this.lastCombination = null;
    this.phase = 'rolling_chouettes';

    return {
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerId: this.players[this.currentPlayerIndex].id,
      currentPlayerName: this.players[this.currentPlayerIndex].name,
      turnNumber: this.turnNumber,
      players: this.getPlayersInfo()
    };
  }
}

/**
 * BuzzSystem — Gère les réactions en temps réel entre joueurs.
 * 
 * Deux modes :
 * - "firstWins" : Le premier joueur à appuyer gagne (Chouette-Velute, Artichette, etc.)
 * - "lastLoses" : Le dernier joueur à appuyer perd (Suite)
 * 
 * Chaque joueur a une touche assignée (1-9 ou configurable).
 * Un countdown visuel s'affiche. À la fin, les non-répondants sont considérés "derniers".
 */
export class BuzzSystem {
  constructor() {
    this.active = false;
    this.mode = null; // 'firstWins' | 'lastLoses'
    this.players = [];
    this.buzzOrder = []; // ordre dans lequel les joueurs ont buzzé
    this.keyMap = {};    // touche → playerIndex
    this.timeoutMs = 5000;
    this.timer = null;
    this.startTime = null;
    this.onComplete = null;
    this.onBuzz = null;

    this._keyHandler = this._handleKey.bind(this);
  }

  /**
   * Lance une phase de buzz.
   * @param {Object} config
   */
  start(config) {
    this.active = true;
    this.mode = config.mode; // 'firstWins' | 'lastLoses'
    this.players = config.players; // [{index, name, key}]
    this.buzzOrder = [];
    this.timeoutMs = config.timeout || 5000;
    this.onComplete = config.onComplete;
    this.onBuzz = config.onBuzz || null;
    this.startTime = performance.now();

    // Construire le keyMap
    this.keyMap = {};
    this.players.forEach(p => {
      this.keyMap[p.key] = p.index;
    });

    // Écouter le clavier
    document.addEventListener('keydown', this._keyHandler);

    // Timer de fin
    this.timer = setTimeout(() => {
      this._finish();
    }, this.timeoutMs);
  }

  _handleKey(event) {
    if (!this.active) return;

    const key = event.key;
    if (!(key in this.keyMap)) return;

    const playerIndex = this.keyMap[key];

    // Vérifier que ce joueur n'a pas déjà buzzé
    if (this.buzzOrder.find(b => b.playerIndex === playerIndex)) return;

    const elapsed = performance.now() - this.startTime;
    this.buzzOrder.push({
      playerIndex,
      time: elapsed
    });

    // Callback à chaque buzz individuel
    if (this.onBuzz) {
      this.onBuzz({
        playerIndex,
        position: this.buzzOrder.length,
        time: elapsed,
        total: this.players.length
      });
    }

    // En mode "firstWins", on termine dès qu'un joueur a buzzé
    if (this.mode === 'firstWins') {
      this._finish();
      return;
    }

    // En mode "lastLoses", on termine si tous ont buzzé
    if (this.buzzOrder.length >= this.players.length) {
      this._finish();
    }
  }

  _finish() {
    this.active = false;
    document.removeEventListener('keydown', this._keyHandler);
    clearTimeout(this.timer);

    const result = this._computeResult();
    if (this.onComplete) {
      this.onComplete(result);
    }
  }

  _computeResult() {
    if (this.mode === 'firstWins') {
      if (this.buzzOrder.length === 0) {
        // Personne n'a buzzé → pas de gagnant
        return { mode: 'firstWins', winner: null, order: [], timedOut: true };
      }

      // Vérifier les égalités (buzzs dans les 100ms l'un de l'autre)
      const first = this.buzzOrder[0];
      const tied = this.buzzOrder.filter(b => Math.abs(b.time - first.time) < 100);

      if (tied.length > 1) {
        return {
          mode: 'firstWins',
          winner: null,
          tied: tied.map(b => b.playerIndex),
          order: this.buzzOrder.map(b => b.playerIndex),
          timedOut: false
        };
      }

      return {
        mode: 'firstWins',
        winner: first.playerIndex,
        order: this.buzzOrder.map(b => b.playerIndex),
        timedOut: false
      };
    }

    if (this.mode === 'lastLoses') {
      // Ceux qui n'ont pas buzzé sont "derniers"
      const buzzedIndices = this.buzzOrder.map(b => b.playerIndex);
      const notBuzzed = this.players
        .filter(p => !buzzedIndices.includes(p.index))
        .map(p => p.index);

      if (notBuzzed.length > 0) {
        // Les non-buzzeurs sont les perdants
        if (notBuzzed.length === 1) {
          return {
            mode: 'lastLoses',
            loser: notBuzzed[0],
            losers: notBuzzed,
            order: this.buzzOrder.map(b => b.playerIndex),
            timedOut: true
          };
        }
        // Plusieurs n'ont pas buzzé → égalité entre eux
        return {
          mode: 'lastLoses',
          loser: null,
          losers: notBuzzed,
          tied: notBuzzed,
          order: this.buzzOrder.map(b => b.playerIndex),
          timedOut: true
        };
      }

      // Tout le monde a buzzé → le dernier est le perdant
      const last = this.buzzOrder[this.buzzOrder.length - 1];
      // Vérifier égalité entre les 2 derniers
      if (this.buzzOrder.length >= 2) {
        const secondToLast = this.buzzOrder[this.buzzOrder.length - 2];
        if (Math.abs(last.time - secondToLast.time) < 100) {
          // Égalité entre les derniers
          const tied = this.buzzOrder
            .filter(b => Math.abs(b.time - last.time) < 100)
            .map(b => b.playerIndex);
          return {
            mode: 'lastLoses',
            loser: null,
            losers: tied,
            tied,
            order: this.buzzOrder.map(b => b.playerIndex),
            timedOut: false
          };
        }
      }

      return {
        mode: 'lastLoses',
        loser: last.playerIndex,
        losers: [last.playerIndex],
        order: this.buzzOrder.map(b => b.playerIndex),
        timedOut: false
      };
    }

    return { mode: this.mode, error: 'Mode inconnu' };
  }

  /**
   * Annuler un buzz en cours
   */
  cancel() {
    this.active = false;
    document.removeEventListener('keydown', this._keyHandler);
    clearTimeout(this.timer);
  }

  /**
   * Indique si le buzz est en cours
   */
  isActive() {
    return this.active;
  }

  /**
   * Retourne le nombre de joueurs ayant déjà buzzé
   */
  getBuzzCount() {
    return this.buzzOrder.length;
  }
}

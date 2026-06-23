import { AVATARS } from '../utils/constants.js';

/**
 * BuzzOverlay — Affiche l'interface visuelle pendant un buzz.
 * Montre le countdown, les touches à presser, et qui a buzzé.
 */
export class BuzzOverlay {
  constructor() {
    this.overlay = null;
    this.countdownInterval = null;
    this._createDOM();
  }

  _createDOM() {
    // Ne créer qu'une seule fois
    if (document.getElementById('buzz-overlay')) {
      this.overlay = document.getElementById('buzz-overlay');
      return;
    }
    this.overlay = document.createElement('div');
    this.overlay.id = 'buzz-overlay';
    this.overlay.className = 'buzz-overlay';
    this.overlay.innerHTML = `
      <div class="buzz-content rpg-window">
        <div class="buzz-title" id="buzz-title">BUZZ !</div>
        <div class="buzz-instruction" id="buzz-instruction"></div>
        <div class="buzz-countdown" id="buzz-countdown">5.0</div>
        <div class="buzz-players" id="buzz-players"></div>
        <div class="buzz-result" id="buzz-result"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  /**
   * Affiche l'overlay de buzz
   */
  show(config) {
    const { mode, title, instruction, players, timeoutMs } = config;

    document.getElementById('buzz-title').textContent = title;
    document.getElementById('buzz-instruction').textContent = instruction;
    document.getElementById('buzz-result').textContent = '';

    // Afficher les joueurs avec leurs touches
    const playersHtml = players.map(p => {
      const avatar = AVATARS.find(a => a.id === p.avatarId) || AVATARS[0];
      return `
        <div class="buzz-player" id="buzz-player-${p.index}" data-index="${p.index}">
          <div class="buzz-player-avatar" style="background: ${avatar.color}">
            ${avatar.name[0]}
          </div>
          <div class="buzz-player-name">${p.name}</div>
          <div class="buzz-player-key">${p.key}</div>
          <div class="buzz-player-status" id="buzz-status-${p.index}">⏳</div>
        </div>
      `;
    }).join('');
    document.getElementById('buzz-players').innerHTML = playersHtml;

    // Démarrer le countdown
    const startTime = performance.now();
    const countdownEl = document.getElementById('buzz-countdown');

    this.countdownInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, (timeoutMs - elapsed) / 1000);
      countdownEl.textContent = remaining.toFixed(1);

      // Changer la couleur si le temps est court
      if (remaining < 2) {
        countdownEl.classList.add('buzz-countdown-urgent');
      }
    }, 50);

    this.overlay.classList.add('active');
  }

  /**
   * Marque un joueur comme ayant buzzé
   */
  markBuzzed(playerIndex, position) {
    const statusEl = document.getElementById(`buzz-status-${playerIndex}`);
    const playerEl = document.getElementById(`buzz-player-${playerIndex}`);
    if (statusEl) {
      statusEl.textContent = `#${position} ✅`;
      statusEl.classList.add('buzzed');
    }
    if (playerEl) {
      playerEl.classList.add('buzz-player-done');
    }
  }

  /**
   * Affiche le résultat final
   */
  showResult(text, type) {
    clearInterval(this.countdownInterval);
    const resultEl = document.getElementById('buzz-result');
    if (resultEl) {
      resultEl.textContent = text;
      resultEl.className = `buzz-result buzz-result-${type}`;
    }
  }

  /**
   * Cache l'overlay
   */
  hide() {
    clearInterval(this.countdownInterval);
    this.overlay.classList.remove('active');
    const countdownEl = document.getElementById('buzz-countdown');
    if (countdownEl) countdownEl.classList.remove('buzz-countdown-urgent');
  }

  /**
   * Cache après un délai (pour laisser le joueur voir le résultat)
   */
  hideAfterDelay(ms = 2000) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.hide();
        resolve();
      }, ms);
    });
  }
}

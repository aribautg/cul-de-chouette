import { AVATARS } from '../utils/constants.js';
import { DiceAnimator } from '../ui/DiceAnimator.js';
import { BuzzOverlay } from '../ui/BuzzOverlay.js';
import { SoundManager } from '../ui/SoundManager.js';
import { ParticleSystem } from '../ui/ParticleSystem.js';

/**
 * OnlineGameUI — Bridge between server events and the game UI in online mode.
 * Replaces the local GameEngine for rendering: all game state comes FROM the server.
 */
export class OnlineGameUI {
  constructor(network, gameData) {
    this.network = network;
    this.diceAnimator = new DiceAnimator();
    this.buzzOverlay = new BuzzOverlay();
    this.sound = new SoundManager();
    this.particles = new ParticleSystem();

    // Game state from server
    this.players = gameData.players || [];
    this.difficulty = gameData.difficulty || 1;
    this.currentPlayerIndex = gameData.currentPlayerIndex || 0;
    this.turnNumber = gameData.turnNumber || 1;
    this.lastCombination = null;
    this.myPlayerId = network.playerId;

    // Buzz state
    this.buzzActive = false;
    this._buzzKeyHandler = null;

    this._bindServerEvents();
    this._bindLocalUI();
    this._renderInitialState();
  }

  // === SERVER EVENT LISTENERS ===

  _bindServerEvents() {
    this.network.on('chouettesRolled', (data) => this._onChouettesRolled(data));
    this.network.on('culRolled', (data) => this._onCulRolled(data));
    this.network.on('actionResult', (data) => this._onActionResult(data));
    this.network.on('turnStarted', (data) => this._onTurnStarted(data));
    this.network.on('buzzRegistered', (data) => this._onBuzzRegistered(data));
    this.network.on('buzzResolved', (data) => this._onBuzzResolved(data));
    this.network.on('gameStarted', (data) => this._onGameRestarted(data));
  }

  _bindLocalUI() {
    // In-game buttons (sound, log, rules) stay as-is from local mode
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const enabled = this.sound.toggle();
        soundBtn.textContent = enabled ? '🔊' : '🔇';
      });
    }
  }

  // === INITIAL RENDER ===

  _renderInitialState() {
    this._updateHeader();
    this._renderScoreboard();
    this._resetDice();

    // Show actions only for the current player
    if (this._isMyTurn()) {
      this._setExplanation(
        'Prêt à jouer',
        `C'est votre tour ! Lancez les Chouettes.`
      );
      this._setActions([{
        label: '🎲 Lancer les Chouettes',
        className: 'btn btn-primary',
        action: () => this._doRollChouettes()
      }]);
    } else {
      const currentPlayer = this.players[this.currentPlayerIndex];
      this._setExplanation(
        'En attente...',
        `C'est au tour de ${currentPlayer?.name || '???'}. Patience...`
      );
      this._setActions([]);
    }
  }

  // === PLAYER ACTIONS (sent to server) ===

  async _doRollChouettes() {
    if (!this._isMyTurn()) return;
    this.sound.diceRoll();
    this._setActions([]); // Disable buttons while waiting
    const res = await this.network.rollChouettes();
    if (!res.success) {
      this._setExplanation('⚠️ Erreur', res.error || 'Impossible de lancer.');
    }
    // The actual result comes via the 'chouettesRolled' event
  }

  async _doRollCul() {
    if (!this._isMyTurn()) return;
    this.sound.diceRoll();
    this._setActions([]);
    const res = await this.network.rollCul();
    if (!res.success) {
      this._setExplanation('⚠️ Erreur', res.error || 'Impossible de lancer.');
    }
    // The actual result comes via the 'culRolled' event
  }

  async _doAction(action, params = {}) {
    const res = await this.network.sendAction(action, params);
    if (!res.success && res.error) {
      this._setExplanation('⚠️ Erreur', res.error);
    }
    // Result comes via 'actionResult' event
  }

  _doBuzz() {
    this.network.buzz();
  }

  _doNextTurn() {
    this.network.nextTurn();
  }

  // === SERVER EVENT HANDLERS ===

  _onChouettesRolled(data) {
    const { dice, playerId } = data;
    const playerName = this._getPlayerName(playerId);

    // Animate on ALL clients
    this.sound.diceRoll();
    this.diceAnimator.roll(dice[0]).then(() => {
      this._renderDie('die-1', dice[0]);
      this.sound.diceLand();
      return this.diceAnimator.rollQuick(dice[1]);
    }).then(() => {
      this._renderDie('die-2', dice[1]);
      this.sound.diceLand();
      this._setDieState('die-3', 'empty');

      if (this._isMyTurn()) {
        this._setExplanation(
          'Chouettes lancées !',
          `Vous avez obtenu ${dice[0]} et ${dice[1]}. Lancez maintenant le Cul.`
        );
        this._setActions([{
          label: '🎲 Lancer le Cul',
          className: 'btn btn-primary',
          action: () => this._doRollCul()
        }]);
      } else {
        this._setExplanation(
          'Chouettes lancées !',
          `${playerName} a obtenu ${dice[0]} et ${dice[1]}. En attente du Cul...`
        );
        this._setActions([]);
      }
    });
  }

  _onCulRolled(data) {
    const { die, allDice, combination } = data;
    this.lastCombination = combination;

    // Animate the cul die on ALL clients
    this.sound.diceRoll();
    this.diceAnimator.roll(die).then(() => {
      this.sound.diceLand();
      this._renderDie('die-3', die);

      // Show combination info
      this._setExplanation(
        combination.description,
        combination.explanation || this._getCombinationExplanation(combination)
      );

      // Render action buttons based on combination type
      this._renderOnlineActions(combination);
    });
  }

  _onActionResult(data) {
    const { action, playerId, points, siropSuccess, givesCivet } = data;
    const playerName = this._getPlayerName(playerId);

    // Update player score locally
    const player = this.players.find(p => p.id === playerId);
    if (player && points !== undefined) {
      player.score += points;
    }

    // Sound effects
    if (points > 0) {
      this.sound.scoreGain();
    } else if (points < 0) {
      this.sound.scoreLoss();
    }

    // Display result based on action type
    switch (action) {
      case 'sirop':
        if (siropSuccess) {
          this._setExplanation('🎉 Sirop réussi !',
            `${playerName} réussit le Sirop ! +${points} pts`);
        } else {
          let msg = `${playerName} rate le Sirop... ${points} pts`;
          if (givesCivet) msg += ' Mais gagne un Civet !';
          this._setExplanation('❌ Sirop raté...', msg);
        }
        break;

      case 'skipSirop':
        this._setExplanation('✋ Chouette encaissée',
          `${playerName} encaisse la Chouette. +${points} pts`);
        break;

      case 'encaisser':
        this._setExplanation('✅ Points encaissés',
          `${playerName} encaisse ${points} pts.`);
        break;

      default:
        if (data.description) {
          this._setExplanation('Résultat', data.description);
        }
        break;
    }

    this._renderScoreboard();

    // After action, show next turn button (for current player or host)
    if (this._isMyTurn() || this._isHost()) {
      this._setActions([{
        label: '➡️ Tour Suivant',
        className: 'btn btn-primary',
        action: () => this._doNextTurn()
      }]);
    } else {
      this._setActions([]);
    }
  }

  _onTurnStarted(data) {
    const { currentPlayerIndex, currentPlayerId, currentPlayerName, turnNumber, players } = data;
    this.currentPlayerIndex = currentPlayerIndex;
    this.turnNumber = turnNumber;

    // Update player data from server (scores, items, etc.)
    if (players) {
      this.players = players;
    }

    this._updateHeader();
    this._renderScoreboard();
    this._resetDice();

    if (this._isMyTurn()) {
      this._setExplanation(
        'Prêt à jouer',
        `C'est votre tour ! Lancez les Chouettes.`
      );
      this._setActions([{
        label: '🎲 Lancer les Chouettes',
        className: 'btn btn-primary',
        action: () => this._doRollChouettes()
      }]);
    } else {
      this._setExplanation(
        'En attente...',
        `C'est au tour de ${currentPlayerName}. Patience...`
      );
      this._setActions([]);
    }
  }

  _onBuzzRegistered(data) {
    const { playerId, position, playerName } = data;
    // Update the buzz overlay
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx !== -1) {
      this.buzzOverlay.markBuzzed(playerIdx, position);
    }
    this.sound.diceLand(); // A short sound for buzz
  }

  _onBuzzResolved(data) {
    const { mode, winnerId, losers, timedOut } = data;
    this.buzzActive = false;
    this._removeBuzzKeyHandler();

    if (mode === 'firstWins') {
      if (winnerId) {
        const winnerName = this._getPlayerName(winnerId);
        this.buzzOverlay.showResult(
          `${winnerName} est le plus rapide !`, 'win'
        );
      } else {
        this.buzzOverlay.showResult(
          'Personne n\'a buzzé à temps.', 'tie'
        );
      }
    } else if (mode === 'lastLoses') {
      if (losers && losers.length > 0) {
        const names = losers.map(l => l.name || this._getPlayerName(l.id)).join(', ');
        this.buzzOverlay.showResult(
          `${names} ${losers.length > 1 ? 'sont les derniers' : 'est le dernier'} !`, 'lose'
        );
      } else if (timedOut) {
        this.buzzOverlay.showResult('Temps écoulé !', 'tie');
      }
    }

    this.buzzOverlay.hideAfterDelay(2500).then(() => {
      // After buzz, show next turn button for current player / host
      if (this._isMyTurn() || this._isHost()) {
        this._setActions([{
          label: '➡️ Tour Suivant',
          className: 'btn btn-primary',
          action: () => this._doNextTurn()
        }]);
      }
    });
  }

  _onGameRestarted(data) {
    // Handle if game restarts mid-session
    this.players = data.players || [];
    this.difficulty = data.difficulty || 1;
    this.currentPlayerIndex = data.currentPlayerIndex || 0;
    this.turnNumber = data.turnNumber || 1;
    this._renderInitialState();
  }

  // === ONLINE ACTION RENDERING ===

  _renderOnlineActions(combination) {
    const type = combination.type;

    // For combinations that need buzz, ALL players see the buzz UI
    if (type === 'suite' || type === 'suiteVelutee') {
      this._startOnlineBuzz('lastLoses', '🥶 Grelotte ça picote !',
        'Le DERNIER à buzzer perd 10 pts ! Appuyez sur ESPACE.');
      return;
    }

    if (type === 'chouetteVelute') {
      this._startOnlineBuzz('firstWins', '👏 Pas mou le caillou !',
        `Le PREMIER à buzzer gagne ${combination.points} pts ! Appuyez sur ESPACE.`);
      return;
    }

    if (type === 'artichette') {
      this._startOnlineBuzz('firstWins', '🎵 Artichette !',
        'Lanceur : "Raitournelle!" — Adversaires : "Artichette!" Appuyez sur ESPACE.');
      return;
    }

    if (type === 'neantSouffle') {
      this._startOnlineBuzz('firstWins', '👃 Mécréant !',
        'Le PREMIER à buzzer gagne une Grelottine ! Appuyez sur ESPACE.');
      return;
    }

    // For combinations that only the current player acts on
    if (!this._isMyTurn()) {
      const playerName = this.players[this.currentPlayerIndex]?.name || '???';
      this._setExplanation(combination.description,
        `En attente de la décision de ${playerName}...`);
      this._setActions([]);
      return;
    }

    // Current player's actions
    const buttons = [];

    if (type === 'chouette') {
      buttons.push({
        label: '🍯 Je sirote !',
        className: 'btn btn-success',
        action: () => this._doAction('sirop')
      });
      buttons.push({
        label: '✋ Encaisser la Chouette',
        className: 'btn',
        action: () => this._doAction('skipSirop')
      });
    }

    else if (type === 'culDeChouette') {
      // Auto-encaisser on server, or explicit action
      buttons.push({
        label: `✅ Encaisser le Cul de Chouette (+${combination.points})`,
        className: 'btn btn-success',
        action: () => this._doAction('encaisser')
      });
    }

    else if (type === 'velute') {
      buttons.push({
        label: `✅ Encaisser la Velute (+${combination.points})`,
        className: 'btn btn-success',
        action: () => this._doAction('encaisser')
      });
    }

    else if (type === 'soufflette') {
      buttons.push({
        label: '⚔️ En garde ma mignonne !',
        className: 'btn btn-danger',
        action: () => this._doAction('soufflette')
      });
      buttons.push({
        label: '✋ Ne pas défier',
        className: 'btn',
        action: () => this._doAction('skipSoufflette')
      });
    }

    else if (type === 'bleuRouge') {
      buttons.push({
        label: '🎲 Lancer le Bleu-Rouge',
        className: 'btn btn-primary',
        action: () => this._doAction('bleuRouge')
      });
    }

    else if (type === 'flan') {
      buttons.push({
        label: '☝️ À Kadoc !',
        className: 'btn btn-success',
        action: () => this._doAction('flan')
      });
    }

    else if (type === 'neant') {
      // Néant: auto-resolve, show next turn
      buttons.push({
        label: '➡️ Tour Suivant',
        className: 'btn btn-primary',
        action: () => this._doNextTurn()
      });
    }

    else {
      // Fallback for unhandled combination types
      buttons.push({
        label: '➡️ Tour Suivant',
        className: 'btn btn-primary',
        action: () => this._doNextTurn()
      });
    }

    this._setActions(buttons);
  }

  // === ONLINE BUZZ ===

  _startOnlineBuzz(mode, title, instruction) {
    this.buzzActive = true;

    // Build player list for the overlay
    const buzzPlayers = this.players
      .filter(p => !p.eliminated)
      .map((p, i) => ({
        index: i,
        name: p.name,
        avatarId: p.avatarId,
        key: 'ESPACE'
      }));

    this.buzzOverlay.show({
      mode,
      title,
      instruction,
      players: buzzPlayers,
      timeoutMs: 5000
    });

    // Listen for SPACE key to send buzz to server
    this._removeBuzzKeyHandler();
    this._buzzKeyHandler = (e) => {
      if (!this.buzzActive) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this._doBuzz();
        this.buzzActive = false;
        this._removeBuzzKeyHandler();
      }
    };
    document.addEventListener('keydown', this._buzzKeyHandler);

    // Also provide a clickable button as fallback
    this._setActions([{
      label: '⚡ BUZZ ! (ou appuyez ESPACE)',
      className: 'btn btn-danger',
      action: () => {
        if (this.buzzActive) {
          this._doBuzz();
          this.buzzActive = false;
          this._removeBuzzKeyHandler();
          this._setActions([]);
        }
      }
    }]);
  }

  _removeBuzzKeyHandler() {
    if (this._buzzKeyHandler) {
      document.removeEventListener('keydown', this._buzzKeyHandler);
      this._buzzKeyHandler = null;
    }
  }

  // === UI RENDERING HELPERS ===

  _updateHeader() {
    const turnEl = document.getElementById('turn-number');
    const nameEl = document.getElementById('current-player-name');
    if (turnEl) turnEl.textContent = `Tour ${this.turnNumber}`;
    if (nameEl) {
      const current = this.players[this.currentPlayerIndex];
      nameEl.textContent = current ? current.name : '???';
    }
  }

  _renderScoreboard() {
    const container = document.getElementById('scoreboard');
    if (!container) return;
    container.innerHTML = '';

    this.players.forEach((player, idx) => {
      const avatar = AVATARS.find(a => a.id === player.avatarId) || AVATARS[0];
      const isActive = idx === this.currentPlayerIndex;
      const isMe = player.id === this.myPlayerId;
      const progress = Math.max(0, Math.min(100, (player.score / 343) * 100));
      // Flame level: 0=rien, 1=dès 1pt, puis progression non-linéaire pour plus de drame
      const flameLevel = player.score <= 0 ? 0 : Math.min(7, Math.max(1, Math.ceil(Math.sqrt(progress / 100 * 49))));

      const card = document.createElement('div');
      card.className = `player-card ${isActive ? 'active' : ''} ${player.eliminated ? 'eliminated' : ''} ${isMe ? 'is-me' : ''}`;
      card.innerHTML = `
        <div class="player-webcam-slot" id="webcam-slot-${player.id}"></div>
        <div class="player-avatar" style="background: ${avatar.color};">${avatar.name[0]}</div>
        <div class="player-card-name">${player.name}${isMe ? ' (vous)' : ''}</div>
        <div class="player-card-score">${player.score}</div>
        <div class="player-card-items">${this._renderItemIcons(player)}</div>
        <div class="player-card-progress">
          <div class="excalibur-sword" data-progress="${flameLevel}">
            <svg viewBox="0 0 200 36" xmlns="http://www.w3.org/2000/svg">
              <polygon points="4,18 12,12 160,13 165,18 160,23 12,24" fill="#b8b8c8" stroke="#6a6a80" stroke-width="0.8"/>
              <line x1="12" y1="18" x2="160" y2="18" stroke="#f0f0ff" stroke-width="1.5" opacity="0.5"/>
              <polygon points="0,18 4,18 12,12 12,24" fill="#d8d8e8" stroke="#8888a0" stroke-width="0.5"/>
              <rect x="30" y="16" width="120" height="4" rx="2" fill="#9898b0" opacity="0.4"/>
              <rect x="160" y="4" width="6" height="28" rx="2" fill="#d4af37" stroke="#8b7320" stroke-width="0.8"/>
              <rect x="161" y="6" width="4" height="4" rx="1" fill="#f0d060" opacity="0.6"/>
              <rect x="161" y="26" width="4" height="4" rx="1" fill="#f0d060" opacity="0.6"/>
              <rect x="166" y="11" width="22" height="14" rx="3" fill="#3a2718" stroke="#1a0a00" stroke-width="0.8"/>
              <line x1="170" y1="11" x2="170" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <line x1="175" y1="11" x2="175" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <line x1="180" y1="11" x2="180" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <line x1="185" y1="11" x2="185" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <ellipse cx="192" cy="18" rx="6" ry="7" fill="#d4af37" stroke="#8b7320" stroke-width="0.8"/>
              <circle cx="192" cy="18" r="3.5" fill="#a82039"/>
              <circle cx="191" cy="17" r="1.2" fill="#ff6080" opacity="0.6"/>
            </svg>
            <div class="excalibur-flame" style="--flame-solid: ${Math.max(0, progress - 15)}%; --flame-fade: ${progress}%;">
              <div class="flame-particle"></div>
              <div class="flame-particle"></div>
              <div class="flame-particle"></div>
              <div class="flame-particle"></div>
              <div class="flame-particle"></div>
              <div class="flame-particle"></div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Migrate webcam streams into the scoreboard slots
    this._attachWebcamStreams();
  }

  /**
   * Attache les streams WebRTC aux slots webcam du scoreboard.
   */
  _attachWebcamStreams() {
    if (!this._webrtcManager) return;

    // Local video → my slot
    if (this._webrtcManager.localStream) {
      const mySlot = document.getElementById(`webcam-slot-${this.myPlayerId}`);
      if (mySlot && !mySlot.querySelector('video')) {
        const video = document.createElement('video');
        video.srcObject = this._webrtcManager.localStream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.className = 'webcam-mini';
        mySlot.appendChild(video);
      }
    }

    // Remote videos → peer slots
    this._webrtcManager.peers.forEach((peer, peerId) => {
      if (peer.remoteStream) {
        const slot = document.getElementById(`webcam-slot-${peerId}`);
        if (slot && !slot.querySelector('video')) {
          const video = document.createElement('video');
          video.srcObject = peer.remoteStream;
          video.autoplay = true;
          video.playsInline = true;
          video.className = 'webcam-mini';
          slot.appendChild(video);
        }
      }
    });
  }

  /**
   * Injecte le WebRTCManager pour afficher les streams dans le jeu.
   */
  setWebRTCManager(webrtc) {
    this._webrtcManager = webrtc;
  }

  _renderItemIcons(player) {
    if (!player.items) return '';
    let html = '';
    if (player.items.grelottine) html += '<span class="item-icon" title="Grelottine">🛡️</span>';
    if (player.items.civet) html += '<span class="item-icon" title="Civet">🏺</span>';
    if (player.items.civetFiloche) html += '<span class="item-icon" title="Civet-Filoché">🧵</span>';
    if (player.items.flan) html += '<span class="item-icon" title="Flan">🎯</span>';
    if (player.items.jarret) html += '<span class="item-icon" title="Jarret">⚔️</span>';
    if (player.items.passeGrelot) html += '<span class="item-icon" title="Passe-Grelot">🔄</span>';
    if (player.items.rigodon) html += '<span class="item-icon" title="Rigodon">🎵</span>';
    return html;
  }

  _renderDie(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('empty', 'dice-landed', 'dice-rolling');

    el.classList.add('dice-rolling');
    let shuffles = 0;
    const maxShuffles = 6;
    const interval = setInterval(() => {
      el.textContent = Math.ceil(Math.random() * 6);
      shuffles++;
      if (shuffles >= maxShuffles) {
        clearInterval(interval);
        el.textContent = value;
        el.classList.remove('dice-rolling');
        el.classList.add('dice-landed');
        setTimeout(() => el.classList.remove('dice-landed'), 500);
      }
    }, 60);
  }

  _setDieState(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    if (state === 'empty') {
      el.textContent = '?';
      el.classList.add('empty');
    }
  }

  _resetDice() {
    ['die-1', 'die-2', 'die-3'].forEach(id => this._setDieState(id, 'empty'));
  }

  _setExplanation(title, text) {
    const titleEl = document.getElementById('explanation-title');
    const textEl = document.getElementById('explanation-text');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
  }

  _setActions(buttons) {
    const zone = document.getElementById('action-zone');
    if (!zone) return;
    zone.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.className || 'btn';
      btn.textContent = b.label;
      btn.addEventListener('click', b.action);
      zone.appendChild(btn);
    });
  }

  // === UTILITY METHODS ===

  _isMyTurn() {
    const current = this.players[this.currentPlayerIndex];
    return current && current.id === this.myPlayerId;
  }

  _isHost() {
    const me = this.players.find(p => p.id === this.myPlayerId);
    return me && me.isHost;
  }

  _getPlayerName(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.name : 'Inconnu';
  }

  _getCombinationExplanation(combination) {
    const type = combination.type;
    switch (type) {
      case 'chouette':
        return `Chouette de ${combination.value} ! Vaut ${combination.points} pts. Le lanceur peut tenter un Sirop ou encaisser.`;
      case 'velute':
        return `Velute de ${combination.value} ! Vaut ${combination.points} pts.`;
      case 'chouetteVelute':
        return `Chouette-Velute de ${combination.value} ! Le premier à crier "Pas mou le caillou !" gagne ${combination.points} pts.`;
      case 'culDeChouette':
        return `Cul de Chouette de ${combination.value} ! Vaut ${combination.points} pts.`;
      case 'suite':
        return `Suite ! Le dernier à crier "Grelotte ça picote !" perd 10 pts.`;
      case 'suiteVelutee':
        return `Suite-Velutée ! Le dernier à crier "Grelotte ça picote !" perd 10 pts, puis la Velute de 3 est en jeu.`;
      case 'artichette':
        return `Artichette ! Course entre le lanceur ("Raitournelle !") et les adversaires ("Artichette !").`;
      case 'bleuRouge':
        return `Bleu-Rouge ! Tous les joueurs misent sur la relance.`;
      case 'soufflette':
        return `Soufflette ! Le lanceur peut défier un adversaire.`;
      case 'neantSouffle':
        return `Néant Soufflé ! Le premier à crier "Mécréant !" gagne une Grelottine.`;
      case 'flan':
        return `Flan ! Le lanceur peut récupérer un Flan.`;
      case 'neant':
        return `Rien de spécial ce tour-ci.`;
      default:
        return combination.description || '';
    }
  }

  // === CLEANUP ===

  destroy() {
    this._removeBuzzKeyHandler();
  }
}

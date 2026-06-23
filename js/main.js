import { GameEngine } from './game/GameEngine.js';
import { AVATARS, DIFFICULTY, GAME_PHASE } from './utils/constants.js';
import { BuzzSystem } from './ui/BuzzSystem.js';
import { BuzzOverlay } from './ui/BuzzOverlay.js';
import { SoundManager } from './ui/SoundManager.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { RulesPanel } from './ui/RulesPanel.js';
import { SouffletteUI } from './ui/SouffletteUI.js';
import { DiceAnimator } from './ui/DiceAnimator.js';
import { LobbyUI } from './network/LobbyUI.js';

// === APPLICATION PRINCIPALE ===
class App {
  constructor() {
    this.engine = new GameEngine();
    this.buzz = new BuzzSystem();
    this.buzzOverlay = new BuzzOverlay();
    this.sound = new SoundManager();
    this.particles = new ParticleSystem();
    this.diceAnimator = new DiceAnimator();
    this.lobby = new LobbyUI('https://cul-de-chouette-production.up.railway.app');
    this.rulesPanel = null;
    this.gameMode = 'local'; // 'local' or 'online'
    this.onlineGameUI = null;
    this.selectedDifficulty = 1;
    this.pendingVerdierBets = {};
    this.activeJarret = null;
    this.activeFlan = null;
    this.pendingCivetFiloche = null;
    this.tichette = null;
    this.players = [
      { name: 'Joueur 1', avatarId: 'perceval' },
      { name: 'Joueur 2', avatarId: 'karadoc' }
    ];

    // Wire up lobby game start callback
    this.lobby.onGameStart = (data, onlineGameUI) => {
      this.gameMode = 'online';
      this.onlineGameUI = onlineGameUI;
    };

    this.init();
  }

  init() {
    this.bindTitleScreen();
    this.bindSetupScreen();
    this.bindGameScreen();
    this.bindDashboard();
    this.bindLogPanel();
    this.bindEngineEvents();
    this.renderPlayersList();
  }

  // === Navigation entre écrans ===
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // === TITRE ===
  bindTitleScreen() {
    document.getElementById('btn-new-game').addEventListener('click', () => {
      this.showScreen('setup-screen');
    });
    document.getElementById('btn-rules').addEventListener('click', () => {
      alert('Les règles complètes seront bientôt disponibles dans un panneau dédié !');
    });
    document.getElementById('btn-credits').addEventListener('click', () => {
      alert('Cul de Chouette — Inspiré de Kaamelott par Alexandre Astier.\nRègles compilées par la communauté (Wikibooks).\nDéveloppé avec ❤️');
    });
  }

  // === SETUP ===
  bindSetupScreen() {
    // Difficulté
    const diffOptions = document.querySelectorAll('.difficulty-option');
    const descriptions = {
      1: 'Règles de base : Chouette, Velute, Suite, Cul de Chouette, Sirop, Grelottine, Civet.',
      2: 'Ajoute : Artichette, Soufflette, Attrape-Oiseau, Achat, Cul de Chouette Doublé, Graines.',
      3: 'Ajoute : Bleu-Rouge (remplace Artichette), Pélican, Jarret, Verdier, Néant Soufflé.',
      4: 'Toutes les règles : Flan, Tichette, Civet-Filoché. Le jeu complet dans sa version la plus folle.'
    };
    diffOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        diffOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.selectedDifficulty = parseInt(opt.dataset.difficulty);
        document.getElementById('difficulty-description').textContent = descriptions[this.selectedDifficulty];
      });
    });

    // Joueurs
    document.getElementById('btn-add-player').addEventListener('click', () => {
      if (this.players.length >= 16) return;
      const idx = this.players.length;
      const avatar = AVATARS[idx % AVATARS.length];
      this.players.push({ name: `Joueur ${idx + 1}`, avatarId: avatar.id });
      this.renderPlayersList();
    });

    document.getElementById('btn-remove-player').addEventListener('click', () => {
      if (this.players.length <= 2) return;
      this.players.pop();
      this.renderPlayersList();
    });

    // Retour
    document.getElementById('btn-back-title').addEventListener('click', () => {
      this.showScreen('title-screen');
    });

    // Lancer la partie
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.startGame();
    });
  }

  renderPlayersList() {
    const container = document.getElementById('players-list');
    container.innerHTML = '';
    this.players.forEach((p, i) => {
      const avatar = AVATARS.find(a => a.id === p.avatarId) || AVATARS[0];
      const row = document.createElement('div');
      row.className = 'player-setup-row';
      row.innerHTML = `
        <div class="avatar-mini" style="background: ${avatar.color};">${avatar.name[0]}</div>
        <input class="input-field" type="text" value="${p.name}" data-index="${i}" placeholder="Nom du joueur">
        <span class="key-binding" title="Touche de buzz">⌨️ ${i + 1}</span>
      `;
      const input = row.querySelector('input');
      input.addEventListener('change', (e) => {
        this.players[i].name = e.target.value;
      });
      container.appendChild(row);
    });
  }

  startGame() {
    const config = {
      difficulty: this.selectedDifficulty,
      allowNegativeScores: document.getElementById('opt-negative-scores').checked,
      players: this.players.map((p, i) => ({
        name: p.name,
        avatarId: p.avatarId,
        keyBinding: (i + 1).toString()
      }))
    };
    this.engine.setupGame(config);
    this.showScreen('game-screen');
    this.renderScoreboard();
    this.updateGameUI();
  }

  // === GAME SCREEN ===
  bindGameScreen() {
    document.getElementById('btn-roll-chouettes').addEventListener('click', () => {
      this.doRollChouettes();
    });
    document.getElementById('btn-log').addEventListener('click', () => {
      document.getElementById('log-panel').classList.toggle('open');
    });
    document.getElementById('btn-rules-ingame').addEventListener('click', () => {
      if (!this.rulesPanel) this.rulesPanel = new RulesPanel();
      this.rulesPanel.toggle(this.engine.getState().difficulty || this.selectedDifficulty);
    });
    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      const enabled = this.sound.toggle();
      document.getElementById('btn-sound-toggle').textContent = enabled ? '🔊' : '🔇';
    });
  }

  doRollChouettes() {
    const state = this.engine.getState();
    if (state.phase !== GAME_PHASE.ROLLING_CHOUETTES) return;

    this.sound.diceRoll();
    const result = this.engine.rollChouettes();

    // Animation 3D séquentielle pour les 2 chouettes
    this.diceAnimator.roll(result[0]).then(() => {
      this.renderDie('die-1', result[0]);
      this.sound.diceLand();
      return this.diceAnimator.rollQuick(result[1]);
    }).then(() => {
      this.renderDie('die-2', result[1]);
      this.sound.diceLand();
      this.setDieState('die-3', 'empty');

      // Vérifier si Verdier est possible (★★★+)
      if (state.difficulty >= 3) {
        const sorted = [...result].sort((a, b) => a - b);
        if ((sorted[0] === 2 && sorted[1] === 6) ||
            (sorted[0] === 4 && sorted[1] === 6) ||
            (sorted[0] === 2 && sorted[1] === 4)) {
          this.startVerdier(result);
          return;
        }
      }

      this.setExplanation(
        'Chouettes lancées !',
        `Vous avez obtenu ${result[0]} et ${result[1]}. Lancez maintenant le Cul.`
      );
      this.setActions([{
        label: '🎲 Lancer le Cul',
        className: 'btn btn-primary',
        action: () => this.doRollCul()
      }]);
    });
  }

  doRollCul() {
    const state = this.engine.getState();
    if (state.phase !== GAME_PHASE.ROLLING_CUL) return;

    this.sound.diceRoll();
    // On pré-calcule le résultat pour l'animation
    const culValue = this.engine.dice.rollOne();
    this.engine.dice.cul = culValue;
    this.engine.state.phase = GAME_PHASE.RESOLVING;

    // Animation 3D pour le cul
    this.diceAnimator.roll(culValue).then(() => {
      this.sound.diceLand();
      // Déclencher la logique du moteur manuellement (car on a bypass rollCul)
      const allDice = this.engine.dice.getAll();
      const combination = this.engine.ruleEngine.analyze(allDice);
      this.engine.state.lastCombination = combination;
      this.engine.emit('culRolled', { die: culValue, allDice, combination });
      this.engine.resolveCombination(combination);
    });
  }

  // === Moteur d'événements ===
  bindEngineEvents() {
    this.engine.on('culRolled', (data) => {
      this.sound.diceLand();
      this.renderDie('die-3', data.die);
      const combo = data.combination;

      // Résoudre les paris Verdier s'il y en avait
      if (this.pendingVerdierBets && Object.keys(this.pendingVerdierBets).length > 0) {
        this.resolveVerdierBets(combo);
      }

      // Résoudre le Civet-Filoché s'il y en avait
      if (this.pendingCivetFiloche) {
        this.resolveCivetFiloche(combo);
      }

      // Appliquer le Flan (inversion) si actif
      if (this.activeFlan) {
        const flanResult = this.getFlanResult(combo);
        if (flanResult && combo.type !== 'neant') {
          this.setExplanation(
            `🥧 FLANNÉ ! — ${combo.description}`,
            flanResult.explanation
          );
          // Modifier les points de la combinaison pour la résolution
          combo._originalPoints = combo.points;
          combo.points = flanResult.invertedPoints;
          combo._flanActive = true;
        }
        this.activeFlan = null;
      } else {
        this.setExplanation(combo.description, combo.explanation);
      }
    });

    this.engine.on('actionsAvailable', (data) => {
      this.renderActions(data.combination, data.actions);
    });

    this.engine.on('scoreChanged', (data) => {
      this.renderScoreboard();
      this.flashPlayerCard(data.player, data.points > 0 ? 'up' : 'down');

      // Sons + particules selon gain/perte
      if (data.points > 0) {
        this.sound.scoreGain();
        const card = this._getPlayerCard(data.player);
        if (card) this.particles.emitFromElement(card, 'gold');
      } else if (data.points < 0) {
        this.sound.scoreLoss();
        const card = this._getPlayerCard(data.player);
        if (card) this.particles.emitFromElement(card, 'red');
      }
    });

    this.engine.on('itemGained', (data) => {
      this.sound.itemGain();
      this.renderScoreboard();
    });

    this.engine.on('turnEnd', () => {
      this.addLogEntry();
    });

    this.engine.on('readyForNextTurn', () => {
      this.setActions([{
        label: '➡️ Tour Suivant',
        className: 'btn btn-primary',
        action: () => {
          this.engine.startNextTurn();
          this.updateGameUI();
          this.resetDice();
          this.activeJarret = null;
          this.activeFlan = null;

          const state = this.engine.getState();

          // ★★★★ : Proposer le Flan avant le lancer
          if (state.difficulty >= 4) {
            const flanOffered = this.offerFlanUse();
            if (flanOffered) return;
          }

          // ★★★★ : Proposer le Civet-Filoché
          if (state.difficulty >= 4) {
            const cfOffered = this.offerCivetFilocheUse();
            if (cfOffered) return;
          }

          // Vérifier si le joueur a un Jarret à utiliser (★★★+)
          if (state.difficulty >= 3) {
            const offered = this.offerJarretUse();
            if (offered) return;
          }

          this.setExplanation(
            'Prêt à jouer',
            `C'est au tour de ${state.currentPlayer.name}. Lancez les Chouettes !`
          );
          this.setActions([{
            label: '🎲 Lancer les Chouettes',
            className: 'btn btn-primary',
            action: () => this.doRollChouettes()
          }]);
        }
      }]);
    });

    this.engine.on('gameOver', (data) => {
      this.sound.victory();
      document.getElementById('winner-name').textContent = `🏆 ${data.winner.name} remporte la partie ! 🏆`;
      document.getElementById('winner-score').textContent = `${data.winner.score} pts`;
      // Particules de victoire sur tout l'écran
      setTimeout(() => {
        this.particles.emitVictory(window.innerWidth / 2, window.innerHeight / 2);
      }, 300);
      setTimeout(() => this.showScreen('gameover-screen'), 2000);
    });

    this.engine.on('siropResolved', (data) => {
      this.renderScoreboard();
    });

    this.engine.on('tichetteTriggered', (data) => {
      // ★★★★ : Un Sirop a produit une Artichette → Tichette !
      this.setExplanation(
        '🎭 TICHETTE ! (Artichette via Sirop)',
        `Le Sirop a donné 3-3-4 : c\'est une Tichette ! Le premier joueur à crier "Salsifi !" en tapant la main sur la table effectue le Défi Tichette.`
      );
      // Buzz pour déterminer qui devient le ticheur
      const buzzPlayers = this._getBuzzPlayers();
      this.setActions([{
        label: '🌿 Lancer le Buzz "Salsifi !"',
        className: 'btn btn-primary',
        action: () => {
          this.buzzOverlay.show({
            mode: 'firstWins',
            title: '🌿 Salsifi !',
            instruction: 'Le PREMIER à buzzer devient le Ticheur !',
            players: buzzPlayers,
            timeoutMs: 4000
          });
          this.buzz.start({
            mode: 'firstWins',
            players: buzzPlayers,
            timeout: 4000,
            onBuzz: (bd) => this.buzzOverlay.markBuzzed(bd.playerIndex, bd.position),
            onComplete: (result) => {
              if (result.winner !== null) {
                const ticheur = this.engine.getState().players[result.winner];
                this.buzzOverlay.showResult(`${ticheur.name} crie Salsifi ! C'est le Ticheur.`, 'win');
                this.buzzOverlay.hideAfterDelay(2000).then(() => {
                  this.startTichette(result.winner);
                });
              } else {
                this.buzzOverlay.showResult('Personne n\'a crié Salsifi. Pas de Tichette.', 'tie');
                this.buzzOverlay.hideAfterDelay(2000).then(() => {
                  this.engine.prepareNextTurn();
                });
              }
              this.renderScoreboard();
            }
          });
          this.setActions([]);
        }
      }]);
    });
  }

  // === Rendu des actions possibles ===
  renderActions(combination, actions) {
    const type = combination.type;
    const buttons = [];

    if (type === 'chouette') {
      buttons.push({
        label: '🍯 Je sirote !',
        className: 'btn btn-success',
        action: () => {
          const result = this.engine.doSirop(this.engine.getState().currentPlayer);
          if (result) {
            if (result.success) {
              let msg = result.description;
              // Bi-Jarret s'applique sur le Sirop réussi
              if (this.activeJarret === 'biJarret' || this.activeJarret === 'jarretSifflet') {
                const bonus = result.points; // on a déjà ajouté les points via doSirop
                this.engine.getState().currentPlayer.addScore(bonus, 'Bi-Jarret ×2 sur Sirop');
                this.engine.emit('scoreChanged', { player: this.engine.getState().currentPlayer, points: bonus, reason: 'Bi-Jarret ×2' });
                msg += ' (Bi-Jarret ×2 !)';
              }
              this.setExplanation('🎉 Sirop réussi !', msg);
            } else {
              this.setExplanation('❌ Sirop raté...', result.description);
              if (result.givesCivet) {
                this.setExplanation('❌ Sirop de 6 raté !',
                  result.description + ' Mais vous gagnez un Civet !');
              }
            }
          }
          this.activeJarret = null;
          this.renderScoreboard();
        }
      });
      buttons.push({
        label: '✋ Encaisser la Chouette',
        className: 'btn',
        action: () => {
          // Appliquer Bi-Jarret sur la Chouette aussi
          if (this.activeJarret === 'biJarret' || this.activeJarret === 'jarretSifflet') {
            const player = this.engine.getState().currentPlayer;
            const bonus = combination.points;
            player.addScore(combination.points * 2, combination.description + ' (Bi-Jarret ×2)');
            this.engine.emit('scoreChanged', { player, points: combination.points * 2, reason: combination.description + ' ×2' });
            this.engine.checkWinCondition(player);
            this.engine.prepareNextTurn();
          } else {
            this.engine.skipSirop(this.engine.getState().currentPlayer);
          }
          this.activeJarret = null;
          this.renderScoreboard();
        }
      });
    }

    else if (type === 'suite' || type === 'suiteVelutee') {
      // Le dernier joueur à buzzer perd 10 pts
      buttons.push({
        label: '🥶 Lancer le Buzz !',
        className: 'btn btn-danger',
        action: () => this.startBuzzLastLoses(combination)
      });
    }

    else if (type === 'chouetteVelute') {
      // Le premier joueur à buzzer gagne les points
      buttons.push({
        label: '👏 Lancer le Buzz !',
        className: 'btn btn-success',
        action: () => this.startBuzzFirstWins(combination)
      });
    }

    else if (type === 'culDeChouette') {
      const player = this.engine.getState().currentPlayer;
      let points = combination.points;
      let reason = combination.description;
      if (this.activeJarret === 'biJarret' || this.activeJarret === 'jarretSifflet') {
        points *= 2;
        reason += ' (Bi-Jarret ×2)';
      }
      player.addScore(points, reason);
      this.engine.emit('scoreChanged', { player, points, reason });
      this.activeJarret = null;
      if (!this.engine.checkWinCondition(player)) {
        this.engine.prepareNextTurn();
      }
      this.renderScoreboard();
      return;
    }

    else if (type === 'neant') {
      // Déjà géré automatiquement par le moteur
      return;
    }

    else if (type === 'soufflette') {
      buttons.push({
        label: '⚔️ En garde ma mignonne !',
        className: 'btn btn-danger',
        action: () => {
          // Choisir la cible
          const state = this.engine.getState();
          const currentIdx = state.players.indexOf(state.currentPlayer);
          const others = state.players.filter((p, i) => i !== currentIdx && !p.eliminated);

          this.setExplanation('⚔️ Soufflette !', 'Choisissez qui vous souffletez :');
          const targetButtons = others.map(p => {
            const idx = state.players.indexOf(p);
            return {
              label: `🎯 ${p.name}`,
              className: 'btn',
              action: () => this.startSouffletteInteractive(idx)
            };
          });
          this.setActions(targetButtons);
        }
      });
      buttons.push({
        label: '✋ Ne pas défier',
        className: 'btn',
        action: () => {
          this.engine.prepareNextTurn();
        }
      });
    }

    else if (type === 'artichette') {
      // Course entre le lanceur ("Raitournelle!") et les adversaires ("Artichette!")
      buttons.push({
        label: '🎵 Lancer le Buzz !',
        className: 'btn btn-primary',
        action: () => this.startBuzzArtichette(combination)
      });
    }

    else if (type === 'bleuRouge') {
      const player = this.engine.getState().currentPlayer;
      player.addScore(9, 'Bleu-Rouge : Chouette de 3');
      this.engine.emit('scoreChanged', { player, points: 9, reason: 'Bleu-Rouge' });
      this.renderScoreboard();
      buttons.push({
        label: '🎲 Tous les joueurs misent sur la relance',
        className: 'btn btn-primary',
        action: () => this.startBleuRouge(combination)
      });
    }

    else if (type === 'neantSouffle') {
      // Premier joueur à buzzer gagne la Grelottine
      buttons.push({
        label: '👃 Lancer le Buzz !',
        className: 'btn btn-success',
        action: () => this.startBuzzFirstWinsGrelottine(combination)
      });
    }

    else if (type === 'flan') {
      buttons.push({
        label: '☝️ À Kadoc !',
        className: 'btn btn-success',
        action: () => {
          const player = this.engine.getState().currentPlayer;
          if (!player.hasItem('flan')) {
            player.giveItem('flan');
            this.engine.emit('itemGained', { player, item: 'flan' });
            this.setExplanation('Flan obtenu !', 'Vous pourrez l\'utiliser pour inverser la combinaison d\'un adversaire.');
          }
          this.engine.prepareNextTurn();
          this.renderScoreboard();
        }
      });
    }

    else {
      // Combinaison non gérée spécifiquement : passer
      this.engine.prepareNextTurn();
      return;
    }

    this.setActions(buttons);
  }

  // === BUZZ SYSTEM ===

  /**
   * Prépare la config commune pour un buzz
   */
  _getBuzzPlayers() {
    const state = this.engine.getState();
    return state.players
      .filter(p => !p.eliminated)
      .map((p, i) => {
        const realIdx = state.players.indexOf(p);
        return {
          index: realIdx,
          name: p.name,
          avatarId: p.avatarId,
          key: p.keyBinding
        };
      });
  }

  /**
   * Suite : le DERNIER à buzzer perd 10 pts.
   * "Grelotte ça picote !"
   */
  startBuzzLastLoses(combination) {
    const buzzPlayers = this._getBuzzPlayers();
    const state = this.engine.getState();

    this.buzzOverlay.show({
      mode: 'lastLoses',
      title: '🥶 Grelotte ça picote !',
      instruction: `Appuyez sur votre touche ! Le DERNIER perd 10 pts.`,
      players: buzzPlayers,
      timeoutMs: 5000
    });

    this.buzz.start({
      mode: 'lastLoses',
      players: buzzPlayers,
      timeout: 5000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        this._resolveLastLosesBuzz(result, combination);
      }
    });

    // Cacher les boutons d'action pendant le buzz
    this.setActions([]);
  }

  _resolveLastLosesBuzz(result, combination) {
    const state = this.engine.getState();

    if (result.losers && result.losers.length > 0) {
      if (result.tied && result.tied.length > 1) {
        // Égalité → dans les vraies règles on dit "Sans fin est la moisissure..."
        // Pour simplifier ici, on les pénalise tous
        const names = result.tied.map(i => state.players[i].name).join(', ');
        this.buzzOverlay.showResult(
          `Égalité ! ${names} sont les derniers. -10 pts chacun.`, 'tie'
        );
        result.tied.forEach(idx => {
          this.engine.resolveSuiteForPlayer(idx);
        });
      } else {
        const loserIdx = result.losers[0];
        const loser = state.players[loserIdx];
        this.buzzOverlay.showResult(
          `${loser.name} est le dernier ! -10 pts.`, 'lose'
        );
        this.engine.resolveSuite(loserIdx);
      }
    }

    this.renderScoreboard();

    // Gérer la Suite-Velutée après la résolution de la suite
    this.buzzOverlay.hideAfterDelay(2500).then(() => {
      if (combination.type === 'suiteVelutee') {
        this._handleSuiteVeluteePhase2(combination);
      } else {
        this.engine.prepareNextTurn();
      }
    });
  }

  _handleSuiteVeluteePhase2(combination) {
    // Après la suite, le lanceur peut valider sa Velute ou un adversaire peut l'attraper
    const state = this.engine.getState();
    this.setExplanation(
      'Suite-Velutée !',
      `La Suite est résolue. Le lanceur peut crier "Patte de canaaard !" pour valider sa Velute de 3 (18 pts), ou un adversaire peut crier "Velutée !" pour tenter de la voler.`
    );
    this.setActions([
      {
        label: '🦆 Patte de canaaard !',
        className: 'btn btn-success',
        action: () => {
          const player = state.currentPlayer;
          player.addScore(combination.velutePoints, 'Suite-Velutée : Patte de canaaard !');
          this.engine.emit('scoreChanged', { player, points: combination.velutePoints, reason: 'Velute validée' });
          this.engine.checkWinCondition(player);
          this.engine.prepareNextTurn();
          this.renderScoreboard();
        }
      },
      {
        label: '🦉 Velutée ! (adversaire)',
        className: 'btn btn-danger',
        action: () => {
          // Un adversaire attrape la velute — simplifié en buzz firstWins sur les autres
          this.startBuzzFirstWinsVelutee(combination);
        }
      },
      {
        label: '✋ Passer',
        className: 'btn',
        action: () => {
          this.engine.prepareNextTurn();
        }
      }
    ]);
  }

  startBuzzFirstWinsVelutee(combination) {
    const state = this.engine.getState();
    const currentIdx = state.players.indexOf(state.currentPlayer);
    const buzzPlayers = this._getBuzzPlayers().filter(p => p.index !== currentIdx);

    this.buzzOverlay.show({
      mode: 'firstWins',
      title: '🦉 Velutée !',
      instruction: 'Premier adversaire à buzzer attrape la Velute !',
      players: buzzPlayers,
      timeoutMs: 3000
    });

    this.buzz.start({
      mode: 'firstWins',
      players: buzzPlayers,
      timeout: 3000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        if (result.winner !== null) {
          const winner = state.players[result.winner];
          // Le gagnant relance les chouettes pour une nouvelle combinaison (simplifié : on donne les points)
          winner.addScore(combination.velutePoints, 'Suite-Velutée : Velutée attrapée !');
          this.engine.emit('scoreChanged', { player: winner, points: combination.velutePoints, reason: 'Velutée !' });
          this.buzzOverlay.showResult(`${winner.name} attrape la Velutée ! +${combination.velutePoints} pts`, 'win');
          this.engine.checkWinCondition(winner);
        } else {
          this.buzzOverlay.showResult('Personne n\'a attrapé la Velutée.', 'tie');
        }
        this.renderScoreboard();
        this.buzzOverlay.hideAfterDelay(2000).then(() => {
          this.engine.prepareNextTurn();
        });
      }
    });
    this.setActions([]);
  }

  /**
   * Chouette-Velute : le PREMIER à buzzer gagne les points.
   * "Pas mou le caillou !"
   */
  startBuzzFirstWins(combination) {
    const buzzPlayers = this._getBuzzPlayers();

    this.buzzOverlay.show({
      mode: 'firstWins',
      title: '👏 Pas mou le caillou !',
      instruction: `Le PREMIER à buzzer gagne ${combination.points} pts !`,
      players: buzzPlayers,
      timeoutMs: 4000
    });

    this.buzz.start({
      mode: 'firstWins',
      players: buzzPlayers,
      timeout: 4000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        this._resolveFirstWinsBuzz(result, combination);
      }
    });

    this.setActions([]);
  }

  _resolveFirstWinsBuzz(result, combination) {
    const state = this.engine.getState();

    if (result.timedOut || result.winner === null) {
      if (result.tied && result.tied.length > 1) {
        // Égalité → les joueurs à égalité PERDENT les points
        const names = result.tied.map(i => state.players[i].name).join(', ');
        this.buzzOverlay.showResult(
          `Égalité entre ${names} ! Ils perdent ${combination.points} pts chacun.`, 'tie'
        );
        this.engine.resolveChouetteVeluteEquality(result.tied);
      } else {
        this.buzzOverlay.showResult('Personne n\'a buzzé à temps.', 'tie');
      }
    } else {
      const winner = state.players[result.winner];
      this.buzzOverlay.showResult(
        `${winner.name} est le plus rapide ! +${combination.points} pts`, 'win'
      );
      this.engine.resolveChouetteVelute(result.winner);
    }

    this.renderScoreboard();
    this.buzzOverlay.hideAfterDelay(2500).then(() => {
      if (state.phase !== GAME_PHASE.GAME_OVER) {
        this.engine.prepareNextTurn();
      }
    });
  }

  /**
   * Artichette : course entre lanceur ("Raitournelle!") et adversaires ("Artichette!")
   * Le lanceur est en compétition avec TOUS les autres.
   * Si le lanceur est premier → +16 pts
   * Si un adversaire est premier → lanceur -16 pts
   */
  startBuzzArtichette(combination) {
    const buzzPlayers = this._getBuzzPlayers();
    const state = this.engine.getState();
    const currentIdx = state.players.indexOf(state.currentPlayer);

    this.buzzOverlay.show({
      mode: 'firstWins',
      title: '🎵 Artichette !',
      instruction: `Lanceur : criez "Raitournelle!" — Adversaires : criez "Artichette!"`,
      players: buzzPlayers,
      timeoutMs: 4000
    });

    this.buzz.start({
      mode: 'firstWins',
      players: buzzPlayers,
      timeout: 4000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        const player = state.currentPlayer;
        if (result.winner === currentIdx) {
          // Le lanceur a crié "Raitournelle!" en premier
          player.addScore(16, 'Artichette : Raitournelle !');
          this.engine.emit('scoreChanged', { player, points: 16, reason: 'Raitournelle !' });
          this.buzzOverlay.showResult(`${player.name} crie Raitournelle ! +16 pts`, 'win');
          this.engine.checkWinCondition(player);
        } else if (result.winner !== null) {
          // Un adversaire a crié "Artichette!" en premier
          const adversaire = state.players[result.winner];
          player.removeScore(16, `Artichette par ${adversaire.name}`);
          this.engine.emit('scoreChanged', { player, points: -16, reason: `Artichette par ${adversaire.name}` });
          this.buzzOverlay.showResult(`${adversaire.name} crie Artichette ! ${player.name} -16 pts`, 'lose');
        } else if (result.tied && result.tied.includes(currentIdx)) {
          // Égalité incluant le lanceur → le lanceur est prioritaire
          player.addScore(16, 'Artichette : Raitournelle (priorité lanceur) !');
          this.engine.emit('scoreChanged', { player, points: 16, reason: 'Raitournelle (priorité)' });
          this.buzzOverlay.showResult(`Égalité ! Le lanceur est prioritaire. +16 pts`, 'win');
          this.engine.checkWinCondition(player);
        } else {
          this.buzzOverlay.showResult('Personne n\'a réagi à temps.', 'tie');
        }

        this.renderScoreboard();
        this.buzzOverlay.hideAfterDelay(2500).then(() => {
          this.engine.prepareNextTurn();
        });
      }
    });

    this.setActions([]);
  }

  /**
   * Néant Soufflé : le premier à buzzer gagne une Grelottine.
   * "Mécréant !"
   */
  startBuzzFirstWinsGrelottine(combination) {
    const buzzPlayers = this._getBuzzPlayers();

    this.buzzOverlay.show({
      mode: 'firstWins',
      title: '👃 Mécréant !',
      instruction: 'Le PREMIER à buzzer gagne une Grelottine !',
      players: buzzPlayers,
      timeoutMs: 4000
    });

    this.buzz.start({
      mode: 'firstWins',
      players: buzzPlayers,
      timeout: 4000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        const state = this.engine.getState();
        if (result.winner !== null) {
          const winner = state.players[result.winner];
          if (!winner.hasItem('grelottine')) {
            winner.giveItem('grelottine');
            this.engine.emit('itemGained', { player: winner, item: 'grelottine' });
            this.buzzOverlay.showResult(`${winner.name} crie Mécréant ! Grelottine obtenue !`, 'win');
          } else {
            this.buzzOverlay.showResult(`${winner.name} a déjà une Grelottine.`, 'tie');
          }
        } else {
          this.buzzOverlay.showResult('Personne n\'a réagi... Le Néant reste silencieux.', 'tie');
        }
        this.renderScoreboard();
        this.buzzOverlay.hideAfterDelay(2500).then(() => {
          this.engine.prepareNextTurn();
        });
      }
    });

    this.setActions([]);
  }

  // === FLAN (utilisation — ★★★★) ===

  /**
   * Propose au joueur d'utiliser son Flan avant le lancer d'un adversaire.
   * Le Flan INVERSE l'effet de la combinaison réalisée par le flanné.
   * Doit être proposé entre les tours (avant le lancer des chouettes de l'adversaire).
   */
  offerFlanUse() {
    const state = this.engine.getState();
    if (state.difficulty < 4) return false;

    // Chercher des joueurs qui ont un Flan (sauf le joueur actif)
    const currentIdx = state.players.indexOf(state.currentPlayer);
    const flanOwners = state.players.filter((p, i) =>
      i !== currentIdx && !p.eliminated && p.hasItem('flan')
    );

    if (flanOwners.length === 0) return false;

    // Proposer à chaque possesseur de Flan
    this.setExplanation(
      '🥧 Flan disponible !',
      `Avant que ${state.currentPlayer.name} ne lance, un joueur possédant un Flan peut l'utiliser pour INVERSER sa combinaison.`
    );

    const buttons = [];
    flanOwners.forEach(owner => {
      const ownerIdx = state.players.indexOf(owner);
      buttons.push({
        label: `🥧 ${owner.name} : "Tatan elle fait des Flans !"`,
        className: 'btn btn-danger',
        action: () => {
          owner.removeItem('flan');
          this.activeFlan = { flanneur: ownerIdx, flanne: currentIdx };
          this.renderScoreboard();
          this.setExplanation(
            '🥧 Flan activé !',
            `${owner.name} flanne ${state.currentPlayer.name} ! L'effet de sa prochaine combinaison sera INVERSÉ.`
          );
          // Passer au lancer
          setTimeout(() => {
            this.setActions([{
              label: '🎲 Lancer les Chouettes (flanné !)',
              className: 'btn btn-primary',
              action: () => this.doRollChouettes()
            }]);
          }, 1500);
        }
      });
    });

    buttons.push({
      label: '✋ Personne ne flanne — Lancer',
      className: 'btn',
      action: () => {
        this.activeFlan = null;
        this.setActions([{
          label: '🎲 Lancer les Chouettes',
          className: 'btn btn-primary',
          action: () => this.doRollChouettes()
        }]);
        this.setExplanation('Prêt à jouer', `C'est au tour de ${state.currentPlayer.name}. Lancez les Chouettes !`);
      }
    });

    this.setActions(buttons);
    return true;
  }

  /**
   * Applique l'inversion du Flan sur les points d'une combinaison.
   * Gain → Perte, Perte → Gain.
   */
  applyFlanInversion(points) {
    return -points;
  }

  /**
   * Résout le Flan sur la combinaison actuelle.
   * Retourne les points modifiés et l'explication.
   */
  getFlanResult(combination) {
    if (!this.activeFlan) return null;

    const state = this.engine.getState();
    const flanneur = state.players[this.activeFlan.flanneur];

    let explanation = '';
    let invertedPoints = 0;

    switch (combination.type) {
      case 'chouette':
        invertedPoints = -combination.points;
        explanation = `Flan sur Chouette ! ${state.currentPlayer.name} PERD ${combination.points} pts au lieu de les gagner.`;
        break;
      case 'velute':
        invertedPoints = -combination.points;
        explanation = `Flan sur Velute ! ${state.currentPlayer.name} PERD ${combination.points} pts.`;
        break;
      case 'culDeChouette':
        invertedPoints = -combination.points;
        explanation = `Flan sur Cul de Chouette ! ${state.currentPlayer.name} PERD ${combination.points} pts !`;
        break;
      case 'chouetteVelute':
        // Le premier à crier PERD les points au lieu de les gagner
        explanation = `Flan sur Chouette-Velute ! Le premier à crier "Pas mou le caillou !" PERD ${combination.points} pts. En cas d'égalité, ils les GAGNENT.`;
        invertedPoints = -combination.points;
        break;
      case 'suite':
        // Le premier à réagir perd 10 pts (inversé : le dernier ne perd rien, le premier perd)
        explanation = `Flan sur Suite ! Le PREMIER à crier "Grelotte ça picote !" PERD 10 pts.`;
        invertedPoints = 0; // géré spécialement
        break;
      case 'neant':
        // Le flanné conserve son flan pour le prochain tour
        explanation = `Flan sur Néant : le Flan est conservé pour le prochain lancer.`;
        invertedPoints = 0;
        break;
      default:
        invertedPoints = combination.points > 0 ? -combination.points : Math.abs(combination.points);
        explanation = `Flan ! L'effet de la combinaison est inversé.`;
    }

    return { invertedPoints, explanation, flanneur: flanneur.name };
  }

  // === CIVET-FILOCHÉ (★★★★) ===

  /**
   * Un Civet-Filoché est obtenu quand :
   * - Un Civet est raté
   * - La valeur de la mise perdue = la valeur de la combinaison gagnée
   * 
   * Il permet de parier sur le lancer d'un AUTRE joueur.
   */
  offerCivetFilocheUse() {
    const state = this.engine.getState();
    if (state.difficulty < 4) return false;

    // Chercher si quelqu'un a un Civet-Filoché (hors joueur actif)
    const currentIdx = state.players.indexOf(state.currentPlayer);
    const owners = state.players.filter((p, i) =>
      i !== currentIdx && !p.eliminated && p.hasItem('civetFiloche')
    );

    if (owners.length === 0) return false;

    this.setExplanation(
      '🧵 Civet-Filoché disponible !',
      `Un joueur possédant un Civet-Filoché peut parier sur la combinaison du joueur actif.`
    );

    const buttons = [];
    owners.forEach(owner => {
      const ownerIdx = state.players.indexOf(owner);
      buttons.push({
        label: `🧵 ${owner.name} utilise son Civet-Filoché`,
        className: 'btn btn-success',
        action: () => this.startCivetFiloche(ownerIdx)
      });
    });

    buttons.push({
      label: '✋ Personne n\'utilise — Continuer',
      className: 'btn',
      action: () => null // signal de continuer sans civet-filoché
    });

    this.setActions(buttons);
    return true;
  }

  startCivetFiloche(ownerIdx) {
    const state = this.engine.getState();
    const owner = state.players[ownerIdx];

    this.setExplanation(
      `🧵 Civet-Filoché de ${owner.name}`,
      'Choisissez la combinaison et la mise (1 à 102 pts). Vous pariez sur le lancer du joueur actif.'
    );

    const zone = document.getElementById('action-zone');
    zone.innerHTML = '';

    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 400px;';
    form.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="color: var(--text-secondary); min-width: 100px;">Combinaison :</span>
        <select id="cf-combo" class="input-field" style="flex: 1;">
          <option value="chouette">Chouette</option>
          <option value="velute">Velute</option>
          <option value="culDeChouette">Cul de Chouette</option>
          <option value="chouetteVelute">Chouette-Velute</option>
          <option value="suite">Suite</option>
        </select>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="color: var(--text-secondary); min-width: 100px;">Mise :</span>
        <input type="number" min="1" max="102" id="cf-bet" class="input-field" style="width: 80px;" placeholder="1-102" value="50">
        <span style="color: var(--text-muted);">pts (max 102)</span>
      </div>
    `;
    zone.appendChild(form);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = '🧵 Confirmer le Civet-Filoché';
    confirmBtn.style.marginTop = '12px';
    confirmBtn.addEventListener('click', () => {
      const combo = document.getElementById('cf-combo').value;
      const bet = parseInt(document.getElementById('cf-bet').value);

      if (isNaN(bet) || bet < 1 || bet > 102) {
        this.setExplanation('⚠️ Mise invalide', 'La mise doit être entre 1 et 102 pts.');
        return;
      }

      owner.removeItem('civetFiloche');
      this.pendingCivetFiloche = { ownerIdx, combo, bet };
      this.renderScoreboard();
      this.setExplanation(
        '🧵 Civet-Filoché enregistré !',
        `${owner.name} parie ${bet} pts sur un(e) ${combo}. Le lancer va déterminer l'issue...`
      );
      this.setActions([{
        label: '🎲 Lancer les Chouettes',
        className: 'btn btn-primary',
        action: () => this.doRollChouettes()
      }]);
    });
    zone.appendChild(confirmBtn);
  }

  /**
   * Résout le Civet-Filoché après le lancer du joueur actif.
   */
  resolveCivetFiloche(combination) {
    if (!this.pendingCivetFiloche) return;

    const { ownerIdx, combo, bet } = this.pendingCivetFiloche;
    const state = this.engine.getState();
    const owner = state.players[ownerIdx];

    const success = combination.type === combo;

    if (success) {
      owner.addScore(bet + combination.points, `Civet-Filoché réussi (+${bet} mise + ${combination.points} combo)`);
      this.engine.emit('scoreChanged', { player: owner, points: bet + combination.points, reason: 'Civet-Filoché réussi !' });
    } else {
      owner.addScore(-bet + (combination.points || 0), `Civet-Filoché raté (-${bet} mise)`);
      this.engine.emit('scoreChanged', { player: owner, points: -bet, reason: 'Civet-Filoché raté' });

      // Vérifier si on obtient un nouveau Civet-Filoché (mise perdue = combinaison gagnée)
      if (bet === (combination.points || 0) && !owner.hasItem('civetFiloche')) {
        owner.giveItem('civetFiloche');
        this.engine.emit('itemGained', { player: owner, item: 'civetFiloche' });
      }
    }

    this.pendingCivetFiloche = null;
    this.renderScoreboard();
  }

  // === TICHETTE (★★★★) ===

  /**
   * La Tichette se déclenche quand un Sirop donne une Artichette (4-3-4).
   * C'est un défi complexe de paris entre le "ticheur" et les "tichants".
   * 
   * Simplifié pour l'app en gardant l'esprit du jeu :
   * - La mise = valeur absolue du score du ticheur
   * - Les joueurs enchérissent à tour de rôle avec des "tiches"
   * - Un joueur peut se "quicher" (abandonner en payant sa dernière tiche)
   * - Le dernier restant doit "ticher" (valider sa tiche)
   */
  startTichette(ticheurIdx) {
    const state = this.engine.getState();
    const ticheur = state.players[ticheurIdx];
    const mise = Math.abs(ticheur.score);

    if (mise < 6) {
      this.setExplanation('⚠️ Tichette impossible',
        'Le score absolu du ticheur doit être d\'au moins 6 pour lancer une Tichette.');
      this.engine.prepareNextTurn();
      return;
    }

    // Le ticheur lance 3 dés cachés
    const hiddenDice = [
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6),
      Math.ceil(Math.random() * 6)
    ];

    this.tichette = {
      ticheurIdx,
      hiddenDice,
      mise,
      participants: state.players
        .map((p, i) => ({ index: i, name: p.name, active: true, lastTiche: 0 }))
        .filter(p => !state.players[p.index].eliminated),
      currentBidderPosition: 0,
      currentTiche: 0, // la dernière tiche annoncée
      ticheType: 'michette', // michette (1 chiffre), tichette (2), bichette (3)
      round: 0
    };

    // Le ticheur fait la première annonce (obligatoirement une michette)
    this.setExplanation(
      '🎭 TICHETTE !',
      `Mise en jeu : ${mise} pts (score absolu de ${ticheur.name}). ` +
      `${ticheur.name} lance 3 dés cachés et commence avec une Michette. ` +
      `"Normalement on n'a pas le droit de vous expliquer ça..." 😏`
    );

    this.showTichetteUI();
  }

  showTichetteUI() {
    const { tichette } = this;
    const state = this.engine.getState();
    const activeParticipants = tichette.participants.filter(p => p.active);
    const currentBidder = activeParticipants[tichette.currentBidderPosition % activeParticipants.length];

    if (!currentBidder) {
      this.resolveTichetteEnd();
      return;
    }

    const zone = document.getElementById('action-zone');
    zone.innerHTML = '';

    const info = document.createElement('div');
    info.style.cssText = 'text-align: center; margin-bottom: 12px; color: var(--text-secondary);';
    info.innerHTML = `
      <div style="font-family: var(--font-title); color: var(--gold); font-size: 1.1rem; margin-bottom: 8px;">
        Tour de : ${currentBidder.name}
      </div>
      <div>Dernière tiche : ${tichette.currentTiche || 'aucune'} (${tichette.ticheType})</div>
      <div>Participants actifs : ${activeParticipants.map(p => p.name).join(', ')}</div>
      <div style="margin-top: 4px; color: var(--gold);">Mise : ${tichette.mise} pts</div>
    `;
    zone.appendChild(info);

    // Saisie de la tiche
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display: flex; gap: 8px; align-items: center; justify-content: center; margin-bottom: 12px;';
    inputRow.innerHTML = `
      <select id="tiche-type" class="input-field" style="width: 130px;">
        <option value="michette" ${tichette.ticheType === 'bichette' ? 'disabled' : ''}>Michette (1 dé)</option>
        <option value="tichette" ${tichette.ticheType === 'bichette' ? 'disabled' : ''}>Tichette (2 dés)</option>
        <option value="bichette">Bichette (3 dés)</option>
      </select>
      <input type="number" min="1" max="666" id="tiche-value" class="input-field" style="width: 80px;" placeholder="valeur">
    `;
    zone.appendChild(inputRow);

    const buttonsRow = document.createElement('div');
    buttonsRow.style.cssText = 'display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;';

    // Bouton Annoncer
    const announceBtn = document.createElement('button');
    announceBtn.className = 'btn btn-success';
    announceBtn.textContent = '📢 Annoncer la Tiche';
    announceBtn.addEventListener('click', () => {
      const type = document.getElementById('tiche-type').value;
      const value = parseInt(document.getElementById('tiche-value').value);

      if (isNaN(value) || value <= tichette.currentTiche) {
        this.setExplanation('⚠️ Tiche invalide', `La valeur doit être supérieure à ${tichette.currentTiche}.`);
        return;
      }

      // Vérifier la progression de type (ne peut pas régresser)
      const typeOrder = { michette: 1, tichette: 2, bichette: 3 };
      if (typeOrder[type] < typeOrder[tichette.ticheType]) {
        this.setExplanation('⚠️ Type invalide', `On ne peut pas redescendre de ${tichette.ticheType} à ${type}.`);
        return;
      }

      tichette.currentTiche = value;
      tichette.ticheType = type;
      currentBidder.lastTiche = value;
      tichette.currentBidderPosition++;
      this.showTichetteUI();
    });
    buttonsRow.appendChild(announceBtn);

    // Bouton Se quicher
    const quicheBtn = document.createElement('button');
    quicheBtn.className = 'btn btn-danger';
    quicheBtn.textContent = '🧀 Se Quicher';
    quicheBtn.addEventListener('click', () => {
      const quicheValue = currentBidder.lastTiche || 0;
      currentBidder.active = false;

      if (quicheValue > 0) {
        const player = state.players[currentBidder.index];
        player.removeScore(quicheValue, `Tichette : Quichette de ${quicheValue}`);
        this.engine.emit('scoreChanged', { player, points: -quicheValue, reason: `Quichette : -${quicheValue} pts` });
        this.renderScoreboard();
      }

      // Vérifier s'il ne reste qu'un joueur actif
      const remaining = tichette.participants.filter(p => p.active);
      if (remaining.length <= 1) {
        this.resolveTichetteEnd();
        return;
      }

      tichette.currentBidderPosition++;
      this.showTichetteUI();
    });
    buttonsRow.appendChild(quicheBtn);

    // Bouton Ticher (valider sa tiche — seulement si dernier joueur)
    if (activeParticipants.length <= 2) {
      const ticherBtn = document.createElement('button');
      ticherBtn.className = 'btn btn-primary';
      ticherBtn.textContent = '✅ Tichage !';
      ticherBtn.addEventListener('click', () => {
        this.resolveTichage(currentBidder);
      });
      buttonsRow.appendChild(ticherBtn);
    }

    zone.appendChild(buttonsRow);
  }

  resolveTichage(bidder) {
    const { tichette } = this;
    const state = this.engine.getState();
    const { hiddenDice, mise } = tichette;

    // Vérifier si la tiche correspond aux dés cachés
    const ticheStr = tichette.currentTiche.toString();
    const diceDigits = hiddenDice.sort((a, b) => a - b).map(String);
    const ticheDigits = ticheStr.split('').sort();

    // La tiche est bonne si tous les chiffres de la tiche sont présents dans les dés
    let success = true;
    const tempDice = [...diceDigits];
    for (const digit of ticheDigits) {
      const idx = tempDice.indexOf(digit);
      if (idx === -1) {
        success = false;
        break;
      }
      tempDice.splice(idx, 1);
    }

    const player = state.players[bidder.index];

    this.setExplanation(
      '🎭 Résultat de la Tichette !',
      `Dés cachés : [${hiddenDice.join(', ')}]. Tiche annoncée : ${tichette.currentTiche}.`
    );

    if (success) {
      player.addScore(mise, `Tichette réussie ! Tichage de ${tichette.currentTiche}`);
      this.engine.emit('scoreChanged', { player, points: mise, reason: 'Tichette réussie !' });
      this.setExplanation(
        '🎭 Tichette RÉUSSIE !',
        `${player.name} valide sa tiche (${tichette.currentTiche}) ! Les dés cachés étaient [${hiddenDice.join(', ')}]. +${mise} pts !`
      );
    } else {
      player.removeScore(mise, `Tichette ratée. Tichage de ${tichette.currentTiche}`);
      this.engine.emit('scoreChanged', { player, points: -mise, reason: 'Tichette ratée' });
      this.setExplanation(
        '🎭 Tichette RATÉE !',
        `${player.name} se trompe (${tichette.currentTiche}) ! Les dés cachés étaient [${hiddenDice.join(', ')}]. -${mise} pts.`
      );
    }

    this.engine.checkWinCondition(player);
    this.tichette = null;
    this.renderScoreboard();
    this.engine.prepareNextTurn();
  }

  resolveTichetteEnd() {
    const { tichette } = this;
    const remaining = tichette.participants.filter(p => p.active);

    if (remaining.length === 1) {
      // Le dernier joueur restant DOIT ticher
      this.resolveTichage(remaining[0]);
    } else {
      // Tout le monde s'est quiché → la tichette est annulée
      this.setExplanation('🎭 Tichette annulée', 'Tous les joueurs se sont quichés.');
      this.tichette = null;
      this.engine.prepareNextTurn();
    }
  }

  // === BLEU-ROUGE / PÉLICAN / JARRET ===

  /**
   * Bleu-Rouge : tous les joueurs misent sur la relance (3 à 18).
   * Interface de paris puis relance des dés.
   */
  startBleuRouge(combination) {
    const state = this.engine.getState();
    const players = state.players.filter(p => !p.eliminated);

    // Créer l'interface de paris
    this.setExplanation(
      '🔵🔴 Bleu-Rouge — Phase de Paris',
      'Chaque joueur doit miser sur la valeur de la relance (somme des 3 dés = 3 à 18). Chaque joueur DOIT choisir une valeur DIFFÉRENTE.'
    );

    // Interface de saisie des paris
    const zone = document.getElementById('action-zone');
    zone.innerHTML = '';

    const betsContainer = document.createElement('div');
    betsContainer.className = 'bleu-rouge-bets';
    betsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 500px;';

    const bets = {};
    const usedValues = new Set();

    players.forEach((player, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 8px; background: var(--bg-card); border: 1px solid var(--border-wood); border-radius: 4px;';
      row.innerHTML = `
        <span style="font-family: var(--font-title); color: var(--gold); min-width: 80px;">${player.name}</span>
        <span style="color: var(--text-secondary);">Je relance de</span>
        <input type="number" min="3" max="18" class="input-field" style="width: 70px; text-align: center;" 
               id="bet-${i}" placeholder="3-18">
      `;
      betsContainer.appendChild(row);
    });

    zone.appendChild(betsContainer);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = '🎲 Confirmer et Relancer';
    confirmBtn.style.marginTop = '16px';
    confirmBtn.addEventListener('click', () => {
      // Valider les paris
      let valid = true;
      const usedVals = new Set();

      players.forEach((player, i) => {
        const input = document.getElementById(`bet-${i}`);
        const val = parseInt(input.value);
        if (isNaN(val) || val < 3 || val > 18) {
          valid = false;
          input.style.borderColor = 'var(--red)';
        } else if (usedVals.has(val)) {
          valid = false;
          input.style.borderColor = 'var(--red)';
        } else {
          usedVals.add(val);
          bets[state.players.indexOf(player)] = val;
          input.style.borderColor = '';
        }
      });

      if (!valid) {
        this.setExplanation('⚠️ Paris invalides',
          'Chaque joueur doit miser une valeur entre 3 et 18, et toutes les valeurs doivent être DIFFÉRENTES.');
        return;
      }

      this.resolveBleuRougeRelance(bets, combination);
    });
    zone.appendChild(confirmBtn);
  }

  resolveBleuRougeRelance(bets, combination) {
    const state = this.engine.getState();

    // Relance des 3 dés
    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const d3 = Math.ceil(Math.random() * 6);
    const relanceValue = d1 + d2 + d3;
    const relanceDice = [d1, d2, d3].sort((a, b) => a - b);

    // Afficher les dés de relance
    this.renderDie('die-1', d1);
    this.renderDie('die-2', d2);
    this.renderDie('die-3', d3);

    // Vérifier si c'est un Pélican (Cul de Chouette de 6 = relance de 18)
    const isPelican = (d1 === 6 && d2 === 6 && d3 === 6);

    // Vérifier si c'est un Néant (aucune combinaison) → Jarret
    const relanceCombination = this.engine.ruleEngine.analyze([d1, d2, d3]);
    const isNeant = relanceCombination.type === 'neant';

    // Chercher le gagnant
    let winnerIdx = null;
    Object.entries(bets).forEach(([idx, val]) => {
      if (val === relanceValue) winnerIdx = parseInt(idx);
    });

    let resultText = `Relance : ${d1} + ${d2} + ${d3} = ${relanceValue}. `;

    if (winnerIdx !== null) {
      const winner = state.players[winnerIdx];
      // Gain : 36 + 2×relance + combinaison éventuelle
      const comboPoints = relanceCombination.type !== 'neant' ? relanceCombination.points : 0;
      const totalGain = 36 + (2 * relanceValue) + comboPoints;
      winner.addScore(totalGain, `Bleu-Rouge réussi (relance de ${relanceValue})`);
      this.engine.emit('scoreChanged', { player: winner, points: totalGain, reason: `Bleu-Rouge relance réussie` });
      resultText += `${winner.name} avait misé ${relanceValue} et gagne ${totalGain} pts !`;
      this.engine.checkWinCondition(winner);
    } else {
      resultText += 'Personne n\'avait misé cette valeur.';
    }

    this.renderScoreboard();

    // Pélican (★★★) : relance = 6-6-6
    if (isPelican && state.difficulty >= 3) {
      this.setExplanation('🐦 PÉLICAN ! (6-6-6 sur la relance)', resultText);
      this.setActions([{
        label: '🐦 Lancer le Buzz Pélican !',
        className: 'btn btn-success',
        action: () => this.startBuzzPelican(bets, relanceValue, winnerIdx)
      }]);
      return;
    }

    // Jarret (★★★) : Néant sur la relance
    if (isNeant && state.difficulty >= 3) {
      resultText += ' C\'est un Néant sur la relance → Jarret !';
      this.setExplanation('⚔️ Jarret ! (Néant sur relance)', resultText);
      this.setActions([{
        label: '⚔️ Lancer le Buzz Lance-Bûches !',
        className: 'btn btn-primary',
        action: () => this.startBuzzJarret()
      }]);
      return;
    }

    this.setExplanation('🔵🔴 Relance terminée', resultText);
    this.setActions([{
      label: '➡️ Tour Suivant',
      className: 'btn btn-primary',
      action: () => {
        this.engine.prepareNextTurn();
      }
    }]);
  }

  /**
   * Pélican : premier à crier "Pélican !" gagne 28 pts.
   */
  startBuzzPelican(bets, relanceValue, winnerIdx) {
    const buzzPlayers = this._getBuzzPlayers();
    const state = this.engine.getState();

    this.buzzOverlay.show({
      mode: 'firstWins',
      title: '🐦 Pélican !',
      instruction: 'Le PREMIER à buzzer gagne 28 pts ! En cas d\'égalité : "Passe-Montagne !"',
      players: buzzPlayers,
      timeoutMs: 4000
    });

    this.buzz.start({
      mode: 'firstWins',
      players: buzzPlayers,
      timeout: 4000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        if (result.winner !== null) {
          const winner = state.players[result.winner];
          let totalPelican = 28;

          // Si le gagnant avait aussi relancé de 18, il gagne le jackpot
          if (bets[result.winner] === 18) {
            // 36 (relance) + 36 (2×18) + 100 (CdC de 6) + 28 (Pélican) = 200
            // Les 36+36+100 sont déjà comptés dans resolveBleuRougeRelance si winnerIdx === result.winner
            totalPelican = 28;
          }

          winner.addScore(totalPelican, 'Pélican !');
          this.engine.emit('scoreChanged', { player: winner, points: totalPelican, reason: 'Pélican !' });
          this.buzzOverlay.showResult(`${winner.name} crie Pélican ! +28 pts`, 'win');
          this.engine.checkWinCondition(winner);
        } else {
          this.buzzOverlay.showResult('Personne n\'a crié Pélican à temps.', 'tie');
        }
        this.renderScoreboard();
        this.buzzOverlay.hideAfterDelay(2500).then(() => {
          this.engine.prepareNextTurn();
        });
      }
    });
    this.setActions([]);
  }

  /**
   * Jarret : premier à crier "Lance-Bûches !" gagne un Jarret.
   */
  startBuzzJarret() {
    const buzzPlayers = this._getBuzzPlayers();
    const state = this.engine.getState();

    this.buzzOverlay.show({
      mode: 'firstWins',
      title: '⚔️ Lance-Bûches !',
      instruction: 'Le PREMIER à buzzer gagne un Jarret !',
      players: buzzPlayers,
      timeoutMs: 4000
    });

    this.buzz.start({
      mode: 'firstWins',
      players: buzzPlayers,
      timeout: 4000,
      onBuzz: (data) => {
        this.buzzOverlay.markBuzzed(data.playerIndex, data.position);
      },
      onComplete: (result) => {
        if (result.winner !== null) {
          const winner = state.players[result.winner];
          if (winner.hasAnyJarret()) {
            this.buzzOverlay.showResult(`${winner.name} a déjà un Jarret ! (non cumulable)`, 'tie');
          } else {
            winner.giveItem('jarret');
            this.engine.emit('itemGained', { player: winner, item: 'jarret' });
            this.buzzOverlay.showResult(`${winner.name} obtient un Jarret !`, 'win');
          }
        } else {
          this.buzzOverlay.showResult('Personne n\'a crié Lance-Bûches à temps.', 'tie');
        }
        this.renderScoreboard();
        this.buzzOverlay.hideAfterDelay(2500).then(() => {
          this.engine.prepareNextTurn();
        });
      }
    });
    this.setActions([]);
  }

  // === VERDIER ===

  /**
   * Verdier : après le lancer des chouettes, si on a 6-4, 6-2 ou 4-2,
   * les adversaires peuvent parier sur une Velute de 6.
   * Mise : 5 pts, gain : 25 pts.
   */
  startVerdier(chouettes) {
    const state = this.engine.getState();
    const currentIdx = state.players.indexOf(state.currentPlayer);
    const others = state.players.filter((p, i) => i !== currentIdx && !p.eliminated);

    if (others.length === 0) return;

    this.setExplanation(
      '🌿 Verdier possible !',
      `Les chouettes (${chouettes[0]}-${chouettes[1]}) permettent une Velute de 6. Les adversaires peuvent parier "Vert-Linette !" (mise 5 pts, gain 25 pts).`
    );

    const zone = document.getElementById('action-zone');
    zone.innerHTML = '';

    const betsContainer = document.createElement('div');
    betsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 400px;';

    const verdierBets = {};

    others.forEach(player => {
      const idx = state.players.indexOf(player);
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-wood); border-radius: 4px;';
      row.innerHTML = `
        <span style="font-family: var(--font-title); color: var(--gold); flex: 1;">${player.name}</span>
        <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
          <input type="checkbox" id="verdier-${idx}">
          <span style="color: var(--green);">Vert-Linette !</span>
        </label>
      `;
      betsContainer.appendChild(row);
    });

    zone.appendChild(betsContainer);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = '🎲 Lancer le Cul';
    confirmBtn.style.marginTop = '12px';
    confirmBtn.addEventListener('click', () => {
      // Enregistrer les paris Verdier
      others.forEach(player => {
        const idx = state.players.indexOf(player);
        const checkbox = document.getElementById(`verdier-${idx}`);
        if (checkbox && checkbox.checked) {
          verdierBets[idx] = true;
        }
      });
      this.pendingVerdierBets = verdierBets;
      this.doRollCul();
    });
    zone.appendChild(confirmBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn';
    skipBtn.textContent = '✋ Aucun pari — Lancer le Cul';
    skipBtn.style.marginTop = '8px';
    skipBtn.addEventListener('click', () => {
      this.pendingVerdierBets = {};
      this.doRollCul();
    });
    zone.appendChild(skipBtn);
  }

  /**
   * Résout les paris Verdier après le lancer du cul.
   */
  resolveVerdierBets(combination) {
    if (!this.pendingVerdierBets || Object.keys(this.pendingVerdierBets).length === 0) return;

    const state = this.engine.getState();
    const isVeluteDe6 = combination.type === 'velute' && combination.value === 6;

    Object.keys(this.pendingVerdierBets).forEach(idx => {
      const player = state.players[parseInt(idx)];
      if (isVeluteDe6) {
        player.addScore(25, 'Verdier : Vert-Linette réussi !');
        this.engine.emit('scoreChanged', { player, points: 25, reason: 'Verdier réussi !' });
      } else {
        player.removeScore(5, 'Verdier : Vert-Linette raté');
        this.engine.emit('scoreChanged', { player, points: -5, reason: 'Verdier raté' });
      }
    });

    this.pendingVerdierBets = {};
    this.renderScoreboard();
  }

  // === JARRET (utilisation) ===

  /**
   * Propose au joueur d'utiliser son Jarret en début de tour.
   */
  offerJarretUse() {
    const state = this.engine.getState();
    const player = state.currentPlayer;

    if (!player.hasAnyJarret()) return false;

    const jarretType = player.items.jarret;
    const labels = {
      jarret: { name: 'Jarret', options: ['Mi-Jarret', 'Bi-Jarret', 'Lance-Jarret'] },
      jarretSouple: { name: 'Jarret Souple', options: ['Mi-Jarret', 'Bi-Jarret', 'Jarret-Sifflet', 'Lance-Jarret'] },
      jarretSifflet: { name: 'Jarret-Sifflet', options: ['Jarret-Sifflet', 'Lance-Jarret'] }
    };

    const config = labels[jarretType];
    this.setExplanation(
      `⚔️ Vous possédez un ${config.name} !`,
      'Vous pouvez l\'utiliser avant de lancer. Mi-Jarret = 2 lancers. Bi-Jarret = double les points. Jarret-Sifflet = les deux !'
    );

    const buttons = [];

    if (config.options.includes('Mi-Jarret')) {
      buttons.push({
        label: '🔄 Mi-Jarret (2 lancers)',
        className: 'btn btn-success',
        action: () => {
          player.removeItem(jarretType);
          this.activeJarret = 'miJarret';
          this.renderScoreboard();
          this.setExplanation('Mi-Jarret activé !', 'Vous avez 2 lancers. Vous pouvez garder les dés de votre choix entre les deux lancers.');
          this.setActions([{
            label: '🎲 Lancer les Chouettes',
            className: 'btn btn-primary',
            action: () => this.doRollChouettes()
          }]);
        }
      });
    }

    if (config.options.includes('Bi-Jarret')) {
      buttons.push({
        label: '✖️2 Bi-Jarret (double)',
        className: 'btn btn-success',
        action: () => {
          player.removeItem(jarretType);
          this.activeJarret = 'biJarret';
          this.renderScoreboard();
          this.setExplanation('Bi-Jarret activé !', 'La valeur de votre combinaison sera DOUBLÉE ce tour.');
          this.setActions([{
            label: '🎲 Lancer les Chouettes',
            className: 'btn btn-primary',
            action: () => this.doRollChouettes()
          }]);
        }
      });
    }

    if (config.options.includes('Jarret-Sifflet')) {
      buttons.push({
        label: '⚡ Jarret-Sifflet (2 lancers + double)',
        className: 'btn btn-primary',
        action: () => {
          player.removeItem(jarretType);
          this.activeJarret = 'jarretSifflet';
          this.renderScoreboard();
          this.setExplanation('Jarret-Sifflet activé !', 'Vous avez 2 lancers ET la combinaison finale sera DOUBLÉE.');
          this.setActions([{
            label: '🎲 Lancer les Chouettes',
            className: 'btn btn-primary',
            action: () => this.doRollChouettes()
          }]);
        }
      });
    }

    if (config.options.includes('Lance-Jarret')) {
      buttons.push({
        label: '🎯 Lance-Jarret (donner)',
        className: 'btn',
        action: () => {
          // Donner le jarret à un autre joueur
          this.showTargetSelection('Donner le Jarret à...', (targetIdx) => {
            const target = state.players[targetIdx];
            if (target.hasAnyJarret()) {
              this.setExplanation('⚠️ Bévue !', `${target.name} a déjà un Jarret. Non cumulable ! Bévue pour vous.`);
              this.engine.ruleEngine.applyBevue(player, 'Lance-Jarret vers un joueur qui en possède déjà un');
            } else {
              player.removeItem(jarretType);
              target.giveItem('jarret');
              this.engine.emit('itemGained', { player: target, item: 'jarret' });
              this.setExplanation('Lance-Jarret !', `${target.name} reçoit votre Jarret.`);
            }
            this.renderScoreboard();
            this.setActions([{
              label: '🎲 Lancer les Chouettes',
              className: 'btn btn-primary',
              action: () => this.doRollChouettes()
            }]);
          });
        }
      });
    }

    // Toujours pouvoir passer
    buttons.push({
      label: '✋ Ne pas utiliser',
      className: 'btn',
      action: () => {
        this.activeJarret = null;
        this.setActions([{
          label: '🎲 Lancer les Chouettes',
          className: 'btn btn-primary',
          action: () => this.doRollChouettes()
        }]);
        this.setExplanation('Prêt à jouer', `Lancez les Chouettes.`);
      }
    });

    this.setActions(buttons);
    return true;
  }

  /**
   * Affiche un sélecteur de cible (pour Lance-Jarret, Soufflette, etc.)
   */
  showTargetSelection(title, callback) {
    const state = this.engine.getState();
    const currentIdx = state.players.indexOf(state.currentPlayer);
    const others = state.players.filter((p, i) => i !== currentIdx && !p.eliminated);

    this.setExplanation(title, 'Cliquez sur un joueur pour le cibler.');

    const buttons = others.map(player => {
      const idx = state.players.indexOf(player);
      return {
        label: `🎯 ${player.name}`,
        className: 'btn',
        action: () => callback(idx)
      };
    });

    buttons.push({
      label: '← Annuler',
      className: 'btn btn-danger',
      action: () => {
        this.offerJarretUse();
      }
    });

    this.setActions(buttons);
  }

  // === SOUFFLETTE INTERACTIVE ===

  startSouffletteInteractive(targetIdx) {
    const state = this.engine.getState();
    const target = state.players[targetIdx];
    const challenger = state.currentPlayer;

    this.setExplanation(
      `⚔️ En garde ma mignonne !`,
      `${challenger.name} souflette ${target.name} ! Le soufflé a 3 lancers pour refaire 4-2-1. Cliquez sur les dés pour les garder entre les lancers.`
    );

    const soufflette = new SouffletteUI((result) => {
      this.engine.resolveSoufflette(targetIdx, result.attempt, result.success);
      this.renderScoreboard();
    });

    soufflette.start(
      challenger,
      target,
      (t, d) => this.setExplanation(t, d),
      (btns) => this.setActions(btns),
      (id, val) => { this.sound.diceLand(); this.renderDie(id, val); }
    );
  }

  // === UI Helpers ===
  renderDie(id, value) {
    const el = document.getElementById(id);
    el.classList.remove('empty', 'dice-landed', 'dice-rolling');

    // Rolling animation phase (rapid number shuffle)
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

  setDieState(id, state) {
    const el = document.getElementById(id);
    if (state === 'empty') {
      el.textContent = '?';
      el.classList.add('empty');
    }
  }

  resetDice() {
    ['die-1', 'die-2', 'die-3'].forEach(id => this.setDieState(id, 'empty'));
  }

  setExplanation(title, text) {
    document.getElementById('explanation-title').textContent = title;
    document.getElementById('explanation-text').textContent = text;
  }

  setActions(buttons) {
    const zone = document.getElementById('action-zone');
    zone.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.className || 'btn';
      btn.textContent = b.label;
      btn.addEventListener('click', b.action);
      zone.appendChild(btn);
    });
  }

  updateGameUI() {
    const state = this.engine.getState();
    document.getElementById('turn-number').textContent = `Tour ${state.turnNumber}`;
    document.getElementById('current-player-name').textContent = state.currentPlayer.name;
    this.renderScoreboard();
  }

  renderScoreboard() {
    const container = document.getElementById('scoreboard');
    const state = this.engine.getState();
    container.innerHTML = '';

    state.players.forEach((player, idx) => {
      const avatar = AVATARS.find(a => a.id === player.avatarId) || AVATARS[0];
      const isActive = idx === state.players.indexOf(state.currentPlayer);
      const progress = Math.max(0, Math.min(100, (player.score / 343) * 100));
      // 8 niveaux d'enflammement (0-7)
      const flameLevel = Math.min(7, Math.floor(progress / 14.3));

      const card = document.createElement('div');
      card.className = `player-card ${isActive ? 'active' : ''} ${player.eliminated ? 'eliminated' : ''}`;
      card.innerHTML = `
        <div class="player-avatar" style="background: ${avatar.color};">${avatar.name[0]}</div>
        <div class="player-card-name">${player.name}</div>
        <div class="player-card-score">${player.score}</div>
        <div class="player-card-items">${this.renderItemIcons(player)}</div>
        <div class="player-card-progress">
          <div class="excalibur-sword" data-progress="${flameLevel}">
            <svg viewBox="0 0 200 36" xmlns="http://www.w3.org/2000/svg">
              <!-- Lame (large) -->
              <polygon points="4,18 12,12 160,13 165,18 160,23 12,24" fill="#b8b8c8" stroke="#6a6a80" stroke-width="0.8"/>
              <!-- Fil du tranchant (reflet central) -->
              <line x1="12" y1="18" x2="160" y2="18" stroke="#f0f0ff" stroke-width="1.5" opacity="0.5"/>
              <!-- Pointe effilée -->
              <polygon points="0,18 4,18 12,12 12,24" fill="#d8d8e8" stroke="#8888a0" stroke-width="0.5"/>
              <!-- Gouttière (fuller) -->
              <rect x="30" y="16" width="120" height="4" rx="2" fill="#9898b0" opacity="0.4"/>
              <!-- Garde (crossguard) -->
              <rect x="160" y="4" width="6" height="28" rx="2" fill="#d4af37" stroke="#8b7320" stroke-width="0.8"/>
              <rect x="161" y="6" width="4" height="4" rx="1" fill="#f0d060" opacity="0.6"/>
              <rect x="161" y="26" width="4" height="4" rx="1" fill="#f0d060" opacity="0.6"/>
              <!-- Poignée (grip) -->
              <rect x="166" y="11" width="22" height="14" rx="3" fill="#3a2718" stroke="#1a0a00" stroke-width="0.8"/>
              <!-- Lacets de la poignée -->
              <line x1="170" y1="11" x2="170" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <line x1="175" y1="11" x2="175" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <line x1="180" y1="11" x2="180" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <line x1="185" y1="11" x2="185" y2="25" stroke="#5a4030" stroke-width="1.2"/>
              <!-- Pommeau -->
              <ellipse cx="192" cy="18" rx="6" ry="7" fill="#d4af37" stroke="#8b7320" stroke-width="0.8"/>
              <circle cx="192" cy="18" r="3.5" fill="#a82039"/>
              <circle cx="191" cy="17" r="1.2" fill="#ff6080" opacity="0.6"/>
            </svg>
            <div class="excalibur-flame" style="clip-path: inset(0 ${100 - progress}% 0 0);">
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
      card.addEventListener('click', () => this.openDashboard(idx));
      container.appendChild(card);
    });
  }

  renderItemIcons(player) {
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

  flashPlayerCard(player, direction) {
    const state = this.engine.getState();
    const idx = state.players.indexOf(player);
    const cards = document.querySelectorAll('.player-card');
    if (cards[idx]) {
      const card = cards[idx];
      card.classList.add(direction === 'up' ? 'score-up' : 'score-down');
      setTimeout(() => {
        card.classList.remove('score-up', 'score-down');
      }, 500);

      // Floating score number
      const rect = card.getBoundingClientRect();
      const float = document.createElement('div');
      const pts = player.history.length > 0 ? player.history[player.history.length - 1].points : 0;
      float.className = `score-float ${direction === 'up' ? 'positive' : 'negative'}`;
      float.textContent = `${pts >= 0 ? '+' : ''}${pts}`;
      float.style.left = `${rect.left + rect.width / 2 - 20}px`;
      float.style.top = `${rect.top - 10}px`;
      document.body.appendChild(float);
      setTimeout(() => float.remove(), 1800);
    }
  }

  _getPlayerCard(player) {
    const state = this.engine.getState();
    const idx = state.players.indexOf(player);
    const cards = document.querySelectorAll('.player-card');
    return cards[idx] || null;
  }

  // === DASHBOARD ===
  bindDashboard() {
    document.getElementById('btn-close-dashboard').addEventListener('click', () => {
      document.getElementById('dashboard-overlay').classList.remove('active');
    });
    document.getElementById('dashboard-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('dashboard-overlay')) {
        document.getElementById('dashboard-overlay').classList.remove('active');
      }
    });
  }

  openDashboard(playerIdx) {
    const state = this.engine.getState();
    const player = state.players[playerIdx];
    const avatar = AVATARS.find(a => a.id === player.avatarId) || AVATARS[0];

    document.getElementById('dashboard-avatar').textContent = avatar.name[0];
    document.getElementById('dashboard-avatar').style.background = avatar.color;
    document.getElementById('dashboard-name').textContent = player.name;
    document.getElementById('dashboard-score').textContent = `${player.score} pts`;

    // Inventaire
    const invContainer = document.getElementById('dashboard-inventory');
    const items = [
      { key: 'grelottine', label: 'Grelottine', icon: '🛡️' },
      { key: 'civet', label: 'Civet', icon: '🏺' },
      { key: 'civetFiloche', label: 'Civet-Filoché', icon: '🧵' },
      { key: 'flan', label: 'Flan', icon: '🎯' },
      { key: 'jarret', label: 'Jarret', icon: '⚔️', isJarret: true },
      { key: 'passeGrelot', label: 'Passe-Grelot', icon: '🔄' },
      { key: 'rigodon', label: 'Rigodon', icon: '🎵' }
    ];

    invContainer.innerHTML = items.map(item => {
      let hasIt;
      if (item.isJarret) {
        hasIt = player.items.jarret !== null;
      } else {
        hasIt = player.items[item.key];
      }
      return `<div class="inventory-item ${hasIt ? 'has-item' : 'no-item'}">
        ${item.icon} ${item.label} ${hasIt ? '✅' : '❌'}
      </div>`;
    }).join('');

    // Historique
    const histContainer = document.getElementById('dashboard-history');
    const lastEntries = player.history.slice(-10).reverse();
    histContainer.innerHTML = lastEntries.map(h => `
      <div class="history-entry">
        <span>${h.reason}</span>
        <span class="points ${h.points >= 0 ? 'score-positive' : 'score-negative'}">
          ${h.points >= 0 ? '+' : ''}${h.points}
        </span>
      </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 0.8rem;">Aucun historique</p>';

    document.getElementById('dashboard-overlay').classList.add('active');
  }

  // === LOG ===
  bindLogPanel() {
    document.getElementById('btn-close-log').addEventListener('click', () => {
      document.getElementById('log-panel').classList.remove('open');
    });
  }

  addLogEntry() {
    const state = this.engine.getState();
    const container = document.getElementById('log-entries');
    const lastLogs = state.log.slice(-5);
    container.innerHTML = state.log.map(entry => `
      <div class="log-entry">
        <span class="turn-badge">T${entry.turn}</span>
        ${entry.message || entry.description || `${entry.player}: ${entry.combination}`}
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }

  // === GAME OVER ===
  bindGameOver() {
    document.getElementById('btn-new-game-end').addEventListener('click', () => {
      this.engine.state.reset();
      this.showScreen('setup-screen');
    });
    document.getElementById('btn-back-title-end').addEventListener('click', () => {
      this.showScreen('title-screen');
    });
  }
}

// === Lancement ===
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

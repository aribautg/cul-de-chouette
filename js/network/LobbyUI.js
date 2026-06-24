import { NetworkClient } from './NetworkClient.js';
import { OnlineGameUI } from './OnlineGameUI.js';
import { VoiceChat } from './VoiceChat.js';
import { ChatPanel } from '../ui/ChatPanel.js';
import { VoiceMeter } from '../ui/VoiceMeter.js';
import { AVATARS } from '../utils/constants.js';

/**
 * LobbyUI — Gère l'interface du lobby multijoueur en ligne.
 * Le chat vocal est délégué à Jitsi Meet (lien externe).
 */
export class LobbyUI {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.network = null;
    this.roomCode = null;
    this.isHost = false;
    this.voiceChat = null;
    this.voiceMeter = null;
    this.chatPanel = null;
    this.onGameStart = null;
    this.onlineGameUI = null;

    this._bindUI();
  }

  _bindUI() {
    document.getElementById('mode-local').addEventListener('click', () => {
      document.getElementById('mode-local').classList.add('selected');
      document.getElementById('mode-online').classList.remove('selected');
      document.getElementById('online-section').style.display = 'none';
      document.getElementById('lobby-section').style.display = 'none';
    });

    document.getElementById('mode-online').addEventListener('click', () => {
      document.getElementById('mode-online').classList.add('selected');
      document.getElementById('mode-local').classList.remove('selected');
      document.getElementById('online-section').style.display = 'block';
    });

    document.getElementById('btn-create-room').addEventListener('click', () => this.createRoom());
    document.getElementById('btn-join-room').addEventListener('click', () => this.joinRoom());
    document.getElementById('btn-voice-chat').addEventListener('click', () => this.toggleVoiceChat());
    document.getElementById('btn-lobby-chat').addEventListener('click', () => this._toggleChat());
    document.getElementById('btn-start-online').addEventListener('click', () => this.startOnlineGame());
  }

  async _connect() {
    if (this.network && this.network.connected) return;

    this.network = new NetworkClient(this.serverUrl);
    this._setStatus('Connexion au serveur...');

    try {
      await this.network.connect();

      this.network.on('playerJoined', (data) => this._updateLobbyPlayers(data.players));
      this.network.on('playerLeft', (data) => this._updateLobbyPlayers(data.players));
      this.network.on('gameStarted', (data) => this._onGameStarted(data));

      // Initialiser le chat dès la connexion
      this.chatPanel = new ChatPanel(this.network);

      this._setStatus('Connecté ✓');
    } catch (err) {
      this._setStatus('❌ Erreur de connexion : ' + err.message);
    }
  }

  _toggleChat() {
    if (!this.chatPanel) {
      if (this.network) {
        this.chatPanel = new ChatPanel(this.network);
      } else {
        this._setStatus('❌ Connectez-vous d\'abord.');
        return;
      }
    }
    this.chatPanel.toggle();
  }

  async createRoom() {
    await this._connect();
    if (!this.network || !this.network.connected) {
      this._setStatus('❌ Impossible de se connecter au serveur. Réessayez.');
      return;
    }

    const name = document.getElementById('online-player-name').value.trim() || 'Hôte';
    const avatar = AVATARS[0].id;
    const difficulty = parseInt(document.querySelector('.difficulty-option.selected[data-difficulty]')?.dataset.difficulty || '1');

    this._setStatus('Création de la salle...');

    try {
      const res = await this.network.createRoom(name, avatar, difficulty, true);
      if (res.success) {
        this.isHost = true;
        this.roomCode = res.roomCode;
        document.getElementById('lobby-room-code').textContent = res.roomCode;
        document.getElementById('online-section').style.display = 'none';
        document.getElementById('lobby-section').style.display = 'block';
        document.getElementById('btn-start-online').style.display = 'inline-block';
        this._updateLobbyPlayers([{ name, avatarId: avatar, isHost: true }]);
        this._setStatus(`✓ Salle créée : ${res.roomCode} — Partagez ce code !`);
      } else {
        this._setStatus('❌ ' + (res.error || 'Erreur inconnue'));
      }
    } catch (err) {
      this._setStatus('❌ Erreur réseau : ' + err.message);
    }
  }

  async joinRoom() {
    await this._connect();
    const name = document.getElementById('online-join-name').value.trim() || 'Joueur';
    const code = document.getElementById('online-room-code').value.trim().toUpperCase();
    const avatar = AVATARS[1].id;

    if (!code) { this._setStatus('❌ Entrez un code de salle.'); return; }

    this._setStatus(`Connexion à la salle ${code}...`);

    try {
      const res = await this.network.joinRoom(code, name, avatar);
      if (res.success) {
        this.isHost = false;
        this.roomCode = res.roomCode;
        document.getElementById('lobby-room-code').textContent = res.roomCode;
        document.getElementById('online-section').style.display = 'none';
        document.getElementById('lobby-section').style.display = 'block';
        document.getElementById('btn-start-online').style.display = 'none';
        this._setStatus(`✓ Rejoint la salle ${res.roomCode}`);
      } else {
        this._setStatus('❌ ' + (res.error || 'Erreur inconnue'));
      }
    } catch (err) {
      this._setStatus('❌ Erreur réseau : ' + err.message);
    }
  }

  /**
   * Active/désactive le chat vocal intégré (WebRTC).
   */
  async toggleVoiceChat() {
    if (!this.network || !this.network.connected) {
      this._setStatus('❌ Connectez-vous à une salle d\'abord.');
      return;
    }

    if (!this.voiceChat) {
      this.voiceChat = new VoiceChat(this.network);
      this.voiceMeter = new VoiceMeter();

      this.voiceChat.onStateChange = (state) => {
        this._updateVoiceButton();
      };

      // Quand un stream distant arrive, connecter au VoiceMeter
      this.voiceChat.onRemoteStream = (peerId, stream) => {
        const card = document.querySelector(`.player-card[data-peer-id="${peerId}"]`) || 
                     document.querySelectorAll('.player-card')[1]; // fallback
        if (card) this.voiceMeter.attachStream(peerId, stream, card);
        this._setStatus('🔊 Audio connecté avec un joueur !');
      };

      this.voiceChat.onConnectionStatus = (peerId, status) => {
        if (status === 'connected') {
          this._setStatus('✓ Connexion vocale établie !');
        } else if (status === 'failed') {
          this._setStatus('⚠️ Connexion vocale échouée (réseau restrictif). Essayez sur un autre réseau.');
        }
      };
    }

    if (!this.voiceChat.isActive()) {
      const ok = await this.voiceChat.join();
      if (ok) {
        // Connecter le VoiceMeter au micro local
        if (this.voiceChat.localStream) {
          const myCard = document.querySelector('.player-card') || document.body;
          this.voiceMeter.attachStream('local', this.voiceChat.localStream, myCard);
        }
        this.voiceChat.toggleMute(); // Unmute immédiatement
        this._setStatus('🎙️ Chat vocal activé — vous êtes en direct !');
      } else {
        this._setStatus('❌ Micro refusé par le navigateur. Vérifiez les permissions.');
      }
    } else {
      // Toggle mute
      const muted = this.voiceChat.toggleMute();
      this._setStatus(muted ? '🔇 Micro coupé' : '🎙️ Micro actif');
    }
    this._updateVoiceButton();
  }

  _updateVoiceButton() {
    const btn = document.getElementById('btn-voice-chat');
    const gameBtn = document.getElementById('btn-game-voice');
    const label = !this.voiceChat?.isActive() ? '🎙️ Activer le vocal'
      : this.voiceChat.isMuted() ? '🔇 Micro coupé (cliquer pour parler)'
      : '🎙️ Micro actif (cliquer pour couper)';
    if (btn) btn.textContent = label;
    if (gameBtn) gameBtn.textContent = this.voiceChat?.isActive()
      ? (this.voiceChat.isMuted() ? '🔇' : '🎙️')
      : '🎙️';
  }

  async startOnlineGame() {
    if (!this.isHost) return;
    const res = await this.network.startGame();
    if (!res.success) {
      this._setStatus('❌ ' + (res.error || 'Erreur'));
    }
  }

  _onGameStarted(data) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('game-screen').classList.add('active');

    // Show voice chat button in game header
    const voiceBtn = document.getElementById('btn-game-voice');
    if (voiceBtn) {
      voiceBtn.style.display = 'inline-block';
      voiceBtn.onclick = () => this.toggleVoiceChat();
      this._updateVoiceButton();
    }

    // Show chat button in game header
    const chatBtn = document.getElementById('btn-game-chat');
    if (chatBtn) {
      chatBtn.style.display = 'inline-block';
      chatBtn.onclick = () => this._toggleChat();
    }

    // Connect voice to new peers when they join during game
    this.network.on('playerJoined', (data) => {
      if (this.voiceChat && this.voiceChat.isActive() && data.newPlayer) {
        this.voiceChat.connectPeer(data.newPlayer.id);
      }
    });
    this.network.on('playerLeft', (data) => {
      if (this.voiceChat && data.playerId) {
        this.voiceChat.disconnectPeer(data.playerId);
      }
    });

    this.onlineGameUI = new OnlineGameUI(this.network, data);

    if (this.onGameStart) {
      this.onGameStart(data, this.onlineGameUI);
    }
  }

  _updateLobbyPlayers(players) {
    const container = document.getElementById('lobby-players');
    if (!container) return;
    container.innerHTML = players.map(p => {
      const avatar = AVATARS.find(a => a.id === p.avatarId) || AVATARS[0];
      return `<div class="player-setup-row">
        <div class="avatar-mini" style="background: ${avatar.color};">${avatar.name[0]}</div>
        <span style="flex: 1; color: var(--text-primary);">${p.name}</span>
        ${p.isHost ? '<span style="color: var(--gold); font-size: 0.75rem;">👑 HÔTE</span>' : ''}
      </div>`;
    }).join('');
  }

  _setStatus(msg) {
    const el = document.getElementById('online-status');
    if (el) el.textContent = msg;
  }

  getNetwork() { return this.network; }
}

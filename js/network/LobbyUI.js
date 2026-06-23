import { NetworkClient } from './NetworkClient.js';
import { OnlineGameUI } from './OnlineGameUI.js';
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
    document.getElementById('btn-voice-chat').addEventListener('click', () => this.openVoiceChat());
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

      this._setStatus('Connecté ✓');
    } catch (err) {
      this._setStatus('❌ Erreur de connexion : ' + err.message);
    }
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
   * Ouvre un salon vocal Jitsi Meet dans un nouvel onglet.
   * Le nom de la salle Jitsi est basé sur le code de la salle de jeu.
   */
  openVoiceChat() {
    if (!this.roomCode) {
      this._setStatus('❌ Créez ou rejoignez une salle d\'abord.');
      return;
    }
    const jitsiRoom = `CulDeChouette-${this.roomCode}`;
    const url = `https://meet.jit.si/${jitsiRoom}`;
    window.open(url, '_blank');
    this._setStatus(`🎙️ Chat vocal ouvert dans un nouvel onglet (Jitsi)`);
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
      voiceBtn.addEventListener('click', () => this.openVoiceChat());
    }

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

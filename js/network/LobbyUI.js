import { NetworkClient } from './NetworkClient.js';
import { WebRTCManager } from './WebRTCManager.js';
import { AVATARS } from '../utils/constants.js';

/**
 * LobbyUI — Gère l'interface du lobby multijoueur en ligne.
 */
export class LobbyUI {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.network = null;
    this.webrtc = null;
    this.isHost = false;
    this.onGameStart = null; // callback quand la partie démarre

    this._bindUI();
  }

  _bindUI() {
    // Toggle mode local/online
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

    // Créer une salle
    document.getElementById('btn-create-room').addEventListener('click', () => this.createRoom());

    // Rejoindre une salle
    document.getElementById('btn-join-room').addEventListener('click', () => this.joinRoom());

    // Micro/Caméra
    document.getElementById('btn-toggle-mic').addEventListener('click', () => this.toggleMic());
    document.getElementById('btn-toggle-cam').addEventListener('click', () => this.toggleCam());

    // Lancer la partie online
    document.getElementById('btn-start-online').addEventListener('click', () => this.startOnlineGame());
  }

  async _connect() {
    if (this.network && this.network.connected) return;

    this.network = new NetworkClient(this.serverUrl);
    this._setStatus('Connexion au serveur...');

    try {
      await this.network.connect();

      this.network.on('connected', () => {
        this._setStatus('✓ Connecté au serveur');
      });

      this.network.on('disconnected', () => {
        this._setStatus('⚠️ Déconnecté du serveur');
      });

      this.webrtc = new WebRTCManager(this.network);

      // Quand un stream distant arrive, afficher la vidéo
      this.webrtc.onRemoteStream = (peerId, stream) => {
        this._addRemoteVideo(peerId, stream);
      };

      this.webrtc.onPeerDisconnect = (peerId) => {
        this._removeRemoteVideo(peerId);
      };

      this.network.on('playerJoined', (data) => {
        this._updateLobbyPlayers(data.players);
        // Si on a un stream local actif, connecter au nouveau joueur
        if (this.webrtc && this.webrtc.localStream && data.newPlayer && data.newPlayer.id !== this.network.playerId) {
          this.webrtc.connectToPeer(data.newPlayer.id);
        }
      });
      this.network.on('playerLeft', (data) => {
        this._updateLobbyPlayers(data.players);
        if (this.webrtc && data.playerId) {
          this.webrtc.disconnectPeer(data.playerId);
        }
      });

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

  async toggleMic() {
    if (!this.webrtc) {
      this._setStatus('❌ Non connecté au serveur.');
      return;
    }
    try {
      if (!this.webrtc.localStream) {
        const stream = await this.webrtc.enableMedia(true, false);
        if (stream) {
          document.getElementById('btn-toggle-mic').textContent = '🎤 Micro ON';
          this._setStatus('🎤 Micro activé');
          this._connectToAllPeers();
        } else {
          this._setStatus('❌ Micro refusé par le navigateur. Vérifiez les permissions.');
        }
      } else {
        const enabled = this.webrtc.toggleMute();
        document.getElementById('btn-toggle-mic').textContent = enabled ? '🎤 Micro ON' : '🔇 Micro OFF';
      }
    } catch (err) {
      this._setStatus('❌ Micro : ' + err.message);
    }
  }

  async toggleCam() {
    if (!this.webrtc) {
      this._setStatus('❌ Non connecté au serveur.');
      return;
    }
    try {
      if (!this.webrtc.videoEnabled) {
        // Allumer la caméra : recréer le stream avec audio + vidéo
        this.webrtc.disableMedia();
        const stream = await this.webrtc.enableMedia(true, true);
        if (stream) {
          document.getElementById('btn-toggle-cam').textContent = '📷 Caméra ON';
          document.getElementById('btn-toggle-mic').textContent = '🎤 Micro ON';
          // Retirer l'ancienne vidéo locale si elle existe
          const oldVid = document.getElementById('local-video');
          if (oldVid) oldVid.remove();
          this._addLocalVideo(stream);
          this._setStatus('📷 Caméra activée');
          this._connectToAllPeers();
        } else {
          this._setStatus('❌ Caméra refusée par le navigateur. Vérifiez les permissions.');
        }
      } else {
        // Éteindre la caméra (stop le track, éteint le voyant)
        this.webrtc.toggleVideo();
        document.getElementById('btn-toggle-cam').textContent = '📷 Caméra OFF';
        const localVid = document.getElementById('local-video');
        if (localVid) localVid.remove();
        this._setStatus('📷 Caméra éteinte');
      }
    } catch (err) {
      this._setStatus('❌ Caméra : ' + err.message);
    }
  }

  _connectToAllPeers() {
    if (!this.network || !this.webrtc) return;
    // Demander au serveur la liste des peers dans la salle
    this.network.socket.emit('room:getPeers', {}, (peers) => {
      if (peers && peers.length > 0) {
        peers.forEach(peerId => {
          if (peerId !== this.network.playerId) {
            this.webrtc.connectToPeer(peerId);
          }
        });
      }
    });
  }

  async startOnlineGame() {
    if (!this.isHost) return;
    const res = await this.network.startGame();
    if (!res.success) {
      this._setStatus('❌ ' + res.error);
    }
    // L'événement 'gameStarted' sera reçu par tous via socket
  }

  _updateLobbyPlayers(players) {
    const container = document.getElementById('lobby-players');
    container.innerHTML = players.map(p => {
      const avatar = AVATARS.find(a => a.id === p.avatarId) || AVATARS[0];
      return `<div class="player-setup-row">
        <div class="avatar-mini" style="background: ${avatar.color};">${avatar.name[0]}</div>
        <span style="flex: 1; color: var(--text-primary);">${p.name}</span>
        ${p.isHost ? '<span style="color: var(--gold); font-size: 0.75rem;">👑 HÔTE</span>' : ''}
      </div>`;
    }).join('');
  }

  _addLocalVideo(stream) {
    const container = document.getElementById('lobby-videos');
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true; // mute local pour éviter echo
    video.playsInline = true;
    video.style.cssText = 'width: 120px; height: 90px; border-radius: 8px; border: 2px solid var(--gold); object-fit: cover;';
    video.id = 'local-video';
    container.appendChild(video);
  }

  _addRemoteVideo(peerId, stream) {
    const container = document.getElementById('lobby-videos');
    const existing = document.getElementById(`video-${peerId}`);
    if (existing) existing.remove();

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText = 'width: 120px; height: 90px; border-radius: 8px; border: 2px solid var(--border-wood); object-fit: cover;';
    video.id = `video-${peerId}`;
    container.appendChild(video);
  }

  _removeRemoteVideo(peerId) {
    const el = document.getElementById(`video-${peerId}`);
    if (el) el.remove();
  }

  _setStatus(msg) {
    const el = document.getElementById('online-status');
    if (el) el.textContent = msg;
  }

  getNetwork() { return this.network; }
  getWebRTC() { return this.webrtc; }
}

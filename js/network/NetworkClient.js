/**
 * NetworkClient — Gère la connexion WebSocket au serveur de jeu.
 * Remplace le GameEngine local en mode multijoueur.
 */
export class NetworkClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.listeners = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      const doConnect = () => {
        this.socket = window.io(this.serverUrl, {
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          this.connected = true;
          this.playerId = this.socket.id;
          this._emit('connected', { id: this.socket.id });
          resolve();
        });

        this.socket.on('connect_error', (err) => {
          reject(new Error('Connexion refusée : ' + err.message));
        });

        this.socket.on('disconnect', () => {
          this.connected = false;
          this._emit('disconnected', {});
        });

        // === Événements de salle ===
        this.socket.on('room:playerJoined', (data) => this._emit('playerJoined', data));
        this.socket.on('room:playerLeft', (data) => this._emit('playerLeft', data));

        // === Événements de jeu ===
        this.socket.on('game:started', (data) => this._emit('gameStarted', data));
        this.socket.on('game:chouettesRolled', (data) => this._emit('chouettesRolled', data));
        this.socket.on('game:culRolled', (data) => this._emit('culRolled', data));
        this.socket.on('game:buzzRegistered', (data) => this._emit('buzzRegistered', data));
        this.socket.on('game:buzzResolved', (data) => this._emit('buzzResolved', data));
        this.socket.on('game:actionResult', (data) => this._emit('actionResult', data));
        this.socket.on('game:turnStarted', (data) => this._emit('turnStarted', data));

        // === WebRTC signaling ===
        this.socket.on('webrtc:offer', (data) => this._emit('webrtcOffer', data));
        this.socket.on('webrtc:answer', (data) => this._emit('webrtcAnswer', data));
        this.socket.on('webrtc:ice-candidate', (data) => this._emit('webrtcIceCandidate', data));
      };

      // Charger Socket.IO depuis le CDN si nécessaire
      if (!window.io) {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => doConnect();
        script.onerror = () => reject(new Error('Impossible de charger Socket.IO'));
        document.head.appendChild(script);
      } else {
        doConnect();
      }
    });
  }

  // === Actions ===

  createRoom(playerName, avatarId, difficulty, allowNegativeScores) {
    return new Promise((resolve) => {
      this.socket.emit('room:create', { playerName, avatarId, difficulty, allowNegativeScores }, (res) => {
        if (res.success) {
          this.roomCode = res.roomCode;
          this.playerId = res.playerId;
        }
        resolve(res);
      });
    });
  }

  joinRoom(roomCode, playerName, avatarId) {
    return new Promise((resolve) => {
      this.socket.emit('room:join', { roomCode, playerName, avatarId }, (res) => {
        if (res.success) {
          this.roomCode = res.roomCode;
          this.playerId = res.playerId;
        }
        resolve(res);
      });
    });
  }

  startGame() {
    return new Promise((resolve) => {
      this.socket.emit('game:start', {}, resolve);
    });
  }

  rollChouettes() {
    return new Promise((resolve) => {
      this.socket.emit('game:rollChouettes', {}, resolve);
    });
  }

  rollCul() {
    return new Promise((resolve) => {
      this.socket.emit('game:rollCul', {}, resolve);
    });
  }

  buzz() {
    this.socket.emit('game:buzz', { timestamp: Date.now() });
  }

  sendAction(action, params = {}) {
    return new Promise((resolve) => {
      this.socket.emit('game:action', { action, params }, resolve);
    });
  }

  nextTurn() {
    this.socket.emit('game:nextTurn');
  }

  // === WebRTC ===

  sendWebRTCOffer(targetId, offer) {
    this.socket.emit('webrtc:offer', { targetId, offer });
  }

  sendWebRTCAnswer(targetId, answer) {
    this.socket.emit('webrtc:answer', { targetId, answer });
  }

  sendICECandidate(targetId, candidate) {
    this.socket.emit('webrtc:ice-candidate', { targetId, candidate });
  }

  // === Event system ===

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

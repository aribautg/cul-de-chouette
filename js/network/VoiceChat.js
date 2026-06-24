/**
 * VoiceChat — Chat vocal intégré au jeu via WebRTC.
 * Audio seulement (pas de vidéo) pour fiabilité et bande passante.
 * Utilise STUN + TURN pour fonctionner derrière tous les NAT/firewalls.
 */
export class VoiceChat {
  constructor(networkClient) {
    this.network = networkClient;
    this.localStream = null;
    this.peers = new Map(); // peerId → { connection, remoteAudio }
    this.muted = true; // Commence muté
    this.active = false;
    this.onStateChange = null; // callback(state)
    this.onRemoteStream = null; // callback(peerId, stream) — pour le VoiceMeter
    this.onConnectionStatus = null; // callback(peerId, status)

    this._iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];

    this._bindSignaling();
  }

  _bindSignaling() {
    this.network.on('webrtcOffer', async ({ fromId, offer }) => {
      try {
        const pc = this._getOrCreatePeer(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            if (!pc.getSenders().find(s => s.track === track)) {
              pc.addTrack(track, this.localStream);
            }
          });
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.network.sendWebRTCAnswer(fromId, answer);
      } catch (err) {
        console.error('[Voice] Offer error:', err);
      }
    });

    this.network.on('webrtcAnswer', async ({ fromId, answer }) => {
      try {
        const peer = this.peers.get(fromId);
        if (peer) await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('[Voice] Answer error:', err);
      }
    });

    this.network.on('webrtcIceCandidate', async ({ fromId, candidate }) => {
      try {
        const peer = this.peers.get(fromId);
        if (peer && candidate) await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[Voice] ICE error:', err);
      }
    });
  }

  /**
   * Active le micro et rejoint le chat vocal.
   */
  async join() {
    if (this.active) return true;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      // Commence muté
      this.localStream.getAudioTracks().forEach(t => t.enabled = false);
      this.muted = true;
      this.active = true;

      // Connecter à tous les peers existants
      await this._connectToAll();

      if (this.onStateChange) this.onStateChange({ active: true, muted: true });
      return true;
    } catch (err) {
      console.error('[Voice] Micro refused:', err);
      return false;
    }
  }

  /**
   * Quitte le chat vocal.
   */
  leave() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.peers.forEach(peer => {
      peer.connection.close();
      if (peer.audioEl) peer.audioEl.remove();
    });
    this.peers.clear();
    this.active = false;
    this.muted = true;
    if (this.onStateChange) this.onStateChange({ active: false, muted: true });
  }

  /**
   * Toggle mute/unmute.
   */
  toggleMute() {
    if (!this.localStream) return this.muted;
    this.muted = !this.muted;
    this.localStream.getAudioTracks().forEach(t => t.enabled = !this.muted);
    if (this.onStateChange) this.onStateChange({ active: this.active, muted: this.muted });
    return this.muted;
  }

  /**
   * Connecte un nouveau peer (quand un joueur rejoint).
   */
  async connectPeer(peerId) {
    if (!this.active || !this.localStream) return;
    try {
      const pc = this._getOrCreatePeer(peerId);
      this.localStream.getTracks().forEach(track => {
        if (!pc.getSenders().find(s => s.track === track)) {
          pc.addTrack(track, this.localStream);
        }
      });
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      this.network.sendWebRTCOffer(peerId, offer);
    } catch (err) {
      console.error('[Voice] Connect peer error:', err);
    }
  }

  /**
   * Déconnecte un peer.
   */
  disconnectPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      if (peer.audioEl) peer.audioEl.remove();
      this.peers.delete(peerId);
    }
  }

  /**
   * Connecter à tous les peers dans la salle.
   */
  async _connectToAll() {
    return new Promise((resolve) => {
      this.network.socket.emit('room:getPeers', {}, async (peers) => {
        if (peers && peers.length > 0) {
          for (const peerId of peers) {
            if (peerId !== this.network.playerId) {
              await this.connectPeer(peerId);
            }
          }
        }
        resolve();
      });
    });
  }

  _getOrCreatePeer(peerId) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId).connection;
    }

    const pc = new RTCPeerConnection({ iceServers: this._iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.network.sendICECandidate(peerId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      // Créer un élément audio pour jouer le stream distant
      const stream = event.streams[0];
      let audioEl = this.peers.get(peerId)?.audioEl;
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.id = `voice-audio-${peerId}`;
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = stream;
      const peer = this.peers.get(peerId);
      if (peer) peer.audioEl = audioEl;

      // Notifier pour le VoiceMeter
      if (this.onRemoteStream) this.onRemoteStream(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (this.onConnectionStatus) this.onConnectionStatus(peerId, state);
      if (state === 'connected') {
        console.log(`[Voice] ✓ Connecté à ${peerId}`);
      }
      if (state === 'disconnected' || state === 'failed') {
        console.log(`[Voice] ✗ Déconnecté de ${peerId} (${state})`);
        this.disconnectPeer(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE state (${peerId}): ${pc.iceConnectionState}`);
    };

    // Ajouter un transceiver audio pour recevoir même sans track local
    if (!this.localStream) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    } else {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    this.peers.set(peerId, { connection: pc, audioEl: null });
    return pc;
  }

  /**
   * Nombre de peers connectés.
   */
  getPeerCount() {
    return this.peers.size;
  }

  isActive() { return this.active; }
  isMuted() { return this.muted; }
}

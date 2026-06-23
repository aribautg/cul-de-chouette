/**
 * WebRTCManager — Gère les connexions audio/vidéo peer-to-peer.
 * Chaque joueur est connecté à tous les autres (mesh topology).
 */
export class WebRTCManager {
  constructor(networkClient) {
    this.network = networkClient;
    this.localStream = null;
    this.peers = new Map(); // peerId → { connection, audioStream, videoElement }
    this.audioEnabled = false;
    this.videoEnabled = false;
    this.onRemoteStream = null; // callback(peerId, stream)
    this.onPeerDisconnect = null;

    this._bindSignaling();
  }

  _bindSignaling() {
    this.network.on('webrtcOffer', async ({ fromId, offer }) => {
      try {
        const pc = this._getOrCreatePeer(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Ajouter nos tracks locaux AVANT de créer la réponse
        if (this.localStream) {
          const senders = pc.getSenders();
          this.localStream.getTracks().forEach(track => {
            // Ne pas ajouter si déjà présent
            if (!senders.find(s => s.track === track)) {
              pc.addTrack(track, this.localStream);
            }
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.network.sendWebRTCAnswer(fromId, answer);
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    this.network.on('webrtcAnswer', async ({ fromId, answer }) => {
      try {
        const pc = this._getPeer(fromId);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    });

    this.network.on('webrtcIceCandidate', async ({ fromId, candidate }) => {
      try {
        const pc = this._getPeer(fromId);
        if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[WebRTC] Error handling ICE:', err);
      }
    });
  }

  /**
   * Active le micro et/ou la caméra.
   */
  async enableMedia(audio = true, video = false) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        video: video ? { width: 320, height: 240, frameRate: 15 } : false
      });
      this.audioEnabled = audio;
      this.videoEnabled = video;
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] Accès média refusé:', err);
      return null;
    }
  }

  /**
   * Désactive le micro/caméra.
   */
  disableMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.audioEnabled = false;
    this.videoEnabled = false;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.audioEnabled = audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // Stopper le track complètement (éteint le voyant caméra)
        videoTrack.stop();
        this.localStream.removeTrack(videoTrack);
        this.videoEnabled = false;
        return false;
      }
    }
    return false;
  }

  /**
   * Initie une connexion vers un peer (appeler pour chaque nouveau joueur).
   */
  async connectToPeer(peerId) {
    try {
      const pc = this._getOrCreatePeer(peerId);

      // Les tracks sont déjà ajoutés par _getOrCreatePeer
      // Créer et envoyer l'offre
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      this.network.sendWebRTCOffer(peerId, offer);
    } catch (err) {
      console.error('[WebRTC] Error connecting to peer:', err);
    }
  }

  /**
   * Déconnecte un peer.
   */
  disconnectPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(peerId);
      if (this.onPeerDisconnect) this.onPeerDisconnect(peerId);
    }
  }

  /**
   * Déconnecte tous les peers et libère les ressources.
   */
  disconnectAll() {
    this.peers.forEach((peer, id) => {
      peer.connection.close();
    });
    this.peers.clear();
    this.disableMedia();
  }

  _getOrCreatePeer(peerId) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId).connection;
    }

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.network.sendICECandidate(peerId, event.candidate);
      }
    };

    // Réception du stream distant
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      this.peers.get(peerId).remoteStream = stream;
      if (this.onRemoteStream) this.onRemoteStream(peerId, stream);
    };

    // Connexion state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.disconnectPeer(peerId);
      }
    };

    // Ajouter nos tracks si on a un stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    } else {
      // Même sans media local, préparer la réception de l'audio/vidéo distant
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    this.peers.set(peerId, { connection: pc, remoteStream: null });
    return pc;
  }

  _getPeer(peerId) {
    const peer = this.peers.get(peerId);
    return peer ? peer.connection : null;
  }

  /**
   * Retourne le nombre de peers connectés.
   */
  getPeerCount() {
    return this.peers.size;
  }
}

/**
 * ChatPanel — Clavardage textuel + transcription vocale automatique.
 * Utilise l'API Web Speech (SpeechRecognition) pour transcrire la voix.
 */
export class ChatPanel {
  constructor(networkClient) {
    this.network = networkClient;
    this.recognition = null;
    this.transcribing = false;
    this.messages = [];
    this._createDOM();
    this._bindEvents();
    this._initSpeechRecognition();
  }

  _createDOM() {
    if (document.getElementById('chat-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'chat-panel';
    panel.className = 'chat-panel';
    panel.innerHTML = `
      <div class="chat-header">
        <h3>💬 Chat</h3>
        <div class="chat-controls">
          <button class="btn btn-sm" id="btn-chat-transcribe" title="Transcription vocale">🗣️ Off</button>
          <button class="btn btn-sm" id="btn-chat-close">✕</button>
        </div>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-row">
        <input type="text" class="input-field chat-input" id="chat-input" placeholder="Écrire un message..." autocomplete="off">
        <button class="btn btn-sm btn-primary" id="btn-chat-send">➤</button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  _bindEvents() {
    document.getElementById('btn-chat-send').addEventListener('click', () => this._sendMessage());
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendMessage();
    });
    document.getElementById('btn-chat-close').addEventListener('click', () => this.toggle());
    document.getElementById('btn-chat-transcribe').addEventListener('click', () => this._toggleTranscription());

    // Recevoir les messages des autres joueurs
    if (this.network) {
      this.network.on('chatMessage', (data) => {
        this._addMessage(data.playerName, data.text, data.isTranscription);
      });
    }
  }

  _initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Navigateur ne supporte pas la reconnaissance vocale
      const btn = document.getElementById('btn-chat-transcribe');
      if (btn) btn.style.display = 'none';
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText.trim()) {
        this._sendTranscription(finalText.trim());
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('[Speech] Error:', event.error);
      }
    };

    this.recognition.onend = () => {
      // Redémarrer si la transcription est toujours active
      if (this.transcribing) {
        try { this.recognition.start(); } catch (e) {}
      }
    };
  }

  _toggleTranscription() {
    const btn = document.getElementById('btn-chat-transcribe');
    if (!this.recognition) return;

    if (!this.transcribing) {
      this.transcribing = true;
      this.recognition.start();
      if (btn) btn.textContent = '🗣️ On';
      btn.classList.add('btn-success');
    } else {
      this.transcribing = false;
      this.recognition.stop();
      if (btn) btn.textContent = '🗣️ Off';
      btn.classList.remove('btn-success');
    }
  }

  _sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    this._addMessage('Vous', text, false);
    input.value = '';

    // Envoyer aux autres joueurs
    if (this.network && this.network.socket) {
      this.network.socket.emit('chat:message', { text, isTranscription: false });
    }
  }

  _sendTranscription(text) {
    this._addMessage('Vous', text, true);

    if (this.network && this.network.socket) {
      this.network.socket.emit('chat:message', { text, isTranscription: true });
    }
  }

  _addMessage(playerName, text, isTranscription) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `chat-msg ${isTranscription ? 'chat-msg-transcription' : ''}`;
    msg.innerHTML = `
      <span class="chat-msg-name">${playerName}</span>
      ${isTranscription ? '<span class="chat-msg-badge">🗣️</span>' : ''}
      <span class="chat-msg-text">${this._escapeHtml(text)}</span>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    this.messages.push({ playerName, text, isTranscription, time: Date.now() });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggle() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.classList.toggle('open');
  }

  open() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.classList.add('open');
  }

  close() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.classList.remove('open');
  }
}

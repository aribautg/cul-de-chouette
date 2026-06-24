/**
 * VoiceMeter — Affiche une barre de volume animée quand un joueur parle.
 * Utilise l'AudioContext AnalyserNode pour détecter le volume.
 */
export class VoiceMeter {
  constructor() {
    this.analysers = new Map(); // peerId → { analyser, dataArray, element }
    this.localAnalyser = null;
    this.animFrame = null;
    this.running = false;
  }

  /**
   * Crée un analyseur pour un stream audio (local ou distant).
   */
  attachStream(peerId, stream, element) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    this.analysers.set(peerId, { analyser, dataArray, element, ctx });

    if (!this.running) this._startLoop();
  }

  /**
   * Retire un analyseur.
   */
  detachStream(peerId) {
    const entry = this.analysers.get(peerId);
    if (entry) {
      entry.ctx.close();
      this.analysers.delete(peerId);
    }
    if (this.analysers.size === 0) this._stopLoop();
  }

  _startLoop() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.analysers.forEach(({ analyser, dataArray, element }) => {
        analyser.getByteFrequencyData(dataArray);
        // Calcul du volume moyen (0-255)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));

        // Mettre à jour l'élément visuel
        if (element) {
          const bar = element.querySelector('.voice-bar-fill');
          if (bar) {
            bar.style.width = `${level}%`;
            bar.style.opacity = level > 5 ? '1' : '0.3';
          }
          // Indicateur "parle"
          if (level > 15) {
            element.classList.add('speaking');
          } else {
            element.classList.remove('speaking');
          }
        }
      });
      this.animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  _stopLoop() {
    this.running = false;
    cancelAnimationFrame(this.animFrame);
  }

  destroy() {
    this._stopLoop();
    this.analysers.forEach(({ ctx }) => ctx.close());
    this.analysers.clear();
  }
}

/**
 * SoundManager — Sons gaming modernes, chauds et enveloppants.
 * 
 * Design sonore :
 * - Fréquences centrées dans les médiums-graves (pas d'aigus stridents)
 * - Sub bass 808 riche et rond
 * - Plucks doux avec filtres lowpass
 * - Textures chaudes (triangle/sine, jamais de square brut)
 * - Compression douce pour la cohésion
 * - Résonances courtes et satisfaisantes
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.6;
    this.masterGain = null;
    this.compressor = null;
    this.warmFilter = null;
  }

  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Compressor doux (glue)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.12;

    // Filtre global warmth (coupe les aigus agressifs)
    this.warmFilter = this.ctx.createBiquadFilter();
    this.warmFilter.type = 'lowpass';
    this.warmFilter.frequency.value = 6000;
    this.warmFilter.Q.value = 0.5;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;

    this.compressor.connect(this.warmFilter);
    this.warmFilter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  _out(node) {
    node.connect(this.compressor);
  }

  _tone(freq, opts = {}) {
    const {
      type = 'sine', attack = 0.008, decay = 0.12, sustain = 0.0,
      release = 0.15, duration = 0.05, volume = 0.3, detune = 0, startTime = 0
    } = opts;
    const now = this.ctx.currentTime + startTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(gain);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(volume * Math.max(sustain, 0.001), now + attack + decay);
    if (sustain > 0 && duration > 0) {
      gain.gain.setValueAtTime(volume * sustain, now + attack + decay);
      gain.gain.setValueAtTime(volume * sustain, now + attack + decay + duration);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + duration + release);

    osc.start(now);
    osc.stop(now + attack + decay + duration + release + 0.02);
    return { osc, gain };
  }

  _noise(opts = {}) {
    const {
      duration = 0.1, volume = 0.2, freq = 2000, Q = 1,
      type = 'lowpass', attack = 0.003, startTime = 0
    } = opts;
    const now = this.ctx.currentTime + startTime;
    const len = this.ctx.sampleRate * (duration + 0.1);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type; flt.frequency.value = freq; flt.Q.value = Q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(flt); flt.connect(gain);
    src.start(now); src.stop(now + duration + 0.1);
    return { gain };
  }

  /**
   * Crée un son "pluck" chaud : sine + triangle layered avec lowpass.
   */
  _warmPluck(freq, opts = {}) {
    const { volume = 0.3, startTime = 0, decay = 0.12, release = 0.18 } = opts;

    // Couche sine (corps chaud)
    const sine = this._tone(freq, {
      type: 'sine', attack: 0.003, decay, sustain: 0, release, volume: volume * 0.7, startTime
    });

    // Couche triangle (léger éclat sans agression)
    const tri = this._tone(freq, {
      type: 'triangle', attack: 0.002, decay: decay * 0.7, sustain: 0,
      release: release * 0.6, volume: volume * 0.3, startTime, detune: 3
    });

    // Filtre doux sur le triangle
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(freq * 3, 4000);
    lp.Q.value = 0.7;
    tri.gain.connect(lp);
    this._out(lp);
    this._out(sine.gain);

    return { sine, tri };
  }

  // ================================================================
  //  SONS DU JEU — Chauds, enveloppants, mid-range
  // ================================================================

  /**
   * Lancer de dé — Whoosh doux avec sub body.
   * Sensation de poids et de mouvement sans agression.
   */
  diceRoll() {
    if (!this.enabled) return;
    this._init();

    // Whoosh doux (bruit filtré en mouvement)
    const whoosh = this._noise({ duration: 0.2, volume: 0.2, freq: 1800, Q: 0.6, type: 'lowpass', attack: 0.005 });
    this._out(whoosh.gain);

    // Sub mouvement (sensation de poids)
    const sub = this._tone(70, { type: 'sine', attack: 0.005, decay: 0.15, sustain: 0, release: 0.1, volume: 0.3 });
    this._out(sub.gain);

    // Body mid (plénitude)
    const body = this._tone(180, { type: 'triangle', attack: 0.003, decay: 0.1, sustain: 0, release: 0.12, volume: 0.15 });
    this._out(body.gain);
  }

  /**
   * Dé atterrit — Thud satisfaisant, rond et plein.
   * Comme un objet lourd qui se pose avec assurance.
   */
  diceLand() {
    if (!this.enabled) return;
    this._init();

    // Sub impact profond (808 style)
    const sub = this._tone(55, { type: 'sine', attack: 0.001, decay: 0.18, sustain: 0, release: 0.12, volume: 0.4 });
    this._out(sub.gain);

    // Body knock (medium, chaud)
    const knock = this._tone(160, { type: 'triangle', attack: 0.002, decay: 0.08, sustain: 0, release: 0.1, volume: 0.3 });
    this._out(knock.gain);

    // Transient doux (pas agressif, juste le "toc")
    const tap = this._noise({ duration: 0.03, volume: 0.2, freq: 2000, Q: 1.2, type: 'lowpass', attack: 0.001 });
    this._out(tap.gain);

    // Résonance chaude
    const res = this._tone(260, { type: 'sine', attack: 0.005, decay: 0.1, sustain: 0, release: 0.15, volume: 0.1, detune: -5 });
    this._out(res.gain);
  }

  /**
   * Gain de points — Cascade chaude montante, enveloppante.
   * Comme un reward Candy Crush mais plus doux et rond.
   */
  scoreGain() {
    if (!this.enabled) return;
    this._init();

    // Cascade de warm plucks (pentatonique, registre medium)
    const notes = [440, 523, 587, 660, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this._warmPluck(freq, { volume: 0.25, decay: 0.1, release: 0.2 });
      }, i * 65);
    });

    // Sub bed (fondation grave qui enveloppe)
    const sub = this._tone(80, { type: 'sine', attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.25, duration: 0.1, volume: 0.2 });
    this._out(sub.gain);

    // Soft shimmer (très filtré, pas aigu)
    setTimeout(() => {
      const shimmer = this._noise({ duration: 0.15, volume: 0.08, freq: 3500, Q: 0.5, type: 'lowpass', attack: 0.02 });
      this._out(shimmer.gain);
    }, 300);
  }

  /**
   * Perte de points — Descente grave lourde, sombre sans être stridente.
   * Impression d'enfoncement, de chute.
   */
  scoreLoss() {
    if (!this.enabled) return;
    this._init();

    // Pitch drop doux (sine qui descend)
    const drop = this._tone(300, { type: 'sine', attack: 0.005, decay: 0.3, sustain: 0, release: 0.2, volume: 0.3 });
    drop.osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.3);
    this._out(drop.gain);

    // Sub impact décalé
    const sub = this._tone(40, { type: 'sine', attack: 0.002, decay: 0.25, sustain: 0, release: 0.15, volume: 0.35, startTime: 0.1 });
    this._out(sub.gain);

    // Rumble sourd (bruit très grave)
    const rumble = this._noise({ duration: 0.2, volume: 0.12, freq: 400, Q: 0.8, type: 'lowpass', attack: 0.01, startTime: 0.05 });
    this._out(rumble.gain);

    // Note sombre (tierce mineure)
    const dark = this._tone(156, { type: 'triangle', attack: 0.02, decay: 0.15, sustain: 0.05, release: 0.2, duration: 0.05, volume: 0.12, startTime: 0.12 });
    this._out(dark.gain);
  }

  /**
   * Buzz activé — Riser chaud + impact mid.
   * Alerte sans agression, tension sans stridence.
   */
  buzzStart() {
    if (!this.enabled) return;
    this._init();

    // Riser filtré (monte dans les médiums)
    const riser = this._tone(150, { type: 'triangle', attack: 0.02, decay: 0.15, sustain: 0.3, release: 0.08, duration: 0.05, volume: 0.15 });
    riser.osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    this._out(riser.gain);

    // Impact d'arrivée (medium, pas aigu)
    setTimeout(() => {
      const hit = this._tone(500, { type: 'sine', attack: 0.002, decay: 0.06, sustain: 0, release: 0.1, volume: 0.25 });
      this._out(hit.gain);
      const sub = this._tone(80, { type: 'sine', attack: 0.002, decay: 0.12, sustain: 0, release: 0.1, volume: 0.3 });
      this._out(sub.gain);
    }, 160);

    // Texture douce (bruit grave court)
    const tex = this._noise({ duration: 0.05, volume: 0.12, freq: 1200, Q: 1, type: 'lowpass', attack: 0.002, startTime: 0.16 });
    this._out(tex.gain);
  }

  /**
   * Joueur buzze — Pop doux et satisfaisant. Pas aigu.
   */
  buzzPress() {
    if (!this.enabled) return;
    this._init();

    // Pop medium
    const pop = this._tone(650, { type: 'sine', attack: 0.001, decay: 0.05, sustain: 0, release: 0.08, volume: 0.3 });
    this._out(pop.gain);

    // Sub layer
    const sub = this._tone(180, { type: 'sine', attack: 0.001, decay: 0.04, sustain: 0, release: 0.05, volume: 0.2 });
    this._out(sub.gain);

    // Micro texture (très doux)
    const tex = this._noise({ duration: 0.015, volume: 0.08, freq: 1500, Q: 1.5, type: 'lowpass', attack: 0.001 });
    this._out(tex.gain);
  }

  /**
   * Victoire — Build-up enveloppant → drop satisfaisant.
   * Chaud, ample, glorieux sans crier.
   */
  victory() {
    if (!this.enabled) return;
    this._init();

    // Build-up (sweep doux montant)
    const sweep = this._tone(100, { type: 'triangle', attack: 0.05, decay: 0.5, sustain: 0.4, release: 0.1, duration: 0.2, volume: 0.1 });
    sweep.osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);
    const slp = this.ctx.createBiquadFilter();
    slp.type = 'lowpass'; slp.frequency.value = 2000; slp.Q.value = 1;
    sweep.gain.connect(slp);
    this._out(slp);

    // DROP — accord majeur chaud et ample
    setTimeout(() => {
      // Accord Do majeur (registre medium-grave)
      [262, 330, 392, 523].forEach(freq => {
        const chord = this._tone(freq, {
          type: 'triangle', attack: 0.005, decay: 0.2, sustain: 0.3,
          release: 0.6, duration: 0.3, volume: 0.12
        });
        this._out(chord.gain);
      });

      // Sub 808 ample
      const sub = this._tone(45, { type: 'sine', attack: 0.002, decay: 0.4, sustain: 0, release: 0.3, volume: 0.45 });
      this._out(sub.gain);

      // Wash texture (bruit grave enveloppant)
      const wash = this._noise({ duration: 0.5, volume: 0.1, freq: 2000, Q: 0.3, type: 'lowpass', attack: 0.01 });
      this._out(wash.gain);
    }, 500);

    // Mélodie douce après le drop (notes medium)
    const melody = [523, 587, 660, 784, 880];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this._warmPluck(freq, { volume: 0.18, decay: 0.1, release: 0.25 });
      }, 650 + i * 80);
    });

    // Sub pulse final
    setTimeout(() => {
      const finalSub = this._tone(50, { type: 'sine', attack: 0.01, decay: 0.3, sustain: 0, release: 0.2, volume: 0.3 });
      this._out(finalSub.gain);
    }, 1000);
  }

  /**
   * Bévue — Thud sourd + ton grave menaçant.
   * Impression d'erreur lourde sans stridence.
   */
  bevue() {
    if (!this.enabled) return;
    this._init();

    // Thud d'erreur
    const thud = this._tone(90, { type: 'sine', attack: 0.003, decay: 0.2, sustain: 0, release: 0.15, volume: 0.35 });
    this._out(thud.gain);

    // Ton sombre (mineur)
    const dark1 = this._tone(130, { type: 'triangle', attack: 0.01, decay: 0.12, sustain: 0.1, release: 0.2, duration: 0.08, volume: 0.15 });
    this._out(dark1.gain);

    const dark2 = this._tone(155, { type: 'triangle', attack: 0.01, decay: 0.12, sustain: 0.08, release: 0.2, duration: 0.08, volume: 0.1, startTime: 0.13 });
    this._out(dark2.gain);

    // Rumble
    const rumble = this._noise({ duration: 0.15, volume: 0.1, freq: 300, Q: 0.6, type: 'lowpass', attack: 0.005, startTime: 0.05 });
    this._out(rumble.gain);
  }

  /**
   * Sirop réussi — Montée chaude progressive → résolution satisfaisante.
   */
  siropSuccess() {
    if (!this.enabled) return;
    this._init();

    // Rampe de plucks chauds (accelerando)
    const notes = [330, 392, 440, 523, 587, 660, 784];
    notes.forEach((freq, i) => {
      const delay = i * (0.06 - i * 0.004);
      setTimeout(() => {
        this._warmPluck(freq, { volume: 0.2 + i * 0.01, decay: 0.08, release: 0.15 });
      }, Math.max(0, delay * 1000));
    });

    // Résolution : accord chaud
    setTimeout(() => {
      [523, 660, 784].forEach(freq => {
        const t = this._tone(freq, {
          type: 'sine', attack: 0.008, decay: 0.15, sustain: 0.2, release: 0.3, duration: 0.1, volume: 0.15
        });
        this._out(t.gain);
      });
      // Sub confirmation
      const sub = this._tone(65, { type: 'sine', attack: 0.003, decay: 0.2, sustain: 0, release: 0.15, volume: 0.3 });
      this._out(sub.gain);
    }, 350);
  }

  /**
   * Clic de bouton — Pop doux, presque tactile.
   */
  click() {
    if (!this.enabled) return;
    this._init();

    const pop = this._tone(500, { type: 'sine', attack: 0.001, decay: 0.03, sustain: 0, release: 0.04, volume: 0.2 });
    this._out(pop.gain);

    const sub = this._tone(150, { type: 'sine', attack: 0.001, decay: 0.02, sustain: 0, release: 0.03, volume: 0.1 });
    this._out(sub.gain);
  }

  /**
   * Countdown tick — Pulsation grave sourde. Tension sans agression.
   */
  tick() {
    if (!this.enabled) return;
    this._init();

    const pulse = this._tone(400, { type: 'sine', attack: 0.001, decay: 0.04, sustain: 0, release: 0.06, volume: 0.18 });
    this._out(pulse.gain);

    const sub = this._tone(120, { type: 'sine', attack: 0.001, decay: 0.03, sustain: 0, release: 0.04, volume: 0.12 });
    this._out(sub.gain);
  }

  /**
   * Item obtenu — Triple pluck chaud ascendant + sub confirm.
   * Satisfaction de collecte sans stridence.
   */
  itemGain() {
    if (!this.enabled) return;
    this._init();

    // 3 plucks montants (registre medium)
    this._warmPluck(440, { volume: 0.25, decay: 0.08, release: 0.12 });

    setTimeout(() => {
      this._warmPluck(587, { volume: 0.22, decay: 0.08, release: 0.12 });
    }, 80);

    setTimeout(() => {
      this._warmPluck(740, { volume: 0.2, decay: 0.1, release: 0.2 });
    }, 160);

    // Sub confirm
    const sub = this._tone(90, { type: 'sine', attack: 0.005, decay: 0.15, sustain: 0, release: 0.12, volume: 0.2, startTime: 0.02 });
    this._out(sub.gain);

    // Wash doux
    setTimeout(() => {
      const wash = this._noise({ duration: 0.1, volume: 0.05, freq: 2000, Q: 0.4, type: 'lowpass', attack: 0.01 });
      this._out(wash.gain);
    }, 200);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain) {
      this.masterGain.gain.value = val;
    }
  }
}

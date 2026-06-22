/**
 * ParticleSystem — Effets de particules pour les événements du jeu.
 * Émet des particules dorées sur les gains, rouges sur les pertes.
 */
export class ParticleSystem {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'particle-container';
    this.container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden;';
    document.body.appendChild(this.container);
  }

  /**
   * Émet des particules à une position donnée.
   * @param {number} x - Position X (viewport)
   * @param {number} y - Position Y (viewport)
   * @param {object} opts - Options
   */
  emit(x, y, opts = {}) {
    const count = opts.count || 12;
    const color = opts.color || '#d4af37';
    const colors = opts.colors || [color, '#f0d060', '#ffd700'];
    const spread = opts.spread || 80;
    const duration = opts.duration || 1200;
    const size = opts.size || 6;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const distance = spread * (0.5 + Math.random() * 0.5);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 30; // bias vers le haut
      const pSize = size * (0.5 + Math.random() * 0.8);
      const pColor = colors[Math.floor(Math.random() * colors.length)];
      const rotation = Math.random() * 720 - 360;

      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${pSize}px;
        height: ${pSize}px;
        background: ${pColor};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        box-shadow: 0 0 ${pSize}px ${pColor};
        opacity: 1;
        transition: none;
        pointer-events: none;
      `;

      this.container.appendChild(particle);

      // Animer avec Web Animations API
      particle.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(0.1)`, opacity: 0 }
      ], {
        duration: duration + Math.random() * 400,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      }).onfinish = () => particle.remove();
    }
  }

  /** Particules dorées (gain de points) */
  emitGold(x, y) {
    this.emit(x, y, {
      count: 15,
      colors: ['#d4af37', '#f0d060', '#ffd700', '#fff8e7'],
      spread: 100,
      duration: 1400,
      size: 7
    });
  }

  /** Particules rouges (perte de points) */
  emitRed(x, y) {
    this.emit(x, y, {
      count: 10,
      colors: ['#a82039', '#d43a55', '#ff4060'],
      spread: 60,
      duration: 1000,
      size: 5
    });
  }

  /** Explosion de victoire */
  emitVictory(x, y) {
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        this.emit(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 50, {
          count: 25,
          colors: ['#d4af37', '#f0d060', '#ffd700', '#ffffff', '#ff8c00'],
          spread: 150,
          duration: 2000,
          size: 9
        });
      }, wave * 300);
    }
  }

  /** Émet depuis un élément DOM */
  emitFromElement(el, type = 'gold') {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (type === 'gold') this.emitGold(x, y);
    else if (type === 'red') this.emitRed(x, y);
    else if (type === 'victory') this.emitVictory(x, y);
  }
}

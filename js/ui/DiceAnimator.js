/**
 * DiceAnimator — Animation 3D de lancer de dé avec cube CSS.
 * 
 * Le dé est un cube 3D réel en CSS (6 faces avec points SVG).
 * L'animation comprend :
 * - Trajectoire parabolique (arc vers le haut)
 * - Rotation sur 3 axes pendant le vol
 * - 2-3 rebonds décroissants
 * - Ombre au sol dynamique
 * - Flash doré à la révélation finale
 */
export class DiceAnimator {
  constructor() {
    this._createOverlay();
    this.animating = false;
  }

  _createOverlay() {
    // Ne créer qu'une seule fois
    if (document.getElementById('dice-anim-overlay')) {
      this.overlay = document.getElementById('dice-anim-overlay');
      return;
    }
    this.overlay = document.createElement('div');
    this.overlay.id = 'dice-anim-overlay';
    this.overlay.className = 'dice-anim-overlay';
    this.overlay.innerHTML = `
      <div class="dice-anim-scene">
        <div class="dice-anim-shadow" id="dice-anim-shadow"></div>
        <div class="dice-anim-wrapper" id="dice-anim-wrapper">
          <div class="dice-cube" id="dice-cube">
            <div class="dice-face dice-face-1">${this._renderFace(1)}</div>
            <div class="dice-face dice-face-2">${this._renderFace(2)}</div>
            <div class="dice-face dice-face-3">${this._renderFace(3)}</div>
            <div class="dice-face dice-face-4">${this._renderFace(4)}</div>
            <div class="dice-face dice-face-5">${this._renderFace(5)}</div>
            <div class="dice-face dice-face-6">${this._renderFace(6)}</div>
          </div>
        </div>
        <div class="dice-anim-impact" id="dice-anim-impact"></div>
      </div>
      <div class="dice-anim-particles" id="dice-anim-particles"></div>
    `;
    document.body.appendChild(this.overlay);
  }

  _renderFace(value) {
    // Positions des points sur un dé classique (grille 3x3)
    const positions = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
    };

    const dots = positions[value].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="8" fill="#1a1a2e"/>`
    ).join('');

    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`;
  }

  /**
   * Lance l'animation du dé et retourne une Promise qui résout avec la valeur.
   * @param {number} finalValue - La valeur finale du dé (1-6)
   * @returns {Promise<number>}
   */
  async roll(finalValue) {
    if (this.animating) return finalValue;
    this.animating = true;

    const wrapper = document.getElementById('dice-anim-wrapper');
    const cube = document.getElementById('dice-cube');
    const shadow = document.getElementById('dice-anim-shadow');
    const impact = document.getElementById('dice-anim-impact');
    const particles = document.getElementById('dice-anim-particles');

    // Safety: if DOM elements don't exist, skip animation
    if (!wrapper || !cube || !shadow) {
      this.animating = false;
      return finalValue;
    }

    // Rotation finale pour montrer la bonne face
    const faceRotations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: -90 },
      3: { x: -90, y: 0 },
      4: { x: 90, y: 0 },
      5: { x: 0, y: 90 },
      6: { x: 180, y: 0 }
    };

    const finalRot = faceRotations[finalValue];
    // Ajouter des tours complets pour l'effet dramatique
    const extraSpinsX = (3 + Math.floor(Math.random() * 2)) * 360;
    const extraSpinsY = (2 + Math.floor(Math.random() * 2)) * 360;
    const extraSpinsZ = (1 + Math.floor(Math.random() * 2)) * 360;

    // Afficher l'overlay
    this.overlay.classList.add('active');

    // Phase 1 : Lancer (trajectoire parabolique + rotation)
    await this._animatePhase(wrapper, cube, shadow, particles, {
      duration: 900,
      extraSpinsX, extraSpinsY, extraSpinsZ,
      finalRot
    });

    // Phase 2 : Premier rebond
    await this._bounce(wrapper, cube, shadow, 1, finalRot, extraSpinsX, extraSpinsY, extraSpinsZ);

    // Phase 3 : Deuxième rebond (plus petit)
    await this._bounce(wrapper, cube, shadow, 2, finalRot, extraSpinsX, extraSpinsY, extraSpinsZ);

    // Phase 4 : Stabilisation + impact
    impact.classList.add('active');
    setTimeout(() => impact.classList.remove('active'), 400);

    // Phase 5 : Flash doré de révélation
    cube.classList.add('dice-reveal');

    await this._wait(600);

    // Cleanup
    cube.classList.remove('dice-reveal');
    this.overlay.classList.remove('active');
    wrapper.style.transform = '';
    cube.style.transform = '';
    shadow.style.transform = '';
    particles.innerHTML = '';
    this.animating = false;

    return finalValue;
  }

  async _animatePhase(wrapper, cube, shadow, particles, opts) {
    const { duration, extraSpinsX, extraSpinsY, extraSpinsZ, finalRot } = opts;
    const startTime = performance.now();

    // Émettre des particules pendant le vol
    const particleInterval = setInterval(() => {
      this._emitTrailParticle(particles);
    }, 50);

    return new Promise(resolve => {
      const animate = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const easeOut = 1 - Math.pow(1 - t, 3); // cubic ease out

        // Trajectoire parabolique (monte puis descend)
        const arcHeight = 180;
        const y = -arcHeight * 4 * t * (1 - t); // parabole inversée
        const x = (t - 0.5) * 40; // légère dérive horizontale

        // Rotation progressive
        const rotX = easeOut * (extraSpinsX + finalRot.x);
        const rotY = easeOut * (extraSpinsY + finalRot.y);
        const rotZ = easeOut * extraSpinsZ;

        wrapper.style.transform = `translate(${x}px, ${y}px)`;
        cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;

        // Ombre : plus grosse quand le dé est haut
        const shadowScale = 1 + Math.abs(y) / 200;
        const shadowOpacity = 0.4 - Math.abs(y) / 600;
        shadow.style.transform = `scale(${shadowScale})`;
        shadow.style.opacity = Math.max(0.1, shadowOpacity);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          clearInterval(particleInterval);
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  async _bounce(wrapper, cube, shadow, bounceNum, finalRot, spX, spY, spZ) {
    const height = bounceNum === 1 ? 50 : 20;
    const duration = bounceNum === 1 ? 350 : 200;
    const wobble = bounceNum === 1 ? 15 : 5;
    const startTime = performance.now();

    return new Promise(resolve => {
      const animate = (now) => {
        const t = Math.min(1, (now - startTime) / duration);

        // Rebond parabolique
        const y = -height * 4 * t * (1 - t);

        // Petite oscillation de rotation (wobble qui s'atténue)
        const wobbleX = wobble * Math.sin(t * Math.PI * 2) * (1 - t);
        const wobbleZ = wobble * 0.5 * Math.cos(t * Math.PI * 3) * (1 - t);

        const rotX = spX + finalRot.x + wobbleX;
        const rotY = spY + finalRot.y;
        const rotZ = spZ + wobbleZ;

        wrapper.style.transform = `translateY(${y}px)`;
        cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;

        // Squash & stretch à l'atterrissage
        if (t > 0.8) {
          const squash = 1 + (t - 0.8) * 0.5;
          const stretch = 1 - (t - 0.8) * 0.2;
          wrapper.style.transform += ` scaleX(${squash}) scaleY(${stretch})`;
        }

        // Ombre
        const shadowScale = 1 + Math.abs(y) / 200;
        shadow.style.transform = `scale(${shadowScale})`;
        shadow.style.opacity = 0.35 - Math.abs(y) / 400;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // Reset squash
          wrapper.style.transform = 'translateY(0)';
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  _emitTrailParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'dice-trail-particle';
    const size = 3 + Math.random() * 4;
    const hue = 30 + Math.random() * 30; // orange-doré
    particle.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      width: ${size}px;
      height: ${size}px;
      background: hsl(${hue}, 100%, ${60 + Math.random() * 30}%);
      border-radius: 50%;
      pointer-events: none;
      box-shadow: 0 0 ${size * 2}px hsl(${hue}, 100%, 60%);
    `;
    container.appendChild(particle);

    const dx = (Math.random() - 0.5) * 60;
    const dy = (Math.random() - 0.5) * 40 + 20; // bias vers le bas (traînée)

    particle.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
    ], {
      duration: 500 + Math.random() * 300,
      easing: 'ease-out',
      fill: 'forwards'
    }).onfinish = () => particle.remove();
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Animation rapide pour les dés suivants (plus courte).
   */
  async rollQuick(finalValue) {
    if (this.animating) return finalValue;
    this.animating = true;

    const wrapper = document.getElementById('dice-anim-wrapper');
    const cube = document.getElementById('dice-cube');
    const shadow = document.getElementById('dice-anim-shadow');
    const impact = document.getElementById('dice-anim-impact');

    // Safety: if DOM elements don't exist, skip animation
    if (!wrapper || !cube || !shadow) {
      this.animating = false;
      return finalValue;
    }

    const faceRotations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: -90 },
      3: { x: -90, y: 0 },
      4: { x: 90, y: 0 },
      5: { x: 0, y: 90 },
      6: { x: 180, y: 0 }
    };

    const finalRot = faceRotations[finalValue];
    const spX = (2 + Math.floor(Math.random() * 2)) * 360;
    const spY = (1 + Math.floor(Math.random() * 2)) * 360;
    const spZ = Math.floor(Math.random() * 2) * 360;

    this.overlay.classList.add('active');

    await this._animatePhase(wrapper, cube, shadow, document.getElementById('dice-anim-particles'), {
      duration: 600,
      extraSpinsX: spX, extraSpinsY: spY, extraSpinsZ: spZ,
      finalRot
    });

    await this._bounce(wrapper, cube, shadow, 2, finalRot, spX, spY, spZ);

    impact.classList.add('active');
    setTimeout(() => impact.classList.remove('active'), 300);
    cube.classList.add('dice-reveal');

    await this._wait(400);

    cube.classList.remove('dice-reveal');
    this.overlay.classList.remove('active');
    wrapper.style.transform = '';
    cube.style.transform = '';
    shadow.style.transform = '';
    this.animating = false;

    return finalValue;
  }
}

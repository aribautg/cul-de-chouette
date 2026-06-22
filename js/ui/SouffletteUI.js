/**
 * SouffletteUI — Interface interactive pour le défi Soufflette.
 * Le soufflé lance réellement ses 3 dés (3 tentatives max) pour refaire 4-2-1.
 * Il peut garder les dés qu'il veut entre les lancers.
 */
export class SouffletteUI {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.attempt = 0;
    this.maxAttempts = 3;
    this.currentDice = [null, null, null];
    this.keptDice = [false, false, false]; // dés gardés entre lancers
  }

  /**
   * Lance l'interface de Soufflette dans la zone d'action.
   */
  start(challenger, target, setExplanation, setActions, renderDie) {
    this.challenger = challenger;
    this.target = target;
    this.setExplanation = setExplanation;
    this.setActions = setActions;
    this.renderDie = renderDie;
    this.attempt = 0;
    this.currentDice = [null, null, null];
    this.keptDice = [false, false, false];

    this.showAttemptUI();
  }

  showAttemptUI() {
    this.attempt++;

    if (this.attempt > this.maxAttempts) {
      // Échec : 3 lancers sans réussir
      this.onComplete({ success: false, attempt: 3, finalDice: this.currentDice });
      return;
    }

    this.setExplanation(
      `⚔️ Soufflette — Lancer ${this.attempt}/3`,
      `${this.target.name} doit faire 4-2-1. ${this.attempt > 1 ? 'Cliquez sur un dé pour le garder/relâcher, puis relancez.' : 'Lancez les 3 dés !'}`
    );

    const buttons = [];

    if (this.attempt > 1) {
      // Permettre de sélectionner les dés à garder
      buttons.push({
        label: `🎲 Relancer (${3 - this.keptDice.filter(k => k).length} dé(s))`,
        className: 'btn btn-primary',
        action: () => this.rollDice()
      });
    } else {
      buttons.push({
        label: '🎲 Lancer les 3 dés',
        className: 'btn btn-primary',
        action: () => this.rollDice()
      });
    }

    this.setActions(buttons);
  }

  rollDice() {
    // Relancer les dés non gardés
    for (let i = 0; i < 3; i++) {
      if (!this.keptDice[i]) {
        this.currentDice[i] = Math.ceil(Math.random() * 6);
      }
    }

    // Afficher les dés
    this.renderDie('die-1', this.currentDice[0]);
    this.renderDie('die-2', this.currentDice[1]);
    this.renderDie('die-3', this.currentDice[2]);

    // Mettre en surbrillance les dés qui font partie de 4-2-1
    this._highlightMatchingDice();

    // Vérifier si c'est un 4-2-1
    const sorted = [...this.currentDice].sort((a, b) => a - b);
    if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 4) {
      // Réussi !
      this.setExplanation(
        `✅ Soufflette réussie au lancer ${this.attempt} !`,
        `${this.target.name} a fait 4-2-1 ! Le souffleur perd des points.`
      );
      this.onComplete({ success: true, attempt: this.attempt, finalDice: this.currentDice });
      return;
    }

    // Pas encore réussi
    if (this.attempt >= this.maxAttempts) {
      this.setExplanation(
        `❌ Soufflette échouée !`,
        `${this.target.name} n'a pas réussi en 3 lancers. -30 pts pour le soufflé, +30 pts pour le souffleur.`
      );
      this.onComplete({ success: false, attempt: this.attempt, finalDice: this.currentDice });
      return;
    }

    // Encore des tentatives — proposer de garder/relancer
    this.setExplanation(
      `⚔️ Soufflette — Lancer ${this.attempt}/3`,
      `Résultat : ${this.currentDice.join('-')}. Pas un 4-2-1. Cliquez sur les dés à GARDER (ils deviennent dorés), puis relancez.`
    );

    // Interface de sélection des dés + bouton relancer
    this.keptDice = [false, false, false];
    this._setupDiceClickHandlers();

    this.setActions([{
      label: `🎲 Relancer les dés non gardés (lancer ${this.attempt + 1}/3)`,
      className: 'btn btn-primary',
      action: () => {
        this._removeDiceClickHandlers();
        this.showAttemptUI();
      }
    }]);
  }

  _highlightMatchingDice() {
    const target = [1, 2, 4];
    const remaining = [...target];
    for (let i = 0; i < 3; i++) {
      const idx = remaining.indexOf(this.currentDice[i]);
      const el = document.getElementById(`die-${i + 1}`);
      if (idx !== -1) {
        remaining.splice(idx, 1);
        el.classList.add('highlight');
      } else {
        el.classList.remove('highlight');
      }
    }
  }

  _setupDiceClickHandlers() {
    this._diceHandlers = [];
    for (let i = 0; i < 3; i++) {
      const el = document.getElementById(`die-${i + 1}`);
      el.style.cursor = 'pointer';
      const handler = () => {
        this.keptDice[i] = !this.keptDice[i];
        if (this.keptDice[i]) {
          el.classList.add('highlight');
          el.style.border = '3px solid var(--gold)';
        } else {
          el.classList.remove('highlight');
          el.style.border = '';
        }
      };
      el.addEventListener('click', handler);
      this._diceHandlers.push({ el, handler });
    }
  }

  _removeDiceClickHandlers() {
    if (this._diceHandlers) {
      this._diceHandlers.forEach(({ el, handler }) => {
        el.removeEventListener('click', handler);
        el.style.cursor = '';
        el.style.border = '';
      });
      this._diceHandlers = [];
    }
  }
}

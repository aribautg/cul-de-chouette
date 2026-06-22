export class Dice {
  constructor() {
    this.chouettes = [null, null]; // les 2 premiers dés
    this.cul = null;               // le 3ème dé
    this.rolling = false;
  }

  rollOne() {
    return Math.floor(Math.random() * 6) + 1;
  }

  rollChouettes() {
    this.chouettes = [this.rollOne(), this.rollOne()];
    return [...this.chouettes];
  }

  rollCul() {
    this.cul = this.rollOne();
    return this.cul;
  }

  rollAll() {
    this.rollChouettes();
    this.rollCul();
    return this.getAll();
  }

  getAll() {
    return [...this.chouettes, this.cul];
  }

  getSorted() {
    return this.getAll().sort((a, b) => a - b);
  }

  getSum() {
    return this.chouettes[0] + this.chouettes[1] + this.cul;
  }

  reset() {
    this.chouettes = [null, null];
    this.cul = null;
  }

  // Pour le sirop : relance d'un seul dé
  rollSirop() {
    return this.rollOne();
  }
}

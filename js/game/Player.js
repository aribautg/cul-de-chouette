export class Player {
  constructor(name, avatarId, keyBinding) {
    this.name = name;
    this.avatarId = avatarId;
    this.keyBinding = keyBinding;
    this.score = 0;
    this.eliminated = false;
    this.history = [];

    // Inventaire (objets non cumulables)
    this.items = {
      grelottine: false,
      civet: false,
      civetFiloche: false,
      flan: false,
      jarret: null, // null, 'jarret', 'jarretSouple', 'jarretSifflet'
      passeGrelot: false,
      rigodon: false
    };
  }

  addScore(points, reason) {
    this.score += points;
    this.history.push({
      turn: null, // sera rempli par le GameEngine
      points,
      reason,
      newScore: this.score
    });
  }

  removeScore(points, reason) {
    this.score -= points;
    this.history.push({
      turn: null,
      points: -points,
      reason,
      newScore: this.score
    });
  }

  giveItem(itemType) {
    if (itemType === 'jarret' || itemType === 'jarretSouple' || itemType === 'jarretSifflet') {
      if (this.items.jarret !== null) return false; // non cumulable
      this.items.jarret = itemType;
    } else {
      if (this.items[itemType]) return false; // non cumulable
      this.items[itemType] = true;
    }
    return true;
  }

  removeItem(itemType) {
    if (itemType === 'jarret' || itemType === 'jarretSouple' || itemType === 'jarretSifflet') {
      this.items.jarret = null;
    } else {
      this.items[itemType] = false;
    }
  }

  hasItem(itemType) {
    if (itemType === 'jarret' || itemType === 'jarretSouple' || itemType === 'jarretSifflet') {
      return this.items.jarret === itemType;
    }
    return this.items[itemType] === true;
  }

  hasAnyJarret() {
    return this.items.jarret !== null;
  }

  getItemsList() {
    const items = [];
    if (this.items.grelottine) items.push('Grelottine');
    if (this.items.civet) items.push('Civet');
    if (this.items.civetFiloche) items.push('Civet-Filoché');
    if (this.items.flan) items.push('Flan');
    if (this.items.jarret) {
      const jarretNames = {
        jarret: 'Jarret',
        jarretSouple: 'Jarret Souple',
        jarretSifflet: 'Jarret-Sifflet'
      };
      items.push(jarretNames[this.items.jarret]);
    }
    if (this.items.passeGrelot) items.push('Passe-Grelot');
    if (this.items.rigodon) items.push('Rigodon');
    return items;
  }

  reset() {
    this.score = 0;
    this.eliminated = false;
    this.history = [];
    this.items = {
      grelottine: false,
      civet: false,
      civetFiloche: false,
      flan: false,
      jarret: null,
      passeGrelot: false,
      rigodon: false
    };
  }
}

// === CONSTANTES DU JEU ===

export const WINNING_SCORE = 343;
export const BEVUE_PENALTY = 10;
export const SIROP_BET_COST = 5;
export const SIROP_BET_WIN = 25;
export const ACHAT_COST = 30;
export const SUITE_PENALTY = 10;

// Niveaux de difficulté
export const DIFFICULTY = {
  STAR_1: 1,
  STAR_2: 2,
  STAR_3: 3,
  STAR_4: 4
};

// Points des Chouettes (valeur²)
export const CHOUETTE_POINTS = {
  1: 1, 2: 4, 3: 9, 4: 16, 5: 25, 6: 36
};

// Points des Velutes (2 × valeur_max²)
export const VELUTE_POINTS = {
  2: 8, 3: 18, 4: 32, 5: 50, 6: 72
};

// Points des Culs de Chouette (40 + 10×valeur)
export const CUL_DE_CHOUETTE_POINTS = {
  1: 50, 2: 60, 3: 70, 4: 80, 5: 90, 6: 100
};

// Points des Contre-Sirops (1/5 du CdC tenté)
export const CONTRE_SIROP_POINTS = {
  1: 10, 2: 12, 3: 14, 4: 16, 5: 18, 6: 20
};

// Noms des oiseaux pour les paris du Sirop
export const SIROP_BIRDS = {
  1: 'Linotte',
  2: 'Alouette',
  3: 'Fauvette',
  4: 'Mouette',
  5: 'Bergeronnette',
  6: 'Chouette'
};

// Pourcentages de mise Grelottine
export const GRELOTTINE_RATES = {
  chouette: 0.33,
  velute: 0.25,
  culDeChouette: 0.12,
  chouetteVelute: 0.06,
  siropGrelot: 0.03
};

// Types de combinaisons
export const COMBINATION_TYPES = {
  NEANT: 'neant',
  CHOUETTE: 'chouette',
  VELUTE: 'velute',
  CHOUETTE_VELUTE: 'chouetteVelute',
  CUL_DE_CHOUETTE: 'culDeChouette',
  SUITE: 'suite',
  SUITE_VELUTEE: 'suiteVelutee',
  ARTICHETTE: 'artichette',
  SOUFFLETTE: 'soufflette',
  BLEU_ROUGE: 'bleuRouge',
  PELICAN: 'pelican',
  NEANT_SOUFFLE: 'neantSouffle',
  FLAN: 'flan',
  TICHETTE: 'tichette'
};

// Objets possédables par un joueur
export const ITEM_TYPES = {
  GRELOTTINE: 'grelottine',
  CIVET: 'civet',
  CIVET_FILOCHE: 'civetFiloche',
  FLAN: 'flan',
  JARRET: 'jarret',
  JARRET_SOUPLE: 'jarretSouple',
  JARRET_SIFFLET: 'jarretSifflet',
  PASSE_GRELOT: 'passeGrelot',
  RIGODON: 'rigodon'
};

// Phases de jeu
export const GAME_PHASE = {
  SETUP: 'setup',
  ROLLING_CHOUETTES: 'rollingChouettes',
  ROLLING_CUL: 'rollingCul',
  RESOLVING: 'resolving',
  ACTION: 'action',
  BETWEEN_TURNS: 'betweenTurns',
  GAME_OVER: 'gameOver'
};

// Avatars disponibles
export const AVATARS = [
  { id: 'arthur', name: 'Arthur', color: '#c9a227' },
  { id: 'perceval', name: 'Perceval', color: '#4a7c59' },
  { id: 'karadoc', name: 'Karadoc', color: '#8b4513' },
  { id: 'leodagan', name: 'Léodagan', color: '#8b0000' },
  { id: 'lancelot', name: 'Lancelot', color: '#1a3a5c' },
  { id: 'bohort', name: 'Bohort', color: '#6b3a7d' },
  { id: 'merlin', name: 'Merlin', color: '#2d5a3a' },
  { id: 'elias', name: 'Élias', color: '#5c3a1a' },
  { id: 'guethenoc', name: 'Guethenoc', color: '#5a4a3a' },
  { id: 'roparzh', name: 'Roparzh', color: '#3a4a3a' },
  { id: 'yvain', name: 'Yvain', color: '#7a5a2a' },
  { id: 'gauvain', name: 'Gauvain', color: '#3a5a7a' },
  { id: 'seli', name: 'Séli', color: '#7a3a5a' },
  { id: 'guenièvre', name: 'Guenièvre', color: '#d4a574' },
  { id: 'mevanwi', name: 'Mévanwi', color: '#a5744d' },
  { id: 'angharad', name: 'Angharad', color: '#4d7a5a' }
];

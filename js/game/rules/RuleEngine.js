import { detectCombination } from './combinations.js';
import {
  COMBINATION_TYPES,
  CUL_DE_CHOUETTE_POINTS,
  CHOUETTE_POINTS,
  WINNING_SCORE,
  BEVUE_PENALTY,
  SUITE_PENALTY,
  SIROP_BET_COST,
  SIROP_BET_WIN,
  GRELOTTINE_RATES,
  DIFFICULTY
} from '../../utils/constants.js';

export class RuleEngine {
  constructor(difficulty) {
    this.difficulty = difficulty;
  }

  /**
   * Analyse les dés et retourne la combinaison détectée
   */
  analyze(dice) {
    return detectCombination(dice, this.difficulty);
  }

  /**
   * Détermine les actions disponibles après une combinaison
   */
  getAvailableActions(combination, currentPlayer, allPlayers) {
    const actions = [];

    switch (combination.type) {
      case COMBINATION_TYPES.CHOUETTE:
        // Sirop toujours disponible en ★+
        actions.push({
          id: 'sirop',
          label: 'Je sirote !',
          description: `Relancer un dé pour tenter le Cul de Chouette de ${combination.value} (${CUL_DE_CHOUETTE_POINTS[combination.value]} pts). En cas d'échec, vous perdez ${CHOUETTE_POINTS[combination.value]} pts.`,
          forPlayer: currentPlayer,
          type: 'optional'
        });

        // Attrape-Oiseau disponible en ★★+
        if (this.difficulty >= DIFFICULTY.STAR_2) {
          actions.push({
            id: 'attrapeOiseau',
            label: 'Attrape-Oiseau !',
            description: 'Un autre joueur peut siroter à votre place.',
            forPlayer: 'others',
            type: 'race' // premier à cliquer
          });
        }

        actions.push({
          id: 'skipSirop',
          label: 'Encaisser la Chouette',
          description: `Prendre les ${combination.points} pts de la Chouette sans risquer le Sirop.`,
          forPlayer: currentPlayer,
          type: 'optional'
        });
        break;

      case COMBINATION_TYPES.CHOUETTE_VELUTE:
        actions.push({
          id: 'pasMouLeCaillou',
          label: 'Pas mou le caillou !',
          description: `Premier à crier gagne ${combination.points} pts. En cas d'égalité, les joueurs à égalité PERDENT ces points.`,
          forPlayer: 'all',
          type: 'race'
        });
        break;

      case COMBINATION_TYPES.SUITE:
        actions.push({
          id: 'grelotteCaPicote',
          label: 'Grelotte ça picote !',
          description: 'Le DERNIER joueur à réagir perd 10 pts.',
          forPlayer: 'all',
          type: 'lastLoses'
        });
        break;

      case COMBINATION_TYPES.SUITE_VELUTEE:
        actions.push({
          id: 'grelotteCaPicote',
          label: 'Grelotte ça picote !',
          description: 'Le DERNIER joueur à réagir perd 10 pts.',
          forPlayer: 'all',
          type: 'lastLoses'
        });
        actions.push({
          id: 'patteDeCanaaard',
          label: 'Patte de canaaard !',
          description: 'Le lanceur attrape les chouettes pour valider sa Velute de 3 (18 pts).',
          forPlayer: currentPlayer,
          type: 'optional'
        });
        actions.push({
          id: 'velutee',
          label: 'Velutée !',
          description: 'Un adversaire attrape les chouettes, les relance, et gagne la combinaison résultante.',
          forPlayer: 'others',
          type: 'race'
        });
        break;

      case COMBINATION_TYPES.CUL_DE_CHOUETTE:
        // Cul de Chouette Doublé en ★★+
        if (this.difficulty >= DIFFICULTY.STAR_2) {
          actions.push({
            id: 'culDeChouetteDouble',
            label: 'Cul de Chouette !',
            description: `RISQUÉ ! Relancer les 3 dés. Si vous refaites un Cul de Chouette, vous gagnez les 2 Culs de Chouette. Sinon, vous êtes ÉLIMINÉ de la partie.`,
            forPlayer: currentPlayer,
            type: 'optional'
          });
        }
        actions.push({
          id: 'skipDouble',
          label: 'Encaisser le Cul de Chouette',
          description: `Prendre les ${combination.points} pts sans risquer le doublé.`,
          forPlayer: currentPlayer,
          type: 'optional'
        });
        break;

      case COMBINATION_TYPES.SOUFFLETTE:
        actions.push({
          id: 'soufflette',
          label: 'En garde ma mignonne !',
          description: 'Défier un adversaire. Il a 3 lancers pour refaire 4-2-1.',
          forPlayer: currentPlayer,
          type: 'target' // doit choisir une cible
        });
        actions.push({
          id: 'skipSoufflette',
          label: 'Ne pas défier',
          description: 'Renoncer à la Soufflette.',
          forPlayer: currentPlayer,
          type: 'optional'
        });
        break;

      case COMBINATION_TYPES.ARTICHETTE:
        actions.push({
          id: 'raitournelle',
          label: 'Raitournelle !',
          description: 'Criez pour gagner 16 pts.',
          forPlayer: currentPlayer,
          type: 'race'
        });
        actions.push({
          id: 'artichette',
          label: 'Artichette !',
          description: 'Pointez le lanceur du doigt pour lui faire perdre 16 pts.',
          forPlayer: 'others',
          type: 'race'
        });
        break;

      case COMBINATION_TYPES.BLEU_ROUGE:
        actions.push({
          id: 'relanceBleuRouge',
          label: 'Miser sur la relance',
          description: 'Tous les joueurs doivent miser sur la valeur de la relance (3 à 18). Chacun doit miser une valeur différente.',
          forPlayer: 'all',
          type: 'bet'
        });
        break;

      case COMBINATION_TYPES.NEANT_SOUFFLE:
        actions.push({
          id: 'mecreant',
          label: 'Mécréant !',
          description: 'Se toucher le nez en criant pour récupérer une Grelottine.',
          forPlayer: 'all',
          type: 'race'
        });
        actions.push({
          id: 'miserable',
          label: 'Je suis un misérable.',
          description: 'Empêcher quiconque de récupérer la Grelottine.',
          forPlayer: 'all',
          type: 'race'
        });
        break;

      case COMBINATION_TYPES.FLAN:
        actions.push({
          id: 'aKadoc',
          label: 'À Kadoc !',
          description: 'Lever le doigt pour obtenir un Flan.',
          forPlayer: currentPlayer,
          type: 'timed' // doit être fait avant le prochain lancer
        });
        break;

      case COMBINATION_TYPES.NEANT:
        // Rien à faire, on attribue la Grelottine automatiquement
        break;
    }

    return actions;
  }

  /**
   * Résout un Sirop
   */
  resolveSirop(chouetteValue, siropDie) {
    if (siropDie === chouetteValue) {
      return {
        success: true,
        points: CUL_DE_CHOUETTE_POINTS[chouetteValue],
        description: `Sirop réussi ! Cul de Chouette de ${chouetteValue} !`,
        explanation: `Le dé relancé donne ${siropDie}, c'est un Cul de Chouette de ${chouetteValue} qui vaut ${CUL_DE_CHOUETTE_POINTS[chouetteValue]} pts !`
      };
    } else {
      const penalty = CHOUETTE_POINTS[chouetteValue];
      return {
        success: false,
        points: -penalty,
        siropDie,
        description: `Sirop raté ! (dé: ${siropDie})`,
        explanation: `Le dé donne ${siropDie} au lieu de ${chouetteValue}. Vous perdez ${penalty} pts (valeur de la Chouette).`,
        givesCivet: chouetteValue === 6 // Sirop de 6 raté = Civet
      };
    }
  }

  /**
   * Résout un pari de Sirop (oiseau)
   */
  resolveSiropBet(betValue, siropDie, chouetteValue) {
    if (siropDie === chouetteValue) {
      // Le sirop a réussi, on ne peut pas gagner le pari oiseau
      // Sauf si on a parié "Beau-Sirop !"
      return { success: false, points: -SIROP_BET_COST, reason: 'siropReussi' };
    }
    if (betValue === siropDie) {
      return { success: true, points: SIROP_BET_WIN };
    }
    return { success: false, points: -SIROP_BET_COST };
  }

  /**
   * Vérifie si un défi Grelottine peut être lancé
   */
  canLaunchGrelottine(challenger, target, allowNegative) {
    if (!challenger.hasItem('grelottine')) return { valid: false, reason: 'Vous n\'avez pas de Grelottine.' };
    if (!target.hasItem('grelottine')) return { valid: false, reason: 'La cible n\'a pas de Grelottine.' };
    if (challenger.eliminated) return { valid: false, reason: 'Vous êtes éliminé.' };
    if (target.eliminated) return { valid: false, reason: 'La cible est éliminée.' };

    if (!allowNegative) {
      if (challenger.score < 30) return { valid: false, reason: 'Votre score est inférieur à 30 pts.' };
      if (target.score < 30) return { valid: false, reason: 'Le score de la cible est inférieur à 30 pts.' };
    } else {
      if (challenger.score <= 0) return { valid: false, reason: 'Votre score est inférieur ou égal à 0.' };
      if (target.score <= 0) return { valid: false, reason: 'Le score de la cible est inférieur ou égal à 0.' };
    }

    return { valid: true };
  }

  /**
   * Calcule la mise maximale d'une Grelottine
   */
  getMaxGrelottineBet(challenger, target, combinationType) {
    const minScore = Math.min(challenger.score, target.score);
    const rate = GRELOTTINE_RATES[combinationType];
    return Math.ceil(minScore * rate);
  }

  /**
   * Vérifie si un joueur a gagné
   */
  checkWin(player) {
    return player.score >= WINNING_SCORE;
  }

  /**
   * Applique une Bévue
   */
  applyBevue(player, reason) {
    player.removeScore(BEVUE_PENALTY, `Bévue : ${reason}`);
    return {
      player: player.name,
      points: -BEVUE_PENALTY,
      reason
    };
  }
}

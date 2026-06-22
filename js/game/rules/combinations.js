import {
  COMBINATION_TYPES,
  CHOUETTE_POINTS,
  VELUTE_POINTS,
  CUL_DE_CHOUETTE_POINTS,
  DIFFICULTY
} from '../../utils/constants.js';

/**
 * Détecte la combinaison réalisée par les 3 dés.
 * L'ordre de priorité est important : les combinaisons spécifiques
 * sont testées avant les génériques.
 */
export function detectCombination(dice, difficulty) {
  const [d1, d2, d3] = dice; // d1, d2 = chouettes, d3 = cul
  const sorted = [...dice].sort((a, b) => a - b);
  const all = [d1, d2, d3];

  // --- Combinaisons spécifiques par niveau ---

  // ★★★★ : Flan (6-5-2, dans n'importe quel ordre)
  if (difficulty >= DIFFICULTY.STAR_4) {
    if (sorted[0] === 2 && sorted[1] === 5 && sorted[2] === 6) {
      return {
        type: COMBINATION_TYPES.FLAN,
        points: 0,
        dice: all,
        description: 'Flan ! (6-5-2)',
        explanation: 'La combinaison 6-5-2 est un Flan. Criez "À Kadoc !" pour obtenir un Flan utilisable plus tard.'
      };
    }
  }

  // ★★★ : Néant Soufflé (1-4-6, dans n'importe quel ordre)
  if (difficulty >= DIFFICULTY.STAR_3) {
    if (sorted[0] === 1 && sorted[1] === 4 && sorted[2] === 6) {
      return {
        type: COMBINATION_TYPES.NEANT_SOUFFLE,
        points: 0,
        dice: all,
        description: 'Néant Soufflé ! (1-4-6)',
        explanation: 'C\'est un Néant Soufflé. Le premier joueur à crier "Mécréant !" en se touchant le nez récupère une Grelottine.'
      };
    }
  }

  // ★★ : Soufflette (4-2-1, dans n'importe quel ordre)
  if (difficulty >= DIFFICULTY.STAR_2) {
    if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 4) {
      return {
        type: COMBINATION_TYPES.SOUFFLETTE,
        points: 0,
        dice: all,
        description: 'Soufflette ! (4-2-1)',
        explanation: 'C\'est une Soufflette ! Le lanceur peut défier un adversaire en criant "En garde ma mignonne !". Le défié a 3 lancers pour refaire 4-2-1.'
      };
    }
  }

  // ★★★ : Bleu-Rouge (3-4-3) - REMPLACE Artichette en ★★★+
  if (difficulty >= DIFFICULTY.STAR_3) {
    if ((d1 === 3 && d2 === 4 && d3 === 3) ||
        (d1 === 4 && d2 === 3 && d3 === 3) ||
        (d1 === 3 && d2 === 3 && d3 === 4)) {
      // Bleu-Rouge : la combinaison est spécifiquement 3-4-3 (chouettes puis cul)
      // Mais on accepte toute permutation pour simplifier
      if (sorted[0] === 3 && sorted[1] === 3 && sorted[2] === 4) {
        return {
          type: COMBINATION_TYPES.BLEU_ROUGE,
          points: 9, // Chouette de 3
          dice: all,
          description: 'Bleu-Rouge ! (3-4-3)',
          explanation: 'C\'est un Bleu-Rouge ! Vous gagnez 9 pts (Chouette de 3). Tous les joueurs doivent miser sur la valeur de la relance (somme des 3 dés, de 3 à 18). Chaque joueur doit miser une valeur différente.'
        };
      }
    }
  }

  // ★★ : Artichette (3-4-3 mais seulement en ★★, remplacée par Bleu-Rouge en ★★★+)
  if (difficulty === DIFFICULTY.STAR_2) {
    if (sorted[0] === 3 && sorted[1] === 3 && sorted[2] === 4) {
      return {
        type: COMBINATION_TYPES.ARTICHETTE,
        points: 16, // valeur de la Chouette de 4
        dice: all,
        description: 'Artichette ! (4-3-4)',
        explanation: 'C\'est une Artichette ! Criez "Raitournelle !" pour gagner 16 pts. Mais si un adversaire crie "Artichette !" en vous pointant du doigt, vous perdez 16 pts.'
      };
    }
  }

  // --- Cul de Chouette (3 identiques) ---
  if (d1 === d2 && d2 === d3) {
    const value = d1;
    return {
      type: COMBINATION_TYPES.CUL_DE_CHOUETTE,
      points: CUL_DE_CHOUETTE_POINTS[value],
      value,
      dice: all,
      description: `Cul de Chouette de ${value} !`,
      explanation: `Trois dés identiques (${value}-${value}-${value}) ! C'est un Cul de Chouette qui vaut ${CUL_DE_CHOUETTE_POINTS[value]} pts.`
    };
  }

  // --- Suite (3 consécutifs) ---
  if (sorted[1] - sorted[0] === 1 && sorted[2] - sorted[1] === 1) {
    // ★★+ : Suite-Velutée si c'est 1-2-3
    if (difficulty >= DIFFICULTY.STAR_2 && sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
      return {
        type: COMBINATION_TYPES.SUITE_VELUTEE,
        points: 0, // La suite ne rapporte rien, c'est la pénalité qui compte
        velutePoints: VELUTE_POINTS[3], // Velute de 3 = 18 pts
        dice: all,
        description: 'Suite-Velutée ! (1-2-3)',
        explanation: 'C\'est une Suite-Velutée ! La Suite s\'applique d\'abord ("Grelotte ça picote !"). Puis le lanceur peut valider sa Velute en criant "Patte de canaaard !", sinon un adversaire peut attraper les chouettes en criant "Velutée !".'
      };
    }

    return {
      type: COMBINATION_TYPES.SUITE,
      points: 0,
      dice: all,
      description: `Suite ! (${sorted[0]}-${sorted[1]}-${sorted[2]})`,
      explanation: `Trois dés consécutifs ! C'est une Suite. Tous les joueurs doivent taper du poing sur la table en criant "Grelotte ça picote !". Le dernier perd 10 pts.`
    };
  }

  // --- Chouette-Velute (Chouette + Velute simultanées) ---
  // Cas : 1-1-2, 2-2-4, 3-3-6
  if (d1 === d2 && d1 + d2 === d3) {
    const veluteValue = d3;
    return {
      type: COMBINATION_TYPES.CHOUETTE_VELUTE,
      points: VELUTE_POINTS[veluteValue],
      value: veluteValue,
      dice: all,
      description: `Chouette-Velute de ${veluteValue} !`,
      explanation: `C'est une Chouette-Velute ! Le premier joueur à frapper dans ses mains en criant "Pas mou le caillou !" gagne ${VELUTE_POINTS[veluteValue]} pts. En cas d'égalité, les joueurs concernés PERDENT ces points.`
    };
  }
  // Cas inversé : le cul fait la paire avec une chouette
  if (d1 === d3 && d1 + d3 === d2) {
    const veluteValue = d2;
    return {
      type: COMBINATION_TYPES.CHOUETTE_VELUTE,
      points: VELUTE_POINTS[veluteValue],
      value: veluteValue,
      dice: all,
      description: `Chouette-Velute de ${veluteValue} !`,
      explanation: `C'est une Chouette-Velute ! Le premier joueur à frapper dans ses mains en criant "Pas mou le caillou !" gagne ${VELUTE_POINTS[veluteValue]} pts.`
    };
  }
  if (d2 === d3 && d2 + d3 === d1) {
    const veluteValue = d1;
    return {
      type: COMBINATION_TYPES.CHOUETTE_VELUTE,
      points: VELUTE_POINTS[veluteValue],
      value: veluteValue,
      dice: all,
      description: `Chouette-Velute de ${veluteValue} !`,
      explanation: `C'est une Chouette-Velute ! Le premier joueur à frapper dans ses mains en criant "Pas mou le caillou !" gagne ${VELUTE_POINTS[veluteValue]} pts.`
    };
  }

  // --- Velute (somme de 2 dés = 3ème) ---
  const veluteCheck = checkVelute(d1, d2, d3);
  if (veluteCheck) {
    return {
      type: COMBINATION_TYPES.VELUTE,
      points: VELUTE_POINTS[veluteCheck.value],
      value: veluteCheck.value,
      dice: all,
      description: `Velute de ${veluteCheck.value} !`,
      explanation: `La somme de deux dés (${veluteCheck.sum}) est égale au troisième dé (${veluteCheck.value}). C'est une Velute qui vaut ${VELUTE_POINTS[veluteCheck.value]} pts.`
    };
  }

  // --- Chouette (2 dés identiques) ---
  const chouetteCheck = checkChouette(d1, d2, d3);
  if (chouetteCheck) {
    return {
      type: COMBINATION_TYPES.CHOUETTE,
      points: CHOUETTE_POINTS[chouetteCheck.value],
      value: chouetteCheck.value,
      dice: all,
      description: `Chouette de ${chouetteCheck.value} !`,
      explanation: `Deux dés identiques (${chouetteCheck.value}-${chouetteCheck.value}). C'est une Chouette qui vaut ${CHOUETTE_POINTS[chouetteCheck.value]} pts.`
    };
  }

  // --- Néant ---
  return {
    type: COMBINATION_TYPES.NEANT,
    points: 0,
    dice: all,
    description: 'Néant...',
    explanation: 'Aucune combinaison ! C\'est un Néant. Vous ne marquez pas de points mais vous gagnez une Grelottine (si vous n\'en avez pas déjà une).'
  };
}

function checkVelute(d1, d2, d3) {
  if (d1 + d2 === d3) return { value: d3, sum: `${d1}+${d2}` };
  if (d1 + d3 === d2) return { value: d2, sum: `${d1}+${d3}` };
  if (d2 + d3 === d1) return { value: d1, sum: `${d2}+${d3}` };
  return null;
}

function checkChouette(d1, d2, d3) {
  if (d1 === d2) return { value: d1 };
  if (d1 === d3) return { value: d1 };
  if (d2 === d3) return { value: d2 };
  return null;
}

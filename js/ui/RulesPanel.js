/**
 * RulesPanel — Panneau de règles in-game, adapté au niveau de difficulté.
 */
export class RulesPanel {
  constructor() {
    this.panel = document.getElementById('rules-panel');
    this.content = document.getElementById('rules-content');
    document.getElementById('btn-close-rules').addEventListener('click', () => this.close());
  }

  open(difficulty) {
    this.render(difficulty);
    this.panel.classList.add('open');
  }

  close() {
    this.panel.classList.remove('open');
  }

  toggle(difficulty) {
    if (this.panel.classList.contains('open')) {
      this.close();
    } else {
      this.open(difficulty);
    }
  }

  render(difficulty) {
    let html = `<div style="margin-bottom: 16px; padding: 8px; background: rgba(212,175,55,0.1); border-radius: 4px; border: 1px solid var(--gold-dark);">
      <strong style="color: var(--gold);">Difficulté : ${'★'.repeat(difficulty)}</strong>
      <br><small>Objectif : atteindre 343 pts</small>
    </div>`;

    html += this._renderCombinations(difficulty);
    html += this._renderActions(difficulty);

    this.content.innerHTML = html;
  }

  _renderCombinations(diff) {
    let html = `<h4 style="color: var(--gold); font-family: var(--font-title); margin: 16px 0 8px;">Combinaisons</h4>`;
    const combos = [
      { name: 'Chouette', desc: '2 dés identiques → valeur²', pts: '1/4/9/16/25/36', lvl: 1 },
      { name: 'Velute', desc: 'Somme de 2 dés = 3ème → 2×valeur²', pts: '8/18/32/50/72', lvl: 1 },
      { name: 'Chouette-Velute', desc: '1-1-2, 2-2-4, 3-3-6. Crier "Pas mou le caillou !"', pts: 'Pts de la Velute', lvl: 1 },
      { name: 'Cul de Chouette', desc: '3 dés identiques → 40+10×valeur', pts: '50/60/70/80/90/100', lvl: 1 },
      { name: 'Suite', desc: '3 consécutifs. Le dernier à crier "Grelotte ça picote !" perd 10 pts', pts: '-10 (dernier)', lvl: 1 },
      { name: 'Néant', desc: 'Aucune combinaison. Gagne une Grelottine.', pts: '0', lvl: 1 },
      { name: 'Suite-Velutée', desc: '1-2-3. Suite + possibilité Velute de 3.', pts: '18 (Velute)', lvl: 2 },
      { name: 'Artichette', desc: '4-3-4. "Raitournelle!" vs "Artichette!"', pts: '±16', lvl: 2 },
      { name: 'Soufflette', desc: '4-2-1. "En garde ma mignonne !" Défi 3 lancers.', pts: '±30/40/50', lvl: 2 },
      { name: 'Bleu-Rouge', desc: '3-4-3. Remplace Artichette. Relance + paris.', pts: '9 + relance', lvl: 3 },
      { name: 'Pélican', desc: 'Relance 6-6-6 sur Bleu-Rouge. "Pélican !"', pts: '28', lvl: 3 },
      { name: 'Néant Soufflé', desc: '1-4-6. "Mécréant !" → Grelottine', pts: '0', lvl: 3 },
      { name: 'Flan', desc: '6-5-2. "À Kadoc !" → obtient un Flan', pts: '0', lvl: 4 },
      { name: 'Tichette', desc: 'Artichette via Sirop. Défi de paris complexe.', pts: 'Score du ticheur', lvl: 4 },
    ];

    combos.filter(c => c.lvl <= diff).forEach(c => {
      html += `<div style="padding: 6px 8px; margin-bottom: 4px; border-left: 3px solid ${c.lvl <= 1 ? 'var(--green)' : c.lvl <= 2 ? 'var(--blue)' : c.lvl <= 3 ? 'var(--purple)' : 'var(--red)'}; background: rgba(255,255,255,0.02); border-radius: 0 4px 4px 0;">
        <strong style="color: var(--text-primary);">${c.name}</strong> <span style="color: var(--gold); font-size: 0.75rem;">(${c.pts})</span>
        <br><small>${c.desc}</small>
      </div>`;
    });
    return html;
  }

  _renderActions(diff) {
    let html = `<h4 style="color: var(--gold); font-family: var(--font-title); margin: 16px 0 8px;">Actions & Défis</h4>`;
    const actions = [
      { name: 'Sirop', desc: 'Sur Chouette : relancer 1 dé pour tenter le Cul de Chouette. Échec = perte de la Chouette.', lvl: 1 },
      { name: 'Grelottine', desc: 'Défier un joueur ayant aussi une Grelottine. Combinaison au choix, 2 lancers.', lvl: 1 },
      { name: 'Civet', desc: 'Obtenu sur Sirop de 6 raté. Parier 1-102 pts sur une combinaison.', lvl: 1 },
      { name: 'Bévue', desc: 'Erreur de jeu = -10 pts.', lvl: 1 },
      { name: 'Chante-Sloubi', desc: 'Rejoindre une partie en cours. Score = formule complexe.', lvl: 1 },
      { name: 'Attrape-Oiseau', desc: 'Siroter à la place d\'un autre joueur.', lvl: 2 },
      { name: 'Contre-Sirop', desc: 'Si Sirop raté + pas de mise réussie. "J\'apprécie les fruits au sirop !"', lvl: 2 },
      { name: 'Achat', desc: '"J\'achète !" Payer 30 pts pour jouer le cul d\'un autre.', lvl: 2 },
      { name: 'Cul de Chouette Doublé', desc: 'Relancer 3 dés. Réussi = 2×CdC. Raté = éliminé !', lvl: 2 },
      { name: 'Passe-Grelot', desc: 'Transférer un défi Grelottine à un autre joueur.', lvl: 2 },
      { name: 'Graines', desc: 'Se lever → "Je ne mange pas de graines !" sinon Bévue.', lvl: 2 },
      { name: 'Verdier', desc: 'Sur chouettes 6-4/6-2/4-2 : parier "Vert-Linette !" sur Velute de 6.', lvl: 3 },
      { name: 'Jarret', desc: 'Obtenu sur Néant de relance Bleu-Rouge. Mi/Bi/Sifflet.', lvl: 3 },
      { name: 'Flan (action)', desc: '"Tatan elle fait des Flans !" Inverse la combinaison d\'un adversaire.', lvl: 4 },
      { name: 'Civet-Filoché', desc: 'Parier sur le lancer d\'un autre joueur. Mise 1-102 pts.', lvl: 4 },
    ];

    actions.filter(a => a.lvl <= diff).forEach(a => {
      html += `<div style="padding: 6px 8px; margin-bottom: 4px; border-left: 3px solid ${a.lvl <= 1 ? 'var(--green)' : a.lvl <= 2 ? 'var(--blue)' : a.lvl <= 3 ? 'var(--purple)' : 'var(--red)'}; background: rgba(255,255,255,0.02); border-radius: 0 4px 4px 0;">
        <strong style="color: var(--text-primary);">${a.name}</strong>
        <br><small>${a.desc}</small>
      </div>`;
    });

    html += `<div style="margin-top: 16px; padding: 8px; background: rgba(168,32,57,0.1); border-radius: 4px; border: 1px solid var(--red-dark); text-align: center;">
      <small style="color: var(--text-muted);">"C'est pas faux." — Perceval</small>
    </div>`;
    return html;
  }
}

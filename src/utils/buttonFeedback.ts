import { db } from '../db/store';

// Retour visuel sur les boutons d'action : rond qui tourne pendant l'envoi au serveur, puis coche verte 0,5 s.
// Aucune attente forcée : on ne fait que suivre l'action. Si aucun envoi ne part, le bouton reste normal.
const ACTION = /enregistr|valid|supprim|envoy|ajout|accept|refus|confirm|pay|prendre|d[ée]marr|termin|cr[ée]er|rejeter|sauvegard|restaur|r[ée]initial|signaler|inscri|connexion|se connecter|appliquer|retirer|annuler/i;

export function initButtonFeedback() {
  if (typeof document === 'undefined') return;
  let mark: HTMLButtonElement | null = null; // bouton en attente d'un envoi
  let busyBtn: HTMLButtonElement | null = null;
  let timer: number | undefined;

  const finish = () => {
    const b = busyBtn; busyBtn = null;
    if (!b) return;
    b.removeAttribute('data-df-busy'); b.removeAttribute('aria-busy');
    if (!b.isConnected) return;
    b.setAttribute('data-df-done', '');
    window.setTimeout(() => b.removeAttribute('data-df-done'), 500);
  };

  db.onNetwork(busy => {
    if (busy > 0 && mark && !busyBtn) {
      busyBtn = mark; mark = null;
      busyBtn.setAttribute('data-df-busy', ''); busyBtn.setAttribute('aria-busy', 'true');
    } else if (busy === 0 && busyBtn) {
      finish();
    }
  });

  document.addEventListener('click', e => {
    const b = (e.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null;
    if (!b || b.disabled || b.hasAttribute('data-df-busy')) return;
    if (b.closest('aside, header, nav, main.fixed, [data-no-anim]')) return; // menu, barre du haut, messagerie : instantané
    const label = (b.textContent || '') + ' ' + (b.getAttribute('title') || '');
    if (b.type !== 'submit' && !ACTION.test(label)) return;
    mark = b;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { if (mark === b) mark = null; }, 400); // aucun envoi dans les 0,4 s : pas d'animation
  }, true);
}

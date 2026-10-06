import { db } from '../db/store';
import { User } from '../types';
import { formatCurrencyAr } from './formatUtils';

export interface Notif {
  id: string;
  title: string;
  sub: string;
  view: string; // page qui s'ouvre au clic
  at: string; // date ISO (pour le tri)
  tone: 'urgent' | 'info' | 'ok' | 'bad';
}

const ts = (s?: string) => (s ? new Date(s).getTime() || 0 : 0);

// Admin : tout ce qui attend une décision. Booster : réponses de l'admin (refus, avances).
export const buildNotifications = (user: User): Notif[] => {
  const out: Notif[] = [];
  if (user.role === 'admin') {
    db.getPosts().forEach(p => {
      if (p.status === 'pending_start' || p.status === 'pending_end')
        out.push({ id: `post-${p.id}-${p.status}`, title: `${p.employee_name} · ${p.client_name}`, sub: p.status === 'pending_start' ? 'Début à valider' : 'Fin à valider', view: 'validations', at: p.updated_at || p.date, tone: 'info' });
    });
    db.getAdvanceRequests().filter(a => a.status === 'pending').forEach(a =>
      out.push({ id: `adv-${a.id}`, title: `${a.employee_name} · avance ${formatCurrencyAr(a.amount_ar)}`, sub: 'Avance à valider', view: 'validations', at: a.request_date, tone: 'info' }));
    db.getSignupRequests().forEach(r =>
      out.push({ id: `sig-${r.id}`, title: r.name, sub: 'Inscription à valider', view: 'validations', at: r.created_at, tone: 'info' }));
    db.getPasswordResets().forEach(r =>
      out.push({ id: `rst-${r.id}`, title: r.name, sub: 'Mot de passe oublié (urgent)', view: 'validations', at: r.created_at, tone: 'urgent' }));
    db.getProfileRequests().filter(r => r.status === 'pending').forEach(r =>
      out.push({ id: `prf-${r.id}`, title: r.old.name, sub: 'Changement de profil à valider', view: 'validations', at: r.created_at, tone: 'info' }));
    db.getSecurityLogs().filter(l => !l.resolved).forEach(l =>
      out.push({ id: `sec-${l.id}`, title: l.employee_name, sub: 'Alerte de sécurité', view: 'security', at: l.timestamp, tone: 'urgent' }));
  } else {
    db.getPosts().filter(p => p.employee_id === user.id && p.status === 'rejected').forEach(p =>
      out.push({ id: `rej-${p.id}-${p.updated_at}`, title: `${p.client_name} refusé`, sub: p.rejection_reason ? `Motif : ${p.rejection_reason}` : 'Soumission refusée', view: 'active-post', at: p.updated_at || p.date, tone: 'bad' }));
    db.getAdvanceRequests().filter(a => a.employee_id === user.id && a.status !== 'pending').forEach(a =>
      out.push({ id: `advr-${a.id}-${a.status}`, title: `Avance ${formatCurrencyAr(a.amount_ar)} ${a.status === 'approved' ? 'acceptée' : 'refusée'}`, sub: a.admin_notes ? `Motif : ${a.admin_notes}` : '', view: 'advances', at: a.request_date, tone: a.status === 'approved' ? 'ok' : 'bad' }));
  }
  return out.sort((a, b) => ts(b.at) - ts(a.at));
};

// « Vu » : gardé par utilisateur dans ce navigateur (le booster voit un compteur seulement pour du nouveau)
const key = (u: User) => `df_notif_seen_${u.id}`;
export const getSeen = (u: User): string[] => {
  try { return JSON.parse(localStorage.getItem(key(u)) || '[]'); } catch { return []; }
};
export const markSeen = (u: User, ids: string[]) => {
  try { localStorage.setItem(key(u), JSON.stringify(Array.from(new Set([...getSeen(u), ...ids])).slice(-200))); } catch { /* stockage indisponible */ }
};
export const unreadCount = (u: User, list: Notif[]): number =>
  u.role === 'admin' ? list.length : list.filter(n => !getSeen(u).includes(n.id)).length;

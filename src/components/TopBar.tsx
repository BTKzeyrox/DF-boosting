import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Menu, Search, Shield, Users, Gamepad2, Calendar, FileText } from 'lucide-react';
import { User } from '../types';
import { db } from '../db/store';
import { countPending } from '../utils/pendingCount';

interface TopBarProps {
  currentUser: User;
  onOpenMenu: () => void;
  onNavigate: (view: string) => void;
  onOpenEmployeeCV: (employee: User) => void;
}

interface Hit {
  id: string;
  title: string;
  sub: string;
  kind: 'page' | 'poste' | 'booster' | 'compte' | 'date';
  go: () => void;
}

const KIND_LABEL: Record<Hit['kind'], string> = { page: 'Page', poste: 'Poste', booster: 'Booster', compte: 'Compte', date: 'Date' };

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Barre du haut fixe (clair) : recherche globale + cloche
export const TopBar: React.FC<TopBarProps> = ({ currentUser, onOpenMenu, onNavigate, onOpenEmployeeCV }) => {
  const isAdmin = currentUser.role === 'admin';
  const [, force] = useState(0);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => db.subscribe(() => force(n => n + 1)), []);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const home = isAdmin ? 'dashboard' : 'grid';
  const pages = useMemo(
    () =>
      isAdmin
        ? [
            ['dashboard', 'Accueil'], ['validations', 'Validations'], ['security', 'Surveillance'], ['employees', 'Boosters'],
            ['advances', 'Avances sur salaire'], ['active-post', 'Suivi des sessions'], ['chat', 'Messagerie'],
            ['calendar', 'Calendrier'], ['settings', 'Réglages'],
          ]
        : [['grid', 'Postes'], ['active-post', 'Mon poste'], ['advances', 'Avances'], ['chat', 'Messagerie'], ['calendar', 'Calendrier']],
    [isAdmin]
  );

  const hits: Hit[] = useMemo(() => {
    const s = norm(q.trim());
    if (!s) return [];
    const out: Hit[] = [];
    pages.forEach(([id, label]) => {
      if (norm(label).includes(s)) out.push({ id: `p-${id}`, title: label, sub: 'Ouvrir la page', kind: 'page', go: () => onNavigate(id) });
    });
    if (isAdmin) {
      db.getUsers().filter(u => u.role === 'employee').forEach(u => {
        if (norm(u.name).includes(s) || norm(u.username).includes(s))
          out.push({ id: `b-${u.id}`, title: u.name, sub: `@${u.username} · ${u.status === 'blocked' ? 'bloqué' : 'actif'}`, kind: 'booster', go: () => onOpenEmployeeCV(u) });
      });
    }
    const seenAcc = new Set<string>();
    db.getContracts().forEach(c => {
      if (norm(c.client_name).includes(s) || norm(`poste ${c.post_number}`).includes(s) || norm(`#${c.post_number}`).includes(s))
        out.push({ id: `c-${c.id}`, title: `${c.client_name}`, sub: `Poste ${c.post_number}`, kind: 'poste', go: () => onNavigate(home) });
      if (c.account_tag && norm(c.account_tag).includes(s) && !seenAcc.has(c.account_tag)) {
        seenAcc.add(c.account_tag);
        out.push({ id: `a-${c.id}`, title: c.account_tag, sub: `Compte de ${c.client_name}`, kind: 'compte', go: () => onNavigate(home) });
      }
    });
    const dates = Array.from(new Set(db.getPosts().map(p => p.date)));
    dates.forEach(d => {
      const [y, m, day] = d.split('-');
      if (`${day}/${m}`.includes(s) || d.includes(s)) out.push({ id: `d-${d}`, title: `${day}/${m}/${y}`, sub: 'Voir au calendrier', kind: 'date', go: () => onNavigate('calendar') });
    });
    return out.slice(0, 8);
  }, [q, isAdmin, pages, home, onNavigate, onOpenEmployeeCV, db.getContracts().length, db.getUsers().length]);

  const pick = (h: Hit) => { setOpen(false); setQ(''); h.go(); };
  const count = isAdmin ? countPending().total + db.getSecurityLogs().filter(l => !l.resolved).length : 0;
  const icon = (k: Hit['kind']) => (k === 'booster' ? Users : k === 'poste' || k === 'compte' ? Gamepad2 : k === 'date' ? Calendar : FileText);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="h-14 px-2.5 sm:px-4 flex items-center gap-2.5 sm:gap-4">
        <button onClick={onOpenMenu} title="Ouvrir le menu" className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer">
          <Menu className="w-5 h-5 text-emerald-600" />
        </button>
        <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="font-tactical font-black text-sm tracking-wider text-emerald-700 hidden min-[420px]:inline">DELTA FORCE</span>
        </div>

        <div ref={box} className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' && hits[0]) pick(hits[0]); if (e.key === 'Escape') setOpen(false); }}
            placeholder={isAdmin ? 'Rechercher un poste, booster, compte, page…' : 'Rechercher un poste, une page…'}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-100 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
          {open && q.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-40">
              {hits.length === 0 ? (
                <div className="px-3 py-2.5 text-sm text-slate-500">Aucun résultat.</div>
              ) : (
                hits.map(h => {
                  const I = icon(h.kind);
                  return (
                    <button key={h.id} onClick={() => pick(h)} className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-emerald-50 cursor-pointer">
                      <I className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{h.title}</span>
                        <span className="block text-xs text-slate-500 truncate">{h.sub}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">{KIND_LABEL[h.kind]}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={() => onNavigate('validations')}
            title="Notifications"
            className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 cursor-pointer shrink-0"
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};

import React, { useEffect, useState } from 'react';
import { Settings, Plus, X, Save } from 'lucide-react';
import { db } from '../../db/store';
import { AppSettings } from '../../types';
import { ScoreInput } from '../../components/ScoreInput';

const inputCls = 'w-full bg-[#141e2a] border border-slate-600 p-2.5 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none';
const labelCls = 'block text-slate-300 uppercase text-xs font-mono mb-1';

export const SettingsView: React.FC = () => {
  const [s, setS] = useState<AppSettings>(db.getSettings());
  const [newType, setNewType] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si les réglages changent ailleurs (autre appareil), on les recharge tant qu'on n'a rien modifié
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    const unsub = db.subscribe(() => {
      if (!touched) setS(db.getSettings());
    });
    return unsub;
  }, [touched]);

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => {
    setTouched(true);
    setSaved(false);
    setS(prev => ({ ...prev, [k]: v }));
  };

  const addType = () => {
    const t = newType.trim().toUpperCase();
    if (!t) return;
    if (s.post_types.some(x => x.toUpperCase() === t)) {
      setError('Ce type existe déjà.');
      return;
    }
    setError(null);
    set('post_types', [...s.post_types, t]);
    setNewType('');
  };

  const save = () => {
    setError(null);
    if (!s.price_per_million || s.price_per_million < 1) return setError('Le prix du 1M doit être supérieur à 0.');
    if (s.retention_days < 1) return setError('Conservation des photos : 1 jour minimum.');
    if (s.late_tolerance_min < 0) return setError('La tolérance ne peut pas être négative.');
    db.updateSettings({
      ...s,
      price_per_million: Math.round(s.price_per_million),
      retention_days: Math.round(s.retention_days),
      late_tolerance_min: Math.round(s.late_tolerance_min),
    });
    setTouched(false);
    setSaved(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-1.5 sm:px-3 py-3 space-y-4">
      <div className="flex items-center gap-2.5">
        <Settings className="w-6 h-6 text-emerald-500 shrink-0" />
        <div>
          <h2 className="font-tactical font-black text-lg text-white">Réglages</h2>
          <p className="text-xs font-mono text-slate-400">Valable pour toute l'équipe, dès l'enregistrement.</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-950 border border-red-500/60 text-red-200 text-sm font-semibold">{error}</div>}
      {saved && <div className="p-3 bg-emerald-950 border border-emerald-500/60 text-emerald-200 text-sm font-semibold">Réglages enregistrés.</div>}

      <section className="bg-[#0f1722] border border-slate-700 p-4 space-y-3">
        <h3 className="font-tactical font-bold text-white">Paie</h3>
        <div>
          <label className={labelCls}>Prix du 1M de score (en Ar)</label>
          <ScoreInput value={s.price_per_million} onChange={n => set('price_per_million', n)} className={inputCls} placeholder="ex: 800" />
          <p className="text-[11px] text-slate-500 mt-1">S'applique aux sessions validées à partir de maintenant. Les paies déjà calculées ne changent pas.</p>
        </div>
      </section>

      <section className="bg-[#0f1722] border border-slate-700 p-4 space-y-3">
        <h3 className="font-tactical font-bold text-white">Shifts</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Jour : début</label>
            <input type="time" value={s.day_shift_start} onChange={e => set('day_shift_start', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Jour : fin</label>
            <input type="time" value={s.day_shift_end} onChange={e => set('day_shift_end', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nuit : début</label>
            <input type="time" value={s.night_shift_start} onChange={e => set('night_shift_start', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nuit : fin</label>
            <input type="time" value={s.night_shift_end} onChange={e => set('night_shift_end', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Tolérance de retard (minutes)</label>
          <input type="number" min={0} value={s.late_tolerance_min} onChange={e => set('late_tolerance_min', Number(e.target.value))} className={inputCls} />
        </div>
      </section>

      <section className="bg-[#0f1722] border border-slate-700 p-4 space-y-3">
        <h3 className="font-tactical font-bold text-white">Types de poste</h3>
        <div className="flex flex-wrap gap-2">
          {s.post_types.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
              {t}
              <button type="button" onClick={() => set('post_types', s.post_types.filter(x => x !== t))} className="text-slate-400 hover:text-red-400 cursor-pointer" title="Retirer">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {s.post_types.length === 0 && <span className="text-xs text-slate-500">Aucun type.</span>}
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={newType} onChange={e => setNewType(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
            placeholder="Nouveau type, ex: NO READ" className={inputCls}
          />
          <button type="button" onClick={addType} className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0" title="Ajouter">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Retirer un type de la liste ne change pas les postes qui l'utilisent déjà.</p>
      </section>

      <section className="bg-[#0f1722] border border-slate-700 p-4 space-y-3">
        <h3 className="font-tactical font-bold text-white">Règles et options</h3>
        <div>
          <label className={labelCls}>Règles pour les boosters (affichées sur leur grille)</label>
          <textarea value={s.rules} onChange={e => set('rules', e.target.value)} rows={5} className={inputCls + ' font-sans'} placeholder="ex: pas de lecture de messages, photo de début obligatoire..." />
        </div>
        <div>
          <label className={labelCls}>Conserver les photos de preuve (jours)</label>
          <input type="number" min={1} value={s.retention_days} onChange={e => set('retention_days', Number(e.target.value))} className={inputCls} />
          <p className="text-[11px] text-slate-500 mt-1">Après ce délai, les photos des sessions terminées sont supprimées automatiquement.</p>
        </div>
      </section>

      <button type="button" onClick={save} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer">
        <Save className="w-4 h-4" /> Enregistrer
      </button>
    </div>
  );
};

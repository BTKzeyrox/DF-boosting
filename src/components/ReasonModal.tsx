import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';

export interface ReasonOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  onSubmit: (reason: string) => void;
}

const MIN = 3;
const MAX = 300;

const ReasonModal: React.FC<{ options: ReasonOptions | null; onClose: () => void }> = ({ options, onClose }) => {
  const [text, setText] = useState('');
  useEffect(() => { setText(''); }, [options]);
  if (!options) return null;
  const clean = text.trim();
  const ok = clean.length >= MIN;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-black/70" onClick={onClose} role="dialog" aria-modal="true">
      <form
        className="w-full max-w-sm bg-[#0d1624] border border-slate-600 p-5 space-y-3 text-slate-100"
        onClick={e => e.stopPropagation()}
        onSubmit={e => {
          e.preventDefault();
          if (!ok) return;
          const fn = options.onSubmit;
          onClose();
          fn(clean);
        }}
      >
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 shrink-0 text-red-400" />
          <div className="min-w-0">
            <h3 className="font-tactical font-bold text-base leading-snug">{options.title}</h3>
            {options.message && <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{options.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-mono text-slate-300 uppercase mb-1">Motif (obligatoire)</label>
          <textarea
            rows={3}
            value={text}
            maxLength={MAX}
            autoFocus
            onChange={e => setText(e.target.value)}
            placeholder="Écris la raison du refus"
            className="w-full bg-[#141e2a] border border-slate-600 p-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2.5 bg-[#141e2a] hover:bg-[#1b2f44] border border-slate-600 text-sm font-semibold cursor-pointer">
            Annuler
          </button>
          <button
            type="submit"
            disabled={!ok}
            className="px-3 py-2.5 bg-red-600 hover:bg-red-500 text-sm font-bold text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {options.confirmLabel || 'Refuser'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Version globale : un seul <ReasonHost /> dans App, puis askReason({...}) depuis n'importe où
let hostListener: ((o: ReasonOptions) => void) | null = null;

export const askReason = (o: ReasonOptions) => {
  if (hostListener) hostListener(o);
  else {
    const r = window.prompt(o.title);
    if (r && r.trim().length >= MIN) o.onSubmit(r.trim());
  }
};

export const ReasonHost: React.FC = () => {
  const [options, setOptions] = useState<ReasonOptions | null>(null);
  useEffect(() => {
    hostListener = setOptions;
    return () => { hostListener = null; };
  }, []);
  return <ReasonModal options={options} onClose={() => setOptions(null)} />;
};

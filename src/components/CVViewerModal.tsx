import React from 'react';
import { X, FileText, CheckCircle2, Shield, Cpu, Award, Download, Printer, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { formatScoreM } from '../utils/formatUtils';
import { db } from '../db/store';

interface CVViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const CVViewerModal: React.FC<CVViewerModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  useLockBodyScroll(isOpen);

  if (!isOpen || !user) return null;

  const currentUser = db.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const cv = user.cv_data || {
    rank: 'High Diamond III',
    gameExperience: '2 ans sur Delta Force Hawk Ops & shooters tactiques',
    kdRatio: '3.45 K/D',
    hardware: 'RTX 4070 / i7 13700KF / 165Hz / Fibre optique 50Mbps',
    joinedDate: '2026-02-01',
    languages: ['Malagasy', 'Français'],
    specialty: 'Hazard zone extraction & rush mandelbrick',
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
    >
      <div className="bg-[#0f1722] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="bg-[#141f2d] px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-tactical font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all cursor-pointer shadow-sm"
              title="Retour (ESC)"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>RETOUR</span>
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-tactical font-bold text-white text-base tracking-wide">
                  Dossier Opérateur / CV
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {user.name} ({user.username})
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Imprimer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-tactical font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Fermer</span>
            </button>
          </div>
        </div>

        {/* CV Document Content */}
        <div className="p-6 space-y-6 text-slate-200 text-sm">
          
          {/* Header Profile */}
          <div className="flex items-start gap-4 pb-6 border-b border-slate-800">
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-20 h-20 rounded-lg object-cover border-2 border-emerald-500/40 shadow-lg"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white font-tactical">{user.name}</h2>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded border uppercase ${
                    user.status === 'blocked'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {user.status === 'blocked' ? 'Statut: Banni' : 'Statut: Actif'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Pseudonyme: <span className="text-cyan-400 font-semibold">@{user.username}</span> · Tél: {user.phone}
              </p>
              
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                  Affectation: Shift {user.shift.toUpperCase()} (
                  {user.shift === 'day' ? '08h00 - 18h00' : '20h00 - 06h00'}
                  )
                </span>
                <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                  {user.performance_badge}
                </span>
              </div>
            </div>
          </div>

          {/* Boosting Performance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#121a24] p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono uppercase">Score Total Boosté</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {formatScoreM(user.total_score_boosted)} pts
              </div>
            </div>
            {isAdmin ? (
              <div className="bg-[#121a24] p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono uppercase">Gains Cumulés (Admin)</div>
                <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                  {user.total_earnings_ar.toLocaleString()} Ar
                </div>
              </div>
            ) : (
              <div className="bg-[#121a24] p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono uppercase">Statut Missions</div>
                <div className="text-sm font-bold text-cyan-400 font-mono mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Opérateur Actif</span>
                </div>
              </div>
            )}
            <div className="bg-[#121a24] p-3 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 font-mono uppercase">Ratio K/D Vérifié</div>
              <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                {cv.kdRatio}
              </div>
            </div>
          </div>

          {/* In-game Rank & Specialization */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              Compétences de jeu &amp; Rang Actuel
            </h4>
            <div className="bg-[#121a24] p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Rang Opérationnel:</span>
                <span className="font-bold text-white font-mono">{cv.rank}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Spécialité tactique:</span>
                <span className="font-medium text-emerald-300">{cv.specialty}</span>
              </div>
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="text-slate-500">Expérience: </span>
                {cv.gameExperience}
              </div>
            </div>
          </div>

          {/* Hardware & Network Setup */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Configuration Matérielle &amp; Connexion
            </h4>
            <div className="bg-[#121a24] p-3.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
              {cv.hardware}
            </div>
          </div>

          {/* Languages & Commitment */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div>
              Langues maîtrisées: <span className="text-white">{cv.languages?.join(', ')}</span>
            </div>
            <div>
              Date d'intégration: <span className="text-slate-300 font-mono">{cv.joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#141f2d] px-6 py-3 border-t border-slate-700/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Certifié conforme par l'Administration Delta Force
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

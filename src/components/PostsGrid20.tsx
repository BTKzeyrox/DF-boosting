import React, { useState, useEffect } from 'react';
import {
  Target,
  Search,
  AlertCircle,
  ArrowRight,
  Gamepad2,
  Eye,
  CheckCircle2,
  Sun,
  Moon,
  Clock,
  Camera,
  Filter,
  Check,
  Zap,
} from 'lucide-react';
import { ClientContract, PostSession, User } from '../types';
import { db } from '../db/store';
import { formatScoreM, formatCurrencyAr } from '../utils/formatUtils';
import { useApp } from '../context/AppContext';

interface PostsGrid20Props {
  currentUser: User;
  activePost?: PostSession;
  allPosts: PostSession[];
  onSelectContract: (contract: ClientContract) => void;
  onOpenProofLightbox: (params: {
    imageUrl: string;
    title: string;
    subtitle?: string;
    score?: number;
    clientTag?: string;
    operatorName?: string;
    timestamp?: string;
  }) => void;
  onNavigateToActivePost: () => void;
}

export const PostsGrid20: React.FC<PostsGrid20Props> = ({
  currentUser,
  activePost,
  allPosts,
  onSelectContract,
  onOpenProofLightbox,
  onNavigateToActivePost,
}) => {
  const { t, theme } = useApp();
  const [contractsList, setContractsList] = useState<ClientContract[]>(() => db.getContracts());
  const [filterShift, setFilterShift] = useState<'all' | 'day' | 'night' | 'urgent'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'free'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isLight = theme === 'light';

  // Keep contracts synchronized with store
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setContractsList(db.getContracts());
    });
    return unsub;
  }, []);

  // Calculate live stats for the header and filters
  const pendingContracts = contractsList.filter(c => {
    const s = allPosts.find(
      p => p.client_name === c.client_name && (p.status === 'pending_start' || p.status === 'pending_end')
    );
    return !!s;
  });

  const activeContracts = contractsList.filter(c => {
    const s = allPosts.find(p => p.client_name === c.client_name && p.status === 'active');
    return !!s;
  });

  const freeContracts = contractsList.filter(c => {
    const s = allPosts.find(
      p =>
        p.client_name === c.client_name &&
        (p.status === 'active' || p.status === 'pending_start' || p.status === 'pending_end')
    );
    return !s;
  });

  const filteredContracts = contractsList.filter(contract => {
    const matchesSearch =
      contract.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.account_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.game_mode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `poste ${contract.post_number}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `#${contract.post_number}`.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Shift Filter
    if (filterShift === 'day' && contract.recommended_shift !== 'day') return false;
    if (filterShift === 'night' && contract.recommended_shift !== 'night') return false;
    if (filterShift === 'urgent' && contract.priority !== 'Urgente') return false;

    // Status Filter
    const session = allPosts.find(
      p =>
        p.client_name === contract.client_name &&
        (p.status === 'active' || p.status === 'pending_start' || p.status === 'pending_end')
    );

    if (filterStatus === 'pending') {
      if (!session || (session.status !== 'pending_start' && session.status !== 'pending_end')) return false;
    } else if (filterStatus === 'active') {
      if (!session || session.status !== 'active') return false;
    } else if (filterStatus === 'free') {
      if (session) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Control Bar: Search, Shift Filter, Status Filter & View Mode Switcher */}
      <div
        className={`border rounded-xl p-3 sm:p-4 shadow-lg transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0d1624] border-slate-800 text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher client, tag, poste #..."
              className={`w-full border rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  : 'bg-[#0a1017] border-slate-800 text-white placeholder-slate-500'
              }`}
            />
          </div>

          {/* Right Controls: View Mode Switcher & Quick Counts */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Total Posts Count */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#090f18] border-slate-800'
              }`}
            >
              <div className="text-[9px] font-mono text-slate-400 uppercase leading-none">Postes</div>
              <div className="text-sm font-tactical font-black text-emerald-500 mt-0.5">20</div>
            </div>
          </div>
        </div>

        {/* Filtrages complets visibles pour Employés & Admin */}
        <div
          className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}
        >
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>Statut:</span>
            </span>
            {[
              { id: 'all', label: 'Tous', count: contractsList.length, color: 'emerald' },
              { id: 'pending', label: '⏳ En attente', count: pendingContracts.length, color: 'amber' },
              { id: 'active', label: '🟢 En cours', count: activeContracts.length, color: 'cyan' },
              { id: 'free', label: '⚪ Libres', count: freeContracts.length, color: 'slate' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatus === f.id
                    ? f.id === 'pending'
                      ? 'bg-amber-600 text-white shadow-md'
                      : f.id === 'active'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-emerald-600 text-white shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    : 'bg-[#121c28] text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterStatus === f.id
                      ? 'bg-black/30 text-white'
                      : f.id === 'pending' && f.count > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Shift Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase mr-1">Shift:</span>
            {[
              { id: 'all', label: 'Tous' },
              { id: 'day', label: '☀️ Jour' },
              { id: 'night', label: '🌙 Nuit' },
              { id: 'urgent', label: '⚡ Urgent' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterShift(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  filterShift === f.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    : 'bg-[#121c28] text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cartes des postes (2 colonnes) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {filteredContracts.map(contract => {
            const isMyActive = activePost?.client_name === contract.client_name;
            const activeSessionOnThis = allPosts.find(
              p =>
                p.client_name === contract.client_name &&
                (p.status === 'active' || p.status === 'pending_start' || p.status === 'pending_end')
            );
            const isTakenByOther = activeSessionOnThis && activeSessionOnThis.employee_id !== currentUser.id;
            const isPending =
              activeSessionOnThis?.status === 'pending_start' || activeSessionOnThis?.status === 'pending_end';

            const initialScore = activeSessionOnThis ? activeSessionOnThis.initial_score : contract.initial_score;
            // Objectif = nombre de points à gagner (cible - départ du poste)
            const objectiveScore = Math.max(1, contract.target_score - contract.initial_score);
            const currentScore = Number(
              activeSessionOnThis
                ? activeSessionOnThis.final_score ?? activeSessionOnThis.current_score
                : contract.initial_score
            ) || 0;
            const boostedDiff = Math.max(0, currentScore - initialScore);
            const remainingScore = Math.max(0, objectiveScore - boostedDiff);
            const progressPercent = Math.min(100, Math.max(0, Math.round((boostedDiff / objectiveScore) * 100)));

            const postLabel = `#${String(contract.post_number).padStart(2, '0')}`;
            const photoCount =
              activeSessionOnThis?.start_proof_urls?.length || (activeSessionOnThis?.start_proof_url ? 1 : 0);

            return (
              <div
                key={contract.id}
                className={`border rounded-2xl p-3 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4 transition-all duration-200 hover:shadow-xl relative overflow-hidden ${
                  isPending
                    ? isLight
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40'
                      : 'border-amber-500 ring-1 ring-amber-500/50 shadow-amber-950/40 bg-gradient-to-br from-[#241709] to-[#120c04]'
                    : isMyActive
                    ? isLight
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40'
                      : 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-emerald-950/40 bg-gradient-to-br from-[#0e1d2c] to-[#0c1622]'
                    : isTakenByOther
                    ? isLight
                      ? 'border-slate-200 opacity-80 bg-slate-100'
                      : 'border-slate-800/80 opacity-85 bg-[#090e16]'
                    : isLight
                    ? 'border-slate-200 hover:border-slate-300 bg-white'
                    : 'border-slate-800 hover:border-slate-600 bg-[#0c1420]'
                }`}
              >
                {/* Card Header: Post Number & Status */}
                <div>
                  <div
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b ${
                      isLight ? 'border-slate-100' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                      {/* Post Number Badge */}
                      <div
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-tactical font-black text-xs sm:text-sm tracking-wider shadow-sm shrink-0 ${
                          isPending
                            ? 'bg-amber-500 text-black'
                            : isLight
                            ? 'bg-slate-100 border border-slate-300 text-emerald-700'
                            : 'bg-slate-900 border border-emerald-500/40 text-emerald-400'
                        }`}
                      >
                        {postLabel}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <h3
                            className={`font-tactical font-bold text-xs sm:text-base tracking-wide break-words leading-tight ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            {contract.client_name}
                          </h3>
                          <span
                            className={`hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                              isLight
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            {contract.account_tag}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="shrink-0">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/60 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>En attente Admin</span>
                        </span>
                      ) : isMyActive ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold animate-pulse ${
                            isLight
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Session</span>
                        </span>
                      ) : isTakenByOther ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
                            isLight
                              ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                              : 'bg-slate-900 text-cyan-300 border border-cyan-800/40'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span className="break-words text-left leading-tight">{activeSessionOnThis.employee_name}</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono ${
                            isLight
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Libre</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pending Alert in Cards View */}
                  {isPending && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-950/80 border border-amber-500/50 text-xs font-mono text-amber-200 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Validation requise : <strong>{activeSessionOnThis.employee_name}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{photoCount} photo{photoCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}

                  {/* 4 métriques : Départ, Actuel, Reste, Objectif */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3.5 text-xs font-mono">
                    {/* 1. Score Départ */}
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080d14] border-slate-800/80'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 uppercase block">Départ</span>
                      <span
                        className={`font-mono-numbers font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}
                      >
                        {formatScoreM(initialScore)}
                      </span>
                    </div>

                    {/* 2. Score Actuel */}
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isLight ? 'bg-cyan-50/60 border-cyan-200' : 'bg-[#07111a] border-cyan-900/50'
                      }`}
                    >
                      <span className="text-[10px] text-cyan-400 uppercase block font-semibold">Actuel</span>
                      <span className="font-mono-numbers font-bold text-xs text-cyan-400">
                        {formatScoreM(currentScore)}
                      </span>
                    </div>

                    {/* 3. Score Restant */}
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-[#120f09] border-amber-900/50'
                      }`}
                    >
                      <span className="text-[10px] text-amber-400 uppercase block font-semibold">Reste</span>
                      <span className="font-mono-numbers font-bold text-xs text-amber-400">
                        {formatScoreM(remainingScore)}
                      </span>
                    </div>

                    {/* 4. Objectif (points à gagner) */}
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#06140f] border-emerald-900/50'
                      }`}
                    >
                      <span className="text-[10px] text-emerald-400 uppercase block font-semibold">Objectif</span>
                      <span className="font-mono-numbers font-bold text-xs text-emerald-400">
                        {formatScoreM(objectiveScore)}
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div
                    className={`mt-3 p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080d14] border-slate-800/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono mb-1.5">
                      <span className="text-slate-400 flex flex-wrap items-center gap-x-1.5">
                        <span>Progression :</span>
                        <strong className="text-emerald-400">{progressPercent}%</strong>
                        <span className="text-slate-500">({formatScoreM(remainingScore)} restant)</span>
                      </span>
                    </div>
                    <div
                    className={`w-full h-2.5 rounded-full overflow-hidden border ${
                      isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-700/50 border-slate-600/60'
                    }`}
                  >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                        style={{ width: `${progressPercent}%`, minWidth: progressPercent > 0 ? '6px' : 0 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  {isPending ? (
                    currentUser.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectContract(contract);
                        }}
                        className="w-full py-2.5 px-2 sm:px-4 text-center leading-tight bg-amber-600 hover:bg-amber-500 text-black font-tactical font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer animate-pulse"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Valider ({activeSessionOnThis?.employee_name})</span>
                      </button>
                    ) : (
                      <div className="w-full py-2.5 px-2 sm:px-4 text-center leading-tight bg-amber-950/60 border border-amber-600/50 text-amber-300 text-xs font-mono rounded-xl text-center">
                        ⏳ En attente de validation
                      </div>
                    )
                  ) : isMyActive ? (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onNavigateToActivePost();
                      }}
                      className="w-full py-2.5 px-2 sm:px-4 text-center leading-tight bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-tactical font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span>Ma session</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : isTakenByOther ? (
                    currentUser.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectContract(contract);
                        }}
                        className="w-full py-2.5 px-2 sm:px-4 text-center leading-tight bg-[#142333] hover:bg-[#1b2f44] border border-cyan-700/60 text-cyan-300 font-tactical font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span>Gérer ({activeSessionOnThis?.employee_name})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectContract(contract);
                        }}
                        className={`w-full py-2.5 px-2 sm:px-4 text-center leading-tight font-mono text-xs rounded-xl border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-800/40'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Occupé ({activeSessionOnThis?.employee_name})</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectContract(contract);
                      }}
                      className="w-full py-2.5 px-2 sm:px-4 text-center leading-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-tactical font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Target className="w-4 h-4" />
                      <span>{currentUser.role === 'admin' ? 'Modifier le poste' : 'Prendre ce poste'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
};

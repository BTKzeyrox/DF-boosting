import React, { useState } from 'react';
import { X, Database, Download, HardDrive, Check, Copy, Table, ArrowLeft, AlertTriangle } from 'lucide-react';
import { db } from '../db/store';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { formatScoreM } from '../utils/formatUtils';

interface SqliteInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqliteInspectorModal: React.FC<SqliteInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'users' | 'posts' | 'security' | 'advances'>('sql');
  const [copied, setCopied] = useState(false);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const sqlContent = db.exportDatabaseSql();
  const users = db.getUsers();
  const posts = db.getPosts();
  const violations = db.getSecurityLogs();
  const advances = db.getAdvanceRequests();

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sqlContent], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delta_force_boosting_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = db.exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delta_force_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain"
    >
      <div className="bg-[#0d141d] border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#121c27] px-4 sm:px-6 py-3.5 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-tactical font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all cursor-pointer shadow-sm"
              title="Retour (ESC)"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>RETOUR</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-tactical font-bold text-white text-xs sm:text-base tracking-wide flex items-center gap-2">
                Base PostgreSQL / Export
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
                Schémas &amp; Données exportables (Stand-alone)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-tactical font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Fermer</span>
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-[#0f1722] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger .SQL (SQLite / MySQL)
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger Backup JSON
            </button>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié !' : 'Copier Script SQL'}
            </button>
          </div>

        </div>

        {/* Tabs for inspecting tables */}
        <div className="px-6 pt-3 bg-[#0d141d] border-b border-slate-800 flex gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-t border-t border-x transition-colors ${
              activeTab === 'sql'
                ? 'bg-[#141e2b] border-slate-700 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Script SQL (DDL + Inserts)
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-t border-t border-x transition-colors ${
              activeTab === 'users'
                ? 'bg-[#141e2b] border-slate-700 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Table `users` ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-3 py-1.5 rounded-t border-t border-x transition-colors ${
              activeTab === 'posts'
                ? 'bg-[#141e2b] border-slate-700 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Table `posts` ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-t border-t border-x transition-colors ${
              activeTab === 'security'
                ? 'bg-[#141e2b] border-slate-700 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Table `security_violations` ({violations.length})
          </button>
          <button
            onClick={() => setActiveTab('advances')}
            className={`px-3 py-1.5 rounded-t border-t border-x transition-colors ${
              activeTab === 'advances'
                ? 'bg-[#141e2b] border-slate-700 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Table `salary_advances` ({advances.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#141e2b]">
          {activeTab === 'sql' && (
            <pre className="p-4 bg-[#090d12] border border-slate-800 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
              {sqlContent}
            </pre>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">Username</th>
                    <th className="p-2">Nom</th>
                    <th className="p-2">Rôle</th>
                    <th className="p-2">Statut</th>
                    <th className="p-2">Shift</th>
                    <th className="p-2">En Ligne</th>
                    <th className="p-2">Score Boosté</th>
                    <th className="p-2">Gains (Ar)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="p-2 text-slate-500">{u.id}</td>
                      <td className="p-2 text-cyan-400 font-semibold">{u.username}</td>
                      <td className="p-2 text-white">{u.name}</td>
                      <td className="p-2">{u.role}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${u.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-2 uppercase">{u.shift}</td>
                      <td className="p-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${u.is_online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      </td>
                      <td className="p-2 text-emerald-400">{formatScoreM(u.total_score_boosted)} pts</td>
                      <td className="p-2 text-amber-400 font-bold">{u.total_earnings_ar.toLocaleString()} Ar</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">Booster</th>
                    <th className="p-2">Client</th>
                    <th className="p-2">Statut</th>
                    <th className="p-2">Shift</th>
                    <th className="p-2">Initial</th>
                    <th className="p-2">Actuel / Final</th>
                    <th className="p-2">Objectif</th>
                    <th className="p-2">Gain (Ar)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {posts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-2 text-slate-500">{p.id}</td>
                      <td className="p-2 text-white">{p.employee_name}</td>
                      <td className="p-2 text-cyan-400">{p.client_name}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2 uppercase">{p.shift_type}</td>
                      <td className="p-2">{formatScoreM(p.initial_score)} pts</td>
                      <td className="p-2 text-emerald-400">{formatScoreM(p.final_score ?? p.current_score)} pts</td>
                      <td className="p-2 text-slate-400">{formatScoreM(p.target_score)} pts</td>
                      <td className="p-2 text-amber-400 font-semibold">{p.calculated_ar ? `${p.calculated_ar} Ar` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Horodatage</th>
                    <th className="p-2">Booster</th>
                    <th className="p-2">Type d'infraction</th>
                    <th className="p-2">Détails</th>
                    <th className="p-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {violations.map(v => (
                    <tr key={v.id} className="hover:bg-slate-800/40">
                      <td className="p-2 text-slate-500 whitespace-nowrap">{v.timestamp}</td>
                      <td className="p-2 text-white font-semibold">{v.employee_name}</td>
                      <td className="p-2 text-red-400 font-bold">{v.violation_type}</td>
                      <td className="p-2 text-slate-300">{v.description}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.resolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400 font-bold'}`}>
                          {v.resolved ? 'Résolu' : 'ACTIF'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'advances' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Employé</th>
                    <th className="p-2">Montant</th>
                    <th className="p-2">Motif</th>
                    <th className="p-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {advances.map(a => (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="p-2 text-slate-500">{a.request_date}</td>
                      <td className="p-2 text-white font-semibold">{a.employee_name}</td>
                      <td className="p-2 text-amber-400 font-bold">{a.amount_ar.toLocaleString()} Ar</td>
                      <td className="p-2 text-slate-300">{a.reason}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          a.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : a.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#121c27] px-6 py-3 border-t border-slate-700/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Emplacement local: <code className="text-slate-300">/db/delta_force_boosting.sqlite</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

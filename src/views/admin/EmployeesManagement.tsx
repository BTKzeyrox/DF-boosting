import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  FileText,
  Edit,
  Trash2,
  Ban,
  Plus,
  Shield,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { User, ShiftType, SalaryAdvanceRequest } from '../../types';
import { Avatar } from '../../components/Avatar';
import { db } from '../../db/store';
import { askConfirm } from '../../components/ConfirmModal';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll';
import { formatScoreM } from '../../utils/formatUtils';

interface EmployeesManagementProps {
  onOpenEmployeeCV: (employee: User) => void;
  section?: 'employees' | 'advances';
}

// Téléphone : chiffres uniquement, format fixe « 261 34 12 345 67 »
const PHONE_PREFIX = '261';
const formatPhone = (raw: string): string => {
  let d = (raw || '').replace(/\D/g, '');
  if (!d.startsWith(PHONE_PREFIX)) d = PHONE_PREFIX + d.replace(/^0+/, '');
  d = d.slice(0, 12);
  const parts = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 10), d.slice(10, 12)].filter(Boolean);
  const out = parts.join(' ');
  return d.length === 3 ? out + ' ' : out;
};
const phoneDigits = (v: string) => v.replace(/\D/g, '');
const phoneIsEmpty = (v: string) => phoneDigits(v) === PHONE_PREFIX || phoneDigits(v) === '';
const phoneIsComplete = (v: string) => phoneDigits(v).length === 12;

export const EmployeesManagement: React.FC<EmployeesManagementProps> = ({
  onOpenEmployeeCV,
  section = 'employees',
}) => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>(db.getAdvanceRequests());
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night' | 'blocked'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editShift, setEditShift] = useState<ShiftType>('day');
  const [editBadge, setEditBadge] = useState<User['performance_badge']>('Standard');

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('261 ');
  const [newShift, setNewShift] = useState<ShiftType>('day');

  // Delete User Confirmation State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Review Advance Modal State (No prompt() for iframe compatibility)
  const [reviewAdvanceModal, setReviewAdvanceModal] = useState<{
    advanceId: string;
    approve: boolean;
    amount: number;
    employeeName: string;
  } | null>(null);
  const [advanceNotes, setAdvanceNotes] = useState('');

  // Lock background scroll during employee modals
  useLockBodyScroll(showAddModal || !!editingUser || !!deletingUser || !!reviewAdvanceModal);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setUsers(db.getUsers());
      setAdvances(db.getAdvanceRequests());
    });
    return unsubscribe;
  }, []);

  const handleToggleBlock = (userId: string) => {
    db.toggleUserBlock(userId);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    db.deleteUser(deletingUser.id);
    setDeletingUser(null);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(formatPhone(user.phone || ''));
    setEditShift(user.shift);
    setEditBadge(user.performance_badge);
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!phoneIsEmpty(editPhone) && !phoneIsComplete(editPhone)) {
      alert('Téléphone incomplet. Format : 261 34 12 345 67');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      alert('Le mot de passe doit avoir au moins 6 caractères.');
      return;
    }

    if (editPassword) {
      const pw = await db.setPassword(editingUser.id, editPassword);
      if (!pw.success) {
        alert(pw.error || 'Mot de passe non modifié.');
        return;
      }
    }

    db.updateUser(editingUser.id, {
      name: editName,
      phone: phoneIsEmpty(editPhone) ? '' : editPhone,
      shift: editShift,
      performance_badge: editBadge,
    });

    setEditingUser(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    if (!newUsername.trim()) {
      setAddUserError('Identifiant manquant.');
      return;
    }
    if (!newPassword) {
      setAddUserError('Mot de passe manquant.');
      return;
    }
    if (newPassword.length < 6) {
      setAddUserError('Le mot de passe doit avoir au moins 6 caractères.');
      return;
    }
    if (!newName.trim()) {
      setAddUserError('Nom complet manquant.');
      return;
    }
    if (!phoneIsEmpty(newPhone) && !phoneIsComplete(newPhone)) {
      setAddUserError('Téléphone incomplet. Format : 261 34 12 345 67');
      return;
    }

    const created = await db.addUser({
      username: newUsername.toLowerCase().trim(),
      name: newName.trim(),
      phone: phoneIsEmpty(newPhone) ? '' : newPhone.trim(),
      shift: newShift,
      role: 'employee',
      status: 'active',
      avatar_url: '',
      performance_badge: 'Standard',
    }, newPassword);

    if (!created.success) {
      setAddUserError(created.error || 'Création impossible.');
      return;
    }

    setShowAddModal(false);
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewPhone('261 ');
  };

  const handleOpenReviewAdvance = (adv: SalaryAdvanceRequest, approve: boolean) => {
    setReviewAdvanceModal({
      advanceId: adv.id,
      approve,
      amount: adv.amount_ar,
      employeeName: adv.employee_name,
    });
    setAdvanceNotes(approve ? 'Validé par l\'administrateur' : '');
  };

  const handleConfirmReviewAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAdvanceModal) return;
    if (!reviewAdvanceModal.approve && advanceNotes.trim().length < 3) return;
    db.reviewAdvanceRequest(reviewAdvanceModal.advanceId, reviewAdvanceModal.approve, advanceNotes.trim() || undefined);
    setReviewAdvanceModal(null);
  };

  // Filtered employees
  const employees = users
    .filter(u => u.role === 'employee')
    .filter(u => {
      if (shiftFilter === 'day') return u.shift === 'day' && u.status !== 'blocked';
      if (shiftFilter === 'night') return u.shift === 'night' && u.status !== 'blocked';
      if (shiftFilter === 'blocked') return u.status === 'blocked';
      return true;
    })
    .filter(u => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });

  const pendingAdvances = advances.filter(a => a.status === 'pending');

  return (
    <div className="space-y-4 sm:space-y-3 max-w-none mx-auto px-1.5 sm:px-3 lg:px-4 py-4 sm:py-6">
      
      {section === 'employees' && (
        <>
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f1722] p-4 sm:p-6 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-tactical text-white">
              Gestion de l'Équipe &amp; Opérateurs Boosters
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Affectation des shifts, consultation des profils, badges de performance et surveillance des accès.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-tactical font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Booster</span>
        </button>
      </div>

      {/* FILTER BAR: Shift Selector & Live Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#131c28] p-3 rounded-xl border border-slate-800 text-xs font-mono">
        {/* Shift Filter buttons with horizontal scroll on mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setShiftFilter('all')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              shiftFilter === 'all'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({users.filter(u => u.role === 'employee').length})
          </button>
          <button
            onClick={() => setShiftFilter('day')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              shiftFilter === 'day'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Day Shift ({users.filter(u => u.role === 'employee' && u.shift === 'day' && u.status !== 'blocked').length})
          </button>
          <button
            onClick={() => setShiftFilter('night')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              shiftFilter === 'night'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Night Shift ({users.filter(u => u.role === 'employee' && u.shift === 'night' && u.status !== 'blocked').length})
          </button>
          <button
            onClick={() => setShiftFilter('blocked')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              shiftFilter === 'blocked'
                ? 'bg-red-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ban className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Bloqués ({users.filter(u => u.role === 'employee' && u.status === 'blocked').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Filtrer par nom / pseudo..."
            className="w-full bg-[#0b1018] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono"
          />
        </div>
      </div>

      {/* EMPLOYEES TABLE WITH HORIZONTAL SCROLL SAFEGUARD */}
      <div className="bg-[#0f1722] border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="sm:hidden px-3 py-1.5 bg-[#121c27] border-b border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>Défiler horizontalement →</span>
          <span className="text-emerald-400">{employees.length} opérateur(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs font-mono text-slate-300">
            <thead className="bg-[#121c27] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 pl-4 sm:pl-6">Opérateur Booster</th>
                <th className="p-3">Shift Assigné</th>
                <th className="p-3">Badge Performance</th>
                <th className="p-3">Score Total</th>
                <th className="p-3">Payroll Cumulé</th>
                <th className="p-3">Statut Système</th>
                <th className="p-3 pr-4 sm:pr-6 text-right">Actions Opérationnelles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Aucun employé ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const isBlocked = emp.status === 'blocked';

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-[#141f2d] transition-colors ${
                        isBlocked ? 'bg-red-950/20' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="p-3 pl-4 sm:pl-6">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar src={emp.avatar_url} name={emp.name} className="w-8 h-8 sm:w-9 sm:h-9" />
                            <span
                              className={`absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-slate-900 ${
                                emp.is_online ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm">
                              {emp.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              @{emp.username} · {emp.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${
                            emp.shift === 'day'
                              ? 'bg-amber-950/70 border-amber-600/40 text-amber-300'
                              : 'bg-indigo-950/70 border-indigo-600/40 text-indigo-300'
                          }`}
                        >
                          {emp.shift === 'day' ? (
                            <span className="inline-flex items-center gap-1"><Sun className="w-3.5 h-3.5" />Shift Jour (08-18)</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Moon className="w-3.5 h-3.5" />Shift Nuit (20-06)</span>
                          )}
                        </span>
                      </td>

                      {/* Performance Badge */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${
                            emp.performance_badge === 'Top Booster'
                              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                              : emp.performance_badge === 'Elite'
                              ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                              : emp.performance_badge === 'Under Watch'
                              ? 'bg-red-950/80 border-red-500/50 text-red-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {emp.performance_badge}
                        </span>
                      </td>

                      {/* Total Boosted Score */}
                      <td className="p-3 text-emerald-400 font-bold whitespace-nowrap">
                        {formatScoreM(emp.total_score_boosted)} pts
                      </td>

                      {/* Total Earnings Ar */}
                      <td className="p-3 text-amber-400 font-bold whitespace-nowrap">
                        {emp.total_earnings_ar.toLocaleString()} Ar
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isBlocked
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {isBlocked ? 'Compte Bloqué' : 'Actif'}
                        </span>
                      </td>

                      {/* Profile Actions: [ View CV ], [ Edit Info ], [ Block/Unblock ], [ Delete Profile ] */}
                      <td className="p-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View CV button */}
                          <button
                            onClick={() => onOpenEmployeeCV(emp)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded transition-colors"
                            title="Voir le profil"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Info button */}
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                            title="Modifier les informations"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Block/Unblock button */}
                          <button
                            onClick={() =>
                              askConfirm({
                                title: isBlocked ? `Débloquer ${emp.name} ?` : `Bloquer ${emp.name} ?`,
                                message: isBlocked
                                  ? "L'employé pourra de nouveau se connecter."
                                  : "L'employé ne pourra plus se connecter tant qu'il est bloqué.",
                                confirmLabel: isBlocked ? 'Débloquer' : 'Bloquer',
                                danger: !isBlocked,
                                onConfirm: () => handleToggleBlock(emp.id),
                              })
                            }
                            className={`p-1.5 rounded transition-colors ${
                              isBlocked
                                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                                : 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700'
                            }`}
                            title={isBlocked ? 'Débloquer l\'accès' : 'Bloquer le compte'}
                          >
                            {isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Profile button with confirmation prompt */}
                          <button
                            onClick={() => handleDeleteUser(emp)}
                            className="p-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded transition-colors"
                            title="Supprimer définitivement le profil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

        </>
      )}

      {section === 'advances' && (
        <>
      {/* SECTION: SALARY ADVANCE APPROVALS (DMD d'avance) */}
      <div id="advances-section" className="bg-[#0f1722] border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl">
        <h3 className="font-tactical font-bold text-white text-base flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-amber-400" />
          Demandes d'Avances sur Salaire en Attente ({pendingAdvances.length})
        </h3>
        <p className="text-xs text-slate-400 font-mono mb-4">
          Validation des avances demandées par les boosters ("DMD d'avance").
        </p>

        {pendingAdvances.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-lg">
            Aucune demande d'avance en attente d'approbation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAdvances.map(adv => (
              <div
                key={adv.id}
                className="bg-[#121c27] p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-3 text-xs font-mono"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{adv.employee_name}</span>
                    <span className="text-base font-bold text-amber-400">{adv.amount_ar.toLocaleString()} Ar</span>
                  </div>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Motif: {adv.reason}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Date demande: {adv.request_date}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenReviewAdvance(adv, false)}
                    className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Refuser</span>
                  </button>
                  <button
                    onClick={() => handleOpenReviewAdvance(adv, true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approuver l'Avance</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

        </>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0f1722] border border-slate-700 w-full max-w-md rounded-xl p-5 sm:p-6 space-y-4 text-xs font-mono shadow-2xl my-6">
            <h3 className="font-tactical font-bold text-white text-base">
              Modifier Opérateur: {editingUser.name}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Nom Complet</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Téléphone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="261 34 12 345 67"
                  value={editPhone}
                  onChange={e => setEditPhone(formatPhone(e.target.value))}
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Nouveau mot de passe (optionnel)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  minLength={6}
                  autoComplete="off"
                  placeholder="laisser vide = inchangé"
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Shift Assigné</label>
                <select
                  value={editShift}
                  onChange={e => setEditShift(e.target.value as ShiftType)}
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="day"> Shift Jour (08h00 - 18h00)</option>
                  <option value="night"> Shift Nuit (20h00 - 06h00)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Badge de Performance</label>
                <select
                  value={editBadge}
                  onChange={e => setEditBadge(e.target.value as any)}
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Top Booster">Top Booster</option>
                  <option value="Elite">Elite</option>
                  <option value="Standard">Standard</option>
                  <option value="Under Watch">Under Watch</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0f1722] border border-slate-700 w-full max-w-md rounded-xl p-5 sm:p-6 space-y-4 text-xs font-mono shadow-2xl my-6">
            <h3 className="font-tactical font-bold text-white text-base">
              Enregistrer un Nouvel Opérateur Booster
            </h3>

            {addUserError && (
              <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 rounded-lg text-xs font-mono">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Identifiant Unique (Username)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  required
                  placeholder="ex: faniry_df"
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Mot de passe (6 caractères min.)</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  autoComplete="off"
                  placeholder="à communiquer à l'employé"
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Nom Complet</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="ex: Faniry Rakoto"
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Téléphone de Contact</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="261 34 12 345 67"
                  value={newPhone}
                  onChange={e => setNewPhone(formatPhone(e.target.value))}
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Shift Initial</label>
                <select
                  value={newShift}
                  onChange={e => setNewShift(e.target.value as ShiftType)}
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="day"> Day Shift (08h00 - 18h00)</option>
                  <option value="night"> Night Shift (20h00 - 06h00)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded"
                >
                  Créer le Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW ADVANCE MODAL (No prompt() for iframe compatibility) */}
      {reviewAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#0f1722] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {reviewAdvanceModal.approve ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <h3 className="font-tactical font-black text-white text-base">
                  {reviewAdvanceModal.approve ? 'Approuver l\'Avance' : 'Refuser la Demande'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewAdvanceModal(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#141e2a] p-3 rounded-xl border border-slate-800 text-xs font-mono">
              <div className="text-slate-400">Opérateur : <strong className="text-white">{reviewAdvanceModal.employeeName}</strong></div>
              <div className="text-slate-400 mt-1">Montant : <strong className="text-amber-400">{reviewAdvanceModal.amount.toLocaleString()} Ar</strong></div>
            </div>

            <form onSubmit={handleConfirmReviewAdvance} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 uppercase mb-1 font-semibold">
                  {reviewAdvanceModal.approve ? 'Note de validation (optionnel)' : 'Motif de refus (obligatoire)'}
                </label>
                <textarea
                  rows={3}
                  value={advanceNotes}
                  onChange={e => setAdvanceNotes(e.target.value)}
                  required={!reviewAdvanceModal.approve}
                  placeholder={reviewAdvanceModal.approve ? 'Ajouter une note...' : 'Écris la raison du refus'}
                  minLength={reviewAdvanceModal.approve ? undefined : 3}
                  className="w-full bg-[#141e2a] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewAdvanceModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-tactical font-bold text-xs uppercase tracking-wider rounded-xl text-white cursor-pointer shadow ${
                    reviewAdvanceModal.approve
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {reviewAdvanceModal.approve ? 'Confirmer l\'Approbation' : 'Confirmer le Refus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Circle,
  FlaskConical,
  Clock,
  TrendingUp,
  User as UserIcon,
  Info
} from 'lucide-react';
import { User, PostSession, DayStatus } from '../types';
import { db } from '../db/store';
import { formatScoreM } from '../utils/formatUtils';

interface CalendarViewProps {
  currentUser: User | null;
  onSelectDay: (dateStr: string, shifts: PostSession[]) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentUser,
  onSelectDay,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 is September (0-indexed)
  const [selectedBoosterId, setSelectedBoosterId] = useState<string>(
    currentUser?.role === 'employee' ? currentUser.id : 'all'
  );

  const [posts, setPosts] = useState<PostSession[]>(db.getPosts());
  const [users, setUsers] = useState<User[]>(db.getUsers());

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setPosts(db.getPosts());
      setUsers(db.getUsers());
    });
    return unsubscribe;
  }, []);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysOfWeek = [
    { full: 'Lundi', short: 'Lun', mini: 'L' },
    { full: 'Mardi', short: 'Mar', mini: 'M' },
    { full: 'Mercredi', short: 'Mer', mini: 'M' },
    { full: 'Jeudi', short: 'Jeu', mini: 'J' },
    { full: 'Vendredi', short: 'Ven', mini: 'V' },
    { full: 'Samedi', short: 'Sam', mini: 'S' },
    { full: 'Dimanche', short: 'Dim', mini: 'D' },
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Filter posts based on selected booster
  const filteredPosts = posts.filter(p => {
    if (selectedBoosterId === 'all') return true;
    return p.employee_id === selectedBoosterId;
  });

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Day of week index for Monday = 0: (day + 6) % 7
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Compute status for a specific date
  const computeDayData = (dayNumber: number) => {
    const dayStr = dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
    const monthStr = (currentMonth + 1) < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const shiftsOnDay = filteredPosts.filter(p => p.date === dateStr);

    let status: DayStatus = 'no_post';

    if (shiftsOnDay.length > 0) {
      const hasInProgress = shiftsOnDay.some(
        s => s.status === 'active' || s.status === 'pending_start' || s.status === 'pending_end'
      );
      const isTestSession = shiftsOnDay.some(
        s => s.client_name.toLowerCase().includes('test') || s.account_tag.toLowerCase().includes('qa')
      );
      const allCompleted = shiftsOnDay.every(s => s.status === 'completed');
      const hasObjectiveReached = shiftsOnDay.some(
        s => (s.final_score ?? s.current_score) >= s.target_score
      );

      if (isTestSession) {
        status = 'test';
      } else if (hasInProgress) {
        status = 'in_progress';
      } else if (hasObjectiveReached || allCompleted) {
        status = 'objective_reached';
      } else {
        status = 'absent';
      }
    } else {
      // Mark specific absent demo day
      const dayDate = new Date(currentYear, currentMonth, dayNumber);
      const isPast = dayDate < new Date('2026-09-29');
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      if (isPast && !isWeekend && selectedBoosterId !== 'all') {
        if (dayNumber === 18) status = 'absent';
        else status = 'no_post';
      } else {
        status = 'no_post';
      }
    }

    const totalScoreGained = shiftsOnDay.reduce((acc, s) => {
      const final = s.final_score ?? s.current_score;
      return acc + Math.max(0, final - s.initial_score);
    }, 0);

    return {
      dateStr,
      shiftsOnDay,
      status,
      totalScoreGained,
    };
  };

  const formatScoreConcise = (pts: number) => {
    if (pts >= 1000000) return `+${(pts / 1000000).toFixed(1)}M`;
    if (pts >= 1000) return `+${(pts / 1000).toFixed(0)}k`;
    return `+${pts}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      
      {/* Calendar Header Card */}
      <div className="bg-[#0f1722] border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-tactical text-white">
              {currentUser?.role === 'admin' ? 'Calendrier Mensuel Opérationnel' : 'Mon Calendrier de Missions'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Cliquez sur un jour pour ouvrir le rapport granulaire avec photos et timestamps.
          </p>
        </div>

        {/* Controls: Booster Selector & Month Navigator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-1.5 bg-[#141e2a] px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono">
              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedBoosterId}
                onChange={e => setSelectedBoosterId(e.target.value)}
                className="bg-transparent text-white focus:outline-none max-w-[150px] sm:max-w-none truncate"
              >
                <option value="all" className="bg-[#0f1722]">Tous les Boosters</option>
                {users.filter(u => u.role === 'employee').map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0f1722]">
                    {u.name} (Shift {u.shift.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Stepper */}
          <div className="flex items-center bg-[#141e2a] rounded-lg border border-slate-700 p-1 text-xs font-mono">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
              title="Mois Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 sm:px-3 font-bold text-white min-w-[120px] sm:min-w-[140px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
              title="Mois Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend / Status Badges Bar (Fully Responsive) */}
      <div className="bg-[#121a24] p-3 sm:p-3.5 rounded-xl border border-slate-800 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-slate-400 uppercase text-[10px] sm:text-[11px] font-bold">
            Indicateurs Visuels:
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span>✅</span>
              <span>Objectif Atteint</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span>⏳</span>
              <span>En Cours</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <span>🧪</span>
              <span>Test / QA</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <span>❌</span>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 col-span-2 sm:col-span-1">
              <span>⚪</span>
              <span>Pas de Poste</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Grid View */}
      <div className="bg-[#0f1722] border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-[#121c27] text-center text-[10px] sm:text-xs font-mono uppercase text-slate-400 font-bold py-2 sm:py-2.5">
          {daysOfWeek.map(d => (
            <div key={d.full} className="p-0.5 sm:p-1">
              <span className="sm:hidden">{d.short}</span>
              <span className="hidden sm:inline">{d.short}</span>
            </div>
          ))}
        </div>

        {/* Days Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/80 bg-[#0d141d]">
          {/* Empty cells before start of month */}
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[105px] p-1.5 sm:p-2 bg-slate-950/40 opacity-30" />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayData = computeDayData(dayNum);
            const isToday = dayNum === 29 && currentMonth === 8 && currentYear === 2026;

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => onSelectDay(dayData.dateStr, dayData.shiftsOnDay)}
                className={`min-h-[64px] sm:min-h-[105px] p-1 sm:p-2.5 transition-all cursor-pointer relative group hover:bg-[#15202d] flex flex-col justify-between ${
                  isToday ? 'ring-1 ring-emerald-500/70 bg-[#121c27]' : ''
                }`}
              >
                {/* Day Number & Status Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-bold rounded px-1 sm:px-1.5 py-0.2 sm:py-0.5 ${
                      isToday
                        ? 'bg-emerald-500 text-black font-black'
                        : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Status Indicator Icon */}
                  <div className="text-[11px] sm:text-sm">
                    {dayData.status === 'objective_reached' && <span title="Objectif Reached">✅</span>}
                    {dayData.status === 'in_progress' && <span title="En cours" className="animate-pulse">⏳</span>}
                    {dayData.status === 'test' && <span title="Test">🧪</span>}
                    {dayData.status === 'absent' && <span title="Absent">❌</span>}
                    {dayData.status === 'no_post' && <span title="Pas de poste" className="opacity-30">⚪</span>}
                  </div>
                </div>

                {/* Day Content / Shift Preview */}
                <div className="mt-1 space-y-0.5">
                  {dayData.shiftsOnDay.length > 0 ? (
                    <>
                      {/* Mobile view: compact badge */}
                      <div className="sm:hidden text-center">
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 font-bold block truncate">
                          {dayData.shiftsOnDay.length} shift
                        </span>
                        {dayData.totalScoreGained > 0 && (
                          <span className="text-[8px] font-mono text-cyan-300 font-bold block truncate mt-0.5">
                            {formatScoreConcise(dayData.totalScoreGained)}
                          </span>
                        )}
                      </div>

                      {/* Desktop view: full badges */}
                      <div className="hidden sm:block space-y-1">
                        <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 truncate font-semibold">
                          {dayData.shiftsOnDay.length} shift(s)
                        </div>
                        {dayData.totalScoreGained > 0 && (
                          <div className="text-[9px] font-mono text-cyan-300 font-bold truncate">
                            +{formatScoreM(dayData.totalScoreGained)} pts
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-[8px] sm:text-[9px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors text-center sm:text-left">
                      {dayData.status === 'absent' ? 'Absent' : ''}
                    </div>
                  )}
                </div>

                {/* Hover Click Hint (Desktop only) */}
                <div className="hidden sm:block text-[8px] font-mono text-center text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Détails →
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

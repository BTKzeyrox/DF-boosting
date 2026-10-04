import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Search,
  UserCheck,
  Calendar,
  LogOut,
  Clock,
  Radio,
  Gamepad2,
  FileText,
  DollarSign,
  MessageSquare,
  Users,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { User, SearchResultItem } from '../types';
import { db } from '../db/store';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onOpenEmployeeCV?: (employee: User) => void;
  onOpenCalendarDate?: (dateStr: string) => void;
  onSelectClientPost?: (clientName: string) => void;
  onOpenPosterLightbox?: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenEmployeeCV,
  onOpenCalendarDate,
  onSelectClientPost,
  onOpenPosterLightbox,
  activeView,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Intelligent Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResultItem[] = [];
    const users = db.getUsers();
    const posts = db.getPosts();

    // 1. Search Employees
    users.forEach(u => {
      if (
        u.name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query)
      ) {
        results.push({
          id: `search-user-${u.id}`,
          title: u.name,
          subtitle: `Booster (${u.shift.toUpperCase()}) · ${u.status === 'blocked' ? 'BLOQUÉ' : 'Actif'}`,
          category: 'employee',
          employeeId: u.id,
        });
      }
    });

    // 2. Search Dates (DD/MM)
    const uniqueDates = Array.from(new Set(posts.map(p => p.date)));
    uniqueDates.forEach(d => {
      const [year, month, day] = d.split('-');
      const ddmm = `${day}/${month}`;
      if (ddmm.includes(query) || d.includes(query)) {
        const count = posts.filter(p => p.date === d).length;
        results.push({
          id: `search-date-${d}`,
          title: `Date: ${ddmm}/${year}`,
          subtitle: `${count} session(s) enregistrées`,
          category: 'date',
          dateStr: d,
        });
      }
    });

    // 3. Search Clients
    const seen = new Set<string>();
    posts.forEach(p => {
      if (
        (p.client_name.toLowerCase().includes(query) || p.account_tag.toLowerCase().includes(query)) &&
        !seen.has(p.client_name)
      ) {
        seen.add(p.client_name);
        results.push({
          id: `search-client-${p.id}`,
          title: `Client: ${p.client_name}`,
          subtitle: `Booster: ${p.employee_name} · Statut: ${p.status}`,
          category: 'client',
          clientName: p.client_name,
        });
      }
    });

    setSearchResults(results.slice(0, 6));
  }, [searchQuery]);

  const handleSelectResult = (item: SearchResultItem) => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setSearchQuery('');

    if (item.category === 'employee' && item.employeeId) {
      const u = db.getUsers().find(usr => usr.id === item.employeeId);
      if (u && onOpenEmployeeCV) {
        onOpenEmployeeCV(u);
      }
      if (currentUser.role === 'admin') {
        onNavigate('employees');
      }
    } else if (item.category === 'date' && item.dateStr && onOpenCalendarDate) {
      onOpenCalendarDate(item.dateStr);
    } else if (item.category === 'client' && item.clientName && onSelectClientPost) {
      onSelectClientPost(item.clientName);
    }
  };

  const isAdmin = currentUser.role === 'admin';
  const securityLogs = db.getSecurityLogs();
  const unreadViolations = securityLogs.filter(l => !l.resolved);

  return (
    <header className="sticky top-0 z-40 bg-[#0b1118]/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-none mx-auto px-1.5 sm:px-3 lg:px-4">
        <div className="h-16 flex items-center justify-between gap-3">
          
          {/* Brand & Role Tag */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold border ${
              isAdmin
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-tactical font-black text-base sm:text-lg tracking-wider text-white">
                  DELTA FORCE
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                  isAdmin
                    ? 'bg-amber-950/80 border-amber-600/50 text-amber-300'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                }`}>
                  {isAdmin ? 'Espace Admin' : `Booster (${currentUser.shift.toUpperCase()})`}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                {isAdmin ? 'Centre de Contrôle Opérationnel' : `Connecté en tant que ${currentUser.name}`}
              </p>
            </div>
          </div>

          {/* DESKTOP NAVIGATION MENU (Admin vs Employee) */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#121a24] p-1.5 rounded-xl border border-slate-700/80 text-xs font-mono">
            {isAdmin ? (
              /* ADMIN PAGES NAVIGATION */
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'dashboard'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Tableau de Bord</span>
                </button>

                <button
                  onClick={() => onNavigate('employees')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'employees'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Gestion des Employés</span>
                </button>

                <button
                  onClick={() => onNavigate('calendar')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'calendar'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Calendrier</span>
                </button>

                <button
                  onClick={() => onOpenPosterLightbox ? onOpenPosterLightbox() : onNavigate('poster')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'poster'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Afficher l'affiche officielle Delta Force"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Affiche Officielle</span>
                </button>
              </>
            ) : (
              /* EMPLOYEE PAGES NAVIGATION */
              <>
                <button
                  onClick={() => onNavigate('grid')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'grid' || activeView === 'dashboard'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <span>Accueil &amp; Postes (Grille)</span>
                </button>

                <button
                  onClick={() => onNavigate('active-post')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'active-post'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Mon Poste Actif</span>
                </button>

                <button
                  onClick={() => onNavigate('advances')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'advances'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>DMD d'Avance</span>
                </button>

                <button
                  onClick={() => onNavigate('chat')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'chat'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Chat Admin (Illimité)</span>
                </button>

                <button
                  onClick={() => onNavigate('calendar')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'calendar'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Mon Calendrier</span>
                </button>

                <button
                  onClick={() => onOpenPosterLightbox ? onOpenPosterLightbox() : onNavigate('poster')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeView === 'poster'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Afficher l'affiche officielle Delta Force"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Affiche HD</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Tools: Search / Alert / Logout */}
          <div className="flex items-center gap-2">
            
            {/* Search Input (Desktop) */}
            <div ref={searchRef} className="relative hidden md:block w-48 xl:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Recherche..."
                className="w-full bg-[#131d28] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
              />

              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1722] border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
                  {searchResults.map(res => (
                    <button
                      key={res.id}
                      onClick={() => handleSelectResult(res)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-xs border-b border-slate-800 last:border-0"
                    >
                      <span className="font-semibold text-white truncate">{res.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Security Alerts (Admin only) */}
            {isAdmin && unreadViolations.length > 0 && (
              <button
                onClick={() => onNavigate('dashboard')}
                title="Alertes de sécurité"
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-red-950/80 border border-red-600 text-red-300 rounded-lg text-xs font-mono flex items-center gap-1 animate-radar-alert"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>{unreadViolations.length}</span>
              </button>
            )}

            {/* Logout Button (Direct & Simple) */}
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow"
              title="Déconnexion (retour à la page de login)"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 py-3 space-y-1 font-mono text-xs animate-in slide-in-from-top-2">
            {isAdmin ? (
              <>
                <button
                  onClick={() => {
                    onNavigate('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Tableau de Bord Admin</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('employees');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'employees' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Gestion des Employés</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('calendar');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'calendar' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Calendrier des Shifts</span>
                </button>
                <button
                  onClick={() => {
                    if (onOpenPosterLightbox) onOpenPosterLightbox();
                    else onNavigate('poster');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'poster' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Affiche Officielle HD</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onNavigate('grid');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'grid' || activeView === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <span>Accueil &amp; Postes Clients (Grille)</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('active-post');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'active-post' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Mon Poste Actif</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('advances');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'advances' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Demande d'Avance (DMD)</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('chat');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'chat' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Chat Admin (Illimité)</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('calendar');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'calendar' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Mon Calendrier</span>
                </button>
                <button
                  onClick={() => {
                    if (onOpenPosterLightbox) onOpenPosterLightbox();
                    else onNavigate('poster');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 ${
                    activeView === 'poster' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Affiche HD Delta Force</span>
                </button>
                {onOpenEmployeeCV && (
                  <button
                    onClick={() => {
                      onOpenEmployeeCV(currentUser);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-lg text-left flex items-center gap-2 text-slate-300 hover:bg-slate-800"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Mon CV / Dossier</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

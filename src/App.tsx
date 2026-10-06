import React, { useState, useEffect } from 'react';
import { User, PostSession } from './types';
import { db } from './db/store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WelcomeAnimation } from './components/WelcomeAnimation';
import { LoginView } from './views/LoginView';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { EmployeesManagement } from './views/admin/EmployeesManagement';
import { BoosterPage } from './views/admin/BoosterPage';
import { HistoryPage } from './views/admin/HistoryPage';
import { EmployeeDashboard } from './views/employee/EmployeeDashboard';
import { CalendarView } from './views/CalendarView';
import { SettingsView } from './views/admin/SettingsView';
import { ChatView } from './components/ChatView';
import { LightboxModal } from './components/LightboxModal';
import { CVViewerModal } from './components/CVViewerModal';
import { ProfilePhotoGate } from './components/ProfilePhotoGate';
import { ConfirmHost, askConfirm } from './components/ConfirmModal';
import { ReasonHost } from './components/ReasonModal';
import { setChineseMode } from './utils/zhTranslate';
import { DayDetailsModal } from './components/DayDetailsModal';
import { useApp } from './context/AppContext';
import { LogoutTransition } from './components/LogoutTransition';

export default function App() {
  const { theme, t, startLogoutAnimation, lang } = useApp();
  const isLight = theme === 'light';

  const [isReady, setIsReady] = useState(false);

  // Langue chinoise : traduit tous les textes affichés (aucun mot français ne reste)
  useEffect(() => {
    setChineseMode(lang === 'zh');
  }, [lang]);
  const [currentUser, setCurrentUser] = useState<User | null>(db.getCurrentUser());
  const [activeView, setActiveView] = useState<string>('grid');
  const [focusBoosterId, setFocusBoosterId] = useState<string | null>(null); // booster ouvert depuis la recherche
  const [isWelcomeAnimating, setIsWelcomeAnimating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Admin : peut jouer son propre rôle de booster, puis revenir en admin
  const [boosterMode, setBoosterMode] = useState(false);

  // Modals state
  const [lightboxParams, setLightboxParams] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    subtitle?: string;
    score?: number;
    clientTag?: string;
    operatorName?: string;
    timestamp?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });

  const [cvModalUser, setCvModalUser] = useState<User | null>(null);

  const [dayDetailsState, setDayDetailsState] = useState<{
    isOpen: boolean;
    dateStr: string | null;
    shifts: PostSession[];
  }>({
    isOpen: false,
    dateStr: null,
    shifts: [],
  });


  useEffect(() => {
    db.whenReady().then(() => {
      setCurrentUser(db.getCurrentUser());
      setIsReady(true);
    });
  }, []);

  // Sync state with db store
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      const user = db.getCurrentUser();
      setCurrentUser(user ? { ...user } : null);
    });
    return unsubscribe;
  }, []);

  // Update view upon login with Welcome animation
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsWelcomeAnimating(true);
    // Accueil d'abord : admin = vue générale, booster = grille des postes. Menu fermé.
    setActiveView(user.role === 'admin' ? 'dashboard' : 'grid');
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    setBoosterMode(false);
    db.logout();
    setCurrentUser(null);
    setIsWelcomeAnimating(false);
    setActiveView('login');
  };

  // Déconnexion avec confirmation
  const requestLogout = () => {
    askConfirm({
      title: 'Se déconnecter ?',
      message: 'Vous devrez vous reconnecter avec votre pseudo et votre mot de passe.',
      confirmLabel: 'Se déconnecter',
      onConfirm: () => startLogoutAnimation(handleLogout),
    });
  };

  // Open Lightbox
  const handleOpenProofLightbox = (params: {
    imageUrl: string;
    title: string;
    subtitle?: string;
    score?: number;
    clientTag?: string;
    operatorName?: string;
    timestamp?: string;
  }) => {
    setLightboxParams({
      isOpen: true,
      imageUrl: params.imageUrl,
      title: params.title,
      subtitle: params.subtitle,
      score: params.score,
      clientTag: params.clientTag,
      operatorName: params.operatorName,
      timestamp: params.timestamp,
    });
  };

  // Open CV
  const handleOpenEmployeeCV = (employee: User) => {
    setCvModalUser(employee);
  };

  // Open Calendar Day Modal
  const handleSelectDay = (dateStr: string, shifts: PostSession[]) => {
    setDayDetailsState({
      isOpen: true,
      dateStr,
      shifts,
    });
  };

  // 1. NOT LOGGED IN -> SHOW ONLY LOGIN PAGE (SIMPLE, MODERN & INTUITIVE)
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm font-mono">
        Chargement…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`df-bg-login min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isLight
          ? 'text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-800'
          : 'text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300'
      }`}>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
        />
        <LightboxModal
          isOpen={lightboxParams.isOpen}
          onClose={() => setLightboxParams(prev => ({ ...prev, isOpen: false }))}
          imageUrl={lightboxParams.imageUrl}
          title={lightboxParams.title}
          subtitle={lightboxParams.subtitle}
          score={lightboxParams.score}
          clientTag={lightboxParams.clientTag}
          operatorName={lightboxParams.operatorName}
          timestamp={lightboxParams.timestamp}
        />
        <LogoutTransition />
      </div>
    );
  }

  // 2. WELCOME ANIMATION (UPON LOGIN)
  if (isWelcomeAnimating) {
    return (
      <WelcomeAnimation
        user={currentUser}
        onComplete={() => setIsWelcomeAnimating(false)}
      />
    );
  }

  // Utilisateur « vu » par l'interface : en mode booster, l'admin est traité comme un booster
  const realIsAdmin = currentUser.role === 'admin';
  const viewUser: User = realIsAdmin && boosterMode ? { ...currentUser, role: 'employee' } : currentUser;
  const toggleBoosterMode = () => {
    setBoosterMode(v => !v);
    setActiveView(boosterMode ? 'dashboard' : 'grid');
  };

  // 3. LOGGED IN -> MODERN SIDEBAR LAYOUT
  return (
    <div className={`df-bg-app min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isLight
        ? 'text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-800'
        : 'text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300'
    }`}>
      
      {/* Modern Tactical Sidebar */}
      <Sidebar
        currentUser={viewUser}
        canSwitchMode={realIsAdmin}
        boosterMode={boosterMode}
        onToggleBoosterMode={toggleBoosterMode}
        activeView={activeView}
        onNavigate={view => {
          if (view === 'profile') {
            setCvModalUser(currentUser);
            return;
          }
          setFocusBoosterId(null);
          setActiveView(view);
        }}
        onLogout={requestLogout}
        onOpenEmployeeCV={handleOpenEmployeeCV}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container with Sidebar offset */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        
        {/* Barre du haut fixe : recherche globale + cloche */}
        <TopBar
          currentUser={viewUser}
          onOpenMenu={() => setIsMobileSidebarOpen(true)}
          onNavigate={view => { setFocusBoosterId(null); setActiveView(view); }}
          onOpenBooster={id => { setFocusBoosterId(id); setActiveView('booster'); }}
        />

        {/* Dynamic Page Content Based on activeView */}
        <main className="flex-1 p-2 sm:p-3 lg:p-4 max-w-none w-full mx-auto">
          {viewUser.role === 'admin' ? (
            /* ================= ADMIN SEPARATED PAGES ================= */
            <>
              {activeView === 'settings' ? (
                <SettingsView />
              ) : activeView === 'employees' ? (
                <EmployeesManagement onOpenEmployeeCV={handleOpenEmployeeCV} />
              ) : activeView === 'advances' ? (
                <EmployeesManagement section="advances" onOpenEmployeeCV={handleOpenEmployeeCV} />
              ) : activeView === 'history' ? (
                <HistoryPage initialBoosterId={focusBoosterId || undefined} />
              ) : activeView === 'booster' && focusBoosterId ? (
                <BoosterPage
                  userId={focusBoosterId}
                  onBack={() => { setFocusBoosterId(null); setActiveView('dashboard'); }}
                  onGo={view => setActiveView(view)}
                  onOpenCV={handleOpenEmployeeCV}
                />
              ) : activeView === 'calendar' ? (
                <CalendarView
                  currentUser={viewUser}
                  onSelectDay={handleSelectDay}
                  initialUserId={focusBoosterId || undefined}
                />
              ) : activeView === 'chat' ? (
                <ChatView currentUser={viewUser} initialThreadId={focusBoosterId || undefined} />
              ) : (
                /* Default Admin Views: 'grid' (20 postes 2x10), 'active-post' (sessions), 'dashboard', 'security' */
                <AdminDashboard
                  currentUser={viewUser}
                  onOpenProofLightbox={handleOpenProofLightbox}
                  onOpenEmployeeCV={handleOpenEmployeeCV}
                  onNavigateToEmployees={() => setActiveView('employees')}
                  onNavigateToCalendar={() => setActiveView('calendar')}
                  activeSubTab={
                    activeView === 'grid'
                      ? 'dashboard'
                      : activeView === 'active-post' || activeView === 'sessions'
                      ? 'sessions'
                      : activeView === 'security'
                      ? 'security'
                      : activeView === 'validations'
                      ? 'validations'
                      : 'dashboard'
                  }
                  onNavigateTab={tab => setActiveView(tab)}
                />
              )}
            </>
          ) : (
            /* ================= EMPLOYEE SEPARATED PAGES ================= */
            <>
              {activeView === 'calendar' ? (
                <CalendarView
                  currentUser={viewUser}
                  onSelectDay={handleSelectDay}
                />
              ) : activeView === 'chat' ? (
                <ChatView currentUser={viewUser} />
              ) : (
                /* Employee Dashboard managing sub-pages: 'grid' (20 postes 2x10), 'active-post', 'advances', 'chat' */
                <EmployeeDashboard
                  currentUser={viewUser}
                  onOpenProofLightbox={handleOpenProofLightbox}
                  activeSubTab={
                    activeView === 'advances' || activeView === 'chat' || activeView === 'active-post'
                      ? (activeView as any)
                      : 'grid'
                  }
                  onNavigateTab={tab => setActiveView(tab)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* PHOTO DE PROFIL OBLIGATOIRE POUR LES EMPLOYÉS */}
      {currentUser && currentUser.role === 'employee' && !currentUser.avatar_url && (
        <ProfilePhotoGate
          user={currentUser}
          onDone={() => setCurrentUser(db.getCurrentUser())}
          onLogout={handleLogout}
        />
      )}

      {/* CONFIRMATIONS */}
      <ConfirmHost />
      <ReasonHost />

      {/* PROFILE MODAL */}
      <CVViewerModal
        isOpen={cvModalUser !== null}
        onClose={() => setCvModalUser(null)}
        user={cvModalUser}
      />

      {/* DETAILED DAY MODAL (Pop-up on Calendar Click) */}
      <DayDetailsModal
        isOpen={dayDetailsState.isOpen}
        dateStr={dayDetailsState.dateStr}
        onClose={() => setDayDetailsState(prev => ({ ...prev, isOpen: false }))}
        onBack={() => setDayDetailsState(prev => ({ ...prev, isOpen: false }))}
        shifts={dayDetailsState.shifts}
        onOpenProofLightbox={handleOpenProofLightbox}
      />


      {/* LIGHTBOX MODAL - AT THE VERY BOTTOM SO IT OVERLAYS ALL OTHER MODALS WITHOUT CONFLICT */}
      <LightboxModal
        isOpen={lightboxParams.isOpen}
        onClose={() => setLightboxParams(prev => ({ ...prev, isOpen: false }))}
        imageUrl={lightboxParams.imageUrl}
        title={lightboxParams.title}
        subtitle={lightboxParams.subtitle}
        score={lightboxParams.score}
        clientTag={lightboxParams.clientTag}
        operatorName={lightboxParams.operatorName}
        timestamp={lightboxParams.timestamp}
      />

      {/* SMOOTH ANIMATED LOGOUT TRANSITION */}
      <LogoutTransition />
    </div>
  );
}

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User as UserIcon,
  AlertOctagon,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  Sparkles,
  Sun,
  Moon,
  Globe,
  Download
} from 'lucide-react';
import { db } from '../db/store';
import { User } from '../types';
import { generateDeltaForcePoster } from '../utils/imageUtils';
import { useApp } from '../context/AppContext';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onOpenSqlModal: () => void;
  onOpenPosterLightbox?: (posterUrl: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenSqlModal,
  onOpenPosterLightbox,
}) => {
  const { theme, toggleTheme, lang, setLang, t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isLight = theme === 'light';

  const officialPosterUrl = generateDeltaForcePoster({
    title: 'DELTA FORCE // HAWK OPS',
    season: 'SAISON COMPÉTITIVE 2026',
    subtitle: 'OPÉRATIONS TACTIQUES DE BOOSTING & SÉCURISATION',
  });

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg(lang === 'zh' ? '请输入操作员账号。' : 'Veuillez saisir votre identifiant opérateur.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = db.login(username.trim());
      setIsLoading(false);

      if (!result.success || !result.user) {
        setErrorMsg(result.error || (lang === 'zh' ? '身份验证失败' : "Erreur d'authentification"));
        return;
      }

      onLoginSuccess(result.user);
    }, 200);
  };

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setPassword('DeltaForce2026!');
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = db.login(uname);
      setIsLoading(false);
      if (!result.success || !result.user) {
        setErrorMsg(result.error || (lang === 'zh' ? '身份验证失败' : "Erreur d'authentification"));
        return;
      }
      onLoginSuccess(result.user);
    }, 150);
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between py-6 px-4 sm:px-8 max-w-6xl mx-auto w-full relative transition-colors ${
      isLight ? 'text-slate-900' : 'text-slate-100'
    }`}>
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-b relative z-10 ${
        isLight ? 'border-slate-200' : 'border-slate-800/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-0.5 shadow-lg flex items-center justify-center">
            <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${
              isLight ? 'bg-white' : 'bg-[#080d14]'
            }`}>
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div>
            <h1 className="font-tactical font-black text-lg sm:text-xl tracking-wider flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {t('brand_title')}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              }`}>
                {t('brand_version')}
              </span>
            </h1>
            <p className="text-xs opacity-60 font-mono">
              {t('brand_sub')}
            </p>
          </div>
        </div>

        {/* Controls: Theme Toggle + Language Switcher + SQL Status */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#0e1724] border-slate-700 text-slate-300 hover:bg-[#132032]'
            }`}
            title={isLight ? t('theme_switch_dark') : t('theme_switch_light')}
          >
            {isLight ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'zh' : 'fr')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#0e1724] border-slate-700 text-slate-300 hover:bg-[#132032]'
            }`}
            title="Changer de langue / 切换语言"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{lang === 'fr' ? '🇨🇳 中文' : '🇫🇷 FR'}</span>
          </button>

          {/* Cloud SQL Button */}
          <button
            onClick={onOpenSqlModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#0e1724] border-slate-700/80 text-slate-300 hover:text-emerald-300'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>PostgreSQL</span>
          </button>

          {/* Download ZIP Button */}
          <a
            href="/delta-force-boosting.zip"
            download="delta-force-boosting.zip"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 hover:text-white'
            }`}
            title="Télécharger l'archive ZIP du code source"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZIP</span>
          </a>
        </div>
      </header>

      {/* Main Center Area: Two Columns (Form + Poster Presentation) */}
      <div className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Modern Login Card */}
        <div className="lg:col-span-6 space-y-6">
          <div className={`border rounded-2xl p-6 sm:p-8 shadow-2xl transition-all relative overflow-hidden ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
              : 'bg-[#0b131e]/90 backdrop-blur-xl border-slate-700/80 text-white shadow-emerald-950/20'
          }`}>
            {/* Top Tactical Light Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

            <div className="mb-6">
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
              }`}>
                {t('login_operator')}
              </span>
              <h2 className="text-2xl font-tactical font-black tracking-wide mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                {t('login_title')}
              </h2>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono flex items-start gap-2.5 animate-in fade-in">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-semibold">{errorMsg}</div>
              </div>
            )}

            {/* Modern Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono opacity-80 font-semibold mb-1.5 uppercase">
                  {t('username_label')}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t('username_placeholder')}
                    className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        : 'bg-[#070c13] border-slate-700 text-white placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono opacity-80 font-semibold mb-1.5 uppercase">
                  {t('password_label')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        : 'bg-[#070c13] border-slate-700 text-white placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-tactical font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>{t('auth_in_progress')}</span>
                  </span>
                ) : (
                  <>
                    <span>{t('btn_connect')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick 1-Click Fast Accounts (For Easy Testing) */}
            <div className={`mt-5 pt-4 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
              <div className="text-[10px] font-mono opacity-60 uppercase font-semibold mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('quick_login_label')}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300'
                      : 'bg-[#080e16] hover:bg-amber-950/40 border-slate-700/80 hover:border-amber-500/50'
                  }`}
                >
                  <div className="text-[10px] font-tactical font-bold text-amber-500">
                    {t('role_admin')}
                  </div>
                  <div className="text-[9px] opacity-60 font-mono truncate">Eric</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('tojo')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300'
                      : 'bg-[#080e16] hover:bg-emerald-950/40 border-slate-700/80 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="text-[10px] font-tactical font-bold text-emerald-500">
                    {t('role_day')}
                  </div>
                  <div className="text-[9px] opacity-60 font-mono truncate">Tojo</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('rado')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 hover:bg-cyan-50 border-slate-200 hover:border-cyan-300'
                      : 'bg-[#080e16] hover:bg-cyan-950/40 border-slate-700/80 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-[10px] font-tactical font-bold text-cyan-500">
                    {t('role_night')}
                  </div>
                  <div className="text-[9px] opacity-60 font-mono truncate">Rado</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('malin')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 hover:bg-red-50 border-slate-200 hover:border-red-300'
                      : 'bg-[#080e16] hover:bg-red-950/40 border-slate-700/80 hover:border-red-500/50'
                  }`}
                >
                  <div className="text-[10px] font-tactical font-bold text-red-500">
                    {t('role_blocked')}
                  </div>
                  <div className="text-[9px] opacity-60 font-mono truncate">Sécurité</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tactical Poster Preview & Mission Rules */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`border rounded-2xl p-5 shadow-xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0b131e]/80 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                }`}>
                  {t('nav_poster')}
                </span>
                <h3 className="font-tactical font-black text-base tracking-wide mt-1 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {t('rate_rule')}
                </h3>
              </div>

              {onOpenPosterLightbox && (
                <button
                  onClick={() => onOpenPosterLightbox(officialPosterUrl)}
                  className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 text-xs font-mono font-bold rounded-lg border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Zoom HD</span>
                </button>
              )}
            </div>

            {/* Poster Thumbnail Clickable */}
            <div
              onClick={() => onOpenPosterLightbox && onOpenPosterLightbox(officialPosterUrl)}
              className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md cursor-pointer group bg-black max-h-[240px] flex items-center justify-center"
            >
              <img
                src={officialPosterUrl}
                alt="Delta Force Poster"
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Directives Summary with 1M Abbreviations */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080e16] border-slate-800'
              }`}>
                <span className="text-[10px] text-emerald-500 uppercase font-bold block">{t('pay_scale')}</span>
                <span className="font-bold text-sm">1M = 1 000 Ar</span>
              </div>

              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080d14] border-slate-800'
              }`}>
                <span className="text-[10px] text-amber-500 uppercase font-bold block">{t('matrix_badge')}</span>
                <span className="font-bold text-sm">20 Postes (2x10)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className={`py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono opacity-60 relative z-10 ${
        isLight ? 'border-slate-200' : 'border-slate-800/80'
      }`}>
        <div>Delta Force : Hawk Ops · 2026</div>
        <div>1M = 1 000 Ar · Cloud SQL PostgreSQL</div>
      </footer>
    </div>
  );
};

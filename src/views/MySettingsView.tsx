import React from 'react';
import { Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSoundPrefs } from '../utils/notifSound';

// Réglages personnels : gardés sur l'appareil, ils ne changent que l'écran de la personne (booster ou admin)
export const MySettingsView: React.FC = () => {
  const { theme, toggleTheme, lang, setLang, gridCols, setGridCols, fontScale, setFontScale, t } = useApp();
  const [sound, setSound] = useSoundPrefs();
  const light = theme === 'light';

  const card = `rounded-xl border p-4 ${light ? 'bg-white border-slate-300' : 'bg-[#0f1822] border-slate-700'}`;
  const title = `text-xs font-mono uppercase mb-3 ${light ? 'text-slate-600' : 'text-slate-300'}`;
  const btn = (on: boolean) =>
    `px-3 py-2 rounded-lg border text-sm font-mono cursor-pointer transition-colors ${
      on
        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
        : light
        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
        : 'bg-[#141e2a] text-slate-300 border-slate-600 hover:border-emerald-500/60'
    }`;

  const reset = () => {
    if (theme === 'light') toggleTheme();
    setLang('fr');
    setGridCols(0);
    setFontScale(100);
    setSound({ ...sound, on: true });
  };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-emerald-500" />
        <h1 className={`text-lg font-bold ${light ? 'text-slate-900' : 'text-white'}`}>{t('my_settings_title')}</h1>
      </div>
      <p className={`text-xs ${light ? 'text-slate-600' : 'text-slate-400'}`}>{t('my_settings_hint')}</p>

      <div className={card}>
        <div className={title}>{t('ms_theme')}</div>
        <div className="flex gap-2 flex-wrap">
          <button className={btn(theme === 'dark')} onClick={() => theme !== 'dark' && toggleTheme()}>🌙 {t('ms_theme_dark')}</button>
          <button className={btn(theme === 'light')} onClick={() => theme !== 'light' && toggleTheme()}>☀️ {t('ms_theme_light')}</button>
        </div>
      </div>

      <div className={card}>
        <div className={title}>{t('ms_lang')}</div>
        <div className="flex gap-2 flex-wrap">
          <button className={btn(lang === 'fr')} onClick={() => setLang('fr')}>Français</button>
          <button className={btn(lang === 'zh')} onClick={() => setLang('zh')}>中文</button>
        </div>
      </div>

      <div className={card}>
        <div className={title}>{t('ms_grid')}</div>
        <select
          value={gridCols}
          onChange={e => setGridCols(Number(e.target.value))}
          className={`w-full p-2.5 text-sm font-mono border focus:border-emerald-500 focus:outline-none ${
            light ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#141e2a] border-slate-600 text-white'
          }`}
        >
          <option value={0}>{t('ms_grid_auto')}</option>
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className={card}>
        <div className={title}>{t('ms_font')}</div>
        <div className="flex gap-2 flex-wrap">
          <button className={btn(fontScale === 100)} onClick={() => setFontScale(100)}>{t('ms_font_normal')}</button>
          <button className={btn(fontScale === 112)} onClick={() => setFontScale(112)}>{t('ms_font_large')}</button>
          <button className={btn(fontScale === 125)} onClick={() => setFontScale(125)}>{t('ms_font_xlarge')}</button>
        </div>
      </div>

      <div className={card}>
        <div className={title}>{t('ms_sound')}</div>
        <button className={btn(sound.on)} onClick={() => setSound({ ...sound, on: !sound.on })}>
          {sound.on ? '🔔 ' + t('ms_sound_on') : '🔕 ' + t('ms_sound_off')}
        </button>
      </div>

      <button className={btn(false)} onClick={reset}>{t('ms_reset')}</button>
    </div>
  );
};

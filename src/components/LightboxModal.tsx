import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { formatScoreM } from '../utils/formatUtils';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  score?: number;
  clientTag?: string;
  operatorName?: string;
  timestamp?: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Capture d\'écran de jeu - Delta Force',
  subtitle,
  score,
  clientTag,
  operatorName,
  timestamp,
}) => {
  const [scale, setScale] = useState(1);

  // Prevent background scroll bleed when lightbox is open
  useLockBodyScroll(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setScale(1);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div
      onClick={(e) => {
        // Close if clicking directly on the background overlay
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none overscroll-contain"
    >
      {/* ALWAYS VISIBLE FLOATING BACK BUTTON (TOP-LEFT) - NEVER HIDDEN, NEVER WRAPPED */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-[10000] flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 active:scale-95 text-white font-tactical font-black text-xs uppercase tracking-wider border-2 border-emerald-500 shadow-2xl transition-all cursor-pointer ring-4 ring-black/60"
        title="Retour à la page précédente (ESC)"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-bold">RETOUR</span>
      </button>

      {/* ALWAYS VISIBLE FLOATING CLOSE BUTTON (TOP-RIGHT) - NEVER HIDDEN, NEVER WRAPPED */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[10000] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-tactical font-black text-xs uppercase tracking-wider border-2 border-white/20 shadow-2xl transition-all cursor-pointer ring-4 ring-black/60"
        title="Fermer la vue (ESC)"
      >
        <X className="w-4 h-4 shrink-0" />
        <span className="font-bold">FERMER</span>
      </button>

      {/* 1. TOP HEADER BAR: Centered title and zoom controls */}
      <header className="w-full shrink-0 px-24 py-3 bg-[#0a111a]/90 border-b border-slate-800 flex items-center justify-between gap-3 z-50 shadow-2xl backdrop-blur-sm min-h-[58px]">
        {/* Center/Left Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-tactical text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Zoom controls & Download */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-[#101b28] border border-slate-700 rounded-lg p-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-300 min-w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors border-l border-slate-700 pl-1.5 cursor-pointer"
              title="100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={imageUrl}
            download="delta-force-proof.png"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Télécharger l'image"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* 2. MAIN IMAGE STAGE (Centered & Click to close on backdrop) */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex-1 w-full overflow-auto flex items-center justify-center p-3 sm:p-6"
      >
        <div
          className="transition-transform duration-150 ease-out origin-center max-w-full max-h-full flex items-center justify-center"
          style={{ transform: `scale(${scale})` }}
        >
          <img
            src={imageUrl}
            alt="Delta Force Screenshot Proof"
            className="max-h-[68vh] max-w-[92vw] object-contain rounded-xl shadow-2xl border border-slate-700/80 cursor-zoom-out"
            onClick={(e) => {
              // Clicking the image itself toggles zoom or keeps open
              e.stopPropagation();
            }}
          />
        </div>
      </div>

      {/* FLOATING BOTTOM RETOUR PILL - CLEAR EXIT POINT */}
      <div className="fixed bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 z-[10000]">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 active:scale-95 text-white font-tactical font-bold text-xs uppercase tracking-wider border border-emerald-500/80 shadow-2xl transition-all cursor-pointer ring-4 ring-black/70 hover:border-emerald-400"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>RETOUR À LA MISSION (OU TOUCHE ÉCHAP)</span>
        </button>
      </div>

      {/* 3. BOTTOM METADATA HUD: Score in Millions with 'M' */}
      {(score !== undefined || clientTag || operatorName || timestamp) && (
        <footer className="w-full shrink-0 px-4 py-2.5 bg-[#0a111a]/95 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-mono text-slate-300 z-40">
          {operatorName && (
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Opérateur</span>
              <span className="text-white font-semibold">{operatorName}</span>
            </div>
          )}
          {clientTag && (
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Compte Client</span>
              <span className="text-cyan-400 font-semibold">{clientTag}</span>
            </div>
          )}
          {score !== undefined && (
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Score Vérifié</span>
              <span className="text-emerald-400 font-bold font-mono-numbers">
                {formatScoreM(score)} pts
              </span>
            </div>
          )}
          {timestamp && (
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Horodatage</span>
              <span className="text-slate-400">{timestamp}</span>
            </div>
          )}
        </footer>
      )}
    </div>
  );
};

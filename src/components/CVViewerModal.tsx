import React, { useRef, useState } from 'react';
import { X, Camera, Image as ImageIcon, Sun, Moon, Phone } from 'lucide-react';
import { User } from '../types';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { db } from '../db/store';
import { Avatar } from './Avatar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

// Fenêtre « Profil » : photo, nom, shift, téléphone (plus de CV ni de pièce d'identité)
export const CVViewerModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  useLockBodyScroll(isOpen);
  const [, force] = useState(0);
  const [error, setError] = useState('');
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const me = db.getCurrentUser();
  const live = db.getUsers().find(u => u.id === user.id) || user;
  const canEdit = !!me && (me.id === live.id || me.role === 'admin');

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const url = await compressImageToDataUrl(file);
      db.updateUser(live.id, { avatar_url: url });
      force(n => n + 1);
    } catch {
      setError('Impossible de lire cette image.');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#0d1624] border border-slate-700 p-5 space-y-4 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-tactical font-bold text-lg">Profil</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Avatar src={live.avatar_url} name={live.name} className="w-32 h-32 text-3xl" />
          <div className="text-center">
            <div className="font-bold text-base">{live.name}</div>
            <div className="text-xs text-slate-400">@{live.username}</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {live.role === 'employee' && (
            <div className="flex items-center gap-2 text-slate-300">
              {live.shift === 'day' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
              {live.shift === 'day' ? 'Shift Jour (08-18)' : 'Shift Nuit (20-06)'}
            </div>
          )}
          {live.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-cyan-400" />
              {live.phone}
            </div>
          )}
        </div>

        {canEdit && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                className="flex items-center justify-center gap-2 px-2 py-2.5 bg-[#141e2a] hover:bg-[#1b2f44] border border-slate-600 text-sm font-semibold text-center leading-tight"
              >
                <Camera className="w-4 h-4 shrink-0" /> Prendre une photo
              </button>
              <button
                type="button"
                onClick={() => galRef.current?.click()}
                className="flex items-center justify-center gap-2 px-2 py-2.5 bg-[#141e2a] hover:bg-[#1b2f44] border border-slate-600 text-sm font-semibold text-center leading-tight"
              >
                <ImageIcon className="w-4 h-4 shrink-0" /> Changer la photo
              </button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={pick} />
            <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          </>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    </div>
  );
};

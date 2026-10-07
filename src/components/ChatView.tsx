import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Paperclip, FileText, Users, MessageSquare, ArrowLeft } from 'lucide-react';
import { db } from '../db/store';
import { ChatMessage, User } from '../types';
import { compressProofImage } from '../utils/imageUtils';
import { Avatar } from './Avatar';
import { markChatSeen } from '../utils/notifications';

const MAX_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Lecture impossible'));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });

// Un « fil » = le groupe général (tous + admin) ou une conversation privée admin ↔ booster
type Thread = { id: string; title: string; subtitle: string; user?: User };

export const ChatView: React.FC<{ currentUser: User; initialThreadId?: string }> = ({ currentUser, initialThreadId }) => {
  const isAdmin = currentUser.role === 'admin';
  const [messages, setMessages] = useState<ChatMessage[]>(db.getMessages());
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [threadId, setThreadId] = useState<string>(initialThreadId || 'all');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(true); // mobile : liste ou conversation
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setMessages(db.getMessages());
      setUsers(db.getUsers());
    });
    return unsub;
  }, []);

  const admin = users.find(u => u.role === 'admin');
  const adminId = admin?.id || 'user-admin-1';

  const threads: Thread[] = useMemo(() => {
    const list: Thread[] = [{ id: 'all', title: 'Groupe général', subtitle: 'Tous les boosters + admin' }];
    if (isAdmin) {
      users.filter(u => u.role === 'employee').forEach(u => list.push({ id: u.id, title: u.name, subtitle: `@${u.username}`, user: u }));
    } else {
      list.push({ id: adminId, title: admin?.name || 'Administrateur', subtitle: 'Conversation privée', user: admin });
    }
    return list;
  }, [users, isAdmin, adminId, admin]);

  const current = threads.find(t => t.id === threadId) || threads[0];

  const visible = messages.filter(m => {
    const rid = m.recipient_id || 'all';
    if (current.id === 'all') return rid === 'all';
    // privé : messages entre moi et l'autre personne
    const other = current.id;
    return (m.sender_id === currentUser.id && rid === other) || (m.sender_id === other && rid === currentUser.id);
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, current.id]);

  // La messagerie est ouverte : tout est lu
  useEffect(() => {
    markChatSeen(currentUser);
  }, [messages.length, currentUser.id]);

  const send = (extra?: { url: string; name: string; kind: 'image' | 'file' }) => {
    if (!text.trim() && !extra) return;
    db.sendMessage({
      senderId: currentUser.id,
      message: text,
      recipientId: current.id === 'all' ? 'all' : current.id,
      attachmentUrl: extra?.url,
      attachmentName: extra?.name,
      attachmentKind: extra?.kind,
    });
    setText('');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError('Fichier trop gros (10 Mo maximum).');
    if (!OK_TYPES.includes(file.type)) return setError('Type non accepté : photo, PDF ou texte seulement.');
    setBusy(true);
    try {
      const isImage = file.type.startsWith('image/') && file.type !== 'image/gif';
      const dataUrl = isImage ? await compressProofImage(file, 1600, 300 * 1024) : await readAsDataUrl(file);
      const url = await db.uploadFile(dataUrl);
      if (!url) setError('Envoi impossible. Réessaie.');
      else send({ url, name: file.name, kind: file.type.startsWith('image/') ? 'image' : 'file' });
    } catch {
      setError('Envoi impossible. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const lastOf = (tid: string) => {
    const l = messages.filter(m =>
      tid === 'all'
        ? (m.recipient_id || 'all') === 'all'
        : (m.sender_id === currentUser.id && m.recipient_id === tid) || (m.sender_id === tid && m.recipient_id === currentUser.id)
    );
    return l[l.length - 1];
  };

  return (
    <div className="bg-[#0f1722] border border-slate-800 overflow-hidden shadow-xl flex h-[calc(100vh-7rem)] min-h-[420px] max-h-[720px]">
      {/* Liste des conversations */}
      <div className={`${showList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 shrink-0 border-r border-slate-800 bg-[#0c131c]`}>
        <div className="px-3 py-3 border-b border-slate-800 font-tactical font-bold text-white text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" /> Messagerie
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map(t => {
            const last = lastOf(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setThreadId(t.id); setShowList(false); }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 border-b border-slate-800/60 cursor-pointer ${
                  t.id === current.id ? 'bg-emerald-950/60' : 'hover:bg-[#121c28]'
                }`}
              >
                {t.id === 'all' ? (
                  <span className="w-9 h-9 bg-emerald-900 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-300" />
                  </span>
                ) : (
                  <Avatar src={t.user?.avatar_url} name={t.title} className="w-9 h-9" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white break-words leading-tight">{t.title}</span>
                  <span className="block text-[11px] text-slate-400 truncate">
                    {last ? (last.message || (last.attachment_name ? `Fichier : ${last.attachment_name}` : '')) : t.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0`}>
        <div className="px-3 py-3 bg-[#131d2a] border-b border-slate-800 flex items-center gap-2.5">
          <button type="button" onClick={() => setShowList(true)} className="md:hidden p-1.5 text-slate-300 cursor-pointer" title="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="font-tactical font-bold text-white text-sm break-words leading-tight">{current.title}</div>
            <div className="text-[11px] text-slate-400">{current.subtitle}</div>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0a0f16]">
          {visible.length === 0 && <div className="text-center text-xs text-slate-500 font-mono pt-8">Aucun message. Écris le premier.</div>}
          {visible.map(msg => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-400">
                  <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                  {msg.sender_role === 'admin' && <span className="px-1 bg-amber-500/20 text-amber-300 border border-amber-500/40">ADMIN</span>}
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[85%] sm:max-w-md p-2.5 text-xs leading-relaxed break-words ${
                    isMe ? 'bg-emerald-600 text-white' : 'bg-[#16212e] text-slate-200 border border-slate-700/80'
                  }`}
                >
                  {msg.attachment_url && msg.attachment_kind === 'image' && (
                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-1.5">
                      <img src={msg.attachment_url} alt={msg.attachment_name || 'photo'} className="max-h-56 w-auto max-w-full" loading="lazy" />
                    </a>
                  )}
                  {msg.attachment_url && msg.attachment_kind !== 'image' && (
                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mb-1.5 underline font-semibold">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="break-all">{msg.attachment_name || 'fichier'}</span>
                    </a>
                  )}
                  {msg.message && <span className="whitespace-pre-line">{msg.message}</span>}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {error && <div className="px-3 py-2 bg-red-950 border-t border-red-500/60 text-red-200 text-xs font-semibold">{error}</div>}

        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="p-2.5 bg-[#131d2a] border-t border-slate-800 flex items-center gap-2"
        >
          <input ref={fileRef} type="file" accept="image/*,application/pdf,text/plain" onChange={onFile} className="hidden" />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="p-2.5 bg-[#0b1017] border border-slate-700 text-slate-300 hover:text-white cursor-pointer disabled:opacity-50 shrink-0"
            title="Joindre une photo ou un fichier (10 Mo max)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={busy ? 'Envoi du fichier…' : 'Écrire un message…'}
            className="flex-1 min-w-0 bg-[#0b1017] border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" disabled={busy} className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 shrink-0" title="Envoyer">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

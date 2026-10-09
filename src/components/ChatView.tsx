import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Paperclip, FileText, Users, MessageSquare, ArrowLeft, MoreVertical, Pin, PinOff, Pencil, Trash2, Copy, X } from 'lucide-react';
import { db } from '../db/store';
import { ChatMessage, User } from '../types';
import { compressProofImage } from '../utils/imageUtils';
import { Avatar } from './Avatar';
import { markChatSeen } from '../utils/notifications';
import { LightboxModal } from './LightboxModal';
import { FileViewerModal } from './FileViewerModal';
import { createPortal } from 'react-dom';
import { askConfirm } from './ConfirmModal';
import { takeChatThread, CHAT_THREAD_EVENT } from '../utils/navTarget';

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
  // Arrivée depuis une notification : on ouvre directement la discussion concernée
  useEffect(() => {
    const open = () => { const t = takeChatThread(); if (t) { setThreadId(t); setShowList(false); } };
    open();
    window.addEventListener(CHAT_THREAD_EVENT, open);
    return () => window.removeEventListener(CHAT_THREAD_EVENT, open);
  }, []);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuMsg, setMenuMsg] = useState<ChatMessage | null>(null); // menu d'actions (appui long ou ⋮)
  const [editingId, setEditingId] = useState<string | null>(null); // message en cours de modification
  const [viewer, setViewer] = useState<{ url: string; msg: ChatMessage } | null>(null); // visionneuse d'image
  const [fileViewer, setFileViewer] = useState<ChatMessage | null>(null); // visionneuse de fiche (PDF, texte)
  const [pinIdx, setPinIdx] = useState(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Messagerie ouverte : les nouveaux messages arrivent en 8 s au lieu de 20 s (revient à 20 s en quittant la page)
  useEffect(() => {
    db.setFastPoll(true);
    return () => db.setFastPoll(false);
  }, []);

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
    if (editingId) {
      const r = db.editMessage(editingId, currentUser.id, text);
      if (!r.success) return setError(r.error || 'Modification impossible.');
      setEditingId(null);
      setText('');
      setError(null);
      return;
    }
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

  const canTouch = (m: ChatMessage) => isAdmin || m.sender_id === currentUser.id;
  const startPress = (m: ChatMessage) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setMenuMsg(m), 450);
  };
  const stopPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const startEdit = (m: ChatMessage) => {
    setMenuMsg(null);
    setEditingId(m.id);
    setText(m.message);
    setError(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setText('');
  };
  const confirmDelete = (m: ChatMessage) => {
    setMenuMsg(null);
    askConfirm({
      title: 'Supprimer ce message pour tout le monde ?',
      message: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
      onConfirm: () => {
        if (editingId === m.id) cancelEdit();
        db.deleteMessage(m.id, currentUser.id);
      },
    });
  };
  const copyText = async (m: ChatMessage) => {
    setMenuMsg(null);
    try {
      await navigator.clipboard.writeText(m.message);
    } catch {
      /* copie impossible : on ignore */
    }
  };
  const pinned = visible.filter(m => m.pinned).sort((a, b) => String(b.pinned_at || '').localeCompare(String(a.pinned_at || '')));
  const pinShown = pinned.length > 0 ? pinned[pinIdx % pinned.length] : null;
  const jumpTo = (id: string) => {
    document.querySelector(`[data-msg-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const gallery = visible.filter(m => m.attachment_url && m.attachment_kind === 'image');

  const lastOf = (tid: string) => {
    const l = messages.filter(m =>
      tid === 'all'
        ? (m.recipient_id || 'all') === 'all'
        : (m.sender_id === currentUser.id && m.recipient_id === tid) || (m.sender_id === tid && m.recipient_id === currentUser.id)
    );
    return l[l.length - 1];
  };

  return (
    <div className="bg-[#0f1722] border border-slate-800 overflow-hidden shadow-xl flex h-full min-h-0 w-full">
      {/* Liste des conversations */}
      <div className={`${showList ? 'flex' : 'hidden'} md:flex flex-col min-h-0 w-full md:w-64 shrink-0 border-r border-slate-800 bg-[#0c131c]`}>
        <div className="px-3 py-3 border-b border-slate-800 font-tactical font-bold text-white text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" /> Messagerie
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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
      <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0 min-h-0`}>
        <div className="px-3 py-3 bg-[#131d2a] border-b border-slate-800 flex items-center gap-2.5 shrink-0">
          <button type="button" onClick={() => setShowList(true)} className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 cursor-pointer" title="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="font-tactical font-bold text-white text-sm break-words leading-tight">{current.title}</div>
            <div className="text-[11px] text-slate-400">{current.subtitle}</div>
          </div>
        </div>

        {pinShown && (
          <button
            type="button"
            onClick={() => { jumpTo(pinShown.id); if (pinned.length > 1) setPinIdx(i => i + 1); }}
            className="w-full px-3 py-2 bg-amber-950/40 border-b border-amber-500/30 flex items-center gap-2 text-left cursor-pointer"
            title="Voir le message épinglé"
          >
            <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-mono text-amber-300">
                Épinglé{pinned.length > 1 ? ` (${(pinIdx % pinned.length) + 1}/${pinned.length})` : ''} · {pinShown.sender_name}
              </span>
              <span className="block text-xs text-slate-200 truncate">{pinShown.message || pinShown.attachment_name || 'Pièce jointe'}</span>
            </span>
          </button>
        )}

        <div className="flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain space-y-3 bg-[#0a0f16]">
          {visible.length === 0 && <div className="text-center text-xs text-slate-500 font-mono pt-8">Aucun message. Écris le premier.</div>}
          {visible.map(msg => {
            const isMe = msg.sender_id === currentUser.id;
            const hasMenu = canTouch(msg) || !!msg.message;
            return (
              <div key={msg.id} data-msg-id={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-400">
                  <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                  {msg.sender_role === 'admin' && <span className="px-1 bg-amber-500/20 text-amber-300 border border-amber-500/40">ADMIN</span>}
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                  {msg.edited_at && <span className="italic text-slate-500">· modifié</span>}
                  {msg.pinned && <Pin className="w-3 h-3 text-amber-400" />}
                </div>
                <div className={`flex items-start gap-1 max-w-[92%] sm:max-w-md ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div
                    onTouchStart={() => hasMenu && startPress(msg)}
                    onTouchEnd={stopPress}
                    onTouchMove={stopPress}
                    onContextMenu={e => { if (hasMenu) { e.preventDefault(); setMenuMsg(msg); } }}
                    className={`min-w-0 p-2.5 text-xs leading-relaxed break-words select-text ${
                      isMe ? 'bg-emerald-600 text-white' : 'bg-[#16212e] text-slate-200 border border-slate-700/80'
                    } ${editingId === msg.id ? 'ring-2 ring-amber-400' : ''}`}
                  >
                    {msg.attachment_url && msg.attachment_kind === 'image' && (
                      <button type="button" onClick={() => setViewer({ url: msg.attachment_url!, msg })} className="block mb-1.5 cursor-zoom-in" title="Agrandir">
                        <img src={msg.attachment_url} alt={msg.attachment_name || 'photo'} className="max-h-56 w-auto max-w-full" loading="lazy" />
                      </button>
                    )}
                    {msg.attachment_url && msg.attachment_kind !== 'image' && (
                      <button type="button" onClick={() => setFileViewer(msg)} className="flex items-center gap-1.5 mb-1.5 min-h-[40px] underline font-semibold text-left cursor-pointer">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="break-all">{msg.attachment_name || 'fichier'}</span>
                      </button>
                    )}
                    {msg.message && <span className="whitespace-pre-line">{msg.message}</span>}
                  </div>
                  {hasMenu && (
                    <button type="button" onClick={() => setMenuMsg(msg)} className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer shrink-0" title="Actions">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {error && <div className="px-3 py-2 bg-red-950 border-t border-red-500/60 text-red-200 text-xs font-semibold">{error}</div>}

        {editingId && (
          <div className="px-3 py-2 bg-amber-950/40 border-t border-amber-500/40 flex items-center gap-2 text-xs text-amber-200">
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 font-semibold">Modification du message</span>
            <button type="button" onClick={cancelEdit} className="p-1 hover:text-white cursor-pointer" title="Annuler la modification">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="p-2.5 bg-[#131d2a] border-t border-slate-800 flex items-center gap-2 shrink-0"
        >
          <input ref={fileRef} type="file" accept="image/*,application/pdf,text/plain" onChange={onFile} className="hidden" />
          <button
            type="button"
            disabled={busy || !!editingId}
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

      {/* Menu d'actions du message */}
      {menuMsg && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setMenuMsg(null)}>
          <div className="w-full max-w-xs bg-[#0f1722] border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2.5 border-b border-slate-800 text-[11px] font-mono text-slate-400 truncate">
              {menuMsg.sender_name} · {menuMsg.message || menuMsg.attachment_name || 'Pièce jointe'}
            </div>
            {canTouch(menuMsg) && (
              <button type="button" onClick={() => { db.togglePinMessage(menuMsg.id, currentUser.id); setMenuMsg(null); }} className="w-full px-3 py-3 flex items-center gap-2.5 text-sm text-white hover:bg-[#16212e] cursor-pointer">
                {menuMsg.pinned ? <PinOff className="w-4 h-4 text-amber-400" /> : <Pin className="w-4 h-4 text-amber-400" />}
                {menuMsg.pinned ? 'Désépingler' : 'Épingler'}
              </button>
            )}
            {canTouch(menuMsg) && (
              <button type="button" onClick={() => startEdit(menuMsg)} className="w-full px-3 py-3 flex items-center gap-2.5 text-sm text-white hover:bg-[#16212e] cursor-pointer">
                <Pencil className="w-4 h-4 text-cyan-400" /> Modifier
              </button>
            )}
            {menuMsg.message && (
              <button type="button" onClick={() => copyText(menuMsg)} className="w-full px-3 py-3 flex items-center gap-2.5 text-sm text-white hover:bg-[#16212e] cursor-pointer">
                <Copy className="w-4 h-4 text-slate-400" /> Copier le texte
              </button>
            )}
            {canTouch(menuMsg) && (
              <button type="button" onClick={() => confirmDelete(menuMsg)} className="w-full px-3 py-3 flex items-center gap-2.5 text-sm text-red-300 hover:bg-red-950/40 cursor-pointer">
                <Trash2 className="w-4 h-4" /> Supprimer pour tous
              </button>
            )}
            <button type="button" onClick={() => setMenuMsg(null)} className="w-full px-3 py-2.5 text-xs text-slate-400 border-t border-slate-800 hover:text-white cursor-pointer">
              Fermer
            </button>
          </div>
        </div>
      , document.body)}

      {/* Visionneuse d'image : zoom, retour, précédent / suivant */}
      {viewer && createPortal(
        <LightboxModal
          isOpen
          onClose={() => setViewer(null)}
          imageUrl={viewer.url}
          gallery={gallery.map(m => m.attachment_url!)}
          title={viewer.msg.attachment_name || 'Photo'}
          subtitle={viewer.msg.sender_name}
          timestamp={viewer.msg.timestamp}
          canDelete={u => { const m = gallery.find(g => g.attachment_url === u); return !!m && canTouch(m); }}
          onDelete={u => { const m = gallery.find(g => g.attachment_url === u); if (m) { setViewer(null); confirmDelete(m); } }}
        />,
        document.body
      )}

      {/* Visionneuse de fiche : retour et suppression */}
      {fileViewer && fileViewer.attachment_url && createPortal(
        <FileViewerModal
          url={fileViewer.attachment_url}
          name={fileViewer.attachment_name || 'fichier'}
          subtitle={fileViewer.sender_name}
          onClose={() => setFileViewer(null)}
          onDelete={canTouch(fileViewer) ? () => { const m = fileViewer; setFileViewer(null); confirmDelete(m); } : undefined}
        />,
        document.body
      )}
    </div>
  );
};

import { createClient } from "npm:@supabase/supabase-js@2";
import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from "node:crypto";
import { Buffer } from "node:buffer";

const T = {
  users: "df_users",
  posts: "df_posts",
  contracts: "df_contracts",
  securityLogs: "df_security_logs",
  advances: "df_advances",
  messages: "df_messages",
  settings: "df_settings",
} as const;
type Col = keyof typeof T;
const COLS = Object.keys(T) as Col[];

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
const SECRET = createHash("sha256").update("df-session:" + SB_KEY).digest("hex");
const RESETS = "df_resets";
const PROFILE_REQ = "df_profile_requests";
const BUCKET = "df-files";
const OPEN_STATUS = ["pending_start", "active", "pending_end"];
const EMP_POST_TARGET = [...OPEN_STATUS, "force_released"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ---------- crypto ----------
const hashPw = (pw: string) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString('hex')}`;
};
const checkPw = (pw: string, stored: string) => {
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const a = Buffer.from(scryptSync(pw, salt, 64).toString('hex'));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
};
const sign = (payload: object) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
};
const verify = (tok: string): { uid: string; exp: number } | null => {
  const [body, sig] = (tok || '').split('.');
  if (!body || !sig || !SECRET) return null;
  const good = createHmac('sha256', SECRET).update(body).digest('base64url');
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
};

// ---------- helpers ----------
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const getUserRow = async (id: string) => {
  const { data } = await sb.from(T.users).select('data').eq('id', id).maybeSingle();
  return data?.data as any | null;
};
const authenticate = async (req: any) => {
  const h = String(req.headers.authorization || '');
  const p = verify(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!p) return null;
  const user = await getUserRow(p.uid);
  if (!user || user.status === 'blocked') return null;
  return user as any;
};

// ---------- login ----------
async function login(req: any, res: any) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis.' });
  }
  if (!SECRET) return res.status(500).json({ error: 'Serveur mal configuré (SESSION_SECRET manquant).' });
  const uname = username.trim().toLowerCase();

  const { data: cred } = await sb.from('df_credentials').select('*').eq('username', uname).maybeSingle();
  if (!cred || !checkPw(password, cred.password_hash)) {
    await sleep(500);
    return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect.' });
  }
  const user = await getUserRow(cred.user_id);
  if (!user) return res.status(401).json({ error: 'Compte introuvable.' });
  if (user.status === 'blocked') return res.status(403).json({ error: 'Compte bloqué par l\'administrateur.' });

  user.is_online = true;
  await sb.from(T.users).upsert({ id: user.id, data: user, updated_at: new Date().toISOString() });
  const token = sign({ uid: user.id, exp: Date.now() + 30 * 24 * 3600 * 1000 });
  return res.json({ token, user });
}

// ---------- state (lecture) ----------
const stripUser = (u: any, me: any) => (me.role === 'admin' || u.id === me.id ? u : { ...u, phone: undefined, cv_url: undefined, cv_data: undefined });
const stripPost = (p: any, me: any) =>
  me.role === 'admin' || p.employee_id === me.id
    ? p
    : { ...p, start_proof_url: '', start_proof_urls: [], end_proof_url: '', end_proof_urls: [] };

async function state(req: any, res: any, me: any) {
  const since = typeof req.query.since === 'string' && req.query.since ? req.query.since : '1970-01-01T00:00:00.000Z';
  const serverTime = new Date(Date.now() - 3000).toISOString();
  const out: Record<string, { changed: any[]; ids: string[] }> = {};
  const admin = me.role === 'admin';

  for (const col of COLS) {
    if (col === 'securityLogs' && !admin) { out[col] = { changed: [], ids: [] }; continue; }
    const scope = (q: any) => {
      if (admin) return q;
      if (col === 'advances') return q.eq('data->>employee_id', me.id);
      if (col === 'messages') return q.or(`data->>recipient_id.eq.all,data->>recipient_id.eq.${me.id},data->>sender_id.eq.${me.id}`);
      return q;
    };
    const [{ data: changed }, { data: ids }] = await Promise.all([
      scope(sb.from(T[col]).select('data').gte('updated_at', since)),
      scope(sb.from(T[col]).select('id')),
    ]);
    let recs = (changed || []).map((r: any) => r.data);
    if (col === 'users') recs = recs.map((u: any) => stripUser(u, me));
    if (col === 'posts') recs = recs.map((p: any) => stripPost(p, me));
    out[col] = { changed: recs, ids: (ids || []).map((r: any) => r.id) };
  }
  let resets: any[] = [];
  if (admin) {
    const { data: rs } = await sb.from(RESETS).select('data').order('updated_at', { ascending: true });
    resets = (rs || []).map((r: any) => ({ ...r.data, password_hash: undefined })).filter((r: any) => r.status === 'pending');
    void maybePurge();
  }
  const { data: prs } = await sb.from(PROFILE_REQ).select('data').order('updated_at', { ascending: true });
  const profileRequests = (prs || []).map((r: any) => r.data).filter((r: any) => r.status === 'pending' && (admin || r.user_id === me.id));
  return res.json({ serverTime, me, collections: out, resets, profileRequests });
}

// ---------- sync (écriture) ----------
async function sync(req: any, res: any, me: any) {
  const changes = (req.body && req.body.changes) || {};
  const admin = me.role === 'admin';
  const rejected: { col: string; id: string; reason: string }[] = [];
  const now = new Date().toISOString();

  for (const col of COLS) {
    const ch = changes[col];
    if (!ch) continue;
    const upserts: any[] = Array.isArray(ch.upserts) ? ch.upserts : [];
    const deletes: string[] = Array.isArray(ch.deletes) ? ch.deletes : [];

    for (const rec of upserts) {
      if (!rec || typeof rec.id !== 'string') continue;
      const { data: row } = await sb.from(T[col]).select('data').eq('id', rec.id).maybeSingle();
      const existing = row?.data as any | undefined;
      let toSave: any = rec;

      if (!admin) {
        let ok = false;
        if (col === 'users') {
          ok = rec.id === me.id && !!existing;
          if (ok) {
            toSave = { ...existing };
            for (const k of ['is_online', 'pending_advance_ar']) if (k in rec) toSave[k] = rec[k];
            // Première photo (obligatoire à l'arrivée) : directe. Ensuite : demande validée par l'admin.
            if ('avatar_url' in rec && !existing.avatar_url) toSave.avatar_url = rec.avatar_url;
          }
        } else if (col === 'posts') {
          ok = rec.employee_id === me.id && EMP_POST_TARGET.includes(rec.status) &&
            (!existing || (existing.employee_id === me.id && OPEN_STATUS.includes(existing.status)));
          if (ok) toSave = { ...rec, calculated_ar: existing?.calculated_ar, admin_notes: existing?.admin_notes };
        } else if (col === 'advances') {
          ok = !existing && rec.employee_id === me.id && rec.status === 'pending';
        } else if (col === 'messages') {
          ok = !existing && rec.sender_id === me.id && typeof rec.message === 'string' && rec.message.length <= 4000;
          if (ok && rec.recipient_id && rec.recipient_id !== 'all') {
            const target = await getUserRow(rec.recipient_id);
            ok = !!target && target.role === 'admin';
          }
          if (ok && rec.attachment_url && !isBucketUrl(rec.attachment_url)) ok = false;
        } else if (col === 'securityLogs') {
          ok = !existing && rec.employee_id === me.id;
        }
        if (!ok) { rejected.push({ col, id: rec.id, reason: 'forbidden' }); continue; }
      }
      await sb.from(T[col]).upsert({ id: rec.id, data: toSave, updated_at: now });
    }

    for (const id of deletes) {
      if (!admin) {
        let ok = false;
        if (col === 'posts') {
          const { data: row } = await sb.from(T.posts).select('data').eq('id', id).maybeSingle();
          ok = !!row && row.data.employee_id === me.id && row.data.status === 'pending_start';
        }
        if (!ok) { rejected.push({ col, id, reason: 'forbidden' }); continue; }
      }
      if (col === 'users') {
        const u = await getUserRow(id);
        if (u?.role === 'admin') { rejected.push({ col, id, reason: 'admin' }); continue; }
        await sb.from('df_credentials').delete().eq('user_id', id);
      }
      await sb.from(T[col]).delete().eq('id', id);
    }
  }
  return res.json({ ok: true, rejected });
}

// ---------- comptes ----------
async function createUser(req: any, res: any, me: any) {
  if (me.role !== 'admin') return res.status(403).json({ error: 'Réservé à l\'administrateur.' });
  const { user, password } = req.body || {};
  const uname = String(user?.username || '').trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,30}$/.test(uname)) return res.status(400).json({ error: 'Pseudo invalide (3 à 30 lettres/chiffres).' });
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
  const { data: dup } = await sb.from('df_credentials').select('user_id').eq('username', uname).maybeSingle();
  if (dup) return res.status(409).json({ error: 'Ce pseudo existe déjà.' });

  const id = `user-emp-${Date.now()}`;
  const rec = {
    ...user, id, username: uname, role: 'employee', status: 'active', is_online: false,
    total_score_boosted: 0, total_earnings_ar: 0, pending_advance_ar: 0,
  };
  await sb.from(T.users).upsert({ id, data: rec, updated_at: new Date().toISOString() });
  await sb.from('df_credentials').insert({ user_id: id, username: uname, password_hash: hashPw(password) });
  return res.json({ user: rec });
}

async function setPassword(req: any, res: any, me: any) {
  const { userId, password, currentPassword } = req.body || {};
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
  const target = me.role === 'admin' && userId ? userId : me.id;
  if (me.role !== 'admin') {
    const { data: c } = await sb.from('df_credentials').select('password_hash').eq('user_id', me.id).maybeSingle();
    if (!c || !checkPw(String(currentPassword || ''), c.password_hash)) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  }
  await sb.from('df_credentials').update({ password_hash: hashPw(password), updated_at: new Date().toISOString() }).eq('user_id', target);
  return res.json({ ok: true });
}

async function logout(_req: any, res: any, me: any) {
  me.is_online = false;
  await sb.from(T.users).upsert({ id: me.id, data: me, updated_at: new Date().toISOString() });
  return res.json({ ok: true });
}


const isBucketUrl = (u: unknown) =>
  typeof u === 'string' && u.startsWith(`${SB_URL}/storage/v1/object/public/${BUCKET}/`);

// ---------- modification de profil (validée par l'admin) ----------
async function profileRequest(req: any, res: any, me: any) {
  if (me.role === 'admin') return res.status(403).json({ error: 'Réservé aux boosters.' });
  const { name, username, phone, avatar_url } = req.body || {};
  const nm = String(name || '').trim();
  const un = String(username || '').trim().toLowerCase();
  const ph = String(phone || '').trim();
  if (nm.length < 2 || nm.length > 60) return res.status(400).json({ error: 'Nom : 2 à 60 caractères.' });
  if (!/^[a-z0-9_.-]{3,30}$/.test(un)) return res.status(400).json({ error: 'Pseudo invalide (3 à 30 lettres/chiffres).' });
  if (ph.length > 30) return res.status(400).json({ error: 'Téléphone trop long.' });
  if (avatar_url && !isBucketUrl(avatar_url)) return res.status(400).json({ error: 'Photo invalide.' });
  const newAvatar = avatar_url || me.avatar_url || '';
  if (nm === me.name && un === me.username && ph === (me.phone || '') && newAvatar === (me.avatar_url || '')) {
    return res.status(400).json({ error: 'Aucun changement.' });
  }
  if (un !== me.username) {
    const { data: dup } = await sb.from('df_credentials').select('user_id').eq('username', un).maybeSingle();
    if (dup && dup.user_id !== me.id) return res.status(409).json({ error: 'Ce pseudo existe déjà.' });
    const { data: pend } = await sb.from(PROFILE_REQ).select('id').eq('data->>username', un).neq('id', `pr-${me.id}`).limit(1);
    if (pend && pend.length) return res.status(409).json({ error: 'Ce pseudo existe déjà.' });
  }
  const id = `pr-${me.id}`;
  await sb.from(PROFILE_REQ).upsert({
    id,
    data: {
      id, user_id: me.id, status: 'pending', created_at: new Date().toISOString(),
      old: { name: me.name, username: me.username, phone: me.phone || '', avatar_url: me.avatar_url || '' },
      name: nm, username: un, phone: ph, avatar_url: newAvatar,
    },
    updated_at: new Date().toISOString(),
  });
  return res.json({ ok: true });
}

async function profileDecision(req: any, res: any, me: any) {
  if (me.role !== 'admin') return res.status(403).json({ error: 'Réservé à l\'administrateur.' });
  const { id, approve } = req.body || {};
  if (typeof id !== 'string') return res.status(400).json({ error: 'Demande invalide.' });
  const { data: row } = await sb.from(PROFILE_REQ).select('data').eq('id', id).maybeSingle();
  if (!row || row.data.status !== 'pending') return res.status(404).json({ error: 'Demande introuvable.' });
  const r = row.data;
  if (approve === true) {
    const user = await getUserRow(r.user_id);
    if (!user) { await sb.from(PROFILE_REQ).delete().eq('id', id); return res.status(404).json({ error: 'Compte introuvable.' }); }
    if (r.username !== user.username) {
      const { data: dup } = await sb.from('df_credentials').select('user_id').eq('username', r.username).maybeSingle();
      if (dup && dup.user_id !== user.id) return res.status(409).json({ error: 'Ce pseudo est déjà pris par un autre compte.' });
      await sb.from('df_credentials').update({ username: r.username, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    }
    const nameChanged = r.name !== user.name;
    const next = { ...user, name: r.name, username: r.username, phone: r.phone, avatar_url: r.avatar_url };
    await sb.from(T.users).upsert({ id: user.id, data: next, updated_at: new Date().toISOString() });
    if (nameChanged) await sb.rpc('df_rename_employee', { uid: user.id, new_name: r.name });
  }
  await sb.from(PROFILE_REQ).delete().eq('id', id);
  return res.json({ ok: true });
}

// ---------- mot de passe oublié ----------
async function forgot(req: any, res: any) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Pseudo et nouveau mot de passe requis.' });
  }
  if (password.length < 6 || password.length > 100) return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
  const uname = username.trim().toLowerCase();
  await sleep(400);
  const { data: cred } = await sb.from('df_credentials').select('user_id').eq('username', uname).maybeSingle();
  const user = cred ? await getUserRow(cred.user_id) : null;
  if (user && user.role === 'employee' && user.status !== 'blocked') {
    const id = `reset-${user.id}`;
    const { data: ex } = await sb.from(RESETS).select('data').eq('id', id).maybeSingle();
    if (!ex || ex.data.status !== 'pending') {
      await sb.from(RESETS).upsert({
        id,
        data: {
          id, user_id: user.id, username: uname, name: user.name, phone: user.phone || '',
          password_hash: hashPw(password), status: 'pending', created_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    }
  }
  // Même réponse dans tous les cas : on ne révèle pas quels pseudos existent
  return res.json({ ok: true });
}

async function resetDecision(req: any, res: any, me: any) {
  if (me.role !== 'admin') return res.status(403).json({ error: 'Réservé à l\'administrateur.' });
  const { id, approve } = req.body || {};
  if (typeof id !== 'string') return res.status(400).json({ error: 'Demande invalide.' });
  const { data: row } = await sb.from(RESETS).select('data').eq('id', id).maybeSingle();
  if (!row || row.data.status !== 'pending') return res.status(404).json({ error: 'Demande introuvable.' });
  if (approve === true) {
    await sb.from('df_credentials').update({ password_hash: row.data.password_hash, updated_at: new Date().toISOString() }).eq('user_id', row.data.user_id);
  }
  await sb.from(RESETS).delete().eq('id', id);
  return res.json({ ok: true });
}

// ---------- fichiers (photos, pièces jointes) ----------
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf', 'text/plain': 'txt',
};
async function upload(req: any, res: any, me: any) {
  const { dataUrl } = req.body || {};
  const m = typeof dataUrl === 'string' ? dataUrl.match(/^data:([a-z0-9.+\/-]+);base64,(.+)$/i) : null;
  if (!m) return res.status(400).json({ error: 'Fichier invalide.' });
  const mime = m[1].toLowerCase();
  const ext = EXT[mime];
  if (!ext) return res.status(400).json({ error: 'Type de fichier non accepté.' });
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > 10 * 1024 * 1024) return res.status(413).json({ error: 'Fichier trop gros (10 Mo max).' });
  const path = `${me.id}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) { console.error('upload error:', error); return res.status(500).json({ error: 'Envoi impossible.' }); }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return res.json({ url: data.publicUrl, path });
}

// ---------- nettoyage automatique des anciennes preuves ----------
let lastPurge = 0;
const pathOf = (u: string) => {
  const i = u.indexOf(`/object/public/${BUCKET}/`);
  return i >= 0 ? decodeURIComponent(u.slice(i + `/object/public/${BUCKET}/`.length)) : '';
};
async function maybePurge() {
  if (Date.now() - lastPurge < 6 * 3600 * 1000) return;
  lastPurge = Date.now();
  try {
    const { data: st } = await sb.from(T.settings).select('data').eq('id', 'general').maybeSingle();
    const days = Math.max(1, Number(st?.data?.retention_days) || 30);
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const { data: rows } = await sb.from(T.posts).select('id,data')
      .lt('updated_at', cutoff).in('data->>status', ['completed', 'rejected', 'force_released']).limit(40);
    for (const r of rows || []) {
      const p = r.data;
      if (p.proofs_purged) continue;
      const urls: string[] = [p.start_proof_url, p.end_proof_url, ...(p.start_proof_urls || []), ...(p.end_proof_urls || [])].filter(Boolean);
      const paths = urls.map(pathOf).filter(Boolean);
      if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      const next = { ...p, start_proof_url: '', end_proof_url: '', start_proof_urls: [], end_proof_urls: [], proofs_purged: true };
      await sb.from(T.posts).upsert({ id: r.id, data: next, updated_at: new Date().toISOString() });
    }
  } catch (e) { console.error('purge error:', e); }
}

// ---------- routeur ----------
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(request.url);
  const action = url.pathname.split("/").filter(Boolean).pop() || "";
  const res: any = {
    _s: 200,
    status(n: number) { this._s = n; return this; },
    json(b: unknown) {
      return new Response(JSON.stringify(b), {
        status: this._s,
        headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    },
  };
  let body: any = {};
  if (request.method === "POST") { try { body = await request.json(); } catch { body = {}; } }
  const req: any = {
    method: request.method,
    body,
    query: { since: url.searchParams.get("since") || "" },
    headers: { authorization: request.headers.get("authorization") || "" },
  };
  try {
    if (action === "login" && req.method === "POST") return await login(req, res);
    if (action === "forgot" && req.method === "POST") return await forgot(req, res);
    const me = await authenticate(req);
    if (!me) return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });
    if (action === "state" && req.method === "GET") return await state(req, res, me);
    if (action === "sync" && req.method === "POST") return await sync(req, res, me);
    if (action === "create-user" && req.method === "POST") return await createUser(req, res, me);
    if (action === "set-password" && req.method === "POST") return await setPassword(req, res, me);
    if (action === "logout" && req.method === "POST") return await logout(req, res, me);
    if (action === "reset-decision" && req.method === "POST") return await resetDecision(req, res, me);
    if (action === "upload" && req.method === "POST") return await upload(req, res, me);
    if (action === "profile-request" && req.method === "POST") return await profileRequest(req, res, me);
    if (action === "profile-decision" && req.method === "POST") return await profileDecision(req, res, me);
    return res.status(404).json({ error: "Route inconnue." });
  } catch (e) {
    console.error("API error:", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

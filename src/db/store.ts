import {
  User,
  PostSession,
  SecurityViolation,
  SalaryAdvanceRequest,
  ChatMessage,
  ShiftType,
  ClientContract,
} from '../types';
import { AVAILABLE_CLIENT_CONTRACTS } from './initialData';

const TOKEN_KEY = 'df_session_token_v2';
const API_BASE = 'https://ljorjzrxkxqacmmkmqdx.supabase.co/functions/v1/df-api';
const COLS = ['users', 'posts', 'contracts', 'securityLogs', 'advances', 'messages'] as const;
type Col = (typeof COLS)[number];

const SORTERS: Partial<Record<Col, (a: any, b: any) => number>> = {
  users: (a, b) => (a.role === b.role ? String(a.id).localeCompare(String(b.id)) : a.role === 'admin' ? -1 : 1),
  posts: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
  contracts: (a, b) => (a.post_number || 0) - (b.post_number || 0),
  securityLogs: (a, b) => String(b.id).localeCompare(String(a.id)),
  advances: (a, b) => String(b.id).localeCompare(String(a.id)),
  messages: (a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')) || String(a.id).localeCompare(String(b.id)),
};

class DeltaForceStore {
  private users: User[] = [];
  private posts: PostSession[] = [];
  private contracts: ClientContract[] = [];
  private securityLogs: SecurityViolation[] = [];
  private advanceRequests: SalaryAdvanceRequest[] = [];
  private messages: ChatMessage[] = [];
  private currentUser: User | null = null;
  private listeners: Set<() => void> = new Set();

  // --- Synchronisation avec le serveur (Supabase via /api) ---
  private token: string | null = null;
  private since = '';
  private synced: Record<Col, Map<string, string>> = this.emptySynced();
  private dirty = false;
  private syncing = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readyPromise: Promise<void>;

  constructor() {
    try {
      this.token = localStorage.getItem(TOKEN_KEY);
    } catch {
      this.token = null;
    }
    this.readyPromise = this.token ? this.restore() : Promise.resolve();
  }

  public whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private emptySynced(): Record<Col, Map<string, string>> {
    return {
      users: new Map(), posts: new Map(), contracts: new Map(),
      securityLogs: new Map(), advances: new Map(), messages: new Map(),
    };
  }

  private arr(col: Col): any[] {
    switch (col) {
      case 'users': return this.users;
      case 'posts': return this.posts;
      case 'contracts': return this.contracts;
      case 'securityLogs': return this.securityLogs;
      case 'advances': return this.advanceRequests;
      case 'messages': return this.messages;
    }
  }

  private setArr(col: Col, value: any[]) {
    switch (col) {
      case 'users': this.users = value; break;
      case 'posts': this.posts = value; break;
      case 'contracts': this.contracts = value; break;
      case 'securityLogs': this.securityLogs = value; break;
      case 'advances': this.advanceRequests = value; break;
      case 'messages': this.messages = value; break;
    }
  }

  private resetLocal() {
    COLS.forEach(c => this.setArr(c, []));
    this.synced = this.emptySynced();
    this.since = '';
    this.dirty = false;
    this.currentUser = null;
  }

  private async api(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
    try {
      const res = await fetch(`${API_BASE}/${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && this.token && path !== 'login') this.expireSession();
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: { error: 'Réseau indisponible.' } };
    }
  }

  private expireSession() {
    this.token = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    this.stopPolling();
    this.resetLocal();
    this.emit();
  }

  private async restore() {
    const ok = await this.pull(true);
    if (ok) this.startPolling();
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void this.pull();
    }, 5000);
  }

  private stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  // Récupère les changements du serveur. Retourne true si la session est valide.
  private async pull(force = false): Promise<boolean> {
    if (!this.token) return false;
    const r = await this.api(`state?since=${encodeURIComponent(this.since)}`);
    if (!r.ok) return false;
    if (!force && (this.dirty || this.syncing)) return true; // changements locaux en attente : on ignore ce tour

    const cols = r.data.collections || {};
    let changedAny = false;
    for (const col of COLS) {
      const c = cols[col];
      if (!c) continue;
      const idSet = new Set<string>(c.ids || []);
      let list = this.arr(col);
      const before = list.length;
      list = list.filter(x => idSet.has(x.id));
      let changed = list.length !== before;
      for (const rec of c.changed || []) {
        const json = JSON.stringify(rec);
        if (this.synced[col].get(rec.id) === json && list.some(x => x.id === rec.id)) continue;
        const idx = list.findIndex(x => x.id === rec.id);
        if (idx >= 0) list[idx] = rec; else list.push(rec);
        this.synced[col].set(rec.id, json);
        changed = true;
      }
      for (const id of Array.from(this.synced[col].keys())) if (!idSet.has(id)) this.synced[col].delete(id);
      if (changed) {
        const sorter = SORTERS[col];
        if (sorter) list.sort(sorter);
        this.setArr(col, list);
        changedAny = true;
      }
    }
    this.since = r.data.serverTime || this.since;

    // Premier démarrage : l'admin remplit les 20 postes
    if (r.data.me?.role === 'admin' && this.contracts.length === 0 && (cols.contracts?.ids || []).length === 0) {
      this.contracts = [...AVAILABLE_CLIENT_CONTRACTS];
      this.notify();
      changedAny = true;
    }

    const me = r.data.me ? this.users.find(u => u.id === r.data.me.id) || r.data.me : null;
    if (me) {
      const prev = JSON.stringify(this.currentUser);
      this.currentUser = me;
      if (prev !== JSON.stringify(me)) changedAny = true;
    }
    if (changedAny) this.emit();
    return true;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach(fn => fn());
  }

  // Appelé après chaque modification locale : envoie au serveur après un court délai
  private notify() {
    if (this.token) {
      this.dirty = true;
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => void this.flush(), 300);
    }
    this.emit();
  }

  private diff() {
    const changes: Record<string, { upserts: any[]; deletes: string[] }> = {};
    const sent: Record<string, { sets: Map<string, string>; deletes: string[] }> = {};
    for (const col of COLS) {
      const upserts: any[] = [];
      const sets = new Map<string, string>();
      const current = new Set<string>();
      for (const rec of this.arr(col)) {
        current.add(rec.id);
        const json = JSON.stringify(rec);
        if (this.synced[col].get(rec.id) !== json) { upserts.push(rec); sets.set(rec.id, json); }
      }
      const deletes = Array.from(this.synced[col].keys()).filter(id => !current.has(id));
      if (upserts.length || deletes.length) {
        changes[col] = { upserts, deletes };
        sent[col] = { sets, deletes };
      }
    }
    return { changes, sent };
  }

  private async flush() {
    if (this.syncing || !this.token) return;
    this.syncing = true;
    let retry = false;
    try {
      const { changes, sent } = this.diff();
      if (Object.keys(changes).length === 0) { this.dirty = false; return; }
      const r = await this.api('sync', { method: 'POST', body: JSON.stringify({ changes }) });
      if (!r.ok) { retry = r.status !== 401 && r.status !== 403 && r.status !== 400; if (!retry) this.dirty = false; return; }
      for (const col of Object.keys(sent) as Col[]) {
        sent[col].sets.forEach((json, id) => this.synced[col].set(id, json));
        sent[col].deletes.forEach(id => this.synced[col].delete(id));
      }
      if (r.data.rejected?.length) {
        // Certaines modifications refusées par le serveur : on recharge l'état officiel
        this.dirty = false;
        this.since = '';
        this.syncing = false;
        await this.pull(true);
        return;
      }
      const again = this.diff();
      if (Object.keys(again.changes).length > 0) retry = true; else this.dirty = false;
    } finally {
      this.syncing = false;
      if (retry && this.token) {
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => void this.flush(), 2500);
      }
    }
  }

  // --- AUTHENTICATION ---
  public async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    const r = await this.api('login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (!r.ok) return { success: false, error: r.data?.error || 'Erreur de connexion.' };
    this.stopPolling();
    this.resetLocal();
    this.token = r.data.token;
    try { localStorage.setItem(TOKEN_KEY, r.data.token); } catch { /* ignore */ }
    await this.pull(true);
    this.currentUser = this.users.find(u => u.id === r.data.user.id) || r.data.user;
    this.startPolling();
    this.emit();
    return { success: true, user: this.currentUser as User };
  }

  public logout(): void {
    if (this.token) {
      fetch(`${API_BASE}/logout`, { method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' } }).catch(() => {});
    }
    this.token = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    this.stopPolling();
    this.resetLocal();
    this.emit();
  }

  public async setPassword(userId: string, password: string, currentPassword?: string): Promise<{ success: boolean; error?: string }> {
    const r = await this.api('set-password', { method: 'POST', body: JSON.stringify({ userId, password, currentPassword }) });
    return r.ok ? { success: true } : { success: false, error: r.data?.error || 'Erreur.' };
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getPosts(): PostSession[] {
    return [...this.posts];
  }

  public getContracts(): ClientContract[] {
    return [...this.contracts];
  }

  public getContractByPostNumber(postNumber: number): ClientContract | undefined {
    return this.contracts.find(c => c.post_number === postNumber);
  }

  // Admin exclusive: Update contract details (name, tag, scores, shift, etc.)
  public updateContract(
    contractId: string,
    updates: Partial<ClientContract>
  ): { success: boolean; error?: string; contract?: ClientContract } {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) return { success: false, error: 'Contrat introuvable' };

    const oldClientName = contract.client_name;
    Object.assign(contract, updates);

    // Si le Début dépasse l'Actuel du compte, l'Actuel suit le Début
    if (
      updates.initial_score !== undefined &&
      contract.current_score !== undefined &&
      contract.current_score < contract.initial_score
    ) {
      contract.current_score = contract.initial_score;
    }

    // If target score or initial score changed, recalculate reward estimate
    if (updates.target_score !== undefined || updates.initial_score !== undefined) {
      const diff = Math.max(0, contract.target_score - contract.initial_score);
      contract.estimated_reward_ar = Math.round((diff / 1000000) * 1000);
    }

    // Sync any active or pending post on this contract
    const relatedPosts = this.posts.filter(
      p => p.client_name === oldClientName && (p.status === 'active' || p.status === 'pending_start')
    );
    relatedPosts.forEach(post => {
      if (updates.client_name) post.client_name = updates.client_name;
      if (updates.account_tag) post.account_tag = updates.account_tag;
      if (updates.target_score) {
        post.target_score = updates.target_score;
        post.remaining_score = Math.max(0, updates.target_score - post.current_score);
      }
      if (updates.recommended_shift && updates.recommended_shift !== 'any') {
        post.shift_type = updates.recommended_shift;
      }
      post.updated_at = new Date().toISOString();
    });

    this.notify();
    return { success: true, contract };
  }

  // Admin exclusive: Update any field of any post session (debut, target, name, tag, employee, shift, status, notes)
  public updatePostAdmin(
    postId: string,
    updates: Partial<PostSession>
  ): { success: boolean; error?: string; post?: PostSession } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };

    // If employee reassigned, verify user
    if (updates.employee_id && updates.employee_id !== post.employee_id) {
      const emp = this.users.find(u => u.id === updates.employee_id);
      if (emp) {
        post.employee_id = emp.id;
        post.employee_name = emp.name;
      }
    }

    if (updates.client_name !== undefined) post.client_name = updates.client_name;
    if (updates.account_tag !== undefined) post.account_tag = updates.account_tag;
    if (updates.shift_type !== undefined) post.shift_type = updates.shift_type;
    if (updates.status !== undefined) post.status = updates.status;
    if (updates.notes !== undefined) post.notes = updates.notes;

    if (updates.initial_score !== undefined) {
      post.initial_score = updates.initial_score;
      // If current score was at old initial score, adjust current too
      if (post.current_score === post.initial_score) {
        post.current_score = updates.initial_score;
      }
    }

    if (updates.current_score !== undefined) {
      post.current_score = updates.current_score;
    }

    if (updates.target_score !== undefined) {
      post.target_score = updates.target_score;
    }

    // Recalculate remaining
    post.remaining_score = Math.max(0, post.target_score - post.current_score);

    if (updates.start_proof_url) post.start_proof_url = updates.start_proof_url;
    if (updates.start_proof_urls) {
      post.start_proof_urls = updates.start_proof_urls;
      if (updates.start_proof_urls.length > 0 && !updates.start_proof_url) {
        post.start_proof_url = updates.start_proof_urls[0];
      }
    }

    post.updated_at = new Date().toISOString();
    this.notify();
    return { success: true, post };
  }

  public getSecurityLogs(): SecurityViolation[] {
    return [...this.securityLogs];
  }

  public getAdvanceRequests(): SalaryAdvanceRequest[] {
    return [...this.advanceRequests];
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  // --- ANTI-CHEAT & POST WORKFLOW ---
  public getActiveOrPendingPost(employeeId: string): PostSession | undefined {
    return this.posts.find(
      p => p.employee_id === employeeId && (p.status === 'active' || p.status === 'pending_start' || p.status === 'pending_end')
    );
  }

  public startPost(params: {
    employeeId: string;
    clientName: string;
    accountTag: string;
    targetScore: number;
    initialScore: number;
    proofUrl?: string;
    proofUrls?: string[]; // 1 to 4 photos
    postNumber?: number;
    shiftType: ShiftType;
    notes?: string;
    status?: 'active' | 'pending_start';
    autoReplaceExisting?: boolean;
  }): { success: boolean; error?: string; post?: PostSession } {
    const employee = this.users.find(u => u.id === params.employeeId);
    if (!employee) {
      return { success: false, error: 'Employé introuvable' };
    }

    if (employee.status === 'blocked') {
      return { success: false, error: 'Access denied. Account is blocked.' };
    }

    // 1. Anti-Multi-Poste Check or Auto-Replace:
    const existingActive = this.getActiveOrPendingPost(params.employeeId);
    if (existingActive) {
      if (params.autoReplaceExisting) {
        // Gracefully release the previous session to allow immediate switch
        this.forceReleasePost(existingActive.id, `Remplacement par le poste ${params.clientName}`);
      } else {
        // Log security violation into "Petit Malin"
        this.logViolation({
          employee_id: employee.id,
          employee_name: employee.name,
          violation_type: 'multi_post_attempt',
          description: `Anti-Multi-Poste Block: Tentative d'ouverture de nouveau shift sur client "${params.clientName}" alors que le poste "${existingActive.client_name}" (${existingActive.status}) est déjà en cours.`,
          details: {
            client_name: params.clientName,
            active_post_id: existingActive.id,
          }
        });

        return {
          success: false,
          error: `Anti-Multi-Poste: Vous avez déjà un poste en cours (${existingActive.client_name} - ${existingActive.status}). Vous ne pouvez pas ouvrir un second poste.`
        };
      }
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    const proofList = (params.proofUrls && params.proofUrls.length > 0)
      ? params.proofUrls
      : (params.proofUrl ? [params.proofUrl] : []);

    const newPost: PostSession = {
      id: `post-${Date.now()}`,
      employee_id: employee.id,
      employee_name: employee.name,
      client_name: params.clientName,
      account_tag: params.accountTag || `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
      target_score: params.targetScore,
      initial_score: params.initialScore,
      current_score: params.initialScore,
      remaining_score: Math.max(0, params.targetScore - params.initialScore),
      status: params.status || 'pending_start',
      shift_type: params.shiftType,
      date: dateStr,
      start_time: timeStr,
      post_number: params.postNumber,
      start_proof_url: proofList[0] || '',
      start_proof_urls: proofList,
      notes: params.notes,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.posts.unshift(newPost);
    this.notify();
    return { success: true, post: newPost };
  }

  // Edit pending start post before admin validation
  public updatePendingStartPost(
    postId: string,
    newInitialScore: number,
    newProofUrl?: string,
    newProofUrls?: string[]
  ): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };
    if (post.status !== 'pending_start') {
      return { success: false, error: 'Modification impossible: le poste a déjà été validé par un administrateur.' };
    }

    post.initial_score = newInitialScore;
    post.current_score = newInitialScore;
    post.remaining_score = Math.max(0, post.target_score - newInitialScore);
    
    if (newProofUrls && newProofUrls.length > 0) {
      post.start_proof_urls = newProofUrls;
      post.start_proof_url = newProofUrls[0];
    } else if (newProofUrl) {
      post.start_proof_url = newProofUrl;
      post.start_proof_urls = [newProofUrl];
    }
    
    post.updated_at = new Date().toISOString();
    this.notify();
    return { success: true };
  }

  // Cancel pending start post before admin validation
  public cancelPendingStartPost(postId: string): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };
    if (post.status !== 'pending_start') {
      return { success: false, error: 'Annulation impossible: le poste est déjà validé ou en cours.' };
    }

    this.posts = this.posts.filter(p => p.id !== postId);
    this.notify();
    return { success: true };
  }

  // Update current score during active post
  public updateCurrentScore(postId: string, newScore: number): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };

    post.current_score = newScore;
    post.remaining_score = Math.max(0, post.target_score - newScore);
    post.updated_at = new Date().toISOString();
    this.notify();
    return { success: true };
  }

  // Submit End Form with mandatory score consistency check
  public submitEndPost(params: {
    postId: string;
    finalScore: number;
    endProofUrl?: string;
    endProofUrls?: string[];
    notes?: string;
  }): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === params.postId);
    if (!post) return { success: false, error: 'Poste introuvable' };

    // Built-in Score Consistency Constraint:
    if (params.finalScore < post.initial_score) {
      // Log security violation in Petit Malin
      this.logViolation({
        employee_id: post.employee_id,
        employee_name: post.employee_name,
        violation_type: 'score_inversion',
        description: `Score Consistency Failure: Le score final soumis (${params.finalScore.toLocaleString()}) est inférieur au score initial vérifié (${post.initial_score.toLocaleString()}) pour le client ${post.client_name}.`,
        details: {
          initial_score: post.initial_score,
          attempted_score: params.finalScore,
          client_name: post.client_name,
          active_post_id: post.id
        }
      });

      return {
        success: false,
        error: 'Final score cannot be lower than initial score.'
      };
    }

    const now = new Date();
    const endProofList = (params.endProofUrls && params.endProofUrls.length > 0)
      ? params.endProofUrls
      : (params.endProofUrl ? [params.endProofUrl] : []);

    post.final_score = params.finalScore;
    post.current_score = params.finalScore;
    post.remaining_score = Math.max(0, post.target_score - params.finalScore);
    post.end_proof_url = endProofList[0] || params.endProofUrl || '';
    post.end_proof_urls = endProofList;
    post.end_time = now.toTimeString().split(' ')[0];
    post.status = 'pending_end';
    if (params.notes) {
      post.notes = post.notes ? `${post.notes} | ${params.notes}` : params.notes;
    }
    post.updated_at = now.toISOString();

    this.notify();
    return { success: true };
  }

  // --- ADMIN ACTIONS ---
  public validatePost(postId: string): { success: boolean; error?: string; payrollAr?: number } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };

    const employee = this.users.find(u => u.id === post.employee_id);

    if (post.status === 'pending_start') {
      post.status = 'active';
      post.updated_at = new Date().toISOString();
      this.notify();
      return { success: true };
    }

    if (post.status === 'pending_end') {
      const finalScore = post.final_score ?? post.current_score;
      const scoreGained = Math.max(0, finalScore - post.initial_score);
      // Automated payroll formula: 1M score = 1,000 Ar
      const calculatedAr = Math.round((scoreGained / 1000000) * 1000);

      post.status = 'completed';
      post.calculated_ar = calculatedAr;

      // L'Actuel du compte devient le score final (vu par l'employé suivant)
      const linkedContract =
        this.contracts.find(c => c.post_number === post.post_number) ||
        this.contracts.find(c => c.client_name === post.client_name);
      if (linkedContract) linkedContract.current_score = finalScore;
      post.updated_at = new Date().toISOString();

      if (employee) {
        employee.total_score_boosted = (employee.total_score_boosted || 0) + scoreGained;
        employee.total_earnings_ar = (employee.total_earnings_ar || 0) + calculatedAr;
      }

      this.notify();
      return { success: true, payrollAr: calculatedAr };
    }

    return { success: false, error: 'Statut du poste non éligible pour validation' };
  }

  public rejectPost(postId: string, reason: string): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };
    if (!reason.trim()) return { success: false, error: 'Un motif de rejet est obligatoire' };

    post.status = 'rejected';
    post.rejection_reason = reason.trim();
    post.updated_at = new Date().toISOString();
    this.notify();
    return { success: true };
  }

  // Emergency Force Release Post to unstick bugged shifts
  public forceReleasePost(postId: string, reason = 'Force release by administrator'): { success: boolean; error?: string } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return { success: false, error: 'Poste introuvable' };

    post.status = 'force_released';
    post.notes = post.notes ? `${post.notes} [FORCE RELEASED: ${reason}]` : `[FORCE RELEASED: ${reason}]`;
    post.updated_at = new Date().toISOString();
    this.notify();
    return { success: true };
  }

  // --- USER PROFILE & SECURITY CONTROLS ---
  public toggleUserBlock(userId: string): { success: boolean; newStatus: 'active' | 'blocked' } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, newStatus: 'active' };

    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    if (user.status === 'blocked') {
      user.is_online = false;
    }
    
    // Update matching security logs if unblocking
    if (user.status === 'active') {
      this.securityLogs.forEach(log => {
        if (log.employee_id === userId) {
          log.resolved = true;
        }
      });
    }

    this.notify();
    return { success: true, newStatus: user.status };
  }

  public deleteUser(userId: string): { success: boolean; error?: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Utilisateur introuvable' };
    if (user.role === 'admin') return { success: false, error: 'Impossible de supprimer un compte administrateur.' };

    this.users = this.users.filter(u => u.id !== userId);
    this.notify();
    return { success: true };
  }

  public updateUser(userId: string, data: Partial<User>): { success: boolean } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false };

    Object.assign(user, data);
    this.notify();
    return { success: true };
  }

  public async addUser(
    userData: Omit<User, 'id' | 'is_online' | 'total_score_boosted' | 'total_earnings_ar' | 'pending_advance_ar'>,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const r = await this.api('create-user', { method: 'POST', body: JSON.stringify({ user: userData, password }) });
    if (!r.ok) return { success: false, error: r.data?.error || 'Création impossible.' };
    const u = r.data.user as User;
    this.users.push(u);
    this.synced.users.set(u.id, JSON.stringify(u));
    this.emit();
    return { success: true, user: u };
  }

  // --- SECURITY LOGS ("Petit Malin") ---
  public logViolation(data: Omit<SecurityViolation, 'id' | 'timestamp' | 'resolved'>): void {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const newLog: SecurityViolation = {
      ...data,
      id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      resolved: false,
    };
    this.securityLogs.unshift(newLog);
    this.notify();
  }

  public dismissViolation(id: string): void {
    const log = this.securityLogs.find(l => l.id === id);
    if (log) {
      log.resolved = true;
      this.notify();
    }
  }

  // --- SALARY ADVANCE (DMD d'avance) ---
  public submitAdvanceRequest(params: {
    employeeId: string;
    amountAr: number;
    reason: string;
  }): { success: boolean; error?: string } {
    const employee = this.users.find(u => u.id === params.employeeId);
    if (!employee) return { success: false, error: 'Employé introuvable' };

    const newReq: SalaryAdvanceRequest = {
      id: `adv-${Date.now()}`,
      employee_id: employee.id,
      employee_name: employee.name,
      amount_ar: params.amountAr,
      reason: params.reason,
      request_date: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    this.advanceRequests.unshift(newReq);
    employee.pending_advance_ar = (employee.pending_advance_ar || 0) + params.amountAr;
    this.notify();
    return { success: true };
  }

  public reviewAdvanceRequest(id: string, approve: boolean, notes?: string): { success: boolean } {
    const req = this.advanceRequests.find(r => r.id === id);
    if (!req) return { success: false };

    const employee = this.users.find(u => u.id === req.employee_id);
    req.status = approve ? 'approved' : 'rejected';
    req.admin_notes = notes;

    if (employee && !approve) {
      employee.pending_advance_ar = Math.max(0, (employee.pending_advance_ar || 0) - req.amount_ar);
    }

    this.notify();
    return { success: true };
  }

  // --- MESSAGES ---
  public sendMessage(params: {
    senderId: string;
    message: string;
    recipientId?: string;
  }): { success: boolean } {
    const sender = this.users.find(u => u.id === params.senderId);
    if (!sender || !params.message.trim()) return { success: false };

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender_id: sender.id,
      sender_name: sender.name,
      sender_role: sender.role,
      recipient_id: params.recipientId || 'all',
      message: params.message.trim(),
      timestamp: timeStr,
    };

    this.messages.push(newMsg);
    this.notify();
    return { success: true };
  }

  // --- RESET / EXPORT SQL & JSON BACKUP ---
  public resetToFactoryDefaults(): void {
    // Ne supprime rien : recharge simplement l'état officiel depuis le serveur
    this.since = '';
    void this.pull(true);
  }

  public exportDatabaseSql(): string {
    const sqlStatements = [
      '-- DELTA FORCE BOOSTING MANAGEMENT SYSTEM',
      '-- STANDALONE PORTABLE SQLITE / MYSQL SCHEMA & DUMP',
      '-- Generated: ' + new Date().toISOString(),
      '',
      'CREATE TABLE IF NOT EXISTS users (',
      '    id VARCHAR(50) PRIMARY KEY,',
      '    username VARCHAR(50) NOT NULL UNIQUE,',
      '    name VARCHAR(100) NOT NULL,',
      '    role VARCHAR(20) NOT NULL DEFAULT "employee",',
      '    status VARCHAR(20) NOT NULL DEFAULT "active",',
      '    shift VARCHAR(20) NOT NULL DEFAULT "day",',
      '    is_online INTEGER NOT NULL DEFAULT 0,',
      '    phone VARCHAR(30),',
      '    performance_badge VARCHAR(50) DEFAULT "Standard",',
      '    total_score_boosted BIGINT DEFAULT 0,',
      '    total_earnings_ar BIGINT DEFAULT 0,',
      '    pending_advance_ar BIGINT DEFAULT 0',
      ');',
      '',
      'CREATE TABLE IF NOT EXISTS posts (',
      '    id VARCHAR(50) PRIMARY KEY,',
      '    employee_id VARCHAR(50) NOT NULL,',
      '    client_name VARCHAR(100) NOT NULL,',
      '    account_tag VARCHAR(100),',
      '    target_score BIGINT NOT NULL,',
      '    initial_score BIGINT NOT NULL,',
      '    current_score BIGINT NOT NULL,',
      '    final_score BIGINT,',
      '    remaining_score BIGINT NOT NULL,',
      '    status VARCHAR(30) NOT NULL,',
      '    shift_type VARCHAR(20) NOT NULL,',
      '    date DATE NOT NULL,',
      '    start_time TIME NOT NULL,',
      '    end_time TIME,',
      '    start_proof_url TEXT,',
      '    end_proof_url TEXT,',
      '    calculated_ar BIGINT DEFAULT 0,',
      '    notes TEXT,',
      '    created_at DATETIME NOT NULL',
      ');',
      '',
      'CREATE TABLE IF NOT EXISTS security_violations (',
      '    id VARCHAR(50) PRIMARY KEY,',
      '    employee_id VARCHAR(50) NOT NULL,',
      '    violation_type VARCHAR(50) NOT NULL,',
      '    description TEXT NOT NULL,',
      '    timestamp DATETIME NOT NULL,',
      '    resolved INTEGER DEFAULT 0',
      ');',
      '',
      'CREATE TABLE IF NOT EXISTS salary_advances (',
      '    id VARCHAR(50) PRIMARY KEY,',
      '    employee_id VARCHAR(50) NOT NULL,',
      '    amount_ar BIGINT NOT NULL,',
      '    reason TEXT NOT NULL,',
      '    request_date DATE NOT NULL,',
      '    status VARCHAR(20) DEFAULT "pending"',
      ');',
      '',
      '-- INSERT INITIAL USERS'
    ];

    this.users.forEach(u => {
      sqlStatements.push(
        `INSERT INTO users VALUES ('${u.id}', '${u.username}', '${u.name.replace(/'/g, "''")}', '${u.role}', '${u.status}', '${u.shift}', ${u.is_online ? 1 : 0}, '${u.phone}', '${u.performance_badge}', ${u.total_score_boosted}, ${u.total_earnings_ar}, ${u.pending_advance_ar});`
      );
    });

    sqlStatements.push('', '-- INSERT POST SESSIONS');
    this.posts.forEach(p => {
      sqlStatements.push(
        `INSERT INTO posts VALUES ('${p.id}', '${p.employee_id}', '${p.client_name.replace(/'/g, "''")}', '${p.account_tag}', ${p.target_score}, ${p.initial_score}, ${p.current_score}, ${p.final_score ?? 'NULL'}, ${p.remaining_score}, '${p.status}', '${p.shift_type}', '${p.date}', '${p.start_time}', ${p.end_time ? `'${p.end_time}'` : 'NULL'}, '[PROOF_BLOB]', '[PROOF_BLOB]', ${p.calculated_ar || 0}, '${(p.notes || '').replace(/'/g, "''")}', '${p.created_at}');`
      );
    });

    return sqlStatements.join('\n');
  }

  public exportDatabaseJson(): string {
    return JSON.stringify(
      {
        meta: {
          app: 'Delta Force Boosting Management System',
          version: '1.0.0',
          exported_at: new Date().toISOString(),
        },
        users: this.users,
        posts: this.posts,
        security_logs: this.securityLogs,
        salary_advances: this.advanceRequests,
        messages: this.messages,
      },
      null,
      2
    );
  }
}

export const db = new DeltaForceStore();

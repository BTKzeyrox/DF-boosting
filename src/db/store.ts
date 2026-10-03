import {
  User,
  PostSession,
  SecurityViolation,
  SalaryAdvanceRequest,
  ChatMessage,
  ShiftType,
  ClientContract,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_POSTS,
  INITIAL_SECURITY_LOGS,
  INITIAL_ADVANCE_REQUESTS,
  INITIAL_MESSAGES,
  AVAILABLE_CLIENT_CONTRACTS,
} from './initialData';

const STORAGE_KEYS = {
  USERS: 'df_users_v1',
  POSTS: 'df_posts_v1',
  CONTRACTS: 'df_contracts_v1',
  SECURITY_LOGS: 'df_sec_logs_v1',
  ADVANCES: 'df_advances_v1',
  MESSAGES: 'df_messages_v1',
  CURRENT_USER: 'df_current_user_v1',
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

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      this.users = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];

      const storedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
      this.posts = storedPosts ? JSON.parse(storedPosts) : [...INITIAL_POSTS];

      const storedContracts = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
      this.contracts = storedContracts ? JSON.parse(storedContracts) : [...AVAILABLE_CLIENT_CONTRACTS];

      const storedLogs = localStorage.getItem(STORAGE_KEYS.SECURITY_LOGS);
      this.securityLogs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_SECURITY_LOGS];

      const storedAdvances = localStorage.getItem(STORAGE_KEYS.ADVANCES);
      this.advanceRequests = storedAdvances ? JSON.parse(storedAdvances) : [...INITIAL_ADVANCE_REQUESTS];

      const storedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      this.messages = storedMessages ? JSON.parse(storedMessages) : [...INITIAL_MESSAGES];

      const storedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (storedCurrent) {
        const parsed = JSON.parse(storedCurrent);
        // refresh with fresh user data if previously logged in
        this.currentUser = this.users.find(u => u.id === parsed.id) || null;
      } else {
        // Start on login page by default
        this.currentUser = null;
      }
    } catch {
      this.users = [...INITIAL_USERS];
      this.posts = [...INITIAL_POSTS];
      this.contracts = [...AVAILABLE_CLIENT_CONTRACTS];
      this.securityLogs = [...INITIAL_SECURITY_LOGS];
      this.advanceRequests = [...INITIAL_ADVANCE_REQUESTS];
      this.messages = [...INITIAL_MESSAGES];
      this.currentUser = null;
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(this.posts));
      localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(this.contracts));
      localStorage.setItem(STORAGE_KEYS.SECURITY_LOGS, JSON.stringify(this.securityLogs));
      localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(this.advanceRequests));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(this.messages));
      if (this.currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  // --- AUTHENTICATION ---
  public login(username: string): { success: boolean; error?: string; user?: User } {
    const user = this.users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
      return { success: false, error: 'Identifiant invalide. Utilisateur introuvable.' };
    }

    if (user.status === 'blocked') {
      return { success: false, error: 'Access denied. Account is blocked.' };
    }

    user.is_online = true;
    this.currentUser = user;
    this.notify();
    return { success: true, user };
  }

  public logout(): void {
    if (this.currentUser) {
      const u = this.users.find(usr => usr.id === this.currentUser?.id);
      if (u) {
        u.is_online = false;
      }
      this.currentUser = null;
      this.notify();
    }
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

  public addUser(userData: Omit<User, 'id' | 'is_online' | 'total_score_boosted' | 'total_earnings_ar' | 'pending_advance_ar'>): { success: boolean; user: User } {
    const newUser: User = {
      ...userData,
      id: `user-emp-${Date.now()}`,
      is_online: false,
      total_score_boosted: 0,
      total_earnings_ar: 0,
      pending_advance_ar: 0,
    };
    this.users.push(newUser);
    this.notify();
    return { success: true, user: newUser };
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
    localStorage.clear();
    this.users = [...INITIAL_USERS];
    this.posts = [...INITIAL_POSTS];
    this.securityLogs = [...INITIAL_SECURITY_LOGS];
    this.advanceRequests = [...INITIAL_ADVANCE_REQUESTS];
    this.messages = [...INITIAL_MESSAGES];
    this.currentUser = this.users[0]; // Admin by default or null
    this.notify();
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

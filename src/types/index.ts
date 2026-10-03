export type UserRole = 'admin' | 'employee';
export type UserStatus = 'active' | 'blocked';
export type ShiftType = 'day' | 'night';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  shift: ShiftType; // 'day' (08:00 - 18:00) or 'night' (20:00 - 06:00)
  is_online: boolean;
  avatar_url: string;
  phone: string;
  cv_url: string;
  cv_data?: {
    rank: string;
    gameExperience: string;
    kdRatio: string;
    hardware: string;
    joinedDate: string;
    languages: string[];
    specialty: string;
  };
  performance_badge: 'Top Booster' | 'Elite' | 'Standard' | 'Under Watch';
  total_score_boosted: number;
  total_earnings_ar: number;
  pending_advance_ar: number;
}

export type PostStatus = 
  | 'idle'
  | 'pending_start'
  | 'active'
  | 'pending_end'
  | 'completed'
  | 'rejected'
  | 'force_released';

export interface PostSession {
  id: string;
  employee_id: string;
  employee_name: string;
  client_name: string;
  account_tag: string;
  target_score: number;
  initial_score: number;
  current_score: number;
  final_score?: number;
  remaining_score: number;
  status: PostStatus;
  shift_type: ShiftType;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time?: string; // HH:MM:SS
  post_number?: number;
  start_proof_url: string;
  start_proof_urls?: string[]; // 1 to 4 proof photos
  end_proof_url?: string;
  end_proof_urls?: string[]; // 1 to 4 proof photos
  rejection_reason?: string;
  calculated_ar?: number; // 1M score = 1,000 Ar
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ViolationType = 
  | 'score_inversion'
  | 'multi_post_attempt'
  | 'out_of_shift_confinement'
  | 'suspicious_screenshot';

export interface SecurityViolation {
  id: string;
  employee_id: string;
  employee_name: string;
  violation_type: ViolationType;
  description: string;
  timestamp: string;
  details: {
    initial_score?: number;
    attempted_score?: number;
    active_post_id?: string;
    client_name?: string;
    user_agent?: string;
  };
  resolved: boolean;
}

export type AdvanceStatus = 'pending' | 'approved' | 'rejected';

export interface SalaryAdvanceRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  amount_ar: number;
  reason: string;
  request_date: string;
  status: AdvanceStatus;
  admin_notes?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  recipient_id?: string; // or 'all' / 'admin'
  message: string;
  timestamp: string;
}

export interface ClientContract {
  id: string;
  post_number: number; // 1 to 20 for the 2x10 grid
  client_name: string;
  account_tag: string;
  game_mode: string;
  current_rank: string;
  target_rank: string;
  initial_score: number;
  target_score: number;
  recommended_shift: ShiftType | 'any';
  estimated_reward_ar: number;
  priority: 'Haute' | 'Normale' | 'Urgente';
  region_server: string;
}

export type DayStatus = 'objective_reached' | 'absent' | 'no_post' | 'test' | 'in_progress';

export interface DayCalendarRecord {
  date: string; // YYYY-MM-DD
  dayStatus: DayStatus;
  shifts: PostSession[];
  notes?: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'employee' | 'date' | 'client';
  dateStr?: string;
  employeeId?: string;
  clientName?: string;
}

import { pgTable, text, integer, boolean, timestamp, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'admin' | 'employee'
  status: text('status').notNull().default('active'), // 'active' | 'blocked'
  shift: text('shift').notNull().default('day'), // 'day' | 'night'
  isOnline: boolean('is_online').default(false),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  cvUrl: text('cv_url'),
  performanceBadge: text('performance_badge').default('Standard'),
  totalScoreBoosted: bigint('total_score_boosted', { mode: 'number' }).default(0),
  totalEarningsAr: integer('total_earnings_ar').default(0),
  pendingAdvanceAr: integer('pending_advance_ar').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const postSessions = pgTable('post_sessions', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  employeeName: text('employee_name').notNull(),
  clientName: text('client_name').notNull(),
  accountTag: text('account_tag').notNull(),
  targetScore: bigint('target_score', { mode: 'number' }).notNull(),
  initialScore: bigint('initial_score', { mode: 'number' }).notNull(),
  currentScore: bigint('current_score', { mode: 'number' }).notNull(),
  remainingScore: bigint('remaining_score', { mode: 'number' }).notNull(),
  finalScore: bigint('final_score', { mode: 'number' }),
  status: text('status').notNull(), // 'pending_start' | 'active' | 'pending_end' | 'validated' | 'rejected'
  shiftType: text('shift_type').notNull(), // 'day' | 'night'
  date: text('date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  startProofUrl: text('start_proof_url').notNull(),
  endProofUrl: text('end_proof_url'),
  calculatedAr: integer('calculated_ar'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const securityViolations = pgTable('security_violations', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  employeeName: text('employee_name').notNull(),
  violationType: text('violation_type').notNull(), // 'score_inversion' | 'multi_post_attempt'
  description: text('description').notNull(),
  timestamp: text('timestamp').notNull(),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const salaryAdvances = pgTable('salary_advances', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  employeeName: text('employee_name').notNull(),
  amountAr: integer('amount_ar').notNull(),
  reason: text('reason').notNull(),
  requestDate: text('request_date').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(), // 'admin' | 'employee'
  recipientId: text('recipient_id').notNull(),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

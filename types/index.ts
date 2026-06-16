export type LineStatus = 'open' | 'closed' | 'resolved';

export interface CreateLineInput {
  title: string;
  description?: string;
  overUnderValue: number; // in minutes — also sets the timer duration
}
export type BetSide = 'over' | 'under';
export type ResolvedOutcome = BetSide | null;

export interface User {
  id: string;
  username: string;
  inviteToken: string | null;
}

export interface InviteLink {
  id: string;
  token: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  usedCount: number;
}

export interface Line {
  id: string;
  title: string;
  description: string;
  overUnderValue: number;
  timerDurationMs: number;
  createdBy: string;
  createdAt: Date;
  closesAt: Date;
  status: LineStatus;
  resolvedOutcome: ResolvedOutcome;
  resolvedBy: string | null;
  resolvedAt: Date | null;
}

export interface Bet {
  id: string;
  lineId: string;
  userId: string;
  username: string;
  side: BetSide;
  placedAt: Date;
}

export interface BetSummary {
  lineId: string;
  overCount: number;
  underCount: number;
  totalBets: number;
  userBet: Bet | null;
}

export type LineWithBets = Line & {
  bets: Bet[];
  summary: BetSummary;
};

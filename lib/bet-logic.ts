import type { Bet, BetSummary, Line, LineStatus } from '../types';

export function getLineStatus(line: Line, now: Date = new Date()): LineStatus {
  if (line.status === 'resolved') return 'resolved';
  if (line.status === 'closed') return 'closed';
  return now >= line.closesAt ? 'closed' : 'open';
}

export function canPlaceBet(
  line: Line,
  userId: string,
  existingBets: Bet[],
  now: Date = new Date(),
): { allowed: boolean; reason?: string } {
  const status = getLineStatus(line, now);

  if (status !== 'open') {
    return { allowed: false, reason: 'Betting is closed for this line.' };
  }

  const alreadyBet = existingBets.some((b) => b.lineId === line.id && b.userId === userId);
  if (alreadyBet) {
    return { allowed: false, reason: 'You have already placed a bet on this line.' };
  }

  return { allowed: true };
}

export function canResolve(
  line: Line,
  now: Date = new Date(),
): { allowed: boolean; reason?: string } {
  if (line.status === 'resolved') {
    return { allowed: false, reason: 'This line has already been resolved.' };
  }

  const status = getLineStatus(line, now);
  if (status === 'open') {
    return { allowed: false, reason: 'Betting is still open — timer has not expired yet.' };
  }

  return { allowed: true };
}

export function computeBetSummary(line: Line, bets: Bet[], userId: string): BetSummary {
  const lineBets = bets.filter((b) => b.lineId === line.id);
  const overCount = lineBets.filter((b) => b.side === 'over').length;
  const underCount = lineBets.filter((b) => b.side === 'under').length;
  const userBet = lineBets.find((b) => b.userId === userId) ?? null;

  return {
    lineId: line.id,
    overCount,
    underCount,
    totalBets: lineBets.length,
    userBet,
  };
}

export function getWinners(line: Line, bets: Bet[]): Bet[] {
  if (line.status !== 'resolved' || line.resolvedOutcome === null) {
    return [];
  }

  return bets.filter((b) => b.lineId === line.id && b.side === line.resolvedOutcome);
}

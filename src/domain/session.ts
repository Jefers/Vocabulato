import type { Direction, Grade, PracticeSession, VocabularyDeck } from './types';

export function createSession(_deck: VocabularyDeck, direction: Direction): PracticeSession {
  return { direction, gradedAttemptIds: [], stats: { seen: 0, correct: 0, wrong: 0, later: 0 } };
}

export function nextCard(session: PracticeSession, deck: VocabularyDeck, random = Math.random) {
  if (!deck.cards.length) return { session, card: undefined };
  const candidates = deck.cards.filter((card) => card.id !== session.lastCardId);
  const pool = candidates.length ? candidates : deck.cards;
  const card = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  const nextSession: PracticeSession = {
    ...session,
    activeCardId: card.id,
    activeAttemptId: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    lastCardId: card.id
  };
  return { session: nextSession, card };
}

export function gradeAttempt(session: PracticeSession, grade: Grade): PracticeSession {
  if (!session.activeAttemptId || session.gradedAttemptIds.includes(session.activeAttemptId)) return session;
  const stats = { ...session.stats, seen: session.stats.seen + 1 };
  if (grade === 'correct') stats.correct += 1;
  if (grade === 'wrong') stats.wrong += 1;
  if (grade === 'later') stats.later += 1;
  return { ...session, stats, gradedAttemptIds: [...session.gradedAttemptIds, session.activeAttemptId] };
}

export function flipDirection(session: PracticeSession): PracticeSession {
  return { ...session, direction: session.direction === 'source-to-target' ? 'target-to-source' : 'source-to-target', activeCardId: undefined, activeAttemptId: undefined };
}

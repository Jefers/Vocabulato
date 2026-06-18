import { describe, expect, it } from 'vitest';
import { createSession, gradeAttempt, nextCard, flipDirection } from '../../src/domain/session';
import type { VocabularyDeck } from '../../src/domain/types';

const deck: VocabularyDeck = { version: 1, name: 'Tiny', sourceLanguage: 'English', targetLanguage: 'Thai', cards: [
  { id: 'a', source: 'Hello', target: 'สวัสดี', phonetic: 'sa-wat-dee' },
  { id: 'b', source: 'Thanks', target: 'ขอบคุณ', phonetic: 'khop-khun' },
  { id: 'c', source: 'Water', target: 'น้ำ', phonetic: 'naam' }
]};

describe('practice sessions', () => {
  it('does not immediately repeat cards when alternatives exist', () => {
    let session = createSession(deck, 'source-to-target');
    const first = nextCard(session, deck, () => 0.01);
    session = first.session;
    const second = nextCard(session, deck, () => 0.01);
    expect(first.card?.id).toBe('a');
    expect(second.card?.id).not.toBe(first.card?.id);
  });

  it('grades each attempt idempotently', () => {
    let session = createSession(deck, 'source-to-target');
    session = nextCard(session, deck, () => 0.1).session;
    const once = gradeAttempt(session, 'correct');
    const twice = gradeAttempt(once, 'correct');
    expect(twice.stats.correct).toBe(1);
    expect(twice.stats.seen).toBe(1);
  });

  it('flips direction and resets active attempt without losing stats', () => {
    let session = createSession(deck, 'source-to-target');
    session = gradeAttempt(nextCard(session, deck, () => 0.1).session, 'wrong');
    const flipped = flipDirection(session);
    expect(flipped.direction).toBe('target-to-source');
    expect(flipped.activeCardId).toBeUndefined();
    expect(flipped.stats.seen).toBe(1);
  });
});

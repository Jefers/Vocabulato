export type Direction = 'source-to-target' | 'target-to-source';
export type Grade = 'correct' | 'wrong' | 'later';

export interface VocabularyCard {
  id: string;
  source: string;
  target: string;
  phonetic?: string;
  notes?: string;
}

export interface VocabularyDeck {
  version: 1;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  cards: VocabularyCard[];
}

export interface PracticeSession {
  direction: Direction;
  activeCardId?: string;
  activeAttemptId?: string;
  lastCardId?: string;
  gradedAttemptIds: string[];
  stats: {
    seen: number;
    correct: number;
    wrong: number;
    later: number;
  };
}

export interface AppSnapshot {
  deck: VocabularyDeck;
  session: PracticeSession;
  theme: 'dark' | 'light' | 'system';
}

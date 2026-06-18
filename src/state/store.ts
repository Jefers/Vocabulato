import { createSession } from '../domain/session';
import type { AppSnapshot, Direction, VocabularyDeck } from '../domain/types';
import { makeCardId } from '../domain/csv';

export const STORAGE_KEY = 'vocabulato_state_v1';
export const LEGACY_KEY = 'vocabulator_vocabulary';

export function migrateStoredDeck(raw: string): AppSnapshot {
  const parsed = JSON.parse(raw);
  if (parsed.deck && parsed.session) return parsed as AppSnapshot;
  const name = parsed.currentSetName || 'Imported Set';
  const direction: Direction = parsed.reversed ? 'target-to-source' : 'source-to-target';
  const deck: VocabularyDeck = {
    version: 1,
    name,
    sourceLanguage: parsed.sourceLanguage || 'Source',
    targetLanguage: parsed.targetLanguage || 'Target',
    cards: (parsed.vocabulary || []).map((word: {source:string; target:string; phonetic?: string}, index: number) => ({
      id: makeCardId(name, word.source, index),
      source: word.source,
      target: word.target,
      ...(word.phonetic ? { phonetic: word.phonetic } : {})
    }))
  };
  return { deck, session: createSession(deck, direction), theme: 'system' };
}

export function saveSnapshot(snapshot: AppSnapshot, storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadSnapshot(storage = window.localStorage): AppSnapshot | undefined {
  const current = storage.getItem(STORAGE_KEY);
  if (current) return migrateStoredDeck(current);
  const legacy = storage.getItem(LEGACY_KEY);
  if (legacy) {
    const migrated = migrateStoredDeck(legacy);
    saveSnapshot(migrated, storage);
    return migrated;
  }
  return undefined;
}

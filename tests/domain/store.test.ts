import { describe, expect, it } from 'vitest';
import { migrateStoredDeck, STORAGE_KEY } from '../../src/state/store';

describe('store migration', () => {
  it('migrates the legacy localStorage vocabulary payload', () => {
    const legacy = JSON.stringify({ vocabulary: [{ source: 'Hello', target: 'สวัสดี', phonetic: 'sa-wat-dee' }], sourceLanguage: 'English', targetLanguage: 'Thai', phoneticColumn: true, currentSetName: 'Imported Set', reversed: true });
    const migrated = migrateStoredDeck(legacy);
    expect(STORAGE_KEY).toBe('vocabulato_state_v1');
    expect(migrated.deck.name).toBe('Imported Set');
    expect(migrated.deck.cards[0].id).toBe('imported-set-hello');
    expect(migrated.session.direction).toBe('target-to-source');
  });
});

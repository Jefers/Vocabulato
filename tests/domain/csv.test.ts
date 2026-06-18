import { describe, expect, it } from 'vitest';
import { parseVocabularyCsv, vocabularyToCsv } from '../../src/domain/csv';

describe('parseVocabularyCsv', () => {
  it('parses legacy 4-column vocabulary CSV with language labels and phonetics', () => {
    const deck = parseVocabularyCsv('index,English,Thai,Phonetic\n1,Hello,สวัสดี,sa-wat-dee\n2,Thank you,ขอบคุณ,khop-khun', 'thai-basics.csv');
    expect(deck.name).toBe('thai basics');
    expect(deck.sourceLanguage).toBe('English');
    expect(deck.targetLanguage).toBe('Thai');
    expect(deck.cards).toHaveLength(2);
    expect(deck.cards[0]).toMatchObject({ source: 'Hello', target: 'สวัสดี', phonetic: 'sa-wat-dee' });
  });

  it('supports quoted commas instead of splitting cells naively', () => {
    const deck = parseVocabularyCsv('index,English,Thai,Phonetic\n1,"Yes, please",ครับ,"khrap, polite"', 'polite.csv');
    expect(deck.cards[0].source).toBe('Yes, please');
    expect(deck.cards[0].phonetic).toBe('khrap, polite');
  });

  it('exports a deck back to valid CSV with escaped cells', () => {
    const deck = parseVocabularyCsv('index,English,Thai,Phonetic\n1,"Yes, please",ครับ,"khrap, polite"', 'polite.csv');
    expect(vocabularyToCsv(deck)).toContain('"Yes, please"');
    expect(vocabularyToCsv(deck)).toContain('"khrap, polite"');
  });
});

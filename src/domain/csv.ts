import type { VocabularyDeck } from './types';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card';
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function nameFromFile(fileName = 'vocabulary'): string {
  return fileName.split('/').pop()!.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported Set';
}

export function makeCardId(deckName: string, source: string, index = 0): string {
  return `${slugify(deckName)}-${slugify(source)}${index ? `-${index + 1}` : ''}`;
}

export function parseVocabularyCsv(text: string, fileName?: string): VocabularyDeck {
  const rows = parseRows(text.trim());
  if (rows.length < 2) throw new Error('CSV must have a header row and at least one vocabulary row');
  const headers = rows[0];
  if (headers.length < 3) throw new Error('CSV needs at least index, source, target columns');
  const deckName = nameFromFile(fileName);
  const cards = rows.slice(1)
    .filter((cells) => cells.length >= 3 && (cells[1] || cells[2]))
    .map((cells, index) => ({
      id: makeCardId(deckName, cells[1], index),
      source: cells[1] ?? '',
      target: cells[2] ?? '',
      ...(cells[3] ? { phonetic: cells[3] } : {})
    }));
  if (!cards.length) throw new Error('No vocabulary rows found');
  return { version: 1, name: deckName, sourceLanguage: headers[1] || 'Source', targetLanguage: headers[2] || 'Target', cards };
}

function escapeCell(value = ''): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function vocabularyToCsv(deck: VocabularyDeck): string {
  const header = ['index', deck.sourceLanguage, deck.targetLanguage, 'Phonetic'].map(escapeCell).join(',');
  const rows = deck.cards.map((card, index) => [String(index + 1), card.source, card.target, card.phonetic ?? ''].map(escapeCell).join(','));
  return [header, ...rows].join('\n');
}

import type { VocabularyDeck } from '../domain/types';

export async function loadSampleDeck(): Promise<VocabularyDeck> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/sample-vocabulary.json`);
  if (!response.ok) throw new Error('Could not load sample vocabulary');
  return response.json() as Promise<VocabularyDeck>;
}

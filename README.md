# Vocabulato

Offline-first vocabulary flashcards for CSV and JSON decks.

Live app: https://jefers.github.io/Vocabulato/

## Features

- Installable PWA with manifest, icons, and service worker.
- Mobile-first flashcard UI with light/dark mode.
- CSV import compatible with the legacy app: `index,SourceLanguage,TargetLanguage[,Phonetic]`.
- JSON deck import/export and CSV export.
- Local-only browser storage; no backend or secrets.
- Tested CSV parsing, session behavior, grading idempotence, and legacy storage migration.

## Development

```bash
npm install
npm run check
npm run dev
```

GitHub Pages is configured for the `/Vocabulato/` project path.

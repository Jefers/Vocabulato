import './styles.css';
import { parseVocabularyCsv, vocabularyToCsv } from './domain/csv';
import { createSession, flipDirection, gradeAttempt, nextCard } from './domain/session';
import type { AppSnapshot, Grade, VocabularyCard, VocabularyDeck } from './domain/types';
import { loadSampleDeck } from './data/loadVocabulary';
import { loadSnapshot, saveSnapshot } from './state/store';

type AppView = 'game' | 'tools';
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const emptyDeck: VocabularyDeck = { version: 1, name: 'No deck loaded', sourceLanguage: 'Source', targetLanguage: 'Target', cards: [] };
let snapshot: AppSnapshot = loadSnapshot() ?? { deck: emptyDeck, session: createSession(emptyDeck, 'source-to-target'), theme: 'system' };
let currentCard: VocabularyCard | undefined;
let revealed = false;
let view: AppView = 'game';
let deferredInstallPrompt: BeforeInstallPromptEvent | undefined;
let installAvailable = false;

const app = document.querySelector<HTMLDivElement>('#app')!;
const INSTALL_DISMISSED_KEY = 'vocabulato_install_dismissed_v1';

function labels() {
  const forward = snapshot.session.direction === 'source-to-target';
  return {
    from: forward ? snapshot.deck.sourceLanguage : snapshot.deck.targetLanguage,
    to: forward ? snapshot.deck.targetLanguage : snapshot.deck.sourceLanguage,
    prompt: currentCard ? (forward ? currentCard.source : currentCard.target) : (snapshot.deck.cards.length ? 'Ready to practise?' : 'Load a deck'),
    answer: currentCard ? (forward ? currentCard.target : currentCard.source) : '',
    phonetic: currentCard?.phonetic ?? ''
  };
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function showInstallCard() {
  return !isStandalone() && localStorage.getItem(INSTALL_DISMISSED_KEY) !== 'yes';
}

function persist() { saveSnapshot(snapshot); }

function setDeck(deck: VocabularyDeck) {
  snapshot = { ...snapshot, deck, session: createSession(deck, 'source-to-target') };
  currentCard = undefined;
  revealed = false;
  view = 'game';
  persist();
  render();
}

function drawNext() {
  const result = nextCard(snapshot.session, snapshot.deck);
  snapshot = { ...snapshot, session: result.session };
  currentCard = result.card;
  revealed = false;
  persist();
  render();
}

function grade(gradeValue: Grade) {
  snapshot = { ...snapshot, session: gradeAttempt(snapshot.session, gradeValue) };
  persist();
  drawNext();
}

async function importFile(file: File) {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    setDeck(JSON.parse(text) as VocabularyDeck);
  } else {
    setDeck(parseVocabularyCsv(text, file.name));
  }
}

function download(name: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function applyTheme() {
  const saved = localStorage.getItem('vocabulato_theme') as 'dark' | 'light' | null;
  document.documentElement.dataset.theme = saved ?? 'dark';
}

function headerTemplate() {
  return `
    <header class="hero">
      <div class="title-lockup">
        <div class="brand-mark" aria-hidden="true"><img src="${import.meta.env.BASE_URL}icons/icon.svg" alt="" /></div>
        <div>
          <p class="eyebrow">Offline vocabulary trainer</p>
          <h1>Vocabulato</h1>
          <p class="tagline">Small words. Big fluency.</p>
        </div>
      </div>
      <button id="settingsBtn" class="icon-btn" type="button" aria-label="Open deck tools and settings">⚙</button>
    </header>`;
}

function dashboardTemplate(deck: VocabularyDeck, accuracy: number) {
  const stats = snapshot.session.stats;
  return `
    <section class="panel dashboard" aria-labelledby="deckTitle">
      <div>
        <p class="eyebrow">Current deck</p>
        <h2 id="deckTitle">${deck.name}</h2>
        <p>${deck.sourceLanguage} ⇄ ${deck.targetLanguage}</p>
      </div>
      <div class="stats">
        <span><strong>${deck.cards.length}</strong><small>cards</small></span>
        <span><strong>${stats.seen}</strong><small>seen</small></span>
        <span><strong>${accuracy}%</strong><small>accuracy</small></span>
      </div>
    </section>`;
}

function installTemplate() {
  if (!showInstallCard()) return '';
  const canPrompt = installAvailable && deferredInstallPrompt;
  return `
    <section class="install-card" aria-label="Install Vocabulato">
      <div><strong>Install Vocabulato</strong><span>${canPrompt ? 'Add it to your home screen for offline practice.' : 'Use your browser Share/Add to Home Screen menu if no prompt appears.'}</span></div>
      <div class="install-actions">
        <button id="installBtn" class="primary small" type="button">${canPrompt ? 'Install' : 'How to install'}</button>
        <button id="dismissInstallBtn" class="ghost small" type="button">Not now</button>
      </div>
    </section>`;
}

function gameTemplate() {
  const deck = snapshot.deck;
  const stats = snapshot.session.stats;
  const l = labels();
  const accuracy = stats.seen ? Math.round((stats.correct / stats.seen) * 100) : 0;
  return `
    ${headerTemplate()}
    <main class="shell game-shell">
      ${installTemplate()}
      <section class="card-panel" aria-live="polite">
        <div class="direction"><span>${l.from}</span><button id="flipBtn" type="button">Flip ⇄</button><span>${l.to}</span></div>
        <article class="study-card ${revealed ? 'revealed' : ''}">
          <p class="eyebrow">${revealed ? 'Answer' : 'Prompt'}</p>
          <h2>${revealed ? l.answer : l.prompt}</h2>
          ${revealed && l.phonetic ? `<p class="phonetic">${l.phonetic}</p>` : ''}
        </article>
        <div class="actions">
          ${currentCard && !revealed ? '<button id="revealBtn" class="primary" type="button">Reveal answer</button>' : ''}
          ${currentCard && revealed ? '<button id="wrongBtn" type="button">Needs work</button><button id="laterBtn" type="button">Later</button><button id="correctBtn" class="primary" type="button">Got it</button>' : ''}
          ${!currentCard ? '<button id="startBtn" class="primary" type="button">Start / resume</button>' : '<button id="nextBtn" class="ghost" type="button">Skip</button>'}
        </div>
      </section>
      ${dashboardTemplate(deck, accuracy)}
    </main>`;
}

function toolsTemplate() {
  const deck = snapshot.deck;
  const theme = document.documentElement.dataset.theme === 'light' ? 'Light / whiteboard' : 'Dark / blackboard';
  return `
    ${headerTemplate()}
    <main class="shell tools-shell">
      <section class="panel tools-screen">
        <div class="screen-head">
          <div><p class="eyebrow">Settings</p><h2>Deck tools</h2><p>Import, export, theme, and install settings.</p></div>
          <button id="backBtn" class="ghost" type="button">← Back to game</button>
        </div>
        <div class="tool-grid">
          <button id="sampleBtn" type="button">📗 Load sample deck</button>
          <label class="file-label">📥 Import CSV/JSON <input id="fileInput" type="file" accept=".csv,.json,text/csv,application/json" /></label>
          <button id="exportJsonBtn" type="button" ${deck.cards.length ? '' : 'disabled'}>📦 Export JSON</button>
          <button id="exportCsvBtn" type="button" ${deck.cards.length ? '' : 'disabled'}>📄 Export CSV</button>
          <button id="clearBtn" class="danger" type="button">🧽 Clear local data</button>
        </div>
        <div class="settings-row">
          <div><strong>Theme</strong><span>${theme}</span></div>
          <button id="themeBtn" type="button">Toggle theme</button>
        </div>
        <div class="settings-row">
          <div><strong>PWA install prompt</strong><span>${showInstallCard() ? 'Enabled' : 'Dismissed for this browser'}</span></div>
          <button id="resetInstallBtn" type="button">Show install prompt again</button>
        </div>
        <p class="hint">CSV format: <code>index,${deck.sourceLanguage},${deck.targetLanguage},Phonetic</code>. Data stays in this browser unless you export it.</p>
      </section>
    </main>`;
}

function render() {
  app.innerHTML = view === 'tools' ? toolsTemplate() : gameTemplate();
  bind();
}

async function promptInstall() {
  if (!deferredInstallPrompt) {
    alert('To install Vocabulato: on iPhone/iPad use Share → Add to Home Screen. In Chrome or Edge, use the install icon in the address bar or browser menu.');
    return;
  }
  await deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') localStorage.setItem(INSTALL_DISMISSED_KEY, 'yes');
  deferredInstallPrompt = undefined;
  installAvailable = false;
  render();
}

function bind() {
  document.getElementById('settingsBtn')?.addEventListener('click', () => { view = view === 'tools' ? 'game' : 'tools'; render(); });
  document.getElementById('backBtn')?.addEventListener('click', () => { view = 'game'; render(); });
  document.getElementById('themeBtn')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('vocabulato_theme', next); applyTheme(); render();
  });
  document.getElementById('installBtn')?.addEventListener('click', promptInstall);
  document.getElementById('dismissInstallBtn')?.addEventListener('click', () => { localStorage.setItem(INSTALL_DISMISSED_KEY, 'yes'); render(); });
  document.getElementById('resetInstallBtn')?.addEventListener('click', () => { localStorage.removeItem(INSTALL_DISMISSED_KEY); view = 'game'; render(); });
  document.getElementById('startBtn')?.addEventListener('click', drawNext);
  document.getElementById('nextBtn')?.addEventListener('click', drawNext);
  document.getElementById('revealBtn')?.addEventListener('click', () => { revealed = true; render(); });
  document.getElementById('correctBtn')?.addEventListener('click', () => grade('correct'));
  document.getElementById('wrongBtn')?.addEventListener('click', () => grade('wrong'));
  document.getElementById('laterBtn')?.addEventListener('click', () => grade('later'));
  document.getElementById('flipBtn')?.addEventListener('click', () => { snapshot = { ...snapshot, session: flipDirection(snapshot.session) }; currentCard = undefined; revealed = false; persist(); render(); });
  document.getElementById('sampleBtn')?.addEventListener('click', async () => setDeck(await loadSampleDeck()));
  document.getElementById('exportJsonBtn')?.addEventListener('click', () => download(`${snapshot.deck.name}.json`, JSON.stringify(snapshot.deck, null, 2), 'application/json'));
  document.getElementById('exportCsvBtn')?.addEventListener('click', () => download(`${snapshot.deck.name}.csv`, vocabularyToCsv(snapshot.deck), 'text/csv'));
  document.getElementById('clearBtn')?.addEventListener('click', () => { if (confirm('Clear local Vocabulato data?')) setDeck(emptyDeck); });
  document.getElementById('fileInput')?.addEventListener('change', async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) await importFile(file);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && view === 'tools') { view = 'game'; render(); }
  if (event.key === ' ' && currentCard && !revealed && view === 'game') { event.preventDefault(); revealed = true; render(); }
  if (event.key === 'ArrowRight' && currentCard && revealed && view === 'game') grade('correct');
  if (event.key === 'ArrowLeft' && currentCard && revealed && view === 'game') grade('wrong');
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
  installAvailable = true;
  render();
});

window.addEventListener('appinstalled', () => {
  localStorage.setItem(INSTALL_DISMISSED_KEY, 'yes');
  deferredInstallPrompt = undefined;
  installAvailable = false;
  render();
});

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, { scope: import.meta.env.BASE_URL })
    .then((registration) => registration.update())
    .catch(console.warn);
}

applyTheme();
render();
if (document.readyState === 'loading') window.addEventListener('load', registerServiceWorker, { once: true });
else registerServiceWorker();

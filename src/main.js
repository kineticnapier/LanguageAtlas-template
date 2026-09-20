import {
  articleHash,
  articleIdFromHash,
  copyCode,
  highlightCSharp
} from './article-ui.js';
import { matchesArticle } from './article-search.js';
import { loadLocalizedContent } from './content-loader.js';
import { resolveLocale, uiText, withLangParam } from './i18n.js';
import {
  TOPIC_DEFINITIONS,
  buildDiscoverySearch,
  deriveArticleTopics,
  filterArticlesByTopics,
  filterArticlesByTypes,
  parseDiscoveryState,
  pushRecent,
  sortArticles,
  toggleId
} from './list-discovery.js';
import {
  renderTranslationBadge,
  renderTranslationBanner,
  typeLabel
} from './translation-ui.js';
import { renderWikiText } from './wiki-links.js';

const LOCALE_STORAGE_KEY = 'csharp-atlas-locale';
const FAVORITES_STORAGE_KEY = 'csharp-atlas-favorites';
const RECENT_STORAGE_KEY = 'csharp-atlas-recent';

let currentLocale = 'ja';
let currentQuery = '';
let currentItems = [];
let allItems = [];
let selectedTypes = new Set();
let selectedTopics = new Set();
let sortMode = 'recommended';
let favoritesOnly = false;
let recentOnly = false;
let favoriteIds = new Set();
let recentIds = [];

const homeView = document.getElementById('homeView');
const detailView = document.getElementById('detailView');
const cards = document.getElementById('cards');
const empty = document.getElementById('empty');
const listTitle = document.getElementById('listTitle');
const resultCount = document.getElementById('resultCount');
const searchInput = document.getElementById('searchInput');
const detailContent = document.getElementById('detailContent');
const languageSelect = document.getElementById('languageSelect');
const topicFilters = document.getElementById('topicFilters');
const sortSelect = document.getElementById('sortSelect');
const favoritesOnlyButton = document.getElementById('favoritesOnlyButton');
const recentOnlyButton = document.getElementById('recentOnlyButton');
const selectedFilters = document.getElementById('selectedFilters');
const selectedFilterChips = document.getElementById('selectedFilterChips');
const clearFiltersButton = document.getElementById('clearFiltersButton');

async function initialize() {
  currentLocale = resolveLocale({
    search: window.location.search,
    storedLocale: readStoredLocale()
  });
  const discoveryState = parseDiscoveryState(window.location.search);
  currentQuery = discoveryState.query;
  selectedTypes = discoveryState.types;
  selectedTopics = discoveryState.topics;
  sortMode = discoveryState.sort;
  favoriteIds = new Set(readStoredList(FAVORITES_STORAGE_KEY));
  recentIds = readStoredList(RECENT_STORAGE_KEY);

  applyStaticUi();
  searchInput.value = currentQuery;
  sortSelect.value = sortMode;
  syncTypeButtons();
  syncPersonalFilterButtons();

  const { articles } = await loadLocalizedContent({
    fetchJson: loadJson,
    locale: currentLocale
  });
  allItems = articles.map(item => ({ ...item, topics: deriveArticleTopics(item) }));

  const ids = new Set();
  for (const item of allItems) {
    const id = item.id.toLowerCase();
    if (ids.has(id)) throw new Error(uiText(currentLocale, 'duplicateId', item.id));
    ids.add(id);
  }

  renderTopicFilters();
  loadItems();
  syncRouteFromHash();
}

function readStoredLocale() {
  try {
    return window.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeLocale(locale) {
  try {
    window.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The URL still preserves the selected locale when storage is unavailable.
  }
}

function readStoredList(key) {
  try {
    const value = JSON.parse(window.localStorage?.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function storeList(key, values) {
  try {
    window.localStorage?.setItem(key, JSON.stringify([...values]));
  } catch {
    // Personal navigation features remain optional when storage is unavailable.
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(uiText(currentLocale, 'contentLoadFailed', path));
  return response.json();
}

function applyStaticUi() {
  document.documentElement.lang = currentLocale;
  languageSelect.value = currentLocale;
  document.getElementById('languageLabel').textContent = uiText(currentLocale, 'language');
  document.getElementById('heroEyebrow').textContent = uiText(currentLocale, 'heroEyebrow');
  document.getElementById('heroTitle1').textContent = uiText(currentLocale, 'heroTitle1');
  document.getElementById('heroTitle2').textContent = uiText(currentLocale, 'heroTitle2');
  document.getElementById('heroDescription').textContent = uiText(currentLocale, 'heroDescription');
  searchInput.placeholder = uiText(currentLocale, 'searchPlaceholder');
  document.getElementById('searchButton').textContent = uiText(currentLocale, 'searchButton');
  document.getElementById('asideTitle').textContent = uiText(currentLocale, 'categories');
  document.getElementById('backButton').textContent = uiText(currentLocale, 'back');
  document.getElementById('topicFilterLabel').textContent = uiText(currentLocale, 'topics');
  document.getElementById('sortLabel').textContent = uiText(currentLocale, 'sort');
  document.getElementById('selectedFiltersLabel').textContent = uiText(currentLocale, 'activeFilters');
  clearFiltersButton.textContent = uiText(currentLocale, 'clearFilters');
  favoritesOnlyButton.textContent = uiText(currentLocale, 'favoritesOnly');
  recentOnlyButton.textContent = uiText(currentLocale, 'recentOnly');
  empty.textContent = uiText(currentLocale, 'noResults');

  const sortLabels = {
    recommended: 'sortRecommended',
    title: 'sortTitle',
    recent: 'sortRecent',
    favorites: 'sortFavorites'
  };
  for (const option of sortSelect.options) {
    option.textContent = uiText(currentLocale, sortLabels[option.value] ?? 'sortRecommended');
  }

  document.querySelectorAll('[data-nav-type]').forEach(button => {
    button.textContent = typeLabel(button.dataset.navType, currentLocale);
  });
  document.querySelectorAll('[data-type]').forEach(button => {
    button.textContent = typeLabel(button.dataset.type, currentLocale);
  });
}

function renderTopicFilters() {
  const locale = currentLocale === 'en' ? 'en' : 'ja';
  topicFilters.innerHTML = TOPIC_DEFINITIONS.map(topic => {
    const count = allItems.filter(item => item.topics.includes(topic.id)).length;
    return `<button type="button" class="topic-filter${selectedTopics.has(topic.id) ? ' active' : ''}" data-topic="${topic.id}" aria-pressed="${selectedTopics.has(topic.id)}">${escapeHtml(topic.labels[locale])}<span>${count}</span></button>`;
  }).join('');

  topicFilters.querySelectorAll('[data-topic]').forEach(button => {
    button.addEventListener('click', () => {
      selectedTopics = toggleId(selectedTopics, button.dataset.topic);
      renderTopicFilters();
      loadItems();
    });
  });
}

function syncTypeButtons() {
  document.querySelectorAll('[data-type]').forEach(button => {
    if (button.dataset.chapter) return;
    const type = button.dataset.type;
    const active = type === 'all' ? selectedTypes.size === 0 : selectedTypes.has(type);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function syncPersonalFilterButtons() {
  favoritesOnlyButton.classList.toggle('active', favoritesOnly);
  favoritesOnlyButton.setAttribute('aria-pressed', String(favoritesOnly));
  recentOnlyButton.classList.toggle('active', recentOnly);
  recentOnlyButton.setAttribute('aria-pressed', String(recentOnly));
}

function renderSelectedFilters() {
  const locale = currentLocale === 'en' ? 'en' : 'ja';
  const chips = [];

  for (const type of selectedTypes) {
    chips.push({ kind: 'type', value: type, label: typeLabel(type, currentLocale) });
  }
  for (const topicId of selectedTopics) {
    const topic = TOPIC_DEFINITIONS.find(candidate => candidate.id === topicId);
    if (topic) chips.push({ kind: 'topic', value: topicId, label: topic.labels[locale] });
  }
  if (favoritesOnly) chips.push({ kind: 'favorites', value: '', label: uiText(currentLocale, 'favoritesOnly') });
  if (recentOnly) chips.push({ kind: 'recent', value: '', label: uiText(currentLocale, 'recentOnly') });

  selectedFilters.hidden = chips.length === 0;
  selectedFilterChips.innerHTML = chips.map(chip => `
    <button type="button" class="selected-filter-chip" data-filter-kind="${escapeHtml(chip.kind)}" data-filter-value="${escapeHtml(chip.value)}">${escapeHtml(chip.label)}</button>
  `).join('');

  selectedFilterChips.querySelectorAll('[data-filter-kind]').forEach(button => {
    button.addEventListener('click', () => {
      const kind = button.dataset.filterKind;
      const value = button.dataset.filterValue;
      if (kind === 'type') selectedTypes.delete(value);
      if (kind === 'topic') selectedTopics.delete(value);
      if (kind === 'favorites') favoritesOnly = false;
      if (kind === 'recent') recentOnly = false;
      syncTypeButtons();
      syncPersonalFilterButtons();
      if (kind === 'topic') renderTopicFilters();
      loadItems();
    });
  });
}

function syncDiscoveryUrl() {
  const search = buildDiscoverySearch({
    query: currentQuery,
    types: selectedTypes,
    topics: selectedTopics,
    sort: sortMode
  }, window.location.search);
  const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

function loadItems() {
  const words = currentQuery.toLowerCase().split(/\s+/).filter(Boolean);
  let items = filterArticlesByTypes(allItems, selectedTypes).filter(item => {
    return !words.length || words.every(word => matchesArticle(item, word));
  });

  items = filterArticlesByTopics(items, selectedTopics);
  if (favoritesOnly) items = items.filter(item => favoriteIds.has(item.id));
  if (recentOnly) {
    const recentSet = new Set(recentIds);
    items = items.filter(item => recentSet.has(item.id));
  }

  currentItems = sortArticles(items, sortMode, { recentIds, favoriteIds });
  syncDiscoveryUrl();
  renderSelectedFilters();
  renderCards();
}

function renderCards() {
  cards.innerHTML = currentItems.map(item => {
    const favorite = favoriteIds.has(item.id);
    return `
      <article class="card">
        <div class="card-toolbar">
          <div class="card-meta">
            <span class="badge ${escapeHtml(item.type)}">${escapeHtml(typeLabel(item.type, currentLocale))}</span>
            ${renderTranslationBadge(item, currentLocale)}
          </div>
          <button class="favorite-button${favorite ? ' active' : ''}" type="button" data-favorite-id="${escapeHtml(item.id)}" aria-pressed="${favorite}" title="${escapeHtml(uiText(currentLocale, favorite ? 'favoriteRemove' : 'favoriteAdd'))}">${favorite ? '★' : '☆'}</button>
        </div>
        <button class="card-open" type="button" data-id="${escapeHtml(item.id)}">
          <h3 class="${isCompilerType(item.type) || item.type === 'exception' ? 'mono' : ''}">${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.short)}</p>
          <div class="tags">${(item.tags ?? []).slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
        </button>
      </article>
    `;
  }).join('');

  cards.querySelectorAll('.card-open').forEach(card => {
    card.addEventListener('click', () => navigateToItem(card.dataset.id));
  });
  cards.querySelectorAll('[data-favorite-id]').forEach(button => {
    button.addEventListener('click', () => {
      favoriteIds = toggleId(favoriteIds, button.dataset.favoriteId);
      storeList(FAVORITES_STORAGE_KEY, favoriteIds);
      loadItems();
    });
  });

  empty.style.display = currentItems.length ? 'none' : 'block';
  resultCount.textContent = uiText(currentLocale, 'resultCount', currentItems.length);
  listTitle.textContent = currentQuery
    ? uiText(currentLocale, 'searchResults', currentQuery)
    : selectedTypes.size === 1
      ? typeLabel([...selectedTypes][0], currentLocale)
      : uiText(currentLocale, 'recommended');
}

function navigateToItem(id) {
  const hash = articleHash(id);
  if (window.location.hash === hash) {
    openItem(id);
    return;
  }
  window.location.hash = hash;
}

function navigateHome() {
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', baseUrl);
  showHome();
}

function syncRouteFromHash() {
  const id = articleIdFromHash(window.location.hash);
  if (!id) {
    showHome();
    return;
  }

  if (!fetchItem(id)) {
    const baseUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', baseUrl);
    showHome();
    return;
  }

  openItem(id);
}

function openItem(id) {
  const item = fetchItem(id);
  if (!item) return;

  recentIds = pushRecent(recentIds, item.id, 24);
  storeList(RECENT_STORAGE_KEY, recentIds);

  const sections = [];
  sections.push(`<div class="block"><h2>${escapeHtml(uiText(currentLocale, 'summary'))}</h2><div class="note">${renderArticleText(item.summary)}</div></div>`);

  if (item.bad && item.good) {
    sections.push(`<div class="code-compare">
      ${codeSection(
        uiText(currentLocale, 'cause'),
        item.bad,
        'bad',
        explicitLineSet(item.badHighlight),
        lineNoteMap(item.badNotes)
      )}
      ${codeSection(
        uiText(currentLocale, 'fix'),
        item.good,
        'good',
        explicitLineSet(item.goodHighlight),
        lineNoteMap(item.goodNotes)
      )}
    </div>`);
  } else {
    if (item.bad) {
      sections.push(codeSection(
        uiText(currentLocale, 'cause'),
        item.bad,
        'bad',
        explicitLineSet(item.badHighlight),
        lineNoteMap(item.badNotes)
      ));
    }
    if (item.good) {
      sections.push(codeSection(
        uiText(currentLocale, 'fix'),
        item.good,
        'good',
        explicitLineSet(item.goodHighlight),
        lineNoteMap(item.goodNotes)
      ));
    }
  }

  if (item.code) {
    sections.push(codeSection(
      uiText(currentLocale, 'codeHeading'),
      item.code,
      '',
      explicitLineSet(item.codeHighlight),
      lineNoteMap(item.codeNotes)
    ));
  }
  if (item.why) sections.push(`<div class="block"><h2>${escapeHtml(uiText(currentLocale, 'why'))}</h2><p>${renderArticleText(item.why)}</p></div>`);
  if (item.tips) sections.push(`<div class="block"><h2>${escapeHtml(uiText(currentLocale, 'tips'))}</h2><p>${renderArticleText(item.tips)}</p></div>`);

  if (item.related?.length) {
    const relatedItems = item.related.map(fetchItem).filter(Boolean);
    const links = relatedItems.map(related => `
      <button data-related-id="${escapeHtml(related.id)}">
        <strong>${escapeHtml(related.title)}</strong>
        <small>${escapeHtml(typeLabel(related.type, currentLocale))} — ${escapeHtml(related.short)}</small>
      </button>
    `).join('');
    if (links) sections.push(`<div class="block"><h2>${escapeHtml(uiText(currentLocale, 'related'))}</h2><div class="related">${links}</div></div>`);
  }

  detailContent.innerHTML = `
    ${renderTranslationBanner(item, currentLocale)}
    <div class="detail-head">
      <span class="badge ${escapeHtml(item.type)}">${escapeHtml(typeLabel(item.type, currentLocale))}</span>
      <h1 class="${isCompilerType(item.type) || item.type === 'exception' ? 'mono' : ''}">${escapeHtml(item.title)}</h1>
      <p>${renderArticleText(item.short)}</p>
    </div>
    ${sections.join('')}
  `;

  detailContent.querySelectorAll('[data-related-id]').forEach(button => {
    button.addEventListener('click', () => navigateToItem(button.dataset.relatedId));
  });

  detailContent.querySelectorAll('[data-wiki-id]').forEach(button => {
    button.addEventListener('click', () => navigateToItem(button.dataset.wikiId));
  });

  detailContent.querySelectorAll('[data-copy-code]').forEach(button => {
    button.addEventListener('click', async () => {
      const originalLabel = button.textContent;
      try {
        await copyCode(decodeURIComponent(button.dataset.copyCode ?? ''));
        button.textContent = uiText(currentLocale, 'copied');
        button.classList.add('copied');
      } catch {
        button.textContent = uiText(currentLocale, 'copyFailed');
        button.classList.add('copy-failed');
      }
      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.classList.remove('copied', 'copy-failed');
      }, 1400);
    });
  });

  homeView.classList.add('hidden');
  detailView.classList.remove('hidden');
  document.title = `${item.title} - C# Atlas`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function fetchItem(id) {
  return allItems.find(x => x.id.toLowerCase() === String(id ?? '').toLowerCase()) ?? null;
}

function renderArticleText(value) {
  return renderWikiText(value, fetchItem);
}

function explicitLineSet(lines) {
  if (!Array.isArray(lines)) return new Set();
  return new Set(lines
    .map(Number)
    .filter(Number.isInteger)
    .filter(line => line > 0)
    .map(line => line - 1));
}

function lineNoteMap(notes) {
  const result = new Map();
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return result;
  for (const [rawLine, rawNote] of Object.entries(notes)) {
    const line = Number(rawLine);
    const note = String(rawNote ?? '').trim();
    if (Number.isInteger(line) && line > 0 && note) result.set(line - 1, note);
  }
  return result;
}

function isCompilerType(type) {
  return type === 'compiler-error' || type === 'compiler-warning';
}

function codeSection(title, value, className, highlightLines = new Set(), notes = new Map()) {
  const lines = String(value ?? '').split('\n');
  const body = lines.map((line, index) => {
    const note = notes.get(index) ?? '';
    const isHighlighted = highlightLines.has(index) || Boolean(note);
    const fallback = className === 'bad'
      ? uiText(currentLocale, 'cause')
      : className === 'good'
        ? uiText(currentLocale, 'fix')
        : '';
    const callout = note || fallback;
    const noteHtml = isHighlighted && callout
      ? `<div class="code-note" aria-hidden="true"><span class="code-note-mark">// ↑</span> ${escapeHtml(callout)}</div>`
      : '';
    return `<div class="code-line${isHighlighted ? ' highlighted' : ''}" data-line="${index + 1}"><span class="code-text">${highlightCSharp(line) || ' '}</span></div>${noteHtml}`;
  }).join('');
  const encodedCode = encodeURIComponent(String(value ?? ''));
  return `<div class="block code-block"><div class="code-block-head"><h2>${escapeHtml(title)}</h2><button type="button" class="copy-code" data-copy-code="${encodedCode}">${escapeHtml(uiText(currentLocale, 'copy'))}</button></div><div class="code ${className}">${body}</div></div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showHome() {
  detailView.classList.add('hidden');
  homeView.classList.remove('hidden');
  document.title = 'C# Atlas';
  loadItems();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function toggleType(type) {
  if (type === 'all') selectedTypes.clear();
  else selectedTypes = toggleId(selectedTypes, type);
  syncTypeButtons();
  loadItems();
}

function setTypeFromNavigation(type) {
  selectedTypes = type === 'all' ? new Set() : new Set([type]);
  syncTypeButtons();
  loadItems();
}

document.getElementById('searchForm').addEventListener('submit', event => {
  event.preventDefault();
  currentQuery = searchInput.value.trim();
  loadItems();
});

document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => {
  currentQuery = button.dataset.query;
  searchInput.value = currentQuery;
  selectedTypes.clear();
  syncTypeButtons();
  loadItems();
}));

document.querySelectorAll('[data-type]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.chapter) return;
    toggleType(button.dataset.type);
  });
});

document.querySelectorAll('[data-nav-type]').forEach(button => {
  button.addEventListener('click', () => {
    navigateHome();
    setTypeFromNavigation(button.dataset.navType);
  });
});

sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  loadItems();
});
favoritesOnlyButton.addEventListener('click', () => {
  favoritesOnly = !favoritesOnly;
  syncPersonalFilterButtons();
  loadItems();
});
recentOnlyButton.addEventListener('click', () => {
  recentOnly = !recentOnly;
  syncPersonalFilterButtons();
  loadItems();
});
clearFiltersButton.addEventListener('click', () => {
  selectedTypes.clear();
  selectedTopics.clear();
  favoritesOnly = false;
  recentOnly = false;
  syncTypeButtons();
  syncPersonalFilterButtons();
  renderTopicFilters();
  loadItems();
});

document.getElementById('homeButton').addEventListener('click', navigateHome);
document.getElementById('backButton').addEventListener('click', navigateHome);
languageSelect.addEventListener('change', () => {
  const locale = languageSelect.value;
  storeLocale(locale);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(withLangParam(currentUrl, locale));
});
window.addEventListener('hashchange', syncRouteFromHash);

initialize().catch(error => {
  cards.innerHTML = `<div class="empty" style="display:block">${escapeHtml(error.message)}</div>`;
});
import { articleHash, articleIdFromHash, copyCode, highlightCode } from './article-ui.js';
import { matchesArticle } from './article-search.js';
import { loadLocalizedContent } from './content-loader.js';
import { resolveLocale, uiText, withLangParam } from './i18n.js';
import {
  buildDiscoverySearch,
  deriveArticleTopics,
  filterArticlesByTopics,
  filterArticlesByTypes,
  parseDiscoveryState,
  pushRecent,
  sortArticles,
  toggleId
} from './list-discovery.js';
import { loadTemplateContext, localized, storageKey } from './site-config.js';
import { renderTranslationBadge, renderTranslationBanner, typeLabel } from './translation-ui.js';
import { renderWikiText } from './wiki-links.js';

let config;
let typeDefinitions = [];
let topicDefinitions = [];
let locale = 'ja';
let query = '';
let allItems = [];
let currentItems = [];
let selectedTypes = new Set();
let selectedTopics = new Set();
let sortMode = 'recommended';
let favoritesOnly = false;
let recentOnly = false;
let favoriteIds = new Set();
let recentIds = [];
let localeKey;
let favoritesKey;
let recentKey;

const $ = id => document.getElementById(id);
const homeView = $('homeView');
const detailView = $('detailView');
const cards = $('cards');
const empty = $('empty');
const listTitle = $('listTitle');
const resultCount = $('resultCount');
const searchInput = $('searchInput');
const detailContent = $('detailContent');
const languageSelect = $('languageSelect');
const topicFilters = $('topicFilters');
const typeFilters = $('typeFilters');
const topTypeNav = $('topTypeNav');
const sortSelect = $('sortSelect');
const favoritesOnlyButton = $('favoritesOnlyButton');
const recentOnlyButton = $('recentOnlyButton');
const selectedFilters = $('selectedFilters');
const selectedFilterChips = $('selectedFilterChips');
const clearFiltersButton = $('clearFiltersButton');

async function initialize() {
  ({ config, types: typeDefinitions, topics: topicDefinitions } = await loadTemplateContext());
  localeKey = storageKey(config, 'locale');
  favoritesKey = storageKey(config, 'favorites');
  recentKey = storageKey(config, 'recent');
  locale = resolveLocale({ search: location.search, storedLocale: readString(localeKey) });
  const state = parseDiscoveryState(location.search, { typeDefinitions, topicDefinitions });
  query = state.query;
  selectedTypes = state.types;
  selectedTopics = state.topics;
  sortMode = state.sort;
  favoriteIds = new Set(readList(favoritesKey));
  recentIds = readList(recentKey);

  applyBranding();
  renderTypeControls();
  renderQuickQueries();
  applyStaticUi();
  searchInput.value = query;
  sortSelect.value = sortMode;

  const { articles } = await loadLocalizedContent({ fetchJson: loadJson, locale });
  allItems = articles.map(item => ({ ...item, topics: deriveArticleTopics(item, topicDefinitions) }));
  ensureUniqueIds(allItems);
  renderTopicFilters();
  syncTypeButtons();
  syncPersonalButtons();
  loadItems();
  syncRoute();

  const ready = { config, typeDefinitions, topicDefinitions, articles: allItems, locale };
  window.__languageAtlasReady = ready;
  window.dispatchEvent(new CustomEvent('language-atlas-ready', { detail: ready }));
}

function applyBranding() {
  document.title = config.site.title;
  $('logoPrefix').textContent = config.logo?.prefix ?? '';
  $('logoAccent').textContent = config.logo?.accent ?? config.name;
  $('logoSuffix').textContent = config.logo?.suffix ?? '';
  $('siteDescription').setAttribute('content', config.site.description ?? '');
  $('heroEyebrow').textContent = localized(config.hero?.eyebrow, locale);
  $('heroDescription').textContent = localized(config.hero?.description, locale);
  searchInput.placeholder = localized(config.search?.placeholder, locale);
}

function applyStaticUi() {
  document.documentElement.lang = locale;
  languageSelect.value = locale;
  $('languageLabel').textContent = uiText(locale, 'language');
  $('heroTitle1').textContent = uiText(locale, 'heroTitle1');
  $('heroTitle2').textContent = uiText(locale, 'heroTitle2');
  $('searchButton').textContent = uiText(locale, 'searchButton');
  $('asideTitle').textContent = uiText(locale, 'categories');
  $('backButton').textContent = uiText(locale, 'back');
  $('topicFilterLabel').textContent = uiText(locale, 'topics');
  $('sortLabel').textContent = uiText(locale, 'sort');
  $('selectedFiltersLabel').textContent = uiText(locale, 'activeFilters');
  clearFiltersButton.textContent = uiText(locale, 'clearFilters');
  favoritesOnlyButton.textContent = uiText(locale, 'favoritesOnly');
  recentOnlyButton.textContent = uiText(locale, 'recentOnly');
  empty.textContent = uiText(locale, 'noResults');
  const sortLabels = { recommended:'sortRecommended', title:'sortTitle', recent:'sortRecent', favorites:'sortFavorites' };
  for (const option of sortSelect.options) option.textContent = uiText(locale, sortLabels[option.value]);
}

function renderTypeControls() {
  const button = (type, nav = false) => `<button class="${nav ? '' : 'type'}" data-${nav ? 'nav-type' : 'type'}="${escapeHtml(type)}">${escapeHtml(typeLabel(type, locale, typeDefinitions))}</button>`;
  topTypeNav.innerHTML = button('all', true) + typeDefinitions.filter(item => item.showInNav).map(item => button(item.id, true)).join('');
  typeFilters.innerHTML = button('all') + typeDefinitions.map(item => button(item.id)).join('');
  topTypeNav.querySelectorAll('[data-nav-type]').forEach(element => element.addEventListener('click', () => {
    navigateHome();
    selectedTypes = element.dataset.navType === 'all' ? new Set() : new Set([element.dataset.navType]);
    syncTypeButtons();
    loadItems();
  }));
  typeFilters.querySelectorAll('[data-type]').forEach(element => element.addEventListener('click', () => {
    const type = element.dataset.type;
    if (type === 'all') selectedTypes.clear();
    else selectedTypes = toggleId(selectedTypes, type);
    syncTypeButtons();
    loadItems();
  }));
}

function renderQuickQueries() {
  $('quickQueries').innerHTML = (config.search?.quickQueries ?? []).map(value => `<button type="button" data-query="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('');
  $('quickQueries').querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => {
    query = button.dataset.query;
    searchInput.value = query;
    selectedTypes.clear();
    syncTypeButtons();
    loadItems();
  }));
}

function renderTopicFilters() {
  topicFilters.innerHTML = topicDefinitions.map(topic => {
    const active = selectedTopics.has(topic.id);
    const count = allItems.filter(item => item.topics.includes(topic.id)).length;
    return `<button type="button" class="topic-filter${active ? ' active' : ''}" data-topic="${escapeHtml(topic.id)}" aria-pressed="${active}">${escapeHtml(localized(topic.labels, locale))}<span>${count}</span></button>`;
  }).join('');
  topicFilters.querySelectorAll('[data-topic]').forEach(button => button.addEventListener('click', () => {
    selectedTopics = toggleId(selectedTopics, button.dataset.topic);
    renderTopicFilters();
    loadItems();
  }));
}

function loadItems() {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let items = filterArticlesByTypes(allItems, selectedTypes).filter(item => words.every(word => matchesArticle(item, word)));
  items = filterArticlesByTopics(items, selectedTopics);
  if (favoritesOnly) items = items.filter(item => favoriteIds.has(item.id));
  if (recentOnly) {
    const recent = new Set(recentIds);
    items = items.filter(item => recent.has(item.id));
  }
  currentItems = sortArticles(items, sortMode, { recentIds, favoriteIds });
  syncUrl();
  renderSelectedFilters();
  renderCards();
}

function renderCards() {
  cards.innerHTML = currentItems.map(item => {
    const favorite = favoriteIds.has(item.id);
    return `<article class="card"><div class="card-toolbar"><div class="card-meta"><span class="badge ${escapeHtml(item.type)}">${escapeHtml(typeLabel(item.type, locale, typeDefinitions))}</span>${renderTranslationBadge(item, locale)}</div><button class="favorite-button${favorite ? ' active' : ''}" type="button" data-favorite-id="${escapeHtml(item.id)}" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button></div><button class="card-open" type="button" data-id="${escapeHtml(item.id)}"><h3 class="${isDiagnostic(item.type) ? 'mono' : ''}">${escapeHtml(item.title)}</h3><p>${escapeHtml(item.short)}</p><div class="tags">${(item.tags ?? []).slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div></button></article>`;
  }).join('');
  cards.querySelectorAll('.card-open').forEach(button => button.addEventListener('click', () => navigateToItem(button.dataset.id)));
  cards.querySelectorAll('[data-favorite-id]').forEach(button => button.addEventListener('click', () => {
    favoriteIds = toggleId(favoriteIds, button.dataset.favoriteId);
    writeList(favoritesKey, favoriteIds);
    loadItems();
  }));
  empty.style.display = currentItems.length ? 'none' : 'block';
  resultCount.textContent = uiText(locale, 'resultCount', currentItems.length);
  listTitle.textContent = query ? uiText(locale, 'searchResults', query) : selectedTypes.size === 1 ? typeLabel([...selectedTypes][0], locale, typeDefinitions) : uiText(locale, 'recommended');
}

function renderSelectedFilters() {
  const chips = [];
  for (const type of selectedTypes) chips.push({ kind:'type', value:type, label:typeLabel(type, locale, typeDefinitions) });
  for (const topicId of selectedTopics) {
    const topic = topicDefinitions.find(item => item.id === topicId);
    if (topic) chips.push({ kind:'topic', value:topicId, label:localized(topic.labels, locale) });
  }
  if (favoritesOnly) chips.push({ kind:'favorites', value:'', label:uiText(locale, 'favoritesOnly') });
  if (recentOnly) chips.push({ kind:'recent', value:'', label:uiText(locale, 'recentOnly') });
  selectedFilters.hidden = !chips.length;
  selectedFilterChips.innerHTML = chips.map(chip => `<button type="button" class="selected-filter-chip" data-filter-kind="${chip.kind}" data-filter-value="${escapeHtml(chip.value)}">${escapeHtml(chip.label)}</button>`).join('');
  selectedFilterChips.querySelectorAll('[data-filter-kind]').forEach(button => button.addEventListener('click', () => {
    const { filterKind: kind, filterValue: value } = button.dataset;
    if (kind === 'type') selectedTypes.delete(value);
    if (kind === 'topic') selectedTopics.delete(value);
    if (kind === 'favorites') favoritesOnly = false;
    if (kind === 'recent') recentOnly = false;
    syncTypeButtons();
    syncPersonalButtons();
    renderTopicFilters();
    loadItems();
  }));
}

function syncTypeButtons() {
  typeFilters.querySelectorAll('[data-type]').forEach(button => {
    const active = button.dataset.type === 'all' ? !selectedTypes.size : selectedTypes.has(button.dataset.type);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function syncPersonalButtons() {
  favoritesOnlyButton.classList.toggle('active', favoritesOnly);
  recentOnlyButton.classList.toggle('active', recentOnly);
  favoritesOnlyButton.setAttribute('aria-pressed', String(favoritesOnly));
  recentOnlyButton.setAttribute('aria-pressed', String(recentOnly));
}

function syncUrl() {
  const search = buildDiscoverySearch({ query, types:selectedTypes, topics:selectedTopics, sort:sortMode }, location.search, { typeDefinitions, topicDefinitions });
  history.replaceState(null, '', `${location.pathname}${search}${location.hash}`);
}

function navigateToItem(id) {
  const hash = articleHash(id);
  if (location.hash === hash) openItem(id);
  else location.hash = hash;
}

function navigateHome() {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  showHome();
}

function syncRoute() {
  const id = articleIdFromHash(location.hash);
  if (!id || !fetchItem(id)) return showHome();
  openItem(id);
}

function openItem(id) {
  const item = fetchItem(id);
  if (!item) return;
  recentIds = pushRecent(recentIds, item.id);
  writeList(recentKey, recentIds);
  const sections = [`<div class="block"><h2>${escapeHtml(uiText(locale, 'summary'))}</h2><div class="note">${renderText(item.summary)}</div></div>`];
  if (item.bad && item.good) sections.push(`<div class="code-compare">${codeSection(uiText(locale, 'cause'), item.bad, 'bad', item.badHighlight, item.badNotes)}${codeSection(uiText(locale, 'fix'), item.good, 'good', item.goodHighlight, item.goodNotes)}</div>`);
  else {
    if (item.bad) sections.push(codeSection(uiText(locale, 'cause'), item.bad, 'bad', item.badHighlight, item.badNotes));
    if (item.good) sections.push(codeSection(uiText(locale, 'fix'), item.good, 'good', item.goodHighlight, item.goodNotes));
  }
  if (item.code) sections.push(codeSection(uiText(locale, 'codeHeading'), item.code, '', item.codeHighlight, item.codeNotes));
  if (item.why) sections.push(`<div class="block"><h2>${escapeHtml(uiText(locale, 'why'))}</h2><p>${renderText(item.why)}</p></div>`);
  if (item.tips) sections.push(`<div class="block"><h2>${escapeHtml(uiText(locale, 'tips'))}</h2><p>${renderText(item.tips)}</p></div>`);
  const related = (item.related ?? []).map(fetchItem).filter(Boolean);
  if (related.length) sections.push(`<div class="block"><h2>${escapeHtml(uiText(locale, 'related'))}</h2><div class="related">${related.map(entry => `<button data-related-id="${escapeHtml(entry.id)}"><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(typeLabel(entry.type, locale, typeDefinitions))} — ${escapeHtml(entry.short)}</small></button>`).join('')}</div></div>`);
  detailContent.innerHTML = `${renderTranslationBanner(item, locale)}<div class="detail-head"><span class="badge ${escapeHtml(item.type)}">${escapeHtml(typeLabel(item.type, locale, typeDefinitions))}</span><h1 class="${isDiagnostic(item.type) ? 'mono' : ''}">${escapeHtml(item.title)}</h1><p>${renderText(item.short)}</p></div>${sections.join('')}`;
  detailContent.querySelectorAll('[data-related-id],[data-wiki-id]').forEach(button => button.addEventListener('click', () => navigateToItem(button.dataset.relatedId ?? button.dataset.wikiId)));
  detailContent.querySelectorAll('[data-copy-code]').forEach(button => button.addEventListener('click', async () => {
    const original = button.textContent;
    try { await copyCode(decodeURIComponent(button.dataset.copyCode ?? '')); button.textContent = uiText(locale, 'copied'); button.classList.add('copied'); }
    catch { button.textContent = uiText(locale, 'copyFailed'); button.classList.add('copy-failed'); }
    setTimeout(() => { button.textContent = original; button.classList.remove('copied', 'copy-failed'); }, 1400);
  }));
  homeView.classList.add('hidden');
  detailView.classList.remove('hidden');
  document.title = `${item.title} - ${config.site.title}`;
  scrollTo({ top:0, behavior:'instant' });
}

function codeSection(title, value, className, highlightLines = [], notes = {}) {
  const highlighted = new Set((highlightLines ?? []).map(Number).filter(Number.isInteger).map(line => line - 1));
  const noteMap = new Map(Object.entries(notes ?? {}).map(([line, note]) => [Number(line) - 1, String(note)]));
  const body = String(value ?? '').split('\n').map((line, index) => {
    const note = noteMap.get(index);
    const active = highlighted.has(index) || Boolean(note);
    const fallback = className === 'bad' ? uiText(locale, 'cause') : className === 'good' ? uiText(locale, 'fix') : '';
    const callout = note || fallback;
    return `<div class="code-line${active ? ' highlighted' : ''}" data-line="${index + 1}"><span class="code-text">${highlightCode(line, config.syntax.prismLanguage) || ' '}</span></div>${active && callout ? `<div class="code-note" aria-hidden="true"><span class="code-note-mark">// ↑</span> ${escapeHtml(callout)}</div>` : ''}`;
  }).join('');
  return `<div class="block code-block"><div class="code-block-head"><h2>${escapeHtml(title)}</h2><button type="button" class="copy-code" data-copy-code="${encodeURIComponent(String(value ?? ''))}">${escapeHtml(uiText(locale, 'copy'))}</button></div><div class="code ${className}">${body}</div></div>`;
}

function showHome() {
  detailView.classList.add('hidden');
  homeView.classList.remove('hidden');
  document.title = config.site.title;
  loadItems();
  scrollTo({ top:0, behavior:'instant' });
}

function fetchItem(id) { return allItems.find(item => item.id.toLowerCase() === String(id ?? '').toLowerCase()) ?? null; }
function renderText(value) { return renderWikiText(value, fetchItem); }
function isDiagnostic(type) { return type === 'compiler-error' || type === 'compiler-warning' || type === 'exception'; }
function ensureUniqueIds(items) { const ids = new Set(); for (const item of items) { const id = item.id.toLowerCase(); if (ids.has(id)) throw new Error(uiText(locale, 'duplicateId', item.id)); ids.add(id); } }
function readString(key) { try { return localStorage.getItem(key) ?? ''; } catch { return ''; } }
function readList(key) { try { const value = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []; } catch { return []; } }
function writeList(key, values) { try { localStorage.setItem(key, JSON.stringify([...values])); } catch {} }
async function loadJson(path) { const response = await fetch(path); if (!response.ok) throw new Error(uiText(locale, 'contentLoadFailed', path)); return response.json(); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

$('searchForm').addEventListener('submit', event => { event.preventDefault(); query = searchInput.value.trim(); loadItems(); });
sortSelect.addEventListener('change', () => { sortMode = sortSelect.value; loadItems(); });
favoritesOnlyButton.addEventListener('click', () => { favoritesOnly = !favoritesOnly; syncPersonalButtons(); loadItems(); });
recentOnlyButton.addEventListener('click', () => { recentOnly = !recentOnly; syncPersonalButtons(); loadItems(); });
clearFiltersButton.addEventListener('click', () => { selectedTypes.clear(); selectedTopics.clear(); favoritesOnly = false; recentOnly = false; query = ''; searchInput.value = ''; syncTypeButtons(); syncPersonalButtons(); renderTopicFilters(); loadItems(); });
$('homeButton').addEventListener('click', navigateHome);
$('backButton').addEventListener('click', navigateHome);
languageSelect.addEventListener('change', () => { try { localStorage.setItem(localeKey, languageSelect.value); } catch {} location.assign(withLangParam(`${location.pathname}${location.search}${location.hash}`, languageSelect.value)); });
window.addEventListener('hashchange', syncRoute);

initialize().catch(error => { cards.innerHTML = `<div class="empty" style="display:block">${escapeHtml(error.message)}</div>`; });

import { articleHash } from './article-ui.js';
import { uiText } from './i18n.js';
import { parseDiscoveryState } from './list-discovery.js';
import { typeLabel } from './translation-ui.js';
import { buildWikiHomeSections, pickRandomArticle, shouldShowWikiHome } from './wiki-home.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isDiagnostic(type) {
  return type === 'compiler-error' || type === 'compiler-warning' || type === 'exception';
}

function renderFeatureArticle(article, locale, typeDefinitions) {
  return `
    <button type="button" class="wiki-article-card" data-wiki-home-id="${escapeHtml(article.id)}">
      <span class="badge ${escapeHtml(article.type)}">${escapeHtml(typeLabel(article.type, locale, typeDefinitions))}</span>
      <strong class="${isDiagnostic(article.type) ? 'mono' : ''}">${escapeHtml(article.title)}</strong>
      <span>${escapeHtml(article.short)}</span>
    </button>
  `;
}

function renderArticleRow(article, locale, typeDefinitions) {
  return `
    <button type="button" class="wiki-link-row" data-wiki-home-id="${escapeHtml(article.id)}">
      <span class="wiki-link-copy">
        <strong class="${isDiagnostic(article.type) ? 'mono' : ''}">${escapeHtml(article.title)}</strong>
        <small>${escapeHtml(article.short)}</small>
      </span>
      <span class="badge ${escapeHtml(article.type)}">${escapeHtml(typeLabel(article.type, locale, typeDefinitions))}</span>
    </button>
  `;
}

function cleanHomeUrl() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  const clean = new URLSearchParams();
  if (lang) clean.set('lang', lang);
  const query = clean.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

function initializeWikiHome({ config, typeDefinitions, topicDefinitions, articles, locale }) {
  const panel = document.getElementById('wikiHomePanel');
  const browseView = document.getElementById('browseView');
  if (!panel || !browseView) return;

  const discovery = parseDiscoveryState(window.location.search, { typeDefinitions, topicDefinitions });
  const showLanding = shouldShowWikiHome({
    query: discovery.query,
    types: discovery.types,
    topics: discovery.topics,
    favoritesOnly: false,
    recentOnly: false
  }) && discovery.sort === 'recommended';

  if (!showLanding) {
    panel.classList.add('hidden');
    browseView.classList.remove('hidden');
    return;
  }

  const sections = buildWikiHomeSections(articles, config.portal, typeDefinitions);
  const setText = (id, key, ...args) => {
    const element = document.getElementById(id);
    if (element) element.textContent = uiText(locale, key, ...args);
  };

  setText('wikiHomeEyebrow', 'wikiHomeEyebrow');
  setText('wikiHomeHeading', 'wikiHomeTitle');
  setText('wikiArticleCount', 'wikiArticleCount', articles.length);
  setText('wikiFeaturedTitle', 'wikiFeatured');
  setText('wikiFeaturedDescription', 'wikiFeaturedDescription');
  setText('wikiNewestTitle', 'wikiNewest');
  setText('wikiNewestDescription', 'wikiNewestDescription');
  setText('wikiBeginnerTitle', 'wikiBeginner');
  setText('wikiBeginnerDescription', 'wikiBeginnerDescription');
  setText('wikiCommonErrorsTitle', 'wikiCommonErrors');
  setText('wikiCommonErrorsDescription', 'wikiCommonErrorsDescription');
  setText('wikiCategoriesTitle', 'wikiCategories');
  setText('wikiCategoriesDescription', 'wikiCategoriesDescription');
  setText('wikiLearningMapTitle', 'wikiLearningMap');
  setText('wikiLearningMapDescription', 'wikiLearningMapDescription');
  setText('wikiLearningMapButton', 'wikiOpenLearningMap');
  setText('wikiBrowseAllButton', 'wikiBrowseAll');
  setText('wikiRandomButton', 'wikiRandom');

  document.getElementById('wikiFeaturedArticles').innerHTML = sections.featured
    .map(article => renderFeatureArticle(article, locale, typeDefinitions)).join('');
  document.getElementById('wikiNewestArticles').innerHTML = sections.newest
    .map(article => renderArticleRow(article, locale, typeDefinitions)).join('');
  document.getElementById('wikiBeginnerArticles').innerHTML = sections.beginner
    .map(article => renderArticleRow(article, locale, typeDefinitions)).join('');
  document.getElementById('wikiCommonErrorArticles').innerHTML = sections.commonErrors
    .map(article => renderArticleRow(article, locale, typeDefinitions)).join('');
  document.getElementById('wikiCategoryButtons').innerHTML = sections.categories.map(category => `
    <button type="button" class="wiki-category-button" data-wiki-home-type="${escapeHtml(category.type)}">
      <span>${escapeHtml(typeLabel(category.type, locale, typeDefinitions))}</span>
      <strong>${category.count}</strong>
    </button>
  `).join('');

  function enterBrowseMode({ scroll = true } = {}) {
    panel.classList.add('hidden');
    browseView.classList.remove('hidden');
    if (scroll) browseView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  panel.querySelectorAll('[data-wiki-home-id]').forEach(button => {
    button.addEventListener('click', () => { window.location.hash = articleHash(button.dataset.wikiHomeId); });
  });

  panel.querySelectorAll('[data-wiki-home-type]').forEach(button => {
    button.addEventListener('click', () => {
      enterBrowseMode({ scroll: false });
      document.querySelector(`#browseView [data-type="${CSS.escape(button.dataset.wikiHomeType)}"]`)?.click();
      browseView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.getElementById('wikiBrowseAllButton')?.addEventListener('click', () => enterBrowseMode());
  document.getElementById('wikiRandomButton')?.addEventListener('click', () => {
    const article = pickRandomArticle(articles);
    if (article) window.location.hash = articleHash(article.id);
  });
  document.getElementById('wikiLearningMapButton')?.addEventListener('click', () => {
    enterBrowseMode({ scroll: false });
    document.getElementById('questViewButton')?.click();
    browseView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('searchForm')?.addEventListener('submit', () => enterBrowseMode({ scroll: false }));
  document.querySelectorAll('[data-query], [data-nav-type]').forEach(button => {
    button.addEventListener('click', () => enterBrowseMode({ scroll: false }));
  });

  document.getElementById('homeButton')?.addEventListener('click', () => {
    const clean = cleanHomeUrl();
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== clean) {
      window.location.assign(clean);
      return;
    }
    panel.classList.remove('hidden');
    browseView.classList.add('hidden');
  });

  panel.classList.remove('hidden');
  browseView.classList.add('hidden');
}

if (window.__languageAtlasReady) initializeWikiHome(window.__languageAtlasReady);
else window.addEventListener('language-atlas-ready', event => initializeWikiHome(event.detail), { once: true });

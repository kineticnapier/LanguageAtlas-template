import { uiText } from './i18n.js';

const TYPE_KEYS = {
  all: 'all',
  code: 'code',
  exception: 'exception',
  'compiler-error': 'compilerError',
  'compiler-warning': 'compilerWarning',
  logic: 'logic',
  concept: 'concept'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function typeLabel(type, locale) {
  const key = TYPE_KEYS[type];
  return key ? uiText(locale, key) : String(type ?? '');
}

export function renderTranslationBadge(item, locale) {
  if (!item?.isFallback) return '';
  return `<span class="translation-badge">${escapeHtml(uiText(locale, 'untranslatedBadge'))}</span>`;
}

export function renderTranslationBanner(item, locale) {
  if (!item?.isFallback) return '';
  return `<div class="translation-banner" role="status">${escapeHtml(uiText(locale, 'fallbackBanner'))}</div>`;
}

import { uiText } from './i18n.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function typeLabel(type, locale, typeDefinitions = []) {
  if (type === 'all') return uiText(locale, 'all');
  const definition = typeDefinitions.find(item => item.id === type);
  return definition?.labels?.[locale] ?? definition?.labels?.ja ?? String(type ?? '');
}

export function renderTranslationBadge(item, locale) {
  if (!item?.isFallback) return '';
  return `<span class="translation-badge">${escapeHtml(uiText(locale, 'untranslatedBadge'))}</span>`;
}

export function renderTranslationBanner(item, locale) {
  if (!item?.isFallback) return '';
  return `<div class="translation-banner" role="status">${escapeHtml(uiText(locale, 'fallbackBanner'))}</div>`;
}

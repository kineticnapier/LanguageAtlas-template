import { localizeArticles } from './article-localization.js';

export const CONTENT_CATEGORIES = ['items.json','exceptions.json','compiler-errors.json','compiler-warnings.json','concepts.json','code-recipes.json','logic-errors.json'];

export async function loadLocalizedContent({ fetchJson, locale, fallbackLocale = 'ja' }) {
  if (typeof fetchJson !== 'function') throw new Error('fetchJson is required');
  const baseGroups = await Promise.all(CONTENT_CATEGORIES.map(file => fetchJson(`./content/articles/${file}`)));
  const fallbackGroups = await Promise.all(CONTENT_CATEGORIES.map(file => fetchJson(`./content/locales/${fallbackLocale}/${file}`)));
  const requestedGroups = locale === fallbackLocale ? fallbackGroups : await Promise.all(CONTENT_CATEGORIES.map(file => fetchJson(`./content/locales/${locale}/${file}`)));
  const mergeLocaleGroups = groups => Object.assign({}, ...groups);
  return { articles: localizeArticles(baseGroups.flat(), { [fallbackLocale]: mergeLocaleGroups(fallbackGroups), [locale]: mergeLocaleGroups(requestedGroups) }, locale, fallbackLocale), requestedLocale: locale };
}

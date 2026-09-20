const REQUIRED_TEXT_FIELDS = ['title', 'short', 'summary', 'why', 'tips'];

export function isCompleteLocaleEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  if (!REQUIRED_TEXT_FIELDS.every(field => typeof entry[field] === 'string' && entry[field].trim())) return false;
  return Array.isArray(entry.tags) && entry.tags.every(tag => typeof tag === 'string');
}

export function localizeArticle(baseArticle, localeMaps, requestedLocale, fallbackLocale = 'ja') {
  if (!baseArticle?.id) throw new Error('Article id is required');
  const requestedEntry = localeMaps?.[requestedLocale]?.[baseArticle.id];
  const fallbackEntry = localeMaps?.[fallbackLocale]?.[baseArticle.id];
  const useRequested = isCompleteLocaleEntry(requestedEntry);
  const selectedEntry = useRequested ? requestedEntry : fallbackEntry;
  const locale = useRequested ? requestedLocale : fallbackLocale;
  if (!isCompleteLocaleEntry(selectedEntry)) throw new Error(`Missing complete fallback locale "${fallbackLocale}" for article "${baseArticle.id}"`);
  const article = { ...baseArticle, ...selectedEntry };
  return { article, locale, requestedLocale, isFallback: locale !== requestedLocale };
}

export function localizeArticles(baseArticles, localeMaps, requestedLocale, fallbackLocale = 'ja') {
  return baseArticles.map(baseArticle => {
    const result = localizeArticle(baseArticle, localeMaps, requestedLocale, fallbackLocale);
    return { ...result.article, locale: result.locale, requestedLocale: result.requestedLocale, isFallback: result.isFallback };
  });
}

const SORT_MODES = new Set(['recommended', 'title', 'recent', 'favorites']);

function definitionIds(definitions) {
  return new Set((definitions ?? []).map(item => item.id));
}

function haystack(article) {
  return [article?.id, article?.title, ...(article?.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
}

export function deriveArticleTopics(article, topicDefinitions = []) {
  const topicIds = definitionIds(topicDefinitions);
  if (Array.isArray(article?.topics)) {
    const explicit = [...new Set(article.topics.filter(id => topicIds.has(id)))];
    if (explicit.length) return explicit;
  }
  const source = haystack(article);
  const topics = topicDefinitions
    .filter(topic => topic.id !== 'practical')
    .filter(topic => (topic.keywords ?? []).some(keyword => source.includes(String(keyword).toLowerCase())))
    .map(topic => topic.id);
  if (!topics.length && topicIds.has('practical')) topics.push('practical');
  return topics;
}

export function filterArticlesByTopics(articles, selectedTopics) {
  const selected = selectedTopics instanceof Set ? selectedTopics : new Set(selectedTopics ?? []);
  if (!selected.size) return [...articles];
  return articles.filter(article => (article.topics ?? []).some(topic => selected.has(topic)));
}

export function filterArticlesByTypes(articles, selectedTypes) {
  const selected = selectedTypes instanceof Set ? selectedTypes : new Set(selectedTypes ?? []);
  if (!selected.size || selected.has('all')) return [...articles];
  return articles.filter(article => selected.has(article.type));
}

export function parseDiscoveryState(search = '', { typeDefinitions = [], topicDefinitions = [] } = {}) {
  const params = new URLSearchParams(search);
  const typeIds = definitionIds(typeDefinitions);
  const topicIds = definitionIds(topicDefinitions);
  const types = new Set(params.getAll('type').filter(id => typeIds.has(id)));
  const topics = new Set(params.getAll('topic').filter(id => topicIds.has(id)));
  const requestedSort = params.get('sort') ?? 'recommended';
  return {
    query: (params.get('q') ?? '').trim(),
    types,
    topics,
    sort: SORT_MODES.has(requestedSort) ? requestedSort : 'recommended'
  };
}

export function buildDiscoverySearch(state = {}, existingSearch = '', { typeDefinitions = [], topicDefinitions = [] } = {}) {
  const existing = new URLSearchParams(existingSearch);
  const params = new URLSearchParams();
  const typeIds = definitionIds(typeDefinitions);
  const topicIds = definitionIds(topicDefinitions);
  const lang = existing.get('lang');
  if (lang) params.set('lang', lang);
  const query = String(state.query ?? '').trim();
  if (query) params.set('q', query);
  for (const type of state.types instanceof Set ? state.types : new Set(state.types ?? [])) {
    if (typeIds.has(type)) params.append('type', type);
  }
  for (const topic of state.topics instanceof Set ? state.topics : new Set(state.topics ?? [])) {
    if (topicIds.has(topic)) params.append('topic', topic);
  }
  const sort = SORT_MODES.has(state.sort) ? state.sort : 'recommended';
  if (sort !== 'recommended') params.set('sort', sort);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export function sortArticles(articles, mode = 'recommended', { recentIds = [], favoriteIds = new Set() } = {}) {
  const result = [...articles];
  const byTitle = (a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, { sensitivity: 'base' });
  if (mode === 'title') return result.sort(byTitle);
  if (mode === 'recent') {
    const order = new Map(recentIds.map((id, index) => [id, index]));
    return result.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) || byTitle(a, b));
  }
  if (mode === 'favorites') {
    return result.sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)) || byTitle(a, b));
  }
  return result;
}

export function toggleId(ids, id) {
  const result = new Set(ids ?? []);
  result.has(id) ? result.delete(id) : result.add(id);
  return result;
}

export function pushRecent(ids, id, limit = 24) {
  return [id, ...(ids ?? []).filter(value => value !== id)].slice(0, Math.max(1, limit));
}

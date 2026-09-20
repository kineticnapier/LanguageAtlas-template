export function matchesArticle(item, word) {
  const query = String(word ?? '').toLowerCase();
  return [item.id, item.title, item.short, ...(item.tags ?? []), ...(item.topics ?? [])]
    .some(value => String(value ?? '').toLowerCase().includes(query));
}

export function filterArticles(items, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return (items ?? []).filter(item => words.every(word => matchesArticle(item, word)));
}

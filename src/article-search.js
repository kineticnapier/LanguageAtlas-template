export function matchesArticle(item, word) {
  const query = String(word ?? '').toLowerCase();
  return [item.id, item.title, item.short, ...(item.tags ?? []), ...(item.topics ?? [])]
    .some(value => String(value ?? '').toLowerCase().includes(query));
}

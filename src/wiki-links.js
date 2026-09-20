function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderWikiText(value, resolveArticle) {
  const text = String(value ?? '');
  const pattern = /\[\[([^\]]*)\]\]/g;
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    result += escapeHtml(text.slice(lastIndex, index));

    const raw = match[1];
    const separator = raw.indexOf('|');
    const id = (separator >= 0 ? raw.slice(0, separator) : raw).trim();
    const explicitLabel = separator >= 0 ? raw.slice(separator + 1).trim() : '';
    const target = id && typeof resolveArticle === 'function' ? resolveArticle(id) : null;
    const label = explicitLabel || target?.title || id;

    result += target
      ? `<button class="wiki-link" data-wiki-id="${escapeHtml(target.id)}">${escapeHtml(label)}</button>`
      : escapeHtml(label);

    lastIndex = index + match[0].length;
  }

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

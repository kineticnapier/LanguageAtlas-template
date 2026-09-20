import Prism from 'prismjs';
import 'prismjs/components/prism-csharp.js';
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-rust.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-kotlin.js';
import 'prismjs/components/prism-typescript.js';

export function articleHash(id) { return `#/${encodeURIComponent(String(id ?? ''))}`; }

export function articleIdFromHash(hash) {
  const value = String(hash ?? '');
  if (!value.startsWith('#/') || value.length <= 2) return null;
  try { return decodeURIComponent(value.slice(2)); } catch { return null; }
}

export async function copyCode(code, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) throw new Error('Clipboard API is unavailable');
  await clipboard.writeText(String(code ?? ''));
}

export function highlightCode(code, language) {
  const id = String(language ?? '').toLowerCase();
  const grammar = Prism.languages[id];
  if (!grammar) return escapeHtml(String(code ?? ''));
  return Prism.highlight(String(code ?? ''), grammar, id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

import Prism from 'prismjs';
import 'prismjs/components/prism-csharp.js';

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
export function highlightCSharp(code) { return Prism.highlight(String(code ?? ''), Prism.languages.csharp, 'csharp'); }

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildWikiHomeSections, pickRandomArticle, shouldShowWikiHome } from '../src/wiki-home.js';

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

function article(id, type, topics = []) {
  return { id, type, topics, title: id, short: `${id} short` };
}

test('wiki home is configuration-driven and supports random article selection', async () => {
  const config = await json('../public/language.config.json');
  assert.ok(Array.isArray(config.portal?.featured));
  assert.ok(Array.isArray(config.portal?.beginner));
  assert.ok(Array.isArray(config.portal?.commonErrors));

  const articles = [
    article('example-code', 'code', ['basics']),
    article('example-concept', 'concept', ['basics']),
    article('example-exception', 'exception', ['errors']),
    article('example-compiler-error', 'compiler-error', ['errors']),
    article('example-warning', 'compiler-warning', ['errors']),
    article('example-logic', 'logic', ['errors']),
    article('newest-one', 'code'),
    article('newest-two', 'concept')
  ];
  const sections = buildWikiHomeSections(articles, config.portal);
  assert.deepEqual(sections.featured.map(item => item.id), config.portal.featured);
  assert.deepEqual(sections.beginner.map(item => item.id), config.portal.beginner);
  assert.ok(sections.commonErrors.every(item => ['exception', 'compiler-error', 'compiler-warning', 'logic'].includes(item.type)));
  assert.equal(pickRandomArticle(articles, () => 0.999).id, 'newest-two');
  assert.equal(shouldShowWikiHome({ query: '', types: new Set(), topics: new Set(), favoritesOnly: false, recentOnly: false }), true);
  assert.equal(shouldShowWikiHome({ query: 'json', types: new Set(), topics: new Set(), favoritesOnly: false, recentOnly: false }), false);
});

test('language-agnostic shared runtime remains byte-identical to CSharpAtlas main c145639f', async () => {
  const expectedBlobShas = {
    '../src/article-localization.js': '6f3c5b887c5d9460770d37c976fa28c7de0a9d09',
    '../src/article-search.js': '978f9b857d80ed56d078d90977708a334cf44281',
    '../src/code-enhancements.css': '2c00865ef955ce4a1e82914e8a93150b1a316751',
    '../src/list-discovery.css': '1132fb28332135ae5ec0a9bf4beabe73b81bf5cb',
    '../src/quest-map.js': '5ee376992d99fbcd8396921846d0186a0ad8d6ef',
    '../src/quest-view.css': '8ad84b2e26bfd605003a172bef547bf2f98b04cb',
    '../src/quest-view.js': 'bc1f972407fdbb033e621cc66a3de549e8c0e780',
    '../src/styles.css': '2a7d975474c3e152550b67ae1209c17c17e6d62e',
    '../src/wiki-home.css': 'e9750eedf9d08c71b2c2ef3dad2d97f079a731ca'
  };

  for (const [path, expected] of Object.entries(expectedBlobShas)) {
    const bytes = await readFile(new URL(path, import.meta.url));
    const header = Buffer.from(`blob ${bytes.length}\0`);
    const actual = createHash('sha1').update(header).update(bytes).digest('hex');
    assert.equal(actual, expected, `${path}: byte parity drift`);
  }
});

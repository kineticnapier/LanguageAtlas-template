import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_CATEGORIES } from '../src/content-loader.js';
import { matchesArticle } from '../src/article-search.js';
import { readFile } from 'node:fs/promises';

const expectedCategories = [
  'items.json',
  'exceptions.json',
  'compiler-errors.json',
  'compiler-warnings.json',
  'concepts.json',
  'code-recipes.json',
  'logic-errors.json'
];

test('template keeps the CSharpAtlas content categories', () => {
  assert.deepEqual(CONTENT_CATEGORIES, expectedCategories);
});

test('template example corpus has one article in each category and matching ja/en locales', async () => {
  for (const file of expectedCategories) {
    const base = JSON.parse(await readFile(new URL(`../public/content/articles/${file}`, import.meta.url), 'utf8'));
    const ja = JSON.parse(await readFile(new URL(`../public/content/locales/ja/${file}`, import.meta.url), 'utf8'));
    const en = JSON.parse(await readFile(new URL(`../public/content/locales/en/${file}`, import.meta.url), 'utf8'));
    assert.equal(base.length, 1, `${file}: expected exactly one example article`);
    assert.ok(ja[base[0].id], `${file}: missing ja locale`);
    assert.ok(en[base[0].id], `${file}: missing en locale`);
  }
});

test('migrated article search remains reusable', () => {
  const rows = [
    { id: 'example', title: 'Example JSON', short: 'Parse data', tags: ['json'], topics: [] },
    { id: 'other', title: 'Other', short: 'Nothing', tags: [], topics: [] }
  ];
  assert.deepEqual(rows.filter(item => matchesArticle(item, 'json')).map(x => x.id), ['example']);
});

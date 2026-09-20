import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('language configuration owns language-specific site behavior', async () => {
  const config = await json('../public/language.config.json');
  assert.equal(typeof config.id, 'string');
  assert.equal(typeof config.name, 'string');
  assert.equal(typeof config.site?.title, 'string');
  assert.equal(typeof config.site?.description, 'string');
  assert.equal(typeof config.syntax?.prismLanguage, 'string');
  assert.equal(typeof config.storagePrefix, 'string');
  assert.ok(Array.isArray(config.search?.quickQueries));
  assert.equal(typeof config.search?.placeholder?.ja, 'string');
  assert.equal(typeof config.search?.placeholder?.en, 'string');
});

test('article types and topics are content data, not hard-coded runtime constants', async () => {
  const types = await json('../public/content/types.json');
  const topics = await json('../public/content/topics.json');
  assert.ok(Array.isArray(types) && types.length >= 6);
  assert.ok(types.every(type => type.id && type.labels?.ja && type.labels?.en));
  assert.ok(Array.isArray(topics) && topics.length > 0);
  assert.ok(topics.every(topic => topic.id && topic.labels?.ja && topic.labels?.en));
});

test('runtime foundation contains no CSharpAtlas branding or identifiers', async () => {
  const paths = [
    '../index.html',
    '../src/main.js',
    '../src/article-ui.js',
    '../src/i18n.js',
    '../src/list-discovery.js',
    '../src/quest-bootstrap.js'
  ];
  const forbidden = [/C# Atlas/i, /CSharpAtlas/i, /csharp-atlas/i, /CS0103/i];
  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${path}: ${pattern}`);
  }
});

test('parity lock is removed after genericization', async () => {
  await assert.rejects(readFile(new URL('./csharpatlas-parity.test.js', import.meta.url), 'utf8'));
});

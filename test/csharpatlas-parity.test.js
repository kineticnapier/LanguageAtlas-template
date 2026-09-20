import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SOURCE_COMMIT = '70881c653dfdfce1db519c1360219cd52f2dc7e0';

const EXPECTED = {
  '.github/workflows/ci.yml': 'bd2ffbde9ffcc27a96de9c81c3b2a6f545c642fd',
  '.gitignore': 'a55ff37ae46486d857ef682dc6eb1d5068195665',
  'CLOUDFLARE_PAGES.md': 'f65a0d223d6f556dc9031fc726fd08be11651ef8',
  'index.html': '3a7b83c1bdfc84725ab2eea943f4baaa2804f55d',
  'package.json': '8154ffd673933183a762d79d37429218bdd510fa',
  'src/article-localization.js': '6f3c5b887c5d9460770d37c976fa28c7de0a9d09',
  'src/article-search.js': '978f9b857d80ed56d078d90977708a334cf44281',
  'src/article-ui.js': '73bdf233e62a0b362de25330b8e115d21675ae9e',
  'src/code-enhancements.css': '2c00865ef955ce4a1e82914e8a93150b1a316751',
  'src/content-loader.js': 'f0747bd0b99946de40edbf9b1712482ede807e39',
  'src/i18n.js': 'c6a02ebbf50a001dfbb7b2ca4c2b736a70d698d9',
  'src/list-discovery.css': '1132fb28332135ae5ec0a9bf4beabe73b81bf5cb',
  'src/list-discovery.js': '7b314e018cee13a3e486d863766588922742460e',
  'src/main.js': 'c446fb16099be6e5e2d6cea9d562f6650f3d591c',
  'src/quest-bootstrap.js': '3c037d4009127037a127aaeb310befad174b091b',
  'src/quest-map.js': '5ee376992d99fbcd8396921846d0186a0ad8d6ef',
  'src/quest-view.css': '8ad84b2e26bfd605003a172bef547bf2f98b04cb',
  'src/quest-view.js': 'bc1f972407fdbb033e621cc66a3de549e8c0e780',
  'src/styles.css': '2a7d975474c3e152550b67ae1209c17c17e6d62e',
  'src/translation-ui.js': '65726a888daff47a0be4be7d3cc81dbcde892be8',
  'src/wiki-links.js': '023718a794d7c1278c398a4c13bb46dd0521ce4c'
};

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

test(`runtime foundation is byte-for-byte CSharpAtlas ${SOURCE_COMMIT}`, async () => {
  const mismatches = [];
  for (const [path, expected] of Object.entries(EXPECTED)) {
    const actual = gitBlobSha(await readFile(path));
    if (actual !== expected) mismatches.push(`${path}: ${actual} != ${expected}`);
  }
  assert.deepEqual(mismatches, []);
});

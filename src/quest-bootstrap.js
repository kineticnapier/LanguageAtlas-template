import { articleHash } from './article-ui.js';
import { loadLocalizedContent } from './content-loader.js';
import { resolveLocale } from './i18n.js';
import { buildQuestChapter } from './quest-map.js';
import { createQuestView } from './quest-view.js';
import { typeLabel } from './translation-ui.js';

const LOCALE_STORAGE_KEY = 'csharp-atlas-locale';

const COPY = {
  ja: {
    list: '一覧で見る', quest: '学習マップで見る', chapters: '学習チャプター', fit: '全体を表示',
    main: '学習', support: '補助', openArticle: '記事を開く',
    selectNode: 'ノードを選ぶと、ここに記事の概要が表示されます。',
    help: 'ドラッグ: 移動 / ホイール: ズーム / クリック: 概要 / ダブルクリック: 記事を開く',
    stats: (main, support) => `${main} 学習ノード + ${support} 補助ノード`
  },
  en: {
    list: 'List view', quest: 'Learning map', chapters: 'Learning chapters', fit: 'Fit map',
    main: 'Learning', support: 'Support', openArticle: 'Open article',
    selectNode: 'Select a node to preview its article here.',
    help: 'Drag: pan / wheel: zoom / click: preview / double-click: open article',
    stats: (main, support) => `${main} learning + ${support} support nodes`
  }
};

function readStoredLocale() {
  try { return window.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? ''; } catch { return ''; }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function initializeQuestView() {
  const listButton = document.getElementById('listViewButton');
  const questButton = document.getElementById('questViewButton');
  const listPanel = document.getElementById('listViewPanel');
  const questPanel = document.getElementById('questViewPanel');
  const viewport = document.getElementById('questViewport');
  const world = document.getElementById('questWorld');
  const edgeLayer = document.getElementById('questEdges');
  const nodeLayer = document.getElementById('questNodes');
  const detail = document.getElementById('questDetail');
  const stats = document.getElementById('questStats');
  const chapterTitle = document.getElementById('questChapterTitle');
  const chapterDescription = document.getElementById('questChapterDescription');
  const fitButton = document.getElementById('questFitButton');
  const help = document.getElementById('questHelp');
  const asideTitle = document.getElementById('asideTitle');
  const asideButtons = [...document.querySelectorAll('aside [data-type]')];
  if (!listButton || !questButton || !listPanel || !questPanel || !viewport || !world || !edgeLayer || !nodeLayer) return;

  const locale = resolveLocale({ search: window.location.search, storedLocale: readStoredLocale() });
  const copy = COPY[locale] ?? COPY.ja;
  const [{ articles }, config] = await Promise.all([
    loadLocalizedContent({ fetchJson: loadJson, locale }),
    loadJson('/content/learning-map.json')
  ]);
  const chapters = config.chapters ?? [];
  if (!chapters.length) return;

  const originalAside = asideButtons.map(button => ({
    text: button.textContent,
    type: button.dataset.type,
    active: button.classList.contains('active')
  }));
  const originalAsideTitle = asideTitle?.textContent ?? '';
  const preservedListType = originalAside.find(item => item.active)?.type ?? 'all';
  let currentChapterId = chapters[0].id;
  let view = 'list';

  listButton.textContent = copy.list;
  questButton.textContent = copy.quest;
  fitButton.textContent = copy.fit;
  help.textContent = copy.help;

  const questView = createQuestView({
    viewport, world, edgeLayer, nodeLayer, detail, copy,
    typeLabel: type => typeLabel(type, locale),
    onOpen: id => { window.location.hash = articleHash(id); }
  });

  function currentChapter() {
    return chapters.find(chapter => chapter.id === currentChapterId) ?? chapters[0];
  }

  function renderChapter() {
    const chapter = currentChapter();
    const graph = buildQuestChapter(articles, chapter);
    questView.render(graph);
    chapterTitle.textContent = chapter.title?.[locale] ?? chapter.title?.ja ?? chapter.id;
    chapterDescription.textContent = chapter.description?.[locale] ?? chapter.description?.ja ?? '';
    const main = graph.nodes.filter(node => node.kind !== 'support').length;
    stats.textContent = copy.stats(main, graph.nodes.length - main);
    asideButtons.forEach(button => button.classList.toggle('active', button.dataset.chapter === chapter.id));
  }

  function setAsideMode(nextView) {
    if (nextView === 'quest') {
      if (asideTitle) asideTitle.textContent = copy.chapters;
      asideButtons.forEach((button, index) => {
        const chapter = chapters[index];
        if (!chapter) { button.hidden = true; return; }
        button.hidden = false;
        button.dataset.chapter = chapter.id;
        button.dataset.type = preservedListType;
        button.textContent = chapter.title?.[locale] ?? chapter.title?.ja ?? chapter.id;
        button.classList.toggle('active', chapter.id === currentChapterId);
      });
      return;
    }

    if (asideTitle) asideTitle.textContent = originalAsideTitle;
    asideButtons.forEach((button, index) => {
      delete button.dataset.chapter;
      button.hidden = false;
      button.dataset.type = originalAside[index]?.type ?? 'all';
      button.textContent = originalAside[index]?.text ?? button.textContent;
      button.classList.toggle('active', Boolean(originalAside[index]?.active));
    });
  }

  function setView(nextView) {
    view = nextView;
    const showingQuest = view === 'quest';
    document.body.classList.toggle('quest-mode', showingQuest);
    listPanel.classList.toggle('hidden', showingQuest);
    questPanel.classList.toggle('hidden', !showingQuest);
    listButton.classList.toggle('active', !showingQuest);
    questButton.classList.toggle('active', showingQuest);
    listButton.setAttribute('aria-pressed', String(!showingQuest));
    questButton.setAttribute('aria-pressed', String(showingQuest));
    setAsideMode(nextView);
    if (showingQuest) renderChapter();
  }

  asideButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (view !== 'quest' || !button.dataset.chapter) return;
      currentChapterId = button.dataset.chapter;
      renderChapter();
    });
  });
  listButton.addEventListener('click', () => setView('list'));
  questButton.addEventListener('click', () => setView('quest'));
  fitButton.addEventListener('click', () => questView.fit());
  document.querySelectorAll('[data-nav-type]').forEach(button => button.addEventListener('click', () => setView('list')));
  setView('list');
}

initializeQuestView().catch(error => {
  const stats = document.getElementById('questStats');
  if (stats) stats.textContent = error.message;
});

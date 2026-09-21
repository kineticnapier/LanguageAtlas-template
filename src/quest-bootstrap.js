import { articleHash } from './article-ui.js';
import { buildQuestChapter } from './quest-map.js';
import { createQuestView } from './quest-view.js';
import { localized, storageKey } from './site-config.js';
import { typeLabel } from './translation-ui.js';

const COPY = {
  ja: { list:'一覧で見る', quest:'学習マップで見る', chapters:'学習チャプター', fit:'全体を表示', main:'学習', support:'補助', openArticle:'記事を開く', selectNode:'ノードを選ぶと、ここに記事の概要が表示されます。', help:'ドラッグ: 移動 / ホイール: ズーム / クリック: 概要 / ダブルクリック: 記事を開く', stats:(main,support)=>`${main} 学習ノード + ${support} 補助ノード` },
  en: { list:'List view', quest:'Learning map', chapters:'Learning chapters', fit:'Fit map', main:'Learning', support:'Support', openArticle:'Open article', selectNode:'Select a node to preview its article here.', help:'Drag: pan / wheel: zoom / click: preview / double-click: open article', stats:(main,support)=>`${main} learning + ${support} support nodes` }
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

export function applyHandwrittenMapCode(config, snippets) {
  return {
    ...config,
    chapters: (config.chapters ?? []).map(chapter => ({
      ...chapter,
      nodes: (chapter.nodes ?? []).map(node => (
        (node.kind ?? 'main') === 'main'
          ? { ...node, code: snippets[node.id] ?? '' }
          : node
      ))
    }))
  };
}

async function initializeQuestView(context) {
  const { config, typeDefinitions, articles, locale } = context;
  const copy = COPY[locale] ?? COPY.ja;
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
  const typeFilters = document.getElementById('typeFilters');
  if (!listButton || !questButton || !typeFilters) return;

  const [rawMap, snippets] = await Promise.all([
    loadJson('/content/learning-map.json'),
    loadJson('/content/learning-map-code.json')
  ]);
  const map = applyHandwrittenMapCode(rawMap, snippets);
  const chapters = map.chapters ?? [];
  if (!chapters.length) return;

  const originalTypeNodes = [...typeFilters.childNodes];
  const originalAsideTitle = asideTitle?.textContent ?? '';
  let currentChapterId = chapters[0].id;
  let view = 'list';

  listButton.textContent = copy.list;
  questButton.textContent = copy.quest;
  fitButton.textContent = copy.fit;
  help.textContent = copy.help;

  const questView = createQuestView({
    viewport, world, edgeLayer, nodeLayer, detail, copy,
    typeLabel: type => typeLabel(type, locale, typeDefinitions),
    onOpen: id => { location.hash = articleHash(id); }
  });

  function currentChapter() { return chapters.find(chapter => chapter.id === currentChapterId) ?? chapters[0]; }
  function renderChapter() {
    const chapter = currentChapter();
    const graph = buildQuestChapter(articles, chapter);
    questView.render(graph);
    chapterTitle.textContent = localized(chapter.title, locale);
    chapterDescription.textContent = localized(chapter.description, locale);
    const main = graph.nodes.filter(node => node.kind !== 'support').length;
    stats.textContent = copy.stats(main, graph.nodes.length - main);
    typeFilters.querySelectorAll('[data-chapter]').forEach(button => button.classList.toggle('active', button.dataset.chapter === chapter.id));
  }

  function renderChapterButtons() {
    typeFilters.replaceChildren(...chapters.map(chapter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `type${chapter.id === currentChapterId ? ' active' : ''}`;
      button.dataset.chapter = chapter.id;
      button.textContent = localized(chapter.title, locale);
      button.addEventListener('click', () => { currentChapterId = chapter.id; renderChapter(); });
      return button;
    }));
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
    if (showingQuest) {
      if (asideTitle) asideTitle.textContent = copy.chapters;
      renderChapterButtons();
      renderChapter();
    } else {
      if (asideTitle) asideTitle.textContent = originalAsideTitle;
      typeFilters.replaceChildren(...originalTypeNodes);
    }
  }

  listButton.addEventListener('click', () => setView('list'));
  questButton.addEventListener('click', () => setView('quest'));
  fitButton.addEventListener('click', () => questView.fit());
  document.querySelectorAll('[data-nav-type]').forEach(button => button.addEventListener('click', () => { if (view === 'quest') setView('list'); }));
  void storageKey(config, 'locale');
  setView('list');
}

if (window.__languageAtlasReady) initializeQuestView(window.__languageAtlasReady);
else window.addEventListener('language-atlas-ready', event => initializeQuestView(event.detail).catch(showError), { once:true });

function showError(error) {
  const stats = document.getElementById('questStats');
  if (stats) stats.textContent = error.message;
}

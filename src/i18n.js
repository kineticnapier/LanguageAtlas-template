export const SUPPORTED_LOCALES = ['ja', 'en'];
export const DEFAULT_LOCALE = 'ja';

const UI = {
  ja: {
    all:'すべて', heroTitle1:'やりたいことも、', heroTitle2:'壊れた理由も。', categories:'種類', language:'言語',
    searchButton:'検索', recommended:'おすすめ',
    wikiHomeEyebrow:'Language Atlas ポータル', wikiHomeTitle:'探す・学ぶ', wikiArticleCount:c=>`${c}件の記事`,
    wikiFeatured:'注目の記事', wikiFeaturedDescription:'まず見ておきたい代表的な機能と実践パターン。',
    wikiNewest:'新着記事', wikiNewestDescription:'最近追加された記事。',
    wikiBeginner:'はじめての一歩', wikiBeginnerDescription:'学習を始めるならここから。',
    wikiCommonErrors:'よくあるエラー', wikiCommonErrorsDescription:'最初につまずきやすい例外・コンパイル診断・論理ミス。',
    wikiCategories:'カテゴリから探す', wikiCategoriesDescription:'種類を決めて一覧を開きます。',
    wikiLearningMap:'学習マップ', wikiLearningMapDescription:'基礎から実践まで、前提関係に沿って進めます。',
    wikiOpenLearningMap:'学習マップを開く', wikiBrowseAll:'すべての記事を見る', wikiRandom:'おまかせ表示',
    searchResults:q=>`「${q}」の検索結果`, resultCount:c=>`${c}件`,
    noResults:'一致する項目がありません。', back:'← 一覧に戻る', summary:'一言でいうと', cause:'原因', fix:'直し方',
    codeHeading:'コード', why:'なぜ？', tips:'補足', related:'関連', copy:'コピー', copied:'コピーしました', copyFailed:'コピー失敗',
    topics:'トピック', sort:'並び順', sortRecommended:'おすすめ順', sortTitle:'名前順', sortRecent:'最近見た順',
    sortFavorites:'お気に入り優先', favoritesOnly:'☆ お気に入り', recentOnly:'最近見た', activeFilters:'選択中', clearFilters:'すべて解除',
    favoriteAdd:'お気に入りに追加', favoriteRemove:'お気に入りから削除', untranslatedBadge:'未翻訳',
    fallbackBanner:'選択した言語の翻訳がまだありません。このページは日本語で表示しています。',
    contentLoadFailed:file=>`記事の取得に失敗しました: ${file}`, duplicateId:id=>`記事IDが重複しています: ${id}`
  },
  en: {
    all:'All', heroTitle1:'What you want to do,', heroTitle2:'and why it broke.', categories:'Categories', language:'Language',
    searchButton:'Search', recommended:'Recommended',
    wikiHomeEyebrow:'Language Atlas portal', wikiHomeTitle:'Explore and learn', wikiArticleCount:c=>`${c} articles`,
    wikiFeatured:'Featured articles', wikiFeaturedDescription:'Representative features and practical patterns worth seeing first.',
    wikiNewest:'New articles', wikiNewestDescription:'Recently added to the Atlas.',
    wikiBeginner:'Start here', wikiBeginnerDescription:'A compact starting path for learning the language.',
    wikiCommonErrors:'Common errors', wikiCommonErrorsDescription:'Exceptions, compiler diagnostics, and logic mistakes that often cause trouble.',
    wikiCategories:'Browse by category', wikiCategoriesDescription:'Open the article list by type.',
    wikiLearningMap:'Learning map', wikiLearningMapDescription:'Follow prerequisites from the basics through practical topics.',
    wikiOpenLearningMap:'Open learning map', wikiBrowseAll:'Browse all articles', wikiRandom:'Random article',
    searchResults:q=>`Search results for “${q}”`, resultCount:c=>`${c} results`,
    noResults:'No matching articles.', back:'← Back to list', summary:'In short', cause:'Cause', fix:'Fix', codeHeading:'Code', why:'Why?',
    tips:'Notes', related:'Related', copy:'Copy', copied:'Copied', copyFailed:'Copy failed', topics:'Topics', sort:'Sort',
    sortRecommended:'Recommended', sortTitle:'Title', sortRecent:'Recently viewed', sortFavorites:'Favorites first', favoritesOnly:'☆ Favorites',
    recentOnly:'Recent', activeFilters:'Active filters', clearFilters:'Clear all', favoriteAdd:'Add to favorites', favoriteRemove:'Remove from favorites',
    untranslatedBadge:'Not translated', fallbackBanner:'English translation is not available yet. This article is being shown in Japanese.',
    contentLoadFailed:file=>`Failed to load article content: ${file}`, duplicateId:id=>`Duplicate article ID: ${id}`
  }
};

function supported(locale) { return SUPPORTED_LOCALES.includes(String(locale ?? '')); }

export function resolveLocale({ search = '', storedLocale = '' } = {}) {
  const queryLocale = new URLSearchParams(String(search)).get('lang');
  if (supported(queryLocale)) return queryLocale;
  if (supported(storedLocale)) return String(storedLocale);
  return DEFAULT_LOCALE;
}

export function withLangParam(url, locale) {
  const raw = String(url ?? '');
  const hashIndex = raw.indexOf('#');
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const params = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '');
  params.set('lang', supported(locale) ? String(locale) : DEFAULT_LOCALE);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}

export function uiText(locale, key, ...args) {
  const dictionary = UI[supported(locale) ? locale : DEFAULT_LOCALE] ?? UI[DEFAULT_LOCALE];
  const value = dictionary[key] ?? UI[DEFAULT_LOCALE][key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
}

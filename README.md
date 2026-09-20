# LanguageAtlas Template

Programming-language Atlas sites用の共通テンプレートです。CSharpAtlasのUI・検索・学習マップを土台にしつつ、言語固有値を設定とコンテンツへ分離しています。

## 派生repoで主に変更する場所

- `public/language.config.json`: 言語名、サイト名、ロゴ、検索候補、Prism言語、localStorage prefix
- `public/content/types.json`: 記事タイプと表示名
- `public/content/topics.json`: トピックと自動分類キーワード
- `public/content/articles/*.json`: ベース記事
- `public/content/locales/{ja,en}/*.json`: 本文
- `public/content/learning-map.json`: 推奨学習順

`src/` は原則として言語非依存の共通ランタイムです。新しい言語を追加するときは、まず設定とcontentだけの差し替えで済む形を維持してください。

## Example corpus

各カテゴリにCSharpAtlas由来のexample記事を1件ずつ残しています。スキーマ・表示・学習マップの確認用であり、派生repoでは対象言語の記事へ置き換えます。

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

テストではexample corpusのja/en整合性に加え、言語固有のbrandingや識別子が共通ランタイムへ再侵入していないことも確認します。

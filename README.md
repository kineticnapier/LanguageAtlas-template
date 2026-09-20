# LanguageAtlas Template

CSharpAtlas の実装を雛形として切り出した、言語別 Atlas 用の静的サイトテンプレートです。

## 含まれるもの

- Vite + Vanilla JavaScript
- 記事一覧 / 詳細表示
- 検索、type/topic フィルタ、並び替え
- お気に入り / 最近見た記事
- ja/en ローカライズ
- Wiki 形式の記事リンク
- 学習マップ
- GitHub Actions CI
- Cloudflare Pages 互換ビルド
- 各カテゴリ1件ずつの C# example 記事

example 記事はスキーマ確認用です。派生言語の repo では記事内容と、必要に応じて Prism の言語定義・UI 文言を置き換えてください。

## 開発

```bash
npm install
npm run dev
```

## テスト / ビルド

```bash
npm test
npm run build
```

## コンテンツ

- `public/content/articles/*.json`: 言語非依存のベース記事データ
- `public/content/locales/ja/*.json`: 日本語本文
- `public/content/locales/en/*.json`: 英語本文
- `public/content/learning-map.json`: 推奨学習順

元実装: `kineticnapier/CSharpAtlas`

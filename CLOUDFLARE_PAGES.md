# Cloudflare Pages

LanguageAtlas派生サイトはViteの静的サイトとしてそのままデプロイできます。

## Pages settings

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

Cloudflare Pagesはnpm dependenciesをインストールし、Vite build後の`dist/`を公開します。`public/`配下の設定・記事JSONもbuild outputへコピーされます。

派生repoでは`public/language.config.json`のサイト名等に加え、必要ならCloudflare側のproject name、custom domain、OGP assetsを設定してください。

## Local development

```bash
npm install
npm run dev
```

## Production-like preview

```bash
npm run build
npm run preview
```

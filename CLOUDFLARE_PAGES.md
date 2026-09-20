# Cloudflare Pages

CSharpAtlas is a Vite static site and does not require ASP.NET Core or any server runtime.

## Pages settings

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

Cloudflare Pages installs the npm dependencies, runs Vite, and publishes `dist/`. Article JSON under `public/content` is copied into the built site automatically by Vite.

Git-connected Pages projects create preview deployments for pull requests and non-production branches.

## Local development

```bash
npm install
npm run dev
```

The dev server listens on `0.0.0.0`, so it can also be exposed through Cloudflare Tunnel from WSL.

## Production-like preview

```bash
npm run build
npm run preview
```

This serves the generated `dist/` output locally.

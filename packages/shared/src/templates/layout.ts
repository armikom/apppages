import type { AppData, Language } from "../types/index.js";

export interface PageMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  lang: Language;
  alternateLanguages: { lang: Language; url: string }[];
  ogType?: string;
  favicon?: string;
}

export function renderLayout(meta: PageMeta, bodyContent: string, app: AppData): string {
  const altLinks = meta.alternateLanguages
    .map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${a.url}" />`)
    .join("\n    ");

  const faviconTag = meta.favicon
    ? `<link rel="icon" type="image/png" href="${meta.favicon}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="${meta.lang}" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeAttr(meta.description)}" />
  <meta property="og:title" content="${escapeAttr(meta.title)}" />
  <meta property="og:description" content="${escapeAttr(meta.description)}" />
  <meta property="og:type" content="${meta.ogType ?? "website"}" />
  <meta property="og:url" content="${escapeAttr(meta.canonicalUrl)}" />
  ${app.icon ? `<meta property="og:image" content="${escapeAttr(app.icon)}" />` : ""}
  <link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}" />
  ${altLinks}
  ${faviconTag}
  <style>
    ${getBaseStyles(app.primaryColor)}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      ${app.icon ? `<img src="${escapeAttr(app.icon)}" alt="${escapeAttr(app.name)} icon" class="app-icon" width="48" height="48" />` : ""}
      <div class="header-text">
        <h1 class="app-name">${escapeHtml(app.name)}</h1>
      </div>
    </header>
    <main class="content">
      ${bodyContent}
    </main>
    <footer class="footer">
      <p class="powered-by">Powered by AppPages</p>
    </footer>
  </div>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}

function getBaseStyles(primaryColor: string): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fafafa;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 2px solid ${primaryColor};
    }
    .app-icon { border-radius: 12px; flex-shrink: 0; }
    .app-name { font-size: 1.25rem; font-weight: 700; color: ${primaryColor}; }
    .content h2 { font-size: 1.15rem; font-weight: 600; margin-top: 28px; margin-bottom: 8px; color: #111; }
    .content h3 { font-size: 1rem; font-weight: 600; margin-top: 20px; margin-bottom: 6px; }
    .content p { margin-bottom: 12px; color: #333; }
    .content ul, .content ol { margin-left: 20px; margin-bottom: 12px; }
    .content li { margin-bottom: 4px; }
    .content a { color: ${primaryColor}; text-decoration: underline; }
    .badge-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
    .badge-row img { height: 40px; width: auto; }
    .data-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.9rem; }
    .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    .data-table th { background: #f5f5f5; font-weight: 600; }
    .faq-item { margin-bottom: 16px; }
    .faq-q { font-weight: 600; margin-bottom: 4px; }
    .faq-a { color: #444; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9rem; }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px;
      font-size: 1rem; font-family: inherit;
    }
    .form-group textarea { min-height: 100px; resize: vertical; }
    .btn {
      display: inline-block; padding: 10px 24px; background: ${primaryColor}; color: #fff;
      border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 500;
      text-decoration: none;
    }
    .btn:hover { opacity: 0.9; }
    .hp-field { position: absolute; left: -9999px; }
    .disclaimer { margin-top: 32px; padding: 12px; background: #fff3cd; border-radius: 6px; font-size: 0.85rem; color: #664d03; }
    .version-info { font-size: 0.85rem; color: #666; margin-bottom: 20px; }
    .lang-switcher { display: flex; gap: 8px; margin-bottom: 16px; font-size: 0.85rem; }
    .lang-switcher a { color: ${primaryColor}; }
    .lang-switcher .active { font-weight: 700; text-decoration: none; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; }
    .powered-by { font-size: 0.8rem; color: #999; }
    .steps-list { counter-reset: step; list-style: none; margin-left: 0; }
    .steps-list li { counter-increment: step; margin-bottom: 8px; padding-left: 32px; position: relative; }
    .steps-list li::before {
      content: counter(step);
      position: absolute; left: 0; top: 0;
      width: 24px; height: 24px; border-radius: 50%;
      background: ${primaryColor}; color: #fff;
      font-size: 0.8rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .alert { padding: 12px 16px; border-radius: 6px; margin: 12px 0; font-size: 0.9rem; }
    .alert-info { background: #e7f3ff; color: #0c5460; }
    .alert-success { background: #d4edda; color: #155724; }
    .alert-error { background: #f8d7da; color: #721c24; display: none; }
    .retained-table td:last-child { font-style: italic; color: #666; }
    @media print {
      .footer, .lang-switcher, .btn, form { display: none; }
      body { background: #fff; }
    }
    @media (max-width: 480px) {
      .container { padding: 16px 12px; }
      .data-table { font-size: 0.8rem; }
      .data-table th, .data-table td { padding: 6px; }
    }
  `;
}

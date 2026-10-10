import type { AppData, Language } from "../types/index.js";
import { getTranslations } from "../i18n/index.js";
import { escapeHtml, escapeAttr } from "./layout.js";

export function renderLandingContent(app: AppData, lang: Language, baseUrl: string): string {
  const t = getTranslations(lang);

  let html = "";

  // Hero section
  html += `<div style="text-align: center; margin-bottom: 24px;">`;
  if (app.icon) {
    html += `<img src="${escapeAttr(app.icon)}" alt="${escapeAttr(app.name)}" width="96" height="96" style="border-radius: 20px; margin-bottom: 12px;" />`;
  }
  html += `<p>${escapeHtml(app.shortDescription)}</p>`;
  html += `</div>`;

  // Store badges
  const hasBadges = app.platforms.ios?.appStoreUrl || app.platforms.android?.playStoreUrl;
  if (hasBadges) {
    html += `<div class="badge-row" style="justify-content: center;">`;
    if (app.platforms.ios?.appStoreUrl) {
      html += `<a href="${escapeAttr(app.platforms.ios.appStoreUrl)}" target="_blank" rel="noopener noreferrer">
        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="${t.common.downloadOn} ${t.common.appStore}" height="40" />
      </a>`;
    }
    if (app.platforms.android?.playStoreUrl) {
      html += `<a href="${escapeAttr(app.platforms.android.playStoreUrl)}" target="_blank" rel="noopener noreferrer">
        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="${t.common.getItOn} ${t.common.googlePlay}" height="40" style="height: 55px; margin-top: -7px;" />
      </a>`;
    }
    html += `</div>`;
  }

  // Navigation to other pages
  html += `<nav style="margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;">`;
  html += `<a href="${baseUrl}/privacy" class="btn" style="font-size: 0.9rem; padding: 8px 16px;">${t.privacy.title}</a>`;
  html += `<a href="${baseUrl}/terms" class="btn" style="font-size: 0.9rem; padding: 8px 16px;">${t.terms.title}</a>`;
  html += `<a href="${baseUrl}/support" class="btn" style="font-size: 0.9rem; padding: 8px 16px;">${t.support.title}</a>`;
  html += `</nav>`;

  // Custom sections for landing
  for (const section of app.customSections.filter((s) => s.pageType === "landing")) {
    html += `<h2>${escapeHtml(section.title)}</h2>`;
    html += `<p>${escapeHtml(section.content)}</p>`;
  }

  return html;
}

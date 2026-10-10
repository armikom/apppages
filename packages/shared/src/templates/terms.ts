import type { AppData, Language } from "../types/index.js";
import { getTranslations } from "../i18n/index.js";
import { escapeHtml } from "./layout.js";

export function renderTermsContent(app: AppData, lang: Language, lastUpdated: string): string {
  const t = getTranslations(lang);
  const { publisher, dataPractices } = app;

  let html = "";

  html += `<p class="version-info">${t.common.lastUpdated}: ${escapeHtml(lastUpdated)}</p>`;
  html += `<h2>${t.terms.title}</h2>`;

  if (app.useAppleStandardEula) {
    html += `<p>${t.terms.appleEula}</p>`;
    html += `<p><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">${t.terms.appleEulaLink}</a></p>`;
    html += `<hr style="margin: 24px 0;" />`;
  }

  html += `<p>${t.terms.intro(app.name, publisher.legalEntityName)}</p>`;

  html += `<h2>${t.terms.acceptanceTitle}</h2>`;
  html += `<p>${t.terms.acceptanceBody}</p>`;

  html += `<h2>${t.terms.licenseTitle}</h2>`;
  html += `<p>${t.terms.licenseBody}</p>`;

  html += `<h2>${t.terms.restrictionsTitle}</h2>`;
  html += `<p>${t.terms.restrictionsBody}</p>`;

  if (dataPractices.inAppPurchases) {
    html += `<h2>${t.terms.iapTitle}</h2>`;
    html += `<p>${t.terms.iapBody}</p>`;
  }

  html += `<h2>${t.terms.terminationTitle}</h2>`;
  html += `<p>${t.terms.terminationBody}</p>`;

  html += `<h2>${t.terms.disclaimerTitle}</h2>`;
  html += `<p>${t.terms.disclaimerBody}</p>`;

  html += `<h2>${t.terms.liabilityTitle}</h2>`;
  html += `<p>${t.terms.liabilityBody}</p>`;

  // Custom sections for terms
  for (const section of app.customSections.filter((s) => s.pageType === "terms")) {
    html += `<h2>${escapeHtml(section.title)}</h2>`;
    html += `<p>${escapeHtml(section.content)}</p>`;
  }

  html += `<h2>${t.terms.changesTitle}</h2>`;
  html += `<p>${t.terms.changesBody}</p>`;

  html += `<h2>${t.terms.contactTitle}</h2>`;
  html += `<p>${t.terms.contactBody(publisher.contactEmail)}</p>`;

  html += `<div class="disclaimer"><p>${t.terms.disclaimer}</p></div>`;

  return html;
}

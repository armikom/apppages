import type { AppData, Language } from "../types/index.js";
import { getTranslations } from "../i18n/index.js";
import { escapeHtml } from "./layout.js";

export function renderPrivacyContent(app: AppData, lang: Language, lastUpdated: string): string {
  const t = getTranslations(lang);
  const { dataPractices, publisher } = app;

  let html = "";

  html += `<p class="version-info">${t.common.lastUpdated}: ${escapeHtml(lastUpdated)}</p>`;
  html += `<h2>${t.privacy.title}</h2>`;
  html += `<p>${t.privacy.intro(app.name, publisher.legalEntityName)}</p>`;

  // Data collection
  if (dataPractices.dataTypesCollected.length > 0) {
    html += `<h2>${t.privacy.dataCollectionTitle}</h2>`;
    html += `<p>${t.privacy.dataCollectionIntro}</p>`;
    html += `<table class="data-table">
      <thead><tr>
        <th>Type</th>
        <th>${t.privacy.purposeLabel}</th>
        <th>${t.privacy.sharedLabel}</th>
        <th>${t.privacy.encryptedLabel}</th>
        <th>${t.privacy.retentionLabel}</th>
      </tr></thead><tbody>`;
    for (const dt of dataPractices.dataTypesCollected) {
      html += `<tr>
        <td>${escapeHtml(dt.type)}</td>
        <td>${escapeHtml(dt.purpose)}</td>
        <td>${dt.sharedWithThirdParties ? t.common.yes : t.common.no}</td>
        <td>${dt.encryptedInTransit ? t.common.yes : t.common.no}</td>
        <td>${escapeHtml(dt.retentionPeriod)}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }

  // Third-party SDKs
  if (dataPractices.thirdPartySdks.length > 0) {
    html += `<h2>${t.privacy.thirdPartyTitle}</h2>`;
    html += `<p>${t.privacy.thirdPartyIntro}</p>`;
    html += `<ul>`;
    for (const sdk of dataPractices.thirdPartySdks) {
      html += `<li><strong>${escapeHtml(sdk.name)}</strong> — <a href="${escapeHtml(sdk.policyUrl)}" target="_blank" rel="noopener noreferrer">${t.privacy.title}</a></li>`;
    }
    html += `</ul>`;
  }

  // Children
  html += `<h2>${t.privacy.childrenTitle}</h2>`;
  html += `<p>${dataPractices.childrenTarget ? t.privacy.childrenYes : t.privacy.childrenNo}</p>`;

  // Ads
  html += `<h2>${t.privacy.adsTitle}</h2>`;
  html += `<p>${dataPractices.adsEnabled ? t.privacy.adsYes : t.privacy.adsNo}</p>`;

  // Regulatory sections
  if (dataPractices.gdprEnabled) {
    html += `<h2>${t.privacy.gdprTitle}</h2>`;
    html += `<p>${t.privacy.gdprBody}</p>`;
  }
  if (dataPractices.kvkkEnabled) {
    html += `<h2>${t.privacy.kvkkTitle}</h2>`;
    html += `<p>${t.privacy.kvkkBody}</p>`;
  }
  if (dataPractices.ccpaEnabled) {
    html += `<h2>${t.privacy.ccpaTitle}</h2>`;
    html += `<p>${t.privacy.ccpaBody}</p>`;
  }

  // Custom sections for privacy
  for (const section of app.customSections.filter((s) => s.pageType === "privacy")) {
    html += `<h2>${escapeHtml(section.title)}</h2>`;
    html += `<p>${escapeHtml(section.content)}</p>`;
  }

  // Changes
  html += `<h2>${t.privacy.changesTitle}</h2>`;
  html += `<p>${t.privacy.changesBody}</p>`;

  // Contact
  html += `<h2>${t.privacy.contactTitle}</h2>`;
  html += `<p>${t.privacy.contactBody(publisher.contactEmail)}</p>`;

  // Disclaimer
  html += `<div class="disclaimer"><p>${t.privacy.disclaimer}</p></div>`;

  return html;
}

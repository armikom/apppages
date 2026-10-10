import type { AppData, Language, DeletionInfo } from "../types/index.js";
import { getTranslations } from "../i18n/index.js";
import { escapeHtml } from "./layout.js";

export function renderDeletionContent(
  app: AppData,
  lang: Language,
  formActionUrl: string,
  isDataOnly: boolean = false
): string {
  const t = getTranslations(lang);
  const info: DeletionInfo = isDataOnly ? (app.dataDeletionInfo ?? app.deletionInfo) : app.deletionInfo;
  const tSection = isDataOnly ? t.deleteData : t.deleteAccount;
  const headingFn = isDataOnly ? t.deleteData.heading : t.deleteAccount.heading;
  const introFn = isDataOnly ? t.deleteData.intro : t.deleteAccount.intro;
  const requestType = isDataOnly ? "data_deletion" : "deletion";

  let html = "";

  html += `<h2>${headingFn(app.name)}</h2>`;
  html += `<p>${introFn(app.name, app.publisher.legalEntityName)}</p>`;

  // Steps
  html += `<h2>${t.deleteAccount.stepsTitle}</h2>`;
  html += `<p>${t.deleteAccount.stepsInApp}</p>`;
  html += `<ol class="steps-list">`;
  for (const step of info.stepsToDelete) {
    html += `<li>${escapeHtml(step)}</li>`;
  }
  html += `</ol>`;

  // Data deleted
  if (info.dataDeleted.length > 0) {
    html += `<h2>${t.deleteAccount.dataDeletedTitle}</h2>`;
    html += `<ul>`;
    for (const item of info.dataDeleted) {
      html += `<li>${escapeHtml(item)}</li>`;
    }
    html += `</ul>`;
  }

  // Data retained
  if (info.dataRetained.length > 0) {
    html += `<h2>${t.deleteAccount.dataRetainedTitle}</h2>`;
    html += `<table class="data-table retained-table">
      <thead><tr><th>Type</th><th>${t.deleteAccount.retainedPeriod}</th></tr></thead>
      <tbody>`;
    for (const item of info.dataRetained) {
      html += `<tr><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.period)}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  // Custom sections
  const pageType = isDataOnly ? "delete-data" : "delete-account";
  for (const section of app.customSections.filter((s) => s.pageType === pageType)) {
    html += `<h2>${escapeHtml(section.title)}</h2>`;
    html += `<p>${escapeHtml(section.content)}</p>`;
  }

  // Web form
  if (info.webFormEnabled) {
    html += `<h2>${t.deleteAccount.webFormTitle}</h2>`;
    html += `<p>${t.deleteAccount.webFormIntro}</p>`;
    html += `<div class="alert alert-info"><p>${t.deleteAccount.confirmationRequired}</p></div>`;
    html += `<form method="POST" action="${escapeHtml(formActionUrl)}">
      <input type="hidden" name="type" value="${requestType}" />
      <div class="hp-field">
        <label for="website">Website</label>
        <input type="text" name="honeypot" id="website" tabindex="-1" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="email">${t.deleteAccount.formEmail} *</label>
        <input type="email" name="email" id="email" required />
      </div>
      <div class="form-group">
        <label for="username">${t.deleteAccount.formUsername}</label>
        <input type="text" name="username" id="username" />
      </div>
      <div class="form-group">
        <label for="reason">${t.deleteAccount.formReason}</label>
        <textarea name="reason" id="reason"></textarea>
      </div>
      <button type="submit" class="btn">${isDataOnly ? t.deleteData.formSubmit : t.deleteAccount.formSubmit}</button>
    </form>`;
  }

  return html;
}

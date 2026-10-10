import type { AppData, Language } from "../types/index.js";
import { getTranslations } from "../i18n/index.js";
import { escapeHtml } from "./layout.js";

export function renderSupportContent(app: AppData, lang: Language, formActionUrl: string): string {
  const t = getTranslations(lang);
  const { supportInfo, publisher } = app;

  let html = "";

  html += `<h2>${t.support.title}</h2>`;

  // FAQ
  if (supportInfo.faqItems.length > 0) {
    html += `<h2>${t.support.faqTitle}</h2>`;
    for (const faq of supportInfo.faqItems) {
      html += `<div class="faq-item">
        <p class="faq-q">${escapeHtml(faq.question)}</p>
        <p class="faq-a">${escapeHtml(faq.answer)}</p>
      </div>`;
    }
  }

  // Contact
  html += `<h2>${t.support.contactTitle}</h2>`;
  html += `<p>${t.support.contactIntro(supportInfo.contactEmail)}</p>`;

  // Custom sections
  for (const section of app.customSections.filter((s) => s.pageType === "support")) {
    html += `<h2>${escapeHtml(section.title)}</h2>`;
    html += `<p>${escapeHtml(section.content)}</p>`;
  }

  // Support form
  if (supportInfo.supportFormEnabled) {
    html += `<h2>${t.support.formTitle}</h2>`;
    html += `<form method="POST" action="${escapeHtml(formActionUrl)}">
      <input type="hidden" name="type" value="support" />
      <div class="hp-field">
        <label for="website">Website</label>
        <input type="text" name="honeypot" id="website" tabindex="-1" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="email">${t.support.formEmail} *</label>
        <input type="email" name="email" id="email" required />
      </div>
      <div class="form-group">
        <label for="message">${t.support.formMessage} *</label>
        <textarea name="message" id="message" required></textarea>
      </div>
      <button type="submit" class="btn">${t.support.formSubmit}</button>
    </form>`;
  }

  return html;
}

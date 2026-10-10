import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { AppData, Language } from "@apppages/shared";
import {
  renderLayout,
  renderPrivacyContent,
  renderTermsContent,
  renderSupportContent,
  renderDeletionContent,
  renderLandingContent,
  isValidLanguage,
  getTranslations,
} from "@apppages/shared";
import type { PageMeta } from "@apppages/shared";

let _db: Firestore;
function db() { return _db ??= getFirestore(); }

interface RouteParams {
  slug: string;
  page: string;
  lang: Language;
}

function parseRoute(path: string): RouteParams | null {
  // Remove /p/ prefix
  const cleaned = path.replace(/^\/p\//, "").replace(/\/$/, "");
  const parts = cleaned.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  const slug = parts[0];
  let lang: Language = "en";
  let page = "landing";

  if (parts.length === 1) {
    page = "landing";
  } else if (parts.length === 2) {
    if (isValidLanguage(parts[1])) {
      lang = parts[1];
      page = "landing";
    } else {
      page = parts[1];
    }
  } else if (parts.length === 3) {
    if (isValidLanguage(parts[1])) {
      lang = parts[1];
      page = parts[2];
    } else {
      page = parts[1]; // e.g., privacy/history
      if (parts[2] === "history") page = `${parts[1]}/history`;
    }
  }

  return { slug, page, lang };
}

async function getAppBySlug(slug: string): Promise<AppData | null> {
  const slugDoc = await db().doc(`slugs/${slug}`).get();
  if (!slugDoc.exists) return null;

  const { accountId, appId } = slugDoc.data() as { accountId: string; appId: string };
  const appDoc = await db().doc(`accounts/${accountId}/apps/${appId}`).get();
  if (!appDoc.exists) return null;

  return { id: appDoc.id, ...appDoc.data() } as AppData;
}

function render404(lang: Language): string {
  const t = getTranslations(lang);
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.notFound.title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#333;}
.c{text-align:center;padding:24px;}.c h1{font-size:2rem;margin-bottom:8px;}</style>
</head><body><div class="c"><h1>404</h1><p>${t.notFound.body}</p></div></body></html>`;
}

function render410(lang: Language): string {
  const t = getTranslations(lang);
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.gone.title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa;color:#333;}
.c{text-align:center;padding:24px;}.c h1{font-size:2rem;margin-bottom:8px;}</style>
</head><body><div class="c"><h1>410</h1><p>${t.gone.body}</p></div></body></html>`;
}

function buildBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }, slug: string): string {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  return `${proto}://${host}/p/${slug}`;
}

function buildAlternateLanguages(baseUrl: string, page: string, currentLang: Language, languages: Language[]): { lang: Language; url: string }[] {
  return languages.map((l) => ({
    lang: l,
    url: l === "en" ? `${baseUrl}/${page}` : `${baseUrl}/${l}/${page}`,
  }));
}

export const publicPages = onRequest(
  { region: "us-central1", memory: "256MiB", minInstances: 0 },
  async (req, res) => {
    // Also check ?lang= query param
    const route = parseRoute(req.path);
    if (!route) {
      res.status(404).send(render404("en"));
      return;
    }

    // Query param override
    const langParam = req.query.lang as string | undefined;
    if (langParam && isValidLanguage(langParam)) {
      route.lang = langParam;
    }

    const app = await getAppBySlug(route.slug);

    if (!app) {
      res.status(404).send(render404(route.lang));
      return;
    }

    if (app.status === "disabled") {
      res.status(410).send(render410(route.lang));
      return;
    }

    if (app.status !== "published") {
      res.status(404).send(render404(route.lang));
      return;
    }

    const baseUrl = buildBaseUrl(req, route.slug);
    const allLangs: Language[] = [app.defaultLanguage, ...app.additionalLanguages];
    const t = getTranslations(route.lang);
    const lastUpdated = app.publishedAt
      ? new Date(app.publishedAt as unknown as string).toLocaleDateString(route.lang === "tr" ? "tr-TR" : "en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US");
    const formActionUrl = `/api/request/${route.slug}`;

    let bodyContent = "";
    let pageTitle = app.name;
    let pageDescription = app.shortDescription;

    switch (route.page) {
      case "landing":
        bodyContent = renderLandingContent(app, route.lang, baseUrl);
        break;

      case "privacy":
        bodyContent = renderPrivacyContent(app, route.lang, lastUpdated);
        pageTitle = `${t.privacy.title} — ${app.name}`;
        pageDescription = `${t.privacy.title} for ${app.name}`;
        break;

      case "privacy/history": {
        const versionsSnap = await db()
          .collection(`accounts/${app.accountId}/apps/${app.id}/versions`)
          .orderBy("version", "desc")
          .limit(50)
          .get();
        bodyContent = `<h2>${t.common.history}: ${t.privacy.title}</h2>`;
        if (versionsSnap.empty) {
          bodyContent += `<p>No version history available.</p>`;
        } else {
          bodyContent += `<ul>`;
          for (const doc of versionsSnap.docs) {
            const v = doc.data();
            const date = v.publishedAt?.toDate?.()
              ? v.publishedAt.toDate().toLocaleDateString()
              : "Unknown";
            bodyContent += `<li>${t.common.version} ${v.version} — ${date}</li>`;
          }
          bodyContent += `</ul>`;
        }
        pageTitle = `${t.common.history} — ${app.name}`;
        break;
      }

      case "terms":
        bodyContent = renderTermsContent(app, route.lang, lastUpdated);
        pageTitle = `${t.terms.title} — ${app.name}`;
        pageDescription = `${t.terms.title} for ${app.name}`;
        break;

      case "support":
        bodyContent = renderSupportContent(app, route.lang, formActionUrl);
        pageTitle = `${t.support.title} — ${app.name}`;
        pageDescription = `${t.support.title} for ${app.name}`;
        break;

      case "delete-account":
        bodyContent = renderDeletionContent(app, route.lang, formActionUrl, false);
        pageTitle = `${t.deleteAccount.title} — ${app.name}`;
        pageDescription = `${t.deleteAccount.title} for ${app.name}`;
        break;

      case "delete-data":
        if (!app.dataDeletionEnabled) {
          res.status(404).send(render404(route.lang));
          return;
        }
        bodyContent = renderDeletionContent(app, route.lang, formActionUrl, true);
        pageTitle = `${t.deleteData.title} — ${app.name}`;
        pageDescription = `${t.deleteData.title} for ${app.name}`;
        break;

      default:
        res.status(404).send(render404(route.lang));
        return;
    }

    // Language switcher
    if (allLangs.length > 1) {
      const langLinks = allLangs
        .map((l) => {
          const url = l === app.defaultLanguage ? `${baseUrl}/${route.page}` : `${baseUrl}/${l}/${route.page}`;
          const isActive = l === route.lang;
          const label = l === "en" ? "English" : "Türkçe";
          return isActive ? `<span class="active">${label}</span>` : `<a href="${url}">${label}</a>`;
        })
        .join(" | ");
      bodyContent = `<div class="lang-switcher">${langLinks}</div>` + bodyContent;
    }

    const meta: PageMeta = {
      title: pageTitle,
      description: pageDescription,
      canonicalUrl: `${baseUrl}/${route.page}`,
      lang: route.lang,
      alternateLanguages: buildAlternateLanguages(baseUrl, route.page, route.lang, allLangs),
      favicon: app.icon,
    };

    const fullHtml = renderLayout(meta, bodyContent, app);

    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(fullHtml);
  }
);

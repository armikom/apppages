import { en } from "./en.js";
import { tr } from "./tr.js";
import type { Language } from "../types/index.js";

export { en, tr };

const translations = { en, tr } as const;

export function getTranslations(lang: Language) {
  return translations[lang] ?? translations.en;
}

export function getSupportedLanguages(): Language[] {
  return ["en", "tr"];
}

export function isValidLanguage(lang: string): lang is Language {
  return lang === "en" || lang === "tr";
}

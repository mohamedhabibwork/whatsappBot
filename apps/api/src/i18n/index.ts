import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";

export type Language = "en" | "ar";

export const supportedLanguages: Language[] = ["en", "ar"];
export const defaultLanguage: Language = "en";

// Initialize i18next
i18next.use(Backend).init({
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: supportedLanguages,
  preload: supportedLanguages,
  ns: ["common"],
  defaultNS: "common",
  backend: {
    loadPath: path.join(process.cwd(), "locales", "{{lng}}", "{{ns}}.json"),
  },
  interpolation: {
    escapeValue: false,
  },
});

export const i18n = i18next;

export function t(key: string, language: Language = defaultLanguage, options?: any): string {
  return i18n.t(key, { lng: language, ...options });
}

export function getLanguageFromHeader(acceptLanguage?: string): Language {
  if (!acceptLanguage) return defaultLanguage;
  
  const lang = acceptLanguage.split(",")[0].split("-")[0].toLowerCase();
  return supportedLanguages.includes(lang as Language) ? (lang as Language) : defaultLanguage;
}

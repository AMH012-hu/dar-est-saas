import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en" | "he" | "ru" | "uk";
export const languageOptions: Array<{ code: Lang; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

const rtlLanguages = new Set<Lang>(["ar", "he"]);

type LocaleContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: "rtl" | "ltr";
  languageOptions: typeof languageOptions;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLanguage(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("dar-est-language") as Lang | null;
  const explicitlyChosen = window.localStorage.getItem("dar-est-language-explicit") === "1";
  return explicitlyChosen && stored && languageOptions.some(option => option.code === stored) ? stored : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLanguage);
  const setLang = (nextLang: Lang) => {
    window.localStorage.setItem("dar-est-language-explicit", "1");
    setLangState(nextLang);
  };
  const dir: "rtl" | "ltr" = rtlLanguages.has(lang) ? "rtl" : "ltr";

  useEffect(() => {
    window.localStorage.setItem("dar-est-language", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo(() => ({ lang, setLang, dir, languageOptions }), [lang, dir]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

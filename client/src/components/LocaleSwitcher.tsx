import { useEffect, useState } from "react";
import { Globe2, Moon, Sun } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, languageOptions } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [changingLanguage, setChangingLanguage] = useState(false);
  useEffect(() => {
    if (!changingLanguage) return;
    const timer = window.setTimeout(() => setChangingLanguage(false), 260);
    return () => window.clearTimeout(timer);
  }, [changingLanguage]);
  const changeLanguage = (value: typeof lang) => {
    setChangingLanguage(true);
    setLang(value);
  };
  const themeLabel = theme === "dark"
    ? (lang === "ar" ? "التبديل إلى المظهر الفاتح" : "Switch to light appearance")
    : (lang === "ar" ? "التبديل إلى المظهر الداكن" : "Switch to dark appearance");

  if (compact) {
    return (
      <label className={`theme-control inline-flex h-12 items-center gap-2 rounded-2xl border border-[#a88cff]/45 bg-[#1c214d]/95 px-3 text-xs font-semibold text-[#d9d0ff] backdrop-blur-xl transition-transform duration-200 motion-safe:active:scale-95 ${changingLanguage ? "motion-safe:scale-[1.04] motion-safe:ring-2 motion-safe:ring-[#a88cff]/40" : ""}`}>
        <Globe2 size={16} aria-hidden="true" />
        <select
          aria-label="Language"
          value={lang}
          onChange={event => changeLanguage(event.target.value as typeof lang)}
          className="max-w-20 appearance-none bg-transparent text-inherit outline-none"
        >
          {languageOptions.map(option => <option key={option.code} value={option.code} className="bg-[#0b2332] text-white">{option.label}</option>)}
        </select>
      </label>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <label className={`theme-control inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-3 py-2 text-xs text-white/75 transition-transform duration-200 motion-safe:active:scale-95 ${changingLanguage ? "motion-safe:scale-[1.04] motion-safe:ring-2 motion-safe:ring-[#a88cff]/35" : ""}`}>
        <Globe2 size={14} aria-hidden="true" />
        <select aria-label="Language" value={lang} onChange={event => changeLanguage(event.target.value as typeof lang)} className="appearance-none bg-transparent outline-none">
          {languageOptions.map(option => <option key={option.code} value={option.code} className="bg-[#0b2332] text-white">{option.label}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => toggleTheme?.()} aria-label={themeLabel} title={themeLabel} className="theme-control inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[.04] text-[#a88cff] transition hover:border-[#a88cff]/70 hover:bg-white/[.1]" >
        {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
      </button>
    </div>
  );
}

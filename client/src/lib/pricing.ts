import type { Lang } from "@/contexts/LocaleContext";

/** Display rate agreed for the public pricing page: EGP 5,000 = USD 100. */
export const EGP_PER_USD = 50;

export function displayAmount(amountEgp: number, lang: Lang): number {
  return lang === "en" ? amountEgp / EGP_PER_USD : amountEgp;
}

export function formatPlanAmount(amountEgp: number, lang: Lang): string {
  const amount = displayAmount(amountEgp, lang);
  return amount.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: lang === "en" && !Number.isInteger(amount) ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function planCurrency(lang: Lang): string {
  return lang === "en" ? "$" : "جنيه";
}

export function formatPlanPrice(amountEgp: number, lang: Lang): string {
  return lang === "en"
    ? `$${formatPlanAmount(amountEgp, lang)}`
    : `${formatPlanAmount(amountEgp, lang)} جنيه`;
}

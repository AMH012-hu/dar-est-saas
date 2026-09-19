export const SUBSCRIPTION_PLANS = {
  monthly: {
    code: "monthly",
    labelAr: "شهر واحد",
    durationMonths: 1,
    priceIls: 999,
    featured: false,
    noteAr: "مرونة شهرية كاملة",
    limits: { properties: 5, clients: 20, tasks: 20, members: 3 },
  },
  quarterly: {
    code: "quarterly",
    labelAr: "3 أشهر",
    durationMonths: 3,
    priceIls: 1999,
    featured: true,
    noteAr: "الأوفر لكل شهر",
    limits: { properties: 20, clients: 100, tasks: 100, members: 10 },
  },
  semiannual: {
    code: "semiannual",
    labelAr: "6 أشهر",
    durationMonths: 6,
    priceIls: 2999,
    featured: false,
    noteAr: "استمرارية بلا انقطاع",
    limits: { properties: 100, clients: 500, tasks: 500, members: 25 },
  },
  annual: {
    code: "annual",
    labelAr: "سنة كاملة",
    durationMonths: 12,
    priceIls: 4999,
    featured: false,
    noteAr: "خطة المؤسسات طويلة المدى",
    limits: { properties: null, clients: null, tasks: null, members: null },
  },
  lifetime: {
    code: "lifetime",
    labelAr: "مدى الحياة",
    durationMonths: 0,
    priceIls: 20000,
    featured: false,
    noteAr: "للشركات الكبيرة",
    limits: { properties: null, clients: null, tasks: null, members: null },
  },
} as const;

export type PlanCode = keyof typeof SUBSCRIPTION_PLANS;

export const PLAN_CODES = Object.keys(SUBSCRIPTION_PLANS) as PlanCode[];

export function isPlanCode(value: string): value is PlanCode {
  return PLAN_CODES.includes(value as PlanCode);
}

export function getPlan(code: PlanCode) {
  return SUBSCRIPTION_PLANS[code];
}

export function addPlanMonths(baseDate: Date, planCode: PlanCode): Date {
  if (planCode === "lifetime") {
    // MySQL TIMESTAMP values must remain within their supported range. This
    // far-future sentinel is treated as lifetime by the product catalog.
    return new Date("2037-12-31T23:59:59.000Z");
  }
  const result = new Date(baseDate.getTime());
  result.setUTCMonth(result.getUTCMonth() + getPlan(planCode).durationMonths);
  return result;
}

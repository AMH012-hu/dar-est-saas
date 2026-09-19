import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import Home from "./pages/Home";
import FloatingPropertyAgent from "./components/FloatingPropertyAgent";

const Account = lazy(() => import("./pages/Account"));
const Plans = lazy(() => import("./pages/Plans"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Owner = lazy(() => import("./pages/Owner"));
const Checkout = lazy(() => import("./pages/Checkout"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const PaymentConfirmation = lazy(() => import("./pages/PaymentConfirmation"));
const Workspace = lazy(() => import("./pages/Workspace"));
const DocumentCenter = lazy(() => import("./pages/DocumentCenter"));
const ActionCenter = lazy(() => import("./pages/ActionCenter"));
const OperationalReports = lazy(() => import("./pages/OperationalReports"));
const WorkspaceModule = lazy(() => import("./pages/WorkspaceModule"));
const TenantPortal = lazy(() => import("./pages/TenantPortal"));
const SalesWorkspace = lazy(() => import("./pages/SalesWorkspace"));
const AcceptSalesInvite = lazy(() => import("./pages/AcceptSalesInvite"));
const ClientDemo = lazy(() => import("./pages/ClientDemo"));
const SalesHub = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesHub }));
const SalesProperties = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesProperties }));
const SalesPropertyDetail = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesPropertyDetail }));
const SalesClients = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesClients }));
const SalesClientDetail = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesClientDetail }));
const SalesContracts = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesContracts }));
const SalesImport = lazy(async () => ({ default: (await import("./pages/SalesCenterPages")).SalesImport }));
const SalesCRM = lazy(() => import("./pages/SalesCRM"));
const IntegrationCenter = lazy(() => import("./pages/IntegrationCenter"));
const Projects = lazy(() => import("./pages/PublicProperties"));
const ProjectDetail = lazy(async () => ({ default: (await import("./pages/PublicProperties")).PublicPropertyDetail }));
const Auth = lazy(() => import("./pages/Auth"));

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#071a27] px-6 text-white"><section className="max-w-lg rounded-[2rem] border border-white/10 bg-white/[.04] p-10 text-center backdrop-blur-xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d8b26b]/15 text-2xl font-bold text-[#e3c27e]">D</div><h1 className="mt-6 text-3xl font-semibold">{title}</h1><p className="mt-4 leading-8 text-white/55">{description}</p><a href="/" className="mt-8 inline-flex rounded-full bg-[#d8b26b] px-6 py-3 font-semibold text-[#071a27]">العودة للرئيسية</a></section></main>;
}

function RouteLoading() {
  const { lang, dir } = useLocale();
  const labels = { ar: "جارٍ تحميل الصفحة…", en: "Loading page…", he: "העמוד נטען…", ru: "Загрузка страницы…", uk: "Завантаження сторінки…" };
  return <main dir={dir} className="flex min-h-screen items-center justify-center bg-[#071a27] px-6 text-white" aria-live="polite"><div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[.04] px-5 py-3 text-sm text-white/75"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d8b26b] border-t-transparent" aria-hidden="true" />{labels[lang]}</div></main>;
}

function Router() {
  return <Suspense fallback={<RouteLoading />}><Switch><Route path="/login" component={Auth} /><Route path="/register" component={Auth} /><Route path="/" component={Home} /><Route path="/plans" component={Plans} /><Route path="/demo" component={ClientDemo} /><Route path="/account" component={Account} /><Route path="/workspace/action-center" component={ActionCenter} /><Route path="/workspace/documents" component={DocumentCenter} /><Route path="/workspace/reports" component={OperationalReports} /><Route path="/workspace/:module" component={WorkspaceModule} /><Route path="/workspace" component={Workspace} /><Route path="/projects/:id" component={ProjectDetail} /><Route path="/projects" component={Projects} /><Route path="/sales/properties/:id" component={SalesPropertyDetail} /><Route path="/sales/properties" component={SalesProperties} /><Route path="/sales/clients/:id" component={SalesClientDetail} /><Route path="/sales/clients" component={SalesClients} /><Route path="/sales/contracts" component={SalesContracts} /><Route path="/sales/import" component={SalesImport} /><Route path="/sales/crm" component={SalesCRM} /><Route path="/sales/integrations" component={IntegrationCenter} /><Route path="/sales/team" component={SalesWorkspace} /><Route path="/sales/invite/:token" component={AcceptSalesInvite} /><Route path="/sales" component={SalesHub} /><Route path="/tenant-portal" component={TenantPortal} /><Route path="/owner" component={Owner} /><Route path="/checkout" component={Checkout} /><Route path="/payment-confirmation" component={PaymentConfirmation} /><Route path="/invite/:token" component={AcceptInvite} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></Suspense>;
}

export default function App() {
  const [location] = useLocation();
  const isIndependentProjectsSite = location === "/projects" || location.startsWith("/projects/");
  return <ErrorBoundary><LocaleProvider><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><Toaster /><Router />{!isIndependentProjectsSite && <FloatingPropertyAgent />}</TooltipProvider></ThemeProvider></LocaleProvider></ErrorBoundary>;
}

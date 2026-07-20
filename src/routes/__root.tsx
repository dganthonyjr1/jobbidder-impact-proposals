import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LeadChatWidget } from "@/components/LeadChatWidget";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/lib/theme-store";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * WidgetGate — renders the chat widget only on public marketing/landing pages.
 * Suppressed on:
 *  - /intake/*  — standalone intake form (has its own phone field)
 *  - /p/*       — proposal view page
 *  - /e/*       — proposal acceptance/e-sign page
 *  - /dashboard, /proposals, /settings, /automation-setup — authenticated contractor portal
 *  - /sign-in, /sign-up — auth pages
 *
 * This satisfies the GHL A2P carrier requirement:
 * "No forms collecting phone numbers or SMS opt-in consent exist on any page
 *  where the chat widget is embedded."
 */
function WidgetGate() {
  const { pathname } = useLocation();
  const suppress =
    pathname.startsWith('/intake/') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/e/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/proposals') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/automation-setup') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up');
  if (suppress) return null;
  return <LeadChatWidget />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Jobbidder — AI-Powered Contractor Proposals" },
      { name: "description", content: "Get a free Good/Better/Best estimate from a local contractor in under 60 seconds." },
      { name: "author", content: "Jobbidder" },
      { property: "og:title", content: "Jobbidder — AI-Powered Contractor Proposals" },
      { property: "og:description", content: "Get a free Good/Better/Best estimate from a local contractor in under 60 seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Jobbidder — AI-Powered Contractor Proposals" },
      { name: "twitter:description", content: "Get a free Good/Better/Best estimate from a local contractor in under 60 seconds." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Apply saved theme before paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('jobbidder-theme')==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
        {/* GHL Lead Connector widget — required for A2P SMS compliance verification. Hidden via CSS — do NOT remove. */}
        <script
          src="https://widgets.leadconnectorhq.com/loader.js"
          data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
          data-widget-id="6a307915612788283cd21674"
          data-source="WEB_USER"
          async
        />
        {/* Hide GHL widget visually — kept for A2P compliance only */}
        <style>{`
          #LeadConnector-widget-container,
          #lc-widget-container,
          [id^="lc-"],
          [class*="lc-widget"],
          [class*="leadconnector"],
          iframe[src*="leadconnectorhq.com"],
          iframe[src*="widgets.leadconnector"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            z-index: -9999 !important;
          }
        `}</style>
      </head>
      <body>
        {children}
        <Scripts />
        <ClientOnly fallback={null}>
          <ThemeToggle />
          <WidgetGate />
        </ClientOnly>
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { theme } = useTheme();

  // Capture affiliate referral code from any landing URL (e.g. /?ref=JB-XXXXX)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && ref.startsWith("JB-")) {
      localStorage.setItem("jobbidder_ref", ref);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <ClientOnly fallback={null}>
        <Toaster theme={theme} position="top-center" richColors />
      </ClientOnly>
    </QueryClientProvider>
  );
}

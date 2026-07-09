import { RootRoute, Router } from '@tanstack/react-router';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeadContent } from './components/HeadContent';
import { Scripts } from './components/Scripts';
import { WidgetGate } from './components/WidgetGate';
import { ClientOnly } from './components/ClientOnly';
import { useEffect } from 'react';

const rootRoute = new RootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
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
          /* Aggressive GHL widget hiding - all possible selectors */
          #LeadConnector-widget-container,
          #lc-widget-container,
          #lc-widget,
          [id^="lc-"],
          [class*="lc-widget"],
          [class*="leadconnector"],
          [class*="lead-connector"],
          [data-widget-id="6a307915612788283cd21674"],
          [data-source="WEB_USER"],
          iframe[src*="leadconnectorhq.com"],
          iframe[src*="widgets.leadconnector"],
          iframe[src*="livekit"],
          [class*="ghl"],
          [id*="ghl"],
          [class*="leadconnector-widget"],
          [id*="leadconnector"],
          /* Catch floating/fixed positioned divs that might be the widget */
          div[style*="position: fixed"][style*="bottom"][style*="right"],
          div[style*="position: fixed"][style*="top"][style*="right"],
          /* Shadow DOM pierce attempt */
          ::part(lc-widget),
          ::part(leadconnector) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            z-index: -9999 !important;
            max-width: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }
        `}</style>
      </head>
      <body>
        {children}
        <Scripts />
        <ClientOnly fallback={null}>
          <WidgetGate />
        </ClientOnly>
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Capture affiliate referral code from any landing URL (e.g. /?ref=JB-XXXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('affiliate_ref', ref);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RootShell>
        <div className="flex min-h-screen flex-col">
          <Outlet />
        </div>
      </RootShell>
    </QueryClientProvider>
  );
}

export const routeTree = rootRoute.addChildren([
  // ... routes
]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function NotFoundComponent() {
  return <div>Not found</div>;
}

function ErrorComponent() {
  return <div>Error</div>;
}

import { Outlet } from '@tanstack/react-router';

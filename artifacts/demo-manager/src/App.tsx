import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import LicensePage from "@/pages/license";

import Library from "@/pages/library";
import DemoDetail from "@/pages/demo-detail";
import ImportDemo from "@/pages/import";
import SettingsPage from "@/pages/settings";

import {
  validateLicenseOnline,
  getLicenseStatus,
  clearStoredLicense,
} from "@/services/licenseService";
import { isTauri } from "@/services/tauriBridge";
import { useTranslation } from "@/services/i18n";
import { Loader2, WifiOff } from "lucide-react";

const queryClient = new QueryClient();

type GateState = "checking" | "valid" | "offline_grace" | "gate";

function CheckingScreen() {
  const t = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t.licenseGateChecking}</p>
    </div>
  );
}

function OfflineBanner() {
  const t = useTranslation();
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400 text-xs">
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{t.licenseGateOfflineBanner}</span>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Library} />
        <Route path="/demos/:id" component={DemoDetail} />
        <Route path="/import" component={ImportDemo} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppGate() {
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    if (!isTauri()) {
      setState("valid");
      return;
    }

    validateLicenseOnline()
      .then((result) => {
        if (result === "valid") {
          setState("valid");
        } else if (result === "offline") {
          const status = getLicenseStatus();
          if (status === "offline_grace") {
            setState("offline_grace");
          } else {
            clearStoredLicense();
            setState("gate");
          }
        } else {
          clearStoredLicense();
          setState("gate");
        }
      })
      .catch(() => {
        setState("gate");
      });
  }, []);

  if (state === "checking") return <CheckingScreen />;

  if (state === "gate") {
    return <LicensePage onActivated={() => setState("valid")} />;
  }

  return (
    <>
      {state === "offline_grace" && <OfflineBanner />}
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

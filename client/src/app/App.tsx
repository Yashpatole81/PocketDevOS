import { useEffect, useState } from "react";
import { initAuth } from "@/lib/api";
import { MobileShell } from "@/components/MobileShell";
import { DesktopShell } from "@/components/DesktopShell";
import { ThemeProvider } from "@/modules/theme";
import { useIsMobile } from "@/lib/useIsMobile";
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from "@/lib/shortcuts";

/**
 * AppContent — handles auth initialization and viewport-based shell selection.
 *
 * On mount:
 * 1. Calls initAuth() to extract token from URL and store in memory
 * 2. Checks viewport width: < 768px → MobileShell, >= 768px → DesktopShell
 *
 * The navigation store defaults to 'home' tab (Dashboard), so Dashboard
 * is the initial view after auth without any explicit routing setup.
 *
 * Editor, Terminal, and AI Workspace modules are lazy-loaded by ContentRouter
 * (inside MobileShell) and PanelSystem (inside DesktopShell) on first access.
 */
function AppContent() {
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    initAuth();
    registerGlobalShortcuts();
    setReady(true);

    return () => {
      unregisterGlobalShortcuts();
    };
  }, []);

  if (!ready) {
    return null;
  }

  return isMobile ? <MobileShell /> : <DesktopShell />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

import { useEffect, useMemo, useState } from "react";

export type InstallOutcome = "accepted" | "dismissed";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

function detectIOS() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isMacTouch = /Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1; // iPadOS
  return isIOS || isMacTouch;
}

function detectStandalone() {
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (navigator as any).standalone === true;
  return Boolean(standaloneMatch || iosStandalone);
}

function hasManifestLink() {
  return !!document.querySelector('link[rel="manifest"]');
}

async function hasServiceWorkerController() {
  // navigator.serviceWorker.controller is set only when a SW is controlling this page
  if (!("serviceWorker" in navigator)) return false;
  return !!navigator.serviceWorker.controller;
}

/**
 * usePWAInstall
 * - canInstall: true only when beforeinstallprompt is available (native prompt)
 * - manualInstallPossible: true when install likely possible but native prompt isn't available
 *   (show "⋮ -> Install app / Add to Home screen")
 */
export default function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [manualInstallPossible, setManualInstallPossible] = useState(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setInstalled(detectStandalone());

    const onBeforeInstallPrompt = (e: Event) => {
      // Stop mini-infobar so we can show prompt from our button (when supported)
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // If we got the prompt, manual fallback isn't needed
      setManualInstallPossible(false);
      // Debug (optional)
      // console.log("beforeinstallprompt fired");
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setManualInstallPossible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
    window.addEventListener("appinstalled", onAppInstalled);

    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      const nowInstalled = detectStandalone();
      setInstalled(nowInstalled);
      if (nowInstalled) {
        setDeferredPrompt(null);
        setManualInstallPossible(false);
      }
    };
    mq?.addEventListener?.("change", onDisplayModeChange);

    // Manual-install check: useful when Chrome doesn't fire beforeinstallprompt
    const checkManualInstall = async () => {
      const nowInstalled = detectStandalone();
      setInstalled(nowInstalled);

      if (nowInstalled) {
        setManualInstallPossible(false);
        return;
      }

      // iOS never has native prompt; manual instructions handled by UI
      if (detectIOS()) {
        setManualInstallPossible(true);
        return;
      }

      // If we have a deferred prompt, canInstall will cover it
      if (deferredPrompt) {
        setManualInstallPossible(false);
        return;
      }

      // Heuristic: if manifest exists and SW controls page, likely installable via menu
      const manifestOk = hasManifestLink();
      const swOk = await hasServiceWorkerController();

      setManualInstallPossible(manifestOk && swOk);
    };

    // Run checks a few times because SW control often becomes true after a reload
    const t0 = window.setTimeout(checkManualInstall, 0);
    const t1 = window.setTimeout(checkManualInstall, 1200);

    // Re-check when page becomes visible again (returning from background)
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkManualInstall();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Re-check after full load
    window.addEventListener("load", checkManualInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
      window.removeEventListener("appinstalled", onAppInstalled);
      mq?.removeEventListener?.("change", onDisplayModeChange);

      window.clearTimeout(t0);
      window.clearTimeout(t1);

      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("load", checkManualInstall);
    };
    // NOTE: we intentionally do not include deferredPrompt in deps here,
    // to avoid re-binding listeners. We'll derive booleans below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canInstall = useMemo(() => {
    return !!deferredPrompt && !installed;
  }, [deferredPrompt, installed]);

  const install = async () => {
    if (!deferredPrompt) return { ok: false, reason: "no_prompt" as const };

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    // If dismissed, Chrome might not allow prompting again for a while.
    setDeferredPrompt(null);

    return { ok: true, outcome: choice.outcome };
  };

  return {
    isIOS,
    installed,
    canInstall, 
    manualInstallPossible, 
    install,
  };
}

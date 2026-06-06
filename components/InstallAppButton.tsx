import React, { useMemo, useState } from "react";
import { Download, Smartphone, Info } from "lucide-react";
import usePWAInstall from "../hooks/usePWAInstall";

type Props = {
  className?: string;
};

const InstallAppButton: React.FC<Props> = ({ className }) => {
  // updated hook returns manualInstallPossible too
  const { isIOS, installed, canInstall, manualInstallPossible, install } = usePWAInstall();
  const [showHelp, setShowHelp] = useState(false);

  const label = useMemo(() => {
    if (installed) return "APP INSTALLED";
    // if native prompt exists (beforeinstallprompt captured)
    if (canInstall) return "INSTALL APP";
    // if prompt not available, guide user to manual install
    if (isIOS) return "HOW TO INSTALL";
    if (manualInstallPossible) return "HOW TO INSTALL";
    return "INSTALL APP";
  }, [installed, canInstall, isIOS, manualInstallPossible]);

  const handleClick = async () => {
    if (installed) return;

    // iOS: always manual instructions
    if (isIOS) {
      setShowHelp(true);
      return;
    }

    // If Chrome did not give beforeinstallprompt, show manual instructions
    if (!canInstall) {
      setShowHelp(true);
      return;
    }

    try {
      const res = await install();
      if (!res.ok) setShowHelp(true);
    } catch {
      setShowHelp(true);
    }
  };

  const showManualAndroid = !isIOS && !canInstall;

  return (
    <>
      <button
        onClick={handleClick}
        aria-disabled={installed}
        className={
          className ||
          `inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-xs transition-all
          ${
            installed
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-lg"
          }`
        }
      >
        <Download className="w-4 h-4" />
        {label}
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <h3 className="font-black uppercase tracking-widest text-xs">Install Help</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 text-xs font-black"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* ✅ iOS instructions */}
              {isIOS ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
                    iPhone / iPad (Safari)
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    Tap <b>Share</b> → <b>Add to Home Screen</b>.
                  </p>
                </div>
              ) : (
                <>
                  {/* ✅ Android / Chrome (manual or prompt not available) */}
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-slate-700">
                      {showManualAndroid ? (
                        <>
                          Your browser didn’t provide an install popup right now.
                          <br />
                          Install using the Chrome menu instead.
                        </>
                      ) : (
                        <>
                          If installation doesn’t appear, try:
                          <br />• refresh / reopen the site
                          <br />• don’t use incognito
                          <br />• clear site data then try again
                        </>
                      )}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
                      Install manually (Android Chrome)
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      Tap <b>⋮</b> (menu) → <b>Install app</b> or <b>Add to Home screen</b>.
                    </p>
                    {!manualInstallPossible && (
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        If you still don’t see it, you may be inside an embedded browser. Open the link in the
                        Chrome app.
                      </p>
                    )}
                  </div>
                </>
              )}

              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Tip: On desktop, Chrome sometimes shows an install icon in the address bar.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;

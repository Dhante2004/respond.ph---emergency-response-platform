import React from "react";
import { Smartphone, Copy } from "lucide-react";
import InstallAppButton from "../components/InstallAppButton";

const CitizenDesktopBlocked: React.FC = () => {
  const url = window.location.href;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied! Open it on your phone.");
    } catch {
      alert(url);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg">
          <Smartphone className="w-9 h-9" />
        </div>

        <h1 className="mt-6 text-3xl font-black text-slate-900 uppercase tracking-tight">
          Citizen Portal is Phone Only
        </h1>

        <p className="mt-3 text-slate-600 font-medium">
          Reporting requires camera + GPS. Please open this link on your phone.
        </p>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link</p>
          <p className="text-sm font-bold text-slate-800 break-all">{url}</p>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <button
            onClick={copyLink}
            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition"
          >
            <Copy className="w-5 h-5" /> Copy Link
          </button>

          <div className="flex-1 flex justify-center">
            <InstallAppButton />
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
          Tip: Install it on your phone for faster access.
        </p>
      </div>
    </div>
  );
};

export default CitizenDesktopBlocked;

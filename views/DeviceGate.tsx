import React from "react";
import Logo from "../components/Logo";
import InstallAppButton from "../components/InstallAppButton";

type Props = {
  title: string;
  message: string;
  showInstall?: boolean;
  onLogout: () => void;
};

const DeviceGate: React.FC<Props> = ({ title, message, showInstall = false, onLogout }) => {
  return (
    <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center">
        <Logo className="w-20 h-20 mx-auto mb-6 shadow-xl rounded-2xl" />
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">
          {title}
        </h2>
        <p className="mt-3 text-slate-500 font-bold">{message}</p>

        <div className="mt-8 flex items-center justify-center gap-3">
          {showInstall && <InstallAppButton />}
          <button
            onClick={onLogout}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 active:scale-95"
          >
            Sign Out
          </button>
        </div>

        <p className="mt-6 text-[11px] font-black uppercase tracking-widest text-slate-400">
          Open the same URL on the correct device.
        </p>
      </div>
    </div>
  );
};

export default DeviceGate;

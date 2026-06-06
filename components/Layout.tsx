import React from "react";
import { User } from "../types";
import { LogOut, BarChart3, Map as MapIcon, Home, UserCheck, AlertCircle, Users } from "lucide-react";
import Logo from "./Logo";
import InstallAppButton from "./InstallAppButton";

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeView, setActiveView }) => {
  if (!user) return <>{children}</>;

  const isPDRRMOAdmin = user.userType === "pdrrmo_admin";

  const menuItems = [
    { id: "dashboard", icon: Home, label: "Overview", roles: ["pdrrmo_admin", "agency_admin"] },
    { id: "reports", icon: AlertCircle, label: "Reports", roles: ["pdrrmo_admin", "agency_admin"] },
    { id: "map", icon: MapIcon, label: "Incident Map", roles: ["pdrrmo_admin", "agency_admin"] },
    { id: "user-auth", icon: UserCheck, label: "User Auth", roles: ["pdrrmo_admin"] },
    { id: "agency-accounts", icon: Users, label: "Agency Accounts", roles: ["pdrrmo_admin"] },
    { id: "analytics", icon: BarChart3, label: "Analytics", roles: ["pdrrmo_admin"] },
  ].filter((item) => item.roles.includes(user.userType));

  return (
    <div className="flex h-screen bg-white">
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0">
        <div className="p-6 flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <span className="text-xl font-black tracking-tight uppercase">RESPOND.PH</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeView === item.id
                  ? "bg-rose-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          {/* PDRRMO rectangular logo (admin only) */}
          {isPDRRMOAdmin && (
            <div className="mb-4">
              <div className="w-full rounded-2xl bg-white/95 p-2 ring-1 ring-white/15 shadow-md">
                <img
                  src="/assets/pdrrmo-tawi-tawi.png"
                  alt="PDRRMO Tawi-Tawi"
                  className="w-full h-auto object-contain rounded-xl"
                  draggable={false}
                />
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-sm uppercase">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {menuItems.find((i) => i.id === activeView)?.label || "RESPOND.PH"}
          </h2>

          <div className="flex items-center gap-3">
            <InstallAppButton />
            <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200">
              {user.userType === "pdrrmo_admin" ? "Command Center" : user.agency || "Agency"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">{children}</div>
      </main>
    </div>
  );
};

export default Layout;

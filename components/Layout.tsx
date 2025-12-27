
import React from 'react';
import { User } from '../types';
import { LogOut, AlertCircle, BarChart3, Map as MapIcon, Home, UserCheck } from 'lucide-react';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeView, setActiveView }) => {
  if (!user) return <>{children}</>;

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Overview', roles: ['pdrrmo_admin', 'agency_admin'] },
    { id: 'reports', icon: AlertCircle, label: 'Reports', roles: ['pdrrmo_admin', 'agency_admin', 'citizen'] },
    { id: 'map', icon: MapIcon, label: 'Incident Map', roles: ['pdrrmo_admin', 'agency_admin'] },
    { id: 'user-auth', icon: UserCheck, label: 'User Auth', roles: ['pdrrmo_admin'] },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', roles: ['pdrrmo_admin'] },
  ].filter(item => item.roles.includes(user.userType));

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Hidden on mobile */}
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
                activeView === item.id ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white shadow-inner">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate text-slate-100">{user.fullName}</p>
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">{user.agency || user.userType.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-900"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-sm uppercase">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 z-20">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {menuItems.find(i => i.id === activeView)?.label || 'RESPOND.PH'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200">
              {user.userType === 'pdrrmo_admin' ? 'Command Center' : user.agency || 'Citizen'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

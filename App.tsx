
import React, { useState, useEffect } from 'react';
import { User, Report, UserType, IncidentType, AccountVerificationStatus } from './types';
import { mockUsers as initialMockUsers, initialReports } from './mockData';
import Layout from './components/Layout';
import ReportsDashboard from './views/ReportsDashboard';
import IncidentMap from './views/IncidentMap';
import Analytics from './views/Analytics';
import CitizenPortal from './views/CitizenPortal';
import UserVerification from './views/UserVerification';
import Logo from './components/Logo';
import { Smartphone, Briefcase, ChevronRight, Lock, UserPlus, ArrowLeft, Mail, Phone, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(initialMockUsers);
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [activeView, setActiveView] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Registration Form State
  const [regData, setRegData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    if (user?.userType === 'citizen') {
      setActiveView('reports');
    } else if (user?.userType === 'pdrrmo_admin' || user?.userType === 'agency_admin') {
      setActiveView('dashboard');
    }
  }, [user]);

  const handleLogin = (selectedUser: User) => {
    setUser(selectedUser);
    setShowLogin(false);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `USR-${Math.floor(Math.random() * 9000) + 1000}`,
      email: regData.email,
      fullName: regData.fullName,
      phone: regData.phone,
      userType: 'citizen',
      accountVerificationStatus: 'unverified'
    };
    
    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowLogin(true);
    setAuthMode('login');
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const updateUserProfile = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
    // Also update in global users list
    setUsers(prev => prev.map(u => u.id === user?.id ? { ...u, ...userData } : u));
  };

  const handleVerifyUser = (userId: string, status: AccountVerificationStatus) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, accountVerificationStatus: status } : u));
    
    // If the currently logged in user is the one being verified (unlikely for admin, but good for completeness)
    if (user && user.id === userId) {
      setUser({ ...user, accountVerificationStatus: status });
    }

    // Auto-update visibility status for all reports by this user
    setReports(prev => prev.map(r => 
      r.userId === userId ? { ...r, userIsVerified: status === 'verified' } : r
    ));
  };

  const submitReport = (reportData: Partial<Report>) => {
    if (!user) return;
    
    const isUserVerified = user.accountVerificationStatus === 'verified';
    
    const newReport: Report = {
      id: `REP-${Math.floor(Math.random() * 900) + 100}`,
      userId: user.id,
      userName: user.fullName,
      userPhone: user.phone,
      userIsVerified: isUserVerified,
      incidentType: (reportData.incidentType || 'other') as IncidentType,
      description: reportData.description || '',
      latitude: reportData.latitude || 5.068,
      longitude: reportData.longitude || 119.775,
      addressLandmark: reportData.addressLandmark || 'Bongao',
      // If user is not verified, verificationStatus is 'pending' but UI will flag it
      verificationStatus: 'pending',
      priorityLevel: 'none',
      currentStatus: 'submitted',
      assignedAgency: 'NONE',
      imageUrl: reportData.imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setReports(prev => [newReport, ...prev]);
  };

  if (showLogin) {
    return (
      <div className="h-full bg-rose-600 flex flex-col md:flex-row items-center justify-center p-6 gap-12 overflow-auto">
        <div className="max-w-md text-white space-y-6 text-center md:text-left">
          <Logo className="w-24 h-24 mx-auto md:mx-0 shadow-2xl scale-110" />
          <h1 className="text-6xl font-black leading-tight tracking-tighter">RESPOND.PH</h1>
          <p className="text-xl text-rose-100 font-medium">Tawi-Tawi's Unified Emergency Response and Disaster Management Platform.</p>
        </div>

        <div className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-2xl space-y-6">
          {authMode === 'login' ? (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Access Portal</h2>
                  <p className="text-slate-500 mt-1 font-medium">Select your role or register</p>
                </div>
                <button 
                  onClick={() => setAuthMode('register')}
                  className="flex flex-col items-center gap-1 text-rose-600 hover:text-rose-700 transition-colors"
                >
                  <UserPlus className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase">Sign Up</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleLogin(u)}
                    className="group w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-rose-500 hover:bg-rose-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shadow-sm ${
                        u.userType === 'citizen' ? 'bg-rose-600 text-white' : 
                        u.userType === 'pdrrmo_admin' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {u.userType === 'citizen' ? <Smartphone size={22} /> : u.userType === 'pdrrmo_admin' ? <Lock size={22} /> : <Briefcase size={22} />}
                      </div>
                      <div>
                        <span className="block font-black text-base text-slate-800 uppercase tracking-tight leading-none mb-1">
                          {u.userType.replace('_', ' ')}
                        </span>
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wide">{u.fullName} {u.agency ? `(${u.agency})` : ''}</span>
                        {u.userType === 'citizen' && (
                          <span className={`block text-[9px] font-black uppercase mt-1.5 ${u.accountVerificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {u.accountVerificationStatus === 'verified' ? '● Verified Responder' : '○ Identity Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-slate-600" />
                </button>
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Citizen Registration</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      type="text"
                      value={regData.fullName}
                      onChange={e => setRegData({...regData, fullName: e.target.value})}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      type="email"
                      value={regData.email}
                      onChange={e => setRegData({...regData, email: e.target.value})}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      type="tel"
                      value={regData.phone}
                      onChange={e => setRegData({...regData, phone: e.target.value})}
                      placeholder="0917XXXXXXX"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      required
                      type="password"
                      value={regData.password}
                      onChange={e => setRegData({...regData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-rose-500 focus:outline-none transition-colors font-bold"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 uppercase tracking-widest"
              >
                Create Account
              </button>

              <p className="text-center text-sm text-slate-500 font-bold">
                Already registered? 
                <button 
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="ml-1 text-rose-600 hover:underline font-black"
                >
                  Sign In Here
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}>
      <div className="h-full">
        {user?.userType === 'citizen' ? (
          <CitizenPortal 
            user={user} 
            reports={reports} 
            onSubmit={submitReport} 
            onUpdateUser={updateUserProfile} 
          />
        ) : (
          <>
            {activeView === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-rose-600 text-white p-6 rounded-2xl shadow-xl shadow-rose-200 border-b-4 border-rose-900">
                  <span className="text-[10px] font-black uppercase opacity-80 tracking-[0.2em]">Pending Dispatch</span>
                  <p className="text-5xl font-black mt-1">{reports.filter(r => r.verificationStatus === 'pending').length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Field Units</span>
                  <p className="text-5xl font-black text-slate-800 mt-1">14</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Closed Cases</span>
                  <p className="text-5xl font-black text-slate-800 mt-1">{reports.filter(r => r.currentStatus === 'resolved').length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Threat Level</span>
                  <p className="text-5xl font-black text-rose-600 mt-1">HIGH</p>
                </div>
              </div>
            )}

            {(activeView === 'dashboard' || activeView === 'reports') && (
              <div className="h-[calc(100vh-160px)]">
                 <ReportsDashboard reports={reports} user={user!} onUpdateReport={updateReport} />
              </div>
            )}

            {activeView === 'map' && (
              <div className="h-[calc(100vh-160px)]">
                <IncidentMap 
                  reports={reports} 
                  onSelectReport={(r) => {
                    setActiveView('reports');
                  }} 
                />
              </div>
            )}

            {activeView === 'user-auth' && (
              <div className="h-[calc(100vh-160px)]">
                <UserVerification 
                  users={users} 
                  onVerifyUser={handleVerifyUser} 
                />
              </div>
            )}

            {activeView === 'analytics' && (
              <Analytics reports={reports} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default App;

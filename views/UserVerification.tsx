
import React, { useState } from 'react';
import { User, AccountVerificationStatus } from '../types';
import { ShieldCheck, ShieldAlert, UserCheck, UserX, Eye, Search, Filter, Mail, Phone } from 'lucide-react';

interface UserVerificationProps {
  users: User[];
  onVerifyUser: (userId: string, status: AccountVerificationStatus) => void;
}

const UserVerification: React.FC<UserVerificationProps> = ({ users, onVerifyUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = users.filter(u => {
    if (u.userType !== 'citizen') return false;
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.accountVerificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search citizens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-slate-50 text-sm font-bold focus:outline-rose-500"
            />
          </div>
          <select 
            className="border rounded-lg px-3 py-2 bg-slate-50 text-sm font-bold focus:outline-rose-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
          </select>
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {filteredUsers.length} Citizens Found
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b border-slate-200 uppercase text-[10px] font-black text-slate-500 tracking-wider">
                <th className="px-6 py-4">Citizen Identity</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Current Status</th>
                <th className="px-6 py-4">ID Provided</th>
                <th className="px-6 py-4 text-right">Authentication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{u.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5"><Mail size={12} className="text-slate-300" /> {u.email}</div>
                      <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-300" /> {u.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest ${
                      u.accountVerificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                      u.accountVerificationStatus === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {u.accountVerificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.idImageUrl ? (
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 transition-colors"
                      >
                        <Eye size={14} /> View Document
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase italic">Not Uploaded</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onVerifyUser(u.id, 'verified')}
                        disabled={u.accountVerificationStatus === 'verified'}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30"
                        title="Approve Account"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button 
                        onClick={() => onVerifyUser(u.id, 'unverified')}
                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                        title="Reject/Reset"
                      >
                        <UserX size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-rose-600 text-white">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Identity Verification</h3>
                <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Citizen: {selectedUser.fullName}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <UserX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 bg-slate-50">
              <div className="aspect-[16/10] bg-white rounded-2xl border-4 border-white shadow-xl overflow-hidden relative group">
                <img 
                  src={selectedUser.idImageUrl} 
                  className="w-full h-full object-contain" 
                  alt="Government ID" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-[10px] font-black uppercase tracking-widest">Official Document Preview</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { onVerifyUser(selectedUser.id, 'verified'); setSelectedUser(null); }}
                  className="bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"
                >
                  <ShieldCheck size={20} /> Authenticate
                </button>
                <button 
                  onClick={() => { onVerifyUser(selectedUser.id, 'unverified'); setSelectedUser(null); }}
                  className="bg-slate-200 text-slate-700 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-300 transition-all"
                >
                  <ShieldAlert size={20} /> Deny Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerification;

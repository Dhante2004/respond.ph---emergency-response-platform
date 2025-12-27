
import React, { useState } from 'react';
import { Report, User, VerificationStatus, PriorityLevel, AgencyType, IncidentStatus } from '../types';
import { Eye, CheckCircle, XCircle, AlertTriangle, Shield, Clock, MapPin, Phone, User as UserIcon, Sparkles, ShieldCheck, Flag } from 'lucide-react';
import { analyzeIncident } from '../services/gemini';

interface ReportsDashboardProps {
  reports: Report[];
  user: User;
  onUpdateReport: (id: string, updates: Partial<Report>) => void;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ reports, user, onUpdateReport }) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState({ type: 'all', status: 'all' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Updated filter: Only show reports that are NOT resolved in the active dashboard
  const filteredReports = reports.filter(r => {
    const isNotResolved = r.currentStatus !== 'resolved';
    const matchesType = filter.type === 'all' || r.incidentType === filter.type;
    const matchesStatus = filter.status === 'all' || r.currentStatus === filter.status;
    const isVisibleToAgency = user.userType === 'pdrrmo_admin' || r.assignedAgency === user.agency;
    return isNotResolved && matchesType && matchesStatus && isVisibleToAgency;
  });

  const handleStatusChange = (reportId: string, status: IncidentStatus) => {
    onUpdateReport(reportId, { currentStatus: status, updatedAt: new Date().toISOString() });
    if (selectedReport?.id === reportId) {
      if (status === 'resolved') {
        setSelectedReport(null); // Close if resolved as it's removed from list
      } else {
        setSelectedReport(prev => prev ? { ...prev, currentStatus: status } : null);
      }
    }
  };

  const handleVerify = (reportId: string, status: VerificationStatus) => {
    onUpdateReport(reportId, { verificationStatus: status, updatedAt: new Date().toISOString() });
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => prev ? { ...prev, verificationStatus: status } : null);
    }
  };

  const handleAssign = (reportId: string, agency: AgencyType) => {
    onUpdateReport(reportId, { 
      assignedAgency: agency, 
      currentStatus: 'assigned',
      updatedAt: new Date().toISOString() 
    });
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => prev ? { ...prev, assignedAgency: agency, currentStatus: 'assigned' } : null);
    }
  };

  const runAiAnalysis = async (report: Report) => {
    setIsAnalyzing(true);
    const result = await analyzeIncident(report.description, report.incidentType);
    setAiSuggestions(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex gap-4">
          <select 
            className="border rounded-lg px-3 py-2 bg-slate-50 text-sm font-bold focus:outline-rose-500"
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">All Types</option>
            <option value="fire">Fire</option>
            <option value="crime">Crime</option>
            <option value="medical">Medical</option>
            <option value="accident">Accident</option>
          </select>
          <select 
            className="border rounded-lg px-3 py-2 bg-slate-50 text-sm font-bold focus:outline-rose-500"
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="en_route">En Route</option>
            <option value="on_scene">On Scene</option>
          </select>
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase">
          Active Incidents: {filteredReports.length}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b border-slate-200 uppercase text-xs font-bold text-slate-500">
                <th className="px-6 py-4">ID & Type</th>
                <th className="px-6 py-4">Reporter</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Trust Level</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        report.incidentType === 'fire' ? 'bg-rose-100 text-rose-600' :
                        report.incidentType === 'medical' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{report.id}</p>
                        <p className="text-xs text-slate-500 uppercase font-medium">{report.incidentType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-900">{report.userName}</span>
                        {report.userIsVerified && <ShieldCheck className="w-4 h-4 text-rose-600" />}
                      </div>
                      <span className="text-slate-500 text-xs">{report.userPhone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm max-w-xs truncate">
                    <span className="text-slate-700 font-medium">{report.addressLandmark}</span>
                  </td>
                  <td className="px-6 py-4">
                    {report.userIsVerified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                        <ShieldCheck className="w-3 h-3" /> Trusted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-100">
                        <Flag className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                      report.currentStatus === 'submitted' ? 'bg-rose-100 text-rose-700' :
                      report.currentStatus === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.currentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => { setSelectedReport(report); setAiSuggestions(null); }}
                      className="p-2 bg-rose-50 text-rose-600 rounded-lg transition-all hover:bg-rose-600 hover:text-white"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                    All reports are currently resolved or filtered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-rose-600 text-white">
              <h3 className="text-xl font-bold">Report Details: {selectedReport.id}</h3>
              <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <XCircle className="w-7 h-7" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                {!selectedReport.userIsVerified && (
                  <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-xl flex items-center gap-3">
                    <Flag className="w-6 h-6 text-amber-600" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm tracking-tight uppercase">Manual Verification Required</h4>
                      <p className="text-xs text-amber-800 font-medium">Report submitted by an unverified account. Confirm via phone before dispatch.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <UserIcon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Reporter</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-slate-800">{selectedReport.userName}</p>
                      {selectedReport.userIsVerified && <ShieldCheck className="w-4 h-4 text-rose-600" />}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Phone</span>
                    </div>
                    <p className="font-bold text-slate-800">{selectedReport.userPhone}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 text-rose-600 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Description</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed italic">"{selectedReport.description}"</p>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="text-rose-600 w-5 h-5 shrink-0" />
                  <span className="text-sm font-bold text-slate-700 truncate">{selectedReport.addressLandmark}</span>
                </div>

                <div className="relative">
                  <img 
                    src={selectedReport.imageUrl} 
                    alt="Incident" 
                    className="w-full h-64 object-cover rounded-xl border-4 border-slate-100 shadow-sm bg-slate-200"
                  />
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-[10px] font-black uppercase">
                    Photo Evidence
                  </div>
                </div>

                <div className="border-2 border-rose-200 bg-rose-50/50 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-rose-700">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-bold">Gemini Smart Assistant</span>
                    </div>
                    {!aiSuggestions && (
                      <button 
                        onClick={() => runAiAnalysis(selectedReport)}
                        disabled={isAnalyzing}
                        className="text-xs bg-rose-600 text-white px-3 py-1 rounded-full font-bold hover:bg-rose-700 disabled:opacity-50 shadow-md"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Report'}
                      </button>
                    )}
                  </div>
                  
                  {aiSuggestions ? (
                    <div className="text-sm space-y-3">
                      <p className="text-slate-700"><strong>Summary:</strong> {aiSuggestions.summary}</p>
                      <div className="flex gap-4">
                        <span className="bg-white px-2 py-1 rounded border border-rose-200 font-bold text-rose-700">Priority: {aiSuggestions.suggestedPriority}</span>
                        <span className="bg-white px-2 py-1 rounded border border-rose-200 font-bold text-rose-700">Agency: {aiSuggestions.recommendedAgency}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-600 italic">Click for AI-powered priority assessment and dispatcher notes.</p>
                  )}
                </div>
              </div>

              <div className="w-full md:w-80 space-y-6">
                {user.userType === 'pdrrmo_admin' && (
                  <>
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 border-b pb-2 uppercase text-xs">Verification Action</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleVerify(selectedReport.id, 'verified')}
                          className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                            selectedReport.verificationStatus === 'verified' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner' : 'bg-white border-slate-100 hover:border-emerald-200'
                          }`}
                        >
                          <CheckCircle className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">VERIFY</span>
                        </button>
                        <button 
                          onClick={() => handleVerify(selectedReport.id, 'false')}
                          className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                            selectedReport.verificationStatus === 'false' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-inner' : 'bg-white border-slate-100 hover:border-rose-200'
                          }`}
                        >
                          <XCircle className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">FALSE</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 border-b pb-2 uppercase text-xs">Assign Primary Agency</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {(['BFP', 'PNP', 'PCG'] as AgencyType[]).map((agency) => (
                          <button
                            key={agency}
                            onClick={() => handleAssign(selectedReport.id, agency)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                              selectedReport.assignedAgency === agency ? 'bg-rose-600 border-rose-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:border-rose-400'
                            }`}
                          >
                            <Shield className="w-5 h-5 shrink-0" />
                            <span className="font-bold uppercase tracking-tight text-sm">{agency} Dispatch</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {user.userType === 'agency_admin' && selectedReport.assignedAgency === user.agency && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 border-b pb-2 uppercase text-xs">Field Operations</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {(['en_route', 'on_scene', 'resolved'] as IncidentStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selectedReport.id, status)}
                          className={`w-full p-4 rounded-xl border-2 font-black uppercase tracking-wider text-xs transition-all ${
                            selectedReport.currentStatus === status ? 'bg-rose-600 border-rose-700 text-white shadow-lg' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedReport(null)}
                className="bg-slate-900 text-white px-8 py-3 rounded-lg font-black uppercase text-xs hover:bg-slate-800 transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;

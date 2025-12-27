
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Report } from '../types';
import { Download } from 'lucide-react';

interface AnalyticsProps {
  reports: Report[];
}

const COLORS = ['#e11d48', '#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#a855f7'];

const Analytics: React.FC<AnalyticsProps> = ({ reports }) => {
  // Aggregate data for Incident Types
  const typeDataMap = reports.reduce((acc, report) => {
    acc[report.incidentType] = (acc[report.incidentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeData = Object.entries(typeDataMap).map(([name, value]) => ({ name, value }));

  // Aggregate data for Status
  const statusDataMap = reports.reduce((acc, report) => {
    acc[report.currentStatus] = (acc[report.currentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusDataMap).map(([name, value]) => ({ name, value }));

  // Aggregate trends (Simulated time grouping based on existing reports)
  const trendData = [
    { name: 'Mon', count: 4 },
    { name: 'Tue', count: 7 },
    { name: 'Wed', count: 5 },
    { name: 'Thu', count: 12 },
    { name: 'Fri', count: 8 },
    { name: 'Sat', count: 15 },
    { name: 'Sun', count: reports.length },
  ];

  const handleExportCSV = () => {
    if (reports.length === 0) {
      alert("No report data available to export.");
      return;
    }

    // Define headers
    const headers = [
      'Report ID', 
      'Reporter Name', 
      'Contact Number', 
      'Verified Account',
      'Incident Type', 
      'Location/Landmark', 
      'Description',
      'Priority Level', 
      'Current Status', 
      'Assigned Agency', 
      'Date Created'
    ];

    // Map data and escape commas/quotes
    const csvRows = reports.map(r => {
      const sanitize = (str: string) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      
      return [
        r.id,
        sanitize(r.userName),
        r.userPhone,
        r.userIsVerified ? 'YES' : 'NO',
        r.incidentType.toUpperCase(),
        sanitize(r.addressLandmark),
        sanitize(r.description),
        r.priorityLevel.toUpperCase(),
        r.currentStatus.toUpperCase(),
        r.assignedAgency,
        new Date(r.createdAt).toLocaleString()
      ].join(',');
    });

    // Combine headers and rows
    const csvString = [headers.join(','), ...csvRows].join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `RESPOND_PH_SYSTEM_EXPORT_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-600 rounded-full"></span>
            Incidents by Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#fff1f2' }}
                />
                <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            Reports Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
            Weekly Incident Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={4} dot={{ r: 6, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Data Export</h3>
          <p className="text-slate-500 font-medium">Generate a comprehensive CSV audit trail for PDRRMO archiving and inter-agency coordination.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg active:scale-95 group shrink-0"
        >
          <Download className="w-5 h-5 group-hover:animate-bounce" />
          Export as CSV
        </button>
      </div>
    </div>
  );
};

export default Analytics;

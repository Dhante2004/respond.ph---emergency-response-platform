import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Report } from "../types";
import { Download } from "lucide-react";

interface AnalyticsProps {
  reports: Report[];
}

const COLORS = ["#e11d48", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1", "#a855f7"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const localDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const safeDate = (value: any) => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const Analytics: React.FC<AnalyticsProps> = ({ reports }) => {
  //  Match map/dashboard behavior: ignore FALSE reports
  const cleanReports = useMemo(
    () => reports.filter((r) => r.verificationStatus !== "false"),
    [reports]
  );

  //  Incidents by Type (real)
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of cleanReports) map[r.incidentType] = (map[r.incidentType] || 0) + 1;

    // sort by count desc
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cleanReports]);

  //  Reports Status (real)
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of cleanReports) map[r.currentStatus] = (map[r.currentStatus] || 0) + 1;

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cleanReports]);

  //  Weekly Trend = REAL counts from createdAt (last 7 days)
  const trendData = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    // pre-fill last 7 days with zeros
    const days: { key: string; date: Date; name: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = localDateKey(d);
      const label = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
      }).format(d);

      days.push({ key, date: d, name: label, count: 0 });
    }

    const idxByKey = new Map(days.map((d, idx) => [d.key, idx]));

    for (const r of cleanReports) {
      const d = safeDate(r.createdAt);
      if (!d) continue;
      if (d < start || d > end) continue;

      const key = localDateKey(d);
      const idx = idxByKey.get(key);
      if (idx !== undefined) days[idx].count += 1;
    }

    // return recharts format
    return days.map(({ name, count }) => ({ name, count }));
  }, [cleanReports]);

  const handleExportCSV = () => {
    if (cleanReports.length === 0) {
      alert("No report data available to export.");
      return;
    }

    const headers = [
      "Report ID",
      "Reporter Name",
      "Contact Number",
      "Verified Account",
      "Incident Type",
      "Location/Landmark",
      "Description",
      "Priority Level",
      "Current Status",
      "Assigned Agency",
      "Date Created",
    ];

    const sanitize = (str: any) => `"${(str || "").toString().replace(/"/g, '""')}"`;

    // Sort by newest first for consistent exports
    const sorted = [...cleanReports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const csvRows = sorted.map((r) =>
      [
        r.id,
        sanitize(r.userName),
        r.userPhone,
        r.userIsVerified ? "YES" : "NO",
        (r.incidentType || "").toString().toUpperCase(),
        sanitize(r.addressLandmark),
        sanitize(r.description),
        (r.priorityLevel || "").toString().toUpperCase(),
        (r.currentStatus || "").toString().toUpperCase(),
        r.assignedAgency,
        // ISO is the most accurate (no locale ambiguity)
        new Date(r.createdAt).toISOString(),
      ].join(",")
    );

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const timestamp = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `RESPOND_PH_SYSTEM_EXPORT_${timestamp}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ fill: "#fff1f2" }}
                />
                <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {cleanReports.length === 0 && (
            <p className="mt-3 text-xs font-bold text-slate-400">No data yet.</p>
          )}
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
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold", paddingTop: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {cleanReports.length === 0 && (
            <p className="mt-3 text-xs font-bold text-slate-400">No data yet.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
            Weekly Incident Trends (Last 7 Days)
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#e11d48"
                  strokeWidth={4}
                  dot={{ r: 6, fill: "#e11d48", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {cleanReports.length === 0 && (
            <p className="mt-3 text-xs font-bold text-slate-400">No data in the last 7 days.</p>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Data Export</h3>
          <p className="text-slate-500 font-medium">
            Generate a comprehensive CSV audit trail for PDRRMO archiving and inter-agency coordination.
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            Export includes only non-false reports (matches dashboard/map).
          </p>
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

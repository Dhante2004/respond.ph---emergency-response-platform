import React, { useEffect, useState } from "react";
import { Report, User, VerificationStatus, AgencyType, IncidentStatus } from "../types";
import {
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  MapPin,
  Phone,
  User as UserIcon,
  ShieldCheck,
  Flag,
  CheckCircle2,
} from "lucide-react";

interface ReportsDashboardProps {
  reports: Report[];
  user: User;
  onUpdateReport: (id: string, updates: Partial<Report>) => void;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ reports, user, onUpdateReport }) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState({ type: "all", status: "all" });

  //  confirm dialog for marking false
  const [confirmFalseOpen, setConfirmFalseOpen] = useState(false);

  //  confirm dialog for marking resolved (AGENCY)
  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);

  //  acknowledge busy (UI only)
  const [ackBusy, setAckBusy] = useState(false);

  //  Show Acknowledge UI only for NON-PDRRMO
  const showAcknowledgeUI = user.userType !== "pdrrmo_admin";

  //  Alert styles
  const ALERT = {
    danger: {
      wrap: "border-rose-300 bg-rose-50",
      label: "text-rose-700",
      title: "text-rose-900",
      text: "text-rose-800",
      icon: "text-rose-700",
    },
    info: {
      wrap: "border-slate-200 bg-slate-50",
      label: "text-slate-500",
      title: "text-slate-900",
      text: "text-slate-700",
      icon: "text-slate-600",
    },
    success: {
      wrap: "border-emerald-200 bg-emerald-50",
      label: "text-emerald-700",
      title: "text-emerald-900",
      text: "text-emerald-800",
      icon: "text-emerald-700",
    },
  } as const;

  //  Incident-type-coded WARNING panel
  const warningTone =
    selectedReport?.incidentType === "fire"
      ? {
          wrap: "border-rose-300 bg-rose-50",
          label: "text-rose-700",
          title: "text-rose-900",
          text: "text-rose-800",
          icon: "text-rose-700",
        }
      : selectedReport?.incidentType === "medical"
      ? {
          wrap: "border-blue-300 bg-blue-50",
          label: "text-blue-700",
          title: "text-blue-900",
          text: "text-blue-800",
          icon: "text-blue-700",
        }
      : selectedReport?.incidentType === "crime"
      ? {
          wrap: "border-violet-300 bg-violet-50",
          label: "text-violet-700",
          title: "text-violet-900",
          text: "text-violet-800",
          icon: "text-violet-700",
        }
      : selectedReport?.incidentType === "accident"
      ? {
          wrap: "border-orange-300 bg-orange-50",
          label: "text-orange-700",
          title: "text-orange-900",
          text: "text-orange-800",
          icon: "text-orange-700",
        }
      : selectedReport?.incidentType === "flood"
      ? {
          wrap: "border-cyan-300 bg-cyan-50",
          label: "text-cyan-700",
          title: "text-cyan-900",
          text: "text-cyan-800",
          icon: "text-cyan-700",
        }
      : {
          wrap: "border-amber-300 bg-amber-50",
          label: "text-amber-700",
          title: "text-amber-900",
          text: "text-amber-800",
          icon: "text-amber-600",
        };

  //  allow Map popup "Open Incident File" to open the exact modal by ID
  useEffect(() => {
    (window as any).openIncidentFile = (id: string) => {
      const r = reports.find(
        (x) =>
          x.id === id &&
          x.currentStatus !== "resolved" &&
          x.verificationStatus !== "false" &&
          (user.userType === "pdrrmo_admin" || x.assignedAgency === user.agency)
      );

      if (!r) return;

      setSelectedReport(r);
      setConfirmFalseOpen(false);
      setConfirmResolveOpen(false);
    };

    return () => {
      if ((window as any).openIncidentFile) delete (window as any).openIncidentFile;
    };
  }, [reports, user.userType, user.agency]);

  //  only show NOT resolved + NOT false
  const filteredReports = reports.filter((r) => {
    const isNotResolved = r.currentStatus !== "resolved";
    const isNotFalse = r.verificationStatus !== "false";
    const matchesType = filter.type === "all" || r.incidentType === filter.type;
    const matchesStatus = filter.status === "all" || r.currentStatus === filter.status;
    const isVisibleToAgency = user.userType === "pdrrmo_admin" || r.assignedAgency === user.agency;
    return isNotResolved && isNotFalse && matchesType && matchesStatus && isVisibleToAgency;
  });

  const handleStatusChange = (reportId: string, status: IncidentStatus) => {
    onUpdateReport(reportId, { currentStatus: status, updatedAt: new Date().toISOString() });
    if (selectedReport?.id === reportId) {
      if (status === "resolved") {
        setSelectedReport(null);
      } else {
        setSelectedReport((prev) => (prev ? { ...prev, currentStatus: status } : null));
      }
    }
  };

  const handleVerify = (reportId: string, status: VerificationStatus) => {
    onUpdateReport(reportId, { verificationStatus: status, updatedAt: new Date().toISOString() });
    if (selectedReport?.id === reportId) {
      if (status === "false") {
        setSelectedReport(null);
      } else {
        setSelectedReport((prev) => (prev ? { ...prev, verificationStatus: status } : null));
      }
    }
  };

  const handleAssign = (reportId: string, agency: AgencyType) => {
    onUpdateReport(reportId, {
      assignedAgency: agency,
      currentStatus: "assigned",
      updatedAt: new Date().toISOString(),
    });
    if (selectedReport?.id === reportId) {
      setSelectedReport((prev) =>
        prev ? { ...prev, assignedAgency: agency, currentStatus: "assigned" } : null
      );
    }
  };

  //  Acknowledge (logic kept; UI hidden for PDRRMO only)
  const acknowledgeSelected = async () => {
    if (!selectedReport || ackBusy) return;
    setAckBusy(true);
    const ts = new Date().toISOString();

    onUpdateReport(selectedReport.id, ({ acknowledgedAt: ts, updatedAt: ts } as any));
    setSelectedReport((prev) => (prev ? ({ ...(prev as any), acknowledgedAt: ts } as any) : null));

    setTimeout(() => setAckBusy(false), 300);
  };

  const typeTone =
    selectedReport?.incidentType === "fire"
      ? { chip: "bg-rose-600", soft: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" }
      : selectedReport?.incidentType === "medical"
      ? { chip: "bg-blue-600", soft: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" }
      : selectedReport?.incidentType === "crime"
      ? { chip: "bg-violet-600", soft: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" }
      : selectedReport?.incidentType === "accident"
      ? { chip: "bg-orange-600", soft: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" }
      : selectedReport?.incidentType === "flood"
      ? { chip: "bg-cyan-600", soft: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200" }
      : { chip: "bg-slate-700", soft: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200" };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex gap-4">
          <select
            className="border rounded-lg px-3 py-2 bg-slate-50 text-sm font-bold focus:outline-rose-500"
            value={filter.type}
            onChange={(e) => setFilter((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">All Types</option>
            <option value="fire">Fire</option>
            <option value="crime">Crime</option>
            <option value="medical">Medical</option>
            <option value="accident">Accident</option>
            <option value="flood">Flood</option>
          </select>

          <select
            className="border rounded-lg px-3 py-2 bg-slate-50 text-sm font-bold focus:outline-rose-500"
            value={filter.status}
            onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="en_route">En Route</option>
            <option value="on_scene">On Scene</option>
          </select>
        </div>

        <div className="text-xs font-bold text-slate-400 uppercase">Active Incidents: {filteredReports.length}</div>
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
                      <div
                        className={`p-2 rounded-lg ${
                          report.incidentType === "fire"
                            ? "bg-rose-100 text-rose-600"
                            : report.incidentType === "medical"
                            ? "bg-blue-100 text-blue-600"
                            : report.incidentType === "crime"
                            ? "bg-violet-100 text-violet-600"
                            : report.incidentType === "accident"
                            ? "bg-orange-100 text-orange-600"
                            : report.incidentType === "flood"
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
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
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                        report.currentStatus === "submitted"
                          ? "bg-rose-100 text-rose-700"
                          : report.currentStatus === "assigned"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {report.currentStatus.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setConfirmFalseOpen(false);
                        setConfirmResolveOpen(false);
                      }}
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

      {/*  REPORT DETAILS */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 border-b bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Incident File</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white ${typeTone.chip}`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {selectedReport.incidentType}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] bg-slate-900 text-white">
                      ID: {selectedReport.id}
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ring-1 ${typeTone.soft} ${typeTone.text} ${typeTone.ring}`}
                    >
                      <Clock className="w-4 h-4" />
                      {selectedReport.currentStatus.replace("_", " ")}
                    </span>

                    {showAcknowledgeUI && !!(selectedReport as any)?.acknowledgedAt && (
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        Acknowledged
                      </span>
                    )}

                    {selectedReport.userIsVerified ? (
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <ShieldCheck className="w-4 h-4" />
                        Trusted Reporter
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] bg-amber-50 text-amber-700 ring-1 ring-amber-200 animate-pulse">
                        <Flag className="w-4 h-4" />
                        Unverified Reporter
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500 line-clamp-2">{selectedReport.addressLandmark}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setConfirmFalseOpen(false);
                    setConfirmResolveOpen(false);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
                  aria-label="Close"
                  title="Close"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-12 gap-6">
                {/* LEFT */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {!selectedReport.userIsVerified && (
                    <div className={`rounded-3xl border-2 p-4 flex items-start gap-3 ${warningTone.wrap}`}>
                      <Flag className={`w-6 h-6 mt-0.5 ${warningTone.icon}`} />
                      <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${warningTone.label}`}>
                          Manual Check
                        </p>
                        <p className={`mt-1 text-sm font-black ${warningTone.title}`}>
                          Verification Required Before Dispatch
                        </p>
                        <p className={`mt-1 text-xs font-bold ${warningTone.text}`}>
                          Report was submitted by an unverified account. Confirm details via phone before assigning.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700">
                          <UserIcon className="w-5 h-5 text-rose-600" />
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Reporter
                          </span>
                        </div>
                        {selectedReport.userIsVerified && <ShieldCheck className="w-5 h-5 text-rose-600" />}
                      </div>
                      <p className="mt-2 text-sm font-black text-slate-900">{selectedReport.userName}</p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700">{selectedReport.userPhone}</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-rose-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Location</span>
                      </div>
                      <p className="mt-2 text-sm font-black text-slate-900 leading-snug">{selectedReport.addressLandmark}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">Coordinate-tagged report (GPS)</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-rose-700 mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Description</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium italic">“{selectedReport.description}”</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b bg-gradient-to-b from-slate-50 to-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Photo Evidence</p>
                    </div>

                    <div className="relative bg-slate-200">
                      {selectedReport.imageUrl ? (
                        <>
                          <img src={selectedReport.imageUrl} alt="Incident" className="w-full h-[520px] object-cover" />
                          <div className="absolute top-4 right-4 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                            Evidence
                          </div>
                        </>
                      ) : (
                        <div className="p-5">
                          <div className={`rounded-3xl border-2 p-4 flex items-start gap-3 ${ALERT.info.wrap}`}>
                            <AlertTriangle className={`w-6 h-6 mt-0.5 ${ALERT.info.icon}`} />
                            <div className="min-w-0">
                              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${ALERT.info.label}`}>
                                Missing Attachment
                              </p>
                              <p className={`mt-1 text-sm font-black ${ALERT.info.title}`}>No photo attached</p>
                              <p className={`mt-1 text-xs font-bold ${ALERT.info.text}`}>
                                Proceed using description + call-back verification if needed.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  {showAcknowledgeUI && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Dispatcher Action</p>
                      <h4 className="mt-2 text-sm font-black text-slate-900 uppercase tracking-tight">Acknowledgement</h4>

                      {!!(selectedReport as any)?.acknowledgedAt ? (
                        <div className={`mt-3 rounded-2xl border p-3 flex items-center gap-2 ${ALERT.success.wrap}`}>
                          <CheckCircle2 className={`w-5 h-5 ${ALERT.success.icon}`} />
                          <div className="min-w-0">
                            <p className={`text-xs font-black ${ALERT.success.title}`}>Acknowledged</p>
                            <p className={`text-[11px] font-bold break-words ${ALERT.success.text}`}>
                              {(selectedReport as any)?.acknowledgedAt}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={acknowledgeSelected}
                          disabled={ackBusy}
                          className="mt-3 w-full rounded-2xl bg-slate-900 text-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] hover:bg-rose-600 transition-colors disabled:opacity-50"
                        >
                          {ackBusy ? "MARKING…" : "MARK AS ACKNOWLEDGED"}
                        </button>
                      )}

                      <p className="mt-3 text-xs font-bold text-slate-500">Use this to confirm the report has been seen.</p>
                    </div>
                  )}

                  {user.userType === "pdrrmo_admin" && (
                    <>
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Admin</p>
                        <h4 className="mt-2 text-sm font-black text-slate-900 uppercase tracking-tight">
                          Verification Action
                        </h4>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleVerify(selectedReport.id, "verified")}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                              selectedReport.verificationStatus === "verified"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner"
                                : "bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                            }`}
                          >
                            <CheckCircle className="w-7 h-7 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Verify</span>
                          </button>

                          <button
                            onClick={() => setConfirmFalseOpen(true)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                              selectedReport.verificationStatus === "false"
                                ? "bg-rose-50 border-rose-500 text-rose-700 shadow-inner"
                                : "bg-white border-slate-200 hover:border-rose-200 hover:bg-slate-50"
                            }`}
                          >
                            <XCircle className="w-7 h-7 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-[0.22em]">False</span>
                          </button>
                        </div>

                        <p className="mt-3 text-xs font-bold text-slate-500">
                          Mark “False” only after verification checks (call-back / cross-check).
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Dispatch</p>
                        <h4 className="mt-2 text-sm font-black text-slate-900 uppercase tracking-tight">
                          Assign Primary Agency
                        </h4>

                        <div className="mt-4 grid grid-cols-1 gap-2">
                          {(["BFP", "PNP", "PCG"] as AgencyType[]).map((agency) => (
                            <button
                              key={agency}
                              onClick={() => handleAssign(selectedReport.id, agency)}
                              className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                                selectedReport.assignedAgency === agency
                                  ? "bg-rose-600 border-rose-700 text-white shadow-lg"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:bg-slate-50"
                              }`}
                            >
                              <Shield className="w-5 h-5 shrink-0" />
                              <span className="font-black uppercase tracking-tight text-sm">{agency} Dispatch</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {user.userType === "agency_admin" && selectedReport.assignedAgency === user.agency && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Field Ops</p>
                      <h4 className="mt-2 text-sm font-black text-slate-900 uppercase tracking-tight">Field Operations</h4>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {(["en_route", "on_scene", "resolved"] as IncidentStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              if (status === "resolved") {
                                setConfirmResolveOpen(true); // ask confirmation first
                              } else {
                                handleStatusChange(selectedReport.id, status);
                              }
                            }}
                            className={`w-full p-4 rounded-2xl border-2 font-black uppercase tracking-wider text-xs transition-all ${
                              selectedReport.currentStatus === status
                                ? "bg-rose-600 border-rose-700 text-white shadow-lg"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {status.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                RESPOND.PH • Incident Operations Panel
              </p>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setConfirmFalseOpen(false);
                  setConfirmResolveOpen(false);
                }}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.22em] hover:bg-slate-800 transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>

          {/*  CONFIRM RESOLVED (AGENCY) */}
          {confirmResolveOpen && user.userType === "agency_admin" && selectedReport?.assignedAgency === user.agency && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                onClick={() => setConfirmResolveOpen(false)}
              />

              <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b bg-gradient-to-b from-slate-50 to-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Confirm Action</p>
                  <h3 className="mt-2 text-lg font-black text-slate-900 uppercase tracking-tight">
                    Mark as RESOLVED?
                  </h3>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    This will close the incident and remove it from the active dashboard.
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
                    <CheckCircle2 className="w-6 h-6 mt-0.5 text-emerald-700" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-emerald-900">Confirm resolution</p>
                      <p className="text-xs font-bold text-emerald-800">
                        ID: {selectedReport.id} • {selectedReport.addressLandmark}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setConfirmResolveOpen(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        setConfirmResolveOpen(false);
                        handleStatusChange(selectedReport.id, "resolved");
                      }}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg hover:bg-emerald-700"
                    >
                      Yes, mark RESOLVED
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/*  CONFIRM FALSE */}
          {confirmFalseOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                onClick={() => setConfirmFalseOpen(false)}
              />

              <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b bg-gradient-to-b from-slate-50 to-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Confirm Action</p>
                  <h3 className="mt-2 text-lg font-black text-slate-900 uppercase tracking-tight">Mark report as FALSE?</h3>
                  <p className="mt-2 text-xs font-bold text-slate-500">This will remove the report from the active dashboard.</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className={`rounded-2xl border p-4 flex gap-3 ${ALERT.danger.wrap}`}>
                    <XCircle className={`w-6 h-6 mt-0.5 ${ALERT.danger.icon}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-black ${ALERT.danger.title}`}>Final check</p>
                      <p className={`text-xs font-bold ${ALERT.danger.text}`}>
                        Only proceed if the report is confirmed invalid / spam / duplicate.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setConfirmFalseOpen(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        setConfirmFalseOpen(false);
                        handleVerify(selectedReport.id, "false");
                      }}
                      className="rounded-2xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-rose-200 hover:bg-rose-700"
                    >
                      Yes, mark FALSE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;

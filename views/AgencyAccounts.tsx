import React, { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Shield,
  Mail,
  Phone,
  Lock,
  Building2,
  Info,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  X,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";
import type { AgencyType } from "../types";
import { createAgencyAccount } from "../services/agencyCreate";
import {
  listenAgencyAccounts,
  fetchAgencyAccountsOnce,
  type AgencyAccountRow,
  updateAgencyAccountDoc,
  deleteAgencyAccountDoc,
} from "../services/agencyAccounts";

const AgencyAccounts: React.FC = () => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    agency: "BFP" as AgencyType,
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  //  collapse state
  const [openCreate, setOpenCreate] = useState(false);

  //  list state
  const [rows, setRows] = useState<AgencyAccountRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [search, setSearch] = useState("");
  const [agencyFilter, setAgencyFilter] = useState<"ALL" | AgencyType>("ALL");

  //  edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editRow, setEditRow] = useState<AgencyAccountRow | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    agency: "BFP" as AgencyType,
  });

  //  delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteRow, setDeleteRow] = useState<AgencyAccountRow | null>(null);

  const isValidEmail = useMemo(() => {
    if (!form.email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  }, [form.email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setMsg(null);

    try {
      const res = await createAgencyAccount(form);
      setMsg({ type: "success", text: `Created agency account! UID: ${res.uid}` });
      setForm({ fullName: "", email: "", phone: "", password: "", agency: "BFP" as AgencyType });
      // setOpenCreate(false);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to create agency account." });
    } finally {
      setBusy(false);
    }
  };

  //  AGENCY THEME (COLOR CODED)
  const themeFor = (agency: AgencyType) =>
    agency === "BFP"
      ? {
          label: "BFP Dispatch",
          ring: "ring-rose-200",
          border: "border-rose-200",
          soft: "bg-rose-50",
          soft2: "bg-rose-50/60",
          text: "text-rose-700",
          strong: "bg-rose-600",
          strongHover: "hover:bg-rose-700",
          icon: "text-rose-600",
          topBar: "from-rose-600 to-rose-500",
          dangerSoft: "bg-rose-50",
          dangerBorder: "border-rose-200",
          dangerText: "text-rose-700",
        }
      : agency === "PNP"
      ? {
          label: "PNP Dispatch",
          ring: "ring-violet-200",
          border: "border-violet-200",
          soft: "bg-violet-50",
          soft2: "bg-violet-50/60",
          text: "text-violet-700",
          strong: "bg-violet-600",
          strongHover: "hover:bg-violet-700",
          icon: "text-violet-600",
          topBar: "from-violet-600 to-violet-500",
          dangerSoft: "bg-violet-50",
          dangerBorder: "border-violet-200",
          dangerText: "text-violet-700",
        }
      : {
          label: "PCG Dispatch",
          ring: "ring-cyan-200",
          border: "border-cyan-200",
          soft: "bg-cyan-50",
          soft2: "bg-cyan-50/60",
          text: "text-cyan-700",
          strong: "bg-cyan-600",
          strongHover: "hover:bg-cyan-700",
          icon: "text-cyan-600",
          topBar: "from-cyan-600 to-cyan-500",
          dangerSoft: "bg-cyan-50",
          dangerBorder: "border-cyan-200",
          dangerText: "text-cyan-700",
        };

  const headerBadge = themeFor(form.agency);

  //  realtime subscribe
  useEffect(() => {
    setLoadingRows(true);
    const unsub = listenAgencyAccounts((data) => {
      setRows(data);
      setLoadingRows(false);
    });
    return () => unsub?.();
  }, []);

  const refreshOnce = async () => {
    setLoadingRows(true);
    try {
      const data = await fetchAgencyAccountsOnce();
      setRows(data);
    } finally {
      setLoadingRows(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const agencyOk = agencyFilter === "ALL" ? true : r.agency === agencyFilter;
      if (!agencyOk) return false;

      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        r.agency.toLowerCase().includes(q)
      );
    });
  }, [rows, search, agencyFilter]);

  const openEdit = (r: AgencyAccountRow) => {
    setMsg(null);
    setEditRow(r);
    setEditForm({
      fullName: r.fullName || "",
      phone: r.phone || "",
      agency: r.agency,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow || editBusy) return;
    setEditBusy(true);
    setMsg(null);

    try {
      await updateAgencyAccountDoc(editRow.id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        agency: editForm.agency,
      });
      setMsg({ type: "success", text: "Updated agency account." });
      setEditOpen(false);
      setEditRow(null);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to update agency account." });
    } finally {
      setEditBusy(false);
    }
  };

  const openDelete = (r: AgencyAccountRow) => {
    setMsg(null);
    setDeleteRow(r);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteRow || deleteBusy) return;
    setDeleteBusy(true);
    setMsg(null);

    try {
      await deleteAgencyAccountDoc(deleteRow.id);
      setMsg({ type: "success", text: "Deleted agency account (document removed)." });
      setDeleteOpen(false);
      setDeleteRow(null);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to delete agency account." });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/*  TOP ACTION BAR */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Admin</p>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Agency Accounts</h2>
        </div>

        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          New Agency Account
        </button>
      </div>

      {/*  CREATE CARD */}
      {openCreate && (
        <div className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${headerBadge.border}`}>
          <div className={`px-6 py-5 border-b bg-gradient-to-b from-white to-white ${headerBadge.soft}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Admin Tools</p>
                <h3 className="mt-1 text-xl font-black text-slate-900 uppercase tracking-tight">
                  Create Agency Account
                </h3>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Create an agency dispatcher/admin login with a temporary password.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ring-1 ${headerBadge.soft} ${headerBadge.text} ${headerBadge.ring}`}
                  title="Selected agency"
                >
                  <Shield className="w-4 h-4" />
                  {headerBadge.label}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOpenCreate(false);
                    setMsg(null);
                    setBusy(false);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
                  aria-label="Close create form"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {msg && (
            <div className="px-6 pt-5">
              <div
                className={`rounded-2xl border p-4 flex gap-3 ${
                  msg.type === "success" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                }`}
              >
                {msg.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-black ${msg.type === "success" ? "text-emerald-900" : "text-rose-900"}`}>
                    {msg.type === "success" ? "Success" : "Error"}
                  </p>
                  <p
                    className={`text-xs font-bold break-words ${
                      msg.type === "success" ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    {msg.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="px-6 py-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                Full Name
              </label>
              <div className="relative">
                <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${headerBadge.icon}`} />
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${headerBadge.icon}`} />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@agency.gov.ph"
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors ${
                    form.email.length === 0
                      ? "border-slate-100 focus:border-rose-500"
                      : isValidEmail
                      ? "border-emerald-200 focus:border-emerald-400"
                      : "border-rose-200 focus:border-rose-500"
                  }`}
                />
              </div>
              {form.email.length > 0 && !isValidEmail && (
                <p className="text-[11px] font-bold text-rose-600 ml-1">Enter a valid email.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${headerBadge.icon}`} />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="09XXXXXXXXX"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                Temporary Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${headerBadge.icon}`} />
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none transition-colors"
                />
              </div>

              <div className={`rounded-2xl border p-3 flex gap-2 ${headerBadge.soft2} ${headerBadge.border}`}>
                <Info className={`w-4 h-4 ${headerBadge.icon} mt-0.5`} />
                <p className="text-[11px] font-bold text-slate-600">
                  Share this temporary password with the agency user. They can change it later.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                Agency
              </label>
              <div className="relative">
                <Shield className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${headerBadge.icon}`} />
                <select
                  value={form.agency}
                  onChange={(e) => setForm({ ...form, agency: e.target.value as AgencyType })}
                  className="w-full appearance-none pl-12 pr-10 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 focus:border-rose-500 focus:outline-none transition-colors"
                >
                  <option value="BFP">BFP</option>
                  <option value="PNP">PNP</option>
                  <option value="PCG">PCG</option>
                </select>

                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <button
              disabled={busy}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.22em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] text-white ${headerBadge.strong} ${headerBadge.strongHover}`}
            >
              <UserPlus className="w-5 h-5" />
              {busy ? "CREATING..." : "CREATE AGENCY ACCOUNT"}
            </button>
          </form>
        </div>
      )}

      {/* LIST CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Directory</p>
              <h3 className="mt-1 text-xl font-black text-slate-900 uppercase tracking-tight">
                Created Agency Accounts
              </h3>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Live list of agency-admin users created in the system.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshOnce}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loadingRows ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone…"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-800 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value as any)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-white px-4 py-3.5 font-black text-slate-800 focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">All Agencies</option>
              <option value="BFP">BFP</option>
              <option value="PNP">PNP</option>
              <option value="PCG">PCG</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-6">
          {loadingRows ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Loading accounts…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-black text-slate-800">No agency accounts found</p>
              <p className="mt-1 text-xs font-bold text-slate-400">Try changing filters or search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => {
                const b = themeFor(r.agency);

                return (
                  <div
                    key={r.id}
                    className={`rounded-3xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden ${b.border}`}
                  >
                    {/* colored accent */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${b.topBar}`} />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{r.fullName || "(No name)"}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500 break-words">{r.email}</p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ring-1 ${b.soft} ${b.text} ${b.ring}`}
                          >
                            <Shield className={`h-4 w-4 ${b.icon}`} />
                            {r.agency}
                          </span>

                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            {r.createdAt
                              ? r.createdAt.toLocaleString([], {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Phone Number box */}
                      <div className={`mt-3 rounded-2xl border p-3 ${b.soft2} ${b.border}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Phone Number</p>
                        <p className="mt-1 text-xs font-bold text-slate-800 break-words">{r.phone ? r.phone : "—"}</p>
                      </div>

                      {/*  ACTIONS */}
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${b.border} ${b.soft} ${b.text} hover:bg-white`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openDelete(r)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-rose-700 hover:bg-rose-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/*  EDIT MODAL */}
      {editOpen && editRow && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          {(() => {
            const b = themeFor(editForm.agency);
            return (
              <div className={`relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border overflow-hidden ${b.border}`}>
                <div className={`px-6 py-5 border-b bg-gradient-to-b from-white to-white ${b.soft}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Edit</p>
                      <h3 className="mt-1 text-lg font-black text-slate-900 uppercase tracking-tight">
                        Update Agency Account
                      </h3>
                      <p className="mt-2 text-xs font-bold text-slate-500 break-words">
                        {editRow.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50"
                      aria-label="Close edit"
                      title="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                      Full Name
                    </label>
                    <input
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                      Email (read-only)
                    </label>
                    <input
                      value={editRow.email}
                      disabled
                      className="w-full px-4 py-3.5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                      Phone
                    </label>
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1">
                      Agency
                    </label>
                    <select
                      value={editForm.agency}
                      onChange={(e) => setEditForm((p) => ({ ...p, agency: e.target.value as AgencyType }))}
                      className="w-full px-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-800 focus:border-rose-500 focus:outline-none"
                    >
                      <option value="BFP">BFP</option>
                      <option value="PNP">PNP</option>
                      <option value="PCG">PCG</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={editBusy}
                      className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg disabled:opacity-60 ${b.strong} ${b.strongHover}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {editBusy ? "Saving..." : "Save Changes"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/*  DELETE CONFIRM MODAL */}
      {deleteOpen && deleteRow && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-rose-200 overflow-hidden">
            <div className="px-6 py-5 border-b bg-gradient-to-b from-rose-50 to-white">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Confirm</p>
              <h3 className="mt-2 text-lg font-black text-slate-900 uppercase tracking-tight">Delete account?</h3>
              <p className="mt-2 text-xs font-bold text-slate-600 break-words">{deleteRow.email}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
                <Trash2 className="w-6 h-6 text-rose-700 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-rose-900">This removes the user document</p>
                  <p className="text-xs font-bold text-rose-800">
                    If you also need to remove Firebase Auth, do it from your admin backend/cloud function.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
                  disabled={deleteBusy}
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-60"
                >
                  {deleteBusy ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyAccounts;

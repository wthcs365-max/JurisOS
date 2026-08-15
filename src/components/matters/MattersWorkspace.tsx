import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge, Button, Card, CardHeader } from "../ui";
import { Icon } from "../icons";
import {
  addDeadline,
  createMatter,
  getMatterDetail,
  listMatters,
} from "~/lib/server/matters";
import type {
  MatterDetail,
  MatterFilter,
  MatterListItem,
} from "~/lib/server/matters";

// ── Panel A context survives route switches ───────────────────────────────────
// /matters and /matters/$matterId each mount their own workspace instance; keep
// the search box + filter at module level so the list context is preserved when
// you open a matter and come back.
const listContext: { query: string; filter: MatterFilter } = {
  query: "",
  filter: "all",
};

const FILTERS: { id: MatterFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
  { id: "mine", label: "My Matters" },
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "parties", label: "Parties" },
  { id: "documents", label: "Documents" },
  { id: "timeline", label: "Timeline" },
] as const;

type Tab = (typeof TABS)[number]["id"];

// ── Presentational helpers ────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dueMeta(dueIso: string): { label: string; tone: "red" | "amber" | "green" } {
  const days = Math.ceil((new Date(dueIso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Overdue ${-days}d`, tone: "red" };
  if (days === 0) return { label: "Due today", tone: "red" };
  if (days <= 3) return { label: `Due in ${days}d`, tone: "red" };
  if (days <= 7) return { label: `Due in ${days}d`, tone: "amber" };
  return { label: `Due ${fmtDate(dueIso)}`, tone: "green" };
}

function statusTone(status: "ACTIVE" | "CLOSED"): "blue" | "slate" {
  return status === "ACTIVE" ? "blue" : "slate";
}

function roleTone(role: string): "blue" | "red" | "amber" | "green" {
  if (role === "PLAINTIFF" || role === "APPLICANT") return "blue";
  if (role === "DEFENDANT" || role === "RESPONDENT") return "red";
  if (role === "THIRD_PARTY") return "amber";
  return "green";
}

function docTone(docType: string): "blue" | "amber" | "slate" {
  if (docType === "PLEADING") return "blue";
  if (docType === "EVIDENCE") return "amber";
  return "slate";
}

function eventTone(eventType: string): "slate" | "red" | "amber" | "green" | "blue" {
  const t = eventType.toLowerCase();
  if (t.includes("deadline")) return "red";
  if (t.includes("created")) return "green";
  if (t.includes("draft") || t.includes("pleading")) return "blue";
  if (t.includes("file")) return "amber";
  return "slate";
}

function eventIcon(eventType: string): string {
  const t = eventType.toLowerCase();
  if (t.includes("deadline")) return "clock";
  if (t.includes("created")) return "plus";
  if (t.includes("draft")) return "pen";
  if (t.includes("file")) return "efiling";
  if (t.includes("serv")) return "sheriffs";
  if (t.includes("closed")) return "check";
  return "file";
}

function formatBudget(budget: number | null): string {
  if (budget == null) return "—";
  return `R ${budget.toLocaleString("en-ZA")}`;
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

// ── Workspace ─────────────────────────────────────────────────────────────────

export function MattersWorkspace({
  selectedMatterId,
  initialDetail,
  initialMatters,
  initialListError,
  newRequested,
}: {
  selectedMatterId: string | null;
  initialDetail: MatterDetail | null;
  initialMatters: MatterListItem[] | null;
  initialListError: string | null;
  newRequested: boolean;
}) {
  const navigate = useNavigate();

  // ── Panel A: list ─────────────────────────────────────────────────────────
  const [query, setQuery] = useState(listContext.query);
  const [filter, setFilter] = useState<MatterFilter>(listContext.filter);
  const [matters, setMatters] = useState<MatterListItem[] | null>(initialMatters);
  const [listError, setListError] = useState<string | null>(initialListError);
  const [listBusy, setListBusy] = useState(false);

  useEffect(() => {
    listContext.query = query;
    listContext.filter = filter;
  }, [query, filter]);

  useEffect(() => {
    let cancelled = false;
    setListBusy(true);
    const timer = setTimeout(() => {
      listMatters({ data: { search: query, filter } })
        .then((rows) => {
          if (!cancelled) {
            setMatters(rows);
            setListError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setListError(e instanceof Error ? e.message : String(e));
            setMatters([]);
          }
        })
        .finally(() => {
          if (!cancelled) setListBusy(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, filter]);

  // ── Panel B: detail ───────────────────────────────────────────────────────
  const [detail, setDetail] = useState<MatterDetail | null>(initialDetail);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const refreshDetail = useCallback(async (id: string) => {
    try {
      const d = await getMatterDetail({ data: { id } });
      setDetail(d);
      setDetailError(d ? null : "Matter not found — it may have been removed.");
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (selectedMatterId) void refreshDetail(selectedMatterId);
  }, [selectedMatterId, refreshDetail]);

  // ── Panel C: actions ──────────────────────────────────────────────────────
  const [dlTitle, setDlTitle] = useState("");
  const [dlDue, setDlDue] = useState("");
  const [dlBusy, setDlBusy] = useState(false);
  const [dlMsg, setDlMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [stub, setStub] = useState<string | null>(null);

  const submitDeadline = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail || !dlTitle.trim() || !dlDue) return;
    setDlBusy(true);
    setDlMsg(null);
    try {
      const due = new Date(`${dlDue}T00:00:00`); // local midnight for the chosen day
      await addDeadline({
        data: { matterId: detail.id, title: dlTitle.trim(), dueAt: due.toISOString() },
      });
      setDlTitle("");
      setDlDue("");
      setDlMsg({ ok: true, text: "Deadline added — logged to the timeline." });
      void refreshDetail(detail.id);
    } catch (err) {
      setDlMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setDlBusy(false);
    }
  };

  // ── New matter ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(newRequested);
  const [nm, setNm] = useState({
    title: "",
    caseNumber: "",
    court: "",
    judge: "",
    status: "ACTIVE" as "ACTIVE" | "CLOSED",
    budget: "",
  });
  const [nmBusy, setNmBusy] = useState(false);
  const [nmError, setNmError] = useState<string | null>(null);

  useEffect(() => {
    if (newRequested) setFormOpen(true);
  }, [newRequested]);

  const openNewMatter = () => {
    void navigate({ to: "/matters", search: { new: true } });
  };

  const closeNewMatter = () => {
    setFormOpen(false);
    setNmError(null);
    void navigate({ to: "/matters", search: {} });
  };

  const submitNewMatter = async (e: FormEvent) => {
    e.preventDefault();
    if (!nm.title.trim()) {
      setNmError("A matter title is required.");
      return;
    }
    setNmBusy(true);
    setNmError(null);
    try {
      const created = await createMatter({
        data: {
          title: nm.title.trim(),
          caseNumber: nm.caseNumber.trim() || null,
          court: nm.court.trim() || null,
          judge: nm.judge.trim() || null,
          caseType: null,
          budget: nm.budget ? Number(nm.budget) : null,
          status: nm.status,
          description: null,
        },
      });
      setFormOpen(false);
      setNm({ title: "", caseNumber: "", court: "", judge: "", status: "ACTIVE", budget: "" });
      setQuery("");
      setFilter("all");
      void navigate({ to: "/matters/$matterId", params: { matterId: created.id } });
    } catch (err) {
      setNmError(err instanceof Error ? err.message : String(err));
    } finally {
      setNmBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-8.5rem)] lg:grid-cols-[3fr_5fr_2fr]">
      {/* ── Panel A · Matter list ─────────────────────────────────────────── */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-900">
              <Icon name="file" className="h-4 w-4 text-slate-400" />
              Matters
              {matters ? (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  {matters.length}
                </span>
              ) : null}
            </h2>
            <Button variant="secondary" className="!px-2.5 !py-1 text-[12px]" onClick={openNewMatter}>
              <Icon name="plus" className="h-3.5 w-3.5" />
              New Matter
            </Button>
          </div>
          <div className="relative mt-2.5">
            <Icon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, case no., party…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filter === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listError ? (
            <div className="flex items-start gap-2 px-4 py-6 text-[12px] text-red-600">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Could not load matters: {listError}</span>
            </div>
          ) : matters === null ? (
            <p className="px-4 py-8 text-center text-[12px] text-slate-400">
              {listBusy ? "Loading matters…" : "No matters yet."}
            </p>
          ) : matters.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
              <Icon name="file" className="h-5 w-5 text-slate-300" />
              <p className="text-[13px] font-medium text-slate-600">No matters match</p>
              <p className="max-w-[220px] text-[12px] text-slate-400">
                Try a different search or filter, or create a new matter.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {matters.map((m) => {
                const active = m.id === selectedMatterId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: "/matters/$matterId",
                          params: { matterId: m.id },
                        })
                      }
                      className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-slate-900 bg-slate-50"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-slate-900">
                          {m.title}
                        </p>
                        <Badge tone={statusTone(m.status)}>
                          {m.status === "ACTIVE" ? "Active" : "Closed"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {m.caseNumber ?? "No case no."}
                        {m.court ? ` · ${m.court}` : ""}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {m.nextDeadline ? (
                          <>
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                dueMeta(m.nextDeadline.dueAt).tone === "red"
                                  ? "bg-red-500"
                                  : "bg-amber-400"
                              }`}
                            />
                            <p className="truncate text-[11px] text-slate-500">
                              {dueMeta(m.nextDeadline.dueAt).label} ·{" "}
                              {m.nextDeadline.title}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-400">
                            No open deadlines
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* ── Panel B · Matter detail ───────────────────────────────────────── */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        {detail ? (
          <>
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {detail.matterNumber}
                  </p>
                  <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-slate-900">
                    {detail.title}
                  </h2>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {detail.court ?? "No court allocated"}
                    {detail.caseNumber ? ` · ${detail.caseNumber}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone(detail.status)}>
                  {detail.status === "ACTIVE" ? "Active" : "Closed"}
                </Badge>
              </div>
              <nav className="mt-3 flex gap-1 border-b border-slate-100">
                {TABS.map((t) => {
                  const count =
                    t.id === "parties"
                      ? detail.parties.length
                      : t.id === "documents"
                        ? detail.documents.length
                        : t.id === "timeline"
                          ? detail.timeline.length
                          : null;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`-mb-px border-b-2 px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                        tab === t.id
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {t.label}
                      {count != null ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto">
              {detailError && (
                <div className="flex items-start gap-2 px-4 py-3 text-[12px] text-red-600">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{detailError}</span>
                </div>
              )}
              {tab === "overview" && <OverviewTab detail={detail} />}
              {tab === "parties" && <PartiesTab detail={detail} />}
              {tab === "documents" && <DocumentsTab detail={detail} />}
              {tab === "timeline" && <TimelineTab detail={detail} />}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            {detailError ? (
              <>
                <Icon name="alert" className="h-6 w-6 text-slate-300" />
                <p className="text-[13px] font-medium text-slate-600">{detailError}</p>
              </>
            ) : (
              <>
                <Icon name="file" className="h-6 w-6 text-slate-300" />
                <p className="text-[13px] font-medium text-slate-600">
                  Select a matter
                </p>
                <p className="max-w-[260px] text-[12px] text-slate-400">
                  Pick a matter from the list to see its parties, documents and
                  timeline — or create a new one.
                </p>
                <Button variant="secondary" className="mt-2" onClick={openNewMatter}>
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  New Matter
                </Button>
              </>
            )}
          </div>
        )}
      </Card>

      {/* ── Panel C · Actions ─────────────────────────────────────────────── */}
      <Card className="flex min-h-0 flex-col overflow-hidden">
        <CardHeader
          title="Actions"
          subtitle={detail ? "Next steps for this matter" : "Nothing selected"}
          action={<Icon name="arrowRight" className="h-4 w-4 text-slate-400" />}
        />
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <Button
            className="w-full justify-center"
            disabled={!detail}
            onClick={() => void navigate({ to: "/drafting" })}
          >
            <Icon name="pen" className="h-3.5 w-3.5" />
            Draft
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={!detail}
              onClick={() =>
                setStub(stub === "file" ? null : "file")
              }
            >
              <Icon name="efiling" className="h-3.5 w-3.5" />
              File
            </Button>
            <Button
              variant="secondary"
              disabled={!detail}
              onClick={() => setStub(stub === "bundle" ? null : "bundle")}
            >
              <Icon name="bundle" className="h-3.5 w-3.5" />
              Bundle
            </Button>
          </div>
          {stub === "file" && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
              eFiling &amp; service arrive with Screen 7 — filings are queued in
              the outbox until then.
            </p>
          )}
          {stub === "bundle" && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
              Bundling arrives with Screen 8 — CaseLines bundles will be built
              from this matter's documents.
            </p>
          )}

          <div className="border-t border-slate-100 pt-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Icon name="clock" className="h-3.5 w-3.5" />
              Add Deadline
            </p>
            <form onSubmit={submitDeadline} className="mt-2 space-y-2">
              <input
                value={dlTitle}
                onChange={(e) => setDlTitle(e.target.value)}
                placeholder="e.g. File plea"
                disabled={!detail}
                className={inputCls}
              />
              <input
                type="date"
                value={dlDue}
                onChange={(e) => setDlDue(e.target.value)}
                disabled={!detail}
                className={inputCls}
              />
              <Button
                className="w-full justify-center"
                variant="secondary"
                disabled={!detail || dlBusy}
                type="submit"
              >
                {dlBusy ? "Adding…" : "Add deadline"}
              </Button>
            </form>
            {dlMsg && (
              <p
                className={`mt-2 text-[11px] ${
                  dlMsg.ok ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {dlMsg.text}
              </p>
            )}
          </div>

          {!detail && (
            <p className="pt-1 text-[11px] text-slate-400">
              Select a matter to take action.
            </p>
          )}
        </div>
      </Card>

      {/* ── New Matter modal ──────────────────────────────────────────────── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-[2px]"
          onClick={closeNewMatter}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create a new matter"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-[14px] font-semibold tracking-tight text-slate-900">
                New Matter
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={closeNewMatter}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitNewMatter} className="space-y-3 px-4 py-4">
              <Field label="Title *">
                <input
                  value={nm.title}
                  onChange={(e) => setNm({ ...nm, title: e.target.value })}
                  placeholder="e.g. Khumalo v Nedbank Ltd"
                  autoFocus
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Case number">
                  <input
                    value={nm.caseNumber}
                    onChange={(e) => setNm({ ...nm, caseNumber: e.target.value })}
                    placeholder="e.g. 2026/12345"
                    className={inputCls}
                  />
                </Field>
                <Field label="Court">
                  <input
                    value={nm.court}
                    onChange={(e) => setNm({ ...nm, court: e.target.value })}
                    placeholder="e.g. High Court — Johannesburg"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Judge / Magistrate">
                  <input
                    value={nm.judge}
                    onChange={(e) => setNm({ ...nm, judge: e.target.value })}
                    placeholder="Once allocated"
                    className={inputCls}
                  />
                </Field>
                <Field label="Budget (ZAR)">
                  <input
                    type="number"
                    min={0}
                    value={nm.budget}
                    onChange={(e) => setNm({ ...nm, budget: e.target.value })}
                    placeholder="e.g. 120000"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Status">
                <div className="flex gap-1.5">
                  {(["ACTIVE", "CLOSED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNm({ ...nm, status: s })}
                      className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        nm.status === s
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s === "ACTIVE" ? "Active" : "Closed"}
                    </button>
                  ))}
                </div>
              </Field>
              {nmError && <p className="text-[12px] text-red-600">{nmError}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={closeNewMatter}>
                  Cancel
                </Button>
                <Button type="submit" disabled={nmBusy}>
                  {nmBusy ? "Creating…" : "Create matter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab({ detail }: { detail: MatterDetail }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Case number", value: detail.caseNumber ?? "—" },
    { label: "Court", value: detail.court ?? "—" },
    { label: "Judge / Magistrate", value: detail.judge ?? "—" },
    { label: "Budget", value: formatBudget(detail.budget) },
    { label: "Status", value: detail.status === "ACTIVE" ? "Active" : "Closed" },
    {
      label: "Opened",
      value: fmtDate(detail.openedAt),
    },
  ];

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Key fields
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-[11px] text-slate-400">{r.label}</dt>
              <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-900">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {detail.description && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Description
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            {detail.description}
          </p>
        </div>
      )}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Parties
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detail.parties.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-700"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {p.role.replace("_", " ")}
              </span>
              {p.name}
              {p.isClient && (
                <Badge tone="green">
                  <Icon name="check" className="h-2.5 w-2.5" />
                  Client
                </Badge>
              )}
            </span>
          ))}
          {detail.parties.length === 0 && (
            <p className="text-[12px] text-slate-400">No parties added yet.</p>
          )}
        </div>
      </div>
      {detail.openDeadlines.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Open deadlines ({detail.openDeadlines.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {detail.openDeadlines.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-1.5"
              >
                <span className="truncate text-[12px] text-slate-700">{d.title}</span>
                <Badge tone={dueMeta(d.dueAt).tone}>{dueMeta(d.dueAt).label}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PartiesTab({ detail }: { detail: MatterDetail }) {
  if (detail.parties.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[12px] text-slate-400">
        No parties on file yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Party</th>
            <th className="px-4 py-2 font-medium">Contact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {detail.parties.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2.5">
                <Badge tone={roleTone(p.role)}>
                  {p.role.replace("_", " ")}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.isClient && <Badge tone="green">Client</Badge>}
                </div>
              </td>
              <td className="px-4 py-2.5 text-slate-500">
                {p.email && <p>{p.email}</p>}
                {p.phone && <p className="text-slate-400">{p.phone}</p>}
                {!p.email && !p.phone && <p className="text-slate-300">—</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTab({ detail }: { detail: MatterDetail }) {
  if (detail.documents.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[12px] text-slate-400">
        No documents uploaded yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {detail.documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-4 py-3">
          <Icon name="file" className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-900">
              {d.title}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {d.fileName ?? "No file attached"}
              {d.version > 1 ? ` · v${d.version}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Badge tone={docTone(d.docType)}>{d.docType}</Badge>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {fmtDate(d.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TimelineTab({ detail }: { detail: MatterDetail }) {
  if (detail.timeline.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[12px] text-slate-400">
        No activity recorded yet — events auto-log as this matter progresses.
      </p>
    );
  }
  return (
    <ol className="px-4 py-3">
      {detail.timeline.map((t, i) => (
        <li key={t.id} className="relative flex gap-3 pb-4 last:pb-1">
          {i < detail.timeline.length - 1 && (
            <span className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-200" />
          )}
          <span className="mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
            <Icon name={eventIcon(t.eventType)} className="h-2.5 w-2.5 text-slate-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={eventTone(t.eventType)}>{t.eventType}</Badge>
              <span className="text-[11px] text-slate-400">
                {fmtDateTime(t.occurredAt)}
              </span>
            </div>
            <p className="mt-1 text-[13px] font-medium text-slate-900">{t.title}</p>
            {t.details && (
              <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                {t.details}
              </p>
            )}
            {t.userName && (
              <p className="mt-0.5 text-[11px] text-slate-400">by {t.userName}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

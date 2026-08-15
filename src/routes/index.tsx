import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { getDashboardData } from "~/lib/server/dashboard";
import type { DashboardData } from "~/lib/server/dashboard";
import { AppShell } from "~/components/layout/AppShell";
import { Badge, Button, Card, CardHeader, Kbd } from "~/components/ui";
import { Icon } from "~/components/icons";

type LoaderData = DashboardData | { error: string };

export const Route = createFileRoute("/")({
  loader: async (): Promise<LoaderData> => {
    try {
      return await getDashboardData();
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();

  if ("error" in data) {
    return (
      <AppShell pageTitle="Dashboard">
        <Card className="p-8">
          <div className="flex items-start gap-3">
            <Icon name="alert" className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Could not load dashboard data
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                The database may not be seeded. Run{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700">
                  bunx prisma db seed
                </code>{" "}
                from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700">/home/team/shared/site</code>.
              </p>
              <p className="mt-2 text-[12px] text-slate-400">{data.error}</p>
            </div>
          </div>
        </Card>
      </AppShell>
    );
  }

  const { firmName, dueDeadlines, outbox, filingsWaiting, recentMatters, aiSuggestions, now } =
    data;

  const queuedTotal = outbox.length;

  return (
    <AppShell>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {new Date(now).toLocaleDateString("en-ZA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Good {greeting(now)}, {firmName.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {dueDeadlines.length} deadline{dueDeadlines.length === 1 ? "" : "s"} due in the next 7 days
            {queuedTotal > 0 && (
              <>
                {" "}
                · {queuedTotal} item{queuedTotal === 1 ? "" : "s"} queued in the outbox
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => void navigate({ to: "/matters", search: { new: true } })}>
            <Icon name="plus" className="h-3.5 w-3.5" />
            Create New Matter
          </Button>
          <Button onClick={() => void navigate({ to: "/drafting" })}>
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Quick Draft
          </Button>
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Due in 7 days */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Due in 7 Days"
            subtitle="Open deadlines from the Deadline Engine"
            action={<Icon name="clock" className="h-4 w-4 text-slate-400" />}
          />
          {dueDeadlines.length === 0 ? (
            <EmptyState
              icon="check"
              title="Nothing due this week"
              detail="New deadlines appear here as soon as the Deadline Engine calculates them."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dueDeadlines.map((d) => {
                const dL = dueLabel(d.dueAt, now);
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        dL.tone === "red" ? "bg-red-500" : "bg-amber-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-900">
                        {d.title}
                      </p>
                      <p className="truncate text-[12px] text-slate-500">
                        {d.matterTitle}
                        {d.rule ? ` · ${d.rule}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={dL.tone}>{dL.label}</Badge>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(d.dueAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Outbox queue */}
        <Card>
          <CardHeader
            title="Outbox Queue"
            subtitle="eFiling & sheriff actions waiting to send"
            action={
              <Badge tone={queuedTotal > 0 ? "blue" : "green"}>
                {queuedTotal} queued
              </Badge>
            }
          />
          <div className="px-4 py-3">
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold text-slate-900">{queuedTotal}</span>{" "}
              {queuedTotal === 1 ? "action is" : "actions are"} waiting
              {filingsWaiting > 0 && (
                <>
                  {" "}
                  — including{" "}
                  <span className="font-semibold text-slate-900">
                    {filingsWaiting} filing{filingsWaiting === 1 ? "" : "s"}
                  </span>{" "}
                  not yet submitted
                </>
              )}
            </p>
          </div>
          {outbox.length > 0 && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {outbox.map((o) => (
                <li key={o.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <Icon
                    name={o.action === "SERVE" ? "sheriffs" : "efiling"}
                    className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-slate-800">{o.target}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {o.action} · {o.matterTitle ?? "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <p className="text-[11px] text-slate-400">
              Sends automatically when back online ·{" "}
              <button className="font-medium text-slate-600 underline-offset-2 hover:underline">
                view outbox
              </button>
            </p>
          </div>
        </Card>

        {/* Recent matters */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Matters"
            subtitle="Latest activity from each matter's timeline"
            action={<Icon name="file" className="h-4 w-4 text-slate-400" />}
          />
          <ul className="divide-y divide-slate-100">
            {recentMatters.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-slate-900">
                      {m.title}
                    </p>
                    {m.status === "CLOSED" && <Badge tone="slate">Closed</Badge>}
                  </div>
                  <p className="truncate text-[12px] text-slate-500">
                    {m.court ?? "—"}
                    {m.caseNumber ? ` · ${m.caseNumber}` : ""} · {m.matterNumber}
                  </p>
                </div>
                <div className="hidden min-w-0 flex-1 flex-col items-end sm:flex">
                  {m.lastEvent ? (
                    <>
                      <p className="max-w-[220px] truncate text-[12px] text-slate-600">
                        {m.lastEvent}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {m.lastEventAt ? timeAgo(m.lastEventAt, now) : "—"}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">No activity yet</p>
                  )}
                </div>
                <Badge tone={m.openDeadlines > 0 ? "red" : "slate"}>
                  {m.openDeadlines} open
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        {/* AI draft suggestions */}
        <Card>
          <CardHeader
            title="AI Draft Suggestions"
            subtitle="Generated from open matters"
            action={
              <Badge tone="amber">
                <Icon name="sparkles" className="h-3 w-3" />
                Preview
              </Badge>
            }
          />
          <div className="space-y-2.5 px-4 py-3">
            {aiSuggestions.length === 0 ? (
              <EmptyState
                icon="sparkles"
                title="No suggestions yet"
                detail="Open matters will surface draft ideas here."
              />
            ) : (
              aiSuggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="pen" className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[13px] font-medium text-slate-900">{s.title}</p>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-slate-500">
                    {s.matterTitle}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">
                    {s.reason}
                  </p>
                </div>
              ))
            )}
            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
              <Icon name="sparkles" className="h-3 w-3 text-amber-400" />
              AI drafting ships with Screen 4 — suggestions are static for now.
            </p>
          </div>
        </Card>
      </div>

      {/* Keyboard hint */}
      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400">
        Press <Kbd>⌘K</Kbd> to open the command palette
      </p>
    </AppShell>
  );
}

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
      <Icon name={icon} className="h-5 w-5 text-slate-300" />
      <p className="text-[13px] font-medium text-slate-600">{title}</p>
      <p className="max-w-[240px] text-[12px] text-slate-400">{detail}</p>
    </div>
  );
}

function greeting(nowIso: string): string {
  const h = new Date(nowIso).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function dueLabel(dueIso: string, nowIso: string): { label: string; tone: "red" | "amber" } {
  const due = new Date(dueIso).getTime();
  const now = new Date(nowIso).getTime();
  const days = Math.ceil((due - now) / 86_400_000);
  if (days < 0) return { label: `Overdue by ${-days}d`, tone: "red" };
  if (days === 0) return { label: "Due today", tone: "red" };
  if (days <= 3) return { label: `Due in ${days}d`, tone: "red" };
  return { label: `Due in ${days}d`, tone: "amber" };
}

function timeAgo(iso: string, nowIso: string): string {
  const t = new Date(iso).getTime();
  const n = new Date(nowIso).getTime();
  const mins = Math.round((n - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

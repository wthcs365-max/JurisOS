import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/db";

// ── Types (serialisable — dates are ISO strings) ─────────────────────────────

export type DueDeadline = {
  id: string;
  title: string;
  dueAt: string;
  rule: string | null;
  matterId: string;
  matterTitle: string;
};

export type OutboxItem = {
  id: string;
  action: string;
  target: string;
  matterTitle: string | null;
};

export type RecentMatter = {
  id: string;
  matterNumber: string;
  title: string;
  court: string | null;
  caseNumber: string | null;
  status: "ACTIVE" | "CLOSED";
  lastEvent: string | null;
  lastEventAt: string | null;
  openDeadlines: number;
};

export type AiSuggestion = {
  id: string;
  kind: string;
  title: string;
  matterTitle: string;
  reason: string;
};

export type DashboardData = {
  firmName: string;
  dueDeadlines: DueDeadline[];
  outbox: OutboxItem[];
  filingsWaiting: number;
  recentMatters: RecentMatter[];
  aiSuggestions: AiSuggestion[];
  now: string;
};

// ── Server function ───────────────────────────────────────────────────────────

export const getDashboardData = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 86_400_000);

    const [firm, dueDeadlines, queuedOutbox, filingsWaiting, matters, activeMatters] =
      await Promise.all([
        prisma.firm.findFirst({ select: { name: true } }),
        prisma.deadline.findMany({
          where: {
            status: "OPEN",
            dueAt: { gte: now, lte: inSevenDays },
          },
          include: { matter: { select: { title: true } } },
          orderBy: { dueAt: "asc" },
        }),
        prisma.outbox.findMany({
          where: { status: "QUEUED" },
          include: { matter: { select: { title: true } } },
          orderBy: { queuedAt: "asc" },
        }),
        prisma.filing.count({ where: { status: { in: ["DRAFT", "QUEUED"] } } }),
        prisma.matter.findMany({
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: {
            timeline: { orderBy: { occurredAt: "desc" }, take: 1 },
            _count: {
              select: { deadlines: { where: { status: "OPEN" } } },
            },
          },
        }),
        prisma.matter.findMany({
          where: { status: "ACTIVE" },
          include: {
            documents: { select: { docType: true } },
            deadlines: {
              where: { status: "OPEN", dueAt: { gte: now, lte: inSevenDays } },
              select: { title: true, dueAt: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

    // Heuristic "AI draft suggestions" — placeholder intelligence until Screen 4.
    const aiSuggestions: AiSuggestion[] = activeMatters
      .map((m) => {
        const urgent = m.deadlines[0];
        const hasPleading = m.documents.some((d) => d.docType === "PLEADING");
        if (urgent && /affidavit/i.test(urgent.title)) {
          return {
            id: `ai-${m.id}-affidavit`,
            kind: "Draft",
            title: "Draft opposing affidavit",
            matterTitle: m.title,
            reason: `Due ${new Date(urgent.dueAt).toLocaleDateString("en-ZA")} — pull facts from the matter file.`,
          };
        }
        if (!hasPleading) {
          return {
            id: `ai-${m.id}-poc`,
            kind: "Draft",
            title: "Draft particulars of claim",
            matterTitle: m.title,
            reason: "No pleading on file yet — start from the client interview notes.",
          };
        }
        return {
          id: `ai-${m.id}-heads`,
          kind: "Draft",
          title: "Draft heads of argument",
          matterTitle: m.title,
          reason: "Pleadings are closed — prepare submissions for the next hearing.",
        };
      })
      .slice(0, 3);

    return {
      firmName: firm?.name ?? "JURIS OS",
      dueDeadlines: dueDeadlines.map((d) => ({
        id: d.id,
        title: d.title,
        dueAt: d.dueAt.toISOString(),
        rule: d.rule,
        matterId: d.matterId,
        matterTitle: d.matter.title,
      })),
      outbox: queuedOutbox.map((o) => ({
        id: o.id,
        action: o.action,
        target: o.target,
        matterTitle: o.matter?.title ?? null,
      })),
      filingsWaiting,
      recentMatters: matters.map((m) => ({
        id: m.id,
        matterNumber: m.matterNumber,
        title: m.title,
        court: m.court,
        caseNumber: m.caseNumber,
        status: m.status,
        lastEvent: m.timeline[0]?.title ?? null,
        lastEventAt: m.timeline[0]?.occurredAt.toISOString() ?? null,
        openDeadlines: m._count.deadlines,
      })),
      aiSuggestions,
      now: now.toISOString(),
    };
  },
);

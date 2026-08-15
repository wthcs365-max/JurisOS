import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/db";
import type { Prisma } from "@prisma/client";

// ── Types (serialisable — dates are ISO strings) ─────────────────────────────

export type MatterFilter = "all" | "active" | "closed" | "mine";

export type MatterListItem = {
  id: string;
  matterNumber: string;
  title: string;
  caseNumber: string | null;
  court: string | null;
  status: "ACTIVE" | "CLOSED";
  nextDeadline: { title: string; dueAt: string } | null;
  openDeadlines: number;
};

export type PartyBrief = {
  id: string;
  name: string;
  role: string;
  isClient: boolean;
  email: string | null;
  phone: string | null;
};

export type DocumentBrief = {
  id: string;
  title: string;
  docType: string;
  fileName: string | null;
  version: number;
  createdAt: string;
};

export type DeadlineBrief = {
  id: string;
  title: string;
  dueAt: string;
  rule: string | null;
};

export type TimelineEventBrief = {
  id: string;
  eventType: string;
  title: string;
  details: string | null;
  userName: string | null;
  occurredAt: string;
};

export type MatterDetail = {
  id: string;
  matterNumber: string;
  title: string;
  description: string | null;
  caseNumber: string | null;
  court: string | null;
  caseType: string | null;
  judge: string | null;
  budget: number | null;
  status: "ACTIVE" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  parties: PartyBrief[];
  documents: DocumentBrief[];
  openDeadlines: DeadlineBrief[];
  timeline: TimelineEventBrief[];
};

export type CreateMatterInput = {
  title: string;
  caseNumber: string | null;
  court: string | null;
  caseType: string | null;
  judge: string | null;
  budget: number | null;
  status: "ACTIVE" | "CLOSED";
  description: string | null;
};

export type AddDeadlineInput = {
  matterId: string;
  title: string;
  dueAt: string; // ISO string
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// "Me" = the first user in the firm (MVP: single-user sessions).
async function meUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

// ── Server functions ─────────────────────────────────────────────────────────
// NB: with no `.validator()`, TanStack Start types the handler ctx `data` as
// `undefined`, so handlers cast their input (mirroring the serialisable wire
// format) and the exported consts are cast to a friendly callable type. All
// Date fields are coerced to ISO strings before returning.

export const listMatters = createServerFn({ method: "GET" }).handler(
  async ({ data }): Promise<MatterListItem[]> => {
    const { search, filter } = data as unknown as {
      search: string;
      filter: MatterFilter;
    };

    const where: Prisma.MatterWhereInput = {};
    const q = search.trim();
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { matterNumber: { contains: q } },
        { caseNumber: { contains: q } },
        { parties: { some: { name: { contains: q } } } },
      ];
    }
    if (filter === "active") where.status = "ACTIVE";
    else if (filter === "closed") where.status = "CLOSED";
    else if (filter === "mine") {
      const me = await meUserId();
      if (me) where.tasks = { some: { userId: me } };
    }

    const matters = await prisma.matter.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: {
        deadlines: {
          where: { status: "OPEN" },
          orderBy: { dueAt: "asc" },
          select: { title: true, dueAt: true },
        },
      },
    });

    return matters.map((m) => ({
      id: m.id,
      matterNumber: m.matterNumber,
      title: m.title,
      caseNumber: m.caseNumber,
      court: m.court,
      status: m.status,
      nextDeadline: m.deadlines[0]
        ? { title: m.deadlines[0].title, dueAt: m.deadlines[0].dueAt.toISOString() }
        : null,
      openDeadlines: m.deadlines.length,
    }));
  },
) as unknown as (opts: { data: { search: string; filter: MatterFilter } }) => Promise<MatterListItem[]>;

export const getMatterDetail = createServerFn({ method: "GET" }).handler(
  async ({ data }): Promise<MatterDetail | null> => {
    const { id } = data as unknown as { id: string };

    const m = await prisma.matter.findUnique({
      where: { id },
      include: {
        parties: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
        deadlines: {
          where: { status: "OPEN" },
          orderBy: { dueAt: "asc" },
          select: { id: true, title: true, dueAt: true, rule: true },
        },
        timeline: {
          orderBy: { occurredAt: "desc" },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!m) return null;

    return {
      id: m.id,
      matterNumber: m.matterNumber,
      title: m.title,
      description: m.description,
      caseNumber: m.caseNumber,
      court: m.court,
      caseType: m.caseType,
      judge: m.judge,
      budget: m.budget,
      status: m.status,
      openedAt: m.openedAt.toISOString(),
      closedAt: m.closedAt?.toISOString() ?? null,
      parties: m.parties.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isClient: p.isClient,
        email: p.email,
        phone: p.phone,
      })),
      documents: m.documents.map((d) => ({
        id: d.id,
        title: d.title,
        docType: d.docType,
        fileName: d.fileName,
        version: d.version,
        createdAt: d.createdAt.toISOString(),
      })),
      openDeadlines: m.deadlines.map((d) => ({
        id: d.id,
        title: d.title,
        dueAt: d.dueAt.toISOString(),
        rule: d.rule,
      })),
      timeline: m.timeline.map((t) => ({
        id: t.id,
        eventType: t.eventType,
        title: t.title,
        details: t.details,
        userName: t.user?.name ?? null,
        occurredAt: t.occurredAt.toISOString(),
      })),
    };
  },
) as unknown as (opts: { data: { id: string } }) => Promise<MatterDetail | null>;

export const createMatter = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<{ id: string; matterNumber: string }> => {
    const input = data as unknown as CreateMatterInput;

    const firm = await prisma.firm.findFirst({ select: { id: true } });
    if (!firm) throw new Error("No firm configured — run the seed first.");
    const me = await meUserId();

    const year = new Date().getFullYear();
    const count = await prisma.matter.count();
    const matterNumber = `JUR-${year}-${String(count + 1).padStart(3, "0")}`;

    const matter = await prisma.matter.create({
      data: {
        matterNumber,
        title: input.title,
        description: input.description,
        caseNumber: input.caseNumber,
        court: input.court,
        caseType: input.caseType,
        judge: input.judge,
        budget: input.budget,
        status: input.status,
        firmId: firm.id,
      },
    });

    // Auto-log the opening of the matter on its timeline.
    await prisma.timelineEvent.create({
      data: {
        matterId: matter.id,
        eventType: "Created",
        title: "Matter created",
        details: `Opened as ${matterNumber}.`,
        userId: me ?? undefined,
        occurredAt: new Date(),
      },
    });

    return { id: matter.id, matterNumber };
  },
) as unknown as (opts: { data: CreateMatterInput }) => Promise<{ id: string; matterNumber: string }>;

export const addDeadline = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<{ id: string; title: string; dueAt: string }> => {
    const input = data as unknown as AddDeadlineInput;

    const me = await meUserId();
    const due = new Date(input.dueAt);

    const deadline = await prisma.deadline.create({
      data: {
        matterId: input.matterId,
        title: input.title,
        dueAt: due,
        status: "OPEN",
      },
    });

    // Auto-log the new deadline on the matter's timeline.
    await prisma.timelineEvent.create({
      data: {
        matterId: input.matterId,
        eventType: "Deadline added",
        title: `Deadline added: ${input.title}`,
        details: `Due ${due.toLocaleDateString("en-ZA")}.`,
        userId: me ?? undefined,
        occurredAt: new Date(),
      },
    });

    return { id: deadline.id, title: deadline.title, dueAt: deadline.dueAt.toISOString() };
  },
) as unknown as (opts: { data: AddDeadlineInput }) => Promise<{ id: string; title: string; dueAt: string }>;

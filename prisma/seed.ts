/**
 * JURIS OS — demo seed data (South African law firm).
 *
 * Run with:  bunx prisma db seed   (or:  bun run db:seed)
 * Safe to re-run: deletes existing rows first, then recreates.
 * Dates are relative to "now" so the Dashboard's due-in-7-days widget always
 * has fresh content after seeding.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  // ── Reset (idempotent) ──────────────────────────────────────────────────────
  await prisma.task.deleteMany();
  await prisma.outbox.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.bundle.deleteMany();
  await prisma.service.deleteMany();
  await prisma.filing.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.document.deleteMany();
  await prisma.party.deleteMany();
  await prisma.matter.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  // ── Firm & users ────────────────────────────────────────────────────────────
  const firm = await prisma.firm.create({
    data: {
      name: "Nkosi & Partners Inc.",
      registrationNumber: "2007/018934/21",
      vatNumber: "4890123456",
      phone: "+27 11 784 2200",
      email: "info@nkosiandpartners.co.za",
      streetAddress: "5th Floor, The Forum, 2 Maude Street",
      city: "Sandton",
      province: "Gauteng",
      postalCode: "2196",
    },
  });

  const thabo = await prisma.user.create({
    data: {
      name: "Thabo Nkosi",
      email: "thabo@nkosiandpartners.co.za",
      role: "ADMIN",
      firmId: firm.id,
    },
  });

  const lerato = await prisma.user.create({
    data: {
      name: "Lerato Mokoena",
      email: "lerato@nkosiandpartners.co.za",
      role: "CANDIDATE_ATTORNEY",
      firmId: firm.id,
    },
  });

  // ── Matters ─────────────────────────────────────────────────────────────────
  const mokwena = await prisma.matter.create({
    data: {
      matterNumber: "JUR-2024-001",
      title: "Mokwena v Standard Bank Ltd",
      description:
        "Recovery of monies paid under a void credit agreement; claim for restitution and interest.",
      caseNumber: "2024/12345",
      court: "High Court — Johannesburg",
      caseType: "Civil — Debt Recovery",
      judge: "Hon. Justice K. Mdluli",
      budget: 150_000,
      status: "ACTIVE",
      firmId: firm.id,
      openedAt: daysFromNow(-210),
    },
  });

  const dube = await prisma.matter.create({
    data: {
      matterNumber: "JUR-2025-014",
      title: "Dube v Absa Bank Ltd",
      description:
        "Unlawful repossessions and breach of National Credit Act obligations; damages claim.",
      caseNumber: "15874/2025",
      court: "Magistrate's Court — Germiston",
      caseType: "Civil — Damages",
      judge: "Magistrate S. Dlamini",
      budget: 85_000,
      status: "ACTIVE",
      firmId: firm.id,
      openedAt: daysFromNow(-95),
    },
  });

  const petersen = await prisma.matter.create({
    data: {
      matterNumber: "JUR-2023-077",
      title: "Petersen Family Trust v Redline Construction (Pty) Ltd",
      description:
        "Enforcement of suretyship following contractor's breach of a building agreement.",
      caseNumber: "2023/9812",
      court: "High Court — Pretoria",
      caseType: "Civil — Contract / Suretyship",
      judge: "Hon. Justice P. Naidoo",
      budget: 320_000,
      status: "ACTIVE",
      firmId: firm.id,
      openedAt: daysFromNow(-340),
    },
  });

  const ndlovu = await prisma.matter.create({
    data: {
      matterNumber: "JUR-2022-033",
      title: "Ndlovu v City of Johannesburg",
      description:
        "Review of a municipal assessment rates decision. Concluded — order granted with costs.",
      caseNumber: "2022/4512",
      court: "High Court — Johannesburg",
      caseType: "Civil — Administrative Review",
      judge: "Hon. Justice L. van der Merwe",
      budget: 120_000,
      status: "CLOSED",
      firmId: firm.id,
      openedAt: daysFromNow(-620),
      closedAt: daysFromNow(-90),
    },
  });

  // ── Parties ─────────────────────────────────────────────────────────────────
  await prisma.party.createMany({
    data: [
      { matterId: mokwena.id, name: "Thabo Mokwena", role: "PLAINTIFF", isClient: true, email: "tmokwena@gmail.com", phone: "+27 82 445 9912" },
      { matterId: mokwena.id, name: "Standard Bank Ltd", role: "DEFENDANT", email: "legal@standardbank.co.za" },
      { matterId: dube.id, name: "Nomsa Dube", role: "PLAINTIFF", isClient: true, email: "nomsa.dube@vodamail.co.za", phone: "+27 71 288 4403" },
      { matterId: dube.id, name: "Absa Bank Ltd", role: "DEFENDANT", email: "legalservices@absa.co.za" },
      { matterId: petersen.id, name: "Petersen Family Trust", role: "PLAINTIFF", isClient: true },
      { matterId: petersen.id, name: "Redline Construction (Pty) Ltd", role: "DEFENDANT" },
      { matterId: petersen.id, name: "Gugu Sithole", role: "THIRD_PARTY", phone: "+27 83 550 1027" },
      { matterId: ndlovu.id, name: "Sipho Ndlovu", role: "APPLICANT", isClient: true, email: "sipho.ndlovu@gmail.com" },
      { matterId: ndlovu.id, name: "City of Johannesburg", role: "RESPONDENT" },
    ],
  });

  // ── Documents ───────────────────────────────────────────────────────────────
  const docSummons = await prisma.document.create({
    data: { matterId: mokwena.id, title: "Combined Summons", docType: "PLEADING", fileName: "combined-summons-2024-12345.pdf", version: 2, uploadedBy: thabo.id },
  });
  await prisma.document.create({
    data: { matterId: mokwena.id, title: "Particulars of Claim", docType: "PLEADING", fileName: "particulars-of-claim.pdf", uploadedBy: lerato.id },
  });
  await prisma.document.create({
    data: { matterId: mokwena.id, title: "Letter of Demand", docType: "CORRESPONDENCE", fileName: "letter-of-demand.pdf", uploadedBy: thabo.id },
  });
  await prisma.document.create({
    data: { matterId: dube.id, title: "Statement of Claim", docType: "PLEADING", fileName: "statement-of-claim.pdf", uploadedBy: lerato.id },
  });
  const docPlea = await prisma.document.create({
    data: { matterId: petersen.id, title: "Notice of Motion", docType: "PLEADING", fileName: "notice-of-motion.pdf", uploadedBy: thabo.id },
  });
  const docAffidavit = await prisma.document.create({
    data: { matterId: petersen.id, title: "Founding Affidavit", docType: "EVIDENCE", fileName: "founding-affidavit.pdf", uploadedBy: lerato.id },
  });
  await prisma.document.create({
    data: { matterId: ndlovu.id, title: "Review Affidavit", docType: "EVIDENCE", fileName: "review-affidavit.pdf", uploadedBy: thabo.id },
  });

  // ── Deadlines ───────────────────────────────────────────────────────────────
  await prisma.deadline.createMany({
    data: [
      // Mokwena — one done (past), one due in 3 days (red), one in 6 days (amber)
      { matterId: mokwena.id, title: "File combined summons", rule: "HCR 18 — issue and file summons", dueAt: daysFromNow(-200), status: "DONE", completedAt: daysFromNow(-198) },
      { matterId: mokwena.id, title: "Opposing affidavit — Standard Bank", rule: "HCR 6(5)(d)(ii) — 15 days after notice of opposition", dueAt: daysFromNow(3), status: "OPEN" },
      { matterId: mokwena.id, title: "Case management conference", rule: "HCR 37A — pre-trial conference", dueAt: daysFromNow(6), status: "OPEN" },
      // Dube — one OVERDUE (yesterday) and one due in 2 days (red)
      { matterId: dube.id, title: "File notice of set down", rule: "MCR — set down within 12 months of close of pleadings", dueAt: daysFromNow(-1), status: "OPEN" },
      { matterId: dube.id, title: "File plea (Absa)", rule: "MCR 19 — plea within 10 days of notice of intention to defend", dueAt: daysFromNow(2), status: "OPEN" },
      { matterId: dube.id, title: "Discovery affidavit", rule: "MCR 23 — discovery within 20 days", dueAt: daysFromNow(12), status: "OPEN" },
      // Petersen — heads of argument in 5 days (amber), trial bundle later
      { matterId: petersen.id, title: "Lodge heads of argument", rule: "HCR 6(5)(f) — heads of argument before hearing", dueAt: daysFromNow(5), status: "OPEN" },
      { matterId: petersen.id, title: "Deliver trial bundle", rule: "Practice Directive 36 — bundle 5 days before trial", dueAt: daysFromNow(20), status: "OPEN" },
      // Ndlovu (closed) — everything done
      { matterId: ndlovu.id, title: "File record of review", rule: "HCR 53 — record within 60 days", dueAt: daysFromNow(-500), status: "DONE", completedAt: daysFromNow(-495) },
      { matterId: ndlovu.id, title: "Lodge heads of argument", rule: "HCR 53(5)", dueAt: daysFromNow(-480), status: "DONE", completedAt: daysFromNow(-478) },
    ],
  });

  // ── Filings ─────────────────────────────────────────────────────────────────
  await prisma.filing.create({
    data: {
      matterId: mokwena.id,
      documentId: docSummons.id,
      court: "Gauteng Local Division, Johannesburg",
      filingType: "Combined Summons",
      status: "PROOF_RECEIVED",
      reference: "2024/12345",
      submittedAt: daysFromNow(-200),
    },
  });
  await prisma.filing.create({
    data: {
      matterId: dube.id,
      court: "Magistrate's Court, Germiston",
      filingType: "Plea",
      status: "QUEUED",
    },
  });
  await prisma.filing.create({
    data: {
      matterId: ndlovu.id,
      documentId: docPlea.id,
      court: "Gauteng Local Division, Johannesburg",
      filingType: "Notice of Motion",
      status: "PROOF_RECEIVED",
      reference: "2022/4512",
      submittedAt: daysFromNow(-560),
    },
  });

  // ── Service of process ──────────────────────────────────────────────────────
  await prisma.service.create({
    data: { matterId: mokwena.id, documentId: docSummons.id, sheriff: "Sheriff — Johannesburg Central", address: "9 Simmonds Street, Johannesburg", status: "SERVED", servedAt: daysFromNow(-198) },
  });
  await prisma.service.create({
    data: { matterId: dube.id, sheriff: "Sheriff — Germiston", address: "125 President Street, Germiston", status: "ASSIGNED" },
  });

  // ── Bundles ─────────────────────────────────────────────────────────────────
  const trialBundle = await prisma.bundle.create({
    data: { matterId: petersen.id, name: "Trial Bundle — Volume 1", description: "Pleadings, notices and correspondence" },
  });
  await prisma.document.update({ where: { id: docPlea.id }, data: { bundleId: trialBundle.id } });
  await prisma.document.update({ where: { id: docAffidavit.id }, data: { bundleId: trialBundle.id } });

  // ── Timeline events ─────────────────────────────────────────────────────────
  await prisma.timelineEvent.createMany({
    data: [
      { matterId: mokwena.id, eventType: "Drafted", title: "Combined summons drafted", details: "Revised particulars of claim annexed.", userId: thabo.id, occurredAt: daysFromNow(-205) },
      { matterId: mokwena.id, eventType: "Filed", title: "Summons issued by Registrar", details: "Case number allocated: 2024/12345.", userId: lerato.id, occurredAt: daysFromNow(-200) },
      { matterId: mokwena.id, eventType: "Served", title: "Served on defendant", details: "Served at Standard Bank's registered office via Sheriff — Johannesburg Central.", userId: lerato.id, occurredAt: daysFromNow(-198) },
      { matterId: mokwena.id, eventType: "Pleadings", title: "Notice of intention to defend received", details: "From attorneys Webber Wentzel.", userId: thabo.id, occurredAt: daysFromNow(-193) },
      { matterId: dube.id, eventType: "Drafted", title: "Statement of claim drafted", details: "", userId: lerato.id, occurredAt: daysFromNow(-90) },
      { matterId: dube.id, eventType: "Filed", title: "Statement of claim filed", details: "Magistrate's Court, Germiston.", userId: lerato.id, occurredAt: daysFromNow(-88) },
      { matterId: petersen.id, eventType: "Filed", title: "Notice of motion filed", details: "High Court, Pretoria — urgent roll.", userId: thabo.id, occurredAt: daysFromNow(-300) },
      { matterId: petersen.id, eventType: "Drafted", title: "Heads of argument drafted", details: "Counsel briefed: Adv K. Ramaphosa SC.", userId: thabo.id, occurredAt: daysFromNow(-10) },
      { matterId: ndlovu.id, eventType: "Drafted", title: "Review application drafted", details: "", userId: thabo.id, occurredAt: daysFromNow(-600) },
      { matterId: ndlovu.id, eventType: "Filed", title: "Review application filed", details: "", userId: lerato.id, occurredAt: daysFromNow(-590) },
      { matterId: ndlovu.id, eventType: "Closed", title: "Matter closed", details: "Order granted with costs on 14 May 2026.", userId: thabo.id, occurredAt: daysFromNow(-90) },
    ],
  });

  // ── Outbox ──────────────────────────────────────────────────────────────────
  await prisma.outbox.createMany({
    data: [
      { matterId: mokwena.id, action: "EFILE", target: "eFiling — Gauteng Local Division", status: "QUEUED", payload: JSON.stringify({ filing: "Combined Summons (revised)", caseNo: "2024/12345" }), queuedAt: daysFromNow(0) },
      { matterId: mokwena.id, action: "SERVE", target: "Sheriff — Johannesburg Central", status: "QUEUED", payload: JSON.stringify({ document: "Amended Particulars of Claim", address: "9 Simmonds Street, Johannesburg" }), queuedAt: daysFromNow(0) },
      { matterId: dube.id, action: "EFILE", target: "eFiling — Magistrate's Court, Germiston", status: "QUEUED", payload: JSON.stringify({ filing: "Plea", caseNo: "15874/2025" }), queuedAt: daysFromNow(-1) },
      { matterId: petersen.id, action: "EMAIL", target: "Counsel — Adv K. Ramaphosa SC", status: "SENT", payload: JSON.stringify({ document: "Heads of argument (final draft)" }), queuedAt: daysFromNow(-2), sentAt: daysFromNow(-2) },
    ],
  });

  // ── Tasks ───────────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      { userId: lerato.id, matterId: mokwena.id, title: "Draft opposing affidavit instructions", description: "Collate client's instructions on the opposing affidavit.", status: "IN_PROGRESS", dueAt: daysFromNow(2) },
      { userId: thabo.id, matterId: dube.id, title: "Approve plea before filing", status: "TODO", dueAt: daysFromNow(1) },
      { userId: lerato.id, matterId: petersen.id, title: "Check trial bundle pagination", status: "TODO", dueAt: daysFromNow(4) },
    ],
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  const [matters, deadlines, openDeadlines, outbox, filings] = await Promise.all([
    prisma.matter.count(),
    prisma.deadline.count(),
    prisma.deadline.count({ where: { status: "OPEN" } }),
    prisma.outbox.count({ where: { status: "QUEUED" } }),
    prisma.filing.count(),
  ]);

  console.log("Seed complete ✓");
  console.log(`  firm:      ${firm.name}`);
  console.log(`  matters:   ${matters}  (${matters} seeded)`);
  console.log(`  deadlines: ${deadlines} total, ${openDeadlines} open`);
  console.log(`  outbox:    ${outbox} queued`);
  console.log(`  filings:   ${filings}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { NAV_ITEMS } from "./nav";
import { CommandBar, openCommandBar } from "./CommandBar";
import { Icon } from "../icons";
import { Kbd } from "../ui";

export function AppShell({
  children,
  pageTitle,
}: {
  children: ReactNode;
  pageTitle?: string;
}) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* ── Left nav ─────────────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
            <Icon name="scale" className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-tight text-slate-900">
              JURIS OS
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Practice OS
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-4 w-4 ${active ? "text-slate-900" : "text-slate-400"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            v0.1 · MVP
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Cloud + offline desktop app
          </p>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="ml-60 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {pageTitle ? (
              <h1 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">
                {pageTitle}
              </h1>
            ) : null}
            {children}
          </div>
        </main>
      </div>

      <CommandBar />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
      {/* Command trigger */}
      <button
        type="button"
        onClick={openCommandBar}
        className="flex w-full max-w-md items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-[13px] text-slate-400 transition-colors hover:border-slate-300 hover:bg-white"
      >
        <Icon name="search" className="h-3.5 w-3.5" />
        <span className="flex-1">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Sync / online status */}
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Online · Synced
        </span>
        <span className="hidden items-center gap-1 text-[11px] text-slate-400 md:inline-flex">
          <Icon name="cloud" className="h-3.5 w-3.5" />
          3 queued
        </span>

        {/* Firm switcher (stub) */}
        <div className="relative">
          <select
            aria-label="Switch firm"
            className="h-8 appearance-none rounded-md border border-slate-200 bg-white pl-2.5 pr-7 text-[12px] font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <option>Nkosi &amp; Partners Inc.</option>
            <option disabled>+ Add firm (later)</option>
          </select>
          <Icon
            name="chevronDown"
            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* Notifications (stub) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <Icon name="bell" className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

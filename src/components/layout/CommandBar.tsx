import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { COMMANDS } from "./nav";
import { Icon } from "../icons";

// Module-level open signal so the TopBar button can trigger the palette
// without a context provider.
let openHandler: (() => void) | null = null;

export function registerCommandOpen(fn: () => void) {
  openHandler = fn;
  return () => {
    openHandler = null;
  };
}

export function openCommandBar() {
  openHandler?.();
}

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  // Register global Cmd+K / Ctrl+K listener.
  useEffect(() => {
    const unregister = registerCommandOpen(() => {
      setQuery("");
      setCursor(0);
      setOpen(true);
    });

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setCursor(0);
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unregister();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const results = COMMANDS.filter(
    (c) =>
      !query ||
      `${c.label} ${c.hint}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => setCursor(0), [query, open]);

  if (!open) return null;

  const run = (index: number) => {
    const cmd = results[index];
    if (!cmd) return;
    setOpen(false);
    if (cmd.to) void navigate({ to: cmd.to });
  };

  const groups = [...new Set(results.map((r) => r.group))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[15vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Icon name="search" className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(cursor);
              }
            }}
            placeholder="Search commands and screens…"
            className="h-11 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[40vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              No matches for “{query}”
            </p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-1">
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group}
                </p>
                {results
                  .filter((r) => r.group === group)
                  .map((cmd) => {
                    const idx = results.indexOf(cmd);
                    const active = idx === cursor;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => run(idx)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] ${
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {cmd.stub ? (
                            <Icon
                              name="sparkles"
                              className={`h-3.5 w-3.5 ${active ? "text-amber-300" : "text-slate-400"}`}
                            />
                          ) : (
                            <Icon
                              name="arrowRight"
                              className={`h-3.5 w-3.5 ${active ? "text-slate-300" : "text-slate-400"}`}
                            />
                          )}
                          {cmd.label}
                        </span>
                        <span
                          className={`text-[11px] ${active ? "text-slate-300" : "text-slate-400"}`}
                        >
                          {cmd.hint}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 px-1">↑</kbd>
            <kbd className="rounded border border-slate-200 px-1">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 px-1">↵</kbd>
            run
          </span>
          <span className="ml-auto">
            Action commands are stubs until Screens 2 & 4 ship.
          </span>
        </footer>
      </div>
    </div>
  );
}

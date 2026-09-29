import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { WalletSlot } from "./wallet-slot";

const LINKS = [
  ["/explore", "Explore"],
  ["/policies", "Policies"],
  ["/opportunities/new", "Sign"],
  ["/activity", "Activity"],
  ["/docs", "Docs"],
  ["/roadmap", "Roadmap"],
] as const;

function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return <img src="/logo.svg" alt="" width={36} height={36} className={className} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="liquid-field" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
      </div>
      <div className="stage">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:bg-cream focus:p-3">
          Skip to content
        </a>
        <header className="sticky top-3 z-20 px-3 sm:px-4">
          <div className="glass-bar desk-wrap flex h-16 items-center gap-3 px-3 sm:px-4">
            <Link to="/" className="press flex min-h-11 items-center gap-2.5" onClick={() => setOpen(false)}>
              <Mark />
              <span className="font-serif text-lg leading-none tracking-tight sm:text-xl">YieldTruth</span>
            </Link>
            <nav aria-label="Primary" className="ml-3 hidden items-center gap-0.5 lg:flex">
              {LINKS.map(([to, label]) => (
                <Link key={to} to={to} preload="intent" className="nav-link" activeProps={{ "data-status": "active" }}>
                  {label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <WalletSlot />
              <button
                type="button"
                className="btn btn-glass min-w-11 px-3 lg:hidden"
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen((value) => !value)}
              >
                {open ? "Close" : "Menu"}
              </button>
            </div>
          </div>
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            data-open={open ? "true" : "false"}
            inert={!open}
            className="mobile-panel desk-wrap lg:hidden"
          >
            <div>
              <div className="sheet mt-2 grid px-2 py-2">
                {LINKS.map(([to, label]) => (
                  <Link
                    key={to}
                    to={to}
                    preload="intent"
                    className="nav-link"
                    activeProps={{ "data-status": "active" }}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </header>
        <main id="content">{children}</main>
        <footer className="mt-16 px-3 pb-6 sm:px-4">
          <div className="glass-bar desk-wrap flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Mark className="h-6 w-6" />
              A high rate is not the same as a trustworthy source.
            </p>
            <div className="flex gap-4">
              <Link to="/docs" className="underline-offset-4 hover:underline">Docs</Link>
              <Link to="/roadmap" className="underline-offset-4 hover:underline">Roadmap</Link>
              <Link to="/methodology" className="underline-offset-4 hover:underline">Method</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export function OriginNote({ origin }: { origin: "fixture" | "chain" }) {
  if (origin === "chain") {
    return <span className="stamp text-canopy">On-chain index</span>;
  }
  return <span className="stamp text-amber">Fixture · not a live reading</span>;
}

export function DecisionMark({ decision }: { decision: string }) {
  const tone = decision === "APPROVED" ? "text-canopy" : decision === "REJECTED" ? "text-rust" : "text-amber";
  const label = decision === "APPROVED" ? "Approved" : decision === "REJECTED" ? "Rejected" : "Needs review";
  return <span className={`stamp ${tone}`}>{label}</span>;
}

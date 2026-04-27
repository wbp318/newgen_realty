"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCountyPortals } from "@/lib/api";
import type { PortalEntry } from "@/lib/types";

const STATE_LABELS: Record<string, string> = {
  LA: "Louisiana",
  AR: "Arkansas",
  MS: "Mississippi",
};

export default function PortalsPage() {
  const [portals, setPortals] = useState<PortalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    getCountyPortals()
      .then((r) => setPortals(r.data.portals))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const out: Record<string, PortalEntry[]> = { LA: [], AR: [], MS: [] };
    for (const p of portals) {
      if (out[p.state]) out[p.state].push(p);
    }
    return out;
  }, [portals]);

  const matchesFilter = (p: PortalEntry) =>
    !filter ||
    p.label.toLowerCase().includes(filter.toLowerCase()) ||
    p.county_or_parish.toLowerCase().includes(filter.toLowerCase());

  return (
    <div className="max-w-[1100px] mx-auto">
      <header className="mb-6">
        <Link href="/" className="link text-xs">
          ← Dashboard
        </Link>
        <h1 className="font-display text-4xl text-text mt-3">Public Record Portals</h1>
        <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--text-soft)" }}>
          A directory of free assessor and chancery clerk portals across LA, AR, and MS.
          For agents without an ATTOM subscription — click through and do the lookup
          manually. ATTOM remains the right answer for bulk discovery; this is the free path.
        </p>
      </header>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by parish or county name…"
        className="field w-full mb-6"
      />

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-faded)" }}>Loading…</p>
      ) : (
        <div className="space-y-8">
          {(["LA", "AR", "MS"] as const).map((state) => {
            const list = grouped[state].filter(matchesFilter);
            if (list.length === 0) return null;
            return (
              <section key={state}>
                <h2 className="font-display text-2xl text-text mb-3">
                  {STATE_LABELS[state]}{" "}
                  <span className="text-sm font-sans" style={{ color: "var(--text-faded)" }}>
                    {state} · {list.length}
                  </span>
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {list.map((p) => (
                    <li key={`${p.state}-${p.county_or_parish}-${p.url}`}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="panel panel-hover block p-4 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-text">{p.label}</p>
                          <span
                            className="tag text-[0.6rem]"
                            style={{
                              color: p.type === "umbrella" ? "var(--accent)" : "var(--text-faded)",
                              borderColor: p.type === "umbrella" ? "var(--accent)" : "var(--border)",
                            }}
                          >
                            {p.type}
                          </span>
                        </div>
                        <p className="text-xs mt-1 truncate" style={{ color: "var(--text-soft)" }}>
                          {p.url}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs" style={{ color: "var(--text-faded)" }}>
        Tip: When you find a useful portal that&apos;s missing here, add it to{" "}
        <code className="font-mono">backend/app/services/county_data.py</code>.
      </p>
    </div>
  );
}

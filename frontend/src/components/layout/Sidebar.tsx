"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",          label: "Atlas",         folio: "i"   },
  { href: "/map",       label: "Farm Map",      folio: "ii"  },
  { href: "/properties",label: "Properties",    folio: "iii" },
  { href: "/contacts",  label: "Contacts",      folio: "iv"  },
  { href: "/prospects", label: "Prospects",     folio: "v"   },
  { href: "/outreach",  label: "Outreach",      folio: "vi"  },
  { href: "/ai",        label: "AI Assistant",  folio: "vii" },
];

function CompassRose({ size = 56 }: { size?: number }) {
  // Simple inline compass — N pointer in oxblood, four cardinal arms in ink
  const half = size / 2;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="text-ink">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.35" />
      {/* horizontal & vertical hairlines */}
      <line x1="4"  y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="0.4" opacity="0.35" />
      <line x1="50" y1="4"  x2="50" y2="96" stroke="currentColor" strokeWidth="0.4" opacity="0.35" />
      {/* 4 main arms */}
      <polygon points="50,8 54,50 50,46 46,50" fill="var(--oxblood)" />
      <polygon points="50,92 54,50 50,54 46,50" fill="currentColor" />
      <polygon points="8,50 50,46 46,50 50,54" fill="currentColor" opacity="0.7" />
      <polygon points="92,50 50,46 54,50 50,54" fill="currentColor" opacity="0.7" />
      <circle cx="50" cy="50" r="2.4" fill="var(--oxblood)" />
      <text x={half} y="14" textAnchor="middle" fontFamily="var(--font-display)" fontSize="9" fill="var(--oxblood)">N</text>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-72 h-screen sticky top-0 self-start flex flex-col paper-grain-soft overflow-y-auto"
      style={{
        background: "var(--parchment-deep)",
        borderRight: "1px solid var(--parchment-edge)",
      }}
    >
      {/* Header / wordmark */}
      <div className="px-7 pt-9 pb-6 relative">
        {/* faint topographic medallion behind the wordmark */}
        <div className="absolute inset-0 topo-bg opacity-60 pointer-events-none" />
        <div className="relative">
          <p className="stamp mb-3">Office of the Cartographer</p>
          <h1 className="font-display text-3xl leading-none text-ink">
            NewGen
            <br />
            <span style={{ color: "var(--oxblood)" }}>Realty</span>
          </h1>
          <p className="mt-3 text-xs font-mono tracking-widest uppercase" style={{ color: "var(--ink-faded)" }}>
            Est. 2026 · LA · AR · MS
          </p>
        </div>
      </div>

      {/* Decorative rule */}
      <div className="px-7 mb-2">
        <div className="rule-fleuron"><span>✦</span></div>
      </div>

      {/* Section eyebrow */}
      <p className="px-7 stamp-ink mb-3">Table of Contents</p>

      {/* Nav — leader dots + folio numbers */}
      <nav className="px-7 flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group block py-2 transition-colors"
                  style={{
                    color: isActive ? "var(--oxblood)" : "var(--ink)",
                  }}
                >
                  <div className="toc-row">
                    <span
                      className={`font-display text-lg ${isActive ? "" : "group-hover:translate-x-0.5"} transition-transform`}
                    >
                      {isActive && (
                        <span className="inline-block mr-2" style={{ color: "var(--oxblood)" }}>
                          ❦
                        </span>
                      )}
                      {item.label}
                    </span>
                    <span className="toc-leader" />
                    <span className="font-mono text-[0.7rem] tracking-widest" style={{ color: "var(--ink-faded)" }}>
                      {item.folio}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer with compass rose */}
      <div className="px-7 pb-7 pt-5 mt-4 relative">
        <div className="rule-fleuron mb-5"><span>✦</span></div>
        <div className="flex items-end justify-between">
          <div className="text-[0.65rem] font-mono uppercase tracking-widest leading-relaxed" style={{ color: "var(--ink-faded)" }}>
            Sheet I of VII<br />
            v0.2 · Folio
          </div>
          <CompassRose size={52} />
        </div>
      </div>
    </aside>
  );
}

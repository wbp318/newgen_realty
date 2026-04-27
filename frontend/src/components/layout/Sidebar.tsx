"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",          label: "Dashboard"     },
  { href: "/map",       label: "Farm Map"      },
  { href: "/properties",label: "Properties"    },
  { href: "/contacts",  label: "Contacts"      },
  { href: "/prospects", label: "Prospects"     },
  { href: "/outreach",  label: "Outreach"      },
  { href: "/ai",        label: "AI Assistant"  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 h-screen sticky top-0 self-start flex flex-col"
      style={{
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Wordmark */}
      <div className="px-6 pt-7 pb-6">
        <h1 className="font-display text-2xl text-text leading-none">
          NewGen <span style={{ color: "var(--accent)" }}>Realty</span>
        </h1>
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-faded)" }}>
          AI Real Estate · LA · AR · MS
        </p>
      </div>

      <div className="hairline mx-6 mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm transition-colors"
                  style={{
                    color: isActive ? "var(--text)" : "var(--text-soft)",
                    background: isActive ? "rgba(16, 185, 129, 0.10)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    paddingLeft: isActive ? "0.625rem" : "0.75rem",
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-4 text-xs" style={{ color: "var(--text-faded)" }}>
        v0.2
      </div>
    </aside>
  );
}

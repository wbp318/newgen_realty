"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/ai", label: "AI Assistant", icon: "🤖" },
  { href: "/properties", label: "Properties", icon: "🏠" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/prospects", label: "Prospects", icon: "🎯" },
  { href: "/outreach", label: "Outreach", icon: "📬" },
  { href: "/map", label: "Farm Map", icon: "🗺️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-400">NewGen Realty</h1>
        <p className="text-xs text-gray-400 mt-1">AI-Powered Real Estate</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 border-t border-gray-700 text-xs text-gray-500">
        LA &bull; AR &bull; MS &bull; NewGen Realty AI v0.2
      </div>
    </aside>
  );
}

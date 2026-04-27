"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProperties, getContacts, getActivities, getDashboardInsights, getProspects, getOutreachCampaigns } from "@/lib/api";
import type { Property, Contact, Activity, DashboardInsights, Prospect, OutreachCampaign } from "@/lib/types";

export default function Dashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    activeListings: 0,
    contacts: 0,
    leads: 0,
    portfolioValue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [hotLeads, setHotLeads] = useState<Contact[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [prospectStats, setProspectStats] = useState<Record<string, number>>({});
  const [topProspects, setTopProspects] = useState<Prospect[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<OutreachCampaign[]>([]);

  useEffect(() => {
    loadDashboard();
    loadProspectData();
  }, []);

  async function loadDashboard() {
    try {
      const [propsRes, contactsRes, activitiesRes] = await Promise.all([
        getProperties(),
        getContacts(),
        getActivities({ limit: "10" }),
      ]);
      const props: Property[] = propsRes.data;
      const contacts: Contact[] = contactsRes.data;

      const activeProps = props.filter((p) => p.status === "active");
      setStats({
        properties: props.length,
        activeListings: activeProps.length,
        contacts: contacts.length,
        leads: contacts.filter((c) => c.contact_type === "lead").length,
        portfolioValue: activeProps.reduce((sum, p) => sum + (p.asking_price || 0), 0),
      });

      setRecentActivity(activitiesRes.data);

      const scored = contacts
        .filter((c) => c.ai_lead_score !== null && c.ai_lead_score! >= 60)
        .sort((a, b) => (b.ai_lead_score || 0) - (a.ai_lead_score || 0));
      setHotLeads(scored.slice(0, 5));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }

  async function loadProspectData() {
    try {
      const [prospectsRes, campaignsRes] = await Promise.all([
        getProspects({ limit: 200 }),
        getOutreachCampaigns(),
      ]);
      const prospects: Prospect[] = prospectsRes.data;
      const campaigns: OutreachCampaign[] = campaignsRes.data;

      const pipeline: Record<string, number> = {};
      for (const p of prospects) {
        pipeline[p.status] = (pipeline[p.status] || 0) + 1;
      }
      setProspectStats(pipeline);

      const uncontacted = prospects
        .filter((p) => p.ai_prospect_score !== null && p.status !== "contacted" && p.status !== "converted" && p.status !== "do_not_contact")
        .sort((a, b) => (b.ai_prospect_score || 0) - (a.ai_prospect_score || 0));
      setTopProspects(uncontacted.slice(0, 5));

      setActiveCampaigns(campaigns.filter((c) => c.status === "active" || c.status === "draft"));
    } catch {
      // Prospects may not be loaded yet
    }
  }

  async function handleGetInsights() {
    setLoadingInsights(true);
    try {
      const res = await getDashboardInsights();
      setInsights(res.data);
    } catch {
      alert("Error getting insights. Make sure you have properties and contacts.");
    } finally {
      setLoadingInsights(false);
    }
  }

  const statCards = [
    { label: "Properties on file",  value: stats.properties,    folio: "01" },
    { label: "Active listings",     value: stats.activeListings,folio: "02" },
    { label: "Contacts on roll",    value: stats.contacts,      folio: "03" },
    { label: "Open leads",          value: stats.leads,         folio: "04" },
  ];

  const formatMoney = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Editorial masthead */}
      <header className="mb-12">
        <div className="flex items-end justify-between mb-3">
          <p className="stamp">Vol. I · Atlas of the Gulf South</p>
          <p className="stamp-ink">{today}</p>
        </div>
        <h1 className="font-display text-7xl leading-[0.95] text-ink mb-4">
          The Survey Desk
        </h1>
        <div className="flex items-end justify-between border-t border-ink/15 pt-3">
          <p className="text-lg italic" style={{ color: "var(--ink-soft)" }}>
            A daily account of land, leads, and outreach across Louisiana, Arkansas, and Mississippi.
          </p>
          <p className="font-mono text-xs tracking-wider" style={{ color: "var(--ink-faded)" }}>
            FOLIO 01
          </p>
        </div>
      </header>

      {/* Stats Row — four narrow cards + a wide portfolio ledger */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
        {statCards.map((card) => (
          <div key={card.label} className="panel panel-shadow corner-ornaments p-5 lg:col-span-1">
            <span className="corner-tr" />
            <span className="corner-bl" />
            <p className="font-mono text-[0.65rem] tracking-widest uppercase mb-3" style={{ color: "var(--ink-faded)" }}>
              {card.folio}
            </p>
            <p className="font-display text-5xl leading-none text-ink">
              {card.value}
            </p>
            <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
              {card.label}
            </p>
          </div>
        ))}
        <div
          className="panel panel-shadow corner-ornaments p-5 lg:col-span-2 relative overflow-hidden"
          style={{ background: "var(--ink)", color: "var(--parchment)", borderColor: "var(--ink)" }}
        >
          <span className="corner-tr" style={{ borderColor: "var(--parchment-edge)", opacity: 0.4 }} />
          <span className="corner-bl" style={{ borderColor: "var(--parchment-edge)", opacity: 0.4 }} />
          <p className="font-mono text-[0.65rem] tracking-widest uppercase mb-3" style={{ color: "var(--kraft)" }}>
            Ledger · 05
          </p>
          <p className="font-display text-5xl leading-none">
            <span style={{ color: "var(--oxblood)" }}>$</span>
            {stats.portfolioValue >= 1_000_000
              ? `${(stats.portfolioValue / 1_000_000).toFixed(2)}M`
              : stats.portfolioValue.toLocaleString()}
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--kraft)" }}>
            Portfolio value at asking
          </p>
        </div>
      </section>

      {/* AI Insights */}
      <section className="panel panel-shadow corner-ornaments p-7 mb-10 relative">
        <span className="corner-tr" />
        <span className="corner-bl" />
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="stamp mb-1">Field Notes</p>
            <h2 className="font-display text-3xl text-ink">From the Cartographer&apos;s Desk</h2>
          </div>
          <button onClick={handleGetInsights} disabled={loadingInsights} className="btn-ink">
            {loadingInsights ? "Surveying…" : insights ? "Resurvey" : "Compile Notes"}
          </button>
        </div>
        {insights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
            {[
              { title: "Observations",    items: insights.insights,      mark: "✣", color: "var(--ink)" },
              { title: "Action Items",    items: insights.actions,        mark: "❀", color: "var(--oxblood)" },
              { title: "Opportunities",   items: insights.opportunities, mark: "✤", color: "var(--survey-green)" },
            ].map((col) => (
              <div key={col.title}>
                <p className="font-mono text-[0.65rem] tracking-widest uppercase mb-3" style={{ color: col.color }}>
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                      <span style={{ color: col.color }} className="flex-shrink-0">{col.mark}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: "var(--ink-faded)" }}>
            Press <span className="font-mono not-italic">Compile Notes</span> for an AI-drawn survey of your portfolio, leads, and outstanding action.
          </p>
        )}
      </section>

      {/* Prospect Pipeline — stylized as a depth-of-field gauge */}
      {Object.keys(prospectStats).length > 0 && (
        <section className="panel panel-shadow corner-ornaments p-7 mb-10 relative">
          <span className="corner-tr" />
          <span className="corner-bl" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="stamp mb-1">Sounding Line</p>
              <h2 className="font-display text-3xl text-ink">Prospect Pipeline</h2>
            </div>
            <Link href="/prospects" className="btn-ghost">View Roll</Link>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {[
              { key: "new",         label: "New",         color: "var(--slate-blue)" },
              { key: "researching", label: "Researching", color: "var(--gold)" },
              { key: "qualified",   label: "Qualified",   color: "var(--oxblood)" },
              { key: "contacted",   label: "Contacted",   color: "var(--survey-green)" },
              { key: "responding",  label: "Responding",  color: "var(--survey-green-soft)" },
              { key: "converted",   label: "Converted",   color: "var(--ink)" },
            ].map((stage) => {
              const count = prospectStats[stage.key] || 0;
              const total = Object.values(prospectStats).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={stage.key} className="flex flex-col items-center text-center">
                  <p className="font-display text-4xl text-ink leading-none">{count}</p>
                  <p className="font-mono text-[0.65rem] tracking-widest uppercase mt-2 mb-3" style={{ color: "var(--ink-faded)" }}>
                    {stage.label}
                  </p>
                  <div className="w-full h-1.5 relative" style={{ background: "var(--parchment)" }}>
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Three-up: Top Prospects · Campaigns · Hot Leads */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Panel title="Top Prospects" eyebrow="Plat Book" link={{ href: "/prospects/search", label: "Search" }}>
          {topProspects.length > 0 ? (
            <ul className="space-y-3">
              {topProspects.map((p) => {
                const typeLabels: Record<string, string> = {
                  absentee_owner: "Absentee", pre_foreclosure: "Pre-Foreclosure", probate: "Probate",
                  long_term_owner: "Long-Term", vacant: "Vacant", tax_delinquent: "Tax Delinquent",
                  fsbo: "FSBO", expired_listing: "Expired",
                };
                const score = p.ai_prospect_score || 0;
                const scoreColor =
                  score >= 80 ? "var(--oxblood)" :
                  score >= 60 ? "var(--gold)" :
                  score >= 40 ? "var(--slate-blue)" :
                  "var(--ink-faded)";
                return (
                  <li key={p.id}>
                    <Link href={`/prospects/${p.id}`} className="block group py-2 px-3 -mx-3 transition-colors hover:bg-[var(--parchment)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-display text-base text-ink truncate">
                          {p.first_name || p.last_name ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown owner"}
                        </p>
                        <span className="font-mono text-sm" style={{ color: scoreColor }}>
                          {Math.round(score).toString().padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[0.7rem] font-mono uppercase tracking-wider" style={{ color: "var(--ink-faded)" }}>
                        <span>{typeLabels[p.prospect_type] || p.prospect_type}</span>
                        <span>·</span>
                        <span className="truncate">{p.property_city}, {p.property_state}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--ink-faded)" }}>
              Score prospects to populate this register.
            </p>
          )}
        </Panel>

        <Panel title="Campaigns" eyebrow="Dispatch" link={{ href: "/outreach", label: "View all" }}>
          {activeCampaigns.length > 0 ? (
            <ul className="space-y-3">
              {activeCampaigns.map((c) => (
                <li key={c.id}>
                  <Link href={`/outreach/${c.id}`} className="block group py-2 px-3 -mx-3 transition-colors hover:bg-[var(--parchment)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-display text-base text-ink truncate">{c.name}</p>
                      <span
                        className="tag"
                        style={{
                          color: c.status === "active" ? "var(--survey-green)" : "var(--ink-faded)",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[0.7rem] font-mono uppercase tracking-wider" style={{ color: "var(--ink-faded)" }}>
                      <span>{c.total_messages} msgs</span>
                      <span>·</span>
                      <span>{c.sent_count} sent</span>
                      {c.replied_count > 0 && (
                        <>
                          <span>·</span>
                          <span style={{ color: "var(--oxblood)" }}>{c.replied_count} replies</span>
                        </>
                      )}
                    </div>
                    {c.total_messages > 0 && (
                      <div className="mt-2 h-px relative" style={{ background: "var(--parchment-edge)" }}>
                        <div
                          className="absolute inset-y-0 left-0 -top-px h-0.5"
                          style={{
                            width: `${Math.min((c.sent_count / c.total_messages) * 100, 100)}%`,
                            background: "var(--oxblood)",
                          }}
                        />
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--ink-faded)" }}>
              <Link href="/outreach" className="link not-italic">Open a campaign</Link> to begin dispatch.
            </p>
          )}
        </Panel>

        <Panel title="Hot Leads" eyebrow="Day Book">
          {hotLeads.length > 0 ? (
            <ul className="space-y-3">
              {hotLeads.map((c) => {
                const score = c.ai_lead_score || 0;
                const scoreColor =
                  score >= 80 ? "var(--oxblood)" :
                  score >= 60 ? "var(--gold)" :
                  "var(--ink-faded)";
                return (
                  <li key={c.id}>
                    <Link href={`/contacts/${c.id}`} className="block group py-2 px-3 -mx-3 transition-colors hover:bg-[var(--parchment)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-display text-base text-ink">
                          {c.first_name} {c.last_name}
                        </p>
                        <span className="font-mono text-sm" style={{ color: scoreColor }}>
                          {Math.round(score).toString().padStart(2, "0")}
                        </span>
                      </div>
                      <div className="text-[0.7rem] font-mono uppercase tracking-wider" style={{ color: "var(--ink-faded)" }}>
                        {c.preferred_parishes?.slice(0, 2).join(" · ") || "No parish/county pref"}
                        {c.budget_max ? ` · up to ${formatMoney(c.budget_max)}` : ""}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--ink-faded)" }}>
              No hot leads yet. Score contacts to populate this column.
            </p>
          )}
        </Panel>
      </section>

      {/* Recent Activity */}
      <section className="mb-10">
        <Panel title="Day Book" eyebrow="Logged Entries">
          {recentActivity.length > 0 ? (
            <ul className="divide-y" style={{ borderColor: "var(--parchment-edge)" }}>
              {recentActivity.map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-baseline gap-4">
                  <span className="font-mono text-[0.7rem] tracking-widest uppercase whitespace-nowrap" style={{ color: "var(--ink-faded)" }}>
                    {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                    {" · "}
                    {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-mono text-[0.7rem] tracking-widest uppercase" style={{ color: "var(--oxblood)" }}>
                    {a.activity_type.replace("_", " ")}
                  </span>
                  <span className="text-sm flex-1" style={{ color: "var(--ink)" }}>{a.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--ink-faded)" }}>
              No entries yet. Activity will be logged here as you work.
            </p>
          )}
        </Panel>
      </section>

      {/* Quick Actions — three big plates */}
      <section className="mb-6">
        <div className="rule-fleuron mb-6"><span>✦</span></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionPlate
            href="/prospects/search"
            stamp="Survey"
            title="Find Prospects"
            description="Search ATTOM public records for motivated sellers — absentee owners, pre-foreclosures, probate, and tax-delinquent."
          />
          <ActionPlate
            href="/ai"
            stamp="Atelier"
            title="Open the AI Assistant"
            description="Generate listings, analyze comps, and draft communications with a Gulf-South-aware AI."
            accent
          />
          <ActionPlate
            href="/properties/new"
            stamp="Register"
            title="Add a Property"
            description="Record a new property to the atlas. AI helps draft listings and suggests pricing."
          />
        </div>
      </section>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  link,
  children,
}: {
  title: string;
  eyebrow: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="panel panel-shadow corner-ornaments p-6 relative">
      <span className="corner-tr" />
      <span className="corner-bl" />
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="stamp mb-1">{eyebrow}</p>
          <h3 className="font-display text-2xl text-ink">{title}</h3>
        </div>
        {link && (
          <Link href={link.href} className="font-mono text-[0.7rem] tracking-widest uppercase hover:underline" style={{ color: "var(--oxblood)" }}>
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function ActionPlate({
  href,
  stamp,
  title,
  description,
  accent = false,
}: {
  href: string;
  stamp: string;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="panel panel-shadow corner-ornaments p-7 block transition-all hover:-translate-y-0.5 relative group"
      style={
        accent
          ? { background: "var(--ink)", color: "var(--parchment)", borderColor: "var(--ink)" }
          : undefined
      }
    >
      <span className="corner-tr" style={accent ? { borderColor: "var(--parchment-edge)", opacity: 0.4 } : undefined} />
      <span className="corner-bl" style={accent ? { borderColor: "var(--parchment-edge)", opacity: 0.4 } : undefined} />
      <p className={accent ? "font-mono text-[0.65rem] tracking-widest uppercase mb-3" : "stamp mb-3"}
         style={accent ? { color: "var(--oxblood)" } : undefined}>
        {stamp}
      </p>
      <h3 className="font-display text-2xl mb-2 leading-tight"
          style={accent ? { color: "var(--parchment)" } : { color: "var(--ink)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed"
         style={accent ? { color: "var(--kraft)" } : { color: "var(--ink-soft)" }}>
        {description}
      </p>
      <span className="mt-4 inline-block font-mono text-[0.7rem] tracking-widest uppercase group-hover:translate-x-1 transition-transform"
            style={accent ? { color: "var(--oxblood)" } : { color: "var(--oxblood)" }}>
        Open →
      </span>
    </Link>
  );
}

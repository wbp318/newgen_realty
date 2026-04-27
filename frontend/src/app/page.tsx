"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProperties, getContacts, getActivities, getDashboardInsights, getProspects, getOutreachCampaigns, getIntegrationsStatus } from "@/lib/api";
import type { Property, Contact, Activity, DashboardInsights, Prospect, OutreachCampaign, IntegrationsStatusResponse } from "@/lib/types";

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
  const [integrations, setIntegrations] = useState<IntegrationsStatusResponse | null>(null);

  useEffect(() => {
    loadDashboard();
    loadProspectData();
    getIntegrationsStatus().then((r) => setIntegrations(r.data)).catch(() => {});
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
    { label: "Properties",        value: stats.properties        },
    { label: "Active listings",   value: stats.activeListings    },
    { label: "Contacts",          value: stats.contacts          },
    { label: "Open leads",        value: stats.leads             },
  ];

  const formatMoney = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="font-display text-4xl text-text">Dashboard</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-soft)" }}>
          AI-powered prospecting, CRM, and outreach for LA, AR, and MS.
        </p>
      </header>

      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="panel p-5">
            <p className="text-3xl font-medium text-text">{card.value}</p>
            <p className="mt-2 text-xs" style={{ color: "var(--text-soft)" }}>{card.label}</p>
          </div>
        ))}
        <div className="panel p-5">
          <p className="text-3xl font-medium" style={{ color: "var(--accent)" }}>
            {formatMoney(stats.portfolioValue)}
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--text-soft)" }}>Portfolio value</p>
        </div>
      </section>

      {/* AI Insights */}
      <section className="panel p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-display text-2xl text-text">AI Insights</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>
              Analysis of your portfolio and pipeline.
            </p>
          </div>
          <button onClick={handleGetInsights} disabled={loadingInsights} className="btn-primary">
            {loadingInsights ? "Analyzing…" : insights ? "Refresh" : "Generate"}
          </button>
        </div>
        {insights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {[
              { title: "Observations",  items: insights.insights,      color: "var(--info)" },
              { title: "Action items",  items: insights.actions,        color: "var(--accent)" },
              { title: "Opportunities", items: insights.opportunities, color: "var(--warm)" },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-medium mb-3" style={{ color: col.color }}>{col.title}</p>
                <ul className="space-y-2">
                  {col.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
                      <span style={{ color: col.color }} className="flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-faded)" }}>
            Click <span className="font-medium">Generate</span> for an AI-powered analysis.
          </p>
        )}
      </section>

      {/* Pipeline */}
      {Object.keys(prospectStats).length > 0 && (
        <section className="panel p-6 mb-8">
          <div className="flex justify-between items-start mb-5">
            <h2 className="font-display text-2xl text-text">Prospect Pipeline</h2>
            <Link href="/prospects" className="link text-sm">View all →</Link>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {[
              { key: "new",         label: "New",         color: "var(--info)" },
              { key: "researching", label: "Researching", color: "var(--purple)" },
              { key: "qualified",   label: "Qualified",   color: "var(--warm)" },
              { key: "contacted",   label: "Contacted",   color: "var(--accent)" },
              { key: "responding",  label: "Responding",  color: "var(--accent-soft)" },
              { key: "converted",   label: "Converted",   color: "var(--cool)" },
            ].map((stage) => {
              const count = prospectStats[stage.key] || 0;
              const total = Object.values(prospectStats).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={stage.key}>
                  <p className="text-2xl font-medium text-text leading-none">{count}</p>
                  <p className="text-xs mt-1.5 mb-2" style={{ color: "var(--text-soft)" }}>{stage.label}</p>
                  <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
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

      {/* 3-up: Top Prospects · Campaigns · Hot Leads */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Panel title="Top Prospects" link={{ href: "/prospects/search", label: "Search" }}>
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
                  score >= 80 ? "var(--hot)" :
                  score >= 60 ? "var(--warm)" :
                  score >= 40 ? "var(--cool)" :
                  "var(--text-faded)";
                return (
                  <li key={p.id}>
                    <Link href={`/prospects/${p.id}`} className="block py-1.5 px-2 -mx-2 rounded transition-colors hover:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-text truncate">
                          {p.first_name || p.last_name ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown"}
                        </p>
                        <span className="text-sm font-medium" style={{ color: scoreColor }}>
                          {Math.round(score)}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-faded)" }}>
                        {typeLabels[p.prospect_type] || p.prospect_type} · {p.property_city}, {p.property_state}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-faded)" }}>Score prospects to see them here.</p>
          )}
        </Panel>

        <Panel title="Active Campaigns" link={{ href: "/outreach", label: "View all" }}>
          {activeCampaigns.length > 0 ? (
            <ul className="space-y-3">
              {activeCampaigns.map((c) => (
                <li key={c.id}>
                  <Link href={`/outreach/${c.id}`} className="block py-1.5 px-2 -mx-2 rounded transition-colors hover:bg-white/[0.03]">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-text truncate">{c.name}</p>
                      <span
                        className="tag text-[0.65rem]"
                        style={{
                          color: c.status === "active" ? "var(--accent)" : "var(--text-faded)",
                          borderColor: c.status === "active" ? "var(--accent-deep)" : "var(--border)",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs" style={{ color: "var(--text-faded)" }}>
                      <span>{c.total_messages} msgs</span>
                      <span>{c.sent_count} sent</span>
                      {c.replied_count > 0 && <span style={{ color: "var(--accent)" }}>{c.replied_count} replies</span>}
                    </div>
                    {c.total_messages > 0 && (
                      <div className="mt-2 h-0.5 rounded-full" style={{ background: "var(--border)" }}>
                        <div
                          className="h-0.5 rounded-full"
                          style={{
                            width: `${Math.min((c.sent_count / c.total_messages) * 100, 100)}%`,
                            background: "var(--accent)",
                          }}
                        />
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-faded)" }}>
              <Link href="/outreach" className="link">Create a campaign</Link> to start outreach.
            </p>
          )}
        </Panel>

        <Panel title="Hot Leads">
          {hotLeads.length > 0 ? (
            <ul className="space-y-3">
              {hotLeads.map((c) => {
                const score = c.ai_lead_score || 0;
                const scoreColor =
                  score >= 80 ? "var(--hot)" :
                  score >= 60 ? "var(--warm)" :
                  "var(--text-faded)";
                return (
                  <li key={c.id}>
                    <Link href={`/contacts/${c.id}`} className="block py-1.5 px-2 -mx-2 rounded transition-colors hover:bg-white/[0.03]">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-text">
                          {c.first_name} {c.last_name}
                        </p>
                        <span className="text-sm font-medium" style={{ color: scoreColor }}>
                          {Math.round(score)}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-faded)" }}>
                        {c.preferred_parishes?.slice(0, 2).join(", ") || "No parish/county pref"}
                        {c.budget_max ? ` · up to ${formatMoney(c.budget_max)}` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-faded)" }}>Score contacts to see hot leads.</p>
          )}
        </Panel>
      </section>

      {/* Integrations & Data Sources */}
      {integrations && (
        <section className="panel p-6 mb-8">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="font-display text-2xl text-text">Data Sources</h2>
              <p className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>
                {integrations.summary.configured} of {integrations.summary.total} configured.
                Free sources work today; paid sources unlock more on demand.
              </p>
            </div>
            <Link href="/portals" className="link text-xs">
              County portals →
            </Link>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrations.integrations.map((i) => {
              const tierColor =
                i.tier === "core"      ? "var(--info)" :
                i.tier === "free"      ? "var(--accent)" :
                i.tier === "free-tier" ? "var(--warm)" :
                "var(--text-faded)";
              return (
                <li
                  key={i.key}
                  className="flex items-start gap-3 px-3 py-2.5 rounded"
                  style={{ background: i.configured ? "rgba(16, 185, 129, 0.06)" : "transparent", border: "1px solid var(--border-soft)" }}
                >
                  <span
                    className="mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: i.configured ? "var(--accent)" : "var(--text-faded)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-medium text-text">{i.name}</p>
                      <span className="tag text-[0.6rem]" style={{ color: tierColor, borderColor: tierColor, opacity: 0.85 }}>
                        {i.tier}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                      {i.unlocks}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-faded)" }}>
                      {i.cost_note}
                      {!i.configured && i.where_to_get && (
                        <>
                          {" · "}
                          <a
                            href={i.where_to_get}
                            target="_blank"
                            rel="noreferrer"
                            className="link"
                          >
                            Get a key →
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Recent Activity */}
      <section className="panel p-6 mb-8">
        <h2 className="font-display text-2xl text-text mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
            {recentActivity.map((a) => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-baseline gap-4">
                <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-faded)" }}>
                  {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                  {" · "}
                  {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                  {a.activity_type.replace("_", " ")}
                </span>
                <span className="text-sm flex-1 text-text">{a.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-faded)" }}>No recent activity yet.</p>
        )}
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionPlate
          href="/prospects/search"
          title="Find Prospects"
          description="Search ATTOM for absentee owners, pre-foreclosures, probate, and tax-delinquent."
        />
        <ActionPlate
          href="/ai"
          title="AI Assistant"
          description="Generate listings, analyze comps, and draft communications."
        />
        <ActionPlate
          href="/properties/new"
          title="Add a Property"
          description="Record a new listing. AI helps draft and price it."
        />
      </section>
    </div>
  );
}

function Panel({
  title,
  link,
  children,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-lg text-text">{title}</h3>
        {link && (
          <Link href={link.href} className="link text-xs">
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
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="panel panel-hover p-6 block transition-all group">
      <h3 className="font-display text-xl text-text mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
        {description}
      </p>
      <span className="mt-3 inline-block text-sm group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--accent)" }}>
        Open →
      </span>
    </Link>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProperties, getContacts, getActivities, getDashboardInsights } from "@/lib/api";
import type { Property, Contact, Activity, DashboardInsights } from "@/lib/types";
import LeadScoreBadge from "@/components/ui/LeadScoreBadge";

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

  useEffect(() => {
    loadDashboard();
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

      // Hot leads = contacts with score >= 60, sorted by score
      const scored = contacts
        .filter((c) => c.ai_lead_score !== null && c.ai_lead_score! >= 60)
        .sort((a, b) => (b.ai_lead_score || 0) - (a.ai_lead_score || 0));
      setHotLeads(scored.slice(0, 5));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
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
    { label: "Total Properties", value: stats.properties, color: "bg-blue-500" },
    { label: "Active Listings", value: stats.activeListings, color: "bg-emerald-500" },
    { label: "Total Contacts", value: stats.contacts, color: "bg-purple-500" },
    { label: "Open Leads", value: stats.leads, color: "bg-amber-500" },
  ];

  const activityIcons: Record<string, string> = {
    call: "📞", email: "📧", text: "💬", showing: "🏠", meeting: "🤝",
    note: "📝", ai_action: "🤖", status_change: "🔄", offer: "💰",
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome to NewGen Realty AI</p>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white font-bold text-lg mb-3`}>
              {card.value}
            </div>
            <p className="text-gray-600 text-sm">{card.label}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-2xl font-bold text-emerald-600 mb-3">${stats.portfolioValue.toLocaleString()}</p>
          <p className="text-gray-600 text-sm">Portfolio Value</p>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-emerald-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">AI Insights</h2>
          <button
            onClick={handleGetInsights}
            disabled={loadingInsights}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm"
          >
            {loadingInsights ? "Analyzing..." : insights ? "Refresh Insights" : "Generate Insights"}
          </button>
        </div>
        {insights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Market Observations</h3>
              <ul className="space-y-1">
                {insights.insights.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-emerald-500 flex-shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Action Items</h3>
              <ul className="space-y-1">
                {insights.actions.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Opportunities</h3>
              <ul className="space-y-1">
                {insights.opportunities.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-blue-500 flex-shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Click Generate Insights to get AI-powered analysis of your portfolio.</p>
        )}
      </div>

      {/* Two Column: Hot Leads + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Hot Leads */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hot Leads</h2>
          {hotLeads.length > 0 ? (
            <div className="space-y-3">
              {hotLeads.map((c) => (
                <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 -mx-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-gray-500">
                      {c.preferred_parishes?.slice(0, 2).join(", ") || "No parish pref"}
                      {c.budget_max ? ` · up to $${c.budget_max.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <LeadScoreBadge score={c.ai_lead_score} size="sm" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No hot leads yet. Score your contacts to see them here.</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <span className="text-lg">{activityIcons[a.activity_type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No recent activity. Activities will appear here as you work.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/ai" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-emerald-100 hover:border-emerald-300">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Assistant</h2>
          <p className="text-gray-500">Chat with your AI real estate assistant. Generate listings, analyze comps, draft communications, and get Louisiana-specific advice.</p>
        </Link>
        <Link href="/properties/new" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-blue-100 hover:border-blue-300">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Property</h2>
          <p className="text-gray-500">Enter a new property listing. The AI will help generate descriptions and suggest pricing.</p>
        </Link>
      </div>
    </div>
  );
}

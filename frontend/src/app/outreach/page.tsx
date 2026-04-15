"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOutreachCampaigns, createOutreachCampaign, getProspectLists } from "@/lib/api";
import type { OutreachCampaign, ProspectList } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";

const campaignStatusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [prospectLists, setProspectLists] = useState<ProspectList[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    campaign_type: "email",
    prospect_list_id: "",
  });

  useEffect(() => {
    loadCampaigns();
    loadProspectLists();
  }, []);

  async function loadCampaigns() {
    try {
      const res = await getOutreachCampaigns();
      setCampaigns(res.data);
    } catch {
      // API not running
    }
  }

  async function loadProspectLists() {
    try {
      const res = await getProspectLists();
      setProspectLists(res.data);
    } catch {
      // ignore
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        campaign_type: form.campaign_type,
      };
      if (form.prospect_list_id) {
        data.prospect_list_id = form.prospect_list_id;
      }
      await createOutreachCampaign(data);
      setForm({ name: "", description: "", campaign_type: "email", prospect_list_id: "" });
      setShowForm(false);
      loadCampaigns();
    } catch {
      alert("Error creating campaign");
    }
  }

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalReplied = campaigns.reduce((sum, c) => sum + c.replied_count, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outreach Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered outreach to your prospect pipeline</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm">
          {showForm ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
          <p className="text-sm text-gray-500">Total Campaigns</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold text-emerald-600">{activeCampaigns}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold text-blue-600">{totalSent}</p>
          <p className="text-sm text-gray-500">Messages Sent</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold text-purple-600">{totalSent > 0 ? `${((totalReplied / totalSent) * 100).toFixed(1)}%` : "—"}</p>
          <p className="text-sm text-gray-500">Response Rate</p>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Campaign Name *</label>
              <input
                placeholder="e.g. Jefferson Parish Absentee Owners"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select
                value={form.campaign_type}
                onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              >
                <option value="email">Email</option>
                <option value="letter">Letter</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prospect List (optional)</label>
              <select
                value={form.prospect_list_id}
                onChange={(e) => setForm({ ...form, prospect_list_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              >
                <option value="">None selected</option>
                {prospectLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name} ({pl.prospect_count} prospects)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description</label>
              <input
                placeholder="Optional campaign description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>
          <button type="submit" className="bg-emerald-600 text-white py-2 px-6 rounded-lg hover:bg-emerald-700 text-sm">
            Create Campaign
          </button>
        </form>
      )}

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-4">📬</p>
          <p className="text-lg">No campaigns yet</p>
          <p className="text-sm mt-2">Create your first outreach campaign to start reaching prospects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/outreach/${c.id}`} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border hover:border-emerald-300">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{c.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${campaignStatusColors[c.status] || "bg-gray-100 text-gray-600"}`}>
                  {c.status}
                </span>
              </div>
              {c.description && <p className="text-xs text-gray-500 mb-3">{c.description}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{c.campaign_type || "email"}</span>
                <span>{c.total_messages} messages</span>
                <span>{c.sent_count} sent</span>
                {c.replied_count > 0 && <span className="text-emerald-600 font-medium">{c.replied_count} replies</span>}
              </div>
              {c.total_messages > 0 && (
                <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min((c.sent_count / c.total_messages) * 100, 100)}%` }}
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

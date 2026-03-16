"use client";

import { useEffect, useState } from "react";
import { getActivities, createActivity } from "@/lib/api";
import type { Activity } from "@/lib/types";

const typeIcons: Record<string, string> = {
  call: "📞",
  email: "📧",
  text: "💬",
  showing: "🏠",
  meeting: "🤝",
  note: "📝",
  ai_action: "🤖",
  status_change: "🔄",
  offer: "💰",
};

const typeColors: Record<string, string> = {
  call: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
  text: "bg-green-100 text-green-700",
  showing: "bg-amber-100 text-amber-700",
  meeting: "bg-indigo-100 text-indigo-700",
  note: "bg-gray-100 text-gray-700",
  ai_action: "bg-emerald-100 text-emerald-700",
  status_change: "bg-red-100 text-red-700",
  offer: "bg-yellow-100 text-yellow-700",
};

interface Props {
  contactId?: string;
  propertyId?: string;
}

export default function ActivityTimeline({ contactId, propertyId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ activity_type: "note", title: "", description: "" });

  useEffect(() => {
    loadActivities();
  }, [contactId, propertyId]);

  async function loadActivities() {
    try {
      const params: Record<string, string> = {};
      if (contactId) params.contact_id = contactId;
      if (propertyId) params.property_id = propertyId;
      const res = await getActivities(params);
      setActivities(res.data);
    } catch {
      // API not available
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createActivity({
        ...form,
        contact_id: contactId || null,
        property_id: propertyId || null,
      });
      setForm({ activity_type: "note", title: "", description: "" });
      setShowForm(false);
      loadActivities();
    } catch {
      alert("Error adding activity");
    }
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <select
            value={form.activity_type}
            onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="text">Text</option>
            <option value="showing">Showing</option>
            <option value="meeting">Meeting</option>
            <option value="offer">Offer</option>
          </select>
          <input
            placeholder="Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
            rows={2}
          />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700">
            Save Activity
          </button>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="text-gray-400 text-sm">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm ${typeColors[a.activity_type] || "bg-gray-100 text-gray-700"}`}>
                  {typeIcons[a.activity_type] || "📌"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(a.created_at)}</span>
                </div>
                {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

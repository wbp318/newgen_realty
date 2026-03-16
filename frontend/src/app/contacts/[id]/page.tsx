"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getContact, updateContact, deleteContact, scoreLead, matchProperties, getProperty } from "@/lib/api";
import type { Contact, Property, PropertyMatchItem } from "@/lib/types";
import ActivityTimeline from "@/components/ui/ActivityTimeline";
import LeadScoreBadge from "@/components/ui/LeadScoreBadge";
import StatusBadge from "@/components/ui/StatusBadge";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<(PropertyMatchItem & { property?: Property })[]>([]);

  useEffect(() => {
    loadContact();
  }, [id]);

  async function loadContact() {
    try {
      const res = await getContact(id);
      setContact(res.data);
      setForm(res.data);
    } catch {
      router.push("/contacts");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateContact(id, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        contact_type: form.contact_type,
        budget_min: form.budget_min || null,
        budget_max: form.budget_max || null,
        preferred_parishes: form.preferred_parishes || null,
        preferred_cities: form.preferred_cities || null,
        preferred_property_types: form.preferred_property_types || null,
        source: form.source || null,
        notes: form.notes || null,
      });
      await loadContact();
      setEditing(false);
    } catch {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleScoreLead() {
    setScoring(true);
    try {
      const res = await scoreLead(id);
      await loadContact();
      alert(`Lead Score: ${res.data.score}/100\n\n${res.data.reason}${res.data.suggested_action ? `\n\nAction: ${res.data.suggested_action}` : ""}`);
    } catch {
      alert("Error scoring lead");
    } finally {
      setScoring(false);
    }
  }

  async function handleMatchProperties() {
    setMatching(true);
    try {
      const res = await matchProperties(id);
      // Fetch property details for each match
      const matchesWithProps = await Promise.all(
        res.data.matches.map(async (m: PropertyMatchItem) => {
          try {
            const propRes = await getProperty(m.property_id);
            return { ...m, property: propRes.data };
          } catch {
            return m;
          }
        })
      );
      setMatches(matchesWithProps);
    } catch {
      alert("Error matching properties");
    } finally {
      setMatching(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    await deleteContact(id);
    router.push("/contacts");
  }

  if (!contact) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/contacts" className="hover:text-emerald-600">Contacts</Link>
        <span>/</span>
        <span className="text-gray-900">{contact.first_name} {contact.last_name}</span>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{contact.first_name} {contact.last_name}</h1>
            <StatusBadge value={contact.contact_type} variant="type" />
            <LeadScoreBadge score={contact.ai_lead_score} />
          </div>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            {contact.email && <span>{contact.email}</span>}
            {contact.phone && <span>{contact.phone}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-gray-700">
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={handleDelete} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">First Name</label>
                  <input value={String(form.first_name || "")} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Last Name</label>
                  <input value={String(form.last_name || "")} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <input value={String(form.email || "")} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Phone</label>
                  <input value={String(form.phone || "")} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Type</label>
                  <select value={String(form.contact_type || "lead")} onChange={(e) => setForm({ ...form, contact_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900">
                    <option value="lead">Lead</option>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Source</label>
                  <input value={String(form.source || "")} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="e.g. Referral, Zillow, Cold Call" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Budget Min</label>
                  <input type="number" value={String(form.budget_min || "")} onChange={(e) => setForm({ ...form, budget_min: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Budget Max</label>
                  <input type="number" value={String(form.budget_max || "")} onChange={(e) => setForm({ ...form, budget_max: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Preferred Parishes (comma-separated)</label>
                  <input value={(form.preferred_parishes as string[] || []).join(", ")} onChange={(e) => setForm({ ...form, preferred_parishes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="e.g. Jefferson, Orleans, St. Tammany" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Preferred Cities (comma-separated)</label>
                  <input value={(form.preferred_cities as string[] || []).join(", ")} onChange={(e) => setForm({ ...form, preferred_cities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="e.g. Metairie, Mandeville" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Preferred Property Types (comma-separated)</label>
                  <input value={(form.preferred_property_types as string[] || []).join(", ")} onChange={(e) => setForm({ ...form, preferred_property_types: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="e.g. single_family, condo, land" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Notes</label>
                  <textarea value={String(form.notes || "")} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" rows={3} />
                </div>
                <button onClick={handleSave} disabled={saving} className="col-span-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div><span className="text-gray-500">Budget</span><p className="font-medium text-gray-900">{contact.budget_min || contact.budget_max ? `$${(contact.budget_min || 0).toLocaleString()} - $${(contact.budget_max || 0).toLocaleString()}` : "—"}</p></div>
                <div><span className="text-gray-500">Source</span><p className="font-medium text-gray-900">{contact.source || "—"}</p></div>
                <div><span className="text-gray-500">Preferred Parishes</span><p className="font-medium text-gray-900">{contact.preferred_parishes?.join(", ") || "—"}</p></div>
                <div><span className="text-gray-500">Preferred Cities</span><p className="font-medium text-gray-900">{contact.preferred_cities?.join(", ") || "—"}</p></div>
                <div><span className="text-gray-500">Property Types</span><p className="font-medium text-gray-900">{contact.preferred_property_types?.join(", ") || "—"}</p></div>
                <div><span className="text-gray-500">Last Contact</span><p className="font-medium text-gray-900">{contact.last_contact_date ? new Date(contact.last_contact_date).toLocaleDateString() : "—"}</p></div>
                {contact.notes && (
                  <div className="col-span-2"><span className="text-gray-500">Notes</span><p className="font-medium text-gray-900">{contact.notes}</p></div>
                )}
              </div>
            )}
          </div>

          {/* AI Lead Score */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">AI Lead Score</h2>
              <button
                onClick={handleScoreLead}
                disabled={scoring}
                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {scoring ? "Scoring..." : contact.ai_lead_score !== null ? "Rescore" : "Score Lead"}
              </button>
            </div>
            {contact.ai_lead_score !== null ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <LeadScoreBadge score={contact.ai_lead_score} size="md" />
                </div>
                {contact.ai_lead_score_reason && (
                  <p className="text-sm text-gray-600">{contact.ai_lead_score_reason}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No AI score yet. Click Score Lead to analyze.</p>
            )}
          </div>

          {/* AI Property Matches */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">AI Property Matches</h2>
              <button
                onClick={handleMatchProperties}
                disabled={matching}
                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {matching ? "Matching..." : "Find Matches"}
              </button>
            </div>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((m) => (
                  <Link key={m.property_id} href={`/properties/${m.property_id}`} className="block">
                    <div className="border rounded-lg p-3 hover:border-emerald-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {m.property?.street_address || m.property_id}
                          </p>
                          {m.property && (
                            <p className="text-xs text-gray-500">{m.property.city}, {m.property.parish} Parish</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${m.match_score >= 70 ? "bg-emerald-100 text-emerald-700" : m.match_score >= 40 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                          {m.match_score}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{m.reason}</p>
                      {m.property?.asking_price && (
                        <p className="text-sm font-semibold text-emerald-600 mt-1">${m.property.asking_price.toLocaleString()}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Click Find Matches to see AI-recommended properties.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <ActivityTimeline contactId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}

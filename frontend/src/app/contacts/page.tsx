"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContacts, createContact, deleteContact } from "@/lib/api";
import type { Contact } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import LeadScoreBadge from "@/components/ui/LeadScoreBadge";
import FilterBar, { type FilterConfig } from "@/components/ui/FilterBar";

const contactFilters: FilterConfig[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Name or email..." },
  {
    key: "contact_type", label: "Type", type: "select",
    options: [
      { value: "lead", label: "Lead" },
      { value: "buyer", label: "Buyer" },
      { value: "seller", label: "Seller" },
      { value: "both", label: "Both" },
    ],
  },
  { key: "min_score", label: "Min Score", type: "text", placeholder: "e.g. 60" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    contact_type: "lead",
    notes: "",
  });

  useEffect(() => {
    loadContacts();
  }, [filters]);

  async function loadContacts() {
    try {
      const res = await getContacts(filters);
      setContacts(res.data);
    } catch {
      // API not running
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createContact(form);
      setForm({ first_name: "", last_name: "", email: "", phone: "", contact_type: "lead", notes: "" });
      setShowForm(false);
      loadContacts();
    } catch {
      alert("Error saving contact.");
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this contact?")) return;
    await deleteContact(id);
    loadContacts();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
          {showForm ? "Cancel" : "+ Add Contact"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-2 gap-4">
          <input placeholder="First Name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="border rounded-lg px-3 py-2 text-gray-900" required />
          <input placeholder="Last Name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="border rounded-lg px-3 py-2 text-gray-900" required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-gray-900" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-gray-900" />
          <select value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })} className="border rounded-lg px-3 py-2 text-gray-900">
            <option value="lead">Lead</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Both</option>
          </select>
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border rounded-lg px-3 py-2 text-gray-900" />
          <button type="submit" className="col-span-2 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700">Save Contact</button>
        </form>
      )}

      <FilterBar filters={contactFilters} onFilter={setFilters} />

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg">No contacts found</p>
          <p className="text-sm mt-2">Add your first contact or adjust filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/contacts/${c.id}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/contacts/${c.id}`} className="hover:text-emerald-600">
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={c.contact_type} variant="type" />
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoreBadge score={c.ai_lead_score} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => handleDelete(e, c.id)} className="text-gray-400 hover:text-red-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

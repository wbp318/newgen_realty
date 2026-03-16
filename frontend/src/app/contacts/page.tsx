"use client";

import { useEffect, useState } from "react";
import { getContacts, createContact, deleteContact } from "@/lib/api";
import type { Contact } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  }, []);

  async function loadContacts() {
    try {
      const res = await getContacts();
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    await deleteContact(id);
    loadContacts();
  }

  const typeColors: Record<string, string> = {
    buyer: "bg-blue-100 text-blue-700",
    seller: "bg-emerald-100 text-emerald-700",
    both: "bg-purple-100 text-purple-700",
    lead: "bg-amber-100 text-amber-700",
  };

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

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg">No contacts yet</p>
          <p className="text-sm mt-2">Add your first contact to start building your network</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.first_name} {c.last_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[c.contact_type] || ""}`}>
                      {c.contact_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500">Delete</button>
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

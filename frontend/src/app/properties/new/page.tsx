"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProperty } from "@/lib/api";

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    street_address: "",
    city: "",
    parish: "",
    state: "LA",
    zip_code: "",
    property_type: "single_family",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    lot_size_acres: "",
    year_built: "",
    asking_price: "",
    mls_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const countyParishLabel = form.state === "LA" ? "Parish" : "County";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createProperty({
        ...form,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
        sqft: form.sqft ? parseInt(form.sqft) : null,
        lot_size_acres: form.lot_size_acres ? parseFloat(form.lot_size_acres) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        asking_price: form.asking_price ? parseInt(form.asking_price) : null,
      });
      router.push("/properties");
    } catch {
      alert("Error saving property. Is the backend running?");
    }
    setSaving(false);
  }

  function update(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Add Property</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
          <input value={form.street_address} onChange={(e) => update("street_address", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" required />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{countyParishLabel} *</label>
            <input value={form.parish} onChange={(e) => update("parish", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" placeholder={form.state === "LA" ? "e.g. Orleans" : "e.g. Pulaski"} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <select value={form.state} onChange={(e) => update("state", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900">
              <option value="LA">Louisiana</option>
              <option value="AR">Arkansas</option>
              <option value="MS">Mississippi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
            <input value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
            <select value={form.property_type} onChange={(e) => update("property_type", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900">
              <option value="single_family">Single Family</option>
              <option value="multi_family">Multi Family</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MLS Number</label>
            <input value={form.mls_number} onChange={(e) => update("mls_number", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
            <input type="number" value={form.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
            <input type="number" step="0.5" value={form.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
            <input type="number" value={form.sqft} onChange={(e) => update("sqft", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lot (acres)</label>
            <input type="number" step="0.01" value={form.lot_size_acres} onChange={(e) => update("lot_size_acres", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
            <input type="number" value={form.year_built} onChange={(e) => update("year_built", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price</label>
            <input type="number" value={form.asking_price} onChange={(e) => update("asking_price", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" placeholder="$" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-gray-900" rows={3} placeholder="Notable features, condition, flood zone info..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Property"}
          </button>
          <button type="button" onClick={() => router.back()} className="border px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

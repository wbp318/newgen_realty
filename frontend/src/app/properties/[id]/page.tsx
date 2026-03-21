"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProperty, updateProperty, deleteProperty, generateListing, autoCompAnalysis } from "@/lib/api";
import type { Property, CompAnalysisResult } from "@/lib/types";
import ActivityTimeline from "@/components/ui/ActivityTimeline";
import StatusBadge from "@/components/ui/StatusBadge";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzingComps, setAnalyzingComps] = useState(false);
  const [compResult, setCompResult] = useState<CompAnalysisResult | null>(null);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const countyParishLabel = (property?.state || "LA") === "LA" ? "Parish" : "County";
  const formCountyParishLabel = (form.state as string || "LA") === "LA" ? "Parish" : "County";

  async function loadProperty() {
    try {
      const res = await getProperty(id);
      setProperty(res.data);
      setForm(res.data);
    } catch {
      router.push("/properties");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProperty(id, form);
      await loadProperty();
      setEditing(false);
    } catch {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      await updateProperty(id, { status });
      await loadProperty();
    } catch {
      alert("Error updating status");
    }
  }

  async function handleGenerateDescription() {
    if (!property) return;
    setGenerating(true);
    try {
      const res = await generateListing({
        street_address: property.street_address,
        city: property.city,
        parish: property.parish,
        state: property.state,
        property_type: property.property_type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        lot_size_acres: property.lot_size_acres,
        year_built: property.year_built,
        asking_price: property.asking_price,
        features: property.features,
        notes: property.notes,
        tone: "professional",
      });
      await updateProperty(id, { ai_description: `${res.data.headline}\n\n${res.data.description}` });
      await loadProperty();
    } catch {
      alert("Error generating description");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAutoCompAnalysis() {
    setAnalyzingComps(true);
    setCompResult(null);
    try {
      const res = await autoCompAnalysis(id);
      setCompResult(res.data);
      await loadProperty(); // Refresh to get updated ai_suggested_price
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error fetching market comps";
      alert(msg);
    } finally {
      setAnalyzingComps(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    await deleteProperty(id);
    router.push("/properties");
  }

  if (!property) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const statuses = ["draft", "active", "pending", "sold", "withdrawn"];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/properties" className="hover:text-emerald-600">Properties</Link>
        <span>/</span>
        <span className="text-gray-900">{property.street_address}</span>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{property.street_address}</h1>
          <p className="text-gray-500">{property.city}, {property.parish} {countyParishLabel}, {property.state} {property.zip_code}</p>
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
          {/* Status + Price */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <StatusBadge value={property.status} />
              <div className="flex gap-1">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={s === property.status}
                    className={`text-xs px-2 py-1 rounded ${s === property.status ? "bg-gray-200 text-gray-400" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {property.asking_price && (
              <p className="text-3xl font-bold text-emerald-600">${property.asking_price.toLocaleString()}</p>
            )}
            {property.ai_suggested_price && (
              <p className="text-sm text-gray-500 mt-1">AI suggested: ${property.ai_suggested_price.toLocaleString()}</p>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Street Address</label>
                  <input value={String(form.street_address || "")} onChange={(e) => setForm({ ...form, street_address: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">City</label>
                  <input value={String(form.city || "")} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{formCountyParishLabel}</label>
                  <input value={String(form.parish || "")} onChange={(e) => setForm({ ...form, parish: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">State</label>
                  <select value={String(form.state || "LA")} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900">
                    <option value="LA">Louisiana</option>
                    <option value="AR">Arkansas</option>
                    <option value="MS">Mississippi</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Zip Code</label>
                  <input value={String(form.zip_code || "")} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Property Type</label>
                  <select value={String(form.property_type || "")} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900">
                    <option value="single_family">Single Family</option>
                    <option value="multi_family">Multi Family</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Bedrooms</label>
                  <input type="number" value={String(form.bedrooms || "")} onChange={(e) => setForm({ ...form, bedrooms: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Bathrooms</label>
                  <input type="number" step="0.5" value={String(form.bathrooms || "")} onChange={(e) => setForm({ ...form, bathrooms: e.target.value ? parseFloat(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Sq Ft</label>
                  <input type="number" value={String(form.sqft || "")} onChange={(e) => setForm({ ...form, sqft: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Asking Price</label>
                  <input type="number" value={String(form.asking_price || "")} onChange={(e) => setForm({ ...form, asking_price: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Year Built</label>
                  <input type="number" value={String(form.year_built || "")} onChange={(e) => setForm({ ...form, year_built: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">MLS #</label>
                  <input value={String(form.mls_number || "")} onChange={(e) => setForm({ ...form, mls_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
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
                <div><span className="text-gray-500">Type</span><p className="font-medium text-gray-900">{property.property_type.replace("_", " ")}</p></div>
                <div><span className="text-gray-500">MLS #</span><p className="font-medium text-gray-900">{property.mls_number || "—"}</p></div>
                <div><span className="text-gray-500">Bedrooms</span><p className="font-medium text-gray-900">{property.bedrooms ?? "—"}</p></div>
                <div><span className="text-gray-500">Bathrooms</span><p className="font-medium text-gray-900">{property.bathrooms ?? "—"}</p></div>
                <div><span className="text-gray-500">Sq Ft</span><p className="font-medium text-gray-900">{property.sqft?.toLocaleString() ?? "—"}</p></div>
                <div><span className="text-gray-500">Lot Size</span><p className="font-medium text-gray-900">{property.lot_size_acres ? `${property.lot_size_acres} acres` : "—"}</p></div>
                <div><span className="text-gray-500">Year Built</span><p className="font-medium text-gray-900">{property.year_built ?? "—"}</p></div>
                {property.notes && (
                  <div className="col-span-2"><span className="text-gray-500">Notes</span><p className="font-medium text-gray-900">{property.notes}</p></div>
                )}
              </div>
            )}
          </div>

          {/* Market Comp Analysis */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Market Comp Analysis</h2>
              <button
                onClick={handleAutoCompAnalysis}
                disabled={analyzingComps}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {analyzingComps ? "Fetching Comps..." : compResult ? "Re-Analyze" : "Fetch Market Comps"}
              </button>
            </div>
            {compResult ? (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Low</p>
                    <p className="text-lg font-bold text-gray-700">${compResult.price_range_low.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600">Suggested</p>
                    <p className="text-lg font-bold text-emerald-700">${compResult.suggested_price.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">High</p>
                    <p className="text-lg font-bold text-gray-700">${compResult.price_range_high.toLocaleString()}</p>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {compResult.analysis}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                Fetch real comparable sales data and get an AI-powered pricing recommendation.
                {analyzingComps && " This may take a moment..."}
              </p>
            )}
          </div>

          {/* AI Description */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">AI Description</h2>
              <button
                onClick={handleGenerateDescription}
                disabled={generating}
                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {generating ? "Generating..." : property.ai_description ? "Regenerate" : "Generate"}
              </button>
            </div>
            {property.ai_description ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {property.ai_description}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No AI description yet. Click Generate to create one.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <ActivityTimeline propertyId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}

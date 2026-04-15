"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProspect, updateProspect, deleteProspect, enrichProspect, convertProspect, scoreProspect, generateOutreachMessage, skipTraceProspect } from "@/lib/api";
import type { Prospect } from "@/lib/types";
import ProspectScoreBadge from "@/components/ui/ProspectScoreBadge";
import StatusBadge from "@/components/ui/StatusBadge";

const prospectTypeLabels: Record<string, string> = {
  absentee_owner: "Absentee Owner",
  pre_foreclosure: "Pre-Foreclosure",
  probate: "Probate",
  long_term_owner: "Long-Term Owner",
  expired_listing: "Expired Listing",
  fsbo: "FSBO",
  vacant: "Vacant",
  tax_delinquent: "Tax Delinquent",
};

const prospectTypeColors: Record<string, string> = {
  absentee_owner: "bg-purple-100 text-purple-700",
  pre_foreclosure: "bg-red-100 text-red-700",
  probate: "bg-amber-100 text-amber-700",
  long_term_owner: "bg-blue-100 text-blue-700",
  expired_listing: "bg-gray-200 text-gray-700",
  fsbo: "bg-emerald-100 text-emerald-700",
  vacant: "bg-yellow-100 text-yellow-700",
  tax_delinquent: "bg-orange-100 text-orange-700",
};

const statusOptions = [
  "new", "researching", "qualified", "contacted",
  "responding", "converted", "not_interested", "do_not_contact",
];

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [converting, setConverting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [skipTracing, setSkipTracing] = useState(false);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<{ subject: string | null; body: string; compliance_flags: string[] } | null>(null);

  useEffect(() => {
    loadProspect();
  }, [id]);

  async function loadProspect() {
    try {
      const res = await getProspect(id);
      setProspect(res.data);
      setForm(res.data);
    } catch {
      router.push("/prospects");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProspect(id, {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        mailing_address: form.mailing_address || null,
        status: form.status,
        notes: form.notes || null,
      });
      await loadProspect();
      setEditing(false);
    } catch {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      await enrichProspect(id);
      await loadProspect();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error enriching prospect";
      alert(msg);
    } finally {
      setEnriching(false);
    }
  }

  async function handleScore() {
    setScoring(true);
    try {
      const res = await scoreProspect(id);
      await loadProspect();
      alert(`Prospect Score: ${res.data.score}/100 (${res.data.motivation_level})\n\n${res.data.reason}${res.data.suggested_approach ? `\n\nApproach: ${res.data.suggested_approach}` : ""}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error scoring prospect";
      alert(msg);
    } finally {
      setScoring(false);
    }
  }

  async function handleSkipTrace() {
    setSkipTracing(true);
    try {
      const res = await skipTraceProspect(id);
      await loadProspect();
      const data = res.data;
      if (data.success) {
        alert(`Found: ${data.phones.length} phone(s), ${data.emails.length} email(s). Prospect updated.`);
      } else {
        alert(data.message || "No results found. Consider using a paid skip trace provider.");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error running skip trace";
      alert(msg);
    } finally {
      setSkipTracing(false);
    }
  }

  async function handleGenerateOutreach(medium: string = "email") {
    setGeneratingOutreach(true);
    setGeneratedMessage(null);
    try {
      // Use a placeholder campaign ID — in full flow this comes from a real campaign
      const res = await generateOutreachMessage({
        campaign_id: "direct-outreach",
        prospect_id: id,
        medium,
        tone: "professional",
      });
      setGeneratedMessage(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error generating outreach";
      alert(msg);
    } finally {
      setGeneratingOutreach(false);
    }
  }

  async function handleConvert() {
    if (!confirm("Convert this prospect to a CRM Contact? This will create a new contact record.")) return;
    setConverting(true);
    try {
      const res = await convertProspect(id);
      router.push(`/contacts/${res.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error converting";
      alert(msg);
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this prospect? This cannot be undone.")) return;
    await deleteProspect(id);
    router.push("/prospects");
  }

  if (!prospect) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const pd = (prospect.property_data || {}) as Record<string, string | number | boolean | null>;
  const ms = (prospect.motivation_signals || {}) as Record<string, string | number | boolean | null>;
  const stateLabel = prospect.property_state === "LA" ? "Parish" : "County";

  const toneMap: Record<string, { tone: string; toneColor: string; approach: string; keyRule: string }> = {
    absentee_owner: { tone: "Business-Focused", toneColor: "bg-purple-100 text-purple-700", approach: "Emphasize hassle-free sale, remove management burden from a distance", keyRule: "Focus on the financial upside and convenience" },
    pre_foreclosure: { tone: "Empathetic", toneColor: "bg-red-100 text-red-700", approach: "Offer options and help navigating financial difficulty", keyRule: "NEVER use the word 'foreclosure' in outreach" },
    probate: { tone: "Sensitive", toneColor: "bg-amber-100 text-amber-700", approach: "Acknowledge the loss, offer to simplify estate settlement", keyRule: "Lead with empathy — someone passed away" },
    long_term_owner: { tone: "Congratulatory", toneColor: "bg-blue-100 text-blue-700", approach: "Highlight equity growth and market timing opportunity", keyRule: "They may not know their home's current value" },
    tax_delinquent: { tone: "Helpful", toneColor: "bg-orange-100 text-orange-700", approach: "Mention selling could resolve tax situation", keyRule: "Be helpful, not predatory — they're in financial stress" },
    vacant: { tone: "Practical", toneColor: "bg-yellow-100 text-yellow-700", approach: "Highlight carrying costs, liability, convert burden to cash", keyRule: "Focus on the financial drain of an empty property" },
    fsbo: { tone: "Respectful", toneColor: "bg-emerald-100 text-emerald-700", approach: "Respect their effort, offer professional value-add", keyRule: "Don't insult their approach — show what you add" },
    expired_listing: { tone: "Professional", toneColor: "bg-gray-200 text-gray-700", approach: "Offer fresh strategy, explain what you'd do differently", keyRule: "Don't bash their previous agent" },
  };
  const toneInfo = toneMap[prospect.prospect_type] || { tone: "Professional", toneColor: "bg-gray-200 text-gray-700", approach: "Standard professional outreach", keyRule: "" };

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/prospects" className="hover:text-emerald-600">Prospects</Link>
        <span>/</span>
        <span className="text-gray-900">
          {prospect.first_name || prospect.last_name
            ? `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim()
            : prospect.property_address}
        </span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">
              {prospect.first_name || prospect.last_name
                ? `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim()
                : "Unknown Owner"}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${prospectTypeColors[prospect.prospect_type] || "bg-gray-100 text-gray-600"}`}>
              {prospectTypeLabels[prospect.prospect_type] || prospect.prospect_type}
            </span>
            <ProspectScoreBadge score={prospect.ai_prospect_score} />
            <StatusBadge value={prospect.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{prospect.property_address}, {prospect.property_city}, {prospect.property_state} {prospect.property_zip}</p>
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Owner Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner Details</h2>
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
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Mailing Address</label>
                  <input value={String(form.mailing_address || "")} onChange={(e) => setForm({ ...form, mailing_address: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <select value={String(form.status || "new")} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900">
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Data Source</label>
                  <input value={prospect.data_source} disabled className="w-full border rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50" />
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
                <div><span className="text-gray-500">Email</span><p className="font-medium text-gray-900">{prospect.email || "—"}</p></div>
                <div><span className="text-gray-500">Phone</span><p className="font-medium text-gray-900">{prospect.phone || "—"}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Mailing Address</span><p className="font-medium text-gray-900">{prospect.mailing_address || "—"}</p></div>
                <div><span className="text-gray-500">Data Source</span><p className="font-medium text-gray-900">{prospect.data_source}</p></div>
                <div><span className="text-gray-500">Source Record ID</span><p className="font-medium text-gray-900 text-xs">{prospect.source_record_id || "—"}</p></div>
                {prospect.notes && (
                  <div className="col-span-2"><span className="text-gray-500">Notes</span><p className="font-medium text-gray-900">{prospect.notes}</p></div>
                )}
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="col-span-2"><span className="text-gray-500">Address</span><p className="font-medium text-gray-900">{prospect.property_address}</p></div>
              <div><span className="text-gray-500">City</span><p className="font-medium text-gray-900">{prospect.property_city || "—"}</p></div>
              <div><span className="text-gray-500">{stateLabel}</span><p className="font-medium text-gray-900">{prospect.property_parish || "—"}</p></div>
              <div><span className="text-gray-500">State</span><p className="font-medium text-gray-900">{prospect.property_state}</p></div>
              <div><span className="text-gray-500">Zip</span><p className="font-medium text-gray-900">{prospect.property_zip || "—"}</p></div>
              {pd.sqft && <div><span className="text-gray-500">SqFt</span><p className="font-medium text-gray-900">{Number(pd.sqft).toLocaleString()}</p></div>}
              {pd.bedrooms && <div><span className="text-gray-500">Bedrooms</span><p className="font-medium text-gray-900">{String(pd.bedrooms)}</p></div>}
              {pd.bathrooms && <div><span className="text-gray-500">Bathrooms</span><p className="font-medium text-gray-900">{String(pd.bathrooms)}</p></div>}
              {pd.year_built && <div><span className="text-gray-500">Year Built</span><p className="font-medium text-gray-900">{String(pd.year_built)}</p></div>}
              {pd.lot_size_acres && <div><span className="text-gray-500">Lot Size</span><p className="font-medium text-gray-900">{String(pd.lot_size_acres)} acres</p></div>}
              {pd.property_type && <div><span className="text-gray-500">Property Type</span><p className="font-medium text-gray-900">{String(pd.property_type)}</p></div>}
              {pd.assessed_value && <div><span className="text-gray-500">Assessed Value</span><p className="font-medium text-emerald-600">${Number(pd.assessed_value).toLocaleString()}</p></div>}
              {pd.market_value && <div><span className="text-gray-500">Market Value</span><p className="font-medium text-emerald-600">${Number(pd.market_value).toLocaleString()}</p></div>}
              {pd.avm_value && <div><span className="text-gray-500">AVM Estimate</span><p className="font-medium text-emerald-600">${Number(pd.avm_value).toLocaleString()}</p></div>}
              {pd.tax_amount && <div><span className="text-gray-500">Tax Amount</span><p className="font-medium text-gray-900">${Number(pd.tax_amount).toLocaleString()}</p></div>}
              {pd.last_sale_price && <div><span className="text-gray-500">Last Sale Price</span><p className="font-medium text-gray-900">${Number(pd.last_sale_price).toLocaleString()}</p></div>}
              {pd.last_sale_date && <div><span className="text-gray-500">Last Sale Date</span><p className="font-medium text-gray-900">{String(pd.last_sale_date)}</p></div>}
            </div>
          </div>

          {/* Motivation Signals */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Motivation Signals</h2>
            {Object.keys(ms).length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ms).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full ${
                      value === true || (typeof value === "number" && value > 0) ? "bg-red-500" : "bg-gray-300"
                    }`} />
                    <span className="text-sm text-gray-700">{key.replace(/_/g, " ")}</span>
                    <span className="text-sm font-medium text-gray-900 ml-auto">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No signals recorded. Try enriching the prospect.</p>
            )}
          </div>

          {/* AI Outreach Approach */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-emerald-400">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Outreach Approach</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Tone:</span>
                <span className={`text-sm px-2.5 py-1 rounded-full font-semibold ${toneInfo.toneColor}`}>
                  {toneInfo.tone}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Approach:</span>
                <p className="text-sm text-gray-900 mt-1">{toneInfo.approach}</p>
              </div>
              {toneInfo.keyRule && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-amber-800">Key Rule: {toneInfo.keyRule}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Score */}
          {prospect.ai_prospect_score !== null && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Prospect Score</h2>
              <div className="flex items-center gap-3 mb-2">
                <ProspectScoreBadge score={prospect.ai_prospect_score} size="md" />
              </div>
              {prospect.ai_prospect_score_reason && (
                <p className="text-sm text-gray-600">{prospect.ai_prospect_score_reason}</p>
              )}
            </div>
          )}

          {/* TCPA Compliance */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">TCPA Compliance</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <span className="text-gray-500">Consent Status</span>
                <p className="font-medium">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    prospect.consent_status === "granted" ? "bg-emerald-100 text-emerald-700" :
                    prospect.consent_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    prospect.consent_status === "denied" || prospect.consent_status === "revoked" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {prospect.consent_status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-500">DNC Listed</span>
                <p className="font-medium">
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${
                    prospect.dnc_listed ? "bg-red-100 text-red-700" :
                    prospect.dnc_checked ? "bg-emerald-100 text-emerald-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {prospect.dnc_listed ? "On DNC List" : prospect.dnc_checked ? "Cleared" : "Not Checked"}
                  </span>
                </p>
              </div>
              {prospect.consent_date && (
                <div><span className="text-gray-500">Consent Date</span><p className="font-medium text-gray-900">{new Date(prospect.consent_date).toLocaleDateString()}</p></div>
              )}
              {prospect.opt_out_date && (
                <div><span className="text-gray-500">Opt-Out Date</span><p className="font-medium text-red-600">{new Date(prospect.opt_out_date).toLocaleDateString()}</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {enriching ? "Enriching..." : "Enrich with ATTOM Data"}
              </button>
              <button
                onClick={handleSkipTrace}
                disabled={skipTracing}
                className="w-full text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {skipTracing ? "Tracing..." : "Skip Trace (Find Contact Info)"}
              </button>
              <button
                onClick={handleScore}
                disabled={scoring}
                className="w-full text-sm bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {scoring ? "Scoring..." : prospect.ai_prospect_score !== null ? "Rescore Prospect" : "Score Prospect"}
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => handleGenerateOutreach("email")}
                  disabled={generatingOutreach}
                  className="flex-1 text-sm bg-purple-600 text-white px-2 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {generatingOutreach ? "..." : "Email"}
                </button>
                <button
                  onClick={() => handleGenerateOutreach("letter")}
                  disabled={generatingOutreach}
                  className="flex-1 text-sm bg-purple-600 text-white px-2 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Letter
                </button>
                <button
                  onClick={() => handleGenerateOutreach("text")}
                  disabled={generatingOutreach}
                  className="flex-1 text-sm bg-purple-600 text-white px-2 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Text
                </button>
              </div>
              <button
                onClick={handleConvert}
                disabled={converting || prospect.status === "converted"}
                className="w-full text-sm bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {prospect.status === "converted" ? "Already Converted" : converting ? "Converting..." : "Convert to Contact"}
              </button>
              {prospect.contact_id && (
                <Link href={`/contacts/${prospect.contact_id}`} className="block w-full text-center text-sm border border-emerald-300 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50">
                  View Contact Record
                </Link>
              )}
            </div>
          </div>

          {/* Generated Outreach */}
          {generatedMessage && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Generated Outreach</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${toneInfo.toneColor}`}>{toneInfo.tone}</span>
              </div>
              {generatedMessage.compliance_flags.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-800">
                  Compliance flags: {generatedMessage.compliance_flags.join(", ")}
                </div>
              )}
              {generatedMessage.subject && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500">Subject</span>
                  <p className="text-sm font-medium text-gray-900">{generatedMessage.subject}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">Body</span>
                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {generatedMessage.body}
                </div>
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{new Date(prospect.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-900">{new Date(prospect.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source</span>
                <span className="text-gray-900">{prospect.data_source}</span>
              </div>
              {prospect.tags && prospect.tags.length > 0 && (
                <div>
                  <span className="text-gray-500">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prospect.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

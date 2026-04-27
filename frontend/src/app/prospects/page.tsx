"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProspects, deleteProspect, getAttomStatus, bulkScoreProspects, batchDncCheck, batchSkipTrace, getIntegrationsStatus } from "@/lib/api";
import type { Prospect } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import ProspectScoreBadge from "@/components/ui/ProspectScoreBadge";
import FilterBar, { type FilterConfig } from "@/components/ui/FilterBar";

const prospectToneLabels: Record<string, string> = {
  absentee_owner: "Business-Focused",
  pre_foreclosure: "Empathetic",
  probate: "Sensitive",
  long_term_owner: "Congratulatory",
  expired_listing: "Professional",
  fsbo: "Respectful",
  vacant: "Practical",
  tax_delinquent: "Helpful",
};

const prospectToneColors: Record<string, string> = {
  absentee_owner: "bg-purple-50 text-purple-600",
  pre_foreclosure: "bg-red-50 text-red-600",
  probate: "bg-amber-50 text-amber-600",
  long_term_owner: "bg-blue-50 text-blue-600",
  expired_listing: "bg-gray-100 text-gray-600",
  fsbo: "bg-emerald-50 text-emerald-600",
  vacant: "bg-yellow-50 text-yellow-600",
  tax_delinquent: "bg-orange-50 text-orange-600",
};

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

const prospectFilters: FilterConfig[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Name or address..." },
  {
    key: "prospect_type", label: "Type", type: "select",
    options: Object.entries(prospectTypeLabels).map(([value, label]) => ({ value, label })),
  },
  {
    key: "status", label: "Status", type: "select",
    options: [
      { value: "new", label: "New" },
      { value: "researching", label: "Researching" },
      { value: "qualified", label: "Qualified" },
      { value: "contacted", label: "Contacted" },
      { value: "responding", label: "Responding" },
      { value: "converted", label: "Converted" },
      { value: "not_interested", label: "Not Interested" },
      { value: "do_not_contact", label: "Do Not Contact" },
    ],
  },
  {
    key: "state", label: "State", type: "select",
    options: [
      { value: "LA", label: "Louisiana" },
      { value: "AR", label: "Arkansas" },
      { value: "MS", label: "Mississippi" },
    ],
  },
  { key: "min_score", label: "Min Score", type: "text", placeholder: "e.g. 50" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function buildExportQuery(filters: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== "") params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [attomConfigured, setAttomConfigured] = useState<boolean | null>(null);
  const [skipTraceConfigured, setSkipTraceConfigured] = useState<boolean | null>(null);
  const [bulkAction, setBulkAction] = useState(false);

  useEffect(() => {
    loadProspects();
    checkAttomStatus();
    getIntegrationsStatus()
      .then((r) => {
        const skip = r.data.integrations.find(
          (i: { key: string }) => i.key === "skip_trace"
        );
        setSkipTraceConfigured(skip?.configured ?? false);
      })
      .catch(() => setSkipTraceConfigured(false));
  }, [filters]);

  async function loadProspects() {
    try {
      const res = await getProspects(filters);
      setProspects(res.data);
    } catch {
      // API not running
    }
  }

  async function checkAttomStatus() {
    try {
      const res = await getAttomStatus();
      setAttomConfigured(res.data.configured);
    } catch {
      setAttomConfigured(null);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this prospect?")) return;
    await deleteProspect(id);
    loadProspects();
  }

  async function handleBulkScore() {
    const unscored = prospects.filter((p) => p.ai_prospect_score === null).map((p) => p.id);
    if (unscored.length === 0) { alert("All prospects already scored."); return; }
    if (!confirm(`Score ${unscored.length} unscored prospects? This uses AI credits.`)) return;
    setBulkAction(true);
    try {
      const res = await bulkScoreProspects(unscored);
      alert(`Scored ${res.data.results.length} prospects. Average: ${res.data.average_score}`);
      loadProspects();
    } catch { alert("Error during bulk scoring."); }
    finally { setBulkAction(false); }
  }

  async function handleBulkDnc() {
    const withPhone = prospects.filter((p) => p.phone && !p.dnc_checked).map((p) => p.id);
    if (withPhone.length === 0) { alert("No unchecked prospects with phone numbers."); return; }
    setBulkAction(true);
    try {
      const res = await batchDncCheck(withPhone);
      alert(`Checked ${res.data.checked} numbers. ${res.data.on_dnc_list} on DNC list.`);
      loadProspects();
    } catch { alert("Error during DNC check."); }
    finally { setBulkAction(false); }
  }

  async function handleBulkSkipTrace() {
    const noContact = prospects.filter((p) => !p.phone && !p.email).map((p) => p.id);
    if (noContact.length === 0) { alert("All prospects have contact info."); return; }
    if (!confirm(`Skip trace ${noContact.length} prospects without contact info?`)) return;
    setBulkAction(true);
    try {
      const res = await batchSkipTrace(noContact);
      alert(`Searched ${res.data.searched}. Updated ${res.data.found} with new contact info.`);
      loadProspects();
    } catch { alert("Error during skip tracing."); }
    finally { setBulkAction(false); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Public record leads from ATTOM Data
            {attomConfigured !== null && (
              <span className={`inline-flex items-center gap-1 ml-2 text-xs px-2 py-0.5 rounded-full ${attomConfigured ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${attomConfigured ? "bg-emerald-500" : "bg-gray-400"}`} />
                {attomConfigured ? "ATTOM Connected" : "ATTOM Not Configured"}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {prospects.length > 0 && (
            <>
              <button onClick={handleBulkScore} disabled={bulkAction} className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50">
                {bulkAction ? "..." : "Bulk Score"}
              </button>
              <button onClick={handleBulkDnc} disabled={bulkAction} className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50">
                DNC Check
              </button>
              {skipTraceConfigured && (
                <button onClick={handleBulkSkipTrace} disabled={bulkAction} className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50">
                  Skip Trace
                </button>
              )}
              <a
                href={`${API_BASE}/api/exports/prospects${buildExportQuery(filters)}`}
                className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
                title="Download a CSV of prospects matching the current filters"
              >
                Export CSV
              </a>
            </>
          )}
          <Link href="/prospects/search" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            Search Public Records
          </Link>
        </div>
      </div>

      <FilterBar filters={prospectFilters} onFilter={setFilters} />

      {prospects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-4">🎯</p>
          <p className="text-lg">No prospects found</p>
          <p className="text-sm mt-2">
            <Link href="/prospects/search" className="text-emerald-600 hover:underline">Search public records</Link> to find motivated sellers
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">AI Tone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Consent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/prospects/${p.id}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/prospects/${p.id}`} className="hover:text-emerald-600">
                      {p.first_name || p.last_name
                        ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
                        : "Unknown Owner"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="truncate max-w-[200px]">{p.property_address}</div>
                    <div className="text-xs text-gray-400">{p.property_city}, {p.property_state}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${prospectTypeColors[p.prospect_type] || "bg-gray-100 text-gray-600"}`}>
                      {prospectTypeLabels[p.prospect_type] || p.prospect_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prospectToneColors[p.prospect_type] || "bg-gray-100 text-gray-500"}`}>
                      {prospectToneLabels[p.prospect_type] || "Standard"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ProspectScoreBadge score={p.ai_prospect_score} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.consent_status === "granted" ? "bg-emerald-100 text-emerald-700" :
                      p.consent_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      p.dnc_listed ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {p.dnc_listed ? "DNC" : p.consent_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => handleDelete(e, p.id)} className="text-gray-400 hover:text-red-500">Delete</button>
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

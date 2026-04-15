"use client";

import { useState } from "react";
import Link from "next/link";
import { searchProspects, getAttomStatus } from "@/lib/api";
import type { ProspectSearchResult } from "@/lib/types";
import { useEffect } from "react";

const searchTypes = [
  { value: "absentee_owner", label: "Absentee Owners", description: "Properties where owner lives elsewhere" },
  { value: "pre_foreclosure", label: "Pre-Foreclosure", description: "Properties with Notice of Default" },
  { value: "long_term_owner", label: "Long-Term Owners", description: "Owners holding 10+ years (equity play)" },
  { value: "tax_delinquent", label: "Tax Delinquent", description: "Properties with overdue taxes" },
  { value: "vacant", label: "Vacant Properties", description: "Unoccupied properties (carrying cost burden)" },
];

export default function ProspectSearchPage() {
  const [attomConfigured, setAttomConfigured] = useState<boolean | null>(null);
  const [searchType, setSearchType] = useState("absentee_owner");
  const [state, setState] = useState("LA");
  const [parish, setParish] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [minOwnershipYears, setMinOwnershipYears] = useState("10");
  const [maxResults, setMaxResults] = useState("50");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProspectSearchResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAttomStatus()
      .then((res) => setAttomConfigured(res.data.configured))
      .catch(() => setAttomConfigured(null));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data: Record<string, unknown> = {
        search_type: searchType,
        state,
        max_results: parseInt(maxResults) || 50,
      };
      if (parish) data.parish = parish;
      if (city) data.city = city;
      if (zipCode) data.zip_code = zipCode;
      if (searchType === "long_term_owner") {
        data.min_ownership_years = parseInt(minOwnershipYears) || 10;
      }

      const res = await searchProspects(data);
      setResult(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Search failed. Check that the backend is running and ATTOM is configured.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const stateLabel = state === "LA" ? "Parish" : "County";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/prospects" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search Public Records</h1>
          <p className="text-sm text-gray-500 mt-1">Find motivated sellers from ATTOM property data</p>
        </div>
      </div>

      {attomConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          ATTOM_API_KEY is not configured. Add it to your backend .env file to enable public record searches.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Type</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              >
                {searchTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {searchTypes.find((t) => t.value === searchType)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              >
                <option value="LA">Louisiana</option>
                <option value="AR">Arkansas</option>
                <option value="MS">Mississippi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{stateLabel}</label>
              <input
                type="text"
                placeholder={`e.g. ${state === "LA" ? "Jefferson" : state === "AR" ? "Pulaski" : "Hinds"}`}
                value={parish}
                onChange={(e) => setParish(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City (optional)</label>
              <input
                type="text"
                placeholder="e.g. Baton Rouge"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code (optional)</label>
              <input
                type="text"
                placeholder="e.g. 70808"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>

            {searchType === "long_term_owner" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Ownership Years</label>
                <input
                  type="number"
                  value={minOwnershipYears}
                  onChange={(e) => setMinOwnershipYears(e.target.value)}
                  min="1"
                  max="50"
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Results</label>
              <input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(e.target.value)}
                min="1"
                max="100"
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading || attomConfigured === false}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? "Searching ATTOM..." : "Search Public Records"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {result && (
            <div>
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Found {result.total_found} prospects
                  </p>
                  <p className="text-xs text-gray-500">
                    Imported {result.imported_count} new &middot; Skipped {result.skipped_count} duplicates
                  </p>
                </div>
                {result.imported_count > 0 && (
                  <Link href="/prospects" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm">
                    View All Prospects
                  </Link>
                )}
              </div>

              {result.prospects.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.prospects.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/prospects/${p.id}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {p.first_name || p.last_name
                              ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
                              : "Unknown Owner"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div>{p.property_address}</div>
                            <div className="text-xs text-gray-400">{p.property_city}, {p.property_state} {p.property_zip}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{p.data_source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
                  <p>No new prospects found. All results were already imported.</p>
                </div>
              )}
            </div>
          )}

          {!result && !error && !loading && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg">Configure your search and click Search</p>
              <p className="text-sm mt-2">Results will be automatically imported into your prospect pipeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

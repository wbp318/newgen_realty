"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getProspectGeoPoints, runGeocodeBackfill } from "@/lib/api";
import type { ProspectGeoPoint } from "@/lib/types";

const ProspectMap = dynamic(() => import("@/components/map/ProspectMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
      Loading map...
    </div>
  ),
});

const PROSPECT_TYPES = [
  "absentee_owner",
  "pre_foreclosure",
  "probate",
  "long_term_owner",
  "expired_listing",
  "fsbo",
  "vacant",
  "tax_delinquent",
];

type Basemap = "street" | "satellite";
type ParishSel = { state: string; name: string } | null;

export default function FarmMapPage() {
  const [points, setPoints] = useState<ProspectGeoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showParishes, setShowParishes] = useState(true);
  const [basemap, setBasemap] = useState<Basemap>("street");
  const [minScore, setMinScore] = useState<number>(0);
  const [state, setState] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedParish, setSelectedParish] = useState<ParishSel>(null);
  const [backfilling, setBackfilling] = useState(false);

  async function load(parishOverride?: ParishSel | undefined) {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 2000 };
      if (minScore > 0) params.min_score = minScore;
      if (state) params.state = state;
      if (selectedTypes.length > 0) params.types = selectedTypes.join(",");
      const parish = parishOverride !== undefined ? parishOverride : selectedParish;
      if (parish) {
        params.parish = parish.name;
        params.state = parish.state;
      }
      const res = await getProspectGeoPoints(params);
      setPoints(res.data);
    } catch {
      // ignore; keep previous points on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBackfill() {
    if (!confirm("Geocode up to 50 prospects without coordinates? Takes ~1 minute.")) return;
    setBackfilling(true);
    try {
      const res = await runGeocodeBackfill(50);
      alert(
        `Scanned ${res.data.scanned} · Updated ${res.data.updated} · Failed ${res.data.failed}`
      );
      await load();
    } catch {
      alert("Backfill failed");
    } finally {
      setBackfilling(false);
    }
  }

  function toggleType(t: string) {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function handleSelectParish(sel: ParishSel) {
    setSelectedParish(sel);
    load(sel);
  }

  const stats = useMemo(() => {
    const hot = points.filter(
      (p) => p.ai_prospect_score != null && p.ai_prospect_score >= 80
    ).length;
    const warm = points.filter(
      (p) => p.ai_prospect_score != null && p.ai_prospect_score >= 60 && p.ai_prospect_score < 80
    ).length;
    return { total: points.length, hot, warm };
  }, [points]);

  const parishLabel = selectedParish
    ? `${selectedParish.name} ${selectedParish.state === "LA" ? "Parish" : "County"} (${selectedParish.state})`
    : null;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farm Map</h1>
          <p className="text-sm text-gray-500">
            Your farm area — where your leads live. Heat shows density; markers are color-coded by score. Click a parish to filter.
          </p>
        </div>
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50"
        >
          {backfilling ? "Geocoding..." : "Geocode missing"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-end">
        <label className="text-xs text-gray-600">
          Min score
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="block mt-1 w-24 border rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-gray-600">
          State
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="block mt-1 w-28 border rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="LA">LA</option>
            <option value="AR">AR</option>
            <option value="MS">MS</option>
          </select>
        </label>
        <label className="text-xs text-gray-600">
          Basemap
          <select
            value={basemap}
            onChange={(e) => setBasemap(e.target.value as Basemap)}
            className="block mt-1 w-28 border rounded px-2 py-1 text-sm"
          >
            <option value="street">Street</option>
            <option value="satellite">Satellite</option>
          </select>
        </label>
        <div className="text-xs text-gray-600 flex-1">
          Prospect types
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PROSPECT_TYPES.map((t) => {
              const active = selectedTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    active
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs text-gray-600">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showHeat}
              onChange={(e) => setShowHeat(e.target.checked)}
            />
            Heat layer
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
            />
            Markers
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showParishes}
              onChange={(e) => setShowParishes(e.target.checked)}
            />
            Parish lines
          </label>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Apply"}
        </button>
      </div>

      {parishLabel && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtered to:</span>
          <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {parishLabel}
            <button
              onClick={() => handleSelectParish(null)}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Clear parish filter"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">On map</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xl font-bold text-red-600">{stats.hot}</p>
          <p className="text-xs text-gray-500">Hot (80+)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xl font-bold text-amber-600">{stats.warm}</p>
          <p className="text-xs text-gray-500">Warm (60-79)</p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
        {points.length === 0 && !loading && !showParishes ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            No geocoded prospects yet. Click &quot;Geocode missing&quot; to populate coordinates.
          </div>
        ) : (
          <ProspectMap
            points={points}
            showHeat={showHeat}
            showMarkers={showMarkers}
            showParishes={showParishes}
            basemap={basemap}
            selectedParish={selectedParish}
            onSelectParish={handleSelectParish}
          />
        )}
      </div>
    </div>
  );
}

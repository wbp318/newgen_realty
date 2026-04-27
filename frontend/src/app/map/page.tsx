"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  getProspectGeoPoints,
  getPropertyGeoPoints,
  runGeocodeBackfill,
} from "@/lib/api";
import type { ProspectGeoPoint, PropertyGeoPoint } from "@/lib/types";

const ProspectMap = dynamic(() => import("@/components/map/ProspectMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sm" style={{ color: "var(--text-faded)" }}>
      Loading map…
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
  const [propertyPoints, setPropertyPoints] = useState<PropertyGeoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showParishes, setShowParishes] = useState(true);
  const [basemap, setBasemap] = useState<Basemap>("street");
  const [minScore, setMinScore] = useState<number>(0);
  const [state, setState] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedParish, setSelectedParish] = useState<ParishSel>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [displayDims, setDisplayDims] = useState<{ w: number; h: number }>({ w: 0, h: 720 });
  const mapWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setDisplayDims({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function load(parishOverride?: ParishSel | undefined) {
    setLoading(true);
    try {
      const prospectParams: Record<string, string | number> = { limit: 2000 };
      if (minScore > 0) prospectParams.min_score = minScore;
      if (state) prospectParams.state = state;
      if (selectedTypes.length > 0) prospectParams.types = selectedTypes.join(",");
      const parish = parishOverride !== undefined ? parishOverride : selectedParish;
      if (parish) {
        prospectParams.parish = parish.name;
        prospectParams.state = parish.state;
      }
      const propertyParams: Record<string, string | number> = { limit: 2000 };
      if (state) propertyParams.state = state;
      if (parish) {
        propertyParams.parish = parish.name;
        propertyParams.state = parish.state;
      }
      const [pRes, propRes] = await Promise.all([
        getProspectGeoPoints(prospectParams),
        getPropertyGeoPoints(propertyParams),
      ]);
      setPoints(pRes.data);
      setPropertyPoints(propRes.data);
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
    if (
      !confirm(
        "Geocode up to 50 prospects + 50 properties without coordinates? Takes ~1-2 minutes."
      )
    )
      return;
    setBackfilling(true);
    try {
      const res = await runGeocodeBackfill(50);
      const { prospects, properties } = res.data;
      alert(
        `Prospects: scanned ${prospects.scanned}, updated ${prospects.updated}, failed ${prospects.failed}\n` +
          `Properties: scanned ${properties.scanned}, updated ${properties.updated}, failed ${properties.failed}`
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
    const activeProps = propertyPoints.filter((p) => p.status === "active").length;
    return { total: points.length, hot, warm, props: propertyPoints.length, activeProps };
  }, [points, propertyPoints]);

  const parishLabel = selectedParish
    ? `${selectedParish.name} ${selectedParish.state === "LA" ? "Parish" : "County"} (${selectedParish.state})`
    : null;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl text-text">Farm Map</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-soft)" }}>
            Prospects and properties across LA, AR, and MS. Click a parish or county to filter.
          </p>
        </div>
        <button onClick={handleBackfill} disabled={backfilling} className="btn-ghost whitespace-nowrap">
          {backfilling ? "Geocoding…" : "Geocode missing"}
        </button>
      </header>

      {/* Filters */}
      <section className="panel p-4 mb-4">
        <div className="flex flex-wrap gap-x-5 gap-y-3 items-end">
          <FieldGroup label="Min score">
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="field w-20"
            />
          </FieldGroup>
          <FieldGroup label="State">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="field w-28"
            >
              <option value="">All</option>
              <option value="LA">Louisiana</option>
              <option value="AR">Arkansas</option>
              <option value="MS">Mississippi</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Basemap">
            <select
              value={basemap}
              onChange={(e) => setBasemap(e.target.value as Basemap)}
              className="field w-28"
            >
              <option value="street">Street</option>
              <option value="satellite">Satellite</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Prospect types" className="flex-1 min-w-[260px]">
            <div className="flex flex-wrap gap-1.5">
              {PROSPECT_TYPES.map((t) => {
                const active = selectedTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      color: active ? "#04231a" : "var(--text-soft)",
                      background: active ? "var(--accent)" : "transparent",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {t.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
          <FieldGroup label="Layers">
            <div className="flex gap-3 text-xs" style={{ color: "var(--text-soft)" }}>
              <CheckRow checked={showHeat}       onChange={setShowHeat}       label="Heat" />
              <CheckRow checked={showMarkers}    onChange={setShowMarkers}    label="Prospects" />
              <CheckRow checked={showProperties} onChange={setShowProperties} label="Properties" />
              <CheckRow checked={showParishes}   onChange={setShowParishes}   label="Boundaries" />
            </div>
          </FieldGroup>
          <button onClick={() => load()} disabled={loading} className="btn-primary ml-auto">
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
      </section>

      {/* Stats + parish chip */}
      <div className="flex items-stretch gap-3 mb-4">
        <div className="grid grid-cols-4 gap-3 flex-1">
          <Stat label="Prospects" value={stats.total} />
          <Stat label="Hot (80+)"  value={stats.hot}  color="var(--hot)" />
          <Stat label="Warm (60-79)" value={stats.warm} color="var(--warm)" />
          <Stat label={`Properties${stats.activeProps > 0 ? ` (${stats.activeProps} active)` : ""}`} value={stats.props} color="var(--accent)" />
        </div>
        {parishLabel && (
          <div className="panel flex items-center gap-3 px-4">
            <span className="text-xs" style={{ color: "var(--text-faded)" }}>Filter</span>
            <p className="text-sm font-medium text-text">{parishLabel}</p>
            <button
              onClick={() => handleSelectParish(null)}
              className="text-base hover:text-[var(--hot)] transition-colors"
              style={{ color: "var(--text-soft)" }}
              aria-label="Clear parish/county filter"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <section className="panel px-4 py-2.5 mb-4 flex flex-wrap gap-x-5 gap-y-2 items-center text-xs">
        <span style={{ color: "var(--text-faded)" }}>Prospects</span>
        <KeyRow shape="circle" color="#dc2626" label="80+" />
        <KeyRow shape="circle" color="#f59e0b" label="60–79" />
        <KeyRow shape="circle" color="#eab308" label="40–59" />
        <KeyRow shape="circle" color="#3b82f6" label="<40" />
        <span className="h-3 w-px" style={{ background: "var(--border)" }} />
        <span style={{ color: "var(--text-faded)" }}>Properties</span>
        <KeyRow shape="square" color="#10b981" label="Active" />
        <KeyRow shape="square" color="#3b82f6" label="Pending" />
        <KeyRow shape="square" color="#7c3aed" label="Sold" />
        <KeyRow shape="square" color="#9ca3af" label="Other" />
      </section>

      {/* Map */}
      <div
        ref={mapWrapRef}
        className="panel relative"
        style={{
          padding: "8px",
          height: "720px",
          width: "100%",
          minHeight: "400px",
          minWidth: "600px",
          maxHeight: "1800px",
          maxWidth: "100%",
          overflow: "hidden",
          resize: "both",
        }}
      >
        <div className="absolute inset-[8px]">
          {points.length === 0 && propertyPoints.length === 0 && !loading && !showParishes ? (
            <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--text-faded)" }}>
              No geocoded prospects or properties yet. Click <span className="font-medium mx-1">Geocode missing</span>.
            </div>
          ) : (
            <ProspectMap
              points={points}
              properties={propertyPoints}
              showHeat={showHeat}
              showMarkers={showMarkers}
              showProperties={showProperties}
              showParishes={showParishes}
              basemap={basemap}
              selectedParish={selectedParish}
              onSelectParish={handleSelectParish}
            />
          )}
        </div>

        {/* Resize grip in the bottom-right (CSS resize:both) */}
        <div className="absolute bottom-1 right-1 pointer-events-none" style={{ width: "20px", height: "20px" }} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 22 22">
            <line x1="20" y1="6"  x2="6"  y2="20" stroke="var(--text-faded)" strokeWidth="1.2" />
            <line x1="20" y1="11" x2="11" y2="20" stroke="var(--text-faded)" strokeWidth="1.2" />
            <line x1="20" y1="16" x2="16" y2="20" stroke="var(--text-faded)" strokeWidth="1.2" />
          </svg>
        </div>
      </div>

      <p className="text-right text-xs mt-2 mb-8" style={{ color: "var(--text-faded)" }}>
        Drag bottom-right corner · {displayDims.w} × {displayDims.h}
      </p>
    </div>
  );
}

function FieldGroup({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs" style={{ color: "var(--text-faded)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-2xl font-medium" style={{ color: color ?? "var(--text)" }}>
        {value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>
        {label}
      </p>
    </div>
  );
}

function KeyRow({ shape, color, label }: { shape: "circle" | "square"; color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: "var(--text-soft)" }}>
      <span
        className={shape === "circle" ? "w-2.5 h-2.5 rounded-full" : "w-2.5 h-2.5"}
        style={{ background: color, border: "1px solid rgba(255,255,255,0.18)" }}
      />
      {label}
    </span>
  );
}

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
    <div className="h-full w-full flex items-center justify-center text-sm italic" style={{ color: "var(--ink-faded)" }}>
      Surveying terrain…
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

  // Watch the map container for any size change (corner drag, window resize)
  // and surface the current dimensions for display.
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
    <div className="max-w-[1400px] mx-auto flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Masthead */}
      <header className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <p className="stamp">Sheet II · Farm Map</p>
          <p className="stamp-ink">Scale 1:varied · WGS84</p>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-6xl leading-[0.95] text-ink">
              Plat of Operations
            </h1>
            <p className="mt-3 text-base italic max-w-2xl" style={{ color: "var(--ink-soft)" }}>
              Prospects, properties, and parish lines as they sit across the Gulf South.
              Click a parish or county to scope the survey.
            </p>
          </div>
          <button onClick={handleBackfill} disabled={backfilling} className="btn-ghost whitespace-nowrap">
            {backfilling ? "Geocoding…" : "Geocode Missing"}
          </button>
        </div>
        <div className="border-t border-ink/15 mt-4" />
      </header>

      {/* Survey form — filter strip */}
      <section className="panel panel-shadow corner-ornaments p-5 mb-4 relative">
        <span className="corner-tr" />
        <span className="corner-bl" />
        <p className="stamp mb-3">Survey Parameters</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
          <FieldGroup label="Min score">
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="field w-24 text-sm"
            />
          </FieldGroup>
          <FieldGroup label="Jurisdiction">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="field w-28 text-sm"
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
              className="field w-32 text-sm"
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
                    className="tag transition-colors"
                    style={{
                      color: active ? "var(--parchment)" : "var(--ink-soft)",
                      background: active ? "var(--ink)" : "transparent",
                      borderColor: active ? "var(--ink)" : "var(--parchment-edge)",
                    }}
                  >
                    {t.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
          <FieldGroup label="Layers">
            <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-soft)" }}>
              <CheckRow checked={showHeat}       onChange={setShowHeat}       label="Heat" />
              <CheckRow checked={showMarkers}    onChange={setShowMarkers}    label="Prospects" />
              <CheckRow checked={showProperties} onChange={setShowProperties} label="Properties" />
              <CheckRow checked={showParishes}   onChange={setShowParishes}   label="Parish/county lines" />
            </div>
          </FieldGroup>
          <button onClick={() => load()} disabled={loading} className="btn-ink ml-auto">
            {loading ? "Surveying…" : "Apply"}
          </button>
        </div>
      </section>

      {/* Filter chip + stats row */}
      <div className="flex items-stretch gap-3 mb-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 flex-1">
          <Stat folio="01" label="Prospects"  value={stats.total} />
          <Stat folio="02" label="Hot (80+)"  value={stats.hot}   tone="oxblood" />
          <Stat folio="03" label="Warm (60-79)" value={stats.warm} tone="gold" />
          <Stat folio="04" label={`Properties${stats.activeProps > 0 ? ` (${stats.activeProps} active)` : ""}`} value={stats.props} tone="green" />
        </div>
        {parishLabel && (
          <div
            className="panel panel-shadow flex items-center gap-3 px-4 py-2"
            style={{ background: "var(--ink)", borderColor: "var(--ink)", color: "var(--parchment)" }}
          >
            <p className="font-mono text-[0.65rem] tracking-widest uppercase" style={{ color: "var(--kraft)" }}>
              Scoped to
            </p>
            <p className="font-display text-lg">{parishLabel}</p>
            <button
              onClick={() => handleSelectParish(null)}
              className="font-mono text-base hover:text-[var(--oxblood)] transition-colors"
              aria-label="Clear parish/county filter"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Legend — survey key */}
      <section className="panel panel-shadow px-5 py-3 mb-4 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <p className="stamp">Survey Key</p>
        <span className="text-[0.7rem] font-mono uppercase tracking-wider" style={{ color: "var(--ink-faded)" }}>
          Prospects
        </span>
        <KeyRow shape="circle" color="var(--oxblood)"        label="80+" />
        <KeyRow shape="circle" color="var(--gold)"           label="60–79" />
        <KeyRow shape="circle" color="#caa033"               label="40–59" />
        <KeyRow shape="circle" color="var(--slate-blue)"     label="<40" />
        <span className="h-4 w-px" style={{ background: "var(--parchment-edge)" }} />
        <span className="text-[0.7rem] font-mono uppercase tracking-wider" style={{ color: "var(--ink-faded)" }}>
          Properties
        </span>
        <KeyRow shape="square" color="var(--survey-green)"   label="Active" />
        <KeyRow shape="square" color="var(--slate-blue)"     label="Pending" />
        <KeyRow shape="square" color="#7c3aed"               label="Sold" />
        <KeyRow shape="square" color="var(--ink-faded)"      label="Other" />
      </section>

      {/* Map — parchment frame + bottom-right resize via CSS resize:both */}
      <div
        ref={mapWrapRef}
        className="panel relative"
        style={{
          padding: "10px",
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
        {/* Compass rose overlay */}
        <div className="absolute top-5 right-5 z-[400] pointer-events-none">
          <CompassRoseSmall />
        </div>

        {/* Map fills the framed area via absolute positioning so leaflet
            gets explicit dimensions on first mount (heat layer needs them). */}
        <div className="absolute inset-[10px]">
          {points.length === 0 && propertyPoints.length === 0 && !loading && !showParishes ? (
            <div className="h-full flex items-center justify-center text-sm italic" style={{ color: "var(--ink-faded)" }}>
              No geocoded prospects or properties yet. Press <span className="font-mono not-italic mx-1">Geocode Missing</span> to populate coordinates.
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

        {/* Stylized resize grip in the bottom-right. The native CSS handle
            still does the actual work; this just makes it discoverable. */}
        <div
          className="absolute bottom-1 right-1 pointer-events-none"
          style={{ width: "22px", height: "22px" }}
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 22 22">
            <line x1="20" y1="6"  x2="6"  y2="20" stroke="var(--oxblood)" strokeWidth="1.5" />
            <line x1="20" y1="11" x2="11" y2="20" stroke="var(--oxblood)" strokeWidth="1.5" />
            <line x1="20" y1="16" x2="16" y2="20" stroke="var(--oxblood)" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Dimension readout */}
      <div className="flex items-center justify-end gap-3 mt-2 mb-6">
        <span className="font-mono text-[0.65rem] tracking-widest uppercase" style={{ color: "var(--ink-faded)" }}>
          Drag bottom-right corner · {displayDims.w} × {displayDims.h}
        </span>
      </div>
    </div>
  );
}

function FieldGroup({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-mono text-[0.65rem] tracking-widest uppercase" style={{ color: "var(--ink-faded)" }}>
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
        className="accent-[var(--ink)]"
      />
      {label}
    </label>
  );
}

function Stat({ folio, label, value, tone = "ink" }: { folio: string; label: string; value: number; tone?: "ink" | "oxblood" | "gold" | "green" }) {
  const color =
    tone === "oxblood" ? "var(--oxblood)" :
    tone === "gold"    ? "var(--gold)" :
    tone === "green"   ? "var(--survey-green)" :
    "var(--ink)";
  return (
    <div className="panel panel-shadow corner-ornaments p-4 relative">
      <span className="corner-tr" />
      <span className="corner-bl" />
      <p className="font-mono text-[0.6rem] tracking-widest uppercase mb-1" style={{ color: "var(--ink-faded)" }}>
        {folio}
      </p>
      <p className="font-display text-3xl leading-none" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
        {label}
      </p>
    </div>
  );
}

function KeyRow({ shape, color, label }: { shape: "circle" | "square"; color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
      <span
        className={shape === "circle" ? "w-2.5 h-2.5 rounded-full" : "w-2.5 h-2.5"}
        style={{ background: color, border: "1px solid rgba(0,0,0,0.15)" }}
      />
      {label}
    </span>
  );
}


function CompassRoseSmall() {
  return (
    <svg width="56" height="56" viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}>
      <circle cx="50" cy="50" r="46" fill="var(--parchment-deep)" stroke="var(--ink)" strokeWidth="1" opacity="0.95" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="var(--ink)" strokeWidth="0.4" opacity="0.4" />
      <line x1="6"  y1="50" x2="94" y2="50" stroke="var(--ink)" strokeWidth="0.5" opacity="0.4" />
      <line x1="50" y1="6"  x2="50" y2="94" stroke="var(--ink)" strokeWidth="0.5" opacity="0.4" />
      <polygon points="50,10 54,50 50,46 46,50" fill="var(--oxblood)" />
      <polygon points="50,90 54,50 50,54 46,50" fill="var(--ink)" />
      <polygon points="10,50 50,46 46,50 50,54" fill="var(--ink)" opacity="0.7" />
      <polygon points="90,50 50,46 54,50 50,54" fill="var(--ink)" opacity="0.7" />
      <circle cx="50" cy="50" r="2.6" fill="var(--oxblood)" />
      <text x="50" y="16" textAnchor="middle" fontFamily="var(--font-display)" fontSize="9" fill="var(--oxblood)">N</text>
    </svg>
  );
}

"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Link from "next/link";
import type { ProspectGeoPoint, PropertyGeoPoint } from "@/lib/types";

// Default center: Baton Rouge, LA
const DEFAULT_CENTER: [number, number] = [30.4515, -91.1871];

type Basemap = "street" | "satellite";

interface ParishProps {
  state: "LA" | "AR" | "MS";
  name: string;
  lsad: string;
  fips: string;
}

const BASEMAPS: Record<
  Basemap,
  { url: string; attribution: string; maxZoom: number }
> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
};

function scoreColor(score: number | null): string {
  // Cartographer palette — matches /map legend
  if (score == null) return "#3c5871";   // slate-blue
  if (score >= 80)   return "#b04428";   // oxblood
  if (score >= 60)   return "#b8893d";   // gold
  if (score >= 40)   return "#caa033";   // ochre
  return "#3c5871";                      // slate-blue
}

function propertyStatusColor(status: string): string {
  switch (status) {
    case "active":   return "#38563f";  // survey-green
    case "pending":  return "#3c5871";  // slate-blue
    case "sold":     return "#7c3aed";  // purple
    case "withdrawn":return "#8a7e63";  // ink-faded sepia
    default:         return "#8a7e63";  // draft / unknown
  }
}

function squareIcon(color: string, size = 16): L.DivIcon {
  const half = size / 2;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half],
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.4)"></div>`,
  });
}

/**
 * Watches the map container's size and tells Leaflet to recompute when
 * the parent resizes (drag-to-resize handle, window resize, etc.).
 */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/**
 * Anchors zoom-in / zoom-out (the +/- buttons and the keyboard) to the
 * current cursor position, like ArcGIS Online or Google Maps. Wheel zoom
 * is already cursor-anchored by Leaflet default, so we don't touch it.
 */
function CursorAnchoredZoom() {
  const map = useMap();
  useEffect(() => {
    let cursor: L.LatLng | null = null;
    const onMove = (e: L.LeafletMouseEvent) => {
      cursor = e.latlng;
    };
    const onLeave = () => {
      cursor = null;
    };
    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);

    // Patch zoomIn/zoomOut so the default Zoom control + keyboard use
    // setZoomAround(cursor) when the cursor is over the map.
    const origZoomIn  = map.zoomIn.bind(map);
    const origZoomOut = map.zoomOut.bind(map);
    map.zoomIn = function (delta?: number, options?: L.ZoomPanOptions) {
      if (cursor) return map.setZoomAround(cursor, map.getZoom() + (delta ?? 1), options);
      return origZoomIn(delta, options);
    };
    map.zoomOut = function (delta?: number, options?: L.ZoomPanOptions) {
      if (cursor) return map.setZoomAround(cursor, map.getZoom() - (delta ?? 1), options);
      return origZoomOut(delta, options);
    };

    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout", onLeave);
      map.zoomIn  = origZoomIn;
      map.zoomOut = origZoomOut;
    };
  }, [map]);
  return null;
}

function FitToPoints({
  prospects,
  properties,
}: {
  prospects: ProspectGeoPoint[];
  properties: PropertyGeoPoint[];
}) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current) return;
    const all: [number, number][] = [
      ...prospects.map((p) => [p.latitude, p.longitude] as [number, number]),
      ...properties.map((p) => [p.latitude, p.longitude] as [number, number]),
    ];
    if (all.length === 0) return;
    if (all.length === 1) {
      map.setView(all[0], 12);
    } else {
      map.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
    }
    fittedRef.current = true;
  }, [map, prospects, properties]);

  return null;
}

interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

function HeatLayer({ points, enabled }: { points: HeatPoint[]; enabled: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!enabled || points.length === 0) return;

    // The heat layer renders to a canvas sized to the map. If the map
    // container is 0 in either dimension at this moment (e.g. just mounted
    // inside a still-resizing flex parent), getImageData on the canvas
    // throws. Defer the add until the next animation frame and only attach
    // when the map has a non-zero size.
    let raf = 0;
    let cancelled = false;
    const attach = () => {
      if (cancelled) return;
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        raf = requestAnimationFrame(attach);
        return;
      }
      const data = points.map(
        (p): [number, number, number] => [p.lat, p.lng, p.intensity]
      );
      const heat = (L as unknown as {
        heatLayer: (
          data: [number, number, number][],
          opts: Record<string, unknown>
        ) => L.Layer;
      }).heatLayer(data, {
        radius: 25,
        blur: 20,
        maxZoom: 15,
        max: 1.0,
      });
      heat.addTo(map);
      layerRef.current = heat;
    };
    attach();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, enabled]);

  return null;
}

interface ParishOverlayProps {
  data: FeatureCollection<Geometry, ParishProps> | null;
  selected: { state: string; name: string } | null;
  onSelect: (sel: { state: string; name: string } | null) => void;
  basemap: Basemap;
}

function ParishOverlay({ data, selected, onSelect, basemap }: ParishOverlayProps) {
  // Force remount when basemap changes so line color stays legible
  // against the new tiles.
  const key = `${basemap}-${data?.features.length ?? 0}`;
  if (!data) return null;

  const lineColor = basemap === "satellite" ? "#f3e8d0" : "#1a2330"; // parchment / ink

  return (
    <GeoJSON
      key={key}
      data={data}
      style={(feat) => {
        const p = feat?.properties as ParishProps | undefined;
        const isSelected =
          !!selected &&
          !!p &&
          p.state === selected.state &&
          p.name === selected.name;
        return {
          color: lineColor,
          weight: isSelected ? 2.5 : 0.8,
          opacity: isSelected ? 0.9 : 0.55,
          fillColor: isSelected ? "#b04428" : "#000000", // oxblood when selected
          fillOpacity: isSelected ? 0.16 : 0.0,
        };
      }}
      onEachFeature={(feat: Feature<Geometry, ParishProps>, layer) => {
        const p = feat.properties;
        if (!p) return;
        const label = p.lsad === "Parish" ? "Parish" : "County";
        layer.bindTooltip(`${p.name} ${label} (${p.state})`, { sticky: true });
        layer.on({
          click: () => {
            const already =
              !!selected &&
              selected.state === p.state &&
              selected.name === p.name;
            onSelect(already ? null : { state: p.state, name: p.name });
          },
        });
      }}
    />
  );
}

interface ProspectMapProps {
  points: ProspectGeoPoint[];
  properties?: PropertyGeoPoint[];
  showHeat: boolean;
  showMarkers: boolean;
  showProperties?: boolean;
  showParishes: boolean;
  basemap: Basemap;
  selectedParish: { state: string; name: string } | null;
  onSelectParish: (sel: { state: string; name: string } | null) => void;
}

export default function ProspectMap({
  points,
  properties = [],
  showHeat,
  showMarkers,
  showProperties = true,
  showParishes,
  basemap,
  selectedParish,
  onSelectParish,
}: ProspectMapProps) {
  const [parishData, setParishData] =
    useState<FeatureCollection<Geometry, ParishProps> | null>(null);

  useEffect(() => {
    if (!showParishes || parishData) return;
    let cancelled = false;
    fetch("/parishes-la-ar-ms.geojson")
      .then((r) => r.json())
      .then((d: FeatureCollection<Geometry, ParishProps>) => {
        if (!cancelled) setParishData(d);
      })
      .catch(() => {
        // silent; overlay just stays empty
      });
    return () => {
      cancelled = true;
    };
  }, [showParishes, parishData]);

  const center = useMemo<[number, number]>(() => {
    const all: { latitude: number; longitude: number }[] = [...points, ...properties];
    if (all.length === 0) return DEFAULT_CENTER;
    const lat = all.reduce((s, p) => s + p.latitude, 0) / all.length;
    const lng = all.reduce((s, p) => s + p.longitude, 0) / all.length;
    return [lat, lng];
  }, [points, properties]);

  const heatPoints = useMemo<HeatPoint[]>(
    () =>
      points.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        intensity:
          p.ai_prospect_score != null
            ? Math.max(0.2, p.ai_prospect_score / 100)
            : 0.3,
      })),
    [points]
  );

  const tiles = BASEMAPS[basemap];

  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom
      zoomSnap={0.25}
      zoomDelta={1}
      wheelPxPerZoomLevel={80}
      wheelDebounceTime={20}
      zoomAnimation
      fadeAnimation
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        key={basemap}
        attribution={tiles.attribution}
        url={tiles.url}
        maxZoom={tiles.maxZoom}
      />
      <FitToPoints prospects={points} properties={properties} />
      <ResizeWatcher />
      <CursorAnchoredZoom />
      {showParishes && (
        <ParishOverlay
          data={parishData}
          selected={selectedParish}
          onSelect={onSelectParish}
          basemap={basemap}
        />
      )}
      <HeatLayer points={heatPoints} enabled={showHeat} />
      {showMarkers &&
        points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={p.ai_prospect_score != null && p.ai_prospect_score >= 80 ? 12 : 9}
            pathOptions={{
              color: "#f3e8d0",
              fillColor: scoreColor(p.ai_prospect_score),
              fillOpacity: 0.92,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-semibold">{p.property_address}</div>
                <div className="text-gray-600">
                  {p.property_city || "—"}, {p.property_state || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Type:</span> {p.prospect_type}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span> {p.status}
                </div>
                {p.ai_prospect_score != null && (
                  <div>
                    <span className="text-gray-500">Score:</span>{" "}
                    <span style={{ color: scoreColor(p.ai_prospect_score) }}>
                      {p.ai_prospect_score.toFixed(0)}
                    </span>
                  </div>
                )}
                <Link
                  href={`/prospects/${p.id}`}
                  className="block text-emerald-600 hover:underline pt-1"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      {showProperties &&
        properties.map((prop) => (
          <Marker
            key={prop.id}
            position={[prop.latitude, prop.longitude]}
            icon={squareIcon(propertyStatusColor(prop.status))}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-semibold">{prop.street_address}</div>
                <div className="text-gray-600">
                  {prop.city || "—"}, {prop.state || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Type:</span> {prop.property_type}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <span style={{ color: propertyStatusColor(prop.status) }}>
                    {prop.status}
                  </span>
                </div>
                {prop.asking_price != null && (
                  <div>
                    <span className="text-gray-500">Asking:</span> $
                    {prop.asking_price.toLocaleString()}
                  </div>
                )}
                <Link
                  href={`/properties/${prop.id}`}
                  className="block text-emerald-600 hover:underline pt-1"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}

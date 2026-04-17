"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import Link from "next/link";
import type { ProspectGeoPoint } from "@/lib/types";

// Default center: Baton Rouge, LA
const DEFAULT_CENTER: [number, number] = [30.4515, -91.1871];

function scoreColor(score: number | null): string {
  if (score == null) return "#3b82f6";
  if (score >= 80) return "#dc2626";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#eab308";
  return "#3b82f6";
}

function FitToPoints({ points }: { points: ProspectGeoPoint[] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 12);
    } else {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
    fittedRef.current = true;
  }, [map, points]);

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

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, enabled]);

  return null;
}

interface ProspectMapProps {
  points: ProspectGeoPoint[];
  showHeat: boolean;
  showMarkers: boolean;
}

export default function ProspectMap({
  points,
  showHeat,
  showMarkers,
}: ProspectMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return DEFAULT_CENTER;
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    return [lat, lng];
  }, [points]);

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

  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPoints points={points} />
      <HeatLayer points={heatPoints} enabled={showHeat} />
      {showMarkers &&
        points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={p.ai_prospect_score != null && p.ai_prospect_score >= 80 ? 12 : 9}
            pathOptions={{
              color: "#ffffff",
              fillColor: scoreColor(p.ai_prospect_score),
              fillOpacity: 0.9,
              weight: 2,
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
    </MapContainer>
  );
}

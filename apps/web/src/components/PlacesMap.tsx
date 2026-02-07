'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { LatLngTuple } from 'leaflet';
// Leaflet CSS (required for markers and map tiles)
import 'leaflet/dist/leaflet.css';

export type MapBranch = {
  _id?: string;
  name?: string;
  address?: {
    street_number?: string;
    street_name?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
};

export type MapAtm = {
  _id?: string;
  name?: string;
  geocode?: { lat?: number; lng?: number };
};

function fmtAddr(a: MapBranch['address']): string {
  if (!a) return '';
  const parts = [
    [a.street_number, a.street_name].filter(Boolean).join(' ').trim(),
    [a.city, a.state, a.zip].filter(Boolean).join(' ').trim(),
  ]
    .filter(Boolean)
    .join(', ');
  return parts;
}

async function geocodeAddress(address: string): Promise<LatLngTuple | null> {
  if (!address.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
      })}`,
      { headers: { Accept: 'application/json' } },
    );
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = data?.[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

const MapInner = dynamic(
  async () => {
    const L = await import('leaflet');
    const { MapContainer, TileLayer, Marker, Popup, useMap } = await import('react-leaflet');

    if (typeof window !== 'undefined' && L.default?.Icon?.Default) {
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }

    function FitBounds({ points }: { points: LatLngTuple[] }) {
      const map = useMap();
      React.useEffect(() => {
        if (points.length < 2) return;
        map.fitBounds(points as [LatLngTuple, LatLngTuple], { padding: [24, 24], maxZoom: 14 });
      }, [map, points]);
      return null;
    }

    return function PlacesMapInner(props: {
      center: LatLngTuple;
      atms: MapAtm[];
      branchCoords: Array<{ name: string; addr: string; pos: LatLngTuple }>;
    }) {
      const { center, atms, branchCoords } = props;
      const atmPoints: LatLngTuple[] = atms
        .map((a) => {
          const lat = Number(a.geocode?.lat);
          const lng = Number(a.geocode?.lng);
          return Number.isFinite(lat) && Number.isFinite(lng) ? ([lat, lng] as LatLngTuple) : null;
        })
        .filter((p): p is LatLngTuple => p != null);
      const branchPoints = branchCoords.map((b) => b.pos);
      const allPoints = [center, ...atmPoints, ...branchPoints];
      const hasMultiple = allPoints.length >= 2;

      return (
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%', minHeight: 320, borderRadius: 14 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasMultiple && <FitBounds points={allPoints} />}
          <Marker position={center}>
            <Popup>Search center (your query)</Popup>
          </Marker>
          {atms.map((a, idx) => {
            const lat = Number(a.geocode?.lat);
            const lng = Number(a.geocode?.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return (
              <Marker key={String(a._id ?? `atm-${idx}`)} position={[lat, lng] as LatLngTuple}>
                <Popup>{a.name || 'ATM'}</Popup>
              </Marker>
            );
          })}
          {branchCoords.map((b, idx) => (
            <Marker key={`branch-${idx}`} position={b.pos}>
              <Popup>
                <strong>{b.name}</strong>
                <br />
                {b.addr}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      );
    };
  },
  { ssr: false },
);

export function PlacesMap(props: {
  centerLat: number;
  centerLng: number;
  branches?: MapBranch[] | null;
  atms?: MapAtm[] | null;
}) {
  const { centerLat, centerLng, branches = [], atms = [] } = props;
  const center: LatLngTuple = [centerLat, centerLng];
  const [branchCoords, setBranchCoords] = React.useState<
    Array<{ name: string; addr: string; pos: LatLngTuple }>
  >([]);

  React.useEffect(() => {
    if (!branches?.length) {
      setBranchCoords([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const results: Array<{ name: string; addr: string; pos: LatLngTuple }> = [];
      for (const b of branches.slice(0, 15)) {
        if (cancelled) break;
        const addr = fmtAddr(b.address);
        if (!addr) continue;
        const pos = await geocodeAddress(addr);
        if (cancelled) break;
        if (pos) results.push({ name: b.name || 'Branch', addr, pos });
        await new Promise((r) => setTimeout(r, 1100));
      }
      if (!cancelled) setBranchCoords(results);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [branches]);

  return (
    <div style={{ height: 360, width: '100%', position: 'relative' }}>
      <MapInner
        center={center}
        atms={Array.isArray(atms) ? atms : []}
        branchCoords={branchCoords}
      />
    </div>
  );
}

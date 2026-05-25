"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import type { Centro } from "@/lib/types";

// Fix iconos
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Props {
  centros: Centro[];
}

export default function MapaLeaflet({ centros }: Props) {
  const conCoords = centros.filter((c) => c.lat != null && c.lng != null);

  return (
    <MapContainer
      center={[40.416775, -3.70379]} // Centro de Madrid
      zoom={9}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading>
        {conCoords.map((c) => (
          <Marker key={c.codigo} position={[c.lat!, c.lng!]}>
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-semibold text-ink-900 leading-snug">{c.centro}</p>
                <p className="text-ink-500 text-xs mt-0.5">
                  {c.localidad} · {c.dat ?? "—"}
                </p>
                {c.tipo && (
                  <p className="text-ink-500 text-xs">{c.tipo}</p>
                )}
                <a
                  href={`/centro/${c.codigo}`}
                  className="mt-2 inline-block text-xs text-madrid-600 font-semibold hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver ficha →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

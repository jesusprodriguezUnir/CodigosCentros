"use client";

import { ExternalLink, Navigation, Camera } from "lucide-react";

interface Props {
  lat: number;
  lng: number;
  nombre: string;
  direccion?: string;
  height?: number;
}

export function MapaGoogleEmbed({ lat, lng, nombre, direccion, height = 420 }: Props) {
  const q = encodeURIComponent(direccion ? `${nombre}, ${direccion}` : `${lat},${lng}`);
  const src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;

  return (
    <div>
      <iframe
        src={src}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Mapa de ${nombre}`}
      />
      <div className="flex gap-2 p-3 border-t border-ink-100">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-madrid-50 border border-madrid-200 px-2 py-2 text-xs font-semibold text-madrid-700 hover:bg-madrid-100 transition-colors"
        >
          <Navigation className="h-3.5 w-3.5" />
          Cómo llegar
        </a>
        <a
          href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-50 border border-ink-200 px-2 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          Street View
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-50 border border-ink-200 px-2 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}

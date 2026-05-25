"use client";

import dynamic from "next/dynamic";

const MapaCentro = dynamic(() => import("./MapaCentro"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center bg-ink-50 text-sm text-ink-500">
      Cargando mapa…
    </div>
  ),
});

export { MapaCentro };

export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

export async function geocodificar(texto: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${texto}, Madrid, España`);
  url.searchParams.set("lang", "es");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error("Error al geocodificar");
  const json = await res.json();

  return (json.features ?? []).map(
    (f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
      label: [f.properties.name, f.properties.street, f.properties.housenumber, f.properties.city]
        .filter(Boolean)
        .join(", "),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    })
  );
}

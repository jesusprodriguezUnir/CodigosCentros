"""generar_dat_geojson.py

Genera data/dat-madrid.geojson con los 5 polígonos DAT de la Comunidad de Madrid,
disolviendo los límites municipales de OpenStreetMap agrupados por DAT según
el dataset oficial de centros educativos de la CM.

Pasos:
  1. Descarga el CSV oficial de centros (datos.comunidad.madrid) — mismo que usa ingesta_centros.py
  2. Construye el mapping municipio → DAT
  3. Descarga polígonos municipales de la CM desde Overpass API (OSM)
  4. Disuelve por DAT con shapely y guarda data/dat-madrid.geojson

Uso:
    pip install pandas requests shapely
    python generar_dat_geojson.py
    python generar_dat_geojson.py --force   # re-descarga aunque haya caché

El archivo generado puede usarse directamente con ingesta_centros.py.
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import unicodedata
from pathlib import Path

import pandas as pd
import requests
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.ops import unary_union

# ──────────────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(exist_ok=True)
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

DAT_GEOJSON = DATA_DIR / "dat-madrid.geojson"
CSV_CACHE = OUT_DIR / "centros_cm_cache.csv"
OVERPASS_CACHE = OUT_DIR / "overpass_municipios.json"

CM_CSV_URL = (
    "https://datos.comunidad.madrid/catalogo/dataset/"
    "c750856d-3166-4dac-8e80-d1b824c968b5/resource/"
    "28d60557-1d73-4281-ab08-6cfd3b2f5f83/download/centros_educativos.csv"
)

# Nombres canónicos que queremos en el GeoJSON de salida
# IMPORTANTE: "oeste" debe ir antes de "este" porque "este" es substring de "oeste"
DAT_CANON = {
    "capital":  "DAT Capital",
    "norte":    "DAT Norte",
    "sur":      "DAT Sur",
    "oeste":    "DAT Oeste",
    "este":     "DAT Este",
}

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def sin_acentos(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    ).lower().strip()


def normalizar_dat(raw: str) -> str | None:
    """Convierte el valor crudo de la columna DAT al nombre canónico."""
    r = sin_acentos(raw)
    for clave, canon in DAT_CANON.items():
        if clave in r:
            return canon
    return None


# ──────────────────────────────────────────────────────────────────────────────
# 1. Descargar CSV de la CM y extraer mapping municipio → DAT
# ──────────────────────────────────────────────────────────────────────────────

def descargar_csv(force: bool = False) -> pd.DataFrame:
    if CSV_CACHE.exists() and not force:
        print(f"  Usando caché CSV: {CSV_CACHE}")
        raw = CSV_CACHE.read_bytes()
    else:
        print(f"  Descargando CSV desde datos.comunidad.madrid…")
        resp = requests.get(CM_CSV_URL, timeout=90)
        resp.raise_for_status()
        raw = resp.content
        CSV_CACHE.write_bytes(raw)
        print(f"  Guardado en {CSV_CACHE}")

    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("latin-1", errors="replace")

    first = text.split("\n", 1)[0]
    sep = ";" if first.count(";") > first.count(",") else ","
    df = pd.read_csv(io.StringIO(text), sep=sep, dtype=str, low_memory=False)
    df.columns = [c.strip().upper() for c in df.columns]
    return df


def construir_mapping_dat(df: pd.DataFrame) -> dict[str, str]:
    """municipio_normalizado → DAT canónico"""
    mun_col = None
    for c in ["MUNICIPIO", "NOM_MUNICIPIO", "LOCALIDAD"]:
        if c in df.columns:
            mun_col = c
            break
    dat_col = None
    for c in ["DAT", "DISTRITO_TERRITORIAL", "DISTRITO_TERRITORIAL_EDUCATIVO"]:
        if c in df.columns:
            dat_col = c
            break

    if not mun_col or not dat_col:
        print(f"  ⚠ Columnas disponibles: {list(df.columns)}", file=sys.stderr)
        raise RuntimeError(
            f"No se encontraron columnas de municipio ({mun_col}) o DAT ({dat_col}) en el CSV."
        )

    print(f"  Columnas usadas: municipio='{mun_col}', dat='{dat_col}'")

    mapping: dict[str, str] = {}
    sin_dat = 0
    for _, row in df.iterrows():
        mun = str(row[mun_col]).strip() if pd.notna(row[mun_col]) else ""
        dat_raw = str(row[dat_col]).strip() if pd.notna(row[dat_col]) else ""
        if not mun or not dat_raw or dat_raw.upper() in ("NAN", ""):
            sin_dat += 1
            continue
        dat_canon = normalizar_dat(dat_raw)
        if dat_canon:
            key = sin_acentos(mun)
            if key not in mapping:
                mapping[key] = dat_canon

    total = len(df)
    encontrados = len(mapping)
    print(f"  → {encontrados} municipios con DAT de {total} filas ({sin_dat} sin DAT)")

    # Mostrar distribución
    from collections import Counter
    dist = Counter(mapping.values())
    for dat, n in sorted(dist.items()):
        print(f"     {dat}: {n} municipios")

    return mapping


# ──────────────────────────────────────────────────────────────────────────────
# 2. Descargar polígonos municipales desde Overpass
# ──────────────────────────────────────────────────────────────────────────────

OVERPASS_QUERY = """
[out:json][timeout:180];
area["name"="Comunidad de Madrid"]["admin_level"="4"]->.cm;
(
  relation["admin_level"="8"]["boundary"="administrative"](area.cm);
  way["admin_level"="8"]["boundary"="administrative"](area.cm);
);
out geom;
"""


OVERPASS_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
    "User-Agent": "dat-madrid-geojson/1.0 (educational boundaries generator)",
}


def descargar_overpass(force: bool = False) -> dict:
    if OVERPASS_CACHE.exists() and not force:
        print(f"  Usando caché Overpass: {OVERPASS_CACHE}")
        return json.loads(OVERPASS_CACHE.read_text(encoding="utf-8"))

    print("  Consultando Overpass API (puede tardar ~30-60s)…")
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://z.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    last_err = None
    for url in endpoints:
        try:
            resp = requests.post(
                url,
                data=OVERPASS_QUERY.encode("utf-8"),
                headers=OVERPASS_HEADERS,
                timeout=200,
            )
            resp.raise_for_status()
            data = resp.json()
            OVERPASS_CACHE.write_text(
                json.dumps(data, ensure_ascii=False), encoding="utf-8"
            )
            print(f"  → {len(data.get('elements', []))} elementos descargados")
            return data
        except Exception as e:
            print(f"  ⚠ Fallo en {url}: {e}", file=sys.stderr)
            last_err = e
    raise RuntimeError(f"Todos los endpoints de Overpass fallaron: {last_err}")


# ──────────────────────────────────────────────────────────────────────────────
# 3. Reconstruir polígonos shapely desde Overpass JSON
# ──────────────────────────────────────────────────────────────────────────────

def _coords_way(geom: list) -> list[tuple[float, float]]:
    return [(n["lon"], n["lat"]) for n in geom]


def _polygon_from_way(element: dict) -> Polygon | None:
    coords = _coords_way(element.get("geometry", []))
    if len(coords) < 4:
        return None
    try:
        p = Polygon(coords)
        return p if p.is_valid else p.buffer(0)
    except Exception:
        return None


def _polygon_from_relation(element: dict) -> Polygon | MultiPolygon | None:
    """Reconstruye el polígono de un municipio (relation) a partir de sus members."""
    outers: list[list] = []
    inners: list[list] = []
    for member in element.get("members", []):
        geom = member.get("geometry", [])
        if not geom:
            continue
        coords = _coords_way(geom)
        if len(coords) < 3:
            continue
        role = member.get("role", "outer")
        if role == "outer":
            outers.append(coords)
        elif role == "inner":
            inners.append(coords)

    if not outers:
        return None

    try:
        outer_polys = [Polygon(c) for c in outers]
        outer_union = unary_union([p.buffer(0) if not p.is_valid else p for p in outer_polys])

        if inners:
            inner_polys = [Polygon(c) for c in inners]
            inner_union = unary_union([p.buffer(0) if not p.is_valid else p for p in inner_polys])
            result = outer_union.difference(inner_union)
            return result if result.is_valid else result.buffer(0)

        return outer_union if outer_union.is_valid else outer_union.buffer(0)
    except Exception:
        return None


def extraer_nombre_osm(element: dict) -> str:
    """Obtiene el nombre del elemento OSM."""
    tags = element.get("tags", {})
    return (
        tags.get("name:es")
        or tags.get("name")
        or tags.get("alt_name")
        or ""
    )


def construir_poligonos_municipios(overpass_data: dict) -> list[tuple[str, object]]:
    """Devuelve [(nombre_osm, shapely_geometry), ...]"""
    resultados = []
    sin_geom = 0
    for el in overpass_data.get("elements", []):
        nombre = extraer_nombre_osm(el)
        if not nombre:
            continue
        if el["type"] == "way":
            poly = _polygon_from_way(el)
        elif el["type"] == "relation":
            poly = _polygon_from_relation(el)
        else:
            continue
        if poly is None or poly.is_empty:
            sin_geom += 1
            continue
        resultados.append((nombre, poly))

    print(f"  → {len(resultados)} municipios con geometría ({sin_geom} sin geometría)")
    return resultados


# ──────────────────────────────────────────────────────────────────────────────
# 4. Asignar DAT y disolver
# ──────────────────────────────────────────────────────────────────────────────

def asignar_y_disolver(
    poligonos: list[tuple[str, object]],
    mapping_dat: dict[str, str],
) -> dict[str, list]:
    """Devuelve {dat_canon: [shapely_geom, ...]}"""
    grupos: dict[str, list] = {v: [] for v in DAT_CANON.values()}
    no_match: list[str] = []

    for nombre, poly in poligonos:
        clave = sin_acentos(nombre)
        dat = mapping_dat.get(clave)

        if dat is None:
            # Intentar coincidencia parcial
            for key_mun, dat_v in mapping_dat.items():
                if clave == key_mun or clave.startswith(key_mun) or key_mun.startswith(clave):
                    dat = dat_v
                    break

        if dat and dat in grupos:
            grupos[dat].append(poly)
        else:
            no_match.append(nombre)

    print(f"  Municipios sin DAT asignado: {len(no_match)}")
    if no_match:
        print(f"     Ejemplos: {no_match[:10]}")

    for dat, polys in grupos.items():
        print(f"     {dat}: {len(polys)} municipios")

    return grupos


def disolver_por_dat(grupos: dict[str, list]) -> list[dict]:
    """Genera las features GeoJSON para cada DAT."""
    features = []
    for dat, polys in sorted(grupos.items()):
        if not polys:
            print(f"  ⚠ {dat}: ningún municipio asignado, DAT omitida", file=sys.stderr)
            continue
        try:
            union = unary_union(polys)
            if not union.is_valid:
                union = union.buffer(0)
            geom = mapping(union)
            features.append({
                "type": "Feature",
                "properties": {"nombre": dat},
                "geometry": geom,
            })
            print(f"  {dat}: polígono creado ({union.geom_type})")
        except Exception as e:
            print(f"  ⚠ Error al disolver {dat}: {e}", file=sys.stderr)
    return features


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Genera data/dat-madrid.geojson")
    parser.add_argument("--force", action="store_true", help="Re-descarga datos aunque haya caché")
    args = parser.parse_args()

    print("=== Paso 1: Descargar CSV de centros educativos (CM) ===")
    df = descargar_csv(force=args.force)
    mapping_dat = construir_mapping_dat(df)

    if not mapping_dat:
        print("ERROR: No se pudo construir el mapping municipio→DAT. Revisa el CSV.", file=sys.stderr)
        sys.exit(1)

    print("\n=== Paso 2: Descargar límites municipales (Overpass/OSM) ===")
    overpass_data = descargar_overpass(force=args.force)

    print("\n=== Paso 3: Reconstruir polígonos municipales ===")
    poligonos = construir_poligonos_municipios(overpass_data)

    if not poligonos:
        print("ERROR: No se obtuvieron polígonos de Overpass.", file=sys.stderr)
        sys.exit(1)

    print("\n=== Paso 4: Asignar DAT y disolver polígonos ===")
    grupos = asignar_y_disolver(poligonos, mapping_dat)
    features = disolver_por_dat(grupos)

    if not features:
        print("ERROR: No se generó ninguna feature. Revisa el mapping.", file=sys.stderr)
        sys.exit(1)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    DAT_GEOJSON.write_text(
        json.dumps(geojson, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n✓ Guardado: {DAT_GEOJSON}")
    print(f"  {len(features)} DAT features: {[f['properties']['nombre'] for f in features]}")


if __name__ == "__main__":
    main()

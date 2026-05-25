"""ingesta_centros.py — Semana 1

Descarga el dataset de centros educativos de la Comunidad de Madrid,
enriquece los datos (coords WGS84, DAT, vacantes históricas) y hace
UPSERT en Supabase.

Uso:
    python ingesta_centros.py             # ingesta real
    python ingesta_centros.py --dry-run   # valida sin escribir en DB
    python ingesta_centros.py --force     # fuerza re-descarga del CSV

Requisitos:
    pip install pandas pyproj shapely supabase requests openpyxl tqdm
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from pyproj import Transformer
from shapely.geometry import Point, shape
from supabase import create_client, Client
from tqdm import tqdm

# ──────────────────────────────────────────────────────────────────────────────
# Rutas
# ──────────────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
EXCEL_VACANTES = ROOT / "2026" / "salida" / "consolidado_2526.xlsx"
DAT_GEOJSON = ROOT / "data" / "dat-madrid.geojson"
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# URL del dataset oficial (CSV directo de datos.comunidad.madrid)
# Si el enlace cambia, actualizar aquí.
# ──────────────────────────────────────────────────────────────────────────────
CM_CSV_URL = (
    "https://datos.comunidad.madrid/catalogo/dataset/"
    "c750856d-3166-4dac-8e80-d1b824c968b5/resource/"
    "28d60557-1d73-4281-ab08-6cfd3b2f5f83/download/centros_educativos.csv"
)
CM_CSV_CACHE = ROOT / "out" / "centros_cm_cache.csv"

# Transformador UTM ETRS89 30N (EPSG:25830) → WGS84 (EPSG:4326)
UTM_TO_WGS84 = Transformer.from_crs("EPSG:25830", "EPSG:4326", always_xy=True)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers de texto (reutilizados de generar_json.py)
# ──────────────────────────────────────────────────────────────────────────────

def fix_mojibake(value: str) -> str:
    if not isinstance(value, str):
        return value
    try:
        return value.encode("cp1252", errors="strict").decode("utf-8", errors="strict")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value.replace("", "").replace("?", "")


def sin_acentos(value: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", value)
        if unicodedata.category(c) != "Mn"
    ).lower()


def canonicalizar_localidades(df: pd.DataFrame, col: str = "municipio") -> pd.DataFrame:
    df = df.copy()
    df["_clave"] = df[col].map(lambda v: sin_acentos(str(v)) if pd.notna(v) else "")
    canon: dict[str, str] = {}
    for clave, grupo in df.groupby("_clave"):
        if not clave:
            continue
        candidatos = grupo[col].dropna().unique().tolist()
        candidatos.sort(key=lambda s: (-sum(1 for c in s if ord(c) > 127), -len(s)))
        canon[clave] = candidatos[0]
    df[col] = df["_clave"].map(lambda k: canon.get(k, ""))
    return df.drop(columns=["_clave"])


# ──────────────────────────────────────────────────────────────────────────────
# Descarga del CSV de la CM
# ──────────────────────────────────────────────────────────────────────────────

def descargar_csv(force: bool = False) -> pd.DataFrame:
    if CM_CSV_CACHE.exists() and not force:
        print(f"Usando caché: {CM_CSV_CACHE}")
        raw = CM_CSV_CACHE.read_bytes()
    else:
        print(f"Descargando CSV desde {CM_CSV_URL}…")
        resp = requests.get(CM_CSV_URL, timeout=60)
        resp.raise_for_status()
        raw = resp.content
        CM_CSV_CACHE.write_bytes(raw)
        print(f"CSV guardado en caché: {CM_CSV_CACHE}")

    # Intentar decodificación: primero UTF-8, luego latin-1
    for enc in ("utf-8-sig", "latin-1", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("latin-1", errors="replace")

    # Detectar separador (coma o punto y coma)
    first_line = text.split("\n", 1)[0]
    sep = ";" if first_line.count(";") > first_line.count(",") else ","

    df = pd.read_csv(io.StringIO(text), sep=sep, dtype=str, low_memory=False)
    df.columns = [c.strip().upper() for c in df.columns]
    print(f"  → {len(df)} filas, columnas: {list(df.columns[:10])}…")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Mapeo de columnas del dataset CM
# Ajustar según los nombres reales del CSV descargado.
# ──────────────────────────────────────────────────────────────────────────────
COL_MAP = {
    # campo interno → posibles nombres en el CSV (primero que exista se usa)
    # Nombres reales del dataset datos.comunidad.madrid (mayo 2026)
    "codigo":       ["CODIGO", "COD_CENTRO", "CODIGO_CENTRO", "CD_CENTRO"],
    "nombre":       ["CENTRO", "NOMBRE", "DENOMINACION", "NOMBRE_CENTRO"],
    "municipio":    ["MUNICIPIO", "LOCALIDAD", "NOM_MUNICIPIO"],
    "dat":          ["DAT", "DISTRITO_TERRITORIAL", "DISTRITO_TERRITORIAL_EDUCATIVO"],
    "tipo":         ["TIPO_EXT", "TIPO_ABRV", "TIPO_CENTRO", "TIPOLOGIA_GENERAL", "TIPO"],
    "titularidad":  ["TITULARIDAD", "TITULARIDAD_CENTRO"],
    "jornada":      ["JORNADA", "JORNADA_ESCOLAR"],
    "bilingue":     ["BILINGUE", "CENTRO_BILINGUE", "NUM_IDIOMAS_BILINGUE"],
    "idiomas":      ["IDIOMAS_BILINGUE", "IDIOMA_BILINGUE", "IDIOMAS"],
    "etapa":        ["ETAPAS", "ETAPA", "NIVEL_EDUCATIVO"],
    "utm_x":        ["UTM_X", "COORDENADA_X_UTM", "X_UTM", "COORD_X"],
    "utm_y":        ["UTM_Y", "COORDENADA_Y_UTM", "Y_UTM", "COORD_Y"],
    "direccion":    ["DOMICILIO", "DIRECCION", "DIRECCION_CENTRO"],
    "cp":           ["CDPOSTAL", "CP", "COD_POSTAL", "CODIGO_POSTAL"],
    "telefono":     ["TELEFONO", "TELEFONO_CENTRO"],
    "email":        ["E_MAIL", "EMAIL", "CORREO_ELECTRONICO", "EMAIL_CENTRO"],
}


def resolver_columna(df: pd.DataFrame, candidatos: list[str]) -> pd.Series:
    for col in candidatos:
        if col in df.columns:
            return df[col].fillna("").astype(str).str.strip()
    return pd.Series([""] * len(df), index=df.index)


# ──────────────────────────────────────────────────────────────────────────────
# Conversión de coordenadas
# ──────────────────────────────────────────────────────────────────────────────

def utm_a_wgs84(x_str: str, y_str: str) -> tuple[float | None, float | None]:
    try:
        x = float(x_str.replace(",", "."))
        y = float(y_str.replace(",", "."))
        if x == 0 or y == 0:
            return None, None
        lng, lat = UTM_TO_WGS84.transform(x, y)
        # Sanity check: Madrid está entre 39.5-41.5 N y 5.5W-2W
        if not (39.0 <= lat <= 42.0 and -6.0 <= lng <= -1.5):
            return None, None
        return round(lat, 7), round(lng, 7)
    except (ValueError, TypeError):
        return None, None


# ──────────────────────────────────────────────────────────────────────────────
# DAT por intersección geoespacial
# ──────────────────────────────────────────────────────────────────────────────

_DAT_CANON = {
    "capital": "DAT Capital",
    "norte":   "DAT Norte",
    "sur":     "DAT Sur",
    "oeste":   "DAT Oeste",
    "este":    "DAT Este",
}


def _normalizar_dat(raw: str) -> str | None:
    r = sin_acentos(raw)
    for clave, canon in _DAT_CANON.items():
        if clave in r:
            return canon
    return None


def cargar_dat_poligonos() -> list[tuple[str, Any]]:
    """Devuelve lista de (nombre_dat, shapely_polygon)."""
    if not DAT_GEOJSON.exists():
        print(
            f"⚠  No se encontró {DAT_GEOJSON}. La DAT se tomará del campo del CSV (si existe).",
            file=sys.stderr,
        )
        return []
    gj = json.loads(DAT_GEOJSON.read_text(encoding="utf-8"))
    polys = []
    for feat in gj.get("features", []):
        nombre = (
            feat.get("properties", {}).get("nombre")
            or feat.get("properties", {}).get("DAT")
            or feat.get("properties", {}).get("name")
            or "Desconocida"
        )
        polys.append((nombre, shape(feat["geometry"])))
    print(f"DAT polígonos cargados: {[n for n, _ in polys]}")
    return polys


def resolver_dat(lat: float | None, lng: float | None, polys: list) -> str | None:
    if lat is None or not polys:
        return None
    pt = Point(lng, lat)
    for nombre, poly in polys:
        if poly.contains(pt):
            return nombre
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Cargar vacantes del consolidado Excel
# ──────────────────────────────────────────────────────────────────────────────

def cargar_vacantes() -> dict[str, dict]:
    """Devuelve dict[codigo_centro] → vacantes JSONB."""
    print(f"Cargando vacantes desde {EXCEL_VACANTES}…")
    df = pd.read_excel(EXCEL_VACANTES, dtype=str)
    df["Cod_Centro"] = df["Cod_Centro"].str.zfill(8)
    vacantes: dict[str, dict] = {}
    for _, row in df.iterrows():
        cod = str(row["Cod_Centro"]).strip()
        vacantes[cod] = {
            "c2223":       int(float(row.get("Vacantes_2223", 0) or 0)),
            "c2324":       int(float(row.get("Vacantes_2324", 0) or 0)),
            "c2425":       int(float(row.get("Vacantes_2425", 0) or 0)),
            "c2526Rh09":   int(float(row.get("Vacantes_2526_rh09", 0) or 0)),
            "c2526AnexoI": int(float(row.get("Vacantes_2526_anexo_i", 0) or 0)),
            "c2526AnexoVia": int(float(row.get("Vacantes_2526_anexo_via", 0) or 0)),
        }
    print(f"  → {len(vacantes)} centros con vacantes")
    return vacantes


# ──────────────────────────────────────────────────────────────────────────────
# Construir registros
# ──────────────────────────────────────────────────────────────────────────────

def construir_registros(
    df: pd.DataFrame, vacantes_map: dict, polys: list
) -> tuple[list[dict], list[str]]:
    """
    Devuelve (registros, sin_match).
    sin_match: códigos de vacantes que no aparecen en el CSV de la CM.
    """
    # Resolver columnas
    col = {k: resolver_columna(df, v) for k, v in COL_MAP.items()}

    # Códigos presentes en CM
    codigos_cm: set[str] = set()

    registros = []
    for i in range(len(df)):
        codigo = col["codigo"].iloc[i].zfill(8)
        if not codigo or codigo == "00000000":
            continue
        codigos_cm.add(codigo)

        lat, lng = utm_a_wgs84(col["utm_x"].iloc[i], col["utm_y"].iloc[i])
        dat_geo = resolver_dat(lat, lng, polys)
        dat_csv_raw = col["dat"].iloc[i] or None
        dat_csv = _normalizar_dat(dat_csv_raw) if dat_csv_raw else None
        dat = dat_geo or dat_csv or dat_csv_raw or None

        bilingue_raw = col["bilingue"].iloc[i].upper()
        bilingue = bilingue_raw in ("S", "SI", "SÍ", "TRUE", "1", "Y", "YES")

        idiomas_raw = col["idiomas"].iloc[i]
        idiomas = [i.strip() for i in idiomas_raw.split(",") if i.strip()] if idiomas_raw else []

        etapa_raw = col["etapa"].iloc[i]
        etapa = [e.strip() for e in etapa_raw.split(",") if e.strip()] if etapa_raw else []

        v = vacantes_map.get(codigo, {})

        record: dict[str, Any] = {
            "codigo": codigo,
            "nombre": fix_mojibake(col["nombre"].iloc[i]) or f"Centro {codigo}",
            "municipio": fix_mojibake(col["municipio"].iloc[i]) or None,
            "dat": dat,
            "direccion": fix_mojibake(col["direccion"].iloc[i]) or None,
            "cp": col["cp"].iloc[i] or None,
            "telefono": col["telefono"].iloc[i] or None,
            "email": col["email"].iloc[i].lower() or None,
            "tipo": col["tipo"].iloc[i] or None,
            "titularidad": col["titularidad"].iloc[i] or None,
            "jornada": col["jornada"].iloc[i] or None,
            "bilingue": bilingue,
            "idiomas_bilingue": idiomas if idiomas else None,
            "etapa": etapa if etapa else None,
            "vacantes": v if v else None,
        }

        if lat is not None:
            # Columnas float accesibles vía REST API
            record["lat"] = lat
            record["lng"] = lng
            # PostGIS: POINT(lng lat) en formato WKT con SRID
            record["geom"] = f"SRID=4326;POINT({lng} {lat})"

        registros.append(record)

    # Centros con vacantes que no están en el CSV de CM
    sin_match = [cod for cod in vacantes_map if cod not in codigos_cm]

    return registros, sin_match


# ──────────────────────────────────────────────────────────────────────────────
# UPSERT en Supabase
# ──────────────────────────────────────────────────────────────────────────────

def upsert_supabase(registros: list[dict], dry_run: bool) -> None:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print(
            "ERROR: define SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y "
            "SUPABASE_SERVICE_ROLE_KEY como variables de entorno.",
            file=sys.stderr,
        )
        sys.exit(1)

    if dry_run:
        print(f"[DRY-RUN] Se insertarían {len(registros)} registros. No se escribe nada.")
        # Muestra un ejemplo
        if registros:
            print("Ejemplo:", json.dumps(registros[0], ensure_ascii=False, indent=2)[:400])
        return

    client: Client = create_client(url, key)

    # UPSERT en lotes de 500
    batch_size = 500
    total = len(registros)
    print(f"UPSERT de {total} centros en lotes de {batch_size}…")

    # Nota: geom como WKT string no funciona directamente con el cliente REST.
    # Se inserta la geometría como texto WKT y PostGIS la convierte con ST_GeomFromEWKT.
    # Para ello quitamos geom y la insertamos por separado vía RPC o la dejamos NULL
    # y la actualizamos con un UPDATE posterior.
    # Estrategia: insertar sin geom, luego UPDATE con ST_GeomFromEWKT en batch SQL.

    registros_sin_geom = []
    geom_updates: list[tuple[str, str]] = []  # (codigo, wkt)

    for r in registros:
        geom_wkt = r.pop("geom", None)
        registros_sin_geom.append(r)
        if geom_wkt:
            geom_updates.append((r["codigo"], geom_wkt))

    # Paso 1: UPSERT datos no-geom
    errores = 0
    for i in tqdm(range(0, total, batch_size), desc="UPSERT centros"):
        batch = registros_sin_geom[i : i + batch_size]
        resp = (
            client.table("centros")
            .upsert(batch, on_conflict="codigo")
            .execute()
        )
        if hasattr(resp, "error") and resp.error:
            print(f"Error en lote {i}: {resp.error}", file=sys.stderr)
            errores += 1

    # Paso 2: UPDATE geometría vía SQL (requiere service_role + extensión postgis)
    if geom_updates:
        print(f"Actualizando geometrías ({len(geom_updates)} centros)…")
        # Construir UPDATE masivo via RPC o psycopg directo si hay DATABASE_URL
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            _update_geom_psycopg(geom_updates, db_url)
        else:
            print(
                "⚠  DATABASE_URL no definida: las geometrías no se actualizaron.\n"
                "   Ejecuta con DATABASE_URL=postgresql://... para activarlo.",
                file=sys.stderr,
            )

    # Paso 3: registrar versión
    client.table("data_versions").insert(
        {
            "source": "centros_cm",
            "version": str(date.today()),
            "notas": f"{total} centros procesados, {errores} errores de lote",
        }
    ).execute()

    print(f"✓ Ingesta completada. {total} registros, {len(geom_updates)} geometrías.")
    if errores:
        print(f"⚠  {errores} lotes con errores — revisa los logs.", file=sys.stderr)


def _update_geom_psycopg(geom_updates: list[tuple[str, str]], db_url: str) -> None:
    try:
        import psycopg2
    except ImportError:
        print("pip install psycopg2-binary para actualizar geometrías.", file=sys.stderr)
        return

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    batch = [(wkt, cod) for cod, wkt in geom_updates]
    cur.executemany(
        "UPDATE centros SET geom = ST_GeomFromEWKT(%s) WHERE codigo = %s",
        batch,
    )
    conn.commit()
    cur.close()
    conn.close()
    print(f"  → {len(batch)} geometrías actualizadas vía psycopg2.")


# ──────────────────────────────────────────────────────────────────────────────
# Reporte de cobertura
# ──────────────────────────────────────────────────────────────────────────────

def escribir_reporte(registros: list[dict], sin_match: list[str]) -> None:
    total = len(registros)
    con_coords = sum(1 for r in registros if "geom" in r or r.get("geom"))
    con_dat = sum(1 for r in registros if r.get("dat"))

    print("\n── Cobertura ──────────────────────────────────")
    print(f"  Centros procesados   : {total}")
    print(f"  Con coordenadas      : {con_coords} ({100*con_coords//total if total else 0}%)")
    print(f"  Con DAT asignada     : {con_dat} ({100*con_dat//total if total else 0}%)")
    print(f"  Sin match en CM      : {len(sin_match)}")
    print("───────────────────────────────────────────────\n")

    if sin_match:
        sin_match_path = OUT_DIR / "sin_match.csv"
        with sin_match_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["codigo_vacantes"])
            for cod in sorted(sin_match):
                writer.writerow([cod])
        print(f"Centros sin match → {sin_match_path}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Ingesta de centros educativos CM → Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Valida sin escribir en DB")
    parser.add_argument("--force", action="store_true", help="Fuerza re-descarga del CSV")
    args = parser.parse_args()

    # Cargar variables de entorno desde .env.local si existe
    env_file = ROOT / "web-next" / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

    df_cm = descargar_csv(force=args.force)
    polys = cargar_dat_poligonos()
    vacantes_map = cargar_vacantes()

    df_cm = canonicalizar_localidades(df_cm, col=resolver_columna(df_cm, COL_MAP["municipio"]).name
                                      if resolver_columna(df_cm, COL_MAP["municipio"]).name in df_cm.columns
                                      else "MUNICIPIO")

    registros, sin_match = construir_registros(df_cm, vacantes_map, polys)
    escribir_reporte(registros, sin_match)
    upsert_supabase(registros, dry_run=args.dry_run)


if __name__ == "__main__":
    main()

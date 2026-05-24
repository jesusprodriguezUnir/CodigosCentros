"""Genera los JSON estaticos que consume la web (web-next/public/data/).

Lee 2026/salida/consolidado_2526.xlsx, normaliza acentos rotos en Localidad y
escribe:
  - centros.json     -> lista de centros con campos camelCase
  - municipios.json  -> lista ordenada de municipios unicos con conteos
"""

import json
import os
import unicodedata
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
EXCEL = ROOT / "2026" / "salida" / "consolidado_2526.xlsx"
OUT_DIR = ROOT / "web-next" / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def fix_mojibake(value: str) -> str:
    """Repara cadenas que vienen mal decodificadas (latin-1 leido como cp1252)."""
    if not isinstance(value, str):
        return value
    try:
        return value.encode("cp1252", errors="strict").decode("utf-8", errors="strict")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value.replace("�", "").replace("?", "")


def smart_title(value: str) -> str:
    """Title case respetando preposiciones y abreviaturas comunes."""
    if not value:
        return value
    minusculas = {"de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en"}
    palabras = value.lower().split()
    salida = []
    for i, palabra in enumerate(palabras):
        if i > 0 and palabra in minusculas:
            salida.append(palabra)
        elif "(" in palabra:
            # casos tipo "Alamo(El)" -> "Alamo (El)"
            partes = palabra.replace("(", " (").split()
            salida.append(" ".join(p.capitalize() for p in partes))
        else:
            salida.append(palabra.capitalize())
    return " ".join(salida)


def sin_acentos(value: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", value) if unicodedata.category(c) != "Mn"
    ).lower()


def canonicalizar_localidades(df: pd.DataFrame) -> pd.DataFrame:
    """Unifica variantes de la misma localidad (con/sin acento) eligiendo la
    versión más rica (la que conserva diacríticos)."""
    df = df.copy()
    df["_clave"] = df["Localidad"].map(sin_acentos)
    canon = {}
    for clave, grupo in df.groupby("_clave"):
        candidatos = grupo["Localidad"].unique().tolist()
        candidatos.sort(key=lambda s: (-sum(1 for c in s if ord(c) > 127), -len(s)))
        canon[clave] = candidatos[0]
    df["Localidad"] = df["_clave"].map(canon)
    return df.drop(columns=["_clave"])


def main() -> None:
    df = pd.read_excel(EXCEL)
    df["Localidad"] = df["Localidad"].fillna("").map(fix_mojibake).map(smart_title)
    df["Centro"] = df["Centro"].fillna("").map(fix_mojibake)
    df["Cod_Centro"] = df["Cod_Centro"].astype(str).str.zfill(8)
    df = canonicalizar_localidades(df)

    centros = []
    for _, row in df.iterrows():
        centros.append({
            "codigo": row["Cod_Centro"],
            "centro": row["Centro"],
            "localidad": row["Localidad"],
            "vacantes": {
                "c2223": int(row["Vacantes_2223"]),
                "c2324": int(row["Vacantes_2324"]),
                "c2425": int(row["Vacantes_2425"]),
                "c2526Rh09": int(row["Vacantes_2526_rh09"]),
                "c2526AnexoI": int(row["Vacantes_2526_anexo_i"]),
                "c2526AnexoVia": int(row["Vacantes_2526_anexo_via"]),
            },
            "total": int(row["Total"]),
        })

    centros.sort(key=lambda c: (c["localidad"], c["centro"]))

    conteo = df.groupby("Localidad").size().to_dict()
    municipios = [
        {"nombre": nombre, "centros": int(total)}
        for nombre, total in sorted(conteo.items(), key=lambda kv: kv[0])
        if nombre
    ]

    metricas = {
        "totalCentros": len(centros),
        "totalMunicipios": len(municipios),
        "totalVacantes2526": int(
            df[["Vacantes_2526_rh09", "Vacantes_2526_anexo_i", "Vacantes_2526_anexo_via"]].sum().sum()
        ),
        "totalVacantesHistorico": int(df["Total"].sum()),
        "generadoDesde": os.path.relpath(EXCEL, ROOT).replace("\\", "/"),
    }

    (OUT_DIR / "centros.json").write_text(
        json.dumps(centros, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "municipios.json").write_text(
        json.dumps(municipios, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "metricas.json").write_text(
        json.dumps(metricas, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"OK -> {len(centros)} centros, {len(municipios)} municipios")
    print(f"Salida: {OUT_DIR}")


if __name__ == "__main__":
    main()

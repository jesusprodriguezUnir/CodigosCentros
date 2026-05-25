"""scraper_fichas.py — Enriquece la tabla `centros` con la ficha oficial
publicada en gestiona.comunidad.madrid (MostrarFichaCentro.icm).

Lee los códigos de centro desde Supabase, descarga la ficha HTML de cada uno,
parsea distrito, titular, fax, web, denominación genérica, opciones lingüísticas,
servicios, integración preferente, programas de excelencia y adscripciones,
y hace UPSERT en la tabla `centros`.

Uso:
    python scraper_fichas.py                          # ingesta real, todos los centros
    python scraper_fichas.py --dry-run                # parsea pero no escribe en DB
    python scraper_fichas.py --codigo 28010394 --dry-run   # solo un centro, depurar
    python scraper_fichas.py --limit 20 --dry-run     # muestra de 20 centros
    python scraper_fichas.py --force                  # fuerza re-descarga (ignora caché)
    python scraper_fichas.py --workers 4              # nº de hilos de descarga (def. 4)

Requisitos:
    pip install requests beautifulsoup4 lxml supabase tqdm
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup, Tag
from supabase import create_client, Client
from tqdm import tqdm

# ──────────────────────────────────────────────────────────────────────────────
# Rutas y constantes
# ──────────────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "out"
CACHE_DIR = OUT_DIR / "fichas"
OUT_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

FICHA_URL = (
    "https://gestiona.comunidad.madrid/wpad_pub/run/j/"
    "MostrarFichaCentro.icm?cdCentro={codigo}"
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

REQUEST_TIMEOUT = 30  # segundos
SLEEP_ENTRE_PETICIONES = 0.5  # por trabajador

# Mapeo span_text → (campo_json, clave) para opciones lingüísticas
OPCIONES_LING_MAP = {
    "centro bilingüe español/inglés": "bilingue_es_en",
    "centro de convenio con british council": "british_council",
    "secciones lingüísticas de francés en el i.e.s.": "seccion_frances",
    "secciones lingüísticas de alemán en el i.e.s.": "seccion_aleman",
}

SERVICIOS_MAP = {
    "transporte": "transporte",
    "horario ampliado": "horario_ampliado",
    "comedor": "comedor",
    "residencia": "residencia",
}

INTEGRACION_MAP = {
    "auditivos": "auditivos",
    "motóricos": "motoricos",
    "centro preferente tgd/tea": "tgd_tea",
}

JORNADA_MAP = {
    "jornada dividida en 2 sesiones": "dividida",
    "jornada continuada": "continuada",
}

EXCELENCIA_MAP = {
    "centro de excelencia": "centro_excelencia",
    "aula de excelencia": "aula_excelencia",
    "instituto de innovación tecnológica": "innovacion_tecnologica",
    "innovación y desarrollo": "innovacion_desarrollo",
}

# Regex para parsear filas de adscripción: "CODIGO - NOMBRE - (Municipio) [- (Bilingüe)]"
RE_ADSCRIPCION = re.compile(
    r"^\s*(\d{8})\s*-\s*(.+?)\s*-\s*\(([^()]+)\)\s*(?:-\s*\(([^()]+)\)\s*)?$"
)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers de Supabase
# ──────────────────────────────────────────────────────────────────────────────

def cargar_env() -> None:
    """Carga web-next/.env.local si existe, idéntico a ingesta_centros.py."""
    env_file = ROOT / "web-next" / ".env.local"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())


def crear_cliente() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(
            "ERROR: define SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y "
            "SUPABASE_SERVICE_ROLE_KEY como variables de entorno.",
            file=sys.stderr,
        )
        sys.exit(1)
    return create_client(url, key)


def cargar_codigos_supabase(client: Client) -> list[str]:
    """Devuelve todos los códigos de centro de la tabla `centros`."""
    print("Cargando códigos de centro desde Supabase…")
    codigos: list[str] = []
    page = 0
    page_size = 1000
    while True:
        resp = (
            client.table("centros")
            .select("codigo")
            .order("codigo")
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        batch = [r["codigo"] for r in resp.data]
        codigos.extend(batch)
        if len(batch) < page_size:
            break
        page += 1
    print(f"  → {len(codigos)} centros en BD")
    return codigos


# ──────────────────────────────────────────────────────────────────────────────
# Descarga
# ──────────────────────────────────────────────────────────────────────────────

SIN_FICHA = "__SIN_FICHA__"  # marcador en caché para códigos sin ficha pública


def descargar_ficha(codigo: str, force: bool = False) -> str | None:
    """Devuelve el HTML de la ficha como str (UTF-8), `SIN_FICHA` si la web no tiene
    ficha pública para ese código, o None si hay error de red.

    Cachea ambos casos en out/fichas/{codigo}.html (UTF-8).
    """
    cache_path = CACHE_DIR / f"{codigo}.html"
    if cache_path.exists() and not force:
        contenido = cache_path.read_text(encoding="utf-8")
        return SIN_FICHA if contenido.strip() == SIN_FICHA else contenido

    url = FICHA_URL.format(codigo=codigo)
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "es-ES,es;q=0.9"}

    for intento in range(3):
        try:
            resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            resp.encoding = resp.encoding or "ISO-8859-1"
            html = resp.text

            # Página oficial de error: "Pagina de Error: null" ~ 302 bytes
            if "Pagina de Error" in html or len(html) < 1000:
                cache_path.write_text(SIN_FICHA, encoding="utf-8")
                return SIN_FICHA

            if "<html" not in html.lower():
                raise ValueError(f"Respuesta inesperada ({len(html)} bytes)")
            cache_path.write_text(html, encoding="utf-8")
            return html
        except requests.RequestException as e:
            espera = (intento + 1) ** 2  # 1s, 4s, 9s
            if intento < 2:
                time.sleep(espera)
            else:
                print(f"  ✗ {codigo}: {e}", file=sys.stderr)
        except ValueError as e:
            print(f"  ✗ {codigo}: {e}", file=sys.stderr)
            return None
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Parsing
# ──────────────────────────────────────────────────────────────────────────────

def _texto(node: Tag | None) -> str:
    if node is None:
        return ""
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()


def _imagen_activa(img: Tag) -> bool:
    """True si el src de la imagen termina en 'On.png', False si 'Off.png'."""
    src = img.get("src", "") or ""
    return src.endswith("On.png")


def _pares_img_span(soup_root: Tag) -> list[tuple[bool, str]]:
    """Encuentra todos los <img fcOpc*> y emparéjalos con su etiqueta de texto.

    Tres layouts posibles en la ficha oficial:
      1) <td>  <img/> <span/> </td>                  → span en la MISMA celda
      2) <tr><td><img/></td>…</tr><tr><td><label/></td>…</tr>
         → la <img> está en una fila y la <label> en la siguiente, en la misma columna
      3) <td> <img/> <input/> <span/> </td>          → como el 1)

    Devuelve [(activo, texto_lower), …].
    """
    pares: list[tuple[bool, str]] = []
    for img in soup_root.find_all("img"):
        src = img.get("src", "")
        if "/fcOpc" not in src and not src.endswith(("On.png", "Off.png")):
            continue
        td = img.find_parent("td")
        if td is None:
            continue

        # Layout 1/3: span o label dentro de la misma celda
        texto = _texto(td.find("span")) or _texto(td.find("label"))

        # Layout 2: si la celda no contiene el texto, buscar en la fila siguiente,
        # en la celda con el mismo índice de columna.
        if not texto:
            tr = td.find_parent("tr")
            if tr is not None:
                tds = tr.find_all("td", recursive=False)
                try:
                    idx = tds.index(td)
                except ValueError:
                    idx = -1
                tr_sig = tr.find_next_sibling("tr")
                if tr_sig is not None and idx >= 0:
                    tds_sig = tr_sig.find_all("td", recursive=False)
                    if idx < len(tds_sig):
                        celda = tds_sig[idx]
                        texto = _texto(celda.find("label")) or _texto(celda.find("span")) or _texto(celda)

        if not texto:
            continue
        pares.append((_imagen_activa(img), texto.lower()))
    return pares


def _bloque_por_titulo(soup: BeautifulSoup, titulo: str) -> Tag | None:
    """Devuelve la <table> que contiene un <td> con el texto `titulo` (case-insens)."""
    objetivo = titulo.lower()
    for td in soup.find_all("td"):
        if objetivo in _texto(td).lower():
            tabla = td.find_parent("table")
            if tabla is not None:
                return tabla
    return None


def _extraer_datos_identificativos(soup: BeautifulSoup) -> dict[str, Any]:
    """Distrito, barrio, titular, denominación genérica, fax, web."""
    capa = soup.find(id="capaDatIdentContent")
    if capa is None:
        return {}

    texto_completo = _texto(capa)

    def _captura(regex: str) -> str | None:
        m = re.search(regex, texto_completo, re.IGNORECASE)
        if not m:
            return None
        val = m.group(1).strip(" .,;:")
        return val or None

    denominacion = _captura(r"Tipo \(denominación genérica\):\s*(.+?)(?:\s+Titularidad:|$)")
    titular = _captura(r"Titular:\s*(.+?)(?:\s+Código del centro:|$)")
    fax = _captura(r"Fax:\s*([\d\s]+)")
    if fax:
        fax = re.sub(r"\s+", "", fax)

    # Web: extraer del <a> que cuelga del span tras "Web:"
    web = None
    for a in capa.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("http://", "https://")) and "comunidad.madrid" not in href:
            web = href
            break

    # Distrito y barrio: aparecen como "(Distrito)" y opcionalmente "(Barrio)"
    # al final de la dirección. En el ejemplo: "Madrid (Arganzuela)."
    distrito = None
    barrio = None
    parens = re.findall(r"\(([^()]+)\)", texto_completo)
    # Filtrar paréntesis que no son distrito (ej. nombres de tipo)
    candidatos = [
        p.strip()
        for p in parens
        if not re.search(r"denominación|público|privado|concertado", p, re.IGNORECASE)
    ]
    if candidatos:
        distrito = candidatos[-1]  # último paréntesis en la sección = distrito
        if len(candidatos) >= 2:
            # Si la dirección incluye distrito y barrio, el barrio va antes
            barrio = candidatos[-2] if candidatos[-2] != distrito else None

    return {
        "denominacion_generica": denominacion,
        "titular": titular,
        "fax": fax,
        "web": web,
        "distrito": distrito,
        "barrio": barrio,
    }


def _extraer_grupo_opciones(
    contenedor: Tag | None, mapping: dict[str, str]
) -> dict[str, bool] | None:
    """Dado un contenedor (table o div) y un mapping span_text→campo,
    devuelve {campo: bool} para cada par img+span hallado.
    """
    if contenedor is None:
        return None
    pares = _pares_img_span(contenedor)
    if not pares:
        return None
    resultado: dict[str, bool] = {v: False for v in mapping.values()}
    for activo, texto in pares:
        for label, campo in mapping.items():
            if label in texto:
                resultado[campo] = resultado[campo] or activo
                break
    return resultado


def _extraer_opciones_linguisticas(soup: BeautifulSoup) -> dict[str, bool] | None:
    capa = soup.find(id="capaOpcLingContent")
    return _extraer_grupo_opciones(capa, OPCIONES_LING_MAP)


def _extraer_servicios(soup: BeautifulSoup) -> dict[str, bool] | None:
    tabla = _bloque_por_titulo(soup, "Servicios complementarios")
    return _extraer_grupo_opciones(tabla, SERVICIOS_MAP)


def _extraer_jornada(soup: BeautifulSoup) -> str | None:
    """Devuelve 'dividida', 'continuada' o concatenación con '+' si ambas activas."""
    tabla = _bloque_por_titulo(soup, "Jornada:")
    if tabla is None:
        return None
    activas: list[str] = []
    for activo, texto in _pares_img_span(tabla):
        for label, valor in JORNADA_MAP.items():
            if label in texto and activo:
                activas.append(valor)
                break
    if not activas:
        return None
    # Dedupe preservando orden
    seen: set[str] = set()
    return "+".join([a for a in activas if not (a in seen or seen.add(a))])


def _extraer_integracion(soup: BeautifulSoup) -> dict[str, bool] | None:
    tabla = _bloque_por_titulo(soup, "Integración preferente")
    return _extraer_grupo_opciones(tabla, INTEGRACION_MAP)


def _extraer_excelencia(soup: BeautifulSoup) -> dict[str, bool] | None:
    capa = soup.find(id="capaOtrosCritContent")
    return _extraer_grupo_opciones(capa, EXCELENCIA_MAP)


def _extraer_adscripciones(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """Tabla de adscripciones del div#capaCentrosAdsContent."""
    capa = soup.find(id="capaCentrosAdsContent")
    if capa is None:
        return []
    adscripciones: list[dict[str, Any]] = []
    for tabla in capa.find_all("table"):
        filas = tabla.find_all("tr")
        for fila in filas:
            celdas = fila.find_all("td")
            if len(celdas) < 3:
                continue
            curso_origen = _texto(celdas[0])
            curso_destino = _texto(celdas[1])
            destino_str = _texto(celdas[2])
            if not curso_origen or "curso origen" in curso_origen.lower():
                continue
            m = RE_ADSCRIPCION.match(destino_str)
            if not m:
                continue
            codigo_dest, nombre_dest, municipio_dest, extra = m.groups()
            bilingue_dest = bool(extra) and "biling" in extra.lower()
            adscripciones.append({
                "curso_origen": curso_origen,
                "curso_destino": curso_destino,
                "codigo_destino": codigo_dest,
                "nombre_destino": nombre_dest.strip(),
                "municipio_destino": municipio_dest.strip(),
                "bilingue_destino": bilingue_dest,
            })
    return adscripciones


def parsear_ficha(html: str, codigo: str) -> dict[str, Any]:
    """Devuelve un dict con los campos extraídos. Las claves son las columnas de `centros`."""
    soup = BeautifulSoup(html, "lxml")

    datos = _extraer_datos_identificativos(soup)
    servicios = _extraer_servicios(soup)
    integracion = _extraer_integracion(soup)
    opciones_ling = _extraer_opciones_linguisticas(soup)
    excelencia = _extraer_excelencia(soup)
    adscripciones = _extraer_adscripciones(soup)
    jornada_scrap = _extraer_jornada(soup)

    registro: dict[str, Any] = {
        "codigo": codigo,
        "distrito": datos.get("distrito"),
        "barrio": datos.get("barrio"),
        "titular": datos.get("titular"),
        "denominacion_generica": datos.get("denominacion_generica"),
        "fax": datos.get("fax"),
        "web": datos.get("web"),
        "servicios": servicios,
        "integracion_preferente": integracion,
        "opciones_linguisticas": opciones_ling,
        "programas_excelencia": excelencia,
        "adscripciones": adscripciones if adscripciones else None,
        "ficha_scrapeada_at": datetime.now(timezone.utc).isoformat(),
    }
    # `jornada` es un campo ya existente en `centros`; si la ficha aporta valor
    # y la columna está vacía, lo añadimos a un dict aparte de discrepancias.
    registro["_jornada_ficha"] = jornada_scrap  # consumido por reporte; no se sube

    # Derivar bilingue / idiomas_bilingue desde opciones_linguisticas
    idiomas: list[str] = []
    if opciones_ling:
        if opciones_ling.get("bilingue_es_en") or opciones_ling.get("british_council"):
            idiomas.append("Inglés")
        if opciones_ling.get("seccion_frances"):
            idiomas.append("Francés")
        if opciones_ling.get("seccion_aleman"):
            idiomas.append("Alemán")
    registro["bilingue"] = bool(idiomas)
    registro["idiomas_bilingue"] = idiomas if idiomas else None

    return registro


# ──────────────────────────────────────────────────────────────────────────────
# Procesar centros (descarga + parsing en paralelo)
# ──────────────────────────────────────────────────────────────────────────────

def procesar_centro(codigo: str, force: bool) -> tuple[str, dict[str, Any] | None]:
    """Devuelve (estado, registro_o_None).

    estado ∈ {"ok", "sin_ficha", "error"}. "sin_ficha" significa que la web
    no expone ficha pública (centro administrativo, militar, cerrado…); no es
    un error, simplemente no hay datos que añadir.
    """
    html = descargar_ficha(codigo, force=force)
    if html is None:
        return ("error", None)
    if html == SIN_FICHA:
        return ("sin_ficha", None)
    try:
        registro = parsear_ficha(html, codigo)
        time.sleep(SLEEP_ENTRE_PETICIONES)
        return ("ok", registro)
    except Exception as e:
        print(f"  ✗ {codigo}: error de parseo: {e}", file=sys.stderr)
        return ("error", None)


def procesar_lote(
    codigos: list[str], force: bool, workers: int
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    registros: list[dict[str, Any]] = []
    stats = {"ok": 0, "sin_ficha": 0, "error": 0}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futuros = {ex.submit(procesar_centro, c, force): c for c in codigos}
        with tqdm(total=len(codigos), desc="Fichas") as pbar:
            for fut in as_completed(futuros):
                estado, reg = fut.result()
                stats[estado] += 1
                if reg is not None:
                    registros.append(reg)
                pbar.update(1)
    return registros, stats


# ──────────────────────────────────────────────────────────────────────────────
# UPSERT en Supabase
# ──────────────────────────────────────────────────────────────────────────────

def upsert_supabase(client: Client, registros: list[dict[str, Any]]) -> int:
    """Actualiza la tabla `centros` con los campos de la ficha.

    Los códigos siempre existen (los cargamos desde la propia tabla), por lo que
    usamos UPDATE en vez de UPSERT — un UPSERT con campos parciales sobreescribe
    columnas obligatorias como `nombre` a NULL y rompe la NOT NULL constraint.

    Se hace una llamada por centro pero en paralelo con 8 hilos (~ todo en <2 min).
    """
    errores = 0

    def _actualizar(reg: dict[str, Any]) -> bool:
        clean = {k: v for k, v in reg.items() if not k.startswith("_") and k != "codigo"}
        try:
            client.table("centros").update(clean).eq("codigo", reg["codigo"]).execute()
            return True
        except Exception as e:
            print(f"  ✗ update {reg['codigo']}: {e}", file=sys.stderr)
            return False

    with ThreadPoolExecutor(max_workers=8) as ex:
        futuros = {ex.submit(_actualizar, r): r["codigo"] for r in registros}
        with tqdm(total=len(registros), desc="UPDATE") as pbar:
            for fut in as_completed(futuros):
                if not fut.result():
                    errores += 1
                pbar.update(1)
    return errores


# ──────────────────────────────────────────────────────────────────────────────
# Reporte
# ──────────────────────────────────────────────────────────────────────────────

def reportar(
    registros: list[dict[str, Any]], total_pedidos: int, stats: dict[str, int]
) -> None:
    n = len(registros)
    con_distrito = sum(1 for r in registros if r.get("distrito"))
    con_adscripcion = sum(1 for r in registros if r.get("adscripciones"))
    con_servicios = sum(1 for r in registros if r.get("servicios"))
    con_opling = sum(
        1 for r in registros
        if r.get("opciones_linguisticas") and any(r["opciones_linguisticas"].values())
    )

    print("\n── Cobertura ──────────────────────────────────")
    print(f"  Centros pedidos      : {total_pedidos}")
    print(f"  Fichas parseadas     : {n}")
    print(f"  Sin ficha en gestiona: {stats['sin_ficha']}")
    print(f"  Errores              : {stats['error']}")
    print(f"  Con distrito         : {con_distrito}")
    print(f"  Con servicios        : {con_servicios}")
    print(f"  Con opciones ling.   : {con_opling}")
    print(f"  Con adscripción      : {con_adscripcion}")
    print("───────────────────────────────────────────────\n")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Scraper de fichas oficiales CM → Supabase")
    parser.add_argument("--dry-run", action="store_true", help="No escribe en DB")
    parser.add_argument("--force", action="store_true", help="Ignora la caché de fichas")
    parser.add_argument("--limit", type=int, default=None, help="Limita a N centros")
    parser.add_argument("--codigo", type=str, default=None, help="Procesa un único código")
    parser.add_argument("--workers", type=int, default=4, help="Hilos de descarga (def. 4)")
    args = parser.parse_args()

    cargar_env()
    client = crear_cliente()

    if args.codigo:
        codigos = [args.codigo]
    else:
        codigos = cargar_codigos_supabase(client)
        if args.limit:
            codigos = codigos[: args.limit]

    registros, stats = procesar_lote(codigos, force=args.force, workers=args.workers)
    reportar(registros, total_pedidos=len(codigos), stats=stats)

    if args.dry_run:
        print("[DRY-RUN] No se escribe en DB. Ejemplo:")
        if registros:
            ejemplo = {k: v for k, v in registros[0].items() if not k.startswith("_")}
            print(json.dumps(ejemplo, ensure_ascii=False, indent=2)[:2000])
        return

    errores = upsert_supabase(client, registros)
    print(f"✓ UPSERT completado. {len(registros)} centros, {errores} lotes con errores.")


if __name__ == "__main__":
    main()

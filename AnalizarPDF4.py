import pandas as pd
import pdfplumber
import os
import re

# Curso 25/26 - las fuentes ahora son PDFs (cambio de formato respecto a cursos anteriores).
# Nota: pdfplumber puede dejar caracteres '?' donde el PDF tenia acentos; es limitacion del propio PDF.

BASE = r'C:\Temp\Noemi\Centros'


def procesar_rh09(pdf_path, output_path):
    """Procesa el PDF rh09_118_2526_adj_def_mae_vac.pdf (formato tabla limpia, 283 paginas)."""
    if not os.path.exists(pdf_path):
        print(f"Archivo no encontrado: {pdf_path}")
        return

    filas = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tablas = page.extract_tables()
            for tabla in tablas:
                for fila in tabla:
                    # Descartar la cabecera que se repite en cada pagina
                    if not fila or fila[0] is None or fila[0].strip().upper() == 'COD':
                        continue
                    if len(fila) < 6:
                        continue
                    filas.append(fila[:7])

    df = pd.DataFrame(filas, columns=['Codigo', 'Funcion', 'Localidad', 'Cod_Centro', 'Centro', 'Vacantes', 'Tipo'])
    # Limpiar saltos de linea internos de pdfplumber
    for col in ['Funcion', 'Centro', 'Localidad']:
        df[col] = df[col].astype(str).str.replace('\n', ' ', regex=False).str.strip()
    df['Vacantes'] = pd.to_numeric(df['Vacantes'], errors='coerce').fillna(0).astype(int)
    df['Cod_Centro'] = df['Cod_Centro'].astype(str).str.strip().str.zfill(8)

    agrupado = df.groupby(['Cod_Centro', 'Localidad', 'Centro'])['Vacantes'].sum().reset_index(name='Total Vacantes')
    agrupado.to_excel(output_path, index=False)
    print(f"Archivo guardado en: {output_path}  (filas brutas: {len(df)}, agrupadas: {len(agrupado)})")


VIAS = ('CALLE', 'AVDA', 'AVENIDA', 'PASEO', 'PLAZA', 'GTA', 'GLORIETA',
        'CAMINO', 'CTRA', 'CARRETERA', 'TRAVESIA', 'RONDA', 'PASAJE', 'VIA', 'CUESTA')


def _split_centro_domicilio(texto):
    """Separa 'NOMBRE CENTRO ... CALLE/AVDA/... DIRECCION' en (nombre, domicilio).
    Si no encuentra ninguna palabra-via, devuelve todo como nombre."""
    tokens = texto.split()
    for i, tok in enumerate(tokens):
        if tok.upper() in VIAS and i > 0:
            return ' '.join(tokens[:i]).strip(), ' '.join(tokens[i:]).strip()
    return texto.strip(), ''


def _termina_en_bloque_numerico(linea, n):
    """True si los ultimos n tokens de la linea son todos enteros."""
    toks = linea.split()
    if len(toks) < n:
        return False
    return all(re.fullmatch(r'-?\d+', t) for t in toks[-n:])


def procesar_anexo(pdf_path, output_path, n_especialidades):
    """Procesa los anexos (anexo_i, anexo_via).
    Cada centro ocupa 2 lineas en el texto extraido:
      - linea-datos: <COD_CENTRO 8 digitos> <NOMBRE> <DOMICILIO+CP> <N numeros de especialidad>
      - linea-loc:   <COD_ZONA 9 digitos> <MUNICIPIO/LOCALIDAD> <COD_LOCALIDAD>
    A veces una linea se parte (p.ej. el CP del domicilio cae a la linea siguiente).
    Solo unimos la linea envuelta a la anterior si la anterior NO termina ya en un bloque
    valido de N numeros - de lo contrario el wrap pertenece al domicilio y se descarta,
    porque las vacantes (las N cifras finales) ya estan completas en la linea original.
    """
    if not os.path.exists(pdf_path):
        print(f"Archivo no encontrado: {pdf_path}")
        return

    registros = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            texto = page.extract_text() or ''
            # Filtrar paginas vacias y footers tipo "P?gina X de Y"
            lineas_raw = [
                ln for ln in texto.split('\n')
                if ln.strip() and not re.match(r'^P.gina\s+\d+\s+de\s+\d+\s*$', ln.strip())
            ]

            # Unir lineas envueltas - pero NO si la anterior ya cierra con el bloque numerico
            lineas = []
            for ln in lineas_raw:
                # Una linea de datos empieza por 8 digitos o por "BC <8 digitos>" (rotulo de bloque)
                m_bc = re.match(r'^BC\s+(\d{8}\s.*)$', ln)
                if m_bc:
                    lineas.append(m_bc.group(1))
                elif re.match(r'^\d{8}\s', ln) or re.match(r'^\d{9}\s', ln):
                    lineas.append(ln)
                elif lineas and not _termina_en_bloque_numerico(lineas[-1], n_especialidades):
                    lineas[-1] = lineas[-1] + ' ' + ln.strip()
                # si la anterior ya termina en N numeros, este wrap es ruido (CP partido) -> descartar
                # si no hay anterior, es cabecera de pagina -> descartar

            # Recorrer en pares datos+localidad
            i = 0
            while i < len(lineas) - 1:
                ln_datos = lineas[i]
                ln_loc = lineas[i + 1]
                if not re.match(r'^\d{8}\s', ln_datos) or not re.match(r'^\d{9}\s', ln_loc):
                    i += 1
                    continue

                m = re.match(r'^(\d{8})\s+(.*)$', ln_datos)
                if not m:
                    i += 2
                    continue
                cod_centro = m.group(1)
                resto = m.group(2)

                # Tomar los ultimos n_especialidades tokens numericos como vacantes
                tokens = resto.split()
                if len(tokens) < n_especialidades:
                    i += 2
                    continue
                cola = tokens[-n_especialidades:]
                if not all(re.fullmatch(r'-?\d+', t) for t in cola):
                    # No es una fila de datos valida
                    i += 1
                    continue
                vacantes = sum(int(t) for t in cola)
                centro_y_domicilio = ' '.join(tokens[:-n_especialidades])
                nombre, _domicilio = _split_centro_domicilio(centro_y_domicilio)

                cp = ''
                if _domicilio:
                    m_cp = re.search(r'\b(\d{5})\s*$', _domicilio)
                    if m_cp:
                        cp = m_cp.group(1)

                # De la linea de localidad: cod_zona <texto> cod_localidad_final
                m2 = re.match(r'^(\d{9})\s+(.*?)\s+(\d+)\s*$', ln_loc)
                if m2:
                    localidad = m2.group(2).strip()
                else:
                    # fallback: quitar el codigo de zona inicial
                    localidad = re.sub(r'^\d{9}\s+', '', ln_loc).strip()

                registros.append({
                    'Cod_Centro': cod_centro,
                    'Centro': nombre,
                    'Localidad': localidad,
                    'CP': cp,
                    'Vacantes': vacantes,
                })
                i += 2

    df = pd.DataFrame(registros)
    if df.empty:
        print(f"No se extrajeron filas de: {pdf_path}")
        return

    agrupado = df.groupby(['Cod_Centro', 'Localidad', 'Centro'], as_index=False).agg({
        'CP': 'first',
        'Vacantes': 'sum',
    }).rename(columns={'Vacantes': 'Total Vacantes'})
    agrupado.to_excel(output_path, index=False)
    print(f"Archivo guardado en: {output_path}  (filas brutas: {len(df)}, agrupadas: {len(agrupado)})")


if __name__ == '__main__':
    procesar_rh09(
        os.path.join(BASE, 'rh09_118_2526_adj_def_mae_vac.pdf'),
        os.path.join(BASE, 'agrupado_2526.xlsx'),
    )
    procesar_anexo(
        os.path.join(BASE, 'anexo_i_ceip_ordinarias (1).pdf'),
        os.path.join(BASE, 'agrupado_anexo_i_2526.xlsx'),
        n_especialidades=20,
    )
    procesar_anexo(
        os.path.join(BASE, 'anexo_20via_20_20biling_c3_bces_20_ordinarias (1).pdf'),
        os.path.join(BASE, 'agrupado_anexo_via_2526.xlsx'),
        n_especialidades=14,
    )

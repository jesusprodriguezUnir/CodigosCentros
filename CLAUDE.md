# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Propósito del repositorio

Scripts de un solo archivo en Python que procesan listados de adjudicaciones de centros educativos (cursos 22/23, 23/24, 24/25, 25/26). Cada script lee una fuente (Excel o PDF), agrupa por código de centro, suma `Vacantes` y guarda un Excel `agrupado_*.xlsx`. `ConsolidarCentros.py` une las 6 fuentes en un único Excel (`2026/salida/consolidado_2526.xlsx`) con una fila por centro, columnas de vacantes por curso y una columna `Total`.

## Ejecutar los scripts

```powershell
python AnalizarExcel1.py   # curso 24/25 — fuente ya tiene cabeceras planas
python AnalizarExcel2.py   # curso 23/24 — multi-hoja, cabeceras en fila 3
python AnalizarExcel3.py   # curso 22/23 — multi-hoja, cabeceras en fila 3
python AnalizarPDF4.py     # curso 25/26 — fuentes en PDF (3 archivos, 3 salidas)
python ConsolidarCentros.py  # une las 6 fuentes en consolidado_2526.xlsx
```

Dependencias: `pandas`, un motor Excel (`openpyxl`) y `pdfplumber` (solo para `AnalizarPDF4.py`). No hay `requirements.txt`; instalar con `pip install pandas openpyxl pdfplumber` si falta.

## Diferencia clave entre los tres scripts

Aunque los tres hacen "lo mismo" conceptualmente, **no son intercambiables** porque la forma de los Excel de origen difiere por curso:

- **AnalizarExcel1.py** (24/25): una sola hoja, cabeceras en la primera fila, columnas ya nombradas `Codigo`, `LOCALIDAD`, `CENTRO`, `Vacantes`. Lectura directa con `pd.read_excel(file)`.
- **AnalizarExcel2.py / AnalizarExcel3.py** (23/24 y 22/23): **múltiples hojas** (`sheet_name=None`), cabeceras en la **fila 3** (`header=2`), y se toman las primeras 4 columnas por posición (`iloc[:, [0,1,2,3]]`) y se **renombran a mano** a `Localidad`, `Nombre del centro`, `Codigo`, `Vacantes`. Las hojas se concatenan antes de agrupar.

Como consecuencia los nombres de columna del agrupado final difieren entre cursos (`LOCALIDAD`/`CENTRO` vs `Localidad`/`Nombre del centro`). Cualquier consumidor downstream debe contar con esa inconsistencia, o normalizarla aquí antes de exportar.

- **AnalizarPDF4.py** (25/26): las fuentes pasan a ser **PDFs** (carpeta [2026/](2026/)). Procesa los 3 PDFs y produce 3 Excel:
  - `rh09_118_2526_adj_def_mae_vac.pdf` → `agrupado_2526.xlsx`: tabla limpia extraída con `pdfplumber.extract_tables()`.
  - `anexo_i_ceip_ordinarias (1).pdf` → `agrupado_anexo_i_2526.xlsx`: layout complejo (cada centro = 2 líneas de texto, 20 columnas de especialidad). Se parsea con `extract_text()` + regex, sumando las últimas N columnas como total de vacantes.
  - `anexo_via_bilingues (1).pdf` → `agrupado_anexo_via_2526.xlsx`: igual que anexo_i pero con 14 columnas.

  Edge case del parseo de anexos: algunas líneas se parten en dos (p. ej. cuando el CP del domicilio cae al final del ancho de página). El script las une si una línea no empieza por un código de 8 o 9 dígitos. Los acentos del PDF pueden aparecer como `?` — limitación del PDF original, no del extractor.

## Rutas de entrada/salida

Los cuatro scripts tienen **rutas absolutas hardcodeadas** a `C:\Temp\Noemi\Centros\...`, distinta de la ubicación real del repo (`d:\Personal\Noemi\CodigosCentros`). Para ejecutarlos hay que copiar los archivos fuente a `C:\Temp\Noemi\Centros\` (los `.xlsx` para los Excel y los `.pdf` de [2026/](2026/) para el script de PDFs) o editar las constantes `file`/`BASE` en cabecera. Mantener este patrón al añadir un quinto script para otro curso.

## ConsolidarCentros.py

Lee los 6 `agrupado_*.xlsx` generados por los scripts anteriores, normaliza `Cod_Centro` a string de 8 dígitos y hace un outer join. Para cada centro, toma el nombre y localidad de la fuente más reciente disponible (25/26 > 24/25 > 23/24 > 22/23). Suma las 3 columnas de 25/26 en `Vacantes_2526_total` y todas las columnas de curso en `Total`. Salida: `2026/salida/consolidado_2526.xlsx`.

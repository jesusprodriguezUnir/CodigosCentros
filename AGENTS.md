# AGENTS.md

## Pipeline (execute in order)

```powershell
pip install pandas openpyxl pdfplumber
python AnalizarExcel1.py   # 24/25 — single sheet, header row 1
python AnalizarExcel2.py   # 23/24 — multi-sheet, header row 3
python AnalizarExcel3.py   # 22/23 — multi-sheet, header row 3
python AnalizarPDF4.py     # 25/26 — 3 PDFs → 3 grouped Excel outputs
python ConsolidarCentros.py  # merges all 6 → consolidado_2526.xlsx + web/datos/consolidado.json
python web/app.py          # Flask UI on port 5000
```

## Critical gotchas

- **Hardcoded paths**: All 4 `Analizar*` scripts use absolute `C:\Temp\Noemi\Centros\` paths. Source Excel files must be copied there; PDFs from `2026/` must also be copied there. Edit `file`/`BASE` constants if repo location changes.
- **Column names differ by source**: `AnalizarExcel1` → `Codigo`/`LOCALIDAD`/`CENTRO`; `AnalizarExcel2/3` → `Codigo`/`Localidad`/`Nombre del centro`; `AnalizarPDF4` → `Cod_Centro`/`Localidad`/`Centro`. `ConsolidarCentros.py` normalises them.
- **PDF anexo parsing**: Lines sometimes split mid-field (CP falls at page edge). Script re-joins them only if the preceding line doesn't already end with N numeric tokens.
- **Open-file fallback**: If `consolidado_2526.xlsx` is open in Excel, `ConsolidarCentros.py` writes to `consolidado_2526_nuevo.xlsx` instead (PermissionError catch).
- **Output Excel**: Conditional formatting highlights vacancy cells ≥10 (red) and Total >40 (red).
- **Smoke test**: After merge, script checks that centre code `28071802` exists.

## Architecture

- `ConsolidarCentros.py` reads `agrupado_*.xlsx` from the repo directory (not `C:\Temp\Noemi\Centros\`), so it must run AFTER the 4 analysis scripts.
- Sources `2526_anexo_i` and `2526_anexo_via` carry a `CP` column; others don't. Priority for canonical Centro/Localidad: `2526 > 2425 > 2324 > 2223`.
- `web/app.py` serves the JSON produced by `ConsolidarCentros.py` at `web/datos/consolidado.json`.

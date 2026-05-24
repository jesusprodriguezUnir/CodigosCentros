import json
with open('web/datos/consolidado.json', encoding='utf-8') as f:
    centros = json.load(f)
print(f'Centros: {len(centros)}')
print(f'28071802 existe: {any(c["Cod_Centro"]=="28071802" for c in centros)}')
print(f'Con CP: {sum(1 for c in centros if c.get("CP"))}')
print(f'Localidades: {len(set(c["Localidad"] for c in centros if c.get("Localidad")))}')

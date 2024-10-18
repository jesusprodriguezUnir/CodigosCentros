import pandas as pd
import os

# Definir la ruta del archivo
file = r'C:\Temp\Noemi\Centros\rh09_118_2425_adj_def_mae_vac.xlsx'

# Verificar si el archivo existe
if os.path.exists(file):
    # Leer el archivo Excel
    df = pd.read_excel(file)
    
    # Verificar si las columnas 'Codigo', 'LOCALIDAD', 'CENTRO' y 'Vacantes' existen
    if {'Codigo', 'LOCALIDAD', 'CENTRO', 'Vacantes'}.issubset(df.columns):
        # Agrupar los valores por 'Codigo', 'LOCALIDAD' y 'CENTRO' y sumar las 'Vacantes'
        grouped_df = df.groupby(['Codigo', 'LOCALIDAD', 'CENTRO'])['Vacantes'].sum().reset_index(name='Total Vacantes')
        
        # Definir la ruta de salida para el archivo agrupado
        output_path = r'C:\Temp\Noemi\Centros\agrupado_columna_D.xlsx'
        
        # Guardar el resultado en un nuevo archivo Excel
        grouped_df.to_excel(output_path, index=False)
        print(f"Archivo guardado en: {output_path}")
    else:
        print("Las columnas 'Codigo', 'LOCALIDAD', 'CENTRO' o 'Vacantes' no existen en el archivo.")
else:
    print(f"Archivo no encontrado: {file}")
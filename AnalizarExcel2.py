import pandas as pd
import os

# Definir la ruta del archivo
file = r'C:\Temp\Noemi\Centros\rh09_118_2324_adj_def_pri_vac.xlsx'

# Verificar si el archivo existe
if os.path.exists(file):
    # Leer todas las hojas del archivo Excel, especificando que los nombres de las columnas están en la fila 3 (índice 2)
    sheets = pd.read_excel(file, sheet_name=None, header=2)
    
    # Lista para almacenar los DataFrames de todas las hojas
    df_list = []
    
    for sheet_name, df in sheets.items():
        # Seleccionar solo las columnas necesarias
        df = df.iloc[:, [0, 1, 2, 3]]
        
        # Renombrar las columnas según su posición
        df.columns = ['Localidad', 'Nombre del centro', 'Codigo', 'Vacantes']
        
        # Agregar el DataFrame a la lista
        df_list.append(df)
    
    # Concatenar todos los DataFrames en uno solo
    combined_df = pd.concat(df_list)
    
    # Verificar si las columnas 'Codigo', 'Vacantes', 'Localidad' y 'Nombre del centro' existen
    if {'Codigo', 'Vacantes', 'Localidad', 'Nombre del centro'}.issubset(combined_df.columns):
        # Agrupar los valores por 'Codigo', 'Localidad' y 'Nombre del centro' y sumar las 'Vacantes'
        grouped_df = combined_df.groupby(['Codigo', 'Localidad', 'Nombre del centro'])['Vacantes'].sum().reset_index(name='Total Vacantes')
        
        # Definir la ruta de salida para el archivo agrupado
        output_path = r'C:\Temp\Noemi\Centros\agrupado_vacantes.xlsx'
        
        # Guardar el resultado en un nuevo archivo Excel
        grouped_df.to_excel(output_path, index=False)
        print(f"Archivo guardado en: {output_path}")
    else:
        print("Las columnas 'Codigo', 'Vacantes', 'Localidad' o 'Nombre del centro' no existen en el archivo.")
else:
    print(f"Archivo no encontrado: {file}")
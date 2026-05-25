export type Vacantes = {
  c2223: number;
  c2324: number;
  c2425: number;
  c2526Rh09: number;
  c2526AnexoI: number;
  c2526AnexoVia: number;
};

export type Centro = {
  codigo: string;
  centro: string;   // nombre en Supabase
  localidad: string; // municipio en Supabase
  vacantes: Vacantes;
  total: number;
  // Campos enriquecidos (disponibles tras ingesta_centros.py)
  dat?: string;
  tipo?: string;
  titularidad?: string;
  jornada?: string;
  bilingue?: boolean;
  idiomas_bilingue?: string[];
  etapa?: string[];
  lat?: number;
  lng?: number;
  direccion?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  updated_at?: string;
};

export type Municipio = {
  nombre: string;
  centros: number;
};

export type Metricas = {
  totalCentros: number;
  totalMunicipios: number;
  totalVacantes2526: number;
  totalVacantesHistorico: number;
  generadoDesde: string;
};

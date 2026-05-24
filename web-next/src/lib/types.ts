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
  centro: string;
  localidad: string;
  vacantes: Vacantes;
  total: number;
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

import type { Centro, Vacantes } from "@/lib/types";

export function vacantes2526(vacantes: Vacantes): number {
  return vacantes.c2526Rh09 + vacantes.c2526AnexoI + vacantes.c2526AnexoVia;
}

export function delta2526vs2425(centro: Centro): number {
  return vacantes2526(centro.vacantes) - centro.vacantes.c2425;
}

export function scorePresionVacantes(centro: Centro): number {
  const v2526 = vacantes2526(centro.vacantes);
  return v2526 * 3 + centro.vacantes.c2425 * 2 + centro.vacantes.c2324;
}

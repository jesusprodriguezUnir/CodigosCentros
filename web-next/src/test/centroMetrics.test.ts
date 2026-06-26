import { describe, expect, it } from "vitest";
import { delta2526vs2425, scorePresionVacantes, vacantes2526 } from "@/lib/centroMetrics";
import type { Centro } from "@/lib/types";

const centroBase: Centro = {
  codigo: "28000001",
  centro: "Centro de prueba",
  localidad: "Madrid",
  vacantes: {
    c2223: 3,
    c2324: 4,
    c2425: 5,
    c2526Rh09: 6,
    c2526AnexoI: 2,
    c2526AnexoVia: 1,
  },
  total: 21,
};

describe("centroMetrics", () => {
  it("suma correctamente las vacantes de 25/26", () => {
    expect(vacantes2526(centroBase.vacantes)).toBe(9);
  });

  it("calcula la variación 25/26 vs 24/25", () => {
    expect(delta2526vs2425(centroBase)).toBe(4);
  });

  it("genera un score de presión ponderado", () => {
    expect(scorePresionVacantes(centroBase)).toBe(41);
  });
});

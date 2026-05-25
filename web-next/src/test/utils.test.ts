import { describe, it, expect } from "vitest";
import { normalizar, sortEs, formatNumber } from "@/lib/utils";

describe("normalizar", () => {
  it("elimina tildes", () => {
    expect(normalizar("Álcalá")).toBe("alcala");
  });
  it("convierte a minúsculas", () => {
    expect(normalizar("MADRID")).toBe("madrid");
  });
  it("mantiene espacios", () => {
    expect(normalizar("San Sebastián")).toBe("san sebastian");
  });
});

describe("sortEs", () => {
  it("ordena correctamente con ñ", () => {
    const arr = ["Zaragoza", "Ñoño", "Barcelona"];
    expect(arr.sort(sortEs)).toEqual(["Barcelona", "Ñoño", "Zaragoza"]);
  });
  it("ordena sin distinguir mayúsculas", () => {
    const arr = ["bota", "Ala", "coche"];
    expect(arr.sort(sortEs)).toEqual(["Ala", "bota", "coche"]);
  });
});

describe("formatNumber", () => {
  it("formatea con separador de miles español", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
  it("no añade decimales a enteros", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

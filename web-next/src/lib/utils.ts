import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const colator = new Intl.Collator("es", { sensitivity: "base" });
export function sortEs(a: string, b: string) {
  return colator.compare(a, b);
}

export function normalizar(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("es-ES").format(n);
}

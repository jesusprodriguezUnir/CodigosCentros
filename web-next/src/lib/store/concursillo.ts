import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Centro } from "@/lib/types";

export interface FiltrosConcursillo {
  texto: string;
  dat: string;
  tipo: string;
  jornada: string;
  soloConVacantes: boolean;
  soloBilingue: boolean;
  municipio: string;
  distrito: string;
}

export interface OrigenGeo {
  label: string;
  lat: number;
  lng: number;
}

interface ConcursilloState {
  /** Lista de centros en el orden preferido por el usuario */
  miOrden: Centro[];
  filtros: FiltrosConcursillo;
  origen: OrigenGeo | null;

  // Acciones
  addCentro: (c: Centro) => void;
  removeCentro: (codigo: string) => void;
  /** Reordena moviendo el item de `fromIdx` a `toIdx` */
  reorderCentro: (fromIdx: number, toIdx: number) => void;
  moverArriba: (codigo: string) => void;
  moverAbajo: (codigo: string) => void;
  setOrden: (codigo: string, posicion: number) => void;
  clearLista: () => void;
  setMiOrden: (lista: Centro[]) => void;
  setFiltros: (f: Partial<FiltrosConcursillo>) => void;
  setOrigen: (o: OrigenGeo | null) => void;
}

const FILTROS_DEFAULT: FiltrosConcursillo = {
  texto: "",
  dat: "",
  tipo: "",
  jornada: "",
  soloConVacantes: true,
  soloBilingue: false,
  municipio: "",
  distrito: "",
};

export const useConcursilloStore = create<ConcursilloState>()(
  persist(
    (set, get) => ({
      miOrden: [],
      filtros: FILTROS_DEFAULT,
      origen: null,

      addCentro: (c) =>
        set((s) => {
          if (s.miOrden.some((x) => x.codigo === c.codigo)) return s;
          return { miOrden: [...s.miOrden, c] };
        }),

      removeCentro: (codigo) =>
        set((s) => ({ miOrden: s.miOrden.filter((x) => x.codigo !== codigo) })),

      reorderCentro: (fromIdx, toIdx) =>
        set((s) => {
          const lista = [...s.miOrden];
          const [item] = lista.splice(fromIdx, 1);
          lista.splice(toIdx, 0, item);
          return { miOrden: lista };
        }),

      moverArriba: (codigo) =>
        set((s) => {
          const i = s.miOrden.findIndex((x) => x.codigo === codigo);
          if (i <= 0) return s;
          const lista = [...s.miOrden];
          [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]];
          return { miOrden: lista };
        }),

      moverAbajo: (codigo) =>
        set((s) => {
          const i = s.miOrden.findIndex((x) => x.codigo === codigo);
          if (i < 0 || i >= s.miOrden.length - 1) return s;
          const lista = [...s.miOrden];
          [lista[i], lista[i + 1]] = [lista[i + 1], lista[i]];
          return { miOrden: lista };
        }),

      setOrden: (codigo, posicion) =>
        set((s) => {
          const i = s.miOrden.findIndex((x) => x.codigo === codigo);
          if (i < 0) return s;
          const destIdx = Math.max(0, Math.min(posicion - 1, s.miOrden.length - 1));
          if (i === destIdx) return s;
          const lista = [...s.miOrden];
          const [item] = lista.splice(i, 1);
          lista.splice(destIdx, 0, item);
          return { miOrden: lista };
        }),

      clearLista: () => set({ miOrden: [] }),

      setMiOrden: (lista) => set({ miOrden: lista }),

      setFiltros: (f) =>
        set((s) => ({ filtros: { ...s.filtros, ...f } })),

      setOrigen: (o) => set({ origen: o }),
    }),
    {
      name: "concursillo:v1",
      // Solo persistimos la lista ordenada y el origen (no los filtros efímeros)
      partialize: (s) => ({ miOrden: s.miOrden, origen: s.origen }),
    }
  )
);

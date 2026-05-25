"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";

interface HeaderProps {
  updatedAt?: string | null;
}

export function Header({ updatedAt }: HeaderProps = {}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="bg-white border-b border-ink-200">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-madrid-600 text-white shadow-soft">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-madrid-600">
                Comunidad de Madrid
              </p>
              <h1 className="font-display text-xl font-bold text-ink-900">
                Buscador de Centros Educativos
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-600">
            <Link href="/" className="hover:text-madrid-600 transition-colors">
              Inicio
            </Link>
            <Link href="/lista-centros" className="font-semibold text-madrid-600 hover:text-madrid-700 transition-colors">
              Lista de centros
            </Link>
            <Link href="/mapa" className="hover:text-madrid-600 transition-colors">
              Mapa
            </Link>
            <span className="text-ink-300">·</span>
            <a
              href="https://www.comunidad.madrid/educacion/buscador-centros-educativos"
              target="_blank"
              rel="noreferrer"
              className="hover:text-madrid-600 transition-colors"
            >
              Fuente oficial
            </a>
            <button
              onClick={() => setPaletteOpen(true)}
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Buscar
              <kbd className="hidden lg:inline-flex items-center rounded border border-ink-200 bg-white px-1 py-0.5 text-[10px] font-mono text-ink-500">
                ⌘K
              </kbd>
            </button>
          </nav>
        </div>
        {updatedAt && (
          <div className="bg-madrid-50 border-t border-madrid-100 py-1.5 text-center text-xs text-madrid-700">
            Datos actualizados:{" "}
            <time dateTime={updatedAt}>
              {new Date(updatedAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
        )}
        <div className="cm-stripe" />
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

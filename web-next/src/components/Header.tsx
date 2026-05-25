import Link from "next/link";
import { GraduationCap } from "lucide-react";

interface HeaderProps {
  updatedAt?: string | null;
}

export function Header({ updatedAt }: HeaderProps = {}) {
  return (
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
          <Link href="/concursillo" className="font-semibold text-madrid-600 hover:text-madrid-700 transition-colors">
            Concursillo
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
  );
}

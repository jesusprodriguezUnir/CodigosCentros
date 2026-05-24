import { GraduationCap } from "lucide-react";

export function Header() {
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
          <a
            href="https://www.comunidad.madrid/educacion/buscador-centros-educativos"
            target="_blank"
            rel="noreferrer"
            className="hover:text-madrid-600 transition-colors"
          >
            Fuente oficial
          </a>
          <span className="text-ink-300">·</span>
          <span>Datos cursos 22/23 → 25/26</span>
        </nav>
      </div>
      <div className="cm-stripe" />
    </header>
  );
}

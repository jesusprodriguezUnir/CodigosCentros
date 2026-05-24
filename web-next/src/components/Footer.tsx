export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container py-8 text-sm text-ink-500">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>
            Datos consolidados a partir de las adjudicaciones oficiales publicadas por la
            Consejería de Educación de la Comunidad de Madrid.
          </p>
          <p className="text-ink-400">
            Web informativa · No reemplaza la información oficial publicada en{" "}
            <a
              className="text-madrid-600 hover:underline"
              href="https://www.comunidad.madrid/educacion/buscador-centros-educativos"
              target="_blank"
              rel="noreferrer"
            >
              comunidad.madrid
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

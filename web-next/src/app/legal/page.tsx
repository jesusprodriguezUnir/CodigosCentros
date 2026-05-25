import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Términos de Uso · Centros CM",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl prose prose-ink">
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Términos de Uso
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            Última actualización: 25 de mayo de 2026
          </p>

          <h2>1. Naturaleza del servicio</h2>
          <p>
            Centros CM es una herramienta informativa de carácter privado y sin ánimo de
            lucro. Los datos mostrados proceden de fuentes públicas de la Consejería de
            Educación de la Comunidad de Madrid y se ofrecen sin garantía de exactitud o
            vigencia. <strong>No reemplaza la información oficial</strong>; consulta
            siempre los documentos publicados en{" "}
            <a
              href="https://www.comunidad.madrid/educacion"
              target="_blank"
              rel="noreferrer"
              className="text-madrid-600"
            >
              comunidad.madrid
            </a>
            .
          </p>

          <h2>2. Uso aceptable</h2>
          <p>
            Al usar este servicio te comprometes a no publicar contenido que sea falso,
            difamatorio, ofensivo, discriminatorio o que vulnere derechos de terceros.
            Queda especialmente prohibido:
          </p>
          <ul>
            <li>Identificar o mencionar a personas individuales (profesorado, dirección) por su nombre.</li>
            <li>Publicar contenido de índole política, religiosa o comercial.</li>
            <li>Usar la plataforma para hacer spam o scraping automatizado.</li>
          </ul>

          <h2>3. Reseñas y comentarios</h2>
          <p>
            Las reseñas reflejan la opinión personal del autor y no las de los
            responsables del sitio. Nos reservamos el derecho de ocultar o eliminar
            cualquier contenido que incumpla estas normas, sin previo aviso.
          </p>
          <p>
            Al publicar una reseña, concedes una licencia no exclusiva para mostrarla en
            este sitio. Tu correo electrónico no se publicará; solo se mostrará el nombre
            de usuario que elijas.
          </p>

          <h2>4. Limitación de responsabilidad</h2>
          <p>
            El servicio se ofrece &laquo;tal cual&raquo;. No nos responsabilizamos de decisiones
            tomadas sobre la base de los datos aquí mostrados. Los tiempos de
            desplazamiento son estimaciones y pueden no reflejar las condiciones reales
            del tráfico.
          </p>

          <h2>5. Modificaciones</h2>
          <p>
            Podemos modificar estos términos en cualquier momento. Los cambios sustanciales
            se notificarán con al menos 7 días de antelación mediante un banner visible en
            la web.
          </p>

          <h2>6. Contacto</h2>
          <p>
            Para cualquier consulta:{" "}
            <a href="mailto:centroscm@proton.me" className="text-madrid-600">
              centroscm@proton.me
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

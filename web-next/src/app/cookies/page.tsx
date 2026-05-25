import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Política de Cookies · Centros CM",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl prose prose-ink">
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Política de Cookies
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            Última actualización: 25 de mayo de 2026
          </p>

          <h2>¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que los sitios web almacenan en
            tu dispositivo cuando los visitas. Permiten que el sitio recuerde información
            sobre tu visita para que sea más fácil volver a visitarlo y que resulte más
            útil.
          </p>

          <h2>Cookies que usamos</h2>

          <h3>Cookies estrictamente necesarias</h3>
          <p>
            Son imprescindibles para el funcionamiento del sitio. Sin ellas no se pueden
            ofrecer ciertos servicios. No requieren tu consentimiento.
          </p>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Proveedor</th>
                <th>Finalidad</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sb-*</code></td>
                <td>Supabase</td>
                <td>Gestión de sesión de usuario (autenticación)</td>
                <td>1 semana</td>
              </tr>
            </tbody>
          </table>

          <h3>Cookies analíticas</h3>
          <p>
            Permiten conocer cómo los visitantes interactúan con el sitio. La información
            se recoge de forma anónima y agregada.
          </p>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Proveedor</th>
                <th>Finalidad</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>va-*</code></td>
                <td>Vercel Analytics</td>
                <td>Estadísticas de uso anónimas (sin IP ni identificadores personales)</td>
                <td>Sesión</td>
              </tr>
            </tbody>
          </table>

          <h2>Cookies de terceros</h2>
          <p>
            El mapa utiliza tiles de{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="text-madrid-600"
            >
              OpenStreetMap
            </a>{" "}
            servidos por CARTO. Estos proveedores pueden establecer sus propias cookies.
            Consulta sus políticas de privacidad para más información.
          </p>

          <h2>Cómo gestionar las cookies</h2>
          <p>
            Puedes configurar tu navegador para rechazar o eliminar cookies en cualquier
            momento. Ten en cuenta que deshabilitar las cookies necesarias afectará al
            funcionamiento del sitio (p. ej., no podrás iniciar sesión).
          </p>
          <ul>
            <li>
              <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer" className="text-madrid-600">
                Google Chrome
              </a>
            </li>
            <li>
              <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noreferrer" className="text-madrid-600">
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer" className="text-madrid-600">
                Safari
              </a>
            </li>
            <li>
              <a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noreferrer" className="text-madrid-600">
                Microsoft Edge
              </a>
            </li>
          </ul>

          <h2>Contacto</h2>
          <p>
            Para cualquier consulta sobre el uso de cookies:{" "}
            <a href="mailto:centroscm@proton.me" className="text-madrid-600">
              centroscm@proton.me
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

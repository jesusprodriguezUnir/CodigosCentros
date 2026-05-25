import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Política de Privacidad · Centros CM",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-2xl prose prose-ink">
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Política de Privacidad
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            Última actualización: 25 de mayo de 2026
          </p>

          <h2>1. Responsable del tratamiento</h2>
          <p>
            Este sitio web es un proyecto informativo sin ánimo de lucro desarrollado
            por un particular. Correo de contacto:{" "}
            <a href="mailto:centroscm@proton.me" className="text-madrid-600">
              centroscm@proton.me
            </a>
            .
          </p>

          <h2>2. Datos que recogemos</h2>
          <ul>
            <li>
              <strong>Correo electrónico</strong>: si decides crear una cuenta (opcional),
              para enviarte el enlace de acceso y asociar tu lista de centros y
              reseñas.
            </li>
            <li>
              <strong>Lista de centros</strong>: si la guardas en tu cuenta, se
              almacena en nuestra base de datos asociada a tu correo.
            </li>
            <li>
              <strong>Reseñas y comentarios</strong>: texto público asociado a tu
              identificador de usuario. Tu correo no se muestra públicamente.
            </li>
            <li>
              <strong>Datos de uso</strong>: a través de Vercel Analytics (sin cookies de
              seguimiento) recopilamos métricas agregadas de rendimiento de la página.
            </li>
          </ul>

          <h2>3. Finalidad y base jurídica</h2>
          <p>
            El tratamiento se basa en el consentimiento que prestas al crear tu cuenta.
            Los datos se utilizan exclusivamente para prestarte el servicio (guardar lista,
            publicar reseñas) y mejorar la herramienta.
          </p>

          <h2>4. Conservación</h2>
          <p>
            Tus datos se conservan mientras mantengas tu cuenta activa. Puedes solicitar
            el borrado en cualquier momento escribiendo al correo de contacto; las reseñas
            quedarán anonimizadas (no eliminadas) para preservar la integridad del
            historial.
          </p>

          <h2>5. Derechos</h2>
          <p>
            Tienes derecho a acceder, rectificar, suprimir y portar tus datos. Escríbenos
            al correo de contacto con asunto "Protección de datos".
          </p>

          <h2>6. Terceros</h2>
          <ul>
            <li>
              <strong>Supabase</strong> (proveedor de base de datos y autenticación) —
              datos alojados en la región EU West (Irlanda).
            </li>
            <li>
              <strong>Vercel</strong> (alojamiento web) — datos de acceso según su propia
              política.
            </li>
            <li>
              Los mapas utilizan tiles de <strong>OpenStreetMap</strong> sin enviar datos
              personales.
            </li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            Solo utilizamos una cookie de sesión estrictamente necesaria para mantener tu
            sesión iniciada. No usamos cookies de publicidad ni de seguimiento de terceros.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

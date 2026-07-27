// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Dominio canónico. Debe coincidir con `SITE.url` de src/config/site.ts:
 * de ahí salen las canonical, el sitemap y las URLs de Open Graph.
 */
const SITE_URL = 'https://www.reformasarana.es';

/**
 * Configuración de Astro.
 *
 * `site` es obligatorio para generar canonical URLs absolutas, Open Graph
 * y el sitemap.xml. Cámbialo por el dominio real antes de desplegar.
 *
 * Salida `static`: cero JavaScript de framework, HTML plano servido desde el
 * CDN de Cloudflare Pages -> TTFB y LCP mínimos.
 */
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: {
    // Genera /servicios/reforma-integral.html en lugar de /…/index.html:
    // Cloudflare Pages lo sirve como /servicios/reforma-integral sin redirección.
    format: 'file',
    inlineStylesheets: 'auto',
  },
  // `prefetch` queda deliberadamente desactivado: la integración inyecta ~1 KB
  // de JS en todas las páginas y el sitio se sirve completo desde el CDN de
  // Cloudflare. Objetivo cumplido: 0 KB de JavaScript en el cliente.
  // Para activarlo: prefetch: { defaultStrategy: 'hover' }.
  image: {
    // Control explícito de `widths`/`sizes` en cada <Image />: srcset ajustado
    // al hueco real de cada componente, sin CSS inyectado que interfiera.
    domains: [],
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/gracias') && !page.includes('/404'),
      changefreq: 'monthly',
      lastmod: new Date(),
      serialize(item) {
        // Prioridad mayor para home y landings comerciales.
        // La raíz llega sin barra final por `trailingSlash: 'never'`, igual que
        // la canonical que emite el componente SEO.
        if (item.url === SITE_URL) return { ...item, priority: 1.0 };
        if (item.url.includes('/servicios')) return { ...item, priority: 0.9 };
        if (item.url.includes('/proyectos')) return { ...item, priority: 0.7 };
        if (/aviso-legal|politica-de/.test(item.url)) return { ...item, priority: 0.1 };
        return { ...item, priority: 0.6 };
      },
    }),
  ],
  vite: {
    // Cast necesario: el paquete tailwindcss/vite resuelve su propio `vite`,
    // por lo que TypeScript ve dos tipos `Plugin` estructuralmente distintos.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});

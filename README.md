# Grupo S Valles — web corporativa

Web corporativa para empresa de reformas construida con **Astro 5 + TypeScript + Tailwind CSS 4**.
Salida estática, **0 KB de JavaScript en el cliente**, SEO técnico completo y lista para desplegar en
**Cloudflare Pages** con **Supabase** como base de datos del formulario y futuro panel de administración.

> Los datos de la empresa (nombre, NAP, precios, textos) son de ejemplo y están centralizados en
> `src/config/site.ts`. Las imágenes son placeholders generados por script: sustitúyelas por
> fotografías reales manteniendo los nombres de archivo.

## Resultados medidos

Lighthouse 12 sobre el build de producción (`astro build` + `astro preview`, Chrome headless):

| Página | Preset | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- | --- |
| `/` | desktop | 100 | 100 | 100 | 100 |
| `/servicios/reforma-de-banos` | desktop | 100 | 100 | 100 | 100 |
| `/contacto` | desktop | 100 | 100 | 100 | 100 |
| `/` | mobile | 100 | 100 | 100 | 100 |
| `/proyectos` | mobile | 100 | 100 | 100 | 100 |
| `/sobre-nosotros` | mobile | 100 | 100 | 100 | 100 |

Core Web Vitals de laboratorio (mobile, throttling por defecto de Lighthouse): **LCP 0,9-1,1 s ·
CLS 0 · TBT 0 ms**. En producción, servido desde el CDN de Cloudflare, el TTFB baja aún más.

Además: **0 archivos JS** en `dist/`, un único CSS de ~35 KB sin minificar (~7 KB con Brotli) y
22 páginas generadas.

## Comandos

```bash
npm install            # instala dependencias y ejecuta astro sync
npm run dev            # servidor de desarrollo en http://localhost:4321
npm run build          # build de producción en dist/
npm run preview        # sirve dist/ como lo hará Cloudflare
npm run check          # astro check: tipos en .astro, .ts y contenido
npm test               # tests de la validación del formulario (runner de Node)
npm run audit:seo      # auditoría SEO/accesibilidad del HTML generado
npm run images:generate # regenera los assets placeholder (WebP/JPEG/PNG)
npm run images:hero    # regenera el fondo del hero y el lema rasterizado
```

Auditoría con Lighthouse en local (requiere Chrome):

```bash
npm run build && npm run preview &
npx lighthouse http://localhost:4321/ --view \
  --only-categories=performance,accessibility,best-practices,seo
```

`npm run audit:seo` es un control propio que revisa el HTML de `dist/` y **falla el build** si
detecta: títulos o meta descriptions duplicados o fuera de rango, canonical incorrecta, más de un
`<h1>`, JSON-LD no parseable o sin `LocalBusiness`/`WebSite`/`WebPage`, imágenes sin `alt`,
`width`/`height` o `loading`, enlaces internos roto, o páginas ausentes del sitemap.

## Arquitectura

```
astro.config.mjs           site, sitemap, Tailwind v4, formato de URLs
tsconfig.json              strict + alias (@components, @lib, @config, @assets)
src/
├─ config/site.ts          fuente única: NAP, horarios, redes, stats, navegación
├─ content.config.ts       colecciones (servicios, proyectos) validadas con zod
├─ content/
│  ├─ servicios/*.md       6 servicios con FAQ, precios, plazos y cuerpo Markdown
│  └─ proyectos/*.md       6 proyectos con ficha técnica y testimonio
├─ layouts/
│  ├─ BaseLayout.astro     <head> + SEO + grafo JSON-LD + header/footer + skip link
│  └─ LegalLayout.astro    páginas legales
├─ components/             SEO, Header, Footer, Hero, Section, ServiceCard,
│                          ProjectCard, Faq, Process, Testimonials, CtaBanner,
│                          ContactForm, Breadcrumbs, PageHeader, Button, Icon, Logo
├─ lib/
│  ├─ seo.ts               canonical, normalización de rutas, formatos es-ES
│  ├─ schema.ts            constructores de JSON-LD (@graph con @id estables)
│  ├─ icons.ts             catálogo de iconos SVG tipado
│  ├─ contact-validation.ts validación del formulario (compartida)
│  └─ supabase.ts          cliente REST tipado (sin dependencias)
├─ pages/                  home, servicios (índice + detalle), proyectos
│                          (índice + detalle), sobre-nosotros, contacto,
│                          contacto/gracias, 3 páginas legales, 404
└─ styles/global.css       tokens de diseño Tailwind v4 + base + .rich-text
functions/api/contact.ts   Cloudflare Pages Function del formulario
supabase/schema.sql        tablas, RLS y vistas
public/                    robots.txt, _headers, _routes.json, favicon, OG, manifest
scripts/                   generación de imágenes y auditoría SEO
tests/                     tests de validación
```

### Decisiones técnicas

**Cero JavaScript.** No hay islas ni hidratación. El menú móvil y las FAQ usan
`<details>`/`<summary>` nativos (apertura, teclado y estado anunciado por lectores de pantalla sin
scripts). El formulario es un `POST` HTML nativo. La integración `prefetch` de Astro está desactivada
a propósito porque inyecta ~1 KB de JS en cada página. Consecuencia: la CSP puede ser
`script-src 'none'`.

**Tipografía del sistema.** Sin fuentes web: 0 KB de descarga, sin `@font-face` bloqueante y sin CLS
por intercambio de fuente. Es la palanca más rentable de LCP en una web de contenido.

**Imágenes.** Todo el contenido se sirve en **WebP** vía `<Image />` de Astro con `srcset`/`sizes`
explícitos por componente. Las imágenes above-the-fold van con `loading="eager"` +
`fetchpriority="high"` y el resto con `loading="lazy"`; todas llevan `width`/`height` para reservar
espacio (CLS 0). Las imágenes sociales sí son JPEG/PNG porque varios crawlers no leen WebP.

**SEO técnico.** Un componente `SEO.astro` centraliza `title`/`description` únicos por página,
canonical absoluta, `robots` (`max-image-preview:large`), Open Graph, Twitter Cards, `hreflang` y
JSON-LD. El grafo schema.org se construye en `src/lib/schema.ts` con nodos `@id` estables
(`GeneralContractor`/`LocalBusiness` + `WebSite` + `WebPage` + `BreadcrumbList` + `Service` +
`FAQPage` + `Review`), de modo que las entidades se referencian entre sí en lugar de duplicarse.
Las migas de pan visuales y el `BreadcrumbList` salen de los mismos datos: no pueden desincronizarse.

**URLs.** `trailingSlash: 'never'` + `build.format: 'file'`: `/servicios/reforma-de-banos` sin
extensión ni barra final, con canonical y sitemap emitiendo exactamente la misma cadena para no
generar señales de duplicado.

**Accesibilidad (WCAG 2.1 AA).** Landmarks (`header`/`main`/`footer`/`nav` etiquetados), skip link,
jerarquía de encabezados sin saltos, foco visible con `:focus-visible` en todo elemento interactivo,
objetivos táctiles de 44 px mínimo, paleta verificada (texto principal 12,6:1; botón primario 5,8:1),
`aria-current="page"` en la navegación, formularios con `label` asociada y ayudas por
`aria-describedby`, y `prefers-reduced-motion` respetado.

## Contenido

Los servicios y proyectos son Markdown con frontmatter validado por zod
(`src/content.config.ts`). Añadir un servicio = crear `src/content/servicios/mi-servicio.md`: la
página `/servicios/mi-servicio`, su ficha, sus FAQ (con `FAQPage` en JSON-LD), su entrada en el
sitemap, en el footer y en el desplegable del formulario se generan solas.

Si el frontmatter no cumple el esquema (por ejemplo, una `description` de más de 158 caracteres), el
build falla con el error exacto. Es intencionado: evita publicar metadatos que Google truncaría.

## Despliegue en Cloudflare Pages

1. Sube el repositorio a GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Configuración de build:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** variable de entorno `NODE_VERSION = 22`
4. Variables de entorno (**Settings → Environment variables**), ver `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` → marcar como **Secret** (encrypt)
   - `IP_HASH_SALT`, `NOTIFICATION_EMAIL`, `RESEND_API_KEY` (opcionales)
5. **Custom domains** → añade `www.reformasarana.es` y crea una regla de redirección del dominio
   raíz al `www` (o al contrario), para que solo exista una versión canónica.
6. Antes del primer despliegue real, cambia el dominio en `astro.config.mjs` (`SITE_URL`),
   `src/config/site.ts` (`SITE.url`) y `public/robots.txt`.

`functions/api/contact.ts` se despliega automáticamente como Pages Function. `public/_routes.json`
limita el runtime a `/api/*`: el resto se sirve como estático puro desde el CDN.
`public/_headers` aplica HSTS, CSP con `script-src 'none'`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy` y caché inmutable para `/_astro/*`.

### Prueba local del formulario

```bash
cp .env.example .dev.vars      # rellena SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm run build
npx wrangler pages dev dist    # sirve el estático + las Functions
```

## Supabase

1. Crea el proyecto en Supabase y ejecuta `supabase/schema.sql` en el **SQL Editor**.
2. Copia `Project URL` y la clave `service_role` (Settings → API) a las variables de Cloudflare.

El esquema crea la tabla `leads` con constraints (email, longitudes, estados del embudo), índices
por fecha/estado/servicio, trigger de `updated_at` y **RLS activado sin políticas para `anon`**: la
clave pública no puede leer ni escribir nada. La Pages Function usa `service_role` desde el servidor,
que no está sujeta a RLS, y el navegador nunca ve ninguna credencial.

El formulario además hashea la IP (SHA-256 truncado con sal) en lugar de almacenarla: permite
detectar abuso sin guardar un dato personal en claro.

### Roadmap del panel de administración

**Fase 1 — Gestión de leads (inmediata).** Ya está todo lo necesario: tabla `leads`, vista
`leads_resumen` y `listLeads()` en `src/lib/supabase.ts`. Basta activar Supabase Auth (email +
contraseña, sin registro público) y usar el propio Supabase Studio o una pequeña app protegida.

**Fase 2 — Contenido editable.** `supabase/schema.sql` incluye ya `servicios` y `proyectos` con el
mismo esquema que las content collections. Para migrar, sustituye el `loader` de
`src/content.config.ts` por un loader propio que lea de Supabase:

```ts
// src/loaders/supabase-loader.ts (esbozo)
import type { Loader } from 'astro/loaders';

export function supabaseLoader(table: 'servicios' | 'proyectos'): Loader {
  return {
    name: `supabase-${table}`,
    load: async ({ store, parseData, generateDigest }) => {
      const rows = await fetchRows(table); // REST con la anon key: solo draft = false
      store.clear();
      for (const row of rows) {
        const data = await parseData({ id: row.slug, data: row });
        store.set({ id: row.slug, data, digest: generateDigest(data) });
      }
    },
  };
}
```

Las páginas no cambian porque el `schema` de zod sigue siendo el contrato. Con un webhook de Supabase
que dispare un *Deploy Hook* de Cloudflare Pages, cada cambio en el panel republica el sitio estático
(sigue habiendo 0 JS y el rendimiento se mantiene).

**Fase 3 — Panel propio.** Si se quiere una UI a medida, añade el adaptador
`@astrojs/cloudflare` y monta las rutas `/admin` en modo SSR con `export const prerender = false`,
dejando el resto del sitio estático (renderizado híbrido). La autenticación con Supabase Auth y RLS
por rol ya está preparada en el esquema.

## Checklist antes de lanzar

- [ ] Cambiar `SITE_URL`, `SITE.url` y `robots.txt` al dominio real.
- [ ] Sustituir los datos de `src/config/site.ts` por los reales (NAP, CIF, horarios, redes).
- [ ] Reemplazar las imágenes de `src/assets/` y `public/og/` por fotografía profesional
      (mismo nombre y proporción). Revisar los textos `alt`.
- [ ] Revisar precios, plazos y textos legales con la empresa y su asesoría.
- [ ] Verificar la propiedad en Google Search Console y rellenar
      `SITE.googleSiteVerification`; enviar `sitemap-index.xml`.
- [ ] Validar el marcado en el test de resultados enriquecidos de Google y en Schema.org Validator.
- [ ] Crear/optimizar el perfil de Google Business con el mismo NAP que el JSON-LD.
- [ ] Probar el formulario en producción y confirmar que el lead llega a Supabase.
- [ ] Ejecutar `npm run audit:seo` y Lighthouse sobre el dominio final.

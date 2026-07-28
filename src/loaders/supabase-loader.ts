/**
 * Loader de Supabase para Astro Content Layer.
 *
 * Lee las tablas `servicios` y `proyectos` de Supabase en tiempo de build
 * y las inyecta en el Content Store de Astro. Las páginas y el schema de zod
 * no cambian: solo cambia el origen de los datos.
 */
import type { Loader } from 'astro/loaders';

function getEnv(name: string): string | undefined {
  // Astro build: import.meta.env; Node scripts: process.env
  try {
    return (import.meta as any).env?.[name] ?? process.env[name];
  } catch {
    return process.env[name];
  }
}

async function fetchRows(table: string): Promise<Record<string, unknown>[]> {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error(
      `Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el entorno. ` +
        `Añádelas en .env o en las variables de build de Cloudflare Pages.`,
    );
  }

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${table}?draft=eq.false&order=order.asc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Supabase ${table}: HTTP ${response.status} — ${body.slice(0, 300)}`);
  }

  return response.json() as Promise<Record<string, unknown>[]>;
}

/**
 * Transforma los nombres de columna (snake_case en Supabase) al formato
 * camelCase que espera el schema de zod definido en content.config.ts.
 */
function mapServicio(row: Record<string, unknown>): Record<string, unknown> {
  // Los campos JSONB pueden llegar como string si se insertaron con JSON.stringify
  const parse = (val: unknown) => typeof val === 'string' ? JSON.parse(val) : val;

  return {
    title: row.title,
    shortTitle: row.short_title ?? null,
    seoTitle: row.seo_title ?? null,
    description: row.description,
    excerpt: row.excerpt,
    cover: row.cover_url,
    coverAlt: row.cover_alt,
    icon: row.icon,
    order: row.order,
    priceFrom: row.price_from ?? null,
    priceUnit: row.price_unit,
    duration: row.duration ?? null,
    features: parse(row.features),
    includes: parse(row.includes),
    faqs: parse(row.faqs),
    updatedAt: row.updated_at,
    draft: row.draft,
  };
}

function mapProyecto(row: Record<string, unknown>): Record<string, unknown> {
  // highlights y testimonial pueden venir como string JSON desde Supabase
  const highlights = typeof row.highlights === 'string'
    ? JSON.parse(row.highlights)
    : row.highlights;
  const testimonial = typeof row.testimonial === 'string'
    ? JSON.parse(row.testimonial)
    : row.testimonial;

  return {
    title: row.title,
    description: row.description,
    excerpt: row.excerpt,
    cover: row.cover_url,
    coverAlt: row.cover_alt,
    servicio: row.servicio_slug,
    location: row.location,
    year: row.year,
    surface: row.surface,
    duration: row.duration,
    budgetRange: row.budget_range ?? null,
    highlights,
    testimonial: testimonial ?? null,
    featured: row.featured,
    order: row.order,
    updatedAt: row.updated_at,
    draft: row.draft,
  };
}

export function supabaseLoader(table: 'servicios' | 'proyectos'): Loader {
  return {
    name: `supabase-${table}`,
    load: async ({ store, parseData, generateDigest, renderMarkdown, logger }) => {
      const mapper = table === 'servicios' ? mapServicio : mapProyecto;

      const sync = async () => {
        const rows = await fetchRows(table);
        store.clear();

        for (const row of rows) {
          const slug = row.slug as string;
          const mapped = mapper(row);
          const data = await parseData({ id: slug, data: mapped });
          const digest = generateDigest(data);
          const bodyMd = row.body_md as string | undefined;

          store.set({
            id: slug,
            data,
            digest,
            // Raw body para quien quiera leer el Markdown fuente.
            ...(bodyMd ? { body: bodyMd } : {}),
            // Necesario para que `render()`/`<Content />` funcionen: sin
            // `rendered.html`, el componente no imprime nada aunque `body`
            // contenga el Markdown en crudo.
            ...(bodyMd ? { rendered: await renderMarkdown(bodyMd) } : {}),
          });
        }
      };

      await sync();

      // En `astro dev` no hay recarga automática al cambiar filas en Supabase
      // (a diferencia del loader `glob`, que usa un watcher de sistema de
      // archivos). Se sondea la tabla cada pocos segundos para que los
      // cambios hechos desde el panel de administración se vean sin tener
      // que reiniciar el servidor de desarrollo. En build de producción esto
      // no se activa: `load()` se ejecuta una única vez.
      if (import.meta.env.DEV) {
        setInterval(() => {
          sync().catch((error) => {
            logger.error(`Error al resincronizar "${table}" desde Supabase: ${error}`);
          });
        }, 5000);
      }
    },
  };
}

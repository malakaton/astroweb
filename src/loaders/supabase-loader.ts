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
    features: row.features,
    includes: row.includes,
    faqs: row.faqs,
    updatedAt: row.updated_at,
    draft: row.draft,
  };
}

function mapProyecto(row: Record<string, unknown>): Record<string, unknown> {
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
    highlights: row.highlights,
    testimonial: row.testimonial ?? null,
    featured: row.featured,
    order: row.order,
    updatedAt: row.updated_at,
    draft: row.draft,
  };
}

export function supabaseLoader(table: 'servicios' | 'proyectos'): Loader {
  return {
    name: `supabase-${table}`,
    load: async ({ store, parseData, generateDigest }) => {
      const rows = await fetchRows(table);
      store.clear();

      const mapper = table === 'servicios' ? mapServicio : mapProyecto;

      for (const row of rows) {
        const slug = row.slug as string;
        const mapped = mapper(row);
        const data = await parseData({ id: slug, data: mapped });
        const digest = generateDigest(data);
        store.set({
          id: slug,
          data,
          digest,
          // Si hay contenido Markdown en body_md, se renderiza con <Content />
          ...(row.body_md ? { body: row.body_md as string } : {}),
        });
      }
    },
  };
}

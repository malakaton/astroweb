/**
 * Loader de Supabase para Astro Content Layer.
 *
 * Sustituye al loader de glob (archivos .md) por una lectura directa a la
 * base de datos. Las páginas y el schema de zod no cambian: solo cambia
 * el origen de los datos.
 *
 * Uso en src/content.config.ts:
 *   import { supabaseLoader } from './loaders/supabase-loader';
 *   const proyectos = defineCollection({
 *     loader: supabaseLoader('proyectos'),
 *     schema: ...  // igual que antes
 *   });
 */
import type { Loader } from 'astro/loaders';

const SUPABASE_URL = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

async function fetchRows(table: string): Promise<Record<string, unknown>[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      `Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el entorno. ` +
      `Añádelas en .env o en las variables de build de Cloudflare.`
    );
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}?draft=eq.false&order=order.asc`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<Record<string, unknown>[]>;
}

/**
 * Transforma los nombres de columnas de Supabase (snake_case) al formato
 * que espera el schema de zod (camelCase / nombres del frontmatter).
 */
function mapRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  if (table === 'proyectos') {
    return {
      title: row.title,
      description: row.description,
      excerpt: row.excerpt,
      // En vez de una imagen local, se usa la URL pública del Storage
      cover: row.cover_url,
      coverAlt: row.cover_alt,
      servicio: row.servicio_slug,
      location: row.location,
      year: row.year,
      surface: row.surface,
      duration: row.duration,
      budgetRange: row.budget_range,
      highlights: row.highlights,
      testimonial: row.testimonial,
      featured: row.featured,
      order: row.order,
      updatedAt: row.updated_at,
      draft: row.draft,
    };
  }

  if (table === 'servicios') {
    return {
      title: row.title,
      shortTitle: row.short_title,
      seoTitle: row.seo_title,
      description: row.description,
      excerpt: row.excerpt,
      cover: row.cover_url,
      coverAlt: row.cover_alt,
      icon: row.icon,
      order: row.order,
      priceFrom: row.price_from,
      priceUnit: row.price_unit,
      duration: row.duration,
      features: row.features,
      includes: row.includes,
      faqs: row.faqs,
      updatedAt: row.updated_at,
      draft: row.draft,
    };
  }

  return row;
}

export function supabaseLoader(table: 'servicios' | 'proyectos'): Loader {
  return {
    name: `supabase-${table}`,
    load: async ({ store, parseData, generateDigest }) => {
      const rows = await fetchRows(table);
      store.clear();

      for (const row of rows) {
        const slug = row.slug as string;
        const mapped = mapRow(table, row);
        const data = await parseData({ id: slug, data: mapped });
        const digest = generateDigest(data);
        store.set({
          id: slug,
          data,
          digest,
          // Si el campo body_md tiene contenido Markdown, se renderiza
          ...(row.body_md ? { body: row.body_md as string } : {}),
        });
      }
    },
  };
}

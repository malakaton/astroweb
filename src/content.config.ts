import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { supabaseLoader } from './loaders/supabase-loader';

/**
 * Content collections (Content Layer de Astro 5).
 *
 * En producción el contenido se lee de Supabase en tiempo de build. El schema
 * de zod sigue siendo el contrato: si alguien introduce un dato inválido en
 * la tabla, el build falla con un error claro antes de publicar.
 *
 * En **desarrollo local** (`astro dev` / `astro build --mode development`)
 * se usan los ficheros Markdown de `src/content/{servicios,proyectos}/*.md`
 * en su lugar, para poder trabajar sin conexión a Supabase (p. ej. cuando un
 * proxy corporativo como Cloudflare WARP/Zero Trust bloquea la conexión al
 * proyecto). Basta con no tener `SUPABASE_URL`/`SUPABASE_ANON_KEY` definidas,
 * o con arrancar `npm run dev`, para que se use el Markdown local.
 *
 * `cover` admite dos formatos según el origen:
 *  - Supabase: URL absoluta al Storage (`z.string().url()`).
 *  - Markdown local: ruta relativa a `src/assets/...` procesada por Astro.
 */

/**
 * Usar Supabase solo si estamos en un build de producción (no `astro dev`)
 * y además hay credenciales configuradas. En cualquier otro caso, se cae al
 * Markdown local sin lanzar error, para no bloquear el desarrollo cuando no
 * hay acceso a Supabase.
 */
const useSupabase =
  !import.meta.env.DEV && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY);

const faqSchema = z.array(
  z.object({
    question: z.string().min(8),
    answer: z.string().min(20),
  }),
);

const servicios = defineCollection({
  loader: useSupabase ? supabaseLoader('servicios') : glob({ pattern: '*.md', base: './src/content/servicios' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(70),
      shortTitle: z.string().max(32).nullable().optional(),
      seoTitle: z.string().max(60).nullable().optional(),
      description: z.string().min(70).max(158),
      excerpt: z.string().max(200),
      /** URL pública en Supabase Storage, o asset local (`src/assets/...`) en dev */
      cover: z.union([z.string().url(), image()]),
      coverAlt: z.string().min(10),
      icon: z.enum([
        'home', 'kitchen', 'droplet', 'roller', 'wrench', 'ruler', 'lightning', 'file-text',
      ]),
      order: z.number().int().default(99),
      priceFrom: z.number().int().positive().nullable().optional(),
      priceUnit: z.string().default('proyecto'),
      duration: z.string().nullable().optional(),
      features: z.array(z.string()).min(3).max(8),
      includes: z.array(z.string()).min(3),
      faqs: faqSchema.default([]),
      updatedAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

const proyectos = defineCollection({
  loader: useSupabase ? supabaseLoader('proyectos') : glob({ pattern: '*.md', base: './src/content/proyectos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(70),
      description: z.string().min(70).max(158),
      excerpt: z.string().max(220),
      /** URL pública en Supabase Storage, o asset local (`src/assets/...`) en dev */
      cover: z.union([z.string().url(), image()]),
      coverAlt: z.string().min(10),
      /** slug del servicio relacionado */
      servicio: z.string(),
      location: z.string(),
      year: z.number().int().min(2000).max(2100),
      surface: z.number().int().positive(),
      duration: z.string(),
      budgetRange: z.string().nullable().optional(),
      highlights: z.array(z.string()).min(2).max(6),
      testimonial: z
        .object({
          quote: z.string().min(30),
          author: z.string(),
          role: z.string().optional(),
          rating: z.number().min(1).max(5).default(5),
        })
        .nullable()
        .optional(),
      featured: z.boolean().default(false),
      order: z.number().int().default(99),
      updatedAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { servicios, proyectos };

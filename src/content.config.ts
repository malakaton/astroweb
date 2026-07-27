import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content collections (Content Layer de Astro 5).
 *
 * El contenido vive en Markdown validado con zod: tipado en tiempo de build,
 * cero llamadas en runtime y URLs derivadas del nombre de archivo (slug limpio).
 * Cuando se conecte Supabase como panel de administración basta sustituir el
 * `loader` por un loader propio que lea de la base de datos manteniendo el
 * mismo `schema`; las páginas no cambian.
 */

const faqSchema = z.array(
  z.object({
    question: z.string().min(8),
    answer: z.string().min(20),
  }),
);

const servicios = defineCollection({
  loader: glob({ base: './src/content/servicios', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      /** H1 de la página de servicio */
      title: z.string().max(70),
      /** Etiqueta corta para menús y tarjetas */
      shortTitle: z.string().max(32).optional(),
      /** <title> del documento; si falta se usa `title` */
      seoTitle: z.string().max(60).optional(),
      /** meta description única (máx. 158 caracteres) */
      description: z.string().min(70).max(158),
      /** Resumen para tarjetas y listados */
      excerpt: z.string().max(200),
      cover: image(),
      coverAlt: z.string().min(10),
      icon: z.enum([
        'home',
        'kitchen',
        'droplet',
        'roller',
        'wrench',
        'ruler',
        'lightning',
        'file-text',
      ]),
      order: z.number().int().default(99),
      priceFrom: z.number().int().positive().optional(),
      priceUnit: z.string().default('proyecto'),
      duration: z.string().optional(),
      /** Bullets de venta */
      features: z.array(z.string()).min(3).max(8),
      /** Qué incluye el servicio */
      includes: z.array(z.string()).min(3),
      faqs: faqSchema.default([]),
      updatedAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

const proyectos = defineCollection({
  loader: glob({ base: './src/content/proyectos', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(70),
      description: z.string().min(70).max(158),
      excerpt: z.string().max(220),
      cover: image(),
      coverAlt: z.string().min(10),
      /** Servicio relacionado: enlazado interno automático */
      servicio: reference('servicios'),
      location: z.string(),
      year: z.number().int().min(2000).max(2100),
      /** Superficie en m² */
      surface: z.number().int().positive(),
      duration: z.string(),
      budgetRange: z.string().optional(),
      highlights: z.array(z.string()).min(2).max(6),
      testimonial: z
        .object({
          quote: z.string().min(30),
          author: z.string(),
          role: z.string().optional(),
          rating: z.number().min(1).max(5).default(5),
        })
        .optional(),
      featured: z.boolean().default(false),
      order: z.number().int().default(99),
      updatedAt: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { servicios, proyectos };

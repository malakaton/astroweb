import { defineCollection, z } from 'astro:content';
import { supabaseLoader } from './loaders/supabase-loader';

/**
 * Content collections (Content Layer de Astro 5).
 *
 * El contenido se lee de Supabase en tiempo de build. El schema de zod sigue
 * siendo el contrato: si alguien introduce un dato inválido en la tabla, el
 * build falla con un error claro antes de publicar.
 *
 * `cover` ahora es una URL string (apunta al Storage de Supabase) en vez de
 * una imagen local procesada por Astro. Las imágenes se sirven directamente
 * desde el CDN de Supabase Storage.
 */

const faqSchema = z.array(
  z.object({
    question: z.string().min(8),
    answer: z.string().min(20),
  }),
);

const servicios = defineCollection({
  loader: supabaseLoader('servicios'),
  schema: z.object({
    title: z.string().max(70),
    shortTitle: z.string().max(32).nullable().optional(),
    seoTitle: z.string().max(60).nullable().optional(),
    description: z.string().min(70).max(158),
    excerpt: z.string().max(200),
    /** URL pública de la imagen en Supabase Storage */
    cover: z.string().url(),
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
  loader: supabaseLoader('proyectos'),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(70).max(158),
    excerpt: z.string().max(220),
    /** URL pública de la imagen en Supabase Storage */
    cover: z.string().url(),
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

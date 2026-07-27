import { SITE } from '@config';

/**
 * Normaliza un pathname: sin barra final (salvo la raíz), siempre con barra inicial.
 * Coincide con `trailingSlash: 'never'` de astro.config.mjs para que canonical,
 * sitemap y enlaces internos apunten exactamente a la misma URL (evita duplicados).
 */
export function normalizePath(pathname: string): string {
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  // Quita index.html / .html que Astro añade con build.format: 'file'
  pathname = pathname.replace(/index\.html?$/i, '').replace(/\.html?$/i, '');
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  return pathname === '' ? '/' : pathname;
}

/**
 * URL absoluta canónica a partir de un path o de Astro.url.
 *
 * La raíz se emite sin barra final (`https://dominio.es`) para que canonical,
 * Open Graph, JSON-LD y sitemap.xml usen exactamente la misma cadena. Con
 * `trailingSlash: 'never'` es lo que genera @astrojs/sitemap, y mantener una
 * única variante evita señales de contenido duplicado.
 */
export function canonicalUrl(pathnameOrUrl: string | URL): string {
  const pathname =
    typeof pathnameOrUrl === 'string' ? pathnameOrUrl : pathnameOrUrl.pathname;
  const normalized = normalizePath(pathname);
  return normalized === '/' ? SITE.url : `${SITE.url}${normalized}`;
}

/** Convierte una ruta relativa de asset en URL absoluta (Open Graph la exige) */
export function absoluteAsset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Recorta una descripción al rango recomendado en SERP (~155 caracteres) */
export function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', max - 1))}…`;
}

/** Título final aplicando la plantilla, evitando duplicar la marca */
export function formatTitle(title?: string): string {
  if (!title) return SITE.defaultTitle;
  if (title.includes(SITE.name)) return title;
  return SITE.titleTemplate.replace('%s', title);
}

export const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatDateEs(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long' }).format(d);
}

export function isoDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

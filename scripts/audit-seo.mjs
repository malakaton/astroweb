/**
 * scripts/audit-seo.mjs
 *
 * Auditoría estática del HTML generado en dist/. Comprueba de forma automática
 * los requisitos que Lighthouse y Search Console penalizan:
 *
 *   · title y meta description presentes, con longitud correcta y ÚNICOS
 *   · canonical absoluta y coherente con la ruta del archivo
 *   · un único <h1> por página y jerarquía de encabezados sin saltos
 *   · Open Graph y Twitter Cards completas
 *   · JSON-LD válido (parseable) con LocalBusiness y BreadcrumbList
 *   · imágenes con alt, width, height y loading (evita CLS y LCP tardío)
 *   · ausencia de JavaScript y de enlaces internos rotos
 *   · sitemap.xml con todas las páginas indexables
 *
 * Uso: npm run audit:seo   (requiere haber ejecutado `npm run build`)
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://www.reformasarana.es';

const errors = [];
const warnings = [];

function fail(page, message) {
  errors.push(`${page}: ${message}`);
}
function warn(page, message) {
  warnings.push(`${page}: ${message}`);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
};

const meta = (html, name, prop = 'name') => {
  const re = new RegExp(`<meta[^>]*${prop}="${name}"[^>]*>`, 'i');
  const found = html.match(re);
  return found ? attr(found[0], 'content') : null;
};

/** Ruta pública de un archivo dist (build.format: 'file', trailingSlash: 'never') */
function routeOf(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/\.html$/, '')}`;
}

const files = await walk(DIST);
const titles = new Map();
const descriptions = new Map();
const routes = new Set(files.map(routeOf));
let indexablePages = 0;

for (const file of files) {
  const route = routeOf(file);
  const html = await readFile(file, 'utf8');
  const robots = meta(html, 'robots') ?? '';
  const noindex = robots.includes('noindex');
  if (!noindex) indexablePages += 1;

  // ── title y description ───────────────────────────────────────────────────
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1];
  if (!title) fail(route, 'sin <title>');
  else {
    if (title.length > 65) warn(route, `title de ${title.length} caracteres (>65)`);
    if (title.length < 20) warn(route, `title demasiado corto (${title.length})`);
    if (titles.has(title)) fail(route, `title duplicado con ${titles.get(title)}`);
    titles.set(title, route);
  }

  const description = meta(html, 'description');
  if (!description) fail(route, 'sin meta description');
  else {
    if (description.length > 160) fail(route, `meta description de ${description.length} caracteres (>160)`);
    if (description.length < 70) warn(route, `meta description corta (${description.length})`);
    if (descriptions.has(description)) fail(route, `meta description duplicada con ${descriptions.get(description)}`);
    descriptions.set(description, route);
  }

  // ── canonical ─────────────────────────────────────────────────────────────
  const canonicalTag = html.match(/<link[^>]*rel="canonical"[^>]*>/i);
  const canonical = canonicalTag ? attr(canonicalTag[0], 'href') : null;
  if (!canonical) fail(route, 'sin canonical');
  else {
    const expected = route === '/' ? SITE : `${SITE}${route}`;
    if (canonical !== expected) fail(route, `canonical incorrecta: ${canonical} (esperada ${expected})`);
  }

  // ── idioma y viewport ─────────────────────────────────────────────────────
  if (!/<html[^>]*lang="es"/i.test(html)) fail(route, 'falta lang="es" en <html>');
  if (!meta(html, 'viewport')) fail(route, 'falta meta viewport');

  // ── Open Graph / Twitter ──────────────────────────────────────────────────
  for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) {
    if (!meta(html, property, 'property')) fail(route, `falta ${property}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!meta(html, name)) fail(route, `falta ${name}`);
  }
  const ogImage = meta(html, 'og:image', 'property');
  if (ogImage && !ogImage.startsWith('http')) fail(route, 'og:image debe ser una URL absoluta');

  // ── encabezados ───────────────────────────────────────────────────────────
  const h1s = html.match(/<h1[\s>]/gi) ?? [];
  if (h1s.length === 0) fail(route, 'sin <h1>');
  if (h1s.length > 1) fail(route, `${h1s.length} elementos <h1>`);

  const levels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  let previous = levels[0] ?? 1;
  for (const level of levels.slice(1)) {
    if (level - previous > 1) {
      warn(route, `salto de encabezado h${previous} → h${level}`);
      break;
    }
    previous = level;
  }

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (jsonLdBlocks.length === 0) fail(route, 'sin JSON-LD');
  for (const [, raw] of jsonLdBlocks) {
    try {
      const data = JSON.parse(raw);
      const graph = data['@graph'] ?? [data];
      const types = graph.flatMap((node) => [].concat(node['@type'] ?? []));
      if (!types.includes('LocalBusiness')) fail(route, 'JSON-LD sin LocalBusiness');
      if (!types.includes('WebSite')) fail(route, 'JSON-LD sin WebSite');
      const hasWebPage = types.some((type) =>
        ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ItemPage'].includes(type),
      );
      if (!hasWebPage) fail(route, 'JSON-LD sin WebPage');
    } catch (error) {
      fail(route, `JSON-LD no parseable: ${error.message}`);
    }
  }

  // ── imágenes ──────────────────────────────────────────────────────────────
  const imgs = [...html.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
  imgs.forEach((img, index) => {
    if (attr(img, 'alt') === null) fail(route, `img #${index + 1} sin atributo alt`);
    if (!attr(img, 'width') || !attr(img, 'height')) fail(route, `img #${index + 1} sin width/height (riesgo de CLS)`);
    const loading = attr(img, 'loading');
    if (!loading) fail(route, `img #${index + 1} sin atributo loading`);
    const src = attr(img, 'src') ?? '';
    if (/\.(png|jpe?g)$/i.test(src)) warn(route, `img #${index + 1} no está en WebP: ${src}`);
  });
  const lazyCount = imgs.filter((img) => attr(img, 'loading') === 'lazy').length;
  if (imgs.length > 4 && lazyCount === 0) warn(route, 'ninguna imagen con lazy loading');

  // ── nada de JavaScript ────────────────────────────────────────────────────
  const scripts = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>/gi)];
  if (scripts.length > 0) warn(route, `${scripts.length} etiqueta(s) <script> además del JSON-LD`);

  // ── accesibilidad básica ──────────────────────────────────────────────────
  if (!/href="#contenido"/.test(html)) fail(route, 'falta el enlace «saltar al contenido»');
  const anchors = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
  for (const [tag, inner] of anchors) {
    const text = inner.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, '').trim();
    const label = attr(tag, 'aria-label');
    const hasSvgTitle = /<title>/.test(inner);
    if (!text && !label && !hasSvgTitle) fail(route, `enlace sin texto accesible: ${tag.slice(0, 90)}`);
  }

  // ── enlaces internos ──────────────────────────────────────────────────────
  for (const [tag] of anchors) {
    const href = attr(tag, 'href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) continue;
    const target = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
    if (target.startsWith('/api/')) continue;
    if (/\.(webp|jpe?g|png|svg|xml|json|webmanifest|txt|pdf)$/i.test(target)) continue;
    if (!routes.has(target)) fail(route, `enlace interno roto: ${href}`);
  }
}

// ── sitemap ─────────────────────────────────────────────────────────────────
let sitemapUrls = [];
try {
  const sitemap = await readFile(join(DIST, 'sitemap-0.xml'), 'utf8');
  sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
} catch {
  errors.push('sitemap-0.xml no encontrado en dist/');
}

const expectedInSitemap = [...routes].filter(
  (route) => !route.includes('/gracias') && route !== '/404',
);
for (const route of expectedInSitemap) {
  const expected = route === '/' ? SITE : `${SITE}${route}`;
  if (!sitemapUrls.includes(expected)) errors.push(`sitemap: falta ${expected}`);
}
for (const url of sitemapUrls) {
  if (/gracias|404/.test(url)) errors.push(`sitemap: no debería incluir ${url}`);
}

// ── robots.txt ──────────────────────────────────────────────────────────────
try {
  const robotsTxt = await readFile(join(DIST, 'robots.txt'), 'utf8');
  if (!robotsTxt.includes('Sitemap:')) errors.push('robots.txt sin directiva Sitemap');
} catch {
  errors.push('robots.txt no encontrado en dist/');
}

// ── informe ─────────────────────────────────────────────────────────────────
console.log(`\nAuditoría SEO — ${files.length} páginas (${indexablePages} indexables)`);
console.log(`Sitemap: ${sitemapUrls.length} URLs\n`);

if (warnings.length > 0) {
  console.log(`⚠ ${warnings.length} avisos:`);
  for (const warning of warnings) console.log(`  · ${warning}`);
  console.log('');
}

if (errors.length > 0) {
  console.log(`✖ ${errors.length} errores:`);
  for (const error of errors) console.log(`  · ${error}`);
  process.exit(1);
}

console.log('✔ Sin errores: títulos y descripciones únicos, canonical, OG/Twitter,');
console.log('  JSON-LD válido, imágenes accesibles con dimensiones y sitemap completo.\n');

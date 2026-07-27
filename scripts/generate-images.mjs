/**
 * scripts/generate-images.mjs
 *
 * Genera los assets gráficos del proyecto (placeholders vectoriales
 * comprimidos) para que el repositorio sea autocontenido y el build funcione
 * sin descargar nada:
 *
 *   - src/assets/**.webp   → imágenes de contenido (las procesa <Image /> de Astro)
 *   - public/og/*.jpg|png  → Open Graph y logo (formatos con soporte universal
 *                            en redes sociales; WebP falla en varios crawlers)
 *   - public/favicon.svg, apple-touch-icon.png, manifest.webmanifest
 *
 * Sustituye estos archivos por las fotografías reales manteniendo nombre y
 * relación de aspecto: no hay que tocar el código.
 *
 * Uso: npm run images:generate
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/** PRNG determinista para que cada regeneración produzca el mismo resultado */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Composición abstracta de interiorismo: degradado base + planos
 * arquitectónicos geométricos. Sin texto (evita dependencias de fuentes).
 */
function buildSvg({ width, height, name, hue, hue2, light = false }) {
  const rand = mulberry32(seedFrom(name));
  const shapes = [];
  const bands = 5;

  for (let i = 0; i < bands; i += 1) {
    const w = Math.round(width * (0.18 + rand() * 0.42));
    const h = Math.round(height * (0.22 + rand() * 0.6));
    const x = Math.round(rand() * (width - w * 0.4) - w * 0.15);
    const y = Math.round(rand() * (height - h * 0.35));
    const opacity = (0.06 + rand() * 0.13).toFixed(3);
    const radius = Math.round(rand() * 26);
    shapes.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="#ffffff" opacity="${opacity}"/>`,
    );
  }

  for (let i = 0; i < 3; i += 1) {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * height);
    const r = Math.round(Math.min(width, height) * (0.12 + rand() * 0.28));
    shapes.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow)" opacity="${(0.1 + rand() * 0.16).toFixed(3)}"/>`,
    );
  }

  const lines = [];
  const step = Math.round(height / 9);
  for (let y = step; y < height; y += step) {
    lines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#ffffff" stroke-width="1.5" opacity="0.07"/>`,
    );
  }

  const l1 = light ? 92 : 34;
  const l2 = light ? 78 : 18;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 42% ${l1}%)"/>
      <stop offset="55%" stop-color="hsl(${hue2} 38% ${Math.round((l1 + l2) / 2)}%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 46% ${l2}%)"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="#ffd9b0"/>
      <stop offset="100%" stop-color="#ffd9b0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${shapes.join('\n  ')}
  ${lines.join('\n  ')}
  <rect width="${width}" height="${height}" fill="none" stroke="#000000" stroke-opacity="0.06" stroke-width="2"/>
</svg>`;
}

async function writeImage({ file, width, height, hue, hue2, light, format = 'webp' }) {
  const outPath = join(ROOT, file);
  await mkdir(dirname(outPath), { recursive: true });
  const svg = buildSvg({ width, height, name: file, hue, hue2, light });
  let pipeline = sharp(Buffer.from(svg));
  if (format === 'webp') pipeline = pipeline.webp({ quality: 78, effort: 6 });
  if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  await pipeline.toFile(outPath);
  return outPath;
}

/* Imágenes de contenido: WebP, relación 3:2 (tarjetas) y 16:9 (hero) */
const CONTENT_IMAGES = [
  { file: 'src/assets/hero-reformas.webp', width: 2000, height: 1125, hue: 205, hue2: 24 },
  { file: 'src/assets/servicios/reforma-integral.webp', width: 1600, height: 1067, hue: 208, hue2: 196 },
  { file: 'src/assets/servicios/reforma-de-cocinas.webp', width: 1600, height: 1067, hue: 28, hue2: 14 },
  { file: 'src/assets/servicios/reforma-de-banos.webp', width: 1600, height: 1067, hue: 190, hue2: 210 },
  { file: 'src/assets/servicios/reforma-de-locales-comerciales.webp', width: 1600, height: 1067, hue: 262, hue2: 220 },
  { file: 'src/assets/servicios/rehabilitacion-de-fachadas.webp', width: 1600, height: 1067, hue: 44, hue2: 200 },
  { file: 'src/assets/servicios/instalaciones-y-climatizacion.webp', width: 1600, height: 1067, hue: 168, hue2: 205 },
  { file: 'src/assets/proyectos/atico-chamberi.webp', width: 1600, height: 1067, hue: 22, hue2: 205 },
  { file: 'src/assets/proyectos/piso-salamanca.webp', width: 1600, height: 1067, hue: 212, hue2: 30 },
  { file: 'src/assets/proyectos/cocina-abierta-retiro.webp', width: 1600, height: 1067, hue: 34, hue2: 190 },
  { file: 'src/assets/proyectos/bano-spa-pozuelo.webp', width: 1600, height: 1067, hue: 186, hue2: 214 },
  { file: 'src/assets/proyectos/clinica-dental-alcobendas.webp', width: 1600, height: 1067, hue: 200, hue2: 168 },
  { file: 'src/assets/proyectos/fachada-getafe.webp', width: 1600, height: 1067, hue: 48, hue2: 210 },
  { file: 'src/assets/equipo-reformas-arana.webp', width: 1600, height: 1067, hue: 206, hue2: 222 },
  { file: 'src/assets/taller-materiales.webp', width: 1400, height: 1050, hue: 30, hue2: 205 },
];

/* Assets sociales: JPEG/PNG por compatibilidad con crawlers */
const SOCIAL_IMAGES = [
  { file: 'public/og/og-default.jpg', width: 1200, height: 630, hue: 205, hue2: 24, format: 'jpeg' },
  { file: 'public/og/og-servicios.jpg', width: 1200, height: 630, hue: 26, hue2: 205, format: 'jpeg' },
  { file: 'public/og/og-proyectos.jpg', width: 1200, height: 630, hue: 196, hue2: 30, format: 'jpeg' },
  { file: 'public/og/og-contacto.jpg', width: 1200, height: 630, hue: 168, hue2: 205, format: 'jpeg' },
];

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <rect width="36" height="36" rx="9" fill="#0f2a3f"/>
  <path d="M8 20.5 18 11l10 9.5" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14.5 26v-5.5h7V26" fill="none" stroke="#ed7014" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const MANIFEST = {
  name: 'Reformas Arana',
  short_name: 'Reformas Arana',
  description: 'Reformas integrales en Madrid con presupuesto cerrado y garantía.',
  start_url: '/',
  display: 'browser',
  background_color: '#ffffff',
  theme_color: '#0f2a3f',
  lang: 'es-ES',
  icons: [
    { src: '/og/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ],
};

async function main() {
  const created = [];

  for (const image of [...CONTENT_IMAGES, ...SOCIAL_IMAGES]) {
    created.push(await writeImage(image));
  }

  // Logo cuadrado y apple-touch-icon a partir del SVG de marca
  const logoSvg = Buffer.from(FAVICON_SVG.replace('viewBox="0 0 36 36" width="36" height="36"', 'viewBox="0 0 36 36" width="512" height="512"'));
  await mkdir(join(ROOT, 'public/og'), { recursive: true });
  await sharp(logoSvg).png({ compressionLevel: 9 }).toFile(join(ROOT, 'public/og/logo.png'));
  await sharp(logoSvg).resize(180, 180).png({ compressionLevel: 9 }).toFile(join(ROOT, 'public/apple-touch-icon.png'));
  await writeFile(join(ROOT, 'public/favicon.svg'), FAVICON_SVG, 'utf8');
  await writeFile(join(ROOT, 'public/manifest.webmanifest'), `${JSON.stringify(MANIFEST, null, 2)}\n`, 'utf8');

  console.log(`✔ ${created.length + 4} assets generados`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

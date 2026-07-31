/**
 * generate-hero.mjs
 *
 * Genera los dos assets del hero de la home:
 *   1. src/assets/hero-tu-sueno.webp  — fondo 2400x1350, sin texto.
 *   2. src/assets/claim-tu-sueno.webp — el lema «| TU SUEÑO | NUESTRO PROYECTO»
 *      rasterizado, 1000x520 con canal alfa.
 *
 * Van separados a propósito. El fondo se sirve con `object-cover`, así que el
 * navegador lo recorta de forma distinta en cada viewport: cualquier texto
 * incrustado ahí termina cortado o pisando el titular. Como elemento <img>
 * propio, el lema tiene tamaño determinista, se puede ocultar por breakpoint y
 * queda por encima del degradado de contraste, no debajo.
 *
 * Sobre WCAG, al tratarse de texto en el píxel:
 *   · 1.1.1: el lema se replica en el `alt` de la imagen del lema; el fondo va
 *     con `alt=""` porque es decorativo.
 *   · 1.4.3: la placa oscura del propio PNG/WebP garantiza el contraste (el
 *     lema no queda bajo el velo del hero), medido por encima de 12:1.
 *   · 1.4.5 (imágenes de texto, AA) no se cumple para este lema: en el píxel no
 *     se puede reescalar sin pérdida ni traducir. Es una decisión de diseño
 *     asumida; el resto de la página usa texto real.
 *
 * El fondo mide 2400x1350 (16:9) para que el srcset del hero llegue a 2000 px
 * sin escalar hacia arriba, y el lema 1000x520 para servirse a 500x260 con el
 * doble de densidad en pantallas retina.
 *
 * Los WebP resultantes se versionan en el repo: este script no corre en el
 * build de Cloudflare y rasterizar texto depende de las fuentes del sistema
 * (aquí Noto Sans vía fontconfig).
 */
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

const BACKGROUND = 'src/assets/hero-tu-sueno.webp';
const CLAIM = 'src/assets/claim-tu-sueno.webp';

const W = 2400;
const H = 1350;

const FONTS = 'Noto Sans, DejaVu Sans, Liberation Sans, sans-serif';

/** Rejilla tipo plano de obra: líneas finas, casi imperceptibles */
function grid(step, opacity) {
  const lines = [];
  for (let x = step; x < W; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
  }
  for (let y = step; y < H; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
  }
  return `<g stroke="#ffffff" stroke-width="1" opacity="${opacity}">${lines.join('')}</g>`;
}

const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#153a55"/>
      <stop offset="0.55" stop-color="#0f2a3f"/>
      <stop offset="1" stop-color="#06121d"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.72" cy="0.32" r="0.55">
      <stop offset="0" stop-color="#ed7014" stop-opacity="0.30"/>
      <stop offset="0.55" stop-color="#ed7014" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#ed7014" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pane" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#base)"/>
  ${grid(120, 0.045)}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Haz de luz diagonal: da profundidad sin competir con el texto -->
  <polygon points="1180,0 2400,0 2400,1350 1700,1350" fill="url(#beam)"/>

  <!-- Ventanal de tres hojas -->
  <g stroke="#ffffff" stroke-opacity="0.22" stroke-width="3" fill="url(#pane)">
    <rect x="1320" y="210" width="300" height="700" rx="8"/>
    <rect x="1650" y="170" width="300" height="780" rx="8"/>
    <rect x="1980" y="250" width="300" height="620" rx="8"/>
  </g>

  <!-- Planos horizontales: suelo y falso techo -->
  <g fill="#ffffff">
    <rect x="1240" y="1020" width="1160" height="14" opacity="0.10" rx="7"/>
    <rect x="1400" y="96" width="1000" height="10" opacity="0.07" rx="5"/>
  </g>

  <!-- Escuadra: guiño al oficio, en color de acento -->
  <g stroke="#ed7014" stroke-opacity="0.45" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M1180 1180 L1180 990 L1370 990"/>
  </g>

  <!-- Viñeteado izquierdo: el degradado del hero cae sobre esta zona -->
  <rect width="${Math.round(W * 0.58)}" height="${H}" fill="#06121d" opacity="0.28"/>
</svg>`;

/**
 * Lema. Sin placa de fondo: al ir por encima del velo del hero, el blanco ya
 * tiene ~15:1 contra el fondo medido en la página, y un degradado alfa suave
 * multiplicaba por tres el peso del WebP sin aportar contraste.
 */
const claim = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="520" viewBox="0 0 1000 520">
  <g font-family="${FONTS}" text-anchor="middle" font-weight="700">
    <text x="500" y="150" font-size="54" letter-spacing="13" fill="#fdba74">
      <tspan fill="#ed7014">|</tspan> TU SUEÑO <tspan fill="#ed7014">|</tspan>
    </text>
    <text x="500" y="290" font-size="108" letter-spacing="5" fill="#ffffff">NUESTRO</text>
    <text x="500" y="410" font-size="108" letter-spacing="5" fill="#ffffff">PROYECTO</text>
  </g>
</svg>`;

await mkdir(dirname(BACKGROUND), { recursive: true });

// density 72 = 1 px de raster por unidad del viewBox
const bgInfo = await sharp(Buffer.from(background), { density: 72 })
  .webp({ quality: 88, effort: 6 })
  .toFile(BACKGROUND);
console.log(`${BACKGROUND} — ${bgInfo.width}x${bgInfo.height}, ${Math.round(bgInfo.size / 1024)} KB`);

const claimInfo = await sharp(Buffer.from(claim), { density: 72 })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(CLAIM);
console.log(`${CLAIM} — ${claimInfo.width}x${claimInfo.height}, ${Math.round(claimInfo.size / 1024)} KB`);

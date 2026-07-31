/**
 * Fuente única de verdad del negocio.
 * Todo el SEO (title templates, JSON-LD, OG, NAP) y la UI leen de aquí:
 * cambiar un teléfono o un horario se hace en un solo sitio.
 */

export interface OpeningHour {
  /** Días en formato schema.org (Monday, Tuesday…) */
  days: readonly string[];
  opens: string;
  closes: string;
}

export const SITE = {
  /** Dominio canónico, sin barra final. Debe coincidir con `site` de astro.config.mjs */
  url: 'https://www.reformasarana.es',
  name: 'Grupo S Valles',
  legalName: 'Grupo S Valles S.L.',
  /** Se concatena como «Título | Grupo S Valles» */
  titleTemplate: '%s | Grupo S Valles',
  defaultTitle: 'Grupo S Valles | Reformas integrales en Sabadell con garantía',
  defaultDescription:
    'Empresa de reformas integrales en Sabadell con más de 20 años de experiencia. Presupuesto cerrado sin sorpresas, plazos garantizados y 3 años de garantía. Pide presupuesto gratis.',
  lang: 'es',
  locale: 'es_ES',
  themeColor: '#0f2a3f',
  /** Imagen social por defecto (1200x630) */
  ogImage: '/og/og-default.jpg',
  twitter: '@reformasarana',
  /** Google Search Console / analytics: se rellenan al desplegar */
  googleSiteVerification: '',
} as const;

export const BUSINESS = {
  priceRange: '€€',
  vatId: 'B-12345678',
  foundingDate: '2004-03-01',
  email: 'hola@reformasarana.es',
  phone: '+34910123456',
  phoneHuman: '910 123 456',
  whatsapp: '+34600123456',
  address: {
    street: 'Calle de Alcalá 128, 2º B',
    city: 'Sabadell',
    region: 'Comunidad de Sabadell',
    postalCode: '28009',
    country: 'ES',
  },
  geo: { lat: 40.4237, lng: -3.6712 },
  /** Áreas de servicio: refuerza el SEO local */
  areaServed: [
    'Sabadell',
    'Alcobendas',
    'Las Rozas de Sabadell',
    'Pozuelo de Alarcón',
    'Getafe',
    'Alcalá de Henares',
  ],
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '08:30', closes: '19:00' },
    { days: ['Friday'], opens: '08:30', closes: '15:00' },
  ] satisfies OpeningHour[],
  social: {
    instagram: 'https://www.instagram.com/reformasarana',
    facebook: 'https://www.facebook.com/reformasarana',
    linkedin: 'https://www.linkedin.com/company/reformasarana',
  },
  stats: {
    yearsOfExperience: 20,
    projectsDelivered: 750,
    warrantyYears: 3,
    ratingValue: 4.9,
    reviewCount: 187,
  },
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const NAV: readonly NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Sobre nosotros', href: '/sobre-nosotros' },
  { label: 'Contacto', href: '/contacto' },
] as const;

export const LEGAL_NAV: readonly NavItem[] = [
  { label: 'Aviso legal', href: '/aviso-legal' },
  { label: 'Política de privacidad', href: '/politica-de-privacidad' },
  { label: 'Política de cookies', href: '/politica-de-cookies' },
] as const;

/** Formato E.164 -> tel: */
export const telHref = `tel:${BUSINESS.phone}`;
export const mailHref = `mailto:${BUSINESS.email}`;
export const whatsappHref = `https://wa.me/${BUSINESS.whatsapp.replace('+', '')}`;

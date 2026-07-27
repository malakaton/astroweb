import { BUSINESS, SITE } from '@config';
import { absoluteAsset, canonicalUrl } from '@lib/seo';

/**
 * Constructores de JSON-LD (schema.org).
 *
 * Estrategia: un único bloque `@graph` por página con nodos identificados por
 * `@id` estable y referencias cruzadas. Es lo que Google recomienda para
 * relacionar entidades (LocalBusiness ← WebPage ← BreadcrumbList) sin duplicar
 * datos ni inflar el HTML.
 */

export type JsonLdNode = Record<string, unknown>;

/** @id estables del grafo */
export const ID = {
  business: `${SITE.url}/#business`,
  website: `${SITE.url}/#website`,
  logo: `${SITE.url}/#logo`,
  page: (path: string) => `${canonicalUrl(path)}#webpage`,
  breadcrumb: (path: string) => `${canonicalUrl(path)}#breadcrumb`,
  service: (slug: string) => `${SITE.url}/servicios/${slug}#service`,
} as const;

function openingHoursSpecification(): JsonLdNode[] {
  return BUSINESS.openingHours.map((block) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: block.days.map((d) => `https://schema.org/${d}`),
    opens: block.opens,
    closes: block.closes,
  }));
}

/**
 * LocalBusiness. Se usa el subtipo `GeneralContractor` (empresa de reformas),
 * que hereda de HomeAndConstructionBusiness → LocalBusiness: más específico y
 * por tanto mejor entendido por los motores de búsqueda.
 */
export function localBusiness(): JsonLdNode {
  return {
    '@type': ['GeneralContractor', 'LocalBusiness'],
    '@id': ID.business,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: { '@id': ID.logo },
    image: absoluteAsset(SITE.ogImage),
    description: SITE.defaultDescription,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    vatID: BUSINESS.vatId,
    foundingDate: BUSINESS.foundingDate,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Efectivo, Transferencia bancaria, Tarjeta, Financiación',
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.lat,
      longitude: BUSINESS.geo.lng,
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${BUSINESS.geo.lat},${BUSINESS.geo.lng}`,
    areaServed: BUSINESS.areaServed.map((name) => ({ '@type': 'City', name })),
    openingHoursSpecification: openingHoursSpecification(),
    sameAs: Object.values(BUSINESS.social),
    knowsLanguage: ['es-ES'],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: BUSINESS.stats.ratingValue,
      reviewCount: BUSINESS.stats.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

export function logo(): JsonLdNode {
  return {
    '@type': 'ImageObject',
    '@id': ID.logo,
    url: absoluteAsset('/og/logo.png'),
    contentUrl: absoluteAsset('/og/logo.png'),
    width: 512,
    height: 512,
    caption: SITE.name,
  };
}

export function website(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: SITE.url,
    name: SITE.name,
    inLanguage: SITE.lang,
    publisher: { '@id': ID.business },
  };
}

export interface WebPageInput {
  path: string;
  title: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  hasBreadcrumb?: boolean;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ItemPage';
}

export function webPage(input: WebPageInput): JsonLdNode {
  const url = canonicalUrl(input.path);
  return {
    '@type': input.type ?? 'WebPage',
    '@id': ID.page(input.path),
    url,
    name: input.title,
    description: input.description,
    inLanguage: SITE.lang,
    isPartOf: { '@id': ID.website },
    about: { '@id': ID.business },
    ...(input.image ? { primaryImageOfPage: absoluteAsset(input.image) } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.hasBreadcrumb ? { breadcrumb: { '@id': ID.breadcrumb(input.path) } } : {}),
  };
}

export interface Crumb {
  name: string;
  href: string;
}

export function breadcrumbList(path: string, crumbs: readonly Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': ID.breadcrumb(path),
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.href),
    })),
  };
}

export interface ServiceInput {
  slug: string;
  name: string;
  description: string;
  image?: string;
  priceFrom?: number;
}

export function service(input: ServiceInput): JsonLdNode {
  return {
    '@type': 'Service',
    '@id': ID.service(input.slug),
    name: input.name,
    description: input.description,
    serviceType: input.name,
    provider: { '@id': ID.business },
    areaServed: BUSINESS.areaServed.map((name) => ({ '@type': 'City', name })),
    ...(input.image ? { image: absoluteAsset(input.image) } : {}),
    ...(input.priceFrom
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: input.priceFrom,
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: input.priceFrom,
              priceCurrency: 'EUR',
              valueAddedTaxIncluded: false,
            },
            availability: 'https://schema.org/InStock',
            url: canonicalUrl(`/servicios/${input.slug}`),
          },
        }
      : {}),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPage(path: string, items: readonly FaqItem[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${canonicalUrl(path)}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Envuelve nodos en el documento @graph final */
export function graph(nodes: readonly (JsonLdNode | null | undefined)[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  });
}

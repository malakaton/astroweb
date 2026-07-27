/** Tipos compartidos entre componentes y páginas */

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  rating?: number;
  location?: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

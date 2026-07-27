/**
 * Catálogo de iconos SVG del proyecto.
 *
 * Se mantiene en un módulo TypeScript (y no dentro del componente) para poder
 * importar el tipo `IconName` desde cualquier componente o página y validar en
 * build time que solo se usan iconos existentes.
 */
export type IconName =
  | 'check'
  | 'check-circle'
  | 'phone'
  | 'mail'
  | 'chat'
  | 'clock'
  | 'shield'
  | 'map-pin'
  | 'star'
  | 'arrow-right'
  | 'menu'
  | 'close'
  | 'wrench'
  | 'ruler'
  | 'droplet'
  | 'roller'
  | 'kitchen'
  | 'home'
  | 'euro'
  | 'users'
  | 'file-text'
  | 'lightning'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'chevron-down';

/** Trazados de cada icono en un lienzo de 24x24, dibujados con `stroke` */
export const ICON_PATHS: Record<IconName, readonly string[]> = {
  check: ['M4.5 12.75l5 5 10-10.5'],
  'check-circle': ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'm8.5 12.5 2.5 2.5 4.5-5'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  ],
  mail: ['M3 5h18v14H3z', 'm3.5 6 8.5 6 8.5-6'],
  chat: ['M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 7.5V12l3 2'],
  shield: ['M12 22s8-4.2 8-10.2V5.2L12 2 4 5.2v6.6C4 17.8 12 22 12 22z', 'm9 12 2 2 4-4'],
  'map-pin': [
    'M20 10.2c0 6-8 11.8-8 11.8S4 16.2 4 10.2a8 8 0 1 1 16 0z',
    'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  ],
  star: ['m12 2.6 3 6.1 6.7 1-4.8 4.7 1.1 6.7-6-3.2-6 3.2 1.1-6.7L2.3 9.7l6.7-1z'],
  'arrow-right': ['M4.5 12h15', 'm13.5 6 6 6-6 6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  wrench: ['M15.5 3.5a4.5 4.5 0 0 0 5.6 5.6l-11.4 11.4a3 3 0 0 1-4.2-4.2z', 'M14 10 9.5 5.5'],
  ruler: [
    'M3.8 14.6 14.6 3.8l5.6 5.6L9.4 20.2z',
    'M8 10.4l1.6 1.6',
    'M11.2 7.2l1.6 1.6',
    'M14.4 4l1.6 1.6',
  ],
  droplet: ['M12 2.7 6.4 8.3a8 8 0 1 0 11.2 0z'],
  roller: [
    'M3 4h11v6H3z',
    'M14 7h4.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H12v3',
    'M10 18h4v4h-4z',
  ],
  kitchen: [
    'M3 2v7a3 3 0 0 0 3 3 3 3 0 0 0 3-3V2',
    'M6 12v10',
    'M17 2v20',
    'M21 6.5c0 3-1.8 4.5-4 4.5',
  ],
  home: ['m3 10.5 9-7.5 9 7.5', 'M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5'],
  euro: [
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    'M15.5 9a3.8 3.8 0 0 0-5.6 1',
    'M9.9 14a3.8 3.8 0 0 0 5.6 1',
    'M7.5 11h6',
    'M7.5 13.5h6',
  ],
  users: [
    'M15.5 21v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2A3.7 3.7 0 0 0 2.5 19.2V21',
    'M12.7 7.9a3.7 3.7 0 1 1-7.4 0 3.7 3.7 0 0 1 7.4 0z',
    'M17 4.4a3.7 3.7 0 0 1 0 7.1',
    'M21.5 21v-1.8a3.7 3.7 0 0 0-2.8-3.6',
  ],
  'file-text': [
    'M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5z',
    'M14 2.5V7.5h5',
    'M8.5 13h7',
    'M8.5 16.5h7',
  ],
  lightning: ['M13.5 2.5 4.5 13.5h6l-1 8 9-11h-6z'],
  instagram: [
    'M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9A4.5 4.5 0 0 1 16.5 21h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3z',
    'M15.8 12a3.8 3.8 0 1 1-7.6 0 3.8 3.8 0 0 1 7.6 0z',
    'M17.4 6.8h.01',
  ],
  facebook: ['M18 2.5h-3a5 5 0 0 0-5 5v3H7v4h3v7h4v-7h3l1-4h-4v-3a1 1 0 0 1 1-1h3z'],
  linkedin: [
    'M16 8.5a5.5 5.5 0 0 1 5.5 5.5V21h-4v-7a1.5 1.5 0 0 0-3 0v7h-4V9h4v1.4A5.5 5.5 0 0 1 16 8.5z',
    'M3 9h4v12H3z',
    'M7 4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  ],
  'chevron-down': ['m6 9.5 6 6 6-6'],
};

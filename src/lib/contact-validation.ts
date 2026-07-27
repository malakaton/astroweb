/**
 * Validación del formulario de contacto.
 *
 * Vive en `src/lib` para poder reutilizarse desde la Pages Function y desde un
 * futuro panel de administración. No usa zod para no arrastrar dependencias al
 * runtime de Cloudflare Workers.
 */

export interface ContactInput {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  localidad: string | null;
  superficie: number | null;
  presupuesto: string | null;
  mensaje: string;
  origen: string | null;
}

export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[0-9\s+()-]{9,20}$/;

function text(value: FormDataEntryValue | null, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optionalText(value: FormDataEntryValue | null, max: number): string | null {
  const result = text(value, max);
  return result === '' ? null : result;
}

/** Valida y normaliza el FormData recibido por POST */
export function validateContact(form: FormData): ValidationResult {
  const errors: string[] = [];

  const nombre = text(form.get('nombre'), 120);
  const email = text(form.get('email'), 180).toLowerCase();
  const telefono = text(form.get('telefono'), 20);
  const servicio = text(form.get('servicio'), 80);
  const mensaje = text(form.get('mensaje'), 2000);
  const rgpd = text(form.get('rgpd'), 4);

  if (nombre.length < 3) errors.push('El nombre debe tener al menos 3 caracteres.');
  if (!EMAIL_RE.test(email)) errors.push('El email no tiene un formato válido.');
  if (!PHONE_RE.test(telefono)) errors.push('El teléfono no tiene un formato válido.');
  if (servicio.length < 2) errors.push('Selecciona el tipo de reforma.');
  if (mensaje.length < 20) errors.push('El mensaje debe tener al menos 20 caracteres.');
  if (rgpd !== 'si') errors.push('Debes aceptar la política de privacidad.');

  const superficieRaw = text(form.get('superficie'), 6);
  let superficie: number | null = null;
  if (superficieRaw !== '') {
    const parsed = Number.parseInt(superficieRaw, 10);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 10000) {
      errors.push('La superficie debe ser un número entre 1 y 10.000.');
    } else {
      superficie = parsed;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      nombre,
      email,
      telefono,
      servicio,
      localidad: optionalText(form.get('localidad'), 80),
      superficie,
      presupuesto: optionalText(form.get('presupuesto'), 40),
      mensaje,
      origen: optionalText(form.get('origen'), 40),
    },
  };
}

/** Honeypot: si el campo oculto viene rellenado, es un bot */
export function isSpam(form: FormData): boolean {
  return text(form.get('empresa_web'), 200) !== '';
}

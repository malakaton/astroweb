/**
 * Tests de la validación del formulario de contacto.
 *
 * Se ejecutan con el runner nativo de Node (sin dependencias):
 *   npm test
 *
 * Es la lógica que protege el endpoint público, así que conviene tenerla
 * cubierta: valida en servidor lo mismo que el navegador valida en cliente.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSpam, validateContact } from '../src/lib/contact-validation.ts';

function buildForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const base: Record<string, string> = {
    nombre: 'Ana García',
    email: 'ana@ejemplo.com',
    telefono: '600 123 456',
    servicio: 'reforma-integral',
    mensaje: 'Piso de 90 m² en Chamberí, quiero reformar cocina y dos baños.',
    rgpd: 'si',
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== '') form.set(key, value);
  }
  return form;
}

test('acepta un envío correcto y normaliza los datos', () => {
  const form = buildForm({ email: '  ANA@Ejemplo.com ', localidad: 'Madrid', superficie: '90' });
  const result = validateContact(form);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.email, 'ana@ejemplo.com');
  assert.equal(result.data.nombre, 'Ana García');
  assert.equal(result.data.superficie, 90);
  assert.equal(result.data.localidad, 'Madrid');
  assert.equal(result.data.presupuesto, null);
});

test('rechaza email con formato inválido', () => {
  const result = validateContact(buildForm({ email: 'ana@ejemplo' }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes('email')));
});

test('rechaza teléfonos demasiado cortos', () => {
  const result = validateContact(buildForm({ telefono: '6001' }));
  assert.equal(result.ok, false);
});

test('exige el consentimiento RGPD', () => {
  const form = buildForm();
  form.delete('rgpd');
  const result = validateContact(form);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes('privacidad')));
});

test('exige un mensaje con contenido mínimo', () => {
  const result = validateContact(buildForm({ mensaje: 'Hola' }));
  assert.equal(result.ok, false);
});

test('valida el rango de la superficie', () => {
  assert.equal(validateContact(buildForm({ superficie: '0' })).ok, false);
  assert.equal(validateContact(buildForm({ superficie: '20000' })).ok, false);
  assert.equal(validateContact(buildForm({ superficie: '120' })).ok, true);
});

test('trunca campos excesivamente largos en lugar de fallar', () => {
  const result = validateContact(buildForm({ nombre: 'A'.repeat(500) }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.nombre.length, 120);
});

test('detecta el honeypot relleno', () => {
  const form = buildForm();
  form.set('empresa_web', 'http://spam.example');
  assert.equal(isSpam(form), true);
  assert.equal(isSpam(buildForm()), false);
});

test('acumula todos los errores de una vez', () => {
  const result = validateContact(new FormData());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.length >= 5);
});

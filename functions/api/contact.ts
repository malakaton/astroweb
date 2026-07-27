/// <reference types="@cloudflare/workers-types" />
/**
 * POST /api/contact — Cloudflare Pages Function.
 *
 * Recibe el envío nativo del formulario (sin JavaScript en el cliente), lo
 * valida en servidor, lo guarda en Supabase y responde con un redirect 303 a
 * /contacto/gracias.
 *
 * Variables de entorno (Cloudflare Pages → Settings → Environment variables):
 *   SUPABASE_URL                  URL del proyecto (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY     clave service_role, marcada como *secret*
 *   NOTIFICATION_EMAIL (opcional) destinatario del aviso de nuevo lead
 *   RESEND_API_KEY     (opcional) para enviar el aviso por email
 *   IP_HASH_SALT       (opcional) sal para el hash de IP (antiabuso RGPD-friendly)
 */
import { createSupabaseClient } from '../../src/lib/supabase';
import { isSpam, validateContact } from '../../src/lib/contact-validation';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NOTIFICATION_EMAIL?: string;
  RESEND_API_KEY?: string;
  IP_HASH_SALT?: string;
}

const SUCCESS_PATH = '/contacto/gracias';

function redirect(request: Request, path: string): Response {
  const url = new URL(request.url);
  return new Response(null, {
    status: 303,
    headers: { Location: `${url.origin}${path}`, 'Cache-Control': 'no-store' },
  });
}

/** Respuesta de error accesible y sin JavaScript */
function errorPage(messages: string[], status: number): Response {
  const items = messages
    .map((message) => `<li>${message.replace(/[<>&]/g, '')}</li>`)
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>No hemos podido enviar el formulario | Reformas Arana</title>
<style>
  :root { color-scheme: light }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:1.5rem;
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:#14181b; background:#f1f6f9 }
  main { max-width:34rem; background:#fff; padding:2rem; border-radius:14px; border:1px solid #dceaf2 }
  h1 { color:#0f2a3f; font-size:1.5rem; margin:0 0 .75rem }
  ul { color:#a9490a; padding-left:1.25rem }
  a { display:inline-block; margin-top:1.25rem; min-height:44px; padding:.75rem 1.25rem;
      background:#d15c08; color:#fff; text-decoration:none; border-radius:8px; font-weight:600 }
</style>
</head>
<body>
  <main>
    <h1>No hemos podido enviar tu solicitud</h1>
    <p>Revisa estos puntos e inténtalo de nuevo. Si el problema persiste, llámanos al 910 123 456.</p>
    <ul>${items}</ul>
    <a href="/contacto">Volver al formulario</a>
  </main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** SHA-256 de IP + sal: permite detectar abuso sin almacenar la IP en claro */
async function hashIp(ip: string | null, salt: string | undefined): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(`${salt ?? 'reformas-arana'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function notifyByEmail(env: Env, lead: { nombre: string; email: string; telefono: string; servicio: string }) {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_EMAIL) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'web@reformasarana.es',
        to: env.NOTIFICATION_EMAIL,
        subject: `Nuevo presupuesto: ${lead.servicio} — ${lead.nombre}`,
        text: `Nombre: ${lead.nombre}\nEmail: ${lead.email}\nTeléfono: ${lead.telefono}\nServicio: ${lead.servicio}`,
      }),
    });
  } catch (error) {
    // El aviso por email no debe impedir que el lead quede guardado
    console.error('Fallo al enviar la notificación por email', error);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorPage(['No hemos recibido los datos del formulario.'], 400);
  }

  // Bots: respondemos como si todo hubiese ido bien para no dar pistas
  if (isSpam(form)) return redirect(request, SUCCESS_PATH);

  const result = validateContact(form);
  if (!result.ok) return errorPage(result.errors, 422);

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno');
    return errorPage(
      [
        'El servicio de contacto no está configurado en este entorno.',
        'Escríbenos a hola@reformasarana.es y lo resolvemos enseguida.',
      ],
      503,
    );
  }

  const supabase = createSupabaseClient({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });

  try {
    await supabase.insertLead({
      ...result.data,
      ip_hash: await hashIp(request.headers.get('CF-Connecting-IP'), env.IP_HASH_SALT),
      user_agent: (request.headers.get('User-Agent') ?? '').slice(0, 250) || null,
    });
  } catch (error) {
    console.error('No se pudo guardar el lead en Supabase', error);
    return errorPage(
      [
        'Ha habido un problema al guardar tu solicitud.',
        'Vuelve a intentarlo en unos minutos o llámanos al 910 123 456.',
      ],
      502,
    );
  }

  await notifyByEmail(env, result.data);

  return redirect(request, SUCCESS_PATH);
};

/** Cualquier método distinto de POST no tiene sentido en este endpoint */
export const onRequestGet: PagesFunction<Env> = async ({ request }) =>
  redirect(request, '/contacto');

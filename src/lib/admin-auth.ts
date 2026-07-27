/**
 * Cliente de Supabase para el panel de administración (SSR).
 *
 * Se instancia en cada request con las cookies del usuario para mantener
 * la sesión. Usa la clave anon (pública) porque RLS controla los permisos
 * según el usuario autenticado.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY;

export function createAdminClient(cookies: AstroCookies): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        // Pasamos el token de la cookie para que Supabase lo use
        ...(cookies.get('sb-access-token')?.value
          ? { Authorization: `Bearer ${cookies.get('sb-access-token')!.value}` }
          : {}),
      },
    },
  });
}

/** Obtiene la sesión del usuario actual desde las cookies */
export async function getSession(cookies: AstroCookies) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) return null;

  // Si Supabase ha renovado el token, actualizamos las cookies
  if (data.session.access_token !== accessToken) {
    cookies.set('sb-access-token', data.session.access_token, {
      path: '/admin',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
    cookies.set('sb-refresh-token', data.session.refresh_token!, {
      path: '/admin',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
  }

  return data.session;
}

/** Borra las cookies de sesión (logout) */
export function clearSession(cookies: AstroCookies) {
  cookies.delete('sb-access-token', { path: '/admin' });
  cookies.delete('sb-refresh-token', { path: '/admin' });
}

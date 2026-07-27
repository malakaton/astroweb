/**
 * Cliente de Supabase para el panel de administración (SSR).
 *
 * En Cloudflare Pages, las variables de entorno en runtime NO están en
 * import.meta.env (eso solo funciona en build time). Se acceden desde
 * el contexto de la request: Astro.locals.runtime.env
 *
 * Por eso este módulo recibe las credenciales como parámetro.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export function createAdminClient(env: SupabaseEnv, cookies: AstroCookies): SupabaseClient {
  const accessToken = cookies.get('sb-access-token')?.value;

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  });
}

/** Obtiene la sesión del usuario actual desde las cookies */
export async function getSession(env: SupabaseEnv, cookies: AstroCookies) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) return null;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
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
      maxAge: 60 * 60 * 24 * 7,
    });
    cookies.set('sb-refresh-token', data.session.refresh_token!, {
      path: '/admin',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return data.session;
}

/** Borra las cookies de sesión (logout) */
export function clearSession(cookies: AstroCookies) {
  cookies.delete('sb-access-token', { path: '/admin' });
  cookies.delete('sb-refresh-token', { path: '/admin' });
}

/**
 * Extrae las variables de Supabase del contexto de Cloudflare runtime.
 * En Cloudflare Pages SSR, las variables están en Astro.locals.runtime.env.
 * NO usar import.meta.env aquí porque Astro lo resuelve en build time como ''.
 */
export function getSupabaseEnv(locals: App.Locals): SupabaseEnv {
  const runtime = (locals as any).runtime;
  if (!runtime?.env?.SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL no encontrada en runtime.env. ' +
      'Asegúrate de que está configurada en Cloudflare Pages → Settings → Environment variables ' +
      '(tanto para Production como Preview).'
    );
  }
  return {
    SUPABASE_URL: runtime.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: runtime.env.SUPABASE_ANON_KEY,
  };
}

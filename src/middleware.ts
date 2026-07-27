import { defineMiddleware } from 'astro:middleware';
import { getSession, getSupabaseEnv } from '@lib/admin-auth';

/**
 * Middleware de autenticación.
 * Protege todas las rutas /admin/* (excepto /admin/login).
 */
export const onRequest = defineMiddleware(async ({ url, cookies, redirect, locals }, next) => {
  if (!url.pathname.startsWith('/admin')) {
    return next();
  }

  const env = getSupabaseEnv(locals);

  // /admin/login es pública
  if (url.pathname === '/admin/login') {
    const session = await getSession(env, cookies);
    if (session) return redirect('/admin');
    return next();
  }

  // /admin/logout no requiere sesión válida
  if (url.pathname === '/admin/logout') {
    return next();
  }

  // El resto requiere sesión
  const session = await getSession(env, cookies);
  if (!session) return redirect('/admin/login');

  (locals as any).user = session.user;

  return next();
});

import { defineMiddleware } from 'astro:middleware';
import { getSession } from '@lib/admin-auth';

/**
 * Middleware de autenticación.
 *
 * Protege todas las rutas /admin/* (excepto /admin/login):
 * si no hay sesión válida, redirige al login.
 */
export const onRequest = defineMiddleware(async ({ url, cookies, redirect, locals }, next) => {
  // Solo actúa en rutas /admin
  if (!url.pathname.startsWith('/admin')) {
    return next();
  }

  // /admin/login es pública (si no, no podrían autenticarse)
  if (url.pathname === '/admin/login') {
    // Si ya tiene sesión, le llevamos al dashboard
    const session = await getSession(cookies);
    if (session) {
      return redirect('/admin');
    }
    return next();
  }

  // El resto de /admin/* requiere sesión
  const session = await getSession(cookies);
  if (!session) {
    return redirect('/admin/login');
  }

  // Guardamos el usuario en locals para que las páginas lo lean
  (locals as any).user = session.user;

  return next();
});

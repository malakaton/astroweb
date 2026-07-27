/**
 * Capa de acceso a Supabase.
 *
 * Se implementa sobre `fetch` contra la API REST (PostgREST) en lugar de
 * `@supabase/supabase-js` por dos motivos:
 *   1. Cero dependencias en el bundle de la Cloudflare Pages Function → arranque
 *      en frío mínimo.
 *   2. El sitio es estático: no queremos ninguna librería de cliente en el
 *      navegador (el objetivo es 0 KB de JS).
 *
 * Cuando se construya el panel de administración (Astro en modo SSR o una app
 * aparte) se puede instalar `@supabase/supabase-js` y reutilizar estos tipos.
 */

/** Estados del ciclo de vida de un lead comercial */
export type LeadStatus = 'nuevo' | 'contactado' | 'presupuestado' | 'ganado' | 'perdido';

/** Fila de la tabla `public.leads` */
export interface Lead {
  id: string;
  created_at: string;
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  localidad: string | null;
  superficie: number | null;
  presupuesto: string | null;
  mensaje: string;
  origen: string | null;
  estado: LeadStatus;
  notas: string | null;
  ip_hash: string | null;
  user_agent: string | null;
}

/** Datos que inserta el formulario público */
export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'estado' | 'notas'>;

export interface SupabaseConfig {
  url: string;
  /**
   * Clave de servicio. Solo se usa en el servidor (Pages Function) y nunca se
   * expone al navegador. En Cloudflare Pages debe guardarse como secret.
   */
  serviceRoleKey: string;
}

export class SupabaseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: string,
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Cliente REST mínimo. Solo expone lo necesario: insertar y listar leads.
 * Ampliar aquí conforme crezca el panel de administración.
 */
export function createSupabaseClient(config: SupabaseConfig) {
  const baseUrl = config.url.replace(/\/$/, '');

  const headers: Record<string, string> = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new SupabaseError(
        `Supabase respondió ${response.status}`,
        response.status,
        details.slice(0, 500),
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    /** Inserta un lead y devuelve su id */
    async insertLead(lead: LeadInsert): Promise<{ id: string }> {
      const rows = await request<{ id: string }[]>('leads?select=id', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(lead),
      });
      const inserted = rows[0];
      if (!inserted) throw new SupabaseError('Supabase no devolvió el lead insertado', 500);
      return inserted;
    },

    /** Listado paginado para el futuro panel de administración */
    async listLeads(options: { limit?: number; estado?: LeadStatus } = {}): Promise<Lead[]> {
      const params = new URLSearchParams({
        select: '*',
        order: 'created_at.desc',
        limit: String(options.limit ?? 50),
      });
      if (options.estado) params.set('estado', `eq.${options.estado}`);
      return request<Lead[]>(`leads?${params.toString()}`);
    },
  };
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

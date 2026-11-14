// Cliente mínimo de la API (Supabase PostgREST → funciones dc_* en la base de datos).
// Todas las operaciones que tocan XP, PIES, ELO, logros o inventario se ejecutan en el servidor.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export class ApiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

const MESSAGES = {
  username_invalid: 'El usuario debe tener de 3 a 16 caracteres: letras minúsculas, números, - o _.',
  name_invalid: 'El nombre visible debe tener entre 3 y 16 caracteres.',
  password_invalid: 'La contraseña debe tener al menos 6 caracteres.',
  username_taken: 'Ese nombre de usuario ya existe.',
  too_many_signups: 'Demasiadas cuentas creadas desde esta conexión. Probá más tarde.',
  too_many_attempts: 'Demasiados intentos fallidos. Esperá 15 minutos.',
  bad_credentials: 'Usuario o contraseña incorrectos.',
  legacy_claim_required: 'Esta cuenta viene de la versión anterior: recuperala con tu PIN.',
  not_legacy: 'Esa cuenta no tiene nada para recuperar con PIN.',
  session_invalid: 'La sesión expiró. Volvé a iniciar sesión.',
  not_owned: 'Todavía no tenés ese objeto.',
  not_for_sale: 'Ese objeto no se vende: se desbloquea jugando.',
  already_owned: 'Ya tenés ese objeto.',
  not_enough_pies: 'No te alcanzan los PIES.',
  level_required: 'Necesitás más nivel para ese objeto.',
  not_found: 'No se encontró ese jugador.',
  too_many_requests: 'Tenés demasiadas solicitudes pendientes.',
  too_many_friends: 'Llegaste al máximo de amigos.',
  same_account: 'La misma cuenta no puede ser J1 y J2.',
  too_fast: 'Partida enviada demasiado rápido.',
  invalid_match: 'La partida no pasó la validación del servidor.',
  invalid_comp: 'La competición no pasó la validación del servidor.',
  network: 'Sin conexión con el servidor.',
  no_season: 'No hay ninguna temporada activa en este momento.',
  premium_required: 'Esa recompensa es del Pase Premium.',
  not_ready: 'Todavía no completaste ese desafío.',
  already_claimed: 'Ya reclamaste esa recompensa.',
  invalid: 'Operación no válida.',
  not_friends: 'Solo podés desafiar a tus amigos del CLUB (o pasale el código de una sala).',
  room_not_found: 'No hay ninguna sala abierta con ese código.',
  room_full: 'Esa sala ya está completa.',
  room_private: 'Ese desafío es para otra cuenta.',
  report_invalid: 'Contanos qué pasó con al menos 10 letras (máximo 2000).',
  too_many_reports: 'Llegaste al máximo de reportes por hoy. ¡Gracias por ayudar! Probá mañana.',
  not_admin: 'Solo los administradores pueden ver esto.',
};
export const errorText = (e) => MESSAGES[e?.code] || e?.message || 'Error inesperado.';

/** Llama a una función RPC. Lanza ApiError(code). Devuelve el JSON de la respuesta. */
export async function rpc(fn, args = {}, { timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ApiError('network', 'network');
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = data?.message && MESSAGES[data.message] ? data.message : res.status >= 500 ? 'network' : data?.message || 'error';
    throw new ApiError(code, data?.message || String(res.status));
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && data.error) throw new ApiError(data.error);
  return data;
}

/** Identificador único para partidas (idempotencia en el servidor). */
export function uid(prefix = 'm') {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return prefix + '-' + [...a].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20) + Date.now().toString(36);
}

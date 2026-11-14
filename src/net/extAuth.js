// Entrar con Google o con un link al email (Supabase Auth). Supabase verifica a la persona y devuelve un token
// firmado en la dirección de la página (#access_token=...). Con ese token el servidor del juego abre la sesión
// en la cuenta vinculada, crea una cuenta nueva o vincula la cuenta actual (ver dc_auth_external / dc_auth_link).
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { ApiError } from './api.js';

const KEY = 'dc_ext_auth';
const back = () => location.origin + location.pathname;

function remember(slot, mode) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ slot, mode, at: Date.now() })); } catch {}
}

/** Va a Google. mode: 'login' (entrar o crear cuenta) o 'link' (vincular a la cuenta del jugador). */
export function startGoogle(slot, mode = 'login') {
  remember(slot, mode);
  location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(back())}`;
}

/** Manda un link de acceso al email. */
export async function startEmail(email, slot, mode = 'login') {
  remember(slot, mode);
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(back())}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: true }),
    });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const msg = String(d.msg || d.error_description || d.message || '');
    throw new ApiError(/rate|seconds/i.test(msg) ? 'email_rate' : /invalid/i.test(msg) ? 'email_invalid' : 'ext_auth_off', msg);
  }
}

/** Al volver de Google o del link del mail: devuelve {token, slot, mode} o {error} (y limpia la dirección). */
export function consumeRedirect() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!/access_token=|error=/.test(hash)) return null;
  const q = new URLSearchParams(hash);
  history.replaceState(null, '', location.pathname + location.search);
  let st = {};
  try { st = JSON.parse(sessionStorage.getItem(KEY) || '{}'); sessionStorage.removeItem(KEY); } catch {}
  if (q.get('error')) return { error: q.get('error_description') || q.get('error'), slot: st.slot ?? 0 };
  return { token: q.get('access_token'), slot: st.slot ?? 0, mode: st.mode || 'login' };
}

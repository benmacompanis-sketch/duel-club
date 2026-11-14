// Configuración pública del juego.
// La clave "publishable" de Supabase está pensada para usarse en el navegador: sólo permite llamar
// a las funciones dc_* del servidor, que validan la sesión y todas las reglas. No hay claves secretas aquí.
export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://fhfafgsmizuvjvqlcjor.supabase.co';
export const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_KEY || 'sb_publishable_IVUm-v872fJpZotySj_m5A_Dyw65gc9';
export const APP_VERSION = '4.2';

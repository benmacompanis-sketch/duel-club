# DUEL CLUB — Ultimate Chaotic Edition · Progreso

Archivo de seguimiento para continuar el trabajo entre sesiones.

## Infraestructura real
- Backend: Supabase, proyecto `duel-club` (ref `fhfafgsmizuvjvqlcjor`, región sa-east-1, plan gratuito).
  URL: https://fhfafgsmizuvjvqlcjor.supabase.co · clave publicable (segura para el navegador): `sb_publishable_IVUm-v872fJpZotySj_m5A_Dyw65gc9`
- Hosting: Vercel, equipo "IDEA CODE's projects".
- Respaldo previo a la migración: `/home/user/duel-club-backup-v2-20261104` + commit git `2ee8c8d`.
- Datos del Artifact de Claude respaldados en `backups/artifact-db/` (no se versiona: contiene hashes de PIN).
- El contenedor de desarrollo NO puede conectarse a *.supabase.co (política de red): el SQL se aplica con el conector de Supabase.

## Estado por fase
- [x] Catálogo único `src/data/catalog.js` (202 objetos; PIE STORE = 80: 20/18/16/12/9/5) y `src/data/achievements.js` (148 logros).
- [x] `scripts/gen-seed.mjs` → `supabase/seed/catalog.sql` (cargado en la base real y verificado).
- [x] Migraciones aplicadas: 001_core, 002a_core_logic, 002b_auth_store, 002c_matches, 002d_social_rankings (archivo fuente: `supabase/migrations/002_rpc.sql`).
- [x] Pruebas SQL reales de todas las RPC (registro, login, sesiones, partidas, duplicados, límites, competencia, tienda, equipar, amigos, rankings, perfiles, cara a cara, logout). Datos de prueba borrados.
- [x] Permisos verificados: anon sólo ejecuta `public.dc_*`; tablas y `dc.*` cerrados; RLS en todas las tablas.
- [ ] Frontend: config/api/accountService nuevos (sin window.claude), modal de cuenta (registro/login/reclamo), envío de partidas.
- [ ] UI: barra superior, menú nuevo, PIE STORE, inventario, logros, perfil con pestañas, CLUB, ranking, estadísticas, notificaciones.
- [ ] Cosméticos dibujados (skins, sombreros, máscaras, cuerpo, personajes meme, marcos, tarjetas, efectos, emotes).
- [ ] 4 minijuegos nuevos + dificultad CAOS.
- [ ] Migración de cuentas antiguas (re-leer el Artifact antes).
- [ ] Deploy Vercel + pruebas finales + README.

# DUEL CLUB — Ultimate Chaotic Edition · Progreso

Archivo de seguimiento para continuar el trabajo entre sesiones.

## Infraestructura real
- Backend: Supabase, proyecto `duel-club` (ref `fhfafgsmizuvjvqlcjor`, región sa-east-1, plan gratuito).
  URL: https://fhfafgsmizuvjvqlcjor.supabase.co · clave publicable (segura para el navegador): `sb_publishable_IVUm-v872fJpZotySj_m5A_Dyw65gc9`
- Repositorio: https://github.com/benmacompanis-sketch/duel-club (rama main).
- Hosting: GitHub Pages con publicación automática (`.github/workflows/deploy.yml`). Vercel rechazó crear el proyecto (403).
- Respaldo previo a la migración: `/home/user/duel-club-backup-v2-20261104` + commit git `2ee8c8d`.
- Datos del Artifact de Claude respaldados en `backups/artifact-db/` (no se versiona: contiene hashes de PIN).
- El contenedor de desarrollo NO puede conectarse a *.supabase.co (política de red): el SQL se aplica con el conector de Supabase.

## Estado por fase
- [x] Catálogo único `src/data/catalog.js` (202 objetos; PIE STORE = 80: 20/18/16/12/9/5) y `src/data/achievements.js` (148 logros).
- [x] `scripts/gen-seed.mjs` → `supabase/seed/catalog.sql` (cargado en la base real y verificado).
- [x] Migraciones aplicadas en Supabase: 001_core, 002a..002d (fuente: `supabase/migrations/002_rpc.sql`), legacy_accounts_migration.
- [x] Pruebas SQL reales de todas las RPC (registro, login, sesiones, partidas, duplicados, límites, competiciones, tienda, equipar, amigos, rankings, perfiles, cara a cara, logout, recuperación con PIN).
- [x] Permisos: anon solo ejecuta `public.dc_*`; tablas y `dc.*` cerrados; RLS en todas las tablas.
- [x] Frontend sin dependencias de Claude: `src/net/api.js`, `src/core/accountService.js` (cola offline, J1/J2, sesiones).
- [x] UI: hub con barra superior y 11 secciones, PIE STORE, inventario, logros, perfil (6 pestañas), CLUB, ranking, estadísticas, notificaciones, subida de nivel (67 especial).
- [x] Cosméticos dibujados (skins con patrón, sombreros, máscaras, cuerpo, entradas, victorias, emotes, marcos, 24 tarjetas) y 6 personajes MEME.
- [x] 4 minijuegos nuevos (Shadow Sneak, Turbo Tennis, Tower Climb, Blast Zone) + dificultad CAOS.
- [x] RESISTENCIA renombrada a **SUSI** (pedido del usuario).
- [x] Migración de las 4 cuentas antiguas (benuchinb2, gustabochasusana, matetas67, pepe7545) re-leídas del Artifact el 2026-11-04; verificada.
- [x] Código en GitHub; GitHub Pages activado por el usuario (Source: GitHub Actions).
- [x] Sitio publicado: https://benmacompanis-sketch.github.io/duel-club/ (GitHub Pages, deploy automático).
- [x] Prueba E2E en GitHub Actions contra el sitio publicado y la base real: 22/22 OK (registro, partida, KEKE, SUSI, PIES, tienda, amistad, ranking, perfil, otro navegador, contraseña incorrecta, logout, eliminar cuenta, trampa desde consola bloqueada).
- [x] Eliminar cuenta (dc_delete_account, migración 004). Tarea diaria anti-pausa de Supabase (keepalive.yml).
- Nota: el 2026-11-09 la base estaba pausada por inactividad (plan gratuito) y se reactivó.

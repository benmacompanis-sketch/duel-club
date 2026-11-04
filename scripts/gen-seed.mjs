// Genera supabase/seed/catalog.sql a partir del catálogo del juego (fuente única de verdad).
// Uso: node scripts/gen-seed.mjs
import { writeFileSync } from 'node:fs';
import { ALL_ITEMS, LEVEL_REWARDS, GAME_IDS, GAME_NAMES, GAME_RECORDS } from '../src/data/catalog.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';

const q = (v) => (v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(',')}]::text[]`;
const out = ['-- GENERADO por scripts/gen-seed.mjs — no editar a mano', 'begin;'];

out.push('insert into public.games(id, name, original, record_better, rec_min, rec_max) values');
out.push(GAME_IDS.map((g, i) => { const r = GAME_RECORDS[g] || [null, null, null]; return `(${q(g)}, ${q(GAME_NAMES[g])}, ${i < 12}, ${q(r[0])}, ${q(r[1])}, ${q(r[2])})`; }).join(',\n'));
out.push('on conflict (id) do update set name = excluded.name, original = excluded.original, record_better = excluded.record_better, rec_min = excluded.rec_min, rec_max = excluded.rec_max;');

out.push('insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values');
out.push(ALL_ITEMS.map((x) => `(${q(x.id)}, ${q(x.category)}, ${q(x.rarity)}, ${q(x.price)}, ${x.minLevel || 1}, ${!!x.default})`).join(',\n'));
out.push('on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = excluded.price, min_level = excluded.min_level, is_default = excluded.is_default;');

out.push('insert into public.catalog_achievements(id, tier, cond, rewards, secret) values');
out.push(ACHIEVEMENTS.map((a) => `(${q(a.id)}, ${q(a.tier)}, ${q(JSON.stringify(a.cond))}::jsonb, ${arr(a.rewards)}, ${a.secret})`).join(',\n'));
out.push('on conflict (id) do update set tier = excluded.tier, cond = excluded.cond, rewards = excluded.rewards, secret = excluded.secret;');

out.push('insert into public.level_rewards(level, pies, items) values');
out.push(LEVEL_REWARDS.map((l) => `(${l.level}, ${l.pies}, ${arr(l.items)})`).join(',\n'));
out.push('on conflict (level) do update set pies = excluded.pies, items = excluded.items;');
out.push('commit;');
writeFileSync(new URL('../supabase/seed/catalog.sql', import.meta.url), out.join('\n') + '\n');
console.log(`catalog.sql: ${GAME_IDS.length} juegos, ${ALL_ITEMS.length} objetos, ${ACHIEVEMENTS.length} logros, ${LEVEL_REWARDS.length} niveles`);

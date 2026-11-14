// Genera supabase/seed/pass.sql (temporadas, recompensas del pase, objetos del pase y desafíos) desde src/data.
// Uso: node scripts/gen-pass.mjs
import { writeFileSync } from 'node:fs';
import { SEASONS, PASS_XP_PER_LEVEL } from '../src/data/pass.js';
import { PASS_ITEMS } from '../src/data/catalog.js';
import { CHALLENGES } from '../src/data/challenges.js';

const q = (v) => (v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const out = ['-- GENERADO por scripts/gen-pass.mjs — no editar a mano', 'begin;'];
out.push('insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values');
out.push(PASS_ITEMS.map((x) => `(${q(x.id)}, ${q(x.category)}, ${q(x.rarity)}, null, 1, false)`).join(',\n'));
out.push('on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;');
for (const se of SEASONS) {
  out.push(`insert into public.seasons(id, name, starts_at, ends_at, premium_price, levels, xp_per_level) values (${q(se.id)}, ${q(se.name)}, ${q(se.starts)}, ${q(se.ends)}, ${se.premiumPrice}, ${se.levels}, ${PASS_XP_PER_LEVEL})`);
  out.push('on conflict (id) do update set name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at, premium_price = excluded.premium_price, levels = excluded.levels, xp_per_level = excluded.xp_per_level;');
  out.push('insert into public.pass_rewards(season_id, level, track, item_id, pies) values');
  out.push(se.rewards.map((r) => `(${q(se.id)}, ${r.level}, ${q(r.track)}, ${q(r.item)}, ${r.pies})`).join(',\n'));
  out.push('on conflict (season_id, level, track) do update set item_id = excluded.item_id, pies = excluded.pies;');
}
out.push('insert into public.challenge_defs(id, period, metric, game, target, xp, pies, label) values');
out.push(CHALLENGES.map((c) => `(${q(c.id)}, ${q(c.period)}, ${q(c.metric)}, ${q(c.game)}, ${c.target}, ${c.xp}, ${c.pies}, ${q(c.label)})`).join(',\n'));
out.push('on conflict (id) do update set period = excluded.period, metric = excluded.metric, game = excluded.game, target = excluded.target, xp = excluded.xp, pies = excluded.pies, label = excluded.label;');
out.push('commit;');
writeFileSync(new URL('../supabase/seed/pass.sql', import.meta.url), out.join('\n') + '\n');
console.log(`pass.sql: ${SEASONS.length} temporada(s), ${PASS_ITEMS.length} objetos, ${CHALLENGES.length} desafíos`);

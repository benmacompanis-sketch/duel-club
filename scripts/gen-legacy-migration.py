#!/usr/bin/env python3
"""Genera el SQL que migra las cuentas de la versión anterior (Claude Artifact) a Supabase.
Uso: python3 scripts/gen-legacy-migration.py backups/artifact-db-final > backups/legacy-migration.sql
- No inventa datos: todo sale de los documentos respaldados (cuentas, historial, récords, feed).
- Las cuentas quedan "sin reclamar": se recuperan con el PIN anterior (dc_claim) y una contraseña nueva.
- El SQL resultante contiene hashes de PIN: NO se versiona (backups/ está en .gitignore).
"""
import json, sys, glob, os, re
from collections import defaultdict

src = sys.argv[1]
players = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(f'{src}/players/*.json'))}
records = json.load(open(f'{src}/club/records.json')).get('games', {})
feed = json.load(open(f'{src}/club/feed.json')).get('items', [])

CARD = {'player': 'card_clasica', 'neon': 'card_neon', 'sunset': 'card_atardecer', 'ocean': 'card_oceano', 'forest': 'card_bosque', 'gold': 'card_oro', 'galaxy': 'card_galaxia'}
CHARS = {'volt', 'mochi', 'pico', 'brik', 'nimbus', 'fang', 'ozzy', 'rex'}
RANGES = {'reaction': ('lower', 100, 5000), 'race': ('lower', 5, 600), 'pong': ('higher', 0, 3000), 'platform': ('higher', 0, 900), 'hoop': ('higher', 0, 600),
          'memory': ('higher', 0, 3000), 'color': ('higher', 0, 100), 'arena': ('higher', 0, 20000), 'target': ('higher', 0, 9000), 'beat': ('higher', 0, 200000),
          'fish': ('higher', 0, 9000), 'blocks': ('higher', 0, 2000000)}
TIER_PIES = {'normal': 25, 'hard': 60, 'legendary': 150}
LEGACY_ACH_TIER = {'first_win': 'normal', 'five_wins': 'normal', 'ten_wins': 'normal', 'streak3': 'hard', 'all_games': 'legendary', 'marathon': 'normal', 'by_a_hair': 'hard',
                   'champion': 'hard', 'comeback': 'legendary', 'tournament_king': 'hard', 'survivor': 'hard', 'lightning': 'hard', 'clean_race': 'hard', 'shutout': 'hard',
                   'last_standing': 'hard', 'sniper': 'hard', 'memory_master': 'hard', 'painter': 'hard', 'flawless': 'hard', 'target_combo': 'hard', 'beat_perfect': 'hard',
                   'beat_combo': 'hard', 'golden_fish': 'hard', 'quad': 'hard'}

def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"
def ts(ms): return f"to_timestamp({ms}/1000.0)"
def mastery_rank(pts): return 4 if pts >= 160 else 3 if pts >= 80 else 2 if pts >= 35 else 1 if pts >= 12 else 0

out = ['-- Migración de cuentas de la versión anterior (generado por scripts/gen-legacy-migration.py)', 'begin;']
for u, d in players.items():
    st = d.get('stats', {})
    mg, cp = st.get('minigames', {}), st.get('competitions', {})
    played = st.get('played', 0)
    eq = {}
    if d.get('acc') and d['acc'] != 'none': eq['hat'] = 'acc_' + d['acc']
    eq['card'] = CARD.get(d.get('card'), 'card_clasica')
    char = d.get('char') if d.get('char') in CHARS else 'volt'
    rating = int(round(d.get('rating', 1000)))
    name = (d.get('name') or u)[:16]
    if len(name) < 3: name = u
    out.append(f"""insert into accounts(username, display_name, pass_hash, legacy_pin_hash, created_at, last_seen, rating, best_rating, played, wins, losses, draws, streak, best_streak,
  comp_wins, comp_losses, comp_draws, tournaments, survival_best, time_played, char, color, equipped)
values ({q(u)}, {q(name)}, null, {q(d.get('pin'))}, {ts(d.get('createdAt'))}, {ts(d.get('updatedAt') or d.get('createdAt'))}, {rating}, {max(rating, 1000)}, {played},
  {mg.get('wins', 0)}, {mg.get('losses', 0)}, {mg.get('draws', 0)}, {st.get('streak', 0)}, {st.get('bestStreak', 0)},
  {cp.get('wins', 0)}, {cp.get('losses', 0)}, {cp.get('draws', 0)}, {st.get('tournaments', 0)}, {st.get('survivalBest', 0)}, {round(st.get('timePlayed', 0), 1)},
  {q(char)}, {q(d.get('color', '#3985FF').upper())}, {q(json.dumps(eq))}::jsonb)
on conflict (username) do nothing;""")
    # PIES por la actividad real ya jugada (mismas reglas que el servidor nuevo) + bono de bienvenida
    pies = 300 + played * 5 + mg.get('wins', 0) * 10 + mg.get('draws', 0) * 3 \
        + (cp.get('wins', 0) + cp.get('losses', 0) + cp.get('draws', 0)) * 15 + cp.get('wins', 0) * 40 + cp.get('draws', 0) * 10
    ach = [a for a in d.get('achievements', {}) if a in LEGACY_ACH_TIER]
    pies_ach = sum(TIER_PIES[LEGACY_ACH_TIER[a]] for a in ach)
    out.append(f"select dc.add_pies((select id from accounts where username = {q(u)}), {pies}, 'legacy', 'partidas');")
    if pies_ach: out.append(f"select dc.add_pies((select id from accounts where username = {q(u)}), {pies_ach}, 'legacy', 'logros');")
    # KEKE = XP anterior (con las recompensas de nivel correspondientes)
    if d.get('xp'): out.append(f"select dc.add_keke((select id from accounts where username = {q(u)}), {int(d['xp'])}, 'legacy');")
    for a in ach:
        tsu = d['achievements'][a].get('ts') or d.get('createdAt')
        out.append(f"insert into achievements_unlocked(account_id, ach_id, unlocked_at) select id, {q(a)}, {ts(tsu)} from accounts where username = {q(u)} on conflict do nothing;")
        out.append(f"select dc.grant_item(a.id, r, 'achievement') from accounts a, catalog_achievements c, unnest(c.rewards) r where a.username = {q(u)} and c.id = {q(a)};")
    # dominio por minijuego reconstruido del historial (contiene todas sus partidas)
    hist = sorted(d.get('history', []), key=lambda h: h['ts'])
    per = defaultdict(lambda: {'played': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'streak': 0, 'best': 0})
    for h in hist:
        m = per[h['game']]
        m['played'] += 1
        if h['res'] == 'W': m['wins'] += 1; m['streak'] += 1; m['best'] = max(m['best'], m['streak'])
        elif h['res'] == 'L': m['losses'] += 1; m['streak'] = 0
        else: m['draws'] += 1; m['streak'] = 0
    recs = d.get('records', {})
    for g, m in per.items():
        r = recs.get(g)
        if r is not None and g in RANGES and not (RANGES[g][1] <= r <= RANGES[g][2]): r = None
        out.append(f"""insert into mastery(account_id, game_id, played, wins, losses, draws, streak, best_streak, best_record, rank)
  select id, {q(g)}, {m['played']}, {m['wins']}, {m['losses']}, {m['draws']}, {m['streak']}, {m['best']}, {q(round(r, 2) if r is not None else None)}, {mastery_rank(m['played'] + 2 * m['wins'])}
  from accounts where username = {q(u)} on conflict (account_id, game_id) do nothing;""")
    out.append(f"insert into rating_history(account_id, at, rating, delta) select id, {ts(d.get('updatedAt') or d.get('createdAt'))}, {rating}, 0 from accounts where username = {q(u)};")

# partidas (historial de cada cuenta, sin duplicar las que aparecen en las dos)
seen = []
def same(a, b): return a['game'] == b['game'] and abs(a['ts'] - b['ts']) < 2000
for u, d in players.items():
    for h in d.get('history', []):
        opp = (h.get('opp') or {}).get('id')
        if any(same(h, s['h']) and {u, opp} == {s['u'], s['opp']} for s in seen): continue
        seen.append({'u': u, 'opp': opp, 'h': h})
for s in seen:
    u, h, opp = s['u'], s['h'], s['opp']
    other = None
    if opp in players:
        other = next((x for x in players[opp].get('history', []) if same(x, h) and (x.get('opp') or {}).get('id') == u), None)
    sc = re.split(r'\s*[–-]\s*', h.get('score', ''))
    s1, s2 = (sc + ['', ''])[:2]
    winner = 0 if h['res'] == 'W' else 1 if h['res'] == 'L' else -1
    p2 = f"(select id from accounts where username = {q(opp)})" if opp in players else 'null'
    p2name = (h.get('opp') or {}).get('name') or 'Invitado'
    out.append(f"""insert into matches(client_id, created_at, game_id, mode, p1, p2, p1_name, p2_name, p1_color, p2_color, winner, score1, score2, delta1, delta2, legacy)
  values ({q(f"legacy-{h['ts']}-{h['game']}-{u}")}, {ts(h['ts'])}, {q(h['game'])}, {q('duel' if h.get('comp') else 'quick')}, (select id from accounts where username = {q(u)}), {p2},
  {q(players[u].get('name', u)[:16])}, {q(p2name[:16])}, {q(players[u].get('color'))}, {q((h.get('opp') or {}).get('color'))}, {winner}, {q(s1[:24])}, {q(s2[:24])},
  {int(h.get('elo') or 0)}, {int(other.get('elo') or 0) if other else 0}, true) on conflict (client_id) do nothing;""")

# competiciones del feed del club
for it in feed:
    pl = it.get('players', [])
    ids = [(p.get('accountId') if p.get('accountId') in players else None) for p in pl]
    a = f"(select id from accounts where username = {q(ids[0])})" if ids[0] else 'null'
    b = f"(select id from accounts where username = {q(ids[1])})" if len(ids) > 1 and ids[1] else 'null'
    mode = it.get('mode')
    if mode not in ('duel', 'tournament', 'survival'): continue
    summ = {'points': it.get('score'), 'detail': it.get('detail'), 'legacy': True, 'names': [p.get('name') for p in pl]}
    out.append(f"insert into competitions(client_id, created_at, mode, p1, p2, winner, summary) values ({q('legacy-comp-' + str(it['ts']))}, {ts(it['ts'])}, {q(mode)}, {a}, {b}, {int(it.get('winner', -1))}, {q(json.dumps(summ, ensure_ascii=False))}::jsonb) on conflict (client_id) do nothing;")

# récords mundiales
for g, r in records.items():
    if g not in RANGES or not (RANGES[g][1] <= r.get('value', -1) <= RANGES[g][2]): continue
    acc = f"(select id from accounts where username = {q(r.get('playerId'))})" if r.get('playerId') in players else 'null'
    out.append(f"insert into world_records(game_id, value, display, account_id, name, at) values ({q(g)}, {r['value']}, {q(r.get('display', ''))}, {acc}, {q((r.get('name') or '')[:16])}, {ts(r.get('date') or 0)}) on conflict (game_id) do nothing;")

# amistades: mutuas = aceptadas; de un solo lado = solicitud pendiente
done = set()
for u, d in players.items():
    for f in d.get('friends', []):
        if f not in players or (u, f) in done or (f, u) in done: continue
        mutual = u in players[f].get('friends', [])
        done.add((u, f))
        out.append(f"""insert into friendships(a, b, status, requested_by, created_at, responded_at)
  select least(x.id, y.id), greatest(x.id, y.id), {q('accepted' if mutual else 'pending')}, x.id, now(), {'now()' if mutual else 'null'}
  from accounts x, accounts y where x.username = {q(u)} and y.username = {q(f)} on conflict do nothing;""")
out.append("delete from notifications where account_id in (select id from accounts where pass_hash is null) and kind = 'level';")
out.append('commit;')
print('\n'.join(out))

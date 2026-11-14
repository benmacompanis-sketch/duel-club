// BOTS de DUEL CLUB: un jugador automático que mira el estado del minijuego y "aprieta teclas" como una
// persona (mismas reglas, mismas teclas, sin trampas: no ve nada que el jugador no vea en pantalla).
// La dificultad cambia el tiempo de reacción, la puntería y la cantidad de errores.
// Se usa en VS BOT, Singleplayer y Práctica. Las partidas contra bots nunca dan ELO.

export const BOT_LEVELS = {
  easy: { id: 'easy', name: 'Fácil', color: '#48D597', react: 0.42, noise: 1, slip: 0.2, speed: 0.6, hit: 0.62 },
  normal: { id: 'normal', name: 'Normal', color: '#3985FF', react: 0.3, noise: 0.6, slip: 0.1, speed: 0.8, hit: 0.8 },
  hard: { id: 'hard', name: 'Difícil', color: '#FF8E3C', react: 0.21, noise: 0.3, slip: 0.04, speed: 0.95, hit: 0.92 },
  expert: { id: 'expert', name: 'Experto', color: '#FF3B5C', react: 0.15, noise: 0.12, slip: 0.012, speed: 1, hit: 0.985 },
};
export const BOT_ORDER = ['easy', 'normal', 'hard', 'expert'];

const R = () => Math.random();
const gauss = () => (R() + R() + R() + R() - 2) / 0.816; // aprox. normal(0, 1)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Fuente de teclas que reemplaza a un jugador por un bot (misma interfaz que InputManager):
 * el otro jugador sigue usando el teclado real.
 */
export class BotInput {
  constructor(real, slot, level, gameId) {
    this.real = real;
    this.slot = slot;
    this.L = BOT_LEVELS[level] || BOT_LEVELS.normal;
    this.gameId = gameId;
    this.brain = BRAINS[gameId] || null;
    this.cur = new Set();
    this.prev = new Set();
    this.press = new Set();
    this.mem = {};
    this.t = 0;
    this.game = null;
  }
  attach(game) {
    this.game = game;
    this.mem = {};
    this.cur = new Set();
    this.prev = new Set();
    this.press = new Set();
  }
  /** Se llama antes de cada paso de simulación del minijuego. */
  tick(dt) {
    const g = this.game;
    if (!g || !this.brain) return;
    this.t += dt;
    const want = new Set();
    try {
      this.brain(g, this.slot, this, want, dt);
    } catch (e) {
      if (!this.mem.__err) { this.mem.__err = 1; console.warn('bot', this.gameId, e); }
    }
    // el bot piensa en lo que ve: si el minijuego invierte o espeja los controles, aprieta la tecla física que corresponde
    const inp = g.inputs?.[this.slot];
    const phys = new Set();
    for (const a of want) phys.add(inp ? inp.map(a) : a);
    this.prev = this.cur;
    this.cur = phys;
    this.press = new Set([...phys].filter((a) => !this.prev.has(a)));
  }
  held(p, a) {
    return p === this.slot ? this.cur.has(a) : this.real.held(p, a);
  }
  pressed(p, a) {
    return p === this.slot ? this.press.has(a) : this.real.pressed(p, a);
  }
  pressTime(p, a) {
    return p === this.slot ? null : this.real.pressTime(p, a);
  }
  anyPressed(p) {
    return p === this.slot ? this.press.size > 0 : this.real.anyPressed?.(p);
  }

  // ---------------------------------------------------------------- utilidades para los cerebros
  /** true cuando "cond" lleva al menos "delay" segundos siendo verdadera (reacción). */
  after(key, cond, delay) {
    const k = '_a_' + key;
    if (!cond) { this.mem[k] = null; return false; }
    if (this.mem[k] == null) this.mem[k] = this.t;
    return this.t - this.mem[k] >= delay;
  }
  /** Un valor que se recalcula cada "every" segundos (simula el tiempo de reacción al actualizar un objetivo). */
  every(key, every, fn) {
    const k = '_e_' + key;
    const m = this.mem[k];
    if (!m || this.t - m.t >= every) this.mem[k] = { t: this.t, v: fn() };
    return this.mem[k].v;
  }
  /** Toques sueltos de una tecla (para menús/cursores): como mucho uno cada "gap" segundos. */
  tap(want, a, gap = 0.12) {
    const k = '_t_' + a;
    if (this.mem[k] != null && this.t - this.mem[k] < gap) return;
    this.mem[k] = this.t;
    want.add(a);
  }
  /** Error de puntería en píxeles (cambia de a ratos, no en cada frame). */
  err(key, px, every = 0.6) {
    return this.every('err_' + key, every, () => gauss() * px * this.L.noise);
  }
  /** Moverse en 2D hacia (tx, ty) desde (x, y) con las flechas. */
  steer(want, x, y, tx, ty, dead = 8) {
    if (tx < x - dead) want.add('left');
    else if (tx > x + dead) want.add('right');
    if (ty < y - dead) want.add('up');
    else if (ty > y + dead) want.add('down');
  }
  steerX(want, x, tx, dead = 8) {
    if (tx < x - dead) want.add('left');
    else if (tx > x + dead) want.add('right');
  }
  /** Si no se movió en un rato (trabado contra algo), se mueve al azar un momento. */
  unstick(want, x, y, dist = 6, time = 0.45) {
    const m = this.mem;
    if (m._us && this.t < m._us.until) { for (const a of m._us.dirs) want.add(a); return true; }
    if (!m._sp || Math.hypot(x - m._sp.x, y - m._sp.y) > dist) { m._sp = { x, y, t: this.t }; return false; }
    if (this.t - m._sp.t > time && this.cur.size) {
      const opts = [['left'], ['right'], ['up'], ['down'], ['left', 'up'], ['right', 'down'], ['left', 'down'], ['right', 'up']];
      m._us = { until: this.t + 0.3, dirs: opts[Math.floor(R() * opts.length)] };
      m._sp = null;
      for (const a of m._us.dirs) want.add(a);
      return true;
    }
    return false;
  }
  chance(p) {
    return R() < p;
  }
}

// rebote en paredes horizontales: dónde va a estar la pelota cuando recorra "t" segundos
function foldY(y, vy, t, lo, hi) {
  const span = hi - lo;
  let v = y - lo + vy * t;
  v = ((v % (2 * span)) + 2 * span) % (2 * span);
  return lo + (v > span ? 2 * span - v : v);
}

// ===================================================================== CEREBROS POR MINIJUEGO
const BRAINS = {
  // ---------------------------------------------------------------- REACTION RUSH
  reaction(g, p, b, w) {
    if (g.state === 'signal' && g.react[p] == null) {
      if (b.mem.rt == null) b.mem.rt = clamp(b.L.react * (0.8 + R() * 0.45), 0.09, 0.8);
      if (b.after('sig', true, b.mem.rt)) w.add('a');
      return;
    }
    b.after('sig', false);
    b.mem.rt = null;
    if (g.state === 'wait') {
      // las señales falsas a veces lo engañan (según la dificultad)
      const fired = g.decoys.filter((d) => d.fired).length;
      if (fired > (b.mem.dec || 0)) {
        b.mem.dec = fired;
        if (b.chance(b.L.slip * 2.2)) b.mem.fs = b.t + 0.15 + R() * 0.2;
      }
      if (b.mem.fs && b.t >= b.mem.fs) { w.add('a'); b.mem.fs = null; }
    } else { b.mem.dec = 0; b.mem.fs = null; }
  },

  // ---------------------------------------------------------------- PONG CHAOS
  pong(g, p, b, w) {
    const pd = g.paddles[p];
    const TOP = 100, BOT = 704, BRr = 11;
    let ball = null, tt = Infinity;
    for (const k of g.balls) {
      const toward = p ? k.vx > 0 : k.vx < 0;
      if (!toward) continue;
      const t = Math.abs(pd.x - k.x) / Math.max(1, Math.abs(k.vx));
      if (t < tt) { tt = t; ball = k; }
    }
    const target = b.every('pt', b.L.react * 0.6, () => {
      if (!ball) return (TOP + BOT) / 2 + gauss() * 30;
      return foldY(ball.y, ball.vy, tt, TOP + BRr, BOT - BRr) + gauss() * 40 * b.L.noise;
    });
    const dz = 8 + 14 * b.L.noise;
    if (target < pd.y - dz) w.add('up');
    else if (target > pd.y + dz) w.add('down');
    if (ball && tt < 0.09 && Math.abs(ball.y - pd.y) < pd.h / 2 && b.every('sm', 0.3, () => R() < 0.25 + 0.6 * (1 - b.L.noise))) w.add('a');
  },

  // ---------------------------------------------------------------- HOOP MASTER
  hoop(g, p, b, w) {
    const s = g.shooters[p];
    if (s.reload > 0 || Math.abs(s.x - s.tx) > 4) { b.mem.aim = null; return; }
    const grav = 1300 * g.gravityScale;
    const hp = g.hoop;
    // dónde cruza la pelota la altura del aro (bajando) con este ángulo y esta potencia
    const landX = (ang, power) => {
      const [hx, hy] = g.hand(p);
      const [vx, vy] = g.launchVel({ ...s, ang, power }, p);
      const disc = vy * vy - 2 * grav * (hy - hp.y);
      if (disc <= 0) return null;
      return hx + vx * ((-vy + Math.sqrt(disc)) / grav);
    };
    if (b.mem.aim == null) {
      // ángulos con los que existe una potencia que emboca: elige uno (los bots buenos eligen tiros más limpios)
      const ok = [];
      for (let ang = 40; ang <= 82; ang += 2) {
        for (let pw = 0.05; pw <= 1; pw += 0.05) {
          const x = landX(ang, pw);
          if (x != null && Math.abs(x - hp.x) < 12) { ok.push(ang); break; }
        }
      }
      const ang = ok.length ? ok[Math.floor(ok.length * (0.35 + R() * 0.4))] : 70;
      b.mem.aim = { ang, off: gauss() * 24 * b.L.noise, t: b.t };
    }
    const A = b.mem.aim;
    const dir = p === 0 ? 1 : -1;
    if (!s.charging && Math.abs(s.ang - A.ang) > 1.2 && b.t - A.t < 2.5) {
      const ax = s.ang > A.ang ? dir : -dir; // bajar el ángulo = eje X hacia el aro
      w.add(ax > 0 ? 'right' : 'left');
      return;
    }
    if (b.t - A.t < b.L.react) return;
    w.add('a');
    if (!s.charging) return;
    const x = landX(s.ang, s.power);
    if (x != null && Math.abs(x - (hp.x + A.off)) < 8 + 6 * b.L.noise) { w.delete('a'); b.mem.aim = null; return; }
    if (b.t - A.t > 6) { w.delete('a'); b.mem.aim = null; }
  },

  // ---------------------------------------------------------------- MEMORY WAR
  memory(g, p, b, w) {
    const known = (b.mem.known ||= new Map());
    // memoria del bot: ve las cartas que se dan vuelta (a veces se olvida, según la dificultad)
    for (const k of g.cards) {
      if (k.up && k.owner < 0 && !known.has(k.i)) {
        if (R() < 1 - b.L.slip * 2.5) known.set(k.i, k.id);
      }
      if (k.owner >= 0) known.delete(k.i);
    }
    if (g.turn !== p || g.wait > 0) { b.mem.target = null; return; }
    const sel = g.sel || [];
    if (b.mem.target == null || g.cards[b.mem.target].up || g.cards[b.mem.target].owner >= 0) {
      const free = g.cards.filter((k) => k.owner < 0 && !k.up);
      let pick = null;
      if (sel.length === 1) {
        const first = sel[0];
        const mate = free.find((k) => k.id === first.id && known.get(k.i) === first.id);
        pick = mate || free.find((k) => !known.has(k.i)) || free[Math.floor(R() * free.length)];
      } else {
        // ¿conoce un par completo?
        const seen = new Map();
        for (const [i, id] of known) {
          const k = g.cards[i];
          if (k.owner >= 0 || k.up) continue;
          if (seen.has(id)) { pick = g.cards[seen.get(id)]; break; }
          seen.set(id, i);
        }
        if (!pick) pick = free.find((k) => !known.has(k.i)) || free[Math.floor(R() * free.length)];
      }
      if (!pick) return;
      b.mem.target = pick.i;
      b.mem.tt = b.t;
    }
    const T = g.cards[b.mem.target];
    const cur = g.cursor[p];
    const gap = 0.1 + (1 - b.L.speed) * 0.25;
    if (cur.c !== T.c) b.tap(w, cur.c < T.c ? 'right' : 'left', gap);
    else if (cur.r !== T.r) b.tap(w, cur.r < T.r ? 'down' : 'up', gap);
    else if (b.t - b.mem.tt > b.L.react) b.tap(w, 'a', 0.4);
  },

  // ---------------------------------------------------------------- BEAT BATTLE
  beat(g, p, b, w) {
    const LANES = ['left', 'down', 'up', 'right'];
    const notes = g.notes?.[p];
    if (!notes) return;
    const plan = (b.mem.plan ||= new Map());
    const sigma = 0.012 + 0.07 * b.L.noise;
    for (let i = g.next[p]; i < notes.length; i++) {
      const n = notes[i];
      if (n.t - g.songTime > 0.4) break;
      if (n.hit) continue;
      if (!plan.has(n)) plan.set(n, R() < b.L.hit ? n.t + gauss() * sigma : null);
      const at = plan.get(n);
      if (at != null && g.songTime >= at) { plan.set(n, null); w.add(LANES[n.lane]); }
    }
  },

  // ---------------------------------------------------------------- TARGET PANIC
  target(g, p, b, w) {
    const a = g.aims[p];
    const tgt = b.every('tg', b.L.react * 0.7, () => {
      let best = null, bs = -Infinity;
      for (const t of g.targets) {
        if (t.dead || t.owner === 'bomb' || (t.owner !== p && t.owner !== 'gold')) continue;
        const d = Math.hypot(t.x - a.x, t.y - a.y);
        const sc = (t.owner === 'gold' ? 300 : 0) - d + t.life * 40;
        if (sc > bs) { bs = sc; best = t; }
      }
      return best;
    });
    if (!tgt || tgt.dead) return;
    const ex = b.err('tx', tgt.r * 0.55, 0.5), ey = b.err('ty', tgt.r * 0.55, 0.5);
    const tx = tgt.x + ex, ty = tgt.y + ey;
    const d = Math.hypot(tx - a.x, ty - a.y);
    b.steer(w, a.x, a.y, tx, ty, 6);
    if (d < 70) w.add('b');
    // ¿hay una bomba debajo de la mira? no dispara
    const bomb = g.targets.some((t) => t.owner === 'bomb' && !t.dead && Math.hypot(t.x - a.x, t.y - a.y) < t.r);
    if (d < tgt.r * 0.5 && !bomb && a.cd <= 0 && a.reload <= 0 && a.ammo > 0 && b.after('fire', true, b.L.react * 0.4)) {
      w.add('a');
      b.after('fire', false);
    }
  },

  // ---------------------------------------------------------------- BLAST ZONE (esquivar peligros)
  blast(g, p, b, w) {
    const P = g.pl[p], O = g.pl[1 - p];
    if (!P.alive) return;
    const AX = 90, AY = 112, AW = 1100, AH = 580, CX = AX + AW / 2, CY = AY + AH / 2;
    const look = 0.25 + 0.25 * (1 - b.L.noise);
    const danger = (x, y) => {
      let d = 0;
      for (const z of g.zones || []) {
        if (z.t >= z.warn + 0.35) continue;
        const r = z.r + 34, dist = Math.hypot(x - z.x, y - z.y);
        if (dist < r) d += 4 * (1 - dist / r) + 2;
      }
      for (const L of g.lasers || []) {
        const wait = Math.max(0, L.warn - L.t);
        const fut = L.pos + L.dir * L.speed * Math.max(0, look - wait);
        const coord = L.horiz ? y : x;
        const along = L.horiz ? (x - AX) / AW : (y - AY) / AH;
        if (Math.abs(along - L.gap) < 0.06) continue;
        const ahead = (coord - L.pos) * L.dir; // >0: el láser viene hacia acá
        if (ahead > -20 && ahead < 320) d += 1.5 + Math.abs(along - L.gap) * 6;
        if (Math.abs(coord - fut) < 50) d += 3;
      }
      for (const o of g.orbs || []) {
        const ox = o.x + o.vx * look, oy = o.y + o.vy * look;
        const dist = Math.min(Math.hypot(x - ox, y - oy), Math.hypot(x - o.x, y - o.y));
        if (dist < o.r + 60) d += 3 * (1 - dist / (o.r + 60)) + 1;
      }
      if (g.phase >= 3 && g.ring) { const dc = Math.hypot(x - CX, y - CY); if (dc > g.ring - 50) d += 2 + (dc - g.ring + 50) / 25; }
      if (x < AX + 40 || x > AX + AW - 40 || y < AY + 40 || y > AY + AH - 40) d += 1.2;
      return d + Math.hypot(x - CX, y - CY) / 900;
    };
    const best = b.every('bz', Math.max(0.05, b.L.react * 0.45), () => {
      let bd = Infinity, pick = [0, 0];
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]]) {
        const v = danger(P.x + dx * 280 * look, P.y + dy * 280 * look) + R() * 0.8 * b.L.noise;
        if (v < bd) { bd = v; pick = [dx, dy]; }
      }
      return { dir: pick, here: danger(P.x, P.y) };
    });
    const [dx, dy] = best.dir;
    if (dx > 0.3) w.add('right'); else if (dx < -0.3) w.add('left');
    if (dy > 0.3) w.add('down'); else if (dy < -0.3) w.add('up');
    if (best.here > 3 && (dx || dy) && P.dashCd <= 0 && b.chance(1 - b.L.slip * 3)) w.add('a');
    if (O.alive && Math.hypot(O.x - P.x, O.y - P.y) < 85 && P.pushCd <= 0 && b.every('push', 0.4, () => R() < 0.6)) w.add('b');
  },

  // ---------------------------------------------------------------- COLOR CONTROL (pintar el mapa)
  color(g, p, b, w) {
    const bd = g.bodies[p];
    const cs = g.cell, cols = g.cols, rows = g.rows;
    const here = g.cellAt(bd.x, bd.y);
    if (!here) return;
    const hid = here.r * cols + here.c;
    // BFS desde la celda actual: distancias y padre de cada celda
    const bfs = () => {
      const par = new Int32Array(cols * rows).fill(-1);
      const order = [hid];
      par[hid] = hid;
      for (let i = 0; i < order.length; i++) {
        const id = order[i], c = id % cols, r = (id / cols) | 0;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const nid = nr * cols + nc;
          if (par[nid] >= 0 || g.cells[nid].wall) continue;
          par[nid] = id;
          order.push(nid);
        }
      }
      return { par, order };
    };
    const m = b.mem;
    const goalBad = m.goal == null || g.cells[m.goal].owner === p || b.t - m.goalT > 3;
    if (goalBad || m.hid !== hid) {
      const { par, order } = bfs();
      if (goalBad && b.t >= (m.think || 0)) {
        // elige la celda más conveniente (rival > vacía, dorada vale doble) cerca
        let best = null, bs = -Infinity;
        for (let i = 1; i < order.length; i++) {
          const k = g.cells[order[i]];
          if (k.owner === p) continue;
          const sc = (k.owner === 1 - p ? 2.6 : 2) + (k.gold ? 1.5 : 0) - i * 0.04 + R() * 1.4 * b.L.noise;
          if (sc > bs) { bs = sc; best = order[i]; }
        }
        for (const pw of g.powers || []) {
          const pk = g.cellAt(pw.x, pw.y);
          if (pk && par[pk.r * cols + pk.c] >= 0 && Math.abs(pk.c - here.c) + Math.abs(pk.r - here.r) < 5) { best = pk.r * cols + pk.c; break; }
        }
        m.goal = best;
        m.goalT = b.t;
        m.think = b.t + b.L.react * 0.5;
      }
      m.hid = hid;
      m.step = null;
      if (m.goal != null && par[m.goal] >= 0) {
        let cur = m.goal, prev = m.goal;
        while (par[cur] !== cur) { prev = cur; cur = par[cur]; }
        m.step = prev;
      }
    }
    if (m.step == null) return;
    if (b.unstick(w, bd.x, bd.y)) return;
    const k = g.cells[m.step];
    const tx = g.ox + (k.c + 0.5) * cs, ty = g.oy + (k.r + 0.5) * cs;
    // moverse alineado a la grilla (en diagonal se engancha en las esquinas de los muros)
    if (k.c !== here.c) { if (Math.abs(ty - bd.y) > cs * 0.18) b.steer(w, bd.x, bd.y, bd.x, ty, 2); else b.steerX(w, bd.x, tx, 2); }
    else if (k.r !== here.r) { if (Math.abs(tx - bd.x) > cs * 0.18) b.steerX(w, bd.x, tx, 2); else b.steer(w, bd.x, bd.y, bd.x, ty, 2); }
  },

  // ---------------------------------------------------------------- LAST PLATFORM (quedarse arriba)
  platform(g, p, b, w) {
    const B = g.bodies[p], O = g.bodies[1 - p];
    if (!B || B.dead) return;
    const TW = 40;
    // grupos de baldosas firmes contiguas (por altura)
    const groups = b.every('pg', 0.25, () => {
      const ok = g.tiles.filter((t) => t.state === 'ok').sort((u, v) => u.y - v.y || u.x - v.x);
      const out = [];
      for (const t of ok) {
        const last = out[out.length - 1];
        if (last && last.y === t.y && last.x1 === t.x) { last.x1 = t.x + TW; last.n++; } else out.push({ y: t.y, x0: t.x, x1: t.x + TW, n: 1 });
      }
      return out;
    });
    if (!groups.length) return;
    const myY = B.ground?.tile ? B.ground.tile.y : B.y;
    const tgt = b.every('pt', Math.max(0.2, b.L.react * 1.5), () => {
      let best = null, bs = Infinity;
      for (const G of groups) {
        const cx = (G.x0 + G.x1) / 2;
        const onIt = B.ground?.tile && G.y === myY && B.x >= G.x0 - 4 && B.x <= G.x1 + 4;
        const sc = -Math.min(G.n, 8) * 0.7 + Math.abs(cx - B.x) / 160 + (G.y < myY - 10 ? 2.2 : 0) + (onIt ? -3 : 0) + Math.abs(cx - 640) / 500 + R() * 2 * b.L.noise;
        if (sc < bs) { bs = sc; best = G; }
      }
      return best;
    });
    if (!tgt) return;
    const margin = Math.min(30, (tgt.x1 - tgt.x0) / 2 - 2);
    const center = (tgt.x0 + tgt.x1) / 2 + (640 - (tgt.x0 + tgt.x1) / 2) * 0.25;
    const tx = clamp(center + b.err('px', 40, 1.2), tgt.x0 + margin, tgt.x1 - margin);
    const onTarget = B.ground?.tile && tgt.y === myY && B.x >= tgt.x0 && B.x <= tgt.x1;
    b.steerX(w, B.x, tx, 6);
    if (B.ground?.tile && !onTarget) {
      // va hacia otro grupo: saltar al llegar al borde (o si el grupo está más arriba)
      const dir = tx > B.x ? 1 : -1;
      const ahead = B.x + dir * 22;
      const floor = g.tiles.some((t) => t.state !== 'fall' && ahead >= t.x && ahead < t.x + TW && t.y === myY);
      if (!floor || tgt.y < myY - 10) w.add('up');
    }
    if (!B.ground && B.vy < 0) w.add('up'); // mantener el salto (salto largo)
    if (b.chance(b.L.slip * 0.03)) w.add('up');
    if (O && !O.dead && B.ground && Math.abs(O.x - B.x) < 70 && Math.abs(O.y - B.y) < 30 && B.dashCd <= 0 && b.every('dash', 0.5, () => R() < 0.25 + 0.5 * (1 - b.L.noise))) {
      w.delete('left'); w.delete('right'); w.add(O.x > B.x ? 'right' : 'left'); w.add('b');
    }
  },
};

export const BOT_GAMES = () => Object.keys(BRAINS);
export function registerBrain(id, fn) {
  BRAINS[id] = fn;
}

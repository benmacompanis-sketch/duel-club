// Clase base de todos los minijuegos. Define el ciclo de vida común y utilidades de HUD.
// Ciclo: constructor -> init() -> [ambient() en presentación/cuenta regresiva] ->
// update(dt) mientras se juega -> finish(result) -> destroy().
import { FX } from '../core/renderer.js';
import { PlayerInput } from '../core/inputManager.js';
import { drawPortrait } from '../core/characters.js';
import { W, H, text, panel, rgba, fmtTime, clamp, PALETTE, roundRect, quality, shade, burst, comicPanel, halftone, mix } from '../core/utils.js';

export class BaseGame {
  constructor(app, opts) {
    this.app = app;
    this.audio = app.audio;
    this.opts = opts;
    this.players = opts.players; // perfiles [{name, char, color, acc}]
    this.diff = opts.difficulty ?? 0.5; // 0 fácil, 0.5 normal, 1 difícil, >1 supervivencia
    this.event = opts.event || null;
    this.options = opts.options || {};
    this.fx = new FX();
    // En las partidas online el input llega del módulo de red (mismas teclas en las dos compus, frame a frame)
    const src = opts.input || app.input;
    // 2v2: J1+J3 (equipo azul, lado 0) contra J2+J4 (equipo rojo, lado 1)
    this.team = !!opts.team;
    this.np = this.team ? 4 : 2;
    this.inputs = Array.from({ length: this.np }, (_, p) => new PlayerInput(src, p, this));
    this.online = !!opts.online;
    this.time = 0; // tiempo de juego (afectado por la escala de tiempo)
    this.realTime = 0;
    this.done = false;
    this.result = null;
    this.inverted = false;
    this.mirrored = this.event === 'mirror'; // pantalla espejada (evento o CAOS): los controles la siguen
    this.timeScale = this.event === 'speed' ? 1.35 : 1;
    this.gravityScale = this.event === 'lowgrav' ? 0.5 : 1;
    this.extraObstacles = this.event === 'obstacles';
    this.duration = 0; // para juegos con tiempo
  }
  get meta() {
    return this.constructor.meta;
  }
  color(p) {
    return this.players[p].color;
  }
  name(p) {
    if (this.team && p < 2 && this.players[p + 2]) return `${this.players[p].name} & ${this.players[p + 2].name}`;
    return this.players[p].name;
  }
  side(p) {
    return p % 2;
  }
  // duración ajustada por el evento "tiempo reducido"
  timed(sec) {
    return this.event === 'short' ? Math.round(sec * 0.65) : sec;
  }
  get remaining() {
    return Math.max(0, this.duration - this.time);
  }
  // multiplicador de puntos para el evento "puntuación doble"
  scoreMul() {
    return this.event === 'double' && this.duration > 0 && this.remaining <= this.duration / 3 ? 2 : 1;
  }
  sfx(name, o) {
    this.audio.play(name, o);
  }
  /** Reloj en milisegundos para medir reflejos. Online es el reloj de la simulación (idéntico en las dos compus). */
  now() {
    return this.opts.clock ? this.opts.clock() : performance.now();
  }

  init() {}
  ambient(dt) {}
  update(dt) {}
  render(g) {}
  renderHUD(g) {}
  onPause() {}
  onResume() {}
  destroy() {
    this.fx.clear();
  }

  /**
   * Termina la partida. winner: 0, 1 o -1 (empate).
   * scores: puntuación interna. stats: [{label, values:[a,b], better:'high'|'low'}].
   * records: valor para el récord de este minijuego por jugador (o null).
   * flags: datos para logros por jugador.
   */
  finish(r) {
    if (this.done) return;
    this.done = true;
    this.result = {
      winner: r.winner,
      scores: r.scores || [0, 0],
      display: r.display || (r.scores || [0, 0]).map(String),
      scoreLabel: r.scoreLabel || 'Puntos',
      stats: r.stats || [],
      records: r.records || [null, null],
      flags: r.flags || [{}, {}],
      margin: r.margin ?? null,
      banner: r.banner || null,
      summary: r.summary || '',
    };
  }
  static decide(a, b, higherWins = true) {
    if (a === b) return -1;
    return (a > b) === higherWins ? 0 : 1;
  }

  // ------------------------------------------------------------------ HUD común
  /** Barra superior estándar: retratos, nombres, marcador y reloj central. */
  hudTop(g, o = {}) {
    const t = this.realTime;
    for (const p of [0, 1]) {
      const left = p === 0;
      const x = left ? 18 : W - 18 - 380;
      const col = this.color(p);
      // panel de historieta: color del jugador, tramado, tinta gruesa y sombra dura (inclinado hacia el centro)
      comicPanel(g, x, 10, 380, 66, shade(col, -0.45), { skew: left ? 12 : -12, tilt: left ? 3 : -3, dotColor: rgba(col, 0.35) });
      g.save();
      g.fillStyle = col;
      g.beginPath();
      if (left) { g.moveTo(x + 12, 10); g.lineTo(x + 92, 10); g.lineTo(x + 80, 76); g.lineTo(x, 76); }
      else { g.moveTo(x + 288, 10); g.lineTo(x + 368, 10); g.lineTo(x + 380, 76); g.lineTo(x + 300, 76); }
      g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
      g.restore();
      const px = left ? x + 44 : x + 336;
      drawPortrait(g, px, 43, 26, this.players[p], { t: t + p, facing: left ? 1 : -1 });
      text(g, this.name(p).toUpperCase(), left ? x + 98 : x + 282, 30, { size: 20, align: left ? 'left' : 'right', color: PALETTE.white });
      if (o.sub) text(g, o.sub[p], left ? x + 98 : x + 282, 56, { size: 13, align: left ? 'left' : 'right', color: rgba(PALETTE.white, 0.85), body: true, weight: 800 });
      if (o.scores) {
        text(g, String(o.scores[p]), left ? x + 360 : x + 20, 44, { size: o.scoreSize || 40, align: left ? 'right' : 'left', color: '#FFD23F' });
      }
    }
    if (o.timer != null) {
      const low = o.timer <= 10;
      const pulse = low ? 1 + Math.max(0, Math.sin(t * 10)) * 0.08 : 1;
      burst(g, W / 2, 44, 46 * pulse, low ? '#FF4B3E' : '#FFD23F', { points: 12, rot: t * 0.3, inner: 0.8, sx: 1.7 });
      text(g, o.timerText || fmtTime(Math.ceil(o.timer)), W / 2, 46, { size: 34 * pulse, color: low ? '#FFFFFF' : '#15121F', comic: low });
    } else if (o.center) {
      comicPanel(g, W / 2 - 92, 10, 184, 68, '#FFD23F', { skew: 10, dotColor: 'rgba(13,11,20,0.15)' });
      text(g, o.center, W / 2, o.centerSub ? 36 : 46, { size: o.centerSize || 26, color: '#15121F', comic: false });
      if (o.centerSub) text(g, o.centerSub, W / 2, 62, { size: 13, body: true, weight: 800, color: '#15121F' });
    }
    if (this.scoreMul() > 1) {
      const a = 0.75 + Math.sin(t * 8) * 0.25;
      comicPanel(g, W / 2 - 84, 88, 168, 30, '#3DDC97', { skew: 8, alpha: a, dots: false });
      text(g, 'PUNTOS x2', W / 2, 103, { size: 20, color: '#FFFFFF' });
    }
  }

  /** Barra de progreso de tiempo (fina) bajo el HUD. */
  hudTimeBar(g, y = 82) {
    if (!this.duration) return;
    const k = clamp(this.remaining / this.duration, 0, 1);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, W / 2 - 200, y, 400, 6, 3);
    g.fill();
    g.fillStyle = k < 0.2 ? '#FF654F' : k < 0.5 ? '#FFC93C' : '#48D597';
    roundRect(g, W / 2 - 200, y, 400 * k, 6, 3);
    g.fill();
  }

  /** Fondo de arena genérico con viñeta. */
  arenaBG(g, c1 = '#0F1630', c2 = '#0B1020') {
    // cada minijuego tiñe su fondo con su color (misma familia de historieta, paletas distintas)
    const tint = this.meta?.color || '#9B6CFF';
    c1 = mix(c1, tint, 0.38);
    c2 = mix(c2, tint, 0.22);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // historieta: tramado de puntos con el color del minijuego y líneas de acción desde el centro
    const mc = this.meta?.color || '#9B6CFF';
    g.fillStyle = halftone(g, rgba(mc, 0.16), 12, 2.2);
    g.fillRect(0, 0, W, H);
    g.save();
    g.strokeStyle = 'rgba(13,11,20,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.13;
      g.moveTo(W / 2 + Math.cos(a) * 420, H / 2 + Math.sin(a) * 300);
      g.lineTo(W / 2 + Math.cos(a) * 900, H / 2 + Math.sin(a) * 700);
    }
    g.stroke();
    g.restore();
  }
  vignette(g) {
    const r = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    r.addColorStop(0, 'rgba(0,0,0,0)');
    r.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
  }
  grid(g, x, y, w, h, step, color = 'rgba(13,11,20,0.28)') {
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    for (let gx = x; gx <= x + w; gx += step) { g.moveTo(gx, y); g.lineTo(gx, y + h); }
    for (let gy = y; gy <= y + h; gy += step) { g.moveTo(x, gy); g.lineTo(x + w, gy); }
    g.stroke();
  }
  /** Indicador de "controles invertidos" etc. sobre el personaje */
  label(g, x, y, str, col) {
    text(g, str, x, y, { size: 14, color: '#fff', stroke: shade(col, -0.5), body: true, weight: 800 });
  }
}

export { quality };

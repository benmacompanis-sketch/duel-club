// Clase base de todos los minijuegos. Define el ciclo de vida común y utilidades de HUD.
// Ciclo: constructor -> init() -> [ambient() en presentación/cuenta regresiva] ->
// update(dt) mientras se juega -> finish(result) -> destroy().
import { FX } from '../core/renderer.js';
import { PlayerInput } from '../core/inputManager.js';
import { drawPortrait } from '../core/characters.js';
import { W, H, text, panel, rgba, fmtTime, clamp, PALETTE, roundRect, quality, shade } from '../core/utils.js';

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
    this.inputs = [new PlayerInput(app.input, 0, this), new PlayerInput(app.input, 1, this)];
    this.time = 0; // tiempo de juego (afectado por la escala de tiempo)
    this.realTime = 0;
    this.done = false;
    this.result = null;
    this.inverted = false;
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
    return this.players[p].name;
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
      g.save();
      roundRect(g, x, 12, 380, 64, 20);
      const grad = g.createLinearGradient(x, 0, x + 380, 0);
      grad.addColorStop(left ? 0 : 1, rgba(col, 0.42));
      grad.addColorStop(left ? 1 : 0, 'rgba(11,16,32,0.6)');
      g.fillStyle = grad;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = rgba(col, 0.75);
      g.stroke();
      g.restore();
      const px = left ? x + 40 : x + 340;
      drawPortrait(g, px, 44, 26, this.players[p], { t: t + p, facing: left ? 1 : -1 });
      text(g, this.name(p).toUpperCase(), left ? x + 76 : x + 304, 30, { size: 15, align: left ? 'left' : 'right', color: PALETTE.white, body: true, weight: 700 });
      if (o.sub) text(g, o.sub[p], left ? x + 76 : x + 304, 54, { size: 14, align: left ? 'left' : 'right', color: rgba(PALETTE.white, 0.7), body: true, weight: 500 });
      if (o.scores) {
        text(g, String(o.scores[p]), left ? x + 362 : x + 18, 45, { size: o.scoreSize || 36, align: left ? 'right' : 'left', color: '#fff', glow: col });
      }
    }
    if (o.timer != null) {
      const low = o.timer <= 10;
      const pulse = low ? 1 + Math.max(0, Math.sin(t * 10)) * 0.08 : 1;
      panel(g, W / 2 - 74, 10, 148, 70, { r: 22, fill: 'rgba(11,16,32,0.82)', stroke: low ? '#FF654F' : 'rgba(155,108,255,0.7)', glow: low ? '#FF654F' : null });
      text(g, o.timerText || fmtTime(Math.ceil(o.timer)), W / 2, 46, { size: 34 * pulse, color: low ? '#FF8A78' : '#fff' });
    } else if (o.center) {
      panel(g, W / 2 - 90, 10, 180, 70, { r: 22, fill: 'rgba(11,16,32,0.82)', stroke: 'rgba(155,108,255,0.7)' });
      text(g, o.center, W / 2, o.centerSub ? 36 : 46, { size: o.centerSize || 26 });
      if (o.centerSub) text(g, o.centerSub, W / 2, 62, { size: 13, body: true, color: rgba(PALETTE.white, 0.7) });
    }
    if (this.scoreMul() > 1) {
      const a = 0.7 + Math.sin(t * 8) * 0.3;
      panel(g, W / 2 - 80, 86, 160, 28, { r: 14, fill: rgba('#48D597', 0.25 * a + 0.1), stroke: '#48D597' });
      text(g, 'PUNTOS x2', W / 2, 100, { size: 16, color: '#BFFFE0' });
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
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  vignette(g) {
    const r = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    r.addColorStop(0, 'rgba(0,0,0,0)');
    r.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
  }
  grid(g, x, y, w, h, step, color = 'rgba(155,108,255,0.07)') {
    g.strokeStyle = color;
    g.lineWidth = 1;
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

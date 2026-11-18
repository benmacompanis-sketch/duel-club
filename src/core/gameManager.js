// GameManager: núcleo de DUEL CLUB. Une renderer, input, audio, almacenamiento, logros y UI,
// ejecuta el bucle principal (requestAnimationFrame + delta time) y contiene el
// MinigameRunner, la máquina de estados común de todos los minijuegos:
// intro -> countdown -> playing <-> paused -> ending -> done
import { Renderer } from './renderer.js';
import { InputManager } from './inputManager.js';
import { AudioManager } from './audioManager.js';
import { StorageManager } from './storageManager.js';
import { StatsManager } from './statsManager.js';
import { AccountService } from './accountService.js';
import { AchievementManager } from './achievementManager.js';
import { EVENTS } from './events.js';
import { keyName } from './inputManager.js';
import { BotInput } from './bots.js';
import { handleExtAuth } from '../ui/extAuthFlow.js';
let GameRunnerDots = null;
const keyNameShort = (c) => ({ ShiftRight: 'SHIFT', NumpadEnter: 'ENTER' }[c] || keyName(c));
import { W, H, text, rgba, quality, clamp, rand, ease, PALETTE, panel, mulberry32, burst, comicPanel, cachedLayer } from './utils.js';
const fmtGhost = (v) => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
import { UI } from '../ui/ui.js';
import { introScreen } from '../ui/intro.js';
import { pauseModal } from '../ui/pause.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { onlineScreen, startChallengeWatcher, checkActiveMatch } from '../ui/online.js';

// Modificadores de la dificultad CAOS (afectan a los dos jugadores por igual)
const CAOS_MODS = {
  turbo: { name: 'TURBO', desc: 'Todo va un 40% más rápido durante unos segundos.', dur: 5, scale: 1.4 },
  lento: { name: 'CÁMARA LENTA', desc: 'El tiempo se arrastra. Aprovechá para pensar.', dur: 4.5, scale: 0.65 },
  invert: { name: 'CONTROLES INVERTIDOS', desc: 'Izquierda es derecha. Arriba es abajo. Para los dos.', dur: 4 },
  mirror: { name: 'ESPEJO', desc: 'La pantalla se da vuelta: jugás del otro lado. Tus teclas siguen lo que ves.', dur: 5 },
  niebla: { name: 'APAGÓN', desc: 'Se cortó la luz del club. Se ve solo el centro.', dur: 5 },
  temblor: { name: 'TERREMOTO', desc: 'La pantalla tiembla. Nadie sabe por qué.', dur: 4 },
};
function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class CancelledError extends Error {
  constructor() {
    super('cancelled');
    this.cancelled = true;
  }
}

export class App {
  constructor() {
    this.testMode = new URLSearchParams(location.search).has('test');
    this.storage = new StorageManager();
    this.save = this.storage.load();
    quality.set(this.settings.quality, this.settings.animations);
    this.renderer = new Renderer();
    this.input = new InputManager();
    this.input.setBindings(this.settings.bindings);
    this.input.attach();
    this.audio = new AudioManager();
    this.audio.setVolumes({ master: this.settings.master, music: this.settings.musicOff ? 0 : this.settings.music, sfx: this.settings.sfxOff ? 0 : this.settings.sfx });
    this.stats = new StatsManager(this);
    this.achievements = new AchievementManager(this);
    this.accounts = new AccountService(this);
    this.ui = new UI(this);
    this.runner = new MinigameRunner(this);
    // últimos errores de JavaScript (se adjuntan a los reportes de errores si el jugador quiere)
    this.errorLog = [];
    const logErr = (msg) => {
      this.errorLog.push(`${new Date().toISOString().slice(11, 19)} ${String(msg).slice(0, 280)}`);
      if (this.errorLog.length > 10) this.errorLog.shift();
    };
    this.logError = logErr;
    window.addEventListener('error', (e) => logErr(`${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`));
    window.addEventListener('unhandledrejection', (e) => logErr('promesa: ' + (e.reason?.message || e.reason)));
    this.net = null; // ronda online en curso (simulación sincronizada)
    this.online = null; // serie online en curso
    this.storage.onError = () => this.ui.toast({ title: 'No se pudo guardar', text: 'El navegador bloqueó el almacenamiento local.', kind: 'warn' });
    this.last = performance.now();
    this.debugScale = 1;
    this._loop = (t) => this.loop(t);
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    window.addEventListener('beforeunload', () => this.storage.saveNow());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.storage.saveNow();
        this.runner.autoPause();
      }
    });
    if (this.testMode) {
      window.DC = this;
      this.GAMES = GAMES;
    }
  }
  get settings() {
    return this.save.settings;
  }
  gameMeta(id) {
    return GAME_BY_ID[id]?.meta || null;
  }
  get profiles() {
    return this.save.profiles;
  }
  persist() {
    this.storage.save();
  }
  applySettings() {
    const s = this.settings;
    quality.set(s.quality, s.animations);
    document.body.classList.toggle('no-anim', !s.animations);
    this.audio.setVolumes({ master: s.master, music: s.musicOff ? 0 : s.music, sfx: s.sfxOff ? 0 : s.sfx });
    this.renderer.resize();
    this.persist();
  }
  start() {
    document.body.classList.toggle('no-anim', !this.settings.animations);
    if (!this.storage.available) {
      setTimeout(() => this.ui.toast({ title: 'Modo sin guardado', text: 'El navegador no permite LocalStorage: las estadísticas no se conservarán.', kind: 'warn' }), 1500);
    }
    this.ui.goTitle();
    // validar las sesiones guardadas contra el servidor y enviar resultados pendientes
    const ready = this.accounts.init().catch((e) => console.warn('cuentas', e));
    // modo online: desafíos entrantes y links de sala (?sala=CODIGO)
    ready.then(() => {
      handleExtAuth(this);
      startChallengeWatcher(this);
      checkActiveMatch(this);
      const code = new URLSearchParams(location.search).get('sala');
      if (code && /^[A-Za-z0-9]{5}$/.test(code)) {
        history.replaceState(null, '', location.pathname + location.search.replace(/[?&]sala=[^&]*/, '').replace(/^&/, '?'));
        this.ui.show(onlineScreen, { code: code.toUpperCase() });
      }
    });
    requestAnimationFrame(this._loop);
  }
  loop(now) {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 0.05); // evita saltos tras pestaña inactiva
    try {
      this.renderer.renderBackground(dt, this.runner.active ? 'game' : 'menu');
      if (this.net?.running) {
        // partida online: la simulación avanza en pasos fijos sincronizados con el rival
        this.net.frame(dt);
      } else {
        // en modo de prueba se puede acelerar con subpasos (misma física, más rápido)
        const steps = this.testMode ? Math.max(1, Math.round(this.debugScale)) : 1;
        for (let i = 0; i < steps && this.runner.active; i++) this.runner.frame(dt, i === steps - 1);
      }
      this.ui.frame(dt);
      this.renderer.renderOverlay(dt);
    } catch (e) {
      console.error('DUEL CLUB loop error', e);
      this.logError?.(`bucle: ${e?.message} ${(e?.stack || '').split('\n')[1]?.trim() || ''}`);
      this.runner.crash(e);
    }
    this.input.endFrame();
    this.input.pollPads();
    requestAnimationFrame(this._loop);
  }
}

// ---------------------------------------------------------------------------------
export class MinigameRunner {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.state = 'idle';
    this.game = null;
    this.Game = null;
    this.opts = null;
    this.t = 0;
    this.playSeconds = 0;
    this.unsub = app.input.on((e) => this.onKey(e));
  }

  /** Ejecuta un minijuego completo y devuelve su resultado. Rechaza con CancelledError si se abandona. */
  play(gameId, opts) {
    this.close();
    const Game = GAME_BY_ID[gameId];
    if (!Game) return Promise.reject(new Error('Minijuego desconocido: ' + gameId));
    this.Game = Game;
    this.gameId = gameId;
    this.opts = { ...opts, players: opts.players || this.app.profiles.map((p) => ({ ...p })) };
    this.active = true;
    this.playSeconds = 0;
    this.app.renderer.showGame(true);
    this.app.input.captureMode = true;
    this.createGame();
    this.state = 'intro';
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      // online la presentación la maneja la sala (los dos tienen que estar listos) y el juego arranca con la red
      if (!opts.online) this.showIntro();
    });
  }
  createGame() {
    if (this.game) {
      try { this.game.destroy(); } catch (e) { console.error(e); }
    }
    // VS BOT / Singleplayer / Práctica: un jugador lo maneja la compu (mismas teclas y reglas que una persona)
    this.bot = null;
    this.bots = [];
    if (this.opts.bots && !this.opts.online) {
      let src = this.app.input;
      for (const [slot, level] of Object.entries(this.opts.bots)) {
        const b = new BotInput(src, Number(slot), level, this.Game.meta.id);
        this.bots.push(b);
        src = b;
      }
      this.opts.input = src;
    } else if (this.opts.bot && !this.opts.online) {
      // bot0: solo para pruebas automáticas (bot contra bot)
      const base = this.opts.bot0 ? new BotInput(this.app.input, 0, this.opts.bot0, this.Game.meta.id) : this.app.input;
      this.bot = new BotInput(base, this.opts.botSlot ?? 1, this.opts.bot, this.Game.meta.id);
      this.bots = base === this.app.input ? [this.bot] : [base, this.bot];
      this.opts.input = this.bot;
    }
    // semilla fija (desafíos diario/semanal): el minijuego sale idéntico para todos los jugadores
    this.rng = this.opts.seed != null ? mulberry32(this.opts.seed >>> 0) : null;
    this.game = this.seeded(() => { const gm = new this.Game(this.app, this.opts); gm.init(); return gm; });
    // fantasma: grabación (pose + puntaje cada 0,1 s) y reproducción
    this.ghostRec = this.opts.ghostRec ? { v: 1, game: this.Game.meta.id, dt: 0.1, f: [] } : null;
    this.ghostNext = 0;
    this.ghostPlay = this.opts.ghost?.f?.length ? this.opts.ghost : null;
    // reglas de Puzzle Club / Historia: límites que se revisan en cada cuadro (tiros, errores, saltos…)
    this.rule = this.opts.rule || null;
    this.ruleOut = null;
    for (const b of this.bots) b.attach(this.game);
    this.t = 0;
    this.endT = 0;
    this.invert = { next: rand(6, 9), phase: 'off', t: 0 };
    this.baseTimeScale = this.game.timeScale;
    // Dificultad CAOS: modificadores temporales, iguales para ambos jugadores y siempre anunciados antes
    this.caos = this.opts.caos ? { next: rand(7, 10), phase: 'off', t: 0, kind: null, bag: [] } : null;
  }
  showIntro() {
    this.app.ui.show(introScreen, {
      meta: this.Game.meta,
      opts: this.opts,
      onStart: () => this.startCountdown(),
      onBack: () => this.requestQuit(),
    });
  }
  startCountdown() {
    if (this.state !== 'intro' && this.state !== 'restart') return;
    this.app.ui.clear();
    this.state = 'countdown';
    this.cd = 0;
    this.lastCount = -1;
    const music = this.Game.meta.noMusic ? null : this.opts.music || 'game';
    if (music) this.app.audio.playMusic(music);
    else this.app.audio.stopMusic(0.6);
  }
  onKey(e) {
    if (!this.active || e.handled) return;
    const isPause = e.code === 'Escape' || e.code === 'KeyP';
    if (!isPause || e.repeat) return;
    // online no se puede pausar (el rival sigue jugando): ESC ofrece abandonar
    if (this.opts?.online) {
      if (e.code === 'Escape' && !this.app.ui.modals.length) {
        e.event.preventDefault();
        this.opts.onEscape?.();
      }
      return;
    }
    if (this.state === 'playing' || this.state === 'countdown') {
      e.event.preventDefault();
      this.pause();
    }
  }
  autoPause() {
    if (this.opts?.online) return;
    if (this.active && (this.state === 'playing' || this.state === 'countdown')) this.pause();
  }
  pause() {
    this.prevState = this.state;
    this.state = 'paused';
    this.app.input.reset();
    this.game.onPause();
    this.app.audio.play('pause');
    this.closePause = this.app.ui.modal(pauseModal, {
      meta: this.Game.meta,
      canRestart: this.opts.canRestart !== false,
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onQuit: () => this.requestQuit(true),
    });
  }
  resume() {
    if (this.state !== 'paused') return;
    this.closePause?.();
    this.closePause = null;
    this.app.input.reset();
    this.state = this.prevState;
    this.game.onResume();
    this.app.audio.play('resume');
  }
  restart() {
    this.closePause?.();
    this.closePause = null;
    this.createGame();
    this.state = 'restart';
    this.startCountdown();
  }
  async requestQuit(fromPause = false) {
    const ok = await this.app.ui.confirm({
      title: this.opts.quitTitle || '¿Salir del minijuego?',
      text: this.opts.quitText || 'Se perderá el progreso de esta partida.',
      yes: 'Salir', no: 'Seguir jugando',
    });
    if (ok) this.abort();
    else if (!fromPause && this.state === 'intro') this.app.ui.focusFirst?.();
  }
  abort() {
    this.closePause?.();
    this.closePause = null;
    const rej = this._reject;
    this._resolve = this._reject = null;
    this.close();
    rej?.(new CancelledError());
  }
  crash(err) {
    // Si un minijuego falla, nunca dejamos al jugador bloqueado: se vuelve al menú.
    if (!this.active) return;
    const rej = this._reject;
    this._resolve = this._reject = null;
    this.close();
    this.app.ui.toast({ title: 'Ups, algo falló', text: 'El minijuego se cerró por un error inesperado.', kind: 'warn' });
    rej?.(new CancelledError());
  }
  /** Libera el minijuego actual (después de mostrar resultados). */
  close() {
    if (this.game) {
      try { this.game.destroy(); } catch (e) { console.error(e); }
    }
    this.game = null;
    this.active = false;
    this.state = 'idle';
    this.app.input.captureMode = false;
    this.app.renderer.showGame(false);
  }

  frame(dt, draw = true) {
    const game = this.game;
    if (!game) return;
    const st = this.state;
    if (st === 'countdown') {
      this.cd += dt;
      const n = Math.floor(this.cd / 0.75);
      if (n !== this.lastCount) {
        this.lastCount = n;
        if (n < 3) this.app.audio.play('count');
        else if (n === 3) this.app.audio.play('go');
      }
      game.realTime += dt;
      game.ambient(dt);
      if (this.cd >= 2.25) {
        this.state = 'playing';
        this.goFlash = 0.7;
      }
    } else if (st === 'playing') {
      const sdt = dt * game.timeScale;
      game.realTime += dt;
      game.time += sdt;
      this.playSeconds += dt;
      if (game.event === 'invert') this.updateInvert(dt);
      if (this.caos) this.updateCaos(dt);
      if (this.goFlash > 0) this.goFlash -= dt;
      for (const b of this.bots) b.tick(sdt);
      this.seeded(() => game.update(sdt));
      if (this.ghostRec || this.ghostPlay) this.updateGhost();
      if (this.rule && !game.done) this.checkRule(game);
      if (game.done) {
        this.state = 'ending';
        this.endT = 0;
        game.inverted = false;
        game.mirrored = game.event === 'mirror';
        if (this.caos) this.caos.kind = null;
        this.app.audio.play('bell');
      }
    } else if (st === 'ending') {
      this.endT += dt;
      game.realTime += dt;
      game.ambient(dt);
      if (this.endT > 1.7) {
        this.state = 'done';
        const res = { ...game.result, gameId: this.gameId, event: game.event, playSeconds: this.playSeconds, players: this.opts.players };
        if (this.rule) res.rule = this.ruleOut || this.rule.end?.(game, res) || { win: false, text: '' };
        const resolve = this._resolve;
        this._resolve = this._reject = null;
        resolve?.(res);
      }
    } else if (st === 'intro' || st === 'done') {
      game.realTime += dt;
      game.ambient(dt);
    }
    if (st !== 'paused') game.fx.update(dt);
    if (draw && this.game) this.render();
  }

  /** Corre fn con el azar de la semilla fija (si hay). */
  seeded(fn) {
    if (!this.rng) return fn();
    const r = Math.random;
    Math.random = this.rng;
    try { return fn(); } finally { Math.random = r; }
  }
  updateGhost() {
    const game = this.game, t = game.time;
    if (this.ghostRec && t >= this.ghostNext) {
      this.ghostNext = t + this.ghostRec.dt;
      const p = game.ghostPose?.(0), sc = game.ghostScore?.(0);
      // cuadro compacto: [t, puntaje, x, y, extra] con 1 decimal
      const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
      this.ghostRec.f.push(p ? [r1(t), r1(sc), r1(p.x), r1(p.y), r1(p.a ?? p.face ?? 0)] : [r1(t), r1(sc)]);
      if (this.ghostRec.f.length > 6000) this.ghostRec = null; // más de 10 minutos: no se guarda
    }
    if (this.ghostPlay) {
      const F = this.ghostPlay.f;
      let i = this.ghostIdx || 0;
      while (i < F.length - 2 && F[i + 1][0] <= t) i++;
      this.ghostIdx = i;
      const a = F[i], b = F[Math.min(i + 1, F.length - 1)];
      const k = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0;
      const L = (j) => (a[j] == null ? null : b[j] == null ? a[j] : a[j] + (b[j] - a[j]) * k);
      game.ghost = a.length > 2 && t <= F[F.length - 1][0] + 0.5 ? { x: L(2), y: L(3), a: L(4), face: a[4] } : null;
      game.ghostScoreNow = L(1);
    }
  }
  /** Datos del fantasma grabado en esta partida (o null). */
  takeGhost() {
    const g = this.ghostRec;
    return g && g.f.length > 5 ? g : null;
  }

  updateInvert(dt) {
    const iv = this.invert;
    iv.t += dt;
    if (iv.phase === 'off' && this.game.time >= iv.next) {
      iv.phase = 'warn';
      iv.t = 0;
      this.app.audio.play('alarm');
    } else if (iv.phase === 'warn' && iv.t >= 1.3) {
      iv.phase = 'on';
      iv.t = 0;
      this.game.inverted = true;
      this.app.audio.play('zap');
    } else if (iv.phase === 'on' && iv.t >= 3.5) {
      iv.phase = 'off';
      iv.t = 0;
      this.game.inverted = false;
      iv.next = this.game.time + rand(7, 11);
      this.app.audio.play('resume');
    }
  }

  updateCaos(dt) {
    const c = this.caos;
    const game = this.game;
    c.t += dt;
    if (c.phase === 'off' && game.time >= c.next) {
      // cada minijuego declara qué modificadores tienen sentido (p. ej. Beat Battle no usa espejo ni invertidos)
      const allowed = this.Game.meta.caos || Object.keys(CAOS_MODS);
      if (!c.bag.length) c.bag = shuffleArr(allowed.slice());
      c.kind = c.bag.pop();
      if (c.kind === 'invert' && game.event === 'invert') c.kind = allowed.includes('turbo') ? 'turbo' : allowed[0];
      c.phase = 'warn';
      c.t = 0;
      this.app.audio.play('alarm');
    } else if (c.phase === 'warn' && c.t >= 1.4) {
      c.phase = 'on';
      c.t = 0;
      this.app.audio.play('zap');
      const m = CAOS_MODS[c.kind];
      if (m.scale) game.timeScale = this.baseTimeScale * m.scale;
      if (c.kind === 'invert') game.inverted = true;
      if (c.kind === 'mirror') game.mirrored = game.event !== 'mirror';
    } else if (c.phase === 'on') {
      if (c.kind === 'temblor') game.fx.shake?.(4);
      if (c.t >= CAOS_MODS[c.kind].dur) {
        c.phase = 'off';
        c.t = 0;
        game.timeScale = this.baseTimeScale;
        if (c.kind === 'invert') game.inverted = false;
        if (c.kind === 'mirror') game.mirrored = game.event === 'mirror';
        c.kind = null;
        c.next = game.time + rand(8, 12);
        this.app.audio.play('resume');
      }
    }
  }

  render() {
    // un error al DIBUJAR un cuadro no debe cerrar la partida (el estado del juego sigue intacto)
    try {
      this.renderFrame();
    } catch (e) {
      if (!this._renderErr) console.error('DUEL CLUB: error al dibujar (se sigue jugando)', e);
      this._renderErr = (this._renderErr || 0) + 1;
      if (this._renderErr < 4) this.app.logError?.(`dibujo: ${e?.message}`);
      // deshacer save()/clip() que quedaron abiertos por el error
      try {
        const g = this.app.renderer.g;
        if (g.reset) g.reset();
        else for (let i = 0; i < 32; i++) g.restore();
      } catch {}
    }
  }
  renderFrame() {
    const r = this.app.renderer;
    r.clearGame();
    const g = r.beginGame();
    const game = this.game;
    g.save();
    g.translate(game.fx.shakeX, game.fx.shakeY);
    if (game.mirrored) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    game.camera?.(g); // cámara del minijuego (acercar la acción); solo visual
    game.render(g);
    game.fx.render(g);
    g.restore();
    game.renderHUD(g);
    game.fx.renderFlash(g);
    this.renderOverlays(g);
    if (this.ghostPlay && this.game) this.renderGhostHud(g);
    if (this.rule?.hud && this.game) this.renderRuleHud(g);
  }

  renderControls(g) {
    const st = this.state;
    const play = st === 'playing' ? this.game.time : 99;
    let a = st === 'countdown' || st === 'paused' ? 1 : play < 3 ? 1 : play < 4 ? 4 - play : 0;
    if (a <= 0 || !this.Game?.meta?.controls) return;
    const inp = this.app.input;
    const meta = this.Game.meta;
    for (const p of [0, 1]) {
      if (this.bot && p === this.bot.slot) continue;
      if (this.opts.solo && p === 1) continue;
      const b = inp.bindings[p];
      const parts = meta.controls.map((c) => {
        const keys = c.actions.length === 4 && c.actions.includes('up') ? (p ? '← ↑ ↓ →' : c.actions.map((x) => keyNameShort(b[x][0])).join(' '))
          : c.actions.map((x) => keyNameShort(b[x][0])).join('/');
        return `${keys} ${c.label.toLowerCase()}`;
      });
      const txt = `J${p + 1}: ${parts.join(' · ')}`;
      const w = Math.min(600, 24 + txt.length * 7.4);
      const x = p ? W - 16 - w : 16;
      g.save();
      g.globalAlpha = a;
      comicPanel(g, x, H - 44, w, 30, '#FFF4E0', { skew: p ? -8 : 8, dots: false, line: 3 });
      g.fillStyle = this.opts.players?.[p]?.color || '#9B6CFF';
      g.fillRect(p ? x + w - 18 : x + 10, H - 40, 8, 22);
      text(g, txt, x + w / 2, H - 29, { size: 12.5, body: true, weight: 800, color: '#15121F' });
      g.restore();
    }
  }

  /** Regla especial: puede ganar o perder la partida antes de tiempo (p. ej. «te quedaste sin tiros»). */
  checkRule(game) {
    const r = this.rule.tick?.(game);
    if (!r) return;
    this.ruleOut = r;
    const sc = game.ghostScore?.(0) ?? 0;
    game.finish({ winner: r.win ? 0 : 1, scores: [sc, 0], display: [String(sc), ''], banner: r.win ? '¡LOGRADO!' : '¡UFA!', summary: r.text });
  }
  renderRuleHud(g) {
    const txt = this.rule.hud?.(this.game);
    if (!txt || this.state === 'intro') return;
    g.save();
    // mientras se ven los controles (primeros segundos) va un poco más arriba para no taparlos
    const early = this.state === 'countdown' || (this.state === 'playing' && this.game.time < 4);
    g.translate(W / 2, early ? H - 96 : H - 46);
    g.rotate(-0.015);
    const w = Math.max(260, 30 + txt.length * 11);
    g.fillStyle = '#0D0B14'; g.fillRect(-w / 2 + 5, -21, w, 46);
    g.fillStyle = '#FFE45C'; g.fillRect(-w / 2, -25, w, 46);
    g.strokeStyle = '#0D0B14'; g.lineWidth = 3; g.strokeRect(-w / 2, -25, w, 46);
    text(g, txt, 0, -2, { size: 20, color: '#15121F', comic: false });
    g.restore();
  }

  renderGhostHud(g) {
    const game = this.game, gs = game.ghostScoreNow, me = game.ghostScore?.(0);
    if (gs == null || me == null) return;
    const lower = this.opts.ghostLower;
    const diff = Math.round((me - gs) * 10) / 10;
    const ahead = lower ? diff < 0 : diff > 0;
    g.save();
    g.translate(W / 2, H - 46);
    g.rotate(-0.02);
    g.fillStyle = '#0D0B14'; g.fillRect(-176, -22, 360, 50);
    g.fillStyle = ahead ? '#2c5e47' : '#8a2a3a'; g.fillRect(-180, -26, 360, 50);
    text(g, `FANTASMA ${fmtGhost(gs)}`, -90, -1, { size: 22, color: '#E9E4FF' });
    text(g, `${diff > 0 ? '+' : ''}${fmtGhost(diff)}`, 100, -1, { size: 26, color: ahead ? '#C6F04A' : '#FFB3B3' });
    g.restore();
  }
  renderOverlays(g) {
    const game = this.game;
    const t = game.realTime;
    if (game.event && EVENTS[game.event] && this.state !== 'intro') {
      const ev = EVENTS[game.event];
      panel(g, 14, H - 44, 250, 32, { r: 16, fill: 'rgba(11,16,32,0.8)', stroke: ev.color });
      text(g, 'EVENTO · ' + ev.short.toUpperCase(), 139, H - 28, { size: 13, color: ev.color, body: true, weight: 800 });
    }
    if (this.state === 'countdown') {
      const n = Math.floor(this.cd / 0.75);
      const k = (this.cd % 0.75) / 0.75;
      g.fillStyle = `rgba(11,16,32,${0.45 * (1 - this.cd / 2.6)})`;
      g.fillRect(0, 0, W, H);
      const label = n < 3 ? String(3 - n) : '¡YA!';
      const sc = 1 + (1 - ease.outBack(Math.min(1, k * 2.2))) * 0.8;
      const cols = ['#FF654F', '#FFC93C', '#48D597'];
      const al = 1 - Math.max(0, k - 0.75) * 3;
      burst(g, W / 2, H / 2, 150 * sc, cols[Math.min(2, n)], { alpha: al, points: 16, rot: n * 0.4, sx: 1.25, line: 7 });
      text(g, label, W / 2, H / 2, { size: 150 * sc, color: '#fff', strokeWidth: 16, alpha: al });
    }
    if (this.state === 'playing' && this.goFlash > 0) {
      const a = clamp(this.goFlash / 0.7, 0, 1);
      burst(g, W / 2, H / 2, 150 + (1 - a) * 80, '#48D597', { alpha: a, points: 16, sx: 1.3, line: 7 });
      text(g, '¡YA!', W / 2, H / 2, { size: 150 + (1 - a) * 80, color: '#fff', alpha: a, strokeWidth: 16 });
    }
    if (game.event === 'invert' && (this.state === 'playing' || this.state === 'paused')) {
      const iv = this.invert;
      if (iv.phase === 'warn') {
        const a = 0.6 + Math.sin(t * 20) * 0.4;
        panel(g, W / 2 - 260, H - 110, 520, 56, { r: 28, fill: rgba('#FF5FA2', 0.25), stroke: '#FF5FA2' });
        text(g, '¡ATENCIÓN! CONTROLES INVERTIDOS', W / 2, H - 82, { size: 24, color: '#fff', alpha: a });
      } else if (iv.phase === 'on') {
        g.strokeStyle = rgba('#FF5FA2', 0.5 + Math.sin(t * 12) * 0.3);
        g.lineWidth = 10;
        g.strokeRect(5, 5, W - 10, H - 10);
        panel(g, W / 2 - 200, H - 100, 400, 44, { r: 22, fill: rgba('#FF5FA2', 0.3), stroke: '#FF5FA2' });
        text(g, `INVERTIDOS · ${(3.5 - iv.t).toFixed(1)} s`, W / 2, H - 78, { size: 20, color: '#fff' });
      }
    }
    if (this.caos && (this.state === 'playing' || this.state === 'paused')) {
      const c = this.caos;
      const m = c.kind && CAOS_MODS[c.kind];
      if (c.phase === 'on' && c.kind === 'niebla') {
        const grd = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 720);
        grd.addColorStop(0, 'rgba(11,16,32,0)');
        grd.addColorStop(1, 'rgba(11,16,32,0.82)');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
      }
      if (c.phase === 'warn' && m) {
        const a = 0.65 + Math.sin(t * 18) * 0.35;
        panel(g, W / 2 - 280, H - 116, 560, 62, { r: 30, fill: 'rgba(255,59,92,0.25)', stroke: '#FF3B5C' });
        text(g, `CAOS · ${m.name}`, W / 2, H - 92, { size: 24, color: '#fff', alpha: a });
        text(g, m.desc, W / 2, H - 68, { size: 13, color: '#FFD0D8', body: true, weight: 700 });
      } else if (c.phase === 'on' && m) {
        panel(g, W / 2 - 170, H - 52, 340, 36, { r: 18, fill: 'rgba(255,59,92,0.28)', stroke: '#FF3B5C' });
        text(g, `CAOS · ${m.name} · ${Math.max(0, m.dur - c.t).toFixed(1)} s`, W / 2, H - 34, { size: 15, color: '#fff' });
      }
    }
    if (this.state === 'ending') {
      const k = Math.min(1, this.endT / 0.35);
      g.fillStyle = `rgba(11,16,32,${0.35 * k})`;
      g.fillRect(0, 0, W, H);
      const banner = game.result?.banner || '¡FIN!';
      text(g, banner, W / 2, H / 2, { size: 120 * (0.6 + ease.outBack(k) * 0.4), color: '#fff', glow: PALETTE.violet, stroke: 'rgba(11,16,32,0.9)', strokeWidth: 12 });
    }
    if (this.state === 'paused') {
      g.fillStyle = 'rgba(11,16,32,0.55)';
      g.fillRect(0, 0, W, H);
    }
    // controles de cada jugador: durante la cuenta regresiva y los primeros segundos (y en pausa)
    if (!this.opts?.online) this.renderControls(g);
    // textura de impresión de historieta (tramado de puntos) y marco de viñeta alrededor de la pantalla de juego
    g.save();
    if (quality.level !== 'low') {
      cachedLayer(g, 'printdots', (cg) => {
        const c = document.createElement('canvas');
        c.width = c.height = 9;
        const d = c.getContext('2d');
        d.fillStyle = 'rgba(10,8,20,0.16)';
        d.beginPath(); d.arc(2.2, 2.2, 1.4, 0, Math.PI * 2); d.arc(6.7, 6.7, 1.4, 0, Math.PI * 2); d.fill();
        cg.fillStyle = cg.createPattern(c, 'repeat');
        cg.fillRect(0, 0, W, H);
      });
    }
    g.strokeStyle = '#0D0B14';
    g.lineWidth = 12;
    g.strokeRect(0, 0, W, H);
    g.strokeStyle = '#FFF4E0';
    g.lineWidth = 2;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.restore();
    // partidas online: quién sos, conexión y avisos de espera
    this.opts?.netOverlay?.(g, this);
  }
}

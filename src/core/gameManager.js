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
import { W, H, text, rgba, quality, clamp, rand, ease, PALETTE, panel } from './utils.js';
import { UI } from '../ui/ui.js';
import { introScreen } from '../ui/intro.js';
import { pauseModal } from '../ui/pause.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';

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
    this.audio.setVolumes({ master: this.settings.master, music: this.settings.music, sfx: this.settings.sfx });
    this.stats = new StatsManager(this);
    this.achievements = new AchievementManager(this);
    this.accounts = new AccountService(this);
    this.ui = new UI(this);
    this.runner = new MinigameRunner(this);
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
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    this.renderer.resize();
    this.persist();
  }
  start() {
    document.body.classList.toggle('no-anim', !this.settings.animations);
    if (!this.storage.available) {
      setTimeout(() => this.ui.toast({ title: 'Modo sin guardado', text: 'El navegador no permite LocalStorage: las estadísticas no se conservarán.', kind: 'warn' }), 1500);
    }
    this.ui.goTitle();
    // revisar logros cuyas condiciones ya se cumplen (p. ej. datos de una versión anterior)
    this.accounts.init().catch((e) => console.warn('cuentas', e));
    setTimeout(() => this.achievements.evaluate({ type: 'check' }), 1500);
    requestAnimationFrame(this._loop);
  }
  loop(now) {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 0.05); // evita saltos tras pestaña inactiva
    try {
      this.renderer.renderBackground(dt, this.runner.active ? 'game' : 'menu');
      // en modo de prueba se puede acelerar con subpasos (misma física, más rápido)
      const steps = this.testMode ? Math.max(1, Math.round(this.debugScale)) : 1;
      for (let i = 0; i < steps && this.runner.active; i++) this.runner.frame(dt, i === steps - 1);
      this.ui.frame(dt);
      this.renderer.renderOverlay(dt);
    } catch (e) {
      console.error('DUEL CLUB loop error', e);
      this.runner.crash(e);
    }
    this.input.endFrame();
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
      this.showIntro();
    });
  }
  createGame() {
    if (this.game) {
      try { this.game.destroy(); } catch (e) { console.error(e); }
    }
    this.game = new this.Game(this.app, this.opts);
    this.game.init();
    this.t = 0;
    this.endT = 0;
    this.invert = { next: rand(6, 9), phase: 'off', t: 0 };
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
    if (this.state === 'playing' || this.state === 'countdown') {
      e.event.preventDefault();
      this.pause();
    }
  }
  autoPause() {
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
      if (this.goFlash > 0) this.goFlash -= dt;
      game.update(sdt);
      if (game.done) {
        this.state = 'ending';
        this.endT = 0;
        game.inverted = false;
        this.app.audio.play('bell');
      }
    } else if (st === 'ending') {
      this.endT += dt;
      game.realTime += dt;
      game.ambient(dt);
      if (this.endT > 1.7) {
        this.state = 'done';
        const res = { ...game.result, gameId: this.gameId, event: game.event, playSeconds: this.playSeconds, players: this.opts.players };
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

  render() {
    const r = this.app.renderer;
    r.clearGame();
    const g = r.beginGame();
    const game = this.game;
    g.save();
    g.translate(game.fx.shakeX, game.fx.shakeY);
    if (game.event === 'mirror') {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    game.render(g);
    game.fx.render(g);
    g.restore();
    game.renderHUD(g);
    game.fx.renderFlash(g);
    this.renderOverlays(g);
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
      text(g, label, W / 2, H / 2, { size: 150 * sc, color: '#fff', glow: cols[Math.min(2, n)], stroke: 'rgba(11,16,32,0.9)', strokeWidth: 14, alpha: 1 - Math.max(0, k - 0.75) * 3 });
    }
    if (this.state === 'playing' && this.goFlash > 0) {
      const a = clamp(this.goFlash / 0.7, 0, 1);
      text(g, '¡YA!', W / 2, H / 2, { size: 150 + (1 - a) * 80, color: '#fff', glow: '#48D597', alpha: a, stroke: 'rgba(11,16,32,0.9)', strokeWidth: 14 });
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
  }
}

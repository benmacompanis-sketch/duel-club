// InputManager: registra todas las teclas pulsadas a la vez (Set de códigos físicos),
// de modo que el movimiento de un jugador nunca bloquea al otro. Distingue
// "mantener" (held) de "pulsar" (pressed, flanco de bajada por frame) y guarda la marca
// de tiempo exacta de cada pulsación para minijuegos de reflejos y ritmo.

export const ACTIONS = ['up', 'down', 'left', 'right', 'a', 'b'];
export const ACTION_LABELS = {
  up: 'Arriba', down: 'Abajo', left: 'Izquierda', right: 'Derecha', a: 'Acción 1', b: 'Acción 2',
};

export const DEFAULT_BINDINGS = {
  0: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['KeyF'], b: ['KeyG'] },
  1: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    a: ['Enter', 'NumpadEnter'], b: ['ShiftRight'],
  },
  // 2v2 en un teclado: J3 e J4 (solo se activan durante las partidas por equipos)
  2: { up: ['KeyI'], down: ['KeyK'], left: ['KeyJ'], right: ['KeyL'], a: ['KeyU'], b: ['KeyO'] },
  3: { up: ['Numpad8'], down: ['Numpad5'], left: ['Numpad4'], right: ['Numpad6'], a: ['Numpad0'], b: ['NumpadDecimal'] },
};
// botones estándar de un joystick (Gamepad API, mapeo "standard")
const PAD_BUTTONS = { a: [0], b: [1, 2], up: [12], down: [13], left: [14], right: [15] };

const KEY_NAMES = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'ENTER', NumpadEnter: 'ENTER',
  ShiftRight: 'SHIFT DER.', ShiftLeft: 'SHIFT IZQ.', ControlLeft: 'CTRL IZQ.', ControlRight: 'CTRL DER.',
  AltLeft: 'ALT', AltRight: 'ALT GR', Space: 'ESPACIO', Backspace: 'BORRAR', Tab: 'TAB', CapsLock: 'BLOQ MAYÚS',
  Slash: '-', Period: '.', Comma: ',', Semicolon: 'Ñ', Quote: '´', BracketLeft: '`', BracketRight: '+',
  Backslash: 'Ç', Minus: "'", Equal: '¡', IntlBackslash: '<', Backquote: 'º',
};
export function keyName(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  return code.toUpperCase();
}

// Teclas que nunca deben provocar desplazamiento o acciones del navegador mientras se juega.
const ALWAYS_BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace', 'PageUp', 'PageDown', 'Home', 'End']);
const RESERVED = new Set(['Escape', 'KeyP', 'F11', 'F5', 'F12', 'MetaLeft', 'MetaRight']);

export class InputManager {
  constructor() {
    this.down = new Set();
    this.pressedFrame = new Set();
    this.pressTimes = new Map();
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.listeners = new Set();
    this.captureMode = false; // true durante el juego: bloquea por completo las teclas asignadas
    this.codeIndex = new Map();
    this.teamMode = false; // J3 y J4 activos (partidas 2v2)
    this.pads = {}; // jugador → índice de joystick
    this.padPrev = new Map();
    this.rebuildIndex();
    this._kd = (e) => this.onKeyDown(e);
    this._ku = (e) => this.onKeyUp(e);
    this._blur = () => this.reset();
    this.attached = false;
  }

  attach() {
    if (this.attached) return; // evita listeners duplicados
    window.addEventListener('keydown', this._kd, { capture: true });
    window.addEventListener('keyup', this._ku, { capture: true });
    window.addEventListener('blur', this._blur);
    this.attached = true;
  }
  detach() {
    window.removeEventListener('keydown', this._kd, { capture: true });
    window.removeEventListener('keyup', this._ku, { capture: true });
    window.removeEventListener('blur', this._blur);
    this.attached = false;
  }

  setBindings(b) {
    if (!b) return;
    for (const p of [0, 1]) {
      for (const a of ACTIONS) {
        const codes = b?.[p]?.[a];
        if (Array.isArray(codes) && codes.length && codes.every((c) => typeof c === 'string')) {
          this.bindings[p][a] = codes.slice(0, 2);
        }
      }
    }
    this.rebuildIndex();
  }
  resetBindings() {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.rebuildIndex();
  }
  rebuildIndex() {
    this.codeIndex.clear();
    for (const p of this.teamMode ? [0, 1, 2, 3] : [0, 1]) for (const a of ACTIONS) for (const c of this.allCodes(p, a)) this.codeIndex.set(c, { p, a });
  }
  /** Teclas + botones del joystick asignado a ese jugador. */
  allCodes(p, a) {
    const list = this.bindings[p]?.[a] || [];
    const pad = this.pads[p];
    return pad == null ? list : [...list, `Pad${pad}:${a}`];
  }
  setTeamMode(on) {
    this.teamMode = !!on;
    this.rebuildIndex();
  }
  /** Asigna (o quita con null) un joystick a un jugador. */
  assignPad(p, index) {
    for (const k of Object.keys(this.pads)) if (this.pads[k] === index) delete this.pads[k];
    if (index == null) delete this.pads[p];
    else this.pads[p] = index;
    this.rebuildIndex();
  }
  /** Lee los joysticks (una vez por cuadro) y los convierte en "teclas" virtuales Pad{n}:{acción}. */
  pollPads() {
    const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of list) {
      if (!gp) continue;
      const ax = gp.axes || [];
      for (const a of ACTIONS) {
        let on = (PAD_BUTTONS[a] || []).some((i) => gp.buttons[i]?.pressed);
        if (a === 'left') on ||= ax[0] < -0.5; else if (a === 'right') on ||= ax[0] > 0.5;
        else if (a === 'up') on ||= ax[1] < -0.5; else if (a === 'down') on ||= ax[1] > 0.5;
        const code = `Pad${gp.index}:${a}`;
        const was = this.padPrev.get(code) || false;
        if (on && !was) {
          this.pressedFrame.add(code);
          this.pressTimes.set(code, performance.now());
          this.down.add(code);
          const bound = this.codeIndex.get(code);
          const evt = { code, repeat: false, player: bound ? bound.p : -1, action: bound ? bound.a : a, pad: gp.index, typing: false };
          for (const fn of [...this.listeners]) { try { fn(evt); } catch (err) { console.error(err); } }
        } else if (!on && was) this.down.delete(code);
        this.padPrev.set(code, on);
      }
    }
  }
  /** Asigna una tecla. Si estaba en uso, intercambia para que nunca haya conflictos. */
  rebind(p, action, code) {
    if (RESERVED.has(code)) return false;
    const prev = this.codeIndex.get(code);
    const old = this.bindings[p][action][0];
    if (prev && !(prev.p === p && prev.a === action)) {
      const list = this.bindings[prev.p][prev.a];
      const i = list.indexOf(code);
      list[i] = old;
      if (!old) list.splice(i, 1);
    }
    this.bindings[p][action] = [code];
    this.rebuildIndex();
    return true;
  }
  label(p, action) {
    return keyName(this.bindings[p][action][0]);
  }
  isReserved(code) {
    return RESERVED.has(code);
  }

  onKeyDown(e) {
    const tgt = e.target;
    const typing = !!tgt && ((tgt.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(tgt.type)) || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);
    if (typing && e.code !== 'Escape' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    const code = e.code || e.key;
    const bound = this.codeIndex.get(code);
    if (this.captureMode && (bound || ALWAYS_BLOCK.has(code))) e.preventDefault();
    else if (!typing && ALWAYS_BLOCK.has(code)) e.preventDefault();
    if (!e.repeat) {
      this.pressedFrame.add(code);
      const ts = e.timeStamp > 0 && Math.abs(e.timeStamp - performance.now()) < 1000 ? e.timeStamp : performance.now();
      this.pressTimes.set(code, ts);
    }
    this.down.add(code);
    const evt = { code, repeat: e.repeat, player: bound ? bound.p : -1, action: bound ? bound.a : null, event: e, typing };
    for (const fn of [...this.listeners]) {
      try {
        fn(evt);
      } catch (err) {
        console.error(err);
      }
    }
  }
  onKeyUp(e) {
    const code = e.code || e.key;
    this.down.delete(code);
    if (this.captureMode && this.codeIndex.has(code)) e.preventDefault();
  }
  reset() {
    this.down.clear();
    this.pressedFrame.clear();
  }
  /** Se suscribe a pulsaciones; devuelve la función para desuscribirse. */
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  held(p, action) {
    const codes = this.allCodes(p, action);
    for (let i = 0; i < codes.length; i++) if (this.down.has(codes[i])) return true;
    return false;
  }
  pressed(p, action) {
    const codes = this.allCodes(p, action);
    for (let i = 0; i < codes.length; i++) if (this.pressedFrame.has(codes[i])) return true;
    return false;
  }
  pressTime(p, action) {
    let best = null;
    for (const c of this.allCodes(p, action)) {
      if (this.pressedFrame.has(c)) {
        const t = this.pressTimes.get(c);
        if (best == null || t < best) best = t;
      }
    }
    return best;
  }
  anyPressed(p) {
    for (const a of ACTIONS) if (this.pressed(p, a)) return true;
    return false;
  }
  endFrame() {
    this.pressedFrame.clear();
  }
}

/**
 * Vista del input para un jugador dentro de un minijuego. Aplica el evento
 * "controles invertidos" de forma idéntica a ambos jugadores.
 */
export class PlayerInput {
  constructor(input, p, game) {
    this.input = input;
    this.p = p;
    this.game = game;
  }
  map(a) {
    // MODO ESPEJO: la pantalla se da vuelta, así que izquierda/derecha se cruzan para que la tecla siga
    // moviendo hacia el lado que se ve en pantalla (antes parecía que el movimiento estaba invertido)
    if (this.game.mirrored) a = a === 'left' ? 'right' : a === 'right' ? 'left' : a;
    if (!this.game.inverted) return a;
    return a === 'left' ? 'right' : a === 'right' ? 'left' : a === 'up' ? 'down' : a === 'down' ? 'up' : a;
  }
  held(a) {
    return this.input.held(this.p, this.map(a));
  }
  pressed(a) {
    return this.input.pressed(this.p, this.map(a));
  }
  pressTime(a) {
    return this.input.pressTime(this.p, this.map(a));
  }
  axisX() {
    return (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
  }
  axisY() {
    return (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
  }
}

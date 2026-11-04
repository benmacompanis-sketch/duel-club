// Configuración de DUEL MODE, TOURNAMENT y SURVIVAL.
import { h, icon } from './dom.js';
import { header, segGroup, toggleRow, gameIcon } from './widgets.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { DIFFS, runDuel, runTournament, runSurvival } from '../core/tournamentManager.js';
import { playerSelectScreen } from './playerSelect.js';
import { shuffle } from '../core/utils.js';

const DIFF_CHOICES = [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']];

function proceed(ui, title, run, backTo) {
  ui.show(playerSelectScreen, {
    title,
    subtitle: 'Iniciá sesión para sumar al ranking mundial o jugá como invitado. Ambos deben estar LISTOS.',
    requireReady: true,
    onDone: run,
    onBack: () => ui.show(backTo),
  });
}

// ------------------------------------------------------------------ DUEL
export function duelSetupScreen(ui) {
  const app = ui.app;
  const scr = {};
  const cfg = Object.assign({ count: 5, selection: 'random', repeat: false, events: true, difficulty: 'normal', manual: [] }, app.save.lastDuel || {});
  cfg.manual = (cfg.manual || []).filter((id) => GAME_BY_ID[id]);
  const save = () => { app.save.lastDuel = { ...cfg }; app.persist(); };

  const queue = h('div.queue');
  const counter = h('span.chip');
  const picks = h('div.picklist');
  const startBtn = h('button.btn.green.big.wide', { nav: true, onclick: () => start() }, icon('play'), 'CONTINUAR');
  const manualBox = h('div.card', h('div.row', h('h3', 'Selección manual'), h('div.spacer'), counter),
    h('p.muted', { style: { margin: '0 0 10px', fontSize: '13px' } }, 'Elegí los minijuegos en orden. Hacé clic en un chip de la cola para quitarlo.'),
    picks, h('div', { style: { height: '10px' } }), queue,
    h('div.row', { style: { marginTop: '10px' } },
      h('button.btn.small', { nav: true, onclick: () => { fillRandom(); } }, icon('shuffle'), 'Completar al azar'),
      h('button.btn.small.ghost', { nav: true, onclick: () => { cfg.manual = []; refresh(); } }, 'Vaciar')));

  GAMES.forEach((G) => {
    const m = G.meta;
    const b = h('button.pick', { nav: true, dataset: { id: m.id }, title: m.name, onclick: () => togglePick(m.id) },
      gameIcon(ui, scr, m, 50), h('span', m.short || m.name));
    picks.append(b);
  });
  function togglePick(id) {
    const has = cfg.manual.includes(id);
    if (!cfg.repeat && has) cfg.manual = cfg.manual.filter((x) => x !== id);
    else if (cfg.manual.length < cfg.count) cfg.manual.push(id);
    else { app.audio.play('error'); return; }
    app.audio.play('click');
    refresh();
  }
  function fillRandom() {
    const ids = GAMES.map((G) => G.meta.id);
    let bag = shuffle(ids.filter((id) => cfg.repeat || !cfg.manual.includes(id)));
    while (cfg.manual.length < cfg.count) {
      if (!bag.length) {
        if (!cfg.repeat) break;
        bag = shuffle(ids);
      }
      cfg.manual.push(bag.pop());
    }
    app.audio.play('powerup');
    refresh();
  }
  const summary = h('div.summary-list');
  function refresh() {
    if (!cfg.repeat) cfg.manual = [...new Set(cfg.manual)];
    if (cfg.manual.length > cfg.count) cfg.manual.length = cfg.count;
    manualBox.classList.toggle('hidden', cfg.selection !== 'manual');
    picks.querySelectorAll('.pick').forEach((b) => {
      const n = cfg.manual.filter((x) => x === b.dataset.id).length;
      b.classList.toggle('on', n > 0);
      b.querySelector('.num')?.remove();
      if (n) b.append(h('span.num', cfg.manual.map((x, i) => (x === b.dataset.id ? i + 1 : null)).filter(Boolean).join(',')));
    });
    queue.replaceChildren(...cfg.manual.map((id, i) => h('button.chip', { nav: true, onclick: () => { cfg.manual.splice(i, 1); refresh(); } }, `${i + 1}. ${GAME_BY_ID[id].meta.name}`)));
    counter.textContent = `${cfg.manual.length} / ${cfg.count}`;
    const ready = cfg.selection !== 'manual' || cfg.manual.length === cfg.count;
    startBtn.disabled = !ready;
    const [p1, p2] = app.profiles;
    summary.replaceChildren(
      h('div', h('span', 'Jugadores'), h('b', `${p1.name} vs ${p2.name}`)),
      h('div', h('span', 'Minijuegos'), h('b', String(cfg.count))),
      h('div', h('span', 'Selección'), h('b', cfg.selection === 'manual' ? 'Manual' : 'Aleatoria')),
      h('div', h('span', 'Repeticiones'), h('b', cfg.repeat ? 'Permitidas' : 'No')),
      h('div', h('span', 'Eventos especiales'), h('b', cfg.events ? 'Activados' : 'Desactivados')),
      h('div', h('span', 'Dificultad'), h('b', DIFFS[cfg.difficulty].label)),
      h('div', h('span', 'Puntos'), h('b', 'Victoria 3 · Empate 1')));
    save();
  }
  function start() {
    if (startBtn.disabled) return;
    app.audio.play('confirm');
    const c = { ...cfg, manual: cfg.manual.slice() };
    proceed(ui, '¿QUIÉNES SE ENFRENTAN?', () => runDuel(app, c), duelSetupScreen);
  }

  scr.el = h('div.page',
    header(ui, 'DUEL MODE', 'Configurá la competición. Gana quien sume más puntos al final.', () => ui.goMenu()),
    h('div.setup-grid',
      h('div.setup-opts', h('div.card',
        segGroup('Minijuegos', 'Cantidad de desafíos', [[3, '3'], [5, '5'], [7, '7'], [10, '10'], [12, '12']], () => cfg.count, (v) => { cfg.count = v; if (!cfg.repeat && v > GAMES.length) cfg.repeat = true; refresh(); }, ui),
        segGroup('Selección', 'Cómo se eligen', [['random', 'Aleatoria', 'shuffle'], ['manual', 'Manual', 'list']], () => cfg.selection, (v) => { cfg.selection = v; refresh(); }, ui),
        toggleRow('Repetir minijuegos', 'Un mismo juego puede salir más de una vez', () => cfg.repeat, (v) => { cfg.repeat = v; refresh(); }, ui),
        toggleRow('Eventos especiales', 'Modificadores sorpresa justos para ambos', () => cfg.events, (v) => { cfg.events = v; refresh(); }, ui),
        segGroup('Dificultad', 'Velocidad y exigencia de los juegos', DIFF_CHOICES, () => cfg.difficulty, (v) => { cfg.difficulty = v; refresh(); }, ui)),
        h('div', { style: { height: '14px' } }), manualBox),
      h('div.setup-side',
        h('div.card', h('h3', 'Resumen'), summary),
        h('div.card', h('p.muted', { style: { margin: 0, fontSize: '13.5px', lineHeight: 1.5 } },
          'Perder un minijuego no es perder la competición: cada desafío reparte puntos. Si al final hay empate, se juega una ',
          h('b', { style: { color: '#FFC93C' } }, 'MUERTE SÚBITA'), '.')),
        h('div.spacer'), startBtn)));
  refresh();
  scr.onBack = () => ui.goMenu();
  return scr;
}

// ------------------------------------------------------------------ TOURNAMENT
export function tournamentSetupScreen(ui) {
  const app = ui.app;
  const scr = {};
  const cfg = Object.assign({ rounds: 4, difficulty: 'normal', events: true }, app.save.lastTournament || {});
  const info = h('div.summary-list');
  const refresh = () => {
    app.save.lastTournament = { ...cfg };
    app.persist();
    info.replaceChildren(
      h('div', h('span', 'Rondas'), h('b', `${cfg.rounds} (2 minijuegos c/u)`)),
      h('div', h('span', 'Total de minijuegos'), h('b', String(cfg.rounds * 2))),
      h('div', h('span', 'Victoria / Empate'), h('b', '3 / 1 pts')),
      h('div', h('span', 'Ganador de cada ronda'), h('b', '+1 pt bonus')),
      h('div', h('span', 'Gran final'), h('b', 'Puntos x2')),
      h('div', h('span', 'Dificultad'), h('b', DIFFS[cfg.difficulty].label)));
  };
  scr.el = h('div.page',
    header(ui, 'TOURNAMENT', 'Una copa por rondas con clasificación, bonus y una gran final que vale doble.', () => ui.goMenu()),
    h('div.setup-grid',
      h('div.setup-opts', h('div.card',
        segGroup('Rondas', 'Cada ronda tiene 2 minijuegos', [[3, '3'], [4, '4'], [5, '5'], [6, '6']], () => cfg.rounds, (v) => { cfg.rounds = v; refresh(); }, ui),
        toggleRow('Eventos especiales', 'Modificadores sorpresa', () => cfg.events, (v) => { cfg.events = v; refresh(); }, ui),
        segGroup('Dificultad', '', DIFF_CHOICES, () => cfg.difficulty, (v) => { cfg.difficulty = v; refresh(); }, ui)),
        h('div', { style: { height: '14px' } }),
        h('div.card', h('h3', 'Cómo funciona'),
          h('p.muted', { style: { margin: 0, lineHeight: 1.55, fontSize: '14px' } },
            'Los minijuegos de cada ronda se sortean sin repetirse. Al terminar una ronda, quien haya sumado más puntos en ella recibe 1 punto extra. ',
            'La última ronda es la GRAN FINAL: cada victoria vale 6 puntos. Nada está decidido hasta el final.'))),
      h('div.setup-side', h('div.card', h('h3', 'Reglamento'), info), h('div.spacer'),
        h('button.btn.green.big.wide', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); const c = { ...cfg }; proceed(ui, 'INSCRIPCIÓN AL TORNEO', () => runTournament(app, c), tournamentSetupScreen); } }, icon('play'), 'CONTINUAR'))));
  refresh();
  scr.onBack = () => ui.goMenu();
  return scr;
}

// ------------------------------------------------------------------ SURVIVAL
export function survivalSetupScreen(ui) {
  const app = ui.app;
  const scr = {};
  const cfg = Object.assign({ lives: 3, difficulty: 'easy', events: true }, app.save.lastSurvival || {});
  const best = app.save.stats.survivalBest;
  const refresh = () => { app.save.lastSurvival = { ...cfg }; app.persist(); };
  scr.el = h('div.page',
    header(ui, 'SURVIVAL', 'Desafíos consecutivos. Cada derrota cuesta una vida. La dificultad no deja de subir.', () => ui.goMenu()),
    h('div.setup-grid',
      h('div.setup-opts', h('div.card',
        segGroup('Vidas', 'Para cada jugador', [[1, '1'], [3, '3'], [5, '5']], () => cfg.lives, (v) => { cfg.lives = v; refresh(); }, ui),
        segGroup('Dificultad inicial', 'Sube +10% por etapa', DIFF_CHOICES, () => cfg.difficulty, (v) => { cfg.difficulty = v; refresh(); }, ui),
        toggleRow('Eventos especiales', 'Cada vez más frecuentes', () => cfg.events, (v) => { cfg.events = v; refresh(); }, ui)),
        h('div', { style: { height: '14px' } }),
        h('div.card', h('h3', 'Reglas'),
          h('p.muted', { style: { margin: 0, lineHeight: 1.55, fontSize: '14px' } },
            'Se juegan minijuegos al azar sin pausa. Quien pierde un desafío pierde una vida; los empates no quitan vidas. ',
            'Cada etapa es más rápida y exigente, y los eventos aparecen más seguido. Se registra la mejor etapa alcanzada y la mejor racha.'))),
      h('div.setup-side',
        h('div.card', h('h3', 'Récord actual'), h('div.summary-list',
          h('div', h('span', 'Mejor etapa'), h('b', best.stage ? `Etapa ${best.stage}` : '—')),
          h('div', h('span', 'Ganador'), h('b', best.name || '—')),
          h('div', h('span', 'Mejor racha'), h('b', best.streak ? `${best.streak} seguidas` : '—')))),
        h('div.spacer'),
        h('button.btn.green.big.wide', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); const c = { ...cfg }; proceed(ui, 'SURVIVAL', () => runSurvival(app, c), survivalSetupScreen); } }, icon('play'), 'CONTINUAR'))));
  scr.onBack = () => ui.goMenu();
  return scr;
}

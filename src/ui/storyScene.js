// Escena de HISTORIA: viñetas de diálogo estilo historieta antes de cada etapa (y al empezar/terminar el capítulo).
// done('go') para jugar/seguir, done('back') para volver.
import { h, icon } from './dom.js';
import { gameIcon } from './widgets.js';
import { avatar } from './kit.js';
import { CHAR_BY_ID } from '../core/characters.js';
import { GAME_BY_ID } from '../games/index.js';
import { EVENTS } from '../core/events.js';
import { STORY } from '../data/story.js';

export function storyScene(ui, { ch, lines, kind, stage = 0, reward = null, done }) {
  const app = ui.app;
  const scr = {};
  const num = STORY.indexOf(ch) + 1;
  const st = kind === 'stage' ? ch.stages[stage] : null;
  let shown = 0;
  const list = h('div.ss-lines');
  const btn = h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => next() });
  const bubble = ([who, txt], i) => {
    const c = CHAR_BY_ID[who] || CHAR_BY_ID.volt;
    const right = who !== ch.hero;
    return h('div.ss-line' + (right ? '.r' : ''), { style: { '--c': c.accent, animationDelay: '0s' } },
      avatar(ui, scr, { char: c.id, color: c.accent, acc: null }, 112, { anim: i === shown - 1 ? 'celebrate' : 'idle' }),
      h('div.ss-bubble', h('b', c.name.toUpperCase()), h('p', txt)));
  };
  function paint() {
    list.replaceChildren(...lines.slice(0, shown).map(bubble));
    const end = shown >= lines.length;
    btn.replaceChildren(...(end ? [icon('play'), kind === 'stage' ? 'JUGAR' : kind === 'intro' ? 'EMPEZAR' : 'CONTINUAR'] : ['SIGUIENTE']));
  }
  function next() {
    app.audio.play('click');
    if (shown < lines.length) { shown++; paint(); return; }
    done?.('go');
  }
  shown = 1;
  paint();

  const game = st ? GAME_BY_ID[st.game].meta : null;
  const rival = st?.rival ? CHAR_BY_ID[st.rival.char] : null;
  const ev = st?.event ? EVENTS[st.event] : null;
  scr.el = h('div.screen.story-scene', { style: { '--c': ch.color } },
    h('div.ss-head',
      h('button.btn.ghost.small', { nav: true, onclick: () => done?.('back') }, icon('back'), 'VOLVER'),
      h('div.ss-title', h('small', `CAPÍTULO ${num}`), h('b', ch.title),
        h('span', kind === 'intro' ? ch.theme : kind === 'outro' ? '¡CAPÍTULO COMPLETO!' : `Etapa ${stage + 1} de ${ch.stages.length} · ${st.name}`))),
    h('div.ss-body',
      list,
      st ? h('div.ss-card' + (st.boss ? '.boss' : ''), { style: { '--g': game.color } },
        gameIcon(ui, scr, game, 72),
        h('div.ss-info',
          h('b', game.name),
          rival ? h('span', `Rival: ${rival.name}`) : h('span', 'Desafío en solitario'),
          ev ? h('span.ss-ev', { style: { color: ev.color } }, ev.name) : st.diff === 'caos' ? h('span.ss-ev', 'MODO CAOS') : null,
          h('p', st.goal))) : null,
      reward ? h('div.ss-card.reward', h('div.ss-info', h('b', 'RECOMPENSA DEL CAPÍTULO'), h('p', `+${reward.xp} XP · +${reward.pies} PIES (con tu cuenta, una sola vez)`))) : null),
    h('div.ss-foot', btn));
  scr.onBack = () => done?.('back');
  scr.onKey = (e) => { if (e.code === 'Space') { next(); return true; } };
  return scr;
}

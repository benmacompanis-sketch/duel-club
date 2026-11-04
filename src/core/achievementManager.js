// AchievementManager: capa de compatibilidad sobre los logros del SERVIDOR.
// Los logros se evalúan y guardan en la base de datos (dc.check_achievements); aquí solo se consulta
// qué tiene cada jugador para mostrarlo y para saber qué personajes/cosméticos puede usar.
// Los invitados usan los personajes y cosméticos básicos.
import { ACHIEVEMENTS, ACH_BY_ID } from '../data/achievements.js';
import { ITEM_BY_ID } from '../data/catalog.js';
import { LEGACY_ACC } from './characters.js';

export { LEGACY_ACC };

export { ACHIEVEMENTS, ACH_BY_ID };

export class AchievementManager {
  constructor(app) {
    this.app = app;
  }
  account(p) {
    return this.app.accounts?.slotAccount(p) || null;
  }
  has(id, p = 0) {
    return !!this.account(p)?.achievements?.[id];
  }
  owns(itemId, p = 0) {
    const it = ITEM_BY_ID[itemId];
    if (!it) return false;
    if (it.default) return true;
    return !!this.account(p)?.inventory?.includes(itemId);
  }
  isCharUnlocked(charId, p = 0) {
    return this.owns('char_' + charId, p);
  }
  isAccUnlocked(accId, p = 0) {
    if (!accId || accId === 'none') return true;
    return this.owns(LEGACY_ACC[accId] || accId, p);
  }
  /** Los logros los decide el servidor al recibir cada partida: no hay evaluación local. */
  evaluate() {
    return [];
  }
}

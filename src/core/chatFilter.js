// Filtro del chat de partida (las palabras son las mismas que bloquea el servidor en nombres y en el chat privado).
// El chat de partida viaja directo entre compus, así que se filtra al mandar Y al recibir.
const ROOTS = ['puto', 'puta', 'putit', 'pelotud', 'forro', 'fora', 'hdp', 'hijodeput', 'conchetumad', 'conchatumad', 'conchasumad', 'conchudo',
  'verga', 'lapija', 'pijud', 'pajer', 'mogolic', 'retrasad', 'mierda', 'cagon', 'trolo', 'maricon', 'marica', 'sorete', 'chupal', 'chupame',
  'nazi', 'hitler', 'violad', 'violar', 'pedof', 'porno', 'sexo', 'cocain', 'faloper', 'boludo', 'culiad',
  'niger', 'niga', 'fuck', 'shit', 'bitch', 'cunt', 'whore', 'faget', 'retard', 'pusy', 'slut'];
const SAFE = ['computa', 'disputa', 'imputa', 'reputa', 'diputa'];
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[0134578@$!|]/g, (c) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' })[c]).replace(/[^a-z]/g, '');
const collapse = (w) => w.replace(/(.)\1+/g, '$1');
function bad(word) {
  let n = norm(word);
  for (const s of SAFE) n = n.split(s).join('');
  const c = collapse(n);
  return ROOTS.some((r) => n.includes(r) || c.includes(r));
}
/** Limpia un mensaje: sin caracteres invisibles, espacios simples, largo máximo y palabras ofensivas tapadas. */
export function cleanChat(text, max = 200) {
  const t = String(text || '').replace(/[\u0000-\u001F\u007F​-‏‪-‮⁠-⁯]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return t.split(' ').map((w) => (w && bad(w) ? '*'.repeat(w.length) : w)).join(' ');
}

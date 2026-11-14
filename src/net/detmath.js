// Matemática DETERMINISTA para las partidas online.
// Math.sin, Math.cos, Math.exp, Math.pow, Math.atan2, Math.hypot… no están obligadas a dar exactamente el mismo
// resultado en todos los navegadores, sistemas y procesadores (pueden diferir en el último bit). En un juego
// sincronizado por teclas ("lockstep") esa diferencia mínima se acumula y las dos compus terminan viendo
// partidas distintas. Estas versiones usan solo + − × ÷ y raíz cuadrada, que SÍ son exactas e idénticas en
// cualquier compu (IEEE-754), así que dan el mismo resultado bit a bit en todos lados.
// Se activan únicamente mientras se simula una ronda online (ver NetRound.withSim).

const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;
// 2π partido en tres para reducir el argumento sin perder precisión (Cody–Waite)
const TWO_PI_A = 6.283185307179586; // doble más cercano a 2π
const TWO_PI_B = 2.4492935982947064e-16; // 2π − TWO_PI_A
const LN2_HI = 0.6931471803691238;
const LN2_LO = 1.9082149292705877e-10;
const LN2 = 0.6931471805599453;
const INV_LN2 = 1.4426950408889634;
const SQRT1_2 = 0.7071067811865476;

const nsqrt = Math.sqrt;
const natan2 = Math.atan2; // solo para infinitos (no ocurren en juego)
const nfloor = Math.floor;
const nabs = Math.abs;

// potencias exactas de 2 (se construyen duplicando: exacto)
const POW2 = new Float64Array(2200);
(() => {
  let v = 1;
  for (let i = 0; i <= 1023; i++) { POW2[1100 + i] = v; v *= 2; }
  v = 1;
  for (let i = 0; i <= 1074; i++) { POW2[1100 - i] = v; v /= 2; }
})();
function scalb(x, k) {
  // x · 2^k en pasos seguros
  while (k > 1000) { x *= POW2[2100]; k -= 1000; }
  while (k < -1000) { x *= POW2[100]; k += 1000; }
  return x * POW2[1100 + k];
}

// seno y coseno en [−π/4, π/4] (polinomios de Taylor, error < 1e-16)
function ksin(x) {
  const z = x * x;
  return x + x * z * (-1.6666666666666666e-1 + z * (8.333333333333333e-3 + z * (-1.984126984126984e-4 + z * (2.7557319223985893e-6
    + z * (-2.505210838544172e-8 + z * (1.6059043836821613e-10 + z * (-7.647163731819816e-13 + z * 2.8114572543455206e-15)))))));
}
function kcos(x) {
  const z = x * x;
  return 1 + z * (-0.5 + z * (4.1666666666666664e-2 + z * (-1.388888888888889e-3 + z * (2.48015873015873e-5 + z * (-2.755731922398589e-7
    + z * (2.08767569878681e-9 + z * (-1.1470745597729725e-11 + z * (4.779477332387385e-14 + z * -1.5619206968586225e-16))))))));
}
// reduce x a r en [−π/4, π/4] y devuelve el cuadrante (0..3)
let _r = 0;
function reduce(x) {
  if (nabs(x) <= 0.7853981633974483) { _r = x; return 0; }
  const n = nfloor(x / HALF_PI + 0.5);
  // x − n·π/2 con π/2 partido en tres (los primeros 33 bits, los 33 siguientes y el resto): n·PIO2_1 es exacto
  // para |n| < 2^20, así que no se pierde precisión con ángulos grandes
  let r = x - n * 1.5707963267341256; // PIO2_1
  r -= n * 6.077100506303966e-11; // PIO2_2
  r -= n * 2.0222662487959506e-21; // PIO2_2t
  _r = r;
  return ((n % 4) + 4) % 4;
}
export function sin(x) {
  x = +x;
  if (x !== x || x === Infinity || x === -Infinity) return NaN;
  if (nabs(x) > 1e6) x = x - nfloor(x / TWO_PI_A) * TWO_PI_A; // ángulos gigantes: precisión de juego
  const q = reduce(x);
  const r = _r;
  return q === 0 ? ksin(r) : q === 1 ? kcos(r) : q === 2 ? -ksin(r) : -kcos(r);
}
export function cos(x) {
  x = +x;
  if (x !== x || x === Infinity || x === -Infinity) return NaN;
  if (nabs(x) > 1e6) x = x - nfloor(x / TWO_PI_A) * TWO_PI_A;
  const q = reduce(x);
  const r = _r;
  return q === 0 ? kcos(r) : q === 1 ? -ksin(r) : q === 2 ? -kcos(r) : ksin(r);
}
export function tan(x) {
  return sin(x) / cos(x);
}

// arcotangente: reducción a [0, tan(π/12)] + serie
function katan(x) {
  // x en [0, 1]
  let add = 0;
  if (x > 0.2679491924311227) { // tan(π/12)
    // atan(x) = π/6 + atan((x·√3 − 1)/(x + √3))
    x = (x * 1.7320508075688772 - 1) / (x + 1.7320508075688772);
    add = 0.5235987755982988;
  }
  const z = x * x;
  const p = x * (1 + z * (-0.3333333333333333 + z * (0.2 + z * (-0.14285714285714285 + z * (0.1111111111111111 + z * (-0.09090909090909091
    + z * (0.07692307692307693 + z * (-0.06666666666666667 + z * (0.058823529411764705 + z * (-0.05263157894736842 + z * (0.047619047619047616
    + z * (-0.043478260869565216 + z * 0.04))))))))))));
  return add + p;
}
export function atan(x) {
  x = +x;
  if (x !== x) return NaN;
  const neg = x < 0;
  if (neg) x = -x;
  const r = x > 1 ? HALF_PI - katan(1 / x) : katan(x);
  return neg ? -r : r;
}
export function atan2(y, x) {
  y = +y; x = +x;
  if (x !== x || y !== y) return NaN;
  if (x === 0) {
    if (y === 0) return 0;
    return y > 0 ? HALF_PI : -HALF_PI;
  }
  if (x === Infinity || x === -Infinity || y === Infinity || y === -Infinity) return natan2(y, x);
  const a = atan(y / x);
  if (x > 0) return a;
  return y >= 0 ? a + PI : a - PI;
}
export function asin(x) {
  x = +x;
  if (!(x >= -1 && x <= 1)) return NaN;
  return atan2(x, nsqrt(1 - x * x));
}
export function acos(x) {
  x = +x;
  if (!(x >= -1 && x <= 1)) return NaN;
  return atan2(nsqrt(1 - x * x), x);
}

export function exp(x) {
  x = +x;
  if (x !== x) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019411) return 0;
  const k = nfloor(x * INV_LN2 + 0.5);
  const r = (x - k * LN2_HI) - k * LN2_LO; // |r| ≤ ln2/2
  // e^r por Taylor (grado 13: error < 1e-17 en ese rango)
  const p = 1 + r * (1 + r * (0.5 + r * (1.6666666666666666e-1 + r * (4.1666666666666664e-2 + r * (8.333333333333333e-3 + r * (1.388888888888889e-3
    + r * (1.984126984126984e-4 + r * (2.48015873015873e-5 + r * (2.7557319223985893e-6 + r * (2.755731922398589e-7 + r * (2.505210838544172e-8
    + r * (2.08767569878681e-9 + r * 1.6059043836821613e-10))))))))))));
  return scalb(p, k);
}
export function log(x) {
  x = +x;
  if (x !== x || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  // x = m · 2^e con m en [√½, √2)
  let e = 0;
  let m = x;
  while (m >= 1.4142135623730951) { // pasos grandes primero
    if (m >= 4294967296) { m *= 2.3283064365386963e-10; e += 32; } else { m *= 0.5; e += 1; }
  }
  while (m < SQRT1_2) {
    if (m < 2.3283064365386963e-10) { m *= 4294967296; e -= 32; } else { m *= 2; e -= 1; }
  }
  const s = (m - 1) / (m + 1);
  const z = s * s;
  // 2·atanh(s) (|s| ≤ 0.1716: 13 términos, error < 1e-17)
  const p = 2 * s * (1 + z * (0.3333333333333333 + z * (0.2 + z * (0.14285714285714285 + z * (0.1111111111111111 + z * (0.09090909090909091
    + z * (0.07692307692307693 + z * (0.06666666666666667 + z * (0.058823529411764705 + z * (0.05263157894736842 + z * (0.047619047619047616
    + z * (0.043478260869565216 + z * 0.04))))))))))));
  return e * LN2_HI + (e * LN2_LO + p);
}
export function pow(x, y) {
  x = +x; y = +y;
  if (y === 0) return 1;
  if (x !== x || y !== y) return NaN;
  if (y === 1) return x;
  if (y === 2) return x * x;
  if (y === 0.5) return nsqrt(x);
  if (y === -1) return 1 / x;
  // exponente entero chico: multiplicaciones (exacto en el orden fijo)
  if (y === nfloor(y) && nabs(y) <= 1024) {
    let n = nabs(y), b = x, r = 1;
    while (n > 0) {
      if (n % 2 === 1) r *= b;
      b *= b;
      n = nfloor(n / 2);
    }
    return y < 0 ? 1 / r : r;
  }
  if (x === 0) return y > 0 ? 0 : Infinity;
  if (x < 0) return NaN; // base negativa con exponente no entero
  if (x === Infinity) return y > 0 ? Infinity : 0;
  return exp(y * log(x));
}
export function hypot(...v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) { const a = +v[i]; s += a * a; }
  return nsqrt(s);
}
export function cbrt(x) {
  x = +x;
  if (x === 0 || x !== x) return x;
  const r = exp(log(nabs(x)) / 3);
  const c = r - (r * r * r - nabs(x)) / (3 * r * r); // un paso de Newton
  return x < 0 ? -c : c;
}
export const log2 = (x) => log(x) * INV_LN2;
export const log10 = (x) => log(x) * 0.4342944819032518;
export const log1p = (x) => log(1 + x);
export const expm1 = (x) => exp(x) - 1;
export const sinh = (x) => (exp(x) - exp(-x)) / 2;
export const cosh = (x) => (exp(x) + exp(-x)) / 2;
export const tanh = (x) => { const a = exp(2 * x); return a === Infinity ? 1 : (a - 1) / (a + 1); };

/** Funciones que reemplazan a las de Math mientras se simula una ronda online. */
export const DET = { sin, cos, tan, atan, atan2, asin, acos, exp, log, pow, hypot, cbrt, log2, log10, log1p, expm1, sinh, cosh, tanh };
const NAMES = Object.keys(DET);
const NATIVE = {};
for (const k of NAMES) NATIVE[k] = Math[k];
let depth = 0;
export function useDetMath() {
  if (depth++ === 0) for (let i = 0; i < NAMES.length; i++) Math[NAMES[i]] = DET[NAMES[i]];
}
export function restoreMath() {
  if (--depth === 0) for (let i = 0; i < NAMES.length; i++) Math[NAMES[i]] = NATIVE[NAMES[i]];
}
/** Las funciones nativas originales (para pruebas). */
export const NATIVE_MATH = NATIVE;

// Full-moon dates from Jean Meeus, "Astronomical Algorithms" (ch. 49). Accurate to a few minutes,
// which is plenty to know which evening the studio's full-moon event falls on.

const rad = Math.PI / 180;

function fullMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * rad;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * rad;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * rad;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * rad;
  jde +=
    -0.40614 * Math.sin(Mp) +
    0.17302 * E * Math.sin(M) +
    0.01614 * Math.sin(2 * Mp) +
    0.01043 * Math.sin(2 * F) +
    0.00734 * E * Math.sin(Mp - M) -
    0.00515 * E * Math.sin(Mp + M) +
    0.00209 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(O);
  return jde;
}

const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 864e5);

/** The next `count` full moons at or after `from`. */
export function nextFullMoons(from: Date, count = 3): Date[] {
  const years = from.getUTCFullYear() + from.getUTCMonth() / 12 - 2000;
  let k = Math.floor(years * 12.3685) - 2 + 0.5;
  const out: Date[] = [];
  while (out.length < count) {
    const d = jdToDate(fullMoonJDE(k));
    if (d.getTime() >= from.getTime()) out.push(d);
    k += 1;
  }
  return out;
}

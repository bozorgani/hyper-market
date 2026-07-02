// Temporary validation harness for the Jalali conversion math.
// Confirms anchors (Nowruz) and round-trips before porting into the app.

function jLeap(y) {
  const r = ((y % 33) + 33) % 33;
  return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
}
function jYearDays(y) { return jLeap(y) ? 366 : 365; }
function jMonthDays(y, m) {
  if (m <= 6) return 31;
  if (m <= 11) return 30;
  return jLeap(y) ? 30 : 29;
}

function gregToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const w = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * w + Math.floor(w / 4) - Math.floor(w / 100) + Math.floor(w / 400) - 32045;
}
function jdnToGreg(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const dd = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * dd) / 4);
  const mm = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * mm + 2) / 5) + 1;
  const month = mm + 3 - 12 * Math.floor(mm / 10);
  const year = 100 * b + dd - 4800 + Math.floor(mm / 10);
  return { year, month, day };
}

const ANCHOR_JDN = gregToJDN(2025, 3, 21); // Nowruz 1404

function toJalaliFromJDN(jdn) {
  let days = jdn - ANCHOR_JDN;
  if (days < 0) {
    let jy = 1404;
    while (days < 0) {
      jy--;
      days += jYearDays(jy);
    }
    let jm = 1;
    let jd = 1 + days;
    while (jd > jMonthDays(jy, jm)) {
      jd -= jMonthDays(jy, jm);
      jm++;
    }
    return { jy, jm, jd };
  }
  let jy = 1404;
  let jd = 1 + days;
  let jm = 1;
  while (jd > jYearDays(jy)) {
    jd -= jYearDays(jy);
    jy++;
  }
  while (jd > jMonthDays(jy, jm)) {
    jd -= jMonthDays(jy, jm);
    jm++;
  }
  return { jy, jm, jd };
}
function toJalali(input) {
  const g = input instanceof Date ? input : new Date(input);
  return toJalaliFromJDN(gregToJDN(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate()));
}
function jalaliToJDN(jy, jm, jd) {
  let yearOffset = 0;
  if (jy > 1404) { for (let y = 1404; y < jy; y++) yearOffset += jYearDays(y); }
  else if (jy < 1404) { for (let y = jy; y < 1404; y++) yearOffset -= jYearDays(y); }
  let monthOffset = 0;
  for (let m = 1; m < jm; m++) monthOffset += jMonthDays(jy, m);
  return ANCHOR_JDN + yearOffset + monthOffset + (jd - 1);
}
function fromJalali(jy, jm, jd) {
  return jdnToGreg(jalaliToJDN(jy, jm, jd));
}

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(ok ? 'PASS' : 'FAIL', label, '=> got', JSON.stringify(got), ok ? '' : 'want ' + JSON.stringify(want));
  ok ? pass++ : fail++;
}

// Anchor checks (known Nowruz Gregorian dates)
eq('2025-03-21 -> 1404/1/1', toJalali('2025-03-21'), { jy: 1404, jm: 1, jd: 1 });
eq('2021-03-21 -> 1400/1/1', toJalali('2021-03-21'), { jy: 1400, jm: 1, jd: 1 });
eq('2026-03-21 -> 1405/1/1', toJalali('2026-03-21'), { jy: 1405, jm: 1, jd: 1 });
eq('2017-03-21 -> 1396/1/1', toJalali('2017-03-21'), { jy: 1396, jm: 1, jd: 1 });
eq('2024-03-20 -> 1403/1/1', toJalali('2024-03-20'), { jy: 1403, jm: 1, jd: 1 });

// Round-trip checks
const samples = ['2025-07-02', '2026-01-01', '2020-02-29', '1990-11-15', '2030-12-31', '2025-03-20', '2025-03-22'];
for (const s of samples) {
  const j = toJalali(s);
  const g = fromJalali(j.jy, j.jm, j.jd);
  eq(`roundtrip ${s}`, [g.year, g.month, g.day], s.split('-').map(Number));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// Self-contained Jalali (Shamsi) calendar utilities — no external dependency.
// Conversion math validated against known Nowruz anchors and full round-trips
// (see scripts/_jalali_check.mjs).

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const JALALI_WEEKDAY_LABELS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

export type JalaliDate = { jy: number; jm: number; jd: number };

function jalaliLeapYear(year: number): boolean {
  const r = ((year % 33) + 33) % 33;
  return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
}

function jalaliYearLength(year: number): number {
  return jalaliLeapYear(year) ? 366 : 365;
}

function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return jalaliLeapYear(year) ? 30 : 29;
}

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const w = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * w +
    Math.floor(w / 4) -
    Math.floor(w / 100) +
    Math.floor(w / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

// Anchor: Nowruz 1404 (Farvardin 1, 1404) = 2025-03-21 (Gregorian).
const ANCHOR_JDN = gregorianToJDN(2025, 3, 21);

export function toJalali(input: Date | string | number): JalaliDate {
  const date = input instanceof Date ? input : new Date(input);
  const jdn = gregorianToJDN(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  let days = jdn - ANCHOR_JDN;

  if (days < 0) {
    let jy = 1404;
    while (days < 0) {
      jy -= 1;
      days += jalaliYearLength(jy);
    }
    let jm = 1;
    let jd = 1 + days;
    while (jd > jalaliMonthLength(jy, jm)) {
      jd -= jalaliMonthLength(jy, jm);
      jm += 1;
    }
    return { jy, jm, jd };
  }

  let jy = 1404;
  let jd = 1 + days;
  let jm = 1;
  while (jd > jalaliYearLength(jy)) {
    jd -= jalaliYearLength(jy);
    jy += 1;
  }
  while (jd > jalaliMonthLength(jy, jm)) {
    jd -= jalaliMonthLength(jy, jm);
    jm += 1;
  }
  return { jy, jm, jd };
}

export function jalaliToJDN(jy: number, jm: number, jd: number): number {
  let yearOffset = 0;
  if (jy > 1404) {
    for (let y = 1404; y < jy; y += 1) yearOffset += jalaliYearLength(y);
  } else if (jy < 1404) {
    for (let y = jy; y < 1404; y += 1) yearOffset -= jalaliYearLength(y);
  }
  let monthOffset = 0;
  for (let m = 1; m < jm; m += 1) monthOffset += jalaliMonthLength(jy, m);
  return ANCHOR_JDN + yearOffset + monthOffset + (jd - 1);
}

export function fromJalali(jy: number, jm: number, jd: number): {
  year: number;
  month: number;
  day: number;
} {
  return jdnToGregorian(jalaliToJDN(jy, jm, jd));
}

/** Convert a Jalali date to an ISO `YYYY-MM-DD` string (Gregorian). */
export function jalaliToISODate(jy: number, jm: number, jd: number): string {
  const g = fromJalali(jy, jm, jd);
  const month = String(g.month).padStart(2, "0");
  const day = String(g.day).padStart(2, "0");
  return `${g.year}-${month}-${day}`;
}

/** Convert an ISO `YYYY-MM-DD` string to a Jalali date (or null if invalid). */
export function isoToJalali(iso: string): JalaliDate | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const g = jdnToGregorian(gregorianToJDN(Number(match[1]), Number(match[2]), Number(match[3])));
  return toJalali(`${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`);
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Format an ISO date (or Date/string) as a human Shamsi date, e.g. "۵ مرداد ۱۴۰۴". */
export function formatJalaliDate(value?: string | null, withWeekday = false): string {
  if (!value) return "ثبت نشده";

  try {
    const { jy, jm, jd } = toJalali(value);
    const formatted = `${toPersianDigits(jd)} ${JALALI_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;

    if (!withWeekday) return formatted;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatted;
    // Persian weekday index: 0 = شنبه.
    const weekdayIndex = (date.getUTCDay() + 1) % 7;
    return `${JALALI_WEEKDAY_LABELS[weekdayIndex]}، ${formatted}`;
  } catch {
    return value;
  }
}

/** Weekday index (0 = شنبه) for the 1st day of a Jalali month — used by the picker grid. */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const iso = jalaliToISODate(jy, jm, 1);
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 1) % 7;
}

export function jalaliMonthDayCount(jy: number, jm: number): number {
  return jalaliMonthLength(jy, jm);
}

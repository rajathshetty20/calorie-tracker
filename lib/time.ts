// Interval arithmetic in a fixed IANA timezone.
//
// Time entries are stored as (started_at, ended_at) instants. Everything that
// asks "how much on day X" resolves through splitByDay, which clips the
// interval at *local* midnights — never UTC ones, and never by adding 24h,
// so a DST day that is 23 or 25 hours long still adds up correctly.

export type DaySlice = { date: string; minutes: number };

/** Wall-clock fields of an instant as seen in `timeZone`. */
function partsIn(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  // Intl renders midnight as hour 24 in some locales/engines.
  const hour = get("hour") % 24;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` from UTC at a given instant, in milliseconds. */
function offsetMs(instant: Date, timeZone: string): number {
  const p = partsIn(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Local calendar date of an instant, as YYYY-MM-DD. */
export function localDateISO(instant: Date, timeZone: string): string {
  const p = partsIn(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Local wall-clock time of an instant, as HH:MM. */
export function localTimeHHMM(instant: Date, timeZone: string): string {
  const p = partsIn(instant, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/**
 * The instant at which a given local wall-clock time occurs.
 *
 * Resolved by guessing the same clock reading in UTC and correcting by the
 * zone's offset, then re-checking: near a DST transition the offset at the
 * guess differs from the offset at the answer, and a single pass lands an
 * hour out. This is also what turns a <input type="datetime-local"> value,
 * which carries no zone, into a real instant.
 */
export function instantFromLocal(dateISO: string, hhmm: string, timeZone: string): Date {
  const guess = new Date(`${dateISO}T${hhmm}:00Z`);
  const firstPass = new Date(guess.getTime() - offsetMs(guess, timeZone));
  return new Date(guess.getTime() - offsetMs(firstPass, timeZone));
}

/** The instant at which a local calendar date begins. */
export function startOfLocalDay(dateISO: string, timeZone: string): Date {
  return instantFromLocal(dateISO, "00:00", timeZone);
}

/** Local day bounds, for overlap queries. */
export function localDayRange(dateISO: string, timeZone: string) {
  return {
    start: startOfLocalDay(dateISO, timeZone),
    end: startOfLocalDay(addDaysISO(dateISO, 1), timeZone),
  };
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Distributes an interval across the local days it touches.
 *
 * Sleep 22:00 -> 06:00 becomes 120 minutes on the first day and 360 on the
 * next, which is what the user asked for and what makes a stored `minutes`
 * column impossible to keep honest.
 *
 * A running entry passes `end = now`. An entry that starts in the future (an
 * offset start that hasn't fired yet) contributes nothing.
 */
export function splitByDay(start: Date, end: Date, timeZone: string): DaySlice[] {
  if (!(end.getTime() > start.getTime())) return [];

  const out: DaySlice[] = [];
  let cursor = start;
  // Bounded so a bad clock or an absurd interval can't spin forever.
  for (let guard = 0; guard < 400 && cursor.getTime() < end.getTime(); guard++) {
    const date = localDateISO(cursor, timeZone);
    const nextMidnight = startOfLocalDay(addDaysISO(date, 1), timeZone);
    const sliceEnd = nextMidnight.getTime() < end.getTime() ? nextMidnight : end;
    const minutes = (sliceEnd.getTime() - cursor.getTime()) / 60_000;
    if (minutes > 0) out.push({ date, minutes });
    if (sliceEnd.getTime() <= cursor.getTime()) break; // no progress: bail
    cursor = sliceEnd;
  }
  return out;
}

/** Whole minutes in an interval, for display of a single entry. */
export function spanMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/**
 * Signed milliseconds since an entry started. Negative means it hasn't begun
 * yet — an offset start, which the UI renders as a countdown.
 */
export function elapsedMs(startedAt: Date, now: Date = new Date()): number {
  return now.getTime() - startedAt.getTime();
}

/** H:MM:SS for a running timer; the sign is handled by the caller. */
export function fmtClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  addDaysISO,
  fmtClock,
  localDateISO,
  localDayRange,
  instantFromLocal,
  localTimeHHMM,
  spanMinutes,
  splitByDay,
} from "./time.ts";

const IST = "Asia/Kolkata";
const NY = "America/New_York";

// Wall-clock time in a zone -> instant. Must go through instantFromLocal
// rather than adding hours to midnight: on a DST day those differ.
const at = instantFromLocal;

test("an interval inside one day stays on that day", () => {
  const start = at("2026-08-08", "09:00", IST);
  const end = at("2026-08-08", "17:30", IST);
  assert.deepEqual(splitByDay(start, end, IST), [
    { date: "2026-08-08", minutes: 510 },
  ]);
});

test("sleep across midnight splits 2h / 6h — the case that drove the schema", () => {
  const start = at("2026-08-08", "22:00", IST);
  const end = at("2026-08-09", "06:00", IST);
  assert.deepEqual(splitByDay(start, end, IST), [
    { date: "2026-08-08", minutes: 120 },
    { date: "2026-08-09", minutes: 360 },
  ]);
});

test("an interval spanning several midnights yields whole days in between", () => {
  const start = at("2026-08-08", "23:00", IST);
  const end = at("2026-08-11", "01:00", IST);
  assert.deepEqual(splitByDay(start, end, IST), [
    { date: "2026-08-08", minutes: 60 },
    { date: "2026-08-09", minutes: 1440 },
    { date: "2026-08-10", minutes: 1440 },
    { date: "2026-08-11", minutes: 60 },
  ]);
});

test("slices always sum to the interval length", () => {
  const start = at("2026-08-08", "21:37", IST);
  const end = at("2026-08-12", "07:13", IST);
  const total = splitByDay(start, end, IST).reduce((a, s) => a + s.minutes, 0);
  assert.equal(total, spanMinutes(start, end));
});

test("an entry that has not started yet contributes nothing", () => {
  const start = at("2026-08-08", "23:00", IST);
  const now = at("2026-08-08", "22:45", IST); // offset start, 15 min away
  assert.deepEqual(splitByDay(start, now, IST), []);
});

test("a zero-length or reversed interval yields nothing", () => {
  const t = at("2026-08-08", "10:00", IST);
  assert.deepEqual(splitByDay(t, t, IST), []);
  assert.deepEqual(splitByDay(t, at("2026-08-08", "09:00", IST), IST), []);
});

test("a spring-forward day is 23 hours, not 24", () => {
  // US DST begins 2026-03-08 02:00 -> 03:00.
  const { start, end } = localDayRange("2026-03-08", NY);
  assert.deepEqual(splitByDay(start, end, NY), [
    { date: "2026-03-08", minutes: 1380 },
  ]);
});

test("a fall-back day is 25 hours", () => {
  // US DST ends 2026-11-01 02:00 -> 01:00.
  const { start, end } = localDayRange("2026-11-01", NY);
  assert.deepEqual(splitByDay(start, end, NY), [
    { date: "2026-11-01", minutes: 1500 },
  ]);
});

test("an overnight interval across the spring-forward transition loses the skipped hour", () => {
  const start = at("2026-03-07", "22:00", NY);
  const end = at("2026-03-08", "06:00", NY); // 6am on the clock, but only 7h slept
  const slices = splitByDay(start, end, NY);
  assert.deepEqual(slices, [
    { date: "2026-03-07", minutes: 120 },
    { date: "2026-03-08", minutes: 300 },
  ]);
  assert.equal(slices.reduce((a, s) => a + s.minutes, 0), spanMinutes(start, end));
});

test("local date and time read in the configured zone, not the host's", () => {
  // 2026-08-08T20:00Z is 2026-08-09 01:30 in IST.
  const instant = new Date("2026-08-08T20:00:00Z");
  assert.equal(localDateISO(instant, IST), "2026-08-09");
  assert.equal(localTimeHHMM(instant, IST), "01:30");
  assert.equal(localDateISO(instant, NY), "2026-08-08");
});

test("addDaysISO crosses month and year boundaries", () => {
  assert.equal(addDaysISO("2026-08-31", 1), "2026-09-01");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysISO("2026-03-01", -1), "2026-02-28");
});

test("fmtClock drops the hour segment only below an hour", () => {
  assert.equal(fmtClock(0), "00:00");
  assert.equal(fmtClock(59_000), "00:59");
  assert.equal(fmtClock(3_600_000), "1:00:00");
  assert.equal(fmtClock(8_130_000), "2:15:30");
  assert.equal(fmtClock(-90_000), "01:30"); // countdown renders unsigned
});

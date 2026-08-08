// Range vocabulary shared by the server page and the client charts.
// Deliberately not a "use client" module: the page reads ?range= during the
// server render, and a client-only export can't be called from there.

export type Range = 7 | 30 | 90;
export const RANGES: readonly Range[] = [7, 30, 90] as const;
export const DEFAULT_RANGE: Range = 30;

export function parseRange(value: string | string[] | undefined): Range {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : DEFAULT_RANGE;
}

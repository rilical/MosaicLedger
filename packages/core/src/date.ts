export type DateRange = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
};

export function isWithinRange(date: string, range: DateRange): boolean {
  // Works for ISO-8601 date-only strings.
  return date >= range.start && date <= range.end;
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.toISOString().slice(0, 10);
}

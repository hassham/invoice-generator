/** FSD section 42's optional period selector. */
export const PERIOD_PRESETS = ["ThisMonth", "LastMonth", "ThisQuarter", "ThisYear", "Custom"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  ThisMonth: "This Month",
  LastMonth: "Last Month",
  ThisQuarter: "This Quarter",
  ThisYear: "This Year",
  Custom: "Custom",
};

export interface DateRange {
  startDate: string;
  endDate: string;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastDayOfMonth(year: number, month: number): Date {
  // Day 0 of the following month is the last day of this one.
  return new Date(year, month + 1, 0);
}

/**
 * Computes the [startDate, endDate] (YYYY-MM-DD) for a preset, relative to `referenceDate`
 * (defaults to now) - a pure function so the date math is unit-testable without mocking the
 * system clock everywhere it's used. "Custom" has no computed range - the caller collects two
 * explicit dates from the user instead.
 */
export function computePeriodRange(preset: Exclude<PeriodPreset, "Custom">, referenceDate: Date = new Date()): DateRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  switch (preset) {
    case "ThisMonth":
      return { startDate: toIsoDate(new Date(year, month, 1)), endDate: toIsoDate(lastDayOfMonth(year, month)) };
    case "LastMonth":
      return { startDate: toIsoDate(new Date(year, month - 1, 1)), endDate: toIsoDate(lastDayOfMonth(year, month - 1)) };
    case "ThisQuarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return { startDate: toIsoDate(new Date(year, quarterStartMonth, 1)), endDate: toIsoDate(lastDayOfMonth(year, quarterStartMonth + 2)) };
    }
    case "ThisYear":
      return { startDate: toIsoDate(new Date(year, 0, 1)), endDate: toIsoDate(new Date(year, 11, 31)) };
  }
}

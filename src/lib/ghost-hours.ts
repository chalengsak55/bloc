// ─── Ghost Business Hours Utility ─────────────────────────────────────────────
// Computes open/closed status from Google Places opening_hours periods + timezone

export type GooglePeriod = {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};

export type OpenStatus = {
  isOpen: boolean;
  nextChange: string | null; // e.g. "Closes at 9:00 PM" or "Opens at 8:00 AM"
};

/**
 * Determine if a business is currently open based on Google Places periods.
 * Uses Intl.DateTimeFormat for timezone-aware time calculations.
 */
export function isOpenNow(
  periods: GooglePeriod[] | null | undefined,
  timezone: string = "America/Los_Angeles",
): OpenStatus {
  if (!periods || periods.length === 0) {
    return { isOpen: false, nextChange: null };
  }

  // 24/7 business: single period with open day 0, hour 0, no close
  if (
    periods.length === 1 &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0 &&
    !periods[0].close
  ) {
    return { isOpen: true, nextChange: "Open 24/7" };
  }

  // Get current time in business timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dayStr = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const currentDay = dayMap[dayStr] ?? 0;
  const currentMinutes = hour * 60 + minute;

  // Check each period
  for (const period of periods) {
    if (!period.close) continue;

    const openDay = period.open.day;
    const closeDay = period.close.day;
    const openMinutes = period.open.hour * 60 + period.open.minute;
    const closeMinutes = period.close.hour * 60 + period.close.minute;

    // Same-day period
    if (openDay === closeDay && openDay === currentDay) {
      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        return {
          isOpen: true,
          nextChange: `Closes at ${formatTime(period.close.hour, period.close.minute)}`,
        };
      }
    }

    // Overnight period (e.g., Fri 20:00 → Sat 02:00)
    if (openDay !== closeDay) {
      // Currently on the open day, after opening time
      if (currentDay === openDay && currentMinutes >= openMinutes) {
        return {
          isOpen: true,
          nextChange: `Closes at ${formatTime(period.close.hour, period.close.minute)}`,
        };
      }
      // Currently on the close day, before closing time
      if (currentDay === closeDay && currentMinutes < closeMinutes) {
        return {
          isOpen: true,
          nextChange: `Closes at ${formatTime(period.close.hour, period.close.minute)}`,
        };
      }
    }
  }

  // Closed — find next opening time
  const nextOpen = findNextOpen(periods, currentDay, currentMinutes);
  return {
    isOpen: false,
    nextChange: nextOpen,
  };
}

function findNextOpen(
  periods: GooglePeriod[],
  currentDay: number,
  currentMinutes: number,
): string | null {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Look through next 7 days
  for (let offset = 0; offset < 7; offset++) {
    const checkDay = (currentDay + offset) % 7;

    for (const period of periods) {
      if (period.open.day !== checkDay) continue;
      const openMinutes = period.open.hour * 60 + period.open.minute;

      // If same day, must be after current time
      if (offset === 0 && openMinutes <= currentMinutes) continue;

      const timeStr = formatTime(period.open.hour, period.open.minute);
      if (offset === 0) return `Opens at ${timeStr}`;
      if (offset === 1) return `Opens tomorrow at ${timeStr}`;
      return `Opens ${dayNames[checkDay]} at ${timeStr}`;
    }
  }

  return null;
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ampm}`;
}

/**
 * Format opening hours periods into a readable daily schedule.
 */
export function formatWeeklyHours(
  periods: GooglePeriod[] | null | undefined,
): { day: string; hours: string }[] {
  if (!periods || periods.length === 0) return [];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const schedule: { day: string; hours: string }[] = [];

  for (let d = 0; d < 7; d++) {
    const dayPeriods = periods.filter((p) => p.open.day === d);
    if (dayPeriods.length === 0) {
      schedule.push({ day: dayNames[d], hours: "Closed" });
    } else {
      const times = dayPeriods
        .map((p) => {
          const open = formatTime(p.open.hour, p.open.minute);
          const close = p.close
            ? formatTime(p.close.hour, p.close.minute)
            : "midnight";
          return `${open} – ${close}`;
        })
        .join(", ");
      schedule.push({ day: dayNames[d], hours: times });
    }
  }

  return schedule;
}

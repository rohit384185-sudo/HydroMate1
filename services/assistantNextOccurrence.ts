export type AssistantClockTime = {
  hour: number;
  minute: number;
};

export type AssistantFirstOccurrence = AssistantClockTime & {
  atMillis: number;
  rollover: "today" | "tomorrow";
};

function formatClock(time: AssistantClockTime) {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

export function getAssistantFirstDailyOccurrence(
  time: AssistantClockTime,
  now: Date
): AssistantFirstOccurrence {
  const occurrence = new Date(now);
  occurrence.setHours(time.hour, time.minute, 0, 0);
  let rollover: AssistantFirstOccurrence["rollover"] = "today";

  if (occurrence.getTime() <= now.getTime()) {
    occurrence.setDate(occurrence.getDate() + 1);
    rollover = "tomorrow";
  }

  if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
    console.log(
      `HydroMateReminderSchedule requested=${formatClock(time)} current=${now.toISOString()} first=${occurrence.toISOString()} rollover=${rollover}`
    );
  }

  return { ...time, atMillis: occurrence.getTime(), rollover };
}

export function getAssistantFirstDailyOccurrences(
  times: AssistantClockTime[],
  now: Date
) {
  return times.map((time) => getAssistantFirstDailyOccurrence(time, now));
}

export function getAssistantFirstOccurrenceMap(
  times: AssistantClockTime[],
  now: Date
) {
  return Object.fromEntries(
    getAssistantFirstDailyOccurrences(times, now).map((occurrence) => [
      formatClock(occurrence),
      occurrence.atMillis,
    ])
  );
}

export function isAssistantOccurrenceStartedForDate(
  firstOccurrenceAtMillis: number | undefined,
  date: Date
) {
  if (!Number.isFinite(firstOccurrenceAtMillis)) return true;
  const endOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return firstOccurrenceAtMillis! < endOfDate.getTime();
}

export type ReminderDurationFields = {
  durationDays?: number;
  startDate?: string;
};

const LOCAL_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseLocalDateKey(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(LOCAL_DATE_KEY_PATTERN);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getValidDurationDays(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

export function hasFiniteDuration(
  reminder: ReminderDurationFields
): reminder is Required<ReminderDurationFields> {
  return (
    getValidDurationDays(reminder.durationDays) !== null &&
    parseLocalDateKey(reminder.startDate) !== null
  );
}

export function getFiniteReminderDates(
  reminder: ReminderDurationFields
) {
  const durationDays = getValidDurationDays(reminder.durationDays);
  const start = parseLocalDateKey(reminder.startDate);

  if (!durationDays || !start) {
    return [];
  }

  return Array.from({ length: durationDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function isDateWithinFiniteDuration(
  reminder: ReminderDurationFields,
  date: Date
) {
  if (!hasFiniteDuration(reminder)) {
    return false;
  }

  const dateKey = getLocalDateKey(date);
  return getFiniteReminderDates(reminder).some(
    (validDate) => getLocalDateKey(validDate) === dateKey
  );
}

export function atLocalReminderTime(
  date: Date,
  hour: number,
  minute: number
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0
  );
}

export function getFiniteOccurrenceIdentifier(
  rootIdentifier: string,
  date: Date
) {
  return `${rootIdentifier}-on-${getLocalDateKey(date).replaceAll("-", "")}`;
}

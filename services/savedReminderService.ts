import {
  cancelAllMedicineNotifications,
  getMedicineNotificationIdentifier,
  scheduleFiniteMedicineNotification,
  scheduleMedicineNotification,
} from "./notificationService";
import {
  getMedicineOccurrenceKey,
  loadMedicineOccurrenceActions,
  restorePendingMedicineSnoozes,
} from "./medicineOccurrenceActionService";
import {
  atLocalReminderTime,
  getFiniteReminderDates,
  getValidDurationDays,
  hasFiniteDuration,
  type ReminderDurationFields,
} from "./reminderDurationService";

export type HealthReminder = ReminderDurationFields & {
  name: string;
  type: string;
  times: string[];
  firstOccurrenceAtByTime?: Record<string, number>;
};

export type DatedReminder = ReminderDurationFields & {
  name: string;
  day: number;
  month: number;
  time: string;
  firstOccurrenceAtMillis?: number;
};

export type DatedReminderIdentifier = (
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) => string;

export type DatedReminderScheduler = (
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number,
  durationDays?: number,
  startDate?: string
) => Promise<unknown>;

export function parseStoredReminderArray<T>(savedValue: string | null): T[] {
  if (!savedValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(savedValue);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

function getDatedReminderTime(reminder: DatedReminder) {
  const [hour, minute] = reminder.time.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

export async function scheduleDatedReminderNotifications(
  reminders: DatedReminder[],
  getIdentifier: DatedReminderIdentifier,
  schedule: DatedReminderScheduler
) {
  const scheduledIdentifiers = new Set<string>();

  for (const reminder of reminders) {
    const time = getDatedReminderTime(reminder);

    if (!time) {
      continue;
    }

    const identifier = getIdentifier(
      reminder.name,
      reminder.month,
      reminder.day,
      time.hour,
      time.minute
    );

    if (scheduledIdentifiers.has(identifier)) {
      continue;
    }

    scheduledIdentifiers.add(identifier);
    await schedule(
      reminder.name,
      reminder.month,
      reminder.day,
      time.hour,
      time.minute,
      reminder.durationDays,
      reminder.startDate
    );
  }
}

export async function replaceDatedReminderNotifications(
  reminders: DatedReminder[],
  cancelAll: () => Promise<void>,
  getIdentifier: DatedReminderIdentifier,
  schedule: DatedReminderScheduler
) {
  await cancelAll();
  await scheduleDatedReminderNotifications(reminders, getIdentifier, schedule);
}

export async function scheduleMedicineNotifications(
  reminders: HealthReminder[]
) {
  const scheduledIdentifiers = new Set<string>();
  const actedOccurrenceKeys = new Set(
    (await loadMedicineOccurrenceActions()).map((action) => action.occurrenceKey)
  );

  for (const reminder of reminders) {
    for (const time of reminder.times) {
      const [hour, minute] = time.split(":").map(Number);
      const hasValidTime =
        Number.isInteger(hour) &&
        Number.isInteger(minute) &&
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59;

      if (!hasValidTime) {
        continue;
      }

      const identifier = getMedicineNotificationIdentifier(
        reminder.name,
        hour,
        minute,
        reminder.type
      );

      if (scheduledIdentifiers.has(identifier)) {
        continue;
      }

      scheduledIdentifiers.add(identifier);
      if (hasFiniteDuration(reminder)) {
        for (const occurrenceDate of getFiniteReminderDates(reminder)) {
          const scheduledAtMillis = atLocalReminderTime(
            occurrenceDate,
            hour,
            minute
          ).getTime();
          if (
            actedOccurrenceKeys.has(
              getMedicineOccurrenceKey(identifier, scheduledAtMillis)
            )
          ) {
            continue;
          }
          await scheduleFiniteMedicineNotification(
            reminder.name,
            hour,
            minute,
            reminder.type,
            occurrenceDate
          );
        }
      } else if (!getValidDurationDays(reminder.durationDays)) {
        await scheduleMedicineNotification(
          reminder.name,
          hour,
          minute,
          reminder.type
        );
      }
    }
  }

  await restorePendingMedicineSnoozes();
}

export async function replaceMedicineNotifications(
  reminders: HealthReminder[]
) {
  await cancelAllMedicineNotifications();
  await scheduleMedicineNotifications(reminders);
}

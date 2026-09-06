import * as Notifications from "expo-notifications";

import {
  cancelAllWaterVoiceAlarms,
  scheduleWaterVoiceAlarm,
} from "../modules/hydromate-voice";
import { getVoiceRemindersEnabled } from "./voiceReminderService";
import {
  atLocalReminderTime,
  getFiniteOccurrenceIdentifier,
  getFiniteReminderDates,
  hasFiniteDuration,
  type ReminderDurationFields,
} from "./reminderDurationService";

const WATER_REMINDER_PREFIX = "hydromate-water-";

function getNextDailyOccurrence(hour: number, minute: number) {
  const now = new Date();
  const occurrence = new Date(now);
  occurrence.setHours(hour, minute, 0, 0);

  if (occurrence.getTime() <= now.getTime()) {
    occurrence.setDate(occurrence.getDate() + 1);
  }

  return occurrence.getTime();
}

async function scheduleWaterVoiceCompanion(
  identifier: string,
  hour: number,
  minute: number,
  amountMl: number,
  voiceRemindersEnabled: boolean,
  expectedAtMillis = getNextDailyOccurrence(hour, minute),
  repeatsDaily = true
) {
  if (!voiceRemindersEnabled) {
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateReminderSchedule stage=native type=water nativeId=${identifier} triggerTimestamp=${expectedAtMillis} repeat=${repeatsDaily} result=voice-disabled`);
    }
    return;
  }

  try {
    await scheduleWaterVoiceAlarm(
      identifier,
      expectedAtMillis,
      amountMl,
      repeatsDaily
    );
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateReminderSchedule stage=native type=water nativeId=${identifier} triggerTimestamp=${expectedAtMillis} repeat=${repeatsDaily} result=success`);
    }
  } catch (error) {
    console.log("Native Water voice companion was not scheduled:", error);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateReminderSchedule stage=native type=water nativeId=${identifier} triggerTimestamp=${expectedAtMillis} repeat=${repeatsDaily} result=failure`);
    }
  }
}

export type ReminderSettings = ReminderDurationFields & {
  dailyGoal: number;
  amountPerReminder: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  intervalHours: number;
  mode: "smart" | "fixed";
  explicitTimes?: { hour: number; minute: number }[];
  scheduleMode?: "once" | "recurring";
  fireAtMillis?: number;
  firstOccurrenceAtByTime?: Record<string, number>;
};

export type WaterReminderOccurrence = {
  identifier: string;
  hour: number;
  minute: number;
  amountMl: number;
};

export function getWaterReminderOccurrences(
  settings: ReminderSettings
): WaterReminderOccurrence[] {
  const {
    dailyGoal,
    amountPerReminder,
    startHour,
    startMinute,
    endHour,
    endMinute,
    intervalHours,
    mode,
  } = settings;

  if (dailyGoal <= 0 || amountPerReminder <= 0) {
    throw new Error(
      "Daily goal and reminder amount must be greater than 0."
    );
  }

  if (mode === "fixed" && intervalHours <= 0) {
    throw new Error(
      "Interval must be greater than 0 for Fixed Interval mode."
    );
  }

  if (
    !Number.isInteger(startHour) ||
    startHour < 0 ||
    startHour > 23 ||
    !Number.isInteger(startMinute) ||
    startMinute < 0 ||
    startMinute > 59 ||
    !Number.isInteger(endHour) ||
    endHour < 0 ||
    endHour > 23 ||
    !Number.isInteger(endMinute) ||
    endMinute < 0 ||
    endMinute > 59 ||
    (!settings.explicitTimes?.length &&
      startHour * 60 + startMinute >= endHour * 60 + endMinute)
  ) {
    throw new Error("Start time must be earlier than end time.");
  }

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const occurrences: WaterReminderOccurrence[] = [];
  let scheduledAmount = 0;

  if (settings.explicitTimes?.length) {
    const uniqueTimes = new Map<string, { hour: number; minute: number }>();
    for (const time of settings.explicitTimes) {
      if (
        Number.isInteger(time.hour) &&
        Number.isInteger(time.minute) &&
        time.hour >= 0 &&
        time.hour <= 23 &&
        time.minute >= 0 &&
        time.minute <= 59
      ) {
        uniqueTimes.set(`${time.hour}:${time.minute}`, time);
      }
    }
    return [...uniqueTimes.values()]
      .sort((left, right) => left.hour * 60 + left.minute - (right.hour * 60 + right.minute))
      .map((time) => ({
        identifier: `${WATER_REMINDER_PREFIX}fixed-${time.hour}-${time.minute}`,
        hour: time.hour,
        minute: time.minute,
        amountMl: amountPerReminder,
      }));
  }

  if (mode === "fixed") {
    for (
      let totalMinutes = startMinutes;
      totalMinutes <= endMinutes;
      totalMinutes += intervalHours
    ) {
      const remainingAmount = dailyGoal - scheduledAmount;

      if (remainingAmount <= 0) {
        break;
      }

      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const amountMl = Math.min(amountPerReminder, remainingAmount);

      occurrences.push({
        identifier: `${WATER_REMINDER_PREFIX}fixed-${hour}-${minute}`,
        hour,
        minute,
        amountMl,
      });
      scheduledAmount += amountMl;
    }

    return occurrences;
  }

  const totalReminders = Math.ceil(dailyGoal / amountPerReminder);
  const availableMinutes = endMinutes - startMinutes;

  if (totalReminders > availableMinutes + 1) {
    throw new Error(
      "The selected time window is too short for the requested number of reminders."
    );
  }

  const intervalMinutes =
    totalReminders === 1 ? 0 : availableMinutes / (totalReminders - 1);

  for (let index = 0; index < totalReminders; index += 1) {
    const totalMinutes = Math.round(startMinutes + index * intervalMinutes);
    const remainingAmount = dailyGoal - scheduledAmount;
    const amountMl = Math.min(amountPerReminder, remainingAmount);

    if (amountMl <= 0) {
      break;
    }

    occurrences.push({
      identifier: `${WATER_REMINDER_PREFIX}${index}`,
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
      amountMl,
    });
    scheduledAmount += amountMl;
  }

  return occurrences;
}

export async function cancelWaterReminders() {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (
        notification.identifier.startsWith(
          WATER_REMINDER_PREFIX
        )
      ) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } finally {
    try {
      await cancelAllWaterVoiceAlarms();
    } catch (error) {
      console.log("Native Water voice companions were not canceled:", error);
    }
  }
}

export async function restoreWaterVoiceCompanionAlarms() {
  try {
    await cancelAllWaterVoiceAlarms();

    if (!(await getVoiceRemindersEnabled())) {
      return;
    }

    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (!notification.identifier.startsWith(WATER_REMINDER_PREFIX)) {
        continue;
      }

      const trigger = notification.trigger as unknown as {
        hour?: number;
        minute?: number;
      };
      const amountMl =
        notification.content.data?.hydromateWaterAmountMl;
      const expectedAtMillis =
        notification.content.data?.hydromateExpectedAtMillis;
      const repeatsDaily = notification.content.data?.hydromateRepeats !== false;
      const storedHour = notification.content.data?.hydromateReminderHour;
      const storedMinute = notification.content.data?.hydromateReminderMinute;
      const hour = typeof trigger.hour === "number" ? trigger.hour : storedHour;
      const minute = typeof trigger.minute === "number" ? trigger.minute : storedMinute;
      if (
        typeof hour !== "number" ||
        typeof minute !== "number" ||
        typeof amountMl !== "number" ||
        !Number.isFinite(amountMl) ||
        amountMl <= 0
      ) {
        continue;
      }

      await scheduleWaterVoiceCompanion(
        notification.identifier,
        hour,
        minute,
        amountMl,
        true,
        typeof expectedAtMillis === "number"
          ? expectedAtMillis
          : getNextDailyOccurrence(hour, minute),
        repeatsDaily
      );
    }
  } catch (error) {
    console.log("Native Water voice companions were not restored:", error);
  }
}

export async function scheduleWaterReminders(
  settings: ReminderSettings
) {
  await cancelWaterReminders();
  const voiceRemindersEnabled = await getVoiceRemindersEnabled();
  const occurrences = getWaterReminderOccurrences(settings);
  let scheduledCount = 0;

  if (hasFiniteDuration(settings)) {
    const permissionStatus = (
      globalThis as typeof globalThis & { __DEV__?: boolean }
    ).__DEV__
      ? (await Notifications.getPermissionsAsync()).status
      : "not-checked";
    const exactOneTimeFireAt = settings.scheduleMode === "once" &&
      Number.isFinite(settings.fireAtMillis)
      ? settings.fireAtMillis
      : undefined;
    const occurrenceDates = exactOneTimeFireAt === undefined
      ? getFiniteReminderDates(settings)
      : [new Date(exactOneTimeFireAt)];
    const finiteOccurrences = exactOneTimeFireAt === undefined
      ? occurrences
      : occurrences.slice(0, 1);
    for (const occurrenceDate of occurrenceDates) {
      for (const occurrence of finiteOccurrences) {
        const { hour, minute, amountMl } = occurrence;
        const expectedAtMillis = exactOneTimeFireAt ?? atLocalReminderTime(
          occurrenceDate, hour, minute
        ).getTime();
        const identifier = getFiniteOccurrenceIdentifier(
          occurrence.identifier,
          occurrenceDate
        );
        const isDevelopment = (
          globalThis as typeof globalThis & { __DEV__?: boolean }
        ).__DEV__;
        if (isDevelopment) {
          console.log(
            `HydroMateReminderSchedule stage=schedule type=water scheduleMode=${settings.scheduleMode ?? "ongoing"} expoId=${identifier} nativeId=${identifier} triggerTimestamp=${expectedAtMillis} repeat=false future=${expectedAtMillis > Date.now()} notificationPermission=${permissionStatus}`
          );
        }
        if (expectedAtMillis <= Date.now()) {
          if (isDevelopment) console.log(`HydroMateReminderSchedule stage=schedule type=water id=${identifier} result=skipped-past`);
          continue;
        }
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: "💧 HydroMate Reminder",
            body: `Time to drink ${amountMl} ml of water!`,
            sound: "default",
            data: {
              hydromateReminderType: "water",
              hydromateWaterAmountMl: amountMl,
              hydromateRootScheduleId: occurrence.identifier,
              hydromateExpectedAtMillis: expectedAtMillis,
              hydromateReminderHour: hour,
              hydromateReminderMinute: minute,
              hydromateRepeats: false,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: expectedAtMillis,
          },
        });
        await scheduleWaterVoiceCompanion(
          identifier,
          hour,
          minute,
          amountMl,
          voiceRemindersEnabled,
          expectedAtMillis,
          false
        );
        if (isDevelopment) console.log(`HydroMateReminderSchedule stage=schedule type=water expoId=${identifier} nativeId=${identifier} result=success`);
        scheduledCount += 1;
      }
    }
    return {
      scheduledCount,
      scheduledAmount: scheduledCount * settings.amountPerReminder,
    };
  }

  for (const occurrence of occurrences) {
    const { identifier, hour, minute, amountMl } = occurrence;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "💧 HydroMate Reminder",
        body: `Time to drink ${amountMl} ml of water!`,
        sound: "default",
        data: {
          hydromateReminderType: "water",
          hydromateWaterAmountMl: amountMl,
        },
      },
      trigger: {
        type:
          Notifications.SchedulableTriggerInputTypes
            .DAILY,
        hour,
        minute,
      },
    });

    await scheduleWaterVoiceCompanion(
      identifier,
      hour,
      minute,
      amountMl,
      voiceRemindersEnabled
    );
    scheduledCount += 1;
  }

  return {
    scheduledCount,
    scheduledAmount: occurrences.reduce(
      (total, occurrence) => total + occurrence.amountMl,
      0
    ),
  };
}

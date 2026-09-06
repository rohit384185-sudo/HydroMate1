import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  cancelAllDatedVoiceAlarms,
  cancelAllMedicineVoiceAlarms,
  cancelAllWaterVoiceAlarms,
  cancelDatedVoiceAlarm,
  cancelMedicineVoiceAlarm,
  scheduleDatedVoiceAlarm,
  scheduleMedicineVoiceAlarm,
  type DatedVoiceReminderType,
} from "../modules/hydromate-voice";
import { canDeliverReminderCategory } from "./reminderCategoryService";
import {
  atLocalReminderTime,
  getFiniteOccurrenceIdentifier,
  getFiniteReminderDates,
  getValidDurationDays,
  hasFiniteDuration,
} from "./reminderDurationService";
import { getVoiceRemindersEnabled } from "./voiceReminderService";

const MEDICINE_REMINDER_PREFIX = "hydromate-medicine-";
const BIRTHDAY_REMINDER_PREFIX = "hydromate-birthday-";
const ANNIVERSARY_REMINDER_PREFIX = "hydromate-anniversary-";
const CUSTOM_REMINDER_PREFIX = "hydromate-custom-";

type DatedReminderType = "birthday" | "anniversary" | "custom";

const DATED_REMINDER_CONFIG = {
  birthday: {
    prefix: BIRTHDAY_REMINDER_PREFIX,
    title: "🎂 Birthday Reminder",
  },
  anniversary: {
    prefix: ANNIVERSARY_REMINDER_PREFIX,
    title: "💍 Anniversary Reminder",
  },
  custom: {
    prefix: CUSTOM_REMINDER_PREFIX,
    title: "📝 Routine Reminder",
  },
} as const;

function hashReminderIdentity(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function getMedicineNotificationIdentifier(
  medicineName: string,
  hour: number,
  minute: number,
  medicineType = "medicine"
) {
  const identity = `${medicineType}|${medicineName.trim().toLowerCase()}|${hour}|${minute}`;

  return `${MEDICINE_REMINDER_PREFIX}${hashReminderIdentity(identity)}`;
}

export function getFiniteMedicineNotificationIdentifier(
  medicineName: string,
  hour: number,
  minute: number,
  medicineType: string,
  occurrenceDate: Date
) {
  return getFiniteOccurrenceIdentifier(
    getMedicineNotificationIdentifier(
      medicineName,
      hour,
      minute,
      medicineType
    ),
    occurrenceDate
  );
}

export function getMedicineSnoozeNotificationIdentifier(
  occurrenceKey: string,
  targetAtMillis: number
) {
  return `${MEDICINE_REMINDER_PREFIX}snooze-${hashReminderIdentity(
    `${occurrenceKey}|${targetAtMillis}`
  )}`;
}

function getDatedReminderNotificationIdentifier(
  reminderType: DatedReminderType,
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  const identity = `${reminderType}|${name.trim().toLowerCase()}|${month}|${day}|${hour}|${minute}`;

  return `${DATED_REMINDER_CONFIG[reminderType].prefix}${hashReminderIdentity(identity)}`;
}

export function getBirthdayNotificationIdentifier(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return getDatedReminderNotificationIdentifier(
    "birthday",
    name,
    month,
    day,
    hour,
    minute
  );
}

export function getAnniversaryNotificationIdentifier(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return getDatedReminderNotificationIdentifier(
    "anniversary",
    name,
    month,
    day,
    hour,
    minute
  );
}

export function getCustomNotificationIdentifier(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return getDatedReminderNotificationIdentifier(
    "custom",
    name,
    month,
    day,
    hour,
    minute
  );
}

export function getFiniteCustomNotificationIdentifier(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number,
  occurrenceDate: Date
) {
  return getFiniteOccurrenceIdentifier(
    getCustomNotificationIdentifier(name, month, day, hour, minute),
    occurrenceDate
  );
}

function isMedicineNotification(
  notification: Notifications.NotificationRequest
) {
  return (
    notification.identifier.startsWith(MEDICINE_REMINDER_PREFIX) ||
    notification.content.data?.hydromateReminderType === "medicine" ||
    notification.content.title === "💊 Medicine Reminder"
  );
}

export async function cancelAllMedicineNotifications() {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (isMedicineNotification(notification)) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } finally {
    try {
      await cancelAllMedicineVoiceAlarms();
    } catch (error) {
      console.log("Native Medicine voice companions were not canceled:", error);
    }
  }
}

function getNextDailyOccurrence(hour: number, minute: number) {
  const now = new Date();
  const occurrence = new Date(now);
  occurrence.setHours(hour, minute, 0, 0);

  if (occurrence.getTime() <= now.getTime()) {
    occurrence.setDate(occurrence.getDate() + 1);
  }

  return occurrence.getTime();
}

function getNextYearlyOccurrence(
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  const now = new Date();

  for (let yearOffset = 0; yearOffset <= 32; yearOffset += 1) {
    const year = now.getFullYear() + yearOffset;
    const occurrence = new Date(year, month - 1, day, hour, minute, 0, 0);
    const isExactDate =
      occurrence.getFullYear() === year &&
      occurrence.getMonth() === month - 1 &&
      occurrence.getDate() === day;

    if (isExactDate && occurrence.getTime() > now.getTime()) {
      return occurrence.getTime();
    }
  }

  throw new Error("Unable to calculate the next yearly reminder occurrence.");
}

async function reconcileDatedVoiceCompanion(
  identifier: string,
  reminderType: DatedVoiceReminderType,
  reminderText: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  try {
    await cancelDatedVoiceAlarm(identifier, reminderType);

    if (await getVoiceRemindersEnabled()) {
      await scheduleDatedVoiceAlarm(
        identifier,
        getNextYearlyOccurrence(month, day, hour, minute),
        reminderType,
        reminderText
      );
    }
  } catch (error) {
    console.log(
      `Native ${reminderType} voice companion was not reconciled:`,
      error
    );
  }
}

export async function restoreMedicineVoiceCompanionAlarms() {
  try {
    await cancelAllMedicineVoiceAlarms();

    if (!(await getVoiceRemindersEnabled())) {
      return;
    }

    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (!isMedicineNotification(notification)) {
        continue;
      }

      const trigger = notification.trigger as unknown as {
        hour?: number;
        minute?: number;
      };
      const medicineName = notification.content.data?.hydromateReminderText;
      const expectedAtMillis =
        notification.content.data?.hydromateExpectedAtMillis;

      if (
        typeof medicineName === "string" &&
        medicineName.length > 0 &&
        typeof expectedAtMillis === "number" &&
        Number.isFinite(expectedAtMillis) &&
        expectedAtMillis > Date.now()
      ) {
        await scheduleMedicineVoiceAlarm(
          notification.identifier,
          expectedAtMillis,
          medicineName,
          notification.content.data?.hydromateRepeats !== false
        );
        continue;
      }

      if (
        typeof trigger.hour !== "number" ||
        typeof trigger.minute !== "number" ||
        typeof medicineName !== "string" ||
        medicineName.length === 0
      ) {
        continue;
      }

      await scheduleMedicineVoiceAlarm(
        notification.identifier,
        getNextDailyOccurrence(trigger.hour, trigger.minute),
        medicineName
      );
    }
  } catch (error) {
    console.log("Native Medicine voice companions were not restored:", error);
  }
}

export async function restoreDatedVoiceCompanionAlarms() {
  try {
    await Promise.all([
      cancelAllDatedVoiceAlarms("birthday"),
      cancelAllDatedVoiceAlarms("anniversary"),
      cancelAllDatedVoiceAlarms("custom"),
    ]);

    if (!(await getVoiceRemindersEnabled())) {
      return;
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      const reminderType = notification.content.data
        ?.hydromateReminderType as DatedVoiceReminderType | undefined;
      if (
        reminderType !== "birthday" &&
        reminderType !== "anniversary" &&
        reminderType !== "custom"
      ) {
        continue;
      }

      const trigger = notification.trigger as unknown as {
        month?: number;
        day?: number;
        hour?: number;
        minute?: number;
      };
      const reminderText = notification.content.data?.hydromateReminderText;
      const expectedAtMillis =
        notification.content.data?.hydromateExpectedAtMillis;
      const repeatsYearly =
        notification.content.data?.hydromateRepeats !== false;
      if (
        typeof expectedAtMillis === "number" &&
        Number.isFinite(expectedAtMillis) &&
        expectedAtMillis > Date.now() &&
        typeof reminderText === "string" &&
        reminderText.length > 0
      ) {
        await scheduleDatedVoiceAlarm(
          notification.identifier,
          expectedAtMillis,
          reminderType,
          reminderText,
          repeatsYearly
        );
        continue;
      }
      if (
        typeof trigger.month !== "number" ||
        typeof trigger.day !== "number" ||
        typeof trigger.hour !== "number" ||
        typeof trigger.minute !== "number" ||
        typeof reminderText !== "string" ||
        reminderText.length === 0
      ) {
        continue;
      }

      await scheduleDatedVoiceAlarm(
        notification.identifier,
        getNextYearlyOccurrence(
          trigger.month + 1,
          trigger.day,
          trigger.hour,
          trigger.minute
        ),
        reminderType,
        reminderText,
        repeatsYearly
      );
    }
  } catch (error) {
    console.log("Native dated voice companions were not restored:", error);
  }
}

function isDatedReminderNotification(
  notification: Notifications.NotificationRequest,
  reminderType: DatedReminderType
) {
  const config = DATED_REMINDER_CONFIG[reminderType];

  return (
    notification.identifier.startsWith(config.prefix) ||
    notification.content.data?.hydromateReminderType === reminderType ||
    notification.content.title === config.title
  );
}

async function cancelAllDatedReminderNotifications(
  reminderType: DatedReminderType
) {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (isDatedReminderNotification(notification, reminderType)) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } finally {
    try {
      await cancelAllDatedVoiceAlarms(reminderType);
    } catch (error) {
      console.log(`Native ${reminderType} voice companions were not canceled:`, error);
    }
  }
}

function getLegacyDatedReminderBody(
  reminderType: DatedReminderType,
  name: string
) {
  if (reminderType === "birthday") {
    return `Today is ${name}'s birthday!`;
  }

  if (reminderType === "anniversary") {
    return `Today is ${name}'s anniversary!`;
  }

  return name;
}

async function cancelDatedReminderNotification(
  reminderType: DatedReminderType,
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  const identifier = getDatedReminderNotificationIdentifier(
    reminderType,
    name,
    month,
    day,
    hour,
    minute
  );
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();
    const legacyBody = getLegacyDatedReminderBody(reminderType, name);

    for (const notification of scheduled) {
      const trigger = notification.trigger as unknown as {
        month?: number;
        day?: number;
        hour?: number;
        minute?: number;
      };
      const isExactIdentifier = notification.identifier === identifier;
      const isExactMetadata =
        notification.content.data?.hydromateReminderScheduleId === identifier ||
        notification.content.data?.hydromateRootScheduleId === identifier;
      const isExactLegacySchedule =
        isDatedReminderNotification(notification, reminderType) &&
        notification.content.body === legacyBody &&
        trigger.month === month - 1 &&
        trigger.day === day &&
        trigger.hour === hour &&
        trigger.minute === minute;

      if (isExactIdentifier || isExactMetadata || isExactLegacySchedule) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
        await cancelDatedVoiceAlarm(notification.identifier, reminderType);
      }
    }
  } finally {
    try {
      await cancelDatedVoiceAlarm(identifier, reminderType);
    } catch (error) {
      console.log(`Native ${reminderType} voice companion was not canceled:`, error);
    }
  }
}

export function cancelAllBirthdayNotifications() {
  return cancelAllDatedReminderNotifications("birthday");
}

export function cancelAllAnniversaryNotifications() {
  return cancelAllDatedReminderNotifications("anniversary");
}

export function cancelAllCustomNotifications() {
  return cancelAllDatedReminderNotifications("custom");
}

export function cancelBirthdayNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return cancelDatedReminderNotification(
    "birthday",
    name,
    month,
    day,
    hour,
    minute
  );
}

export function cancelAnniversaryNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return cancelDatedReminderNotification(
    "anniversary",
    name,
    month,
    day,
    hour,
    minute
  );
}

export function cancelCustomNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return cancelDatedReminderNotification(
    "custom",
    name,
    month,
    day,
    hour,
    minute
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission() {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission was not granted.");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "water-reminders",
      {
        name: "Water Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      }
    );
  }

  return true;
}

export async function sendTestNotification() {
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💧 HydroMate Reminder",
      body: "Time to drink 250 ml of water!",
      sound: "default",
    },

    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
    },
  });
}
export async function scheduleMedicineNotification(
  medicineName: string,
  hour: number,
  minute: number,
  medicineType = "medicine"
) {
  const identifier = getMedicineNotificationIdentifier(
    medicineName,
    hour,
    minute,
    medicineType
  );

  await Notifications.cancelScheduledNotificationAsync(identifier);

  const expoIdentifier = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "💊 Medicine Reminder",
      body: `Time to take ${medicineName}`,
      sound: "default",
      data: {
        hydromateReminderType: "medicine",
        hydromateReminderText: medicineName,
        hydromateMedicineType: medicineType,
        hydromateMedicineScheduleId: identifier,
        hydromateRepeats: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  try {
    await cancelMedicineVoiceAlarm(identifier);

    if (await getVoiceRemindersEnabled()) {
      await scheduleMedicineVoiceAlarm(
        identifier,
        getNextDailyOccurrence(hour, minute),
        medicineName
      );
    }
  } catch (error) {
    console.log("Native Medicine voice companion was not reconciled:", error);
  }

  return expoIdentifier;
}

export async function scheduleFiniteMedicineNotification(
  medicineName: string,
  hour: number,
  minute: number,
  medicineType: string,
  occurrenceDate: Date
) {
  const rootIdentifier = getMedicineNotificationIdentifier(
    medicineName,
    hour,
    minute,
    medicineType
  );
  const identifier = getFiniteMedicineNotificationIdentifier(
    medicineName,
    hour,
    minute,
    medicineType,
    occurrenceDate
  );
  const targetAtMillis = atLocalReminderTime(
    occurrenceDate,
    hour,
    minute
  ).getTime();

  await Notifications.cancelScheduledNotificationAsync(identifier);
  await cancelMedicineVoiceAlarm(identifier);

  if (
    targetAtMillis <= Date.now() ||
    !(await canDeliverReminderCategory("medicine"))
  ) {
    return null;
  }

  const expoIdentifier = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "💊 Medicine Reminder",
      body: `Time to take ${medicineName}`,
      sound: "default",
      data: {
        hydromateReminderType: "medicine",
        hydromateReminderText: medicineName,
        hydromateMedicineType: medicineType,
        hydromateMedicineScheduleId: rootIdentifier,
        hydromateReminderScheduleId: identifier,
        hydromateExpectedAtMillis: targetAtMillis,
        hydromateRepeats: false,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: targetAtMillis,
    },
  });

  try {
    if (await getVoiceRemindersEnabled()) {
      await scheduleMedicineVoiceAlarm(
        identifier,
        targetAtMillis,
        medicineName,
        false
      );
    }
  } catch (error) {
    console.log("Finite Medicine voice companion was not scheduled:", error);
  }

  return expoIdentifier;
}

export async function cancelMedicineSnoozeNotification(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);

  try {
    await cancelMedicineVoiceAlarm(identifier);
  } catch (error) {
    console.log("Native Medicine snooze companion was not canceled:", error);
  }
}

export async function scheduleMedicineSnoozeNotification(
  identifier: string,
  medicineName: string,
  medicineType: string,
  targetAtMillis: number
) {
  await cancelMedicineSnoozeNotification(identifier);

  if (
    targetAtMillis <= Date.now() ||
    !(await canDeliverReminderCategory("medicine"))
  ) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "💊 Medicine Reminder",
      body: `Time to take ${medicineName}`,
      sound: "default",
      data: {
        hydromateReminderType: "medicine",
        hydromateReminderText: medicineName,
        hydromateMedicineType: medicineType,
        hydromateMedicineScheduleId: identifier,
        hydromateMedicineSnooze: true,
        hydromateExpectedAtMillis: targetAtMillis,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: targetAtMillis,
    },
  });

  try {
    if (await getVoiceRemindersEnabled()) {
      await scheduleMedicineVoiceAlarm(
        identifier,
        targetAtMillis,
        medicineName,
        false
      );
    }
  } catch (error) {
    console.log("Native Medicine snooze companion was not scheduled:", error);
  }

  return true;
}
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
export async function scheduleBirthdayNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  const identifier = getBirthdayNotificationIdentifier(
    name,
    month,
    day,
    hour,
    minute
  );

  await Notifications.cancelScheduledNotificationAsync(identifier);

  const expoIdentifier = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "🎂 Birthday Reminder",
      body: `Today is ${name}'s birthday!`,
      sound: "default",
      data: {
        hydromateReminderType: "birthday",
        hydromateReminderText: name,
        hydromateReminderScheduleId: identifier,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: month - 1,
      day,
      hour,
      minute,
    },
  });

  await reconcileDatedVoiceCompanion(
    identifier,
    "birthday",
    name,
    month,
    day,
    hour,
    minute
  );

  return expoIdentifier;
}
export async function scheduleAnniversaryNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  const identifier = getAnniversaryNotificationIdentifier(
    name,
    month,
    day,
    hour,
    minute
  );

  await Notifications.cancelScheduledNotificationAsync(identifier);

  const expoIdentifier = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "💍 Anniversary Reminder",
      body: `Today is ${name}'s anniversary!`,
      sound: "default",
      data: {
        hydromateReminderType: "anniversary",
        hydromateReminderText: name,
        hydromateReminderScheduleId: identifier,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: month - 1,
      day,
      hour,
      minute,
    },
  });

  await reconcileDatedVoiceCompanion(
    identifier,
    "anniversary",
    name,
    month,
    day,
    hour,
    minute
  );

  return expoIdentifier;
}
export async function scheduleCustomNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number,
  durationDays?: number,
  startDate?: string
) {
  const identifier = getCustomNotificationIdentifier(
    name,
    month,
    day,
    hour,
    minute
  );

  if (hasFiniteDuration({ durationDays, startDate })) {
    const identifiers: string[] = [];

    for (const occurrenceDate of getFiniteReminderDates({
      durationDays,
      startDate,
    })) {
      const occurrenceIdentifier = getFiniteCustomNotificationIdentifier(
        name,
        month,
        day,
        hour,
        minute,
        occurrenceDate
      );
      const targetAtMillis = atLocalReminderTime(
        occurrenceDate,
        hour,
        minute
      ).getTime();

      await Notifications.cancelScheduledNotificationAsync(
        occurrenceIdentifier
      );
      await cancelDatedVoiceAlarm(occurrenceIdentifier, "custom");

      if (targetAtMillis <= Date.now()) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: occurrenceIdentifier,
        content: {
          title: "📝 Routine Reminder",
          body: name,
          sound: "default",
          data: {
            hydromateReminderType: "custom",
            hydromateReminderText: name,
            hydromateReminderScheduleId: occurrenceIdentifier,
            hydromateRootScheduleId: identifier,
            hydromateExpectedAtMillis: targetAtMillis,
            hydromateRepeats: false,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetAtMillis,
        },
      });

      try {
        if (await getVoiceRemindersEnabled()) {
          await scheduleDatedVoiceAlarm(
            occurrenceIdentifier,
            targetAtMillis,
            "custom",
            name,
            false
          );
        }
      } catch (error) {
        console.log("Finite Routine voice companion was not scheduled:", error);
      }
      identifiers.push(occurrenceIdentifier);
    }

    return identifiers;
  }

  if (getValidDurationDays(durationDays)) {
    return [];
  }

  await Notifications.cancelScheduledNotificationAsync(identifier);

  const expoIdentifier = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "📝 Routine Reminder",
      body: name,
      sound: "default",
      data: {
        hydromateReminderType: "custom",
        hydromateReminderText: name,
        hydromateReminderScheduleId: identifier,
        hydromateRepeats: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: month - 1,
      day,
      hour,
      minute,
    },
  });

  await reconcileDatedVoiceCompanion(
    identifier,
    "custom",
    name,
    month,
    day,
    hour,
    minute
  );

  return expoIdentifier;
}

export async function cancelAllHydroMateReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } finally {
    try {
      await Promise.all([
        cancelAllWaterVoiceAlarms(),
        cancelAllMedicineVoiceAlarms(),
        cancelAllDatedVoiceAlarms("birthday"),
        cancelAllDatedVoiceAlarms("anniversary"),
        cancelAllDatedVoiceAlarms("custom"),
      ]);
    } catch (error) {
      console.log("Native voice companions were not canceled:", error);
    }
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { writeVerifiedAssistantRecord } from "./assistantConversationRuntime";

import type { AssistantReminderDraft } from "./hydromateAssistantParser";
import { getAssistantOneTimeFireAt } from "./assistantReminderScheduling";
import { getAssistantFirstOccurrenceMap } from "./assistantNextOccurrence";
import type { AssistantReminderReference } from "./reminderPlanModel";
import {
  cancelAllAnniversaryNotifications,
  cancelAllBirthdayNotifications,
  cancelAllCustomNotifications,
  getAnniversaryNotificationIdentifier,
  getBirthdayNotificationIdentifier,
  getCustomNotificationIdentifier,
  getMedicineNotificationIdentifier,
  scheduleAnniversaryNotification,
  scheduleBirthdayNotification,
  scheduleCustomNotification,
} from "./notificationService";
import {
  getCategoryEnabledStates,
  getMasterReminderModeEnabled,
  type ReminderCategory,
} from "./reminderCategoryService";
import { scheduleWaterReminders } from "./reminderService";
import { getLocalDateKey } from "./reminderDurationService";
import {
  parseStoredReminderArray,
  replaceDatedReminderNotifications,
  replaceMedicineNotifications,
  type DatedReminder,
  type DatedReminderIdentifier,
  type DatedReminderScheduler,
  type HealthReminder,
} from "./savedReminderService";

const REMINDER_SETTINGS_KEY = "hydromate-reminder-settings";
const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
const BIRTHDAY_REMINDERS_KEY = "hydromate-birthday-reminders";
const ANNIVERSARY_REMINDERS_KEY = "hydromate-anniversary-reminders";
const CUSTOM_REMINDERS_KEY = "hydromate-custom-reminders";

export type AssistantReminderSaveResult = {
  success: true;
  category: ReminderCategory;
  scheduled: boolean;
  masterEnabled: boolean;
  categoryEnabled: boolean;
  reference: AssistantReminderReference;
};

export type AssistantReminderSaveOptions = {
  confirmationTimestamp?: number;
};

export type { AssistantReminderReference } from "./reminderPlanModel";

type DatedCategory = "birthday" | "anniversary" | "custom";

const DATED_CONFIG: Record<
  DatedCategory,
  {
    storageKey: string;
    cancelAll: () => Promise<void>;
    getIdentifier: DatedReminderIdentifier;
    schedule: DatedReminderScheduler;
  }
> = {
  birthday: {
    storageKey: BIRTHDAY_REMINDERS_KEY,
    cancelAll: cancelAllBirthdayNotifications,
    getIdentifier: getBirthdayNotificationIdentifier,
    schedule: scheduleBirthdayNotification,
  },
  anniversary: {
    storageKey: ANNIVERSARY_REMINDERS_KEY,
    cancelAll: cancelAllAnniversaryNotifications,
    getIdentifier: getAnniversaryNotificationIdentifier,
    schedule: scheduleAnniversaryNotification,
  },
  custom: {
    storageKey: CUSTOM_REMINDERS_KEY,
    cancelAll: cancelAllCustomNotifications,
    getIdentifier: getCustomNotificationIdentifier,
    schedule: scheduleCustomNotification,
  },
};

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

async function getDeliveryState(
  category: ReminderCategory,
  reference: AssistantReminderReference
) {
  const [masterEnabled, categoryStates] = await Promise.all([
    getMasterReminderModeEnabled(),
    getCategoryEnabledStates(),
  ]);
  const categoryEnabled = categoryStates[category];

  return {
    success: true as const,
    category,
    masterEnabled,
    categoryEnabled,
    scheduled: masterEnabled && categoryEnabled,
    reference,
  };
}

function requireTime(draft: AssistantReminderDraft) {
  if (draft.hour === undefined || draft.minute === undefined) {
    throw new Error("Assistant reminder is missing a valid time.");
  }

  return { hour: draft.hour, minute: draft.minute };
}

function getDraftTimes(draft: AssistantReminderDraft) {
  const { hour, minute } = requireTime(draft);
  return draft.times?.length ? draft.times : [{ hour, minute }];
}

function getFiniteDurationDays(draft: AssistantReminderDraft) {
  return draft.scheduleMode === "once" ? 1 : draft.durationDays;
}

function getDraftStartDate(
  draft: AssistantReminderDraft,
  confirmationTimestamp = Date.now()
) {
  const start = draft.scheduleMode === "recurring" && draft.dateSource === "none"
    ? new Date(confirmationTimestamp)
    : new Date(draft.targetAtMillis ?? confirmationTimestamp);
  return getLocalDateKey(start);
}

async function saveMedicineReminder(
  draft: AssistantReminderDraft,
  options: AssistantReminderSaveOptions
) {
  const medicineName = draft.medicineName?.trim();
  const { hour, minute } = requireTime(draft);

  if (!medicineName) {
    throw new Error("Assistant Medicine reminder is missing a name.");
  }

  const medicineType = draft.medicineType ?? "tablet";
  const times = getDraftTimes(draft)
    .map((value) => formatTime(value.hour, value.minute));
  const durationDays = getFiniteDurationDays(draft);
  const confirmationTimestamp = options.confirmationTimestamp ?? Date.now();
  const firstOccurrenceAtByTime =
    draft.scheduleMode === "recurring" && draft.dateSource === "none"
      ? getAssistantFirstOccurrenceMap(getDraftTimes(draft), new Date(confirmationTimestamp))
      : undefined;
  const startDate = durationDays
    ? getDraftStartDate(draft, confirmationTimestamp)
    : undefined;
  const reminders = parseStoredReminderArray<HealthReminder>(
    await AsyncStorage.getItem(HEALTH_REMINDERS_KEY)
  );
  const matchingIndex = reminders.findIndex(
    (reminder) =>
      reminder.type === medicineType &&
      reminder.name.toLocaleLowerCase() === medicineName.toLocaleLowerCase() &&
      reminder.durationDays === durationDays &&
      reminder.startDate === startDate
  );
  const updatedReminders = [...reminders];

  if (matchingIndex >= 0) {
    const matching = reminders[matchingIndex];
    updatedReminders[matchingIndex] = {
      ...matching,
      times: [...new Set([...matching.times, ...times])].sort(),
      ...(firstOccurrenceAtByTime
        ? {
            firstOccurrenceAtByTime: {
              ...matching.firstOccurrenceAtByTime,
              ...firstOccurrenceAtByTime,
            },
          }
        : {}),
    };
  } else {
    updatedReminders.push({
      name: medicineName,
      type: medicineType,
      times,
      ...(firstOccurrenceAtByTime ? { firstOccurrenceAtByTime } : {}),
      ...(durationDays ? { durationDays, startDate } : {}),
    });
  }

  await writeVerifiedAssistantRecord(AsyncStorage,
    HEALTH_REMINDERS_KEY,
    JSON.stringify(updatedReminders)
  );
  const reference: AssistantReminderReference = {
    category: "medicine",
    recordId: times
      .map((value) => {
        const [timeHour, timeMinute] = value.split(":").map(Number);
        return getMedicineNotificationIdentifier(
          medicineName,
          timeHour,
          timeMinute,
          medicineType
        );
      })
      .sort()
      .join(","),
    label: medicineName,
    createdByAssistant: matchingIndex < 0,
  };
  const deliveryState = await getDeliveryState("medicine", reference);

  if (deliveryState.scheduled) {
    await replaceMedicineNotifications(updatedReminders);
  }

  return deliveryState;
}

async function saveDatedReminder(
  category: DatedCategory,
  draft: AssistantReminderDraft,
  options: AssistantReminderSaveOptions
) {
  const name = draft.title?.trim();
  const { hour, minute } = requireTime(draft);

  if (!name || !draft.day || !draft.month) {
    throw new Error("Assistant dated reminder is incomplete.");
  }

  const config = DATED_CONFIG[category];
  const reminders = parseStoredReminderArray<DatedReminder>(
    await AsyncStorage.getItem(config.storageKey)
  );
  const times = category === "custom" ? getDraftTimes(draft) : [{ hour, minute }];
  const durationDays = category === "custom" ? getFiniteDurationDays(draft) : undefined;
  const confirmationTimestamp = options.confirmationTimestamp ?? Date.now();
  const firstOccurrenceAtByTime =
    category === "custom" && draft.scheduleMode === "recurring" && draft.dateSource === "none"
      ? getAssistantFirstOccurrenceMap(times, new Date(confirmationTimestamp))
      : undefined;
  const startDate = durationDays
    ? getDraftStartDate(draft, confirmationTimestamp)
    : undefined;
  const nextIdentifiers = times.map((time) =>
    config.getIdentifier(name, draft.month!, draft.day!, time.hour, time.minute)
  );
  const updatedReminders = [...reminders];
  let addedCount = 0;
  times.forEach((time, index) => {
    const nextReminder: DatedReminder = {
      name,
      day: draft.day!,
      month: draft.month!,
      time: formatTime(time.hour, time.minute),
      ...(firstOccurrenceAtByTime
        ? { firstOccurrenceAtMillis: firstOccurrenceAtByTime[formatTime(time.hour, time.minute)] }
        : {}),
      ...(durationDays ? { durationDays, startDate } : {}),
    };
    const existingIndex = updatedReminders.findIndex((reminder) => {
      const [savedHour, savedMinute] = reminder.time.split(":").map(Number);
      return Number.isInteger(savedHour) && Number.isInteger(savedMinute) &&
        config.getIdentifier(reminder.name, reminder.month, reminder.day, savedHour, savedMinute) === nextIdentifiers[index];
    });
    if (existingIndex >= 0) {
      if (category === "custom") updatedReminders[existingIndex] = nextReminder;
      return;
    }
    updatedReminders.push(nextReminder);
    addedCount += 1;
  });

  await writeVerifiedAssistantRecord(AsyncStorage,
    config.storageKey,
    JSON.stringify(updatedReminders)
  );
  const deliveryState = await getDeliveryState(category, {
    category,
    recordId: nextIdentifiers.sort().join(","),
    label: name,
    createdByAssistant: addedCount > 0,
  });

  if (deliveryState.scheduled) {
    await replaceDatedReminderNotifications(
      updatedReminders,
      config.cancelAll,
      config.getIdentifier,
      config.schedule
    );
  }

  return deliveryState;
}

async function saveWaterSchedule(
  draft: AssistantReminderDraft,
  options: AssistantReminderSaveOptions
) {
  const amount = draft.amountMl;

  if (!amount || amount <= 0) {
    throw new Error("Assistant Water schedule is invalid.");
  }

  const savedSettings = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
  let existingDailyGoal = 4000;
  let existingStartTotalMinutes = 9 * 60;
  let existingEndTotalMinutes = 21 * 60;

  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings) as Record<string, unknown>;
      const parsedGoal = Number(parsed.dailyGoal);
      if (Number.isFinite(parsedGoal) && parsedGoal > 0) {
        existingDailyGoal = parsedGoal;
      }
      const parsedStartHour = Number(parsed.startHour);
      const parsedStartMinute = Number(parsed.startMinute ?? 0);
      if (
        Number.isInteger(parsedStartHour) && parsedStartHour >= 0 && parsedStartHour <= 23 &&
        Number.isInteger(parsedStartMinute) && parsedStartMinute >= 0 && parsedStartMinute <= 59
      ) {
        existingStartTotalMinutes = parsedStartHour * 60 + parsedStartMinute;
      }
      const parsedEndHour = Number(parsed.endHour);
      const parsedEndMinute = Number(parsed.endMinute ?? 0);
      if (
        Number.isInteger(parsedEndHour) && parsedEndHour >= 0 && parsedEndHour <= 23 &&
        Number.isInteger(parsedEndMinute) && parsedEndMinute >= 0 && parsedEndMinute <= 59
      ) {
        existingEndTotalMinutes = parsedEndHour * 60 + parsedEndMinute;
      }
    } catch {
      // Preserve the established default when old settings are malformed.
    }
  }

  const confirmationTimestamp = options.confirmationTimestamp ?? Date.now();
  const fireAtMillis = getAssistantOneTimeFireAt(draft, confirmationTimestamp);
  const fireAt = fireAtMillis === undefined ? undefined : new Date(fireAtMillis);
  const times = (fireAt
    ? [{ hour: fireAt.getHours(), minute: fireAt.getMinutes() }]
    : draft.times?.length
    ? draft.times
    : draft.hour !== undefined && draft.minute !== undefined
      ? [{ hour: draft.hour, minute: draft.minute }]
      : [{
          hour: Math.floor(existingStartTotalMinutes / 60),
          minute: existingStartTotalMinutes % 60,
        }]
  ).sort((left, right) => left.hour * 60 + left.minute - (right.hour * 60 + right.minute));
  const startTotalMinutes = times[0].hour * 60 + times[0].minute;
  const lastTotalMinutes = times[times.length - 1].hour * 60 + times[times.length - 1].minute;
  if (startTotalMinutes >= 23 * 60 + 59 && fireAtMillis === undefined) {
    throw new Error("Assistant Water schedule is invalid.");
  }

  const timesPerDay = draft.timesPerDay ?? times.length;
  const usesAutomaticWaterDistribution =
    draft.scheduleMode === "recurring" &&
    timesPerDay > 1 &&
    times.length !== timesPerDay;
  const safeDistributionEnd = existingEndTotalMinutes > startTotalMinutes
    ? existingEndTotalMinutes
    : startTotalMinutes < 21 * 60
      ? 21 * 60
      : 23 * 60 + 59;
  const endTotalMinutes = usesAutomaticWaterDistribution
    ? safeDistributionEnd
    : Math.min(23 * 60 + 59, Math.max(startTotalMinutes + 1, lastTotalMinutes));
  const durationDays = getFiniteDurationDays(draft);
  const settings = {
    dailyGoal: draft.scheduleMode
      ? amount * (usesAutomaticWaterDistribution ? timesPerDay : times.length)
      : existingDailyGoal,
    amount,
    interval: 1440,
    startHour: times[0].hour,
    startMinute: times[0].minute,
    endHour: Math.floor(endTotalMinutes / 60),
    endMinute: endTotalMinutes % 60,
    mode: usesAutomaticWaterDistribution ? "smart" as const : "fixed" as const,
    ...(usesAutomaticWaterDistribution ? {} : { explicitTimes: times }),
    scheduleMode: draft.scheduleMode,
    ...(fireAtMillis === undefined ? {} : { fireAtMillis }),
    ...(durationDays
      ? {
          durationDays,
          startDate: fireAt ? getLocalDateKey(fireAt) : getDraftStartDate(draft, confirmationTimestamp),
        }
      : {}),
    ...(draft.scheduleMode === "recurring" && draft.dateSource === "none"
      ? { firstOccurrenceAtByTime: getAssistantFirstOccurrenceMap(times, new Date(confirmationTimestamp)) }
      : {}),
  };

  await writeVerifiedAssistantRecord(AsyncStorage,
    REMINDER_SETTINGS_KEY,
    JSON.stringify(settings)
  );
  const deliveryState = await getDeliveryState("water", {
    category: "water",
    recordId: REMINDER_SETTINGS_KEY,
    label: `${amount} ml`,
    createdByAssistant: true,
  });
  const isDevelopment = (
    globalThis as typeof globalThis & { __DEV__?: boolean }
  ).__DEV__;

  if (isDevelopment) {
    console.log(
      `HydroMateReminderSchedule stage=save type=water scheduleMode=${draft.scheduleMode ?? "ongoing"} amountMl=${amount} relativeDurationMinutes=${draft.relativeDurationMinutes ?? "none"} confirmationTimestamp=${confirmationTimestamp} fireAt=${fireAtMillis ?? "none"} masterEnabled=${deliveryState.masterEnabled} categoryEnabled=${deliveryState.categoryEnabled} scheduling=${deliveryState.scheduled ? "allowed" : "blocked"}`
    );
  }

  if (deliveryState.scheduled) {
    try {
      await scheduleWaterReminders({
        dailyGoal: settings.dailyGoal,
        amountPerReminder: settings.amount,
        intervalHours: settings.interval,
        startHour: settings.startHour,
        startMinute: settings.startMinute,
        endHour: settings.endHour,
        endMinute: settings.endMinute,
        mode: settings.mode,
        explicitTimes: settings.explicitTimes,
        scheduleMode: settings.scheduleMode,
        durationDays: settings.durationDays,
        startDate: settings.startDate,
        fireAtMillis: settings.fireAtMillis,
        firstOccurrenceAtByTime: settings.firstOccurrenceAtByTime,
      });
      if (isDevelopment) console.log("HydroMateReminderSchedule stage=save type=water result=success");
    } catch (error) {
      if (isDevelopment) console.log("HydroMateReminderSchedule stage=save type=water result=failure", error);
      throw error;
    }
  }

  return deliveryState;
}

export async function loadKnownMedicineNames() {
  const reminders = parseStoredReminderArray<HealthReminder>(
    await AsyncStorage.getItem(HEALTH_REMINDERS_KEY)
  );

  return reminders.map((reminder) => reminder.name);
}

export async function saveAssistantReminder(
  draft: AssistantReminderDraft,
  options: AssistantReminderSaveOptions = {}
): Promise<AssistantReminderSaveResult> {
  if (draft.category === "medicine") {
    return saveMedicineReminder(draft, options);
  }

  if (draft.category === "water") {
    return saveWaterSchedule(draft, options);
  }

  if (
    draft.category === "birthday" ||
    draft.category === "anniversary" ||
    draft.category === "custom"
  ) {
    return saveDatedReminder(draft.category, draft, options);
  }

  throw new Error("Assistant reminder category is missing.");
}

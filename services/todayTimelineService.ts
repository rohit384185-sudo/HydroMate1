import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TranslationKey } from "../localization/en";
import {
  getMedicineOccurrenceKey,
  loadMedicineOccurrenceActions,
  type MedicineOccurrenceAction,
} from "./medicineOccurrenceActionService";
import {
  getAnniversaryNotificationIdentifier,
  getBirthdayNotificationIdentifier,
  getFiniteCustomNotificationIdentifier,
  getFiniteMedicineNotificationIdentifier,
  getCustomNotificationIdentifier,
  getMedicineNotificationIdentifier,
} from "./notificationService";
import {
  getCategoryEnabledStates,
  getMasterReminderModeEnabled,
  type CategoryEnabledStates,
  type ReminderCategory,
} from "./reminderCategoryService";
import {
  hasFiniteDuration,
  getValidDurationDays,
  isDateWithinFiniteDuration,
  type ReminderDurationFields,
} from "./reminderDurationService";
import {
  getWaterReminderOccurrences,
  type ReminderSettings,
} from "./reminderService";
import { isAssistantOccurrenceStartedForDate } from "./assistantNextOccurrence";

const REMINDER_SETTINGS_KEY = "hydromate-reminder-settings";
const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
const BIRTHDAY_REMINDERS_KEY = "hydromate-birthday-reminders";
const ANNIVERSARY_REMINDERS_KEY = "hydromate-anniversary-reminders";
const CUSTOM_REMINDERS_KEY = "hydromate-custom-reminders";

const TYPE_SORT_ORDER: Record<ReminderCategory, number> = {
  medicine: 1,
  water: 2,
  birthday: 3,
  anniversary: 4,
  custom: 5,
};

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

type StoredMedicineReminder = ReminderDurationFields & {
  name: string;
  type: string;
  times: string[];
  firstOccurrenceAtByTime?: Record<string, number>;
};

type StoredDatedReminder = ReminderDurationFields & {
  name: string;
  day: number;
  month: number;
  time: string;
  firstOccurrenceAtMillis?: number;
};

export type TodayItemStatus =
  | "past"
  | "upcoming"
  | "taken"
  | "skipped"
  | "snoozed";

export type TodayTimelineItem = {
  id: string;
  type: ReminderCategory;
  icon: string;
  title: string;
  subtitle?: string;
  scheduledAt: Date;
  hour: number;
  minute: number;
  status: TodayItemStatus;
  sourceId: string;
  metadata?: Record<string, string | number>;
  medicineAction?: MedicineOccurrenceAction;
};

export type TodayTimelineSnapshot = {
  dateKey: string;
  masterEnabled: boolean;
  categoryStates: CategoryEnabledStates;
  items: TodayTimelineItem[];
};

export type TodayTimelinePartition = {
  items: TodayTimelineItem[];
  pastItems: TodayTimelineItem[];
  nextItem: TodayTimelineItem | null;
  laterItems: TodayTimelineItem[];
};

function getLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseJson(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseTime(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parts = value.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

function parseMedicineReminders(value: string | null) {
  const parsed = parseJson(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is StoredMedicineReminder => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const reminder = item as Record<string, unknown>;

    return (
      typeof reminder.name === "string" &&
      reminder.name.length > 0 &&
      typeof reminder.type === "string" &&
      Array.isArray(reminder.times) &&
      reminder.times.every((time) => typeof time === "string")
    );
  });
}

function parseDatedReminders(value: string | null) {
  const parsed = parseJson(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is StoredDatedReminder => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const reminder = item as Record<string, unknown>;

    return (
      typeof reminder.name === "string" &&
      reminder.name.length > 0 &&
      Number.isInteger(reminder.day) &&
      Number.isInteger(reminder.month) &&
      typeof reminder.time === "string"
    );
  });
}

function parseWaterSettings(value: string | null): ReminderSettings | null {
  const parsed = parseJson(value);

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const settings = parsed as Record<string, unknown>;
  const mode = settings.mode;
  const explicitTimes = Array.isArray(settings.explicitTimes)
    ? settings.explicitTimes
        .map((time) => {
          const value = time as { hour?: unknown; minute?: unknown };
          return { hour: Number(value.hour), minute: Number(value.minute) };
        })
        .filter((time) =>
          Number.isInteger(time.hour) && time.hour >= 0 && time.hour <= 23 &&
          Number.isInteger(time.minute) && time.minute >= 0 && time.minute <= 59
        )
    : undefined;
  const result = {
    dailyGoal: Number(settings.dailyGoal),
    amountPerReminder: Number(settings.amount),
    intervalHours: Number(settings.interval),
    startHour: Number(settings.startHour),
    startMinute: Number(settings.startMinute ?? 0),
    endHour: Number(settings.endHour),
    endMinute: Number(settings.endMinute ?? 0),
    mode,
    ...(explicitTimes?.length ? { explicitTimes } : {}),
    ...(settings.scheduleMode === "once" || settings.scheduleMode === "recurring"
      ? { scheduleMode: settings.scheduleMode }
      : {}),
    ...(Number.isInteger(Number(settings.durationDays))
      ? { durationDays: Number(settings.durationDays) }
      : {}),
    ...(typeof settings.startDate === "string" ? { startDate: settings.startDate } : {}),
    ...(Number.isFinite(Number(settings.fireAtMillis)) ? { fireAtMillis: Number(settings.fireAtMillis) } : {}),
    ...(settings.firstOccurrenceAtByTime && typeof settings.firstOccurrenceAtByTime === "object"
      ? { firstOccurrenceAtByTime: settings.firstOccurrenceAtByTime as Record<string, number> }
      : {}),
  };

  if (
    (mode !== "smart" && mode !== "fixed") ||
    ![
      result.dailyGoal,
      result.amountPerReminder,
      result.intervalHours,
      result.startHour,
      result.startMinute,
      result.endHour,
      result.endMinute,
    ].every((item) => Number.isFinite(item))
  ) {
    return null;
  }

  return result as ReminderSettings;
}

function atLocalTime(date: Date, hour: number, minute: number) {
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

function createItem(
  date: Date,
  now: Date,
  sourceId: string,
  type: ReminderCategory,
  icon: string,
  title: string,
  hour: number,
  minute: number,
  metadata?: Record<string, string | number>
): TodayTimelineItem {
  const scheduledAt = atLocalTime(date, hour, minute);

  return {
    id: `${sourceId}@${getLocalDateKey(date)}`,
    type,
    icon,
    title,
    scheduledAt,
    hour,
    minute,
    status: scheduledAt.getTime() < now.getTime() ? "past" : "upcoming",
    sourceId,
    metadata,
  };
}

function sortTodayItems(left: TodayTimelineItem, right: TodayTimelineItem) {
  return (
    left.scheduledAt.getTime() - right.scheduledAt.getTime() ||
    TYPE_SORT_ORDER[left.type] - TYPE_SORT_ORDER[right.type] ||
    left.sourceId.localeCompare(right.sourceId)
  );
}

export function partitionTodayTimeline(
  sourceItems: TodayTimelineItem[],
  now: Date
): TodayTimelinePartition {
  const items = sourceItems.map((item) => {
    const status = item.medicineAction
      ? item.medicineAction.action
      : item.scheduledAt.getTime() < now.getTime()
        ? "past"
        : "upcoming";

    return { ...item, status } as TodayTimelineItem;
  });
  const pastItems = items.filter(
    (item) => item.scheduledAt.getTime() < now.getTime()
  );
  const futureItems = items.filter(
    (item) => item.scheduledAt.getTime() >= now.getTime()
  );
  const nextItem = futureItems.find((item) => item.status === "upcoming") ?? null;

  return {
    items,
    pastItems,
    nextItem,
    laterItems: futureItems.filter((item) => item.id !== nextItem?.id),
  };
}

export async function loadTodayTimeline(
  now: Date,
  t: Translate
): Promise<TodayTimelineSnapshot> {
  const [masterEnabled, categoryStates, storedValues, medicineActions] =
    await Promise.all([
    getMasterReminderModeEnabled(),
    getCategoryEnabledStates(),
    AsyncStorage.multiGet([
      REMINDER_SETTINGS_KEY,
      HEALTH_REMINDERS_KEY,
      BIRTHDAY_REMINDERS_KEY,
      ANNIVERSARY_REMINDERS_KEY,
      CUSTOM_REMINDERS_KEY,
    ]),
    loadMedicineOccurrenceActions(now.getTime()),
  ]);
  const dateKey = getLocalDateKey(now);

  if (!masterEnabled) {
    return { dateKey, masterEnabled, categoryStates, items: [] };
  }

  const values = Object.fromEntries(storedValues);
  const itemsById = new Map<string, TodayTimelineItem>();
  const medicineItemsByOccurrenceKey = new Map<string, TodayTimelineItem>();
  const savedMedicineScheduleIds = new Set<string>();
  const medicineRemindersByScheduleId = new Map<
    string,
    StoredMedicineReminder
  >();
  const addItem = (item: TodayTimelineItem) => {
    if (!itemsById.has(item.id)) {
      itemsById.set(item.id, item);

      const occurrenceKey = item.metadata?.medicineOccurrenceKey;
      if (item.type === "medicine" && typeof occurrenceKey === "string") {
        medicineItemsByOccurrenceKey.set(occurrenceKey, item);
      }
    }
  };

  if (categoryStates.water) {
    const settings = parseWaterSettings(values[REMINDER_SETTINGS_KEY] ?? null);

    if (settings) {
      try {
        const activeToday = !hasFiniteDuration(settings) ||
          isDateWithinFiniteDuration(settings, now);
        for (const occurrence of activeToday ? getWaterReminderOccurrences(settings) : []) {
          const occurrenceTime = `${String(occurrence.hour).padStart(2, "0")}:${String(occurrence.minute).padStart(2, "0")}`;
          if (!isAssistantOccurrenceStartedForDate(
            settings.firstOccurrenceAtByTime?.[occurrenceTime],
            now
          )) continue;
          const item = createItem(
              now,
              now,
              occurrence.identifier,
              "water",
              "💧",
              t("today.waterTitle", { amount: occurrence.amountMl }),
              occurrence.hour,
              occurrence.minute,
              { amountMl: occurrence.amountMl }
            );
          if (
            settings.scheduleMode === "once" &&
            Number.isFinite(settings.fireAtMillis)
          ) {
            item.scheduledAt = new Date(settings.fireAtMillis!);
            item.hour = item.scheduledAt.getHours();
            item.minute = item.scheduledAt.getMinutes();
            item.status = item.scheduledAt.getTime() < now.getTime() ? "past" : "upcoming";
          }
          addItem(item);
        }
      } catch {
        // Invalid saved Water settings are ignored just as restore does.
      }
    }
  }

  if (categoryStates.medicine) {
    const reminders = parseMedicineReminders(
      values[HEALTH_REMINDERS_KEY] ?? null
    );

    for (const reminder of reminders) {
      const hasMalformedFiniteDuration =
        Boolean(getValidDurationDays(reminder.durationDays)) &&
        !hasFiniteDuration(reminder);
      const occursToday =
        !hasMalformedFiniteDuration &&
        (!hasFiniteDuration(reminder) ||
          isDateWithinFiniteDuration(reminder, now));
      for (const value of reminder.times) {
        const time = parseTime(value);

        if (!time) {
          continue;
        }

        const sourceId = getMedicineNotificationIdentifier(
          reminder.name,
          time.hour,
          time.minute,
          reminder.type
        );
        const scheduledAt = atLocalTime(now, time.hour, time.minute);
        medicineRemindersByScheduleId.set(sourceId, reminder);
        savedMedicineScheduleIds.add(sourceId);

        if (
          !occursToday ||
          !isAssistantOccurrenceStartedForDate(
            reminder.firstOccurrenceAtByTime?.[value],
            now
          )
        ) {
          continue;
        }

        const occurrenceKey = getMedicineOccurrenceKey(
          sourceId,
          scheduledAt.getTime()
        );
        const oneTimeNotificationIdentifier = hasFiniteDuration(reminder)
          ? getFiniteMedicineNotificationIdentifier(
              reminder.name,
              time.hour,
              time.minute,
              reminder.type,
              now
            )
          : undefined;
        addItem(
          createItem(
            now,
            now,
            sourceId,
            "medicine",
            "💊",
            reminder.name,
            time.hour,
            time.minute,
            {
              medicineName: reminder.name,
              medicineType: reminder.type,
              medicineOccurrenceKey: occurrenceKey,
              rootMedicineScheduleId: sourceId,
              ...(oneTimeNotificationIdentifier
                ? { oneTimeNotificationIdentifier }
                : {}),
            }
          )
        );
      }
    }
  }

  const datedDefinitions = [
    {
      type: "birthday" as const,
      key: BIRTHDAY_REMINDERS_KEY,
      icon: "🎂",
      titleKey: "today.birthdayTitle" as const,
      getIdentifier: getBirthdayNotificationIdentifier,
    },
    {
      type: "anniversary" as const,
      key: ANNIVERSARY_REMINDERS_KEY,
      icon: "💍",
      titleKey: "today.anniversaryTitle" as const,
      getIdentifier: getAnniversaryNotificationIdentifier,
    },
    {
      type: "custom" as const,
      key: CUSTOM_REMINDERS_KEY,
      icon: "📝",
      titleKey: null,
      getIdentifier: getCustomNotificationIdentifier,
    },
  ];

  for (const definition of datedDefinitions) {
    if (!categoryStates[definition.type]) {
      continue;
    }

    const reminders = parseDatedReminders(values[definition.key] ?? null);

    for (const reminder of reminders) {
      if (
        definition.type === "custom" &&
        getValidDurationDays(reminder.durationDays) &&
        !hasFiniteDuration(reminder)
      ) {
        continue;
      }
      const finiteRoutine =
        definition.type === "custom" && hasFiniteDuration(reminder);
      const occursToday = finiteRoutine
        ? isDateWithinFiniteDuration(reminder, now)
        : reminder.month === now.getMonth() + 1 &&
          reminder.day === now.getDate();

      if (!occursToday) {
        continue;
      }

      const time = parseTime(reminder.time);

      if (!time) {
        continue;
      }
      if (
        definition.type === "custom" &&
        !isAssistantOccurrenceStartedForDate(
          reminder.firstOccurrenceAtMillis,
          now
        )
      ) continue;

      const rootSourceId = definition.getIdentifier(
        reminder.name,
        reminder.month,
        reminder.day,
        time.hour,
        time.minute
      );
      const sourceId = finiteRoutine
        ? getFiniteCustomNotificationIdentifier(
            reminder.name,
            reminder.month,
            reminder.day,
            time.hour,
            time.minute,
            now
          )
        : rootSourceId;
      const title = definition.titleKey
        ? t(definition.titleKey, { name: reminder.name })
        : reminder.name;

      addItem(
        createItem(
          now,
          now,
          sourceId,
          definition.type,
          definition.icon,
          title,
          time.hour,
          time.minute,
          {
            name: reminder.name,
            day: reminder.day,
            month: reminder.month,
            ...(finiteRoutine
              ? { rootScheduleId: rootSourceId }
              : {}),
          }
        )
      );
    }
  }

  if (categoryStates.medicine) {
    const isValidSavedOccurrence = (action: MedicineOccurrenceAction) => {
      const reminder = medicineRemindersByScheduleId.get(
        action.rootMedicineScheduleId
      );

      if (!reminder) {
        return false;
      }
      if (hasFiniteDuration(reminder)) {
        return isDateWithinFiniteDuration(
          reminder,
          new Date(action.scheduledAtMillis)
        );
      }
      return !getValidDurationDays(reminder.durationDays);
    };

    for (const action of medicineActions) {
      if (
        action.action !== "snoozed" ||
        !action.snoozeTargetAtMillis ||
        !action.snoozeNotificationIdentifier ||
        !savedMedicineScheduleIds.has(action.rootMedicineScheduleId) ||
        !isValidSavedOccurrence(action)
      ) {
        continue;
      }

      const snoozeTarget = new Date(action.snoozeTargetAtMillis);

      if (getLocalDateKey(snoozeTarget) !== dateKey) {
        continue;
      }

      const occurrenceKey = getMedicineOccurrenceKey(
        action.snoozeNotificationIdentifier,
        action.snoozeTargetAtMillis
      );
      addItem(
        createItem(
          now,
          now,
          action.snoozeNotificationIdentifier,
          "medicine",
          "💊",
          action.medicineName,
          snoozeTarget.getHours(),
          snoozeTarget.getMinutes(),
          {
            medicineName: action.medicineName,
            medicineType: action.medicineType,
            medicineOccurrenceKey: occurrenceKey,
            rootMedicineScheduleId: action.rootMedicineScheduleId,
            oneTimeNotificationIdentifier:
              action.snoozeNotificationIdentifier,
            isSnooze: 1,
          }
        )
      );
      const snoozeItem = medicineItemsByOccurrenceKey.get(occurrenceKey);
      if (snoozeItem) {
        snoozeItem.scheduledAt = snoozeTarget;
        snoozeItem.subtitle = t("today.snoozedReminder");
      }
    }

    for (const action of medicineActions) {
      if (
        !savedMedicineScheduleIds.has(action.rootMedicineScheduleId) ||
        !isValidSavedOccurrence(action)
      ) {
        continue;
      }

      const item = medicineItemsByOccurrenceKey.get(action.occurrenceKey);

      if (item) {
        item.medicineAction = action;
        item.status = action.action;
      }
    }
  }

  return {
    dateKey,
    masterEnabled,
    categoryStates,
    items: Array.from(itemsById.values()).sort(sortTodayItems),
  };
}

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cancelMedicineSnoozeNotification,
  getMedicineNotificationIdentifier,
  getMedicineSnoozeNotificationIdentifier,
  scheduleFiniteMedicineNotification,
  scheduleMedicineSnoozeNotification,
} from "./notificationService";
import {
  getValidDurationDays,
  hasFiniteDuration,
  isDateWithinFiniteDuration,
  type ReminderDurationFields,
} from "./reminderDurationService";

export const MEDICINE_ACTION_HISTORY_STORAGE_KEY =
  "hydromate-medicine-action-history";

const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
const RETENTION_DAYS = 90;
const RETENTION_MILLIS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type MedicineOccurrenceActionType = "taken" | "skipped" | "snoozed";

export type MedicineOccurrenceAction = {
  occurrenceKey: string;
  medicineScheduleId: string;
  rootMedicineScheduleId: string;
  medicineName: string;
  medicineType: string;
  scheduledAtMillis: number;
  action: MedicineOccurrenceActionType;
  actionAtMillis: number;
  snoozeTargetAtMillis?: number;
  snoozeNotificationIdentifier?: string;
  oneTimeNotificationIdentifier?: string;
};

export type MedicineOccurrenceIdentity = {
  medicineScheduleId: string;
  rootMedicineScheduleId: string;
  medicineName: string;
  medicineType: string;
  scheduledAtMillis: number;
  oneTimeNotificationIdentifier?: string;
};

type StoredMedicineReminder = ReminderDurationFields & {
  name: string;
  type: string;
  times: string[];
};

function getLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getMedicineOccurrenceKey(
  medicineScheduleId: string,
  scheduledAtMillis: number
) {
  const scheduledAt = new Date(scheduledAtMillis);
  const time = [
    String(scheduledAt.getHours()).padStart(2, "0"),
    String(scheduledAt.getMinutes()).padStart(2, "0"),
  ].join(":");

  return `${medicineScheduleId}|${getLocalDateKey(scheduledAt)}|${time}`;
}

function isMedicineOccurrenceAction(
  value: unknown
): value is MedicineOccurrenceAction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const action = value as Record<string, unknown>;

  return (
    typeof action.occurrenceKey === "string" &&
    typeof action.medicineScheduleId === "string" &&
    typeof action.rootMedicineScheduleId === "string" &&
    typeof action.medicineName === "string" &&
    typeof action.medicineType === "string" &&
    typeof action.scheduledAtMillis === "number" &&
    Number.isFinite(action.scheduledAtMillis) &&
    (action.action === "taken" ||
      action.action === "skipped" ||
      action.action === "snoozed") &&
    typeof action.actionAtMillis === "number" &&
    Number.isFinite(action.actionAtMillis) &&
    (action.snoozeTargetAtMillis === undefined ||
      (typeof action.snoozeTargetAtMillis === "number" &&
        Number.isFinite(action.snoozeTargetAtMillis))) &&
    (action.snoozeNotificationIdentifier === undefined ||
      typeof action.snoozeNotificationIdentifier === "string") &&
    (action.oneTimeNotificationIdentifier === undefined ||
      typeof action.oneTimeNotificationIdentifier === "string")
  );
}

function retainRecentActions(
  actions: MedicineOccurrenceAction[],
  nowMillis: number
) {
  const cutoff = nowMillis - RETENTION_MILLIS;

  return actions.filter(
    (action) =>
      Math.max(
        action.scheduledAtMillis,
        action.actionAtMillis,
        action.snoozeTargetAtMillis ?? 0
      ) >= cutoff
  );
}

async function writeMedicineOccurrenceActions(
  actions: MedicineOccurrenceAction[],
  nowMillis = Date.now()
) {
  const retainedActions = retainRecentActions(actions, nowMillis);
  await AsyncStorage.setItem(
    MEDICINE_ACTION_HISTORY_STORAGE_KEY,
    JSON.stringify(retainedActions)
  );
  return retainedActions;
}

export async function loadMedicineOccurrenceActions(
  nowMillis = Date.now()
): Promise<MedicineOccurrenceAction[]> {
  const storedValue = await AsyncStorage.getItem(
    MEDICINE_ACTION_HISTORY_STORAGE_KEY
  );

  if (!storedValue) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(storedValue) as unknown;
  } catch {
    await writeMedicineOccurrenceActions([], nowMillis);
    return [];
  }

  const validActions = Array.isArray(parsed)
    ? parsed.filter(isMedicineOccurrenceAction)
    : [];
  const retainedActions = retainRecentActions(validActions, nowMillis);

  if (
    !Array.isArray(parsed) ||
    retainedActions.length !== parsed.length
  ) {
    await writeMedicineOccurrenceActions(retainedActions, nowMillis);
  }

  return retainedActions;
}

async function upsertMedicineOccurrenceAction(
  nextAction: MedicineOccurrenceAction
) {
  const actions = await loadMedicineOccurrenceActions(nextAction.actionAtMillis);
  const nextActions = actions.filter(
    (action) => action.occurrenceKey !== nextAction.occurrenceKey
  );
  nextActions.push(nextAction);
  await writeMedicineOccurrenceActions(nextActions, nextAction.actionAtMillis);
  return nextAction;
}

export async function markMedicineOccurrence(
  identity: MedicineOccurrenceIdentity,
  action: "taken" | "skipped",
  actionAtMillis = Date.now()
) {
  if (identity.oneTimeNotificationIdentifier) {
    await cancelMedicineSnoozeNotification(
      identity.oneTimeNotificationIdentifier
    );
  }

  return upsertMedicineOccurrenceAction({
    occurrenceKey: getMedicineOccurrenceKey(
      identity.medicineScheduleId,
      identity.scheduledAtMillis
    ),
    medicineScheduleId: identity.medicineScheduleId,
    rootMedicineScheduleId: identity.rootMedicineScheduleId,
    medicineName: identity.medicineName,
    medicineType: identity.medicineType,
    scheduledAtMillis: identity.scheduledAtMillis,
    action,
    actionAtMillis,
    oneTimeNotificationIdentifier: identity.oneTimeNotificationIdentifier,
  });
}

export async function snoozeMedicineOccurrence(
  identity: MedicineOccurrenceIdentity,
  durationMinutes: 5 | 10 | 15 | 30,
  actionAtMillis = Date.now()
) {
  if (identity.oneTimeNotificationIdentifier) {
    await cancelMedicineSnoozeNotification(
      identity.oneTimeNotificationIdentifier
    );
  }

  const occurrenceKey = getMedicineOccurrenceKey(
    identity.medicineScheduleId,
    identity.scheduledAtMillis
  );
  const snoozeTargetAtMillis =
    actionAtMillis + durationMinutes * 60 * 1000;
  const snoozeNotificationIdentifier =
    getMedicineSnoozeNotificationIdentifier(
      occurrenceKey,
      snoozeTargetAtMillis
    );
  const scheduled = await scheduleMedicineSnoozeNotification(
    snoozeNotificationIdentifier,
    identity.medicineName,
    identity.medicineType,
    snoozeTargetAtMillis
  );

  if (!scheduled) {
    throw new Error("Medicine reminders are currently disabled.");
  }

  return upsertMedicineOccurrenceAction({
    occurrenceKey,
    medicineScheduleId: identity.medicineScheduleId,
    rootMedicineScheduleId: identity.rootMedicineScheduleId,
    medicineName: identity.medicineName,
    medicineType: identity.medicineType,
    scheduledAtMillis: identity.scheduledAtMillis,
    action: "snoozed",
    actionAtMillis,
    snoozeTargetAtMillis,
    snoozeNotificationIdentifier,
    oneTimeNotificationIdentifier: identity.oneTimeNotificationIdentifier,
  });
}

function parseStoredMedicineReminders(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

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
        typeof reminder.type === "string" &&
        Array.isArray(reminder.times) &&
        reminder.times.every((time) => typeof time === "string")
      );
    });
  } catch {
    return [];
  }
}

async function getSavedMedicineSchedules() {
  const reminders = parseStoredMedicineReminders(
    await AsyncStorage.getItem(HEALTH_REMINDERS_KEY)
  );
  const schedules = new Map<string, StoredMedicineReminder>();

  for (const reminder of reminders) {
    for (const value of reminder.times) {
      const [hour, minute] = value.split(":").map(Number);

      if (
        Number.isInteger(hour) &&
        hour >= 0 &&
        hour <= 23 &&
        Number.isInteger(minute) &&
        minute >= 0 &&
        minute <= 59
      ) {
        schedules.set(
          getMedicineNotificationIdentifier(
            reminder.name,
            hour,
            minute,
            reminder.type
          ),
          reminder
        );
      }
    }
  }

  return schedules;
}

function isSavedMedicineOccurrence(
  action: MedicineOccurrenceAction,
  schedules: Map<string, StoredMedicineReminder>
) {
  const reminder = schedules.get(action.rootMedicineScheduleId);

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
}

export async function restorePendingMedicineSnoozes(
  nowMillis = Date.now()
) {
  const [actions, savedMedicineSchedules] = await Promise.all([
    loadMedicineOccurrenceActions(nowMillis),
    getSavedMedicineSchedules(),
  ]);
  const actionKeys = new Set(actions.map((action) => action.occurrenceKey));

  for (const action of actions) {
    if (
      action.action !== "snoozed" ||
      !action.snoozeTargetAtMillis ||
      action.snoozeTargetAtMillis <= nowMillis ||
      !action.snoozeNotificationIdentifier ||
      !isSavedMedicineOccurrence(action, savedMedicineSchedules)
    ) {
      continue;
    }

    const snoozeOccurrenceKey = getMedicineOccurrenceKey(
      action.snoozeNotificationIdentifier,
      action.snoozeTargetAtMillis
    );

    if (actionKeys.has(snoozeOccurrenceKey)) {
      continue;
    }

    await scheduleMedicineSnoozeNotification(
      action.snoozeNotificationIdentifier,
      action.medicineName,
      action.medicineType,
      action.snoozeTargetAtMillis
    );
  }
}

export async function undoMedicineOccurrenceAction(occurrenceKey: string) {
  const actions = await loadMedicineOccurrenceActions();
  const actionToRemove = actions.find(
    (action) => action.occurrenceKey === occurrenceKey
  );

  if (actionToRemove?.snoozeNotificationIdentifier) {
    await cancelMedicineSnoozeNotification(
      actionToRemove.snoozeNotificationIdentifier
    );
  }

  if (
    actionToRemove?.oneTimeNotificationIdentifier &&
    actionToRemove.scheduledAtMillis > Date.now()
  ) {
    const scheduledAt = new Date(actionToRemove.scheduledAtMillis);
    await scheduleFiniteMedicineNotification(
      actionToRemove.medicineName,
      scheduledAt.getHours(),
      scheduledAt.getMinutes(),
      actionToRemove.medicineType,
      scheduledAt
    );
  }

  await writeMedicineOccurrenceActions(
    actions.filter((action) => action.occurrenceKey !== occurrenceKey)
  );
  await restorePendingMedicineSnoozes();
}

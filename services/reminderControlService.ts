import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cancelAllAnniversaryNotifications,
  cancelAllBirthdayNotifications,
  cancelAllCustomNotifications,
  cancelAllHydroMateReminders,
  cancelAllMedicineNotifications,
  getAnniversaryNotificationIdentifier,
  getBirthdayNotificationIdentifier,
  getCustomNotificationIdentifier,
  scheduleAnniversaryNotification,
  scheduleBirthdayNotification,
  scheduleCustomNotification,
} from "./notificationService";
import {
  getCategoryEnabledStates,
  getCategoryReconciliationActions,
  getMasterReminderModeEnabled,
  REMINDER_MODE_STORAGE_KEY,
  setReminderCategoryEnabled,
  type CategoryEnabledStates,
  type ReminderCategory,
} from "./reminderCategoryService";
import { cancelWaterReminders, scheduleWaterReminders } from "./reminderService";
import {
  parseStoredReminderArray,
  replaceDatedReminderNotifications,
  replaceMedicineNotifications,
  type DatedReminder,
  type HealthReminder,
} from "./savedReminderService";

const REMINDER_SETTINGS_KEY = "hydromate-reminder-settings";
const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
const BIRTHDAY_REMINDERS_KEY = "hydromate-birthday-reminders";
const ANNIVERSARY_REMINDERS_KEY = "hydromate-anniversary-reminders";
const CUSTOM_REMINDERS_KEY = "hydromate-custom-reminders";

export type ReminderCategorySnapshot = Partial<{
  medicine: HealthReminder[];
  birthday: DatedReminder[];
  anniversary: DatedReminder[];
  custom: DatedReminder[];
}>;

export async function restoreWaterReminderCategory() {
  const savedWaterSettings = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);

  if (!savedWaterSettings) {
    await cancelWaterReminders();
    return;
  }

  const settings = JSON.parse(savedWaterSettings);
  const dailyGoal = Number(settings.dailyGoal);
  const amount = Number(settings.amount);
  const interval = Number(settings.interval);
  const startHour = Number(settings.startHour);
  const startMinute = Number(settings.startMinute ?? 0);
  const endHour = Number(settings.endHour);
  const endMinute = Number(settings.endMinute ?? 0);
  const mode = settings.mode;
  const fireAtMillis = Number(settings.fireAtMillis);
  const hasExactOneTimeFireAt = settings.scheduleMode === "once" &&
    Number.isFinite(fireAtMillis);
  const explicitTimes = Array.isArray(settings.explicitTimes)
    ? settings.explicitTimes
        .map((time: unknown) => {
          const value = time as { hour?: unknown; minute?: unknown };
          return { hour: Number(value?.hour), minute: Number(value?.minute) };
        })
        .filter((time: { hour: number; minute: number }) =>
          Number.isInteger(time.hour) && time.hour >= 0 && time.hour <= 23 &&
          Number.isInteger(time.minute) && time.minute >= 0 && time.minute <= 59
        )
    : undefined;
  const valid =
    [dailyGoal, amount, interval, startHour, startMinute, endHour, endMinute].every(
      Number.isFinite
    ) &&
    dailyGoal > 0 &&
    amount > 0 &&
    Number.isInteger(startHour) &&
    Number.isInteger(startMinute) &&
    Number.isInteger(endHour) &&
    Number.isInteger(endMinute) &&
    startHour >= 0 &&
    startHour <= 23 &&
    startMinute >= 0 &&
    startMinute <= 59 &&
    endHour >= 0 &&
    endHour <= 23 &&
    endMinute >= 0 &&
    endMinute <= 59 &&
    (hasExactOneTimeFireAt || startHour * 60 + startMinute < endHour * 60 + endMinute) &&
    (mode === "smart" || mode === "fixed") &&
    (mode === "smart" || interval > 0);

  if (!valid) {
    await cancelWaterReminders();
    return;
  }

  await scheduleWaterReminders({
    dailyGoal,
    amountPerReminder: amount,
    intervalHours: interval,
    startHour,
    startMinute,
    endHour,
    endMinute,
    mode,
    ...(explicitTimes?.length ? { explicitTimes } : {}),
    ...(typeof settings.scheduleMode === "string"
      ? { scheduleMode: settings.scheduleMode as "once" | "recurring" }
      : {}),
    ...(Number.isInteger(Number(settings.durationDays))
      ? { durationDays: Number(settings.durationDays) }
      : {}),
    ...(typeof settings.startDate === "string"
      ? { startDate: settings.startDate }
      : {}),
    ...(Number.isFinite(fireAtMillis)
      ? { fireAtMillis }
      : {}),
  });
}

async function loadCategoryReminders(category: ReminderCategory) {
  const storageKey =
    category === "medicine"
      ? HEALTH_REMINDERS_KEY
      : category === "birthday"
        ? BIRTHDAY_REMINDERS_KEY
        : category === "anniversary"
          ? ANNIVERSARY_REMINDERS_KEY
          : CUSTOM_REMINDERS_KEY;
  return AsyncStorage.getItem(storageKey);
}

export async function reconcileReminderCategory(
  category: ReminderCategory,
  enabled: boolean,
  masterEnabled: boolean,
  snapshot: ReminderCategorySnapshot = {}
) {
  if (!masterEnabled) return;

  if (category === "water") {
    if (enabled) await restoreWaterReminderCategory();
    else await cancelWaterReminders();
    return;
  }

  if (category === "medicine") {
    if (!enabled) {
      await cancelAllMedicineNotifications();
      return;
    }
    const reminders =
      snapshot.medicine ??
      parseStoredReminderArray<HealthReminder>(await loadCategoryReminders(category));
    await replaceMedicineNotifications(reminders);
    return;
  }

  const cancel =
    category === "birthday"
      ? cancelAllBirthdayNotifications
      : category === "anniversary"
        ? cancelAllAnniversaryNotifications
        : cancelAllCustomNotifications;
  if (!enabled) {
    await cancel();
    return;
  }

  const reminders =
    snapshot[category] ??
    parseStoredReminderArray<DatedReminder>(await loadCategoryReminders(category));
  if (category === "birthday") {
    await replaceDatedReminderNotifications(
      reminders,
      cancelAllBirthdayNotifications,
      getBirthdayNotificationIdentifier,
      scheduleBirthdayNotification
    );
  } else if (category === "anniversary") {
    await replaceDatedReminderNotifications(
      reminders,
      cancelAllAnniversaryNotifications,
      getAnniversaryNotificationIdentifier,
      scheduleAnniversaryNotification
    );
  } else {
    await replaceDatedReminderNotifications(
      reminders,
      cancelAllCustomNotifications,
      getCustomNotificationIdentifier,
      scheduleCustomNotification
    );
  }
}

export async function reconcileSavedReminderCategories(masterEnabled: boolean) {
  const categoryStates = await getCategoryEnabledStates();
  const categoryActions = getCategoryReconciliationActions(
    masterEnabled,
    categoryStates
  );

  if (!masterEnabled) {
    await cancelAllHydroMateReminders();
    return categoryStates;
  }

  for (const category of Object.keys(categoryActions) as ReminderCategory[]) {
    await reconcileReminderCategory(
      category,
      categoryActions[category] === "restore",
      true
    );
  }
  return categoryStates;
}

export async function setMasterReminderControlEnabled(enabled: boolean) {
  await AsyncStorage.setItem(REMINDER_MODE_STORAGE_KEY, JSON.stringify(enabled));
  return reconcileSavedReminderCategories(enabled);
}

export async function setCategoryReminderControlEnabled(
  category: ReminderCategory,
  enabled: boolean,
  snapshot: ReminderCategorySnapshot = {}
) {
  await setReminderCategoryEnabled(category, enabled);
  const masterEnabled = await getMasterReminderModeEnabled();
  await reconcileReminderCategory(category, enabled, masterEnabled, snapshot);
  return masterEnabled;
}

export async function loadReminderControlState(): Promise<{
  masterEnabled: boolean;
  categories: CategoryEnabledStates;
}> {
  const [masterEnabled, categories] = await Promise.all([
    getMasterReminderModeEnabled(),
    getCategoryEnabledStates(),
  ]);
  return { masterEnabled, categories };
}

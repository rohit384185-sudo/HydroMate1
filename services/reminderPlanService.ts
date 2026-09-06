import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cancelAllAnniversaryNotifications,
  cancelAllBirthdayNotifications,
  cancelAllCustomNotifications,
  cancelAllMedicineNotifications,
  getAnniversaryNotificationIdentifier,
  getBirthdayNotificationIdentifier,
  getCustomNotificationIdentifier,
  getMedicineNotificationIdentifier,
  scheduleAnniversaryNotification,
  scheduleBirthdayNotification,
  scheduleCustomNotification,
} from "./notificationService";
import { canDeliverReminderCategory } from "./reminderCategoryService";
import { getLocalDateKey } from "./reminderDurationService";
import { cancelWaterReminders, scheduleWaterReminders } from "./reminderService";
import {
  archiveReminderPlanRecord,
  continueReminderPlanRecord,
  createReminderPlanRecord,
  getReminderPlanProgress,
  updateReminderPlanReferenceRecord,
  type ReminderPlan,
  type AssistantReminderReference,
} from "./reminderPlanModel";
import {
  parseStoredReminderArray,
  replaceDatedReminderNotifications,
  replaceMedicineNotifications,
  type DatedReminder,
  type DatedReminderIdentifier,
  type DatedReminderScheduler,
  type HealthReminder,
} from "./savedReminderService";

export const REMINDER_PLANS_STORAGE_KEY = "hydromate-reminder-plans";
const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
const DATED_KEYS = {
  birthday: "hydromate-birthday-reminders",
  anniversary: "hydromate-anniversary-reminders",
  custom: "hydromate-custom-reminders",
} as const;

export { getReminderPlanProgress } from "./reminderPlanModel";
export type { ReminderPlan, ReminderPlanStatus } from "./reminderPlanModel";

export async function loadReminderPlans(now = new Date()) {
  const plans = parseStoredReminderArray<ReminderPlan>(
    await AsyncStorage.getItem(REMINDER_PLANS_STORAGE_KEY)
  );
  let changed = false;
  const reconciled = plans.map((plan) => {
    const progress = getReminderPlanProgress(plan, now);
    if (plan.status === "active" && progress?.finished) {
      changed = true;
      return { ...plan, status: "finished" as const };
    }
    return plan;
  });
  if (changed) {
    await AsyncStorage.setItem(REMINDER_PLANS_STORAGE_KEY, JSON.stringify(reconciled));
  }
  return reconciled;
}

export async function createReminderPlan(
  name: string,
  reminderReferences: AssistantReminderReference[],
  durationDays = 30,
  now = new Date()
) {
  const plans = await loadReminderPlans(now);
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const referenceKeys = reminderReferences
    .map((reference) => `${reference.category}|${reference.recordId}`)
    .sort()
    .join(";");
  const existing = plans.find((plan) =>
    plan.status !== "archived" &&
    plan.startDate === getLocalDateKey(startDate) &&
    plan.durationDays === durationDays &&
    plan.reminderReferences
      .map((reference) => `${reference.category}|${reference.recordId}`)
      .sort()
      .join(";") === referenceKeys
  );
  if (existing) return existing;
  const plan = createReminderPlanRecord(
    name,
    reminderReferences,
    durationDays,
    now,
    new Date().toISOString()
  );
  await AsyncStorage.setItem(
    REMINDER_PLANS_STORAGE_KEY,
    JSON.stringify([...plans, plan])
  );
  return plan;
}

async function persistPlanUpdate(updatedPlan: ReminderPlan) {
  const plans = await loadReminderPlans();
  await AsyncStorage.setItem(
    REMINDER_PLANS_STORAGE_KEY,
    JSON.stringify(plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)))
  );
  return updatedPlan;
}

export async function updateReminderPlanReferences(
  plan: ReminderPlan,
  reminderReferences: AssistantReminderReference[]
) {
  return persistPlanUpdate(
    updateReminderPlanReferenceRecord(plan, reminderReferences)
  );
}

async function reconcileCategory(category: AssistantReminderReference["category"]) {
  if (category === "medicine") {
    const reminders = parseStoredReminderArray<HealthReminder>(
      await AsyncStorage.getItem(HEALTH_REMINDERS_KEY)
    );
    if (await canDeliverReminderCategory("medicine")) {
      await replaceMedicineNotifications(reminders);
    } else {
      await cancelAllMedicineNotifications();
    }
    return;
  }
  if (category === "water") return;
  const config: {
    cancelAll: () => Promise<void>;
    getIdentifier: DatedReminderIdentifier;
    schedule: DatedReminderScheduler;
  } = {
    birthday: { cancelAll: cancelAllBirthdayNotifications, getIdentifier: getBirthdayNotificationIdentifier, schedule: scheduleBirthdayNotification },
    anniversary: { cancelAll: cancelAllAnniversaryNotifications, getIdentifier: getAnniversaryNotificationIdentifier, schedule: scheduleAnniversaryNotification },
    custom: { cancelAll: cancelAllCustomNotifications, getIdentifier: getCustomNotificationIdentifier, schedule: scheduleCustomNotification },
  }[category];
  const reminders = parseStoredReminderArray<DatedReminder>(
    await AsyncStorage.getItem(DATED_KEYS[category])
  );
  if (await canDeliverReminderCategory(category)) {
    await replaceDatedReminderNotifications(reminders, config.cancelAll, config.getIdentifier, config.schedule);
  } else {
    await config.cancelAll();
  }
}

export async function continueReminderPlan(plan: ReminderPlan, extraDays: number) {
  if (!Number.isInteger(extraDays) || extraDays <= 0) {
    throw new Error("Plan continuation must be a positive number of days.");
  }
  const updatedRecord = continueReminderPlanRecord(plan, extraDays, new Date());
  const durationDays = updatedRecord.durationDays!;
  const updated = await persistPlanUpdate(updatedRecord);

  if (plan.reminderReferences.some((ref) => ref.category === "water")) {
    const savedSettings = await AsyncStorage.getItem("hydromate-reminder-settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings) as Record<string, unknown>;
        const updatedSettings: Record<string, unknown> = {
          ...settings,
          durationDays,
          startDate: plan.startDate,
        };
        await AsyncStorage.setItem(
          "hydromate-reminder-settings",
          JSON.stringify(updatedSettings)
        );
        if (await canDeliverReminderCategory("water")) {
          await scheduleWaterReminders({
            dailyGoal: Number(updatedSettings.dailyGoal),
            amountPerReminder: Number(updatedSettings.amount),
            intervalHours: Number(updatedSettings.interval),
            startHour: Number(updatedSettings.startHour),
            startMinute: Number(updatedSettings.startMinute),
            endHour: Number(updatedSettings.endHour),
            endMinute: Number(updatedSettings.endMinute),
            mode: updatedSettings.mode as "smart" | "fixed",
            explicitTimes: updatedSettings.explicitTimes as { hour: number; minute: number }[] | undefined,
            scheduleMode: updatedSettings.scheduleMode as "once" | "recurring" | undefined,
            durationDays,
            startDate: plan.startDate,
          });
        }
      } catch {
        // A malformed legacy Water record is left untouched.
      }
    }
  }

  const medicineIds = new Set(
    plan.reminderReferences.filter((ref) => ref.category === "medicine").flatMap((ref) => ref.recordId.split(","))
  );
  if (medicineIds.size) {
    const reminders = parseStoredReminderArray<HealthReminder>(await AsyncStorage.getItem(HEALTH_REMINDERS_KEY));
    const next = reminders.map((reminder) => {
      const linked = reminder.times.some((time) => {
        const [hour, minute] = time.split(":").map(Number);
        return medicineIds.has(getMedicineNotificationIdentifier(reminder.name, hour, minute, reminder.type));
      });
      return linked ? { ...reminder, durationDays, startDate: plan.startDate } : reminder;
    });
    await AsyncStorage.setItem(HEALTH_REMINDERS_KEY, JSON.stringify(next));
    await reconcileCategory("medicine");
  }

  for (const category of ["custom", "birthday", "anniversary"] as const) {
    const ids = new Set(plan.reminderReferences.filter((ref) => ref.category === category).flatMap((ref) => ref.recordId.split(",")));
    if (!ids.size) continue;
    const reminders = parseStoredReminderArray<DatedReminder>(await AsyncStorage.getItem(DATED_KEYS[category]));
    const getIdentifier = category === "custom" ? getCustomNotificationIdentifier : category === "birthday" ? getBirthdayNotificationIdentifier : getAnniversaryNotificationIdentifier;
    const next = reminders.map((reminder) => {
      const [hour, minute] = reminder.time.split(":").map(Number);
      const linked = ids.has(getIdentifier(reminder.name, reminder.month, reminder.day, hour, minute));
      return linked && category === "custom" ? { ...reminder, durationDays, startDate: plan.startDate } : reminder;
    });
    await AsyncStorage.setItem(DATED_KEYS[category], JSON.stringify(next));
    await reconcileCategory(category);
  }
  return updated;
}

export async function archiveReminderPlan(plan: ReminderPlan) {
  const updated = await persistPlanUpdate(archiveReminderPlanRecord(plan));
  const owned = plan.reminderReferences.filter((ref) => ref.createdByAssistant);
  if (owned.some((ref) => ref.category === "water")) {
    await cancelWaterReminders();
  }
  const medicineIds = new Set(owned.filter((ref) => ref.category === "medicine").flatMap((ref) => ref.recordId.split(",")));
  if (medicineIds.size) {
    const reminders = parseStoredReminderArray<HealthReminder>(await AsyncStorage.getItem(HEALTH_REMINDERS_KEY));
    const next = reminders.map((reminder) => {
      const linked = reminder.times.some((time) => {
        const [hour, minute] = time.split(":").map(Number);
        return medicineIds.has(getMedicineNotificationIdentifier(reminder.name, hour, minute, reminder.type));
      });
      return linked && plan.durationDays
        ? { ...reminder, durationDays: plan.durationDays, startDate: plan.startDate }
        : reminder;
    });
    await AsyncStorage.setItem(HEALTH_REMINDERS_KEY, JSON.stringify(next));
    await reconcileCategory("medicine");
  }
  for (const category of ["custom", "birthday", "anniversary"] as const) {
    const ids = new Set(owned.filter((ref) => ref.category === category).flatMap((ref) => ref.recordId.split(",")));
    if (!ids.size) continue;
    const getIdentifier = category === "custom" ? getCustomNotificationIdentifier : category === "birthday" ? getBirthdayNotificationIdentifier : getAnniversaryNotificationIdentifier;
    const reminders = parseStoredReminderArray<DatedReminder>(await AsyncStorage.getItem(DATED_KEYS[category]));
    const next = reminders.map((reminder) => {
      const [hour, minute] = reminder.time.split(":").map(Number);
      const linked = ids.has(getIdentifier(reminder.name, reminder.month, reminder.day, hour, minute));
      return linked && plan.durationDays
        ? { ...reminder, durationDays: plan.durationDays, startDate: plan.startDate }
        : reminder;
    });
    await AsyncStorage.setItem(DATED_KEYS[category], JSON.stringify(next));
    await reconcileCategory(category);
  }
  return updated;
}

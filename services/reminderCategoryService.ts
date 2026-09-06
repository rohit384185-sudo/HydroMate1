import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReminderCategory =
  | "water"
  | "medicine"
  | "birthday"
  | "anniversary"
  | "custom";

export type CategoryEnabledStates = Record<ReminderCategory, boolean>;
export type CategoryReconciliationAction = "restore" | "cancel";

export const REMINDER_MODE_STORAGE_KEY = "REMINDER_MODE_ENABLED";
export const CATEGORY_ENABLED_KEYS: Record<ReminderCategory, string> = {
  water: "hydromate-reminders-enabled",
  medicine: "hydromate-medicine-enabled",
  birthday: "hydromate-birthday-enabled",
  anniversary: "hydromate-anniversary-enabled",
  custom: "hydromate-custom-enabled",
};

export function getCategoryReconciliationActions(
  masterEnabled: boolean,
  categoryStates: CategoryEnabledStates
): Record<ReminderCategory, CategoryReconciliationAction> {
  return Object.fromEntries(
    (Object.keys(categoryStates) as ReminderCategory[]).map((category) => [
      category,
      masterEnabled && categoryStates[category] ? "restore" : "cancel",
    ])
  ) as Record<ReminderCategory, CategoryReconciliationAction>;
}

export async function getMasterReminderModeEnabled() {
  const savedValue = await AsyncStorage.getItem(REMINDER_MODE_STORAGE_KEY);

  if (savedValue === null) {
    return true;
  }

  try {
    return JSON.parse(savedValue) === true;
  } catch {
    return false;
  }
}

export async function getCategoryEnabledStates(): Promise<CategoryEnabledStates> {
  const categories = Object.keys(CATEGORY_ENABLED_KEYS) as ReminderCategory[];
  const savedEntries = await AsyncStorage.multiGet(
    categories.map((category) => CATEGORY_ENABLED_KEYS[category])
  );
  const missingEntries: [string, string][] = [];
  const states = {} as CategoryEnabledStates;

  categories.forEach((category, index) => {
    const [key, savedValue] = savedEntries[index];
    const enabled = savedValue === null ? true : savedValue !== "false";
    states[category] = enabled;

    if (savedValue === null) {
      missingEntries.push([key, "true"]);
    }
  });

  if (missingEntries.length > 0) {
    await AsyncStorage.multiSet(missingEntries);
  }

  return states;
}

export async function setReminderCategoryEnabled(
  category: ReminderCategory,
  enabled: boolean
) {
  await AsyncStorage.setItem(
    CATEGORY_ENABLED_KEYS[category],
    enabled ? "true" : "false"
  );
}

export async function canDeliverReminderCategory(
  category: ReminderCategory
) {
  const [masterEnabled, categoryValue] = await Promise.all([
    getMasterReminderModeEnabled(),
    AsyncStorage.getItem(CATEGORY_ENABLED_KEYS[category]),
  ]);

  return masterEnabled && categoryValue !== "false";
}

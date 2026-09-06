import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createAssistantRecentReminder,
  keepAssistantRecentReminderRecord,
  mergeAssistantRecentReminders,
  pruneAssistantRecentReminders,
  removeAssistantRecentReminderRecord,
  type AssistantRecentReminder,
  type AssistantRecentReminderInput,
} from "./assistantRecentReminderModel";
import { parseStoredReminderArray } from "./savedReminderService";

export const ASSISTANT_RECENT_REMINDERS_STORAGE_KEY =
  "hydromate-assistant-recent-reminders";

async function persistRecentReminders(reminders: AssistantRecentReminder[]) {
  await AsyncStorage.setItem(
    ASSISTANT_RECENT_REMINDERS_STORAGE_KEY,
    JSON.stringify(reminders)
  );
}

export async function loadAssistantRecentReminders(now = new Date()) {
  const stored = parseStoredReminderArray<AssistantRecentReminder>(
    await AsyncStorage.getItem(ASSISTANT_RECENT_REMINDERS_STORAGE_KEY)
  );
  const pruned = pruneAssistantRecentReminders(stored, now);

  if (pruned.length !== stored.length) await persistRecentReminders(pruned);
  return pruned.filter((reminder) => reminder.reviewState !== "removed");
}

export async function recordAssistantRecentReminders(
  inputs: AssistantRecentReminderInput[],
  now = new Date()
) {
  const stored = parseStoredReminderArray<AssistantRecentReminder>(
    await AsyncStorage.getItem(ASSISTANT_RECENT_REMINDERS_STORAGE_KEY)
  );
  const additions = inputs.map((input) =>
    createAssistantRecentReminder(input, now)
  );
  const merged = pruneAssistantRecentReminders(
    mergeAssistantRecentReminders(stored, additions),
    now
  );
  await persistRecentReminders(merged);
  return additions;
}

export async function keepAssistantRecentReminder(
  id: string,
  now = new Date()
) {
  const stored = parseStoredReminderArray<AssistantRecentReminder>(
    await AsyncStorage.getItem(ASSISTANT_RECENT_REMINDERS_STORAGE_KEY)
  );
  const updated = stored.map((reminder) =>
    reminder.id === id
      ? keepAssistantRecentReminderRecord(reminder, now)
      : reminder
  );
  await persistRecentReminders(updated);
}

export async function removeAssistantRecentReminder(
  id: string,
  now = new Date()
) {
  const stored = parseStoredReminderArray<AssistantRecentReminder>(
    await AsyncStorage.getItem(ASSISTANT_RECENT_REMINDERS_STORAGE_KEY)
  );
  const updated = stored.map((reminder) =>
    reminder.id === id
      ? removeAssistantRecentReminderRecord(reminder, now)
      : reminder
  );
  await persistRecentReminders(updated);
}

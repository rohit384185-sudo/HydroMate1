import { getLocalDateKey, parseLocalDateKey } from "./reminderDurationService";

export const ASSISTANT_RECENT_REVIEW_DAYS = 7;
export const ASSISTANT_RECENT_REMOVED_RETENTION_DAYS = 60;

export type AssistantRecentReminderState = "recent" | "kept" | "removed";

export type AssistantRecentReminder = {
  id: string;
  authoritativeRecordId: string;
  category: "water" | "medicine" | "birthday" | "anniversary" | "custom";
  displayTitle: string;
  times: string[];
  durationDays?: number;
  createdAt: string;
  nextReviewDate: string;
  reviewState: AssistantRecentReminderState;
  planId?: string;
  removedAt?: string;
};

export type AssistantRecentReminderInput = Pick<
  AssistantRecentReminder,
  | "authoritativeRecordId"
  | "category"
  | "displayTitle"
  | "times"
  | "durationDays"
  | "planId"
>;

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function addLocalDays(date: Date, days: number) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
}

function localDayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function createAssistantRecentReminder(
  input: AssistantRecentReminderInput,
  now = new Date()
): AssistantRecentReminder {
  return {
    id: `hydromate-assistant-recent-${hash(`${input.category}|${input.authoritativeRecordId}`)}`,
    authoritativeRecordId: input.authoritativeRecordId,
    category: input.category,
    displayTitle: input.displayTitle,
    times: [...new Set(input.times)],
    ...(input.durationDays ? { durationDays: input.durationDays } : {}),
    createdAt: now.toISOString(),
    nextReviewDate: getLocalDateKey(
      addLocalDays(now, ASSISTANT_RECENT_REVIEW_DAYS)
    ),
    reviewState: "recent",
    ...(input.planId ? { planId: input.planId } : {}),
  };
}

export function getAssistantRecentReminderAgeDays(
  reminder: AssistantRecentReminder,
  now = new Date()
) {
  const created = new Date(reminder.createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, localDayNumber(now) - localDayNumber(created));
}

export function isAssistantRecentReminderReadyForReview(
  reminder: AssistantRecentReminder,
  now = new Date()
) {
  if (reminder.reviewState === "removed") return false;
  const reviewDate = parseLocalDateKey(reminder.nextReviewDate);
  if (!reviewDate) return false;
  return localDayNumber(now) >= localDayNumber(reviewDate);
}

export function keepAssistantRecentReminderRecord(
  reminder: AssistantRecentReminder,
  now = new Date()
): AssistantRecentReminder {
  return {
    ...reminder,
    reviewState: "kept",
    nextReviewDate: getLocalDateKey(
      addLocalDays(now, ASSISTANT_RECENT_REVIEW_DAYS)
    ),
    removedAt: undefined,
  };
}

export function removeAssistantRecentReminderRecord(
  reminder: AssistantRecentReminder,
  now = new Date()
): AssistantRecentReminder {
  return {
    ...reminder,
    reviewState: "removed",
    removedAt: now.toISOString(),
  };
}

export function mergeAssistantRecentReminders(
  existing: AssistantRecentReminder[],
  additions: AssistantRecentReminder[]
) {
  const byId = new Map(existing.map((reminder) => [reminder.id, reminder]));
  for (const reminder of additions) byId.set(reminder.id, reminder);
  return [...byId.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function pruneAssistantRecentReminders(
  reminders: AssistantRecentReminder[],
  now = new Date()
) {
  return reminders.filter((reminder) => {
    if (reminder.reviewState !== "removed") return true;
    const removedAt = reminder.removedAt ? new Date(reminder.removedAt) : null;
    if (!removedAt || Number.isNaN(removedAt.getTime())) return false;
    return (
      localDayNumber(now) - localDayNumber(removedAt) <
      ASSISTANT_RECENT_REMOVED_RETENTION_DAYS
    );
  });
}

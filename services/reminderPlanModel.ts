import { getLocalDateKey, parseLocalDateKey } from "./reminderDurationService";

export type AssistantReminderReference = {
  category: "water" | "medicine" | "birthday" | "anniversary" | "custom";
  recordId: string;
  label: string;
  createdByAssistant: boolean;
};

export type ReminderPlanStatus = "active" | "finished" | "archived";
export type ReminderPlan = {
  id: string;
  name: string;
  createdDate: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  reminderReferences: AssistantReminderReference[];
  status: ReminderPlanStatus;
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getReminderPlanProgress(plan: ReminderPlan, now = new Date()) {
  const start = parseLocalDateKey(plan.startDate);
  if (!start || !plan.durationDays) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  return { day: Math.min(Math.max(elapsed, 1), plan.durationDays), total: plan.durationDays, finished: elapsed > plan.durationDays };
}

export function createReminderPlanRecord(name: string, reminderReferences: AssistantReminderReference[], durationDays: number, now: Date, createdDate = now.toISOString()): ReminderPlan {
  return {
    id: `hydromate-plan-${hash(`${name}|${createdDate}`)}`,
    name: name.trim() || "30-Day Health Plan",
    createdDate,
    startDate: getLocalDateKey(now),
    endDate: getLocalDateKey(addDays(now, durationDays - 1)),
    durationDays,
    reminderReferences,
    status: "active",
  };
}

export function continueReminderPlanRecord(plan: ReminderPlan, extraDays: number, now: Date) {
  if (!Number.isInteger(extraDays) || extraDays <= 0) throw new Error("Plan continuation must be positive.");
  const oldEnd = plan.endDate ? parseLocalDateKey(plan.endDate) : null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const continuesBeforeExpiry = Boolean(oldEnd && oldEnd >= today);
  const base = continuesBeforeExpiry ? oldEnd! : today;
  const nextEnd = addDays(base, continuesBeforeExpiry ? extraDays : extraDays - 1);
  const start = parseLocalDateKey(plan.startDate) ?? today;
  return { ...plan, endDate: getLocalDateKey(nextEnd), durationDays: Math.floor((nextEnd.getTime() - start.getTime()) / 86_400_000) + 1, status: "active" as const };
}

export function updateReminderPlanReferenceRecord(plan: ReminderPlan, references: AssistantReminderReference[]) {
  const byIdentity = new Map([...plan.reminderReferences, ...references].map((reference) => [`${reference.category}|${reference.recordId}`, reference]));
  return { ...plan, reminderReferences: [...byIdentity.values()] };
}

export function archiveReminderPlanRecord(plan: ReminderPlan) {
  return { ...plan, status: "archived" as const };
}

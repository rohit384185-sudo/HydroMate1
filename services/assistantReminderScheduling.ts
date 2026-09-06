export type AssistantOneTimeTarget = {
  scheduleMode?: "once" | "recurring";
  relativeDurationMinutes?: number;
  targetAtMillis?: number;
};

export function getAssistantOneTimeFireAt(
  draft: AssistantOneTimeTarget,
  confirmationTimestamp: number
) {
  if (draft.scheduleMode !== "once") return undefined;

  if (
    Number.isFinite(draft.relativeDurationMinutes) &&
    (draft.relativeDurationMinutes ?? 0) > 0
  ) {
    return confirmationTimestamp + draft.relativeDurationMinutes! * 60_000;
  }

  return Number.isFinite(draft.targetAtMillis)
    ? draft.targetAtMillis
    : undefined;
}

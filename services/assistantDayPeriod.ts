export type AssistantDayPeriod =
  | "am"
  | "pm"
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "noon"
  | "midnight";

export const ASSISTANT_DAY_PERIOD_PATTERN =
  "a\\.?m\\.?|p\\.?m\\.?|morning|afternoon|evening|night|noon|midnight";

export const ASSISTANT_PERIOD_FIRST_PATTERN =
  "morning|afternoon|evening|night|noon|midnight";

export function normalizeAssistantDayPeriod(
  value: string | undefined
): AssistantDayPeriod | undefined {
  const normalized = value?.replaceAll(".", "").toLocaleLowerCase();
  return normalized && [
    "am", "pm", "morning", "afternoon", "evening", "night", "noon", "midnight",
  ].includes(normalized)
    ? normalized as AssistantDayPeriod
    : undefined;
}

export function resolveAssistantDayPeriodHour(
  hour: number,
  period: AssistantDayPeriod
) {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return undefined;

  if (period === "am" || period === "morning") return hour % 12;
  if (period === "midnight") return hour === 12 ? 0 : undefined;
  if (period === "noon") return hour === 12 ? 12 : undefined;
  if (period === "night" && hour === 12) return 0;
  return (hour % 12) + 12;
}

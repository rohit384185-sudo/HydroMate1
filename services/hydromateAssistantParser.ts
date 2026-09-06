import type { ReminderCategory } from "./reminderCategoryService";
import {
  ASSISTANT_DAY_PERIOD_PATTERN,
  ASSISTANT_PERIOD_FIRST_PATTERN,
  normalizeAssistantDayPeriod,
  resolveAssistantDayPeriodHour,
  type AssistantDayPeriod,
} from "./assistantDayPeriod";
import {
  isAssistantCancellation,
  normalizeAssistantTranscript,
} from "./assistantLocaleNormalizer";
import {
  extractWaterAmount,
  type WaterAmountExtraction,
} from "./waterAmountNormalizer";

export type AssistantQuestionCode =
  | "category"
  | "medicineName"
  | "waterAmount"
  | "waterAmountInvalid"
  | "title"
  | "date"
  | "time"
  | "timePeriod"
  | "duration"
  | "timesPerDay"
  | "timesPerDayInvalid"
  | "durationDays"
  | "durationDaysInvalid"
  | "recurrenceTimes"
  | "recurrenceTimesInvalid"
  | "confirmation"
  | "confirmationInvalid"
  | "medicineDaily"
  | "unsupportedMedicineDate"
  | "pastTime"
  | "unclear";

export type AssistantDateSource =
  | "none"
  | "today"
  | "tomorrow"
  | "explicit"
  | "relative";

export type AssistantTimeSlot = {
  index: number;
  hour: number;
  minute: number;
  status: "unresolved" | "resolved";
  period?: AssistantDayPeriod;
  resolvedHour?: number;
};

export type AssistantReminderDraft = {
  category?: ReminderCategory;
  title?: string;
  medicineName?: string;
  medicineType?: string;
  amountMl?: number;
  hour?: number;
  minute?: number;
  times?: { hour: number; minute: number }[];
  timeSlots?: AssistantTimeSlot[];
  lastAskedTimeSlotKey?: string;
  ambiguousHour?: number;
  ambiguousMinute?: number;
  day?: number;
  month?: number;
  dateSource: AssistantDateSource;
  targetAtMillis?: number;
  relativeDurationMinutes?: number;
  medicineDailyConfirmed?: boolean;
  scheduleMode?: "once" | "recurring";
  timesPerDay?: number;
  durationDays?: number;
  timesPerDayPromptAttempts?: number;
  durationDaysPromptAttempts?: number;
  recurrenceTimesPromptAttempts?: number;
  waterAmountPromptAttempts?: number;
};

export const ASSISTANT_RECURRENCE_LIMITS = {
  maxTimesPerDay: 12,
  maxDurationDays: 365,
  maxInvalidAttempts: 2,
} as const;

export type AssistantTurnResult =
  | {
      state: "question";
      question: AssistantQuestionCode;
      draft: AssistantReminderDraft;
    }
  | {
      state: "ready";
      draft: AssistantReminderDraft;
    }
  | {
      state: "cancelled";
      draft: AssistantReminderDraft;
    };

type ParseAssistantTurnOptions = {
  now?: Date;
  draft?: AssistantReminderDraft;
  pendingQuestion?: AssistantQuestionCode;
  knownMedicineNames?: string[];
  locale?: string;
};

const CATEGORY_KEYWORDS: Record<ReminderCategory, string[]> = {
  water: [
    "water",
    "drink",
    "ml",
    "millilitre",
    "milliliter",
    "litre",
    "liter",
    "पानी",
    "पाणी",
    "জল",
    "পানি",
    "தண்ணீர்",
    "నీరు",
    "પાણી",
    "ನೀರು",
    "വെള്ളം",
    "ਪਾਣੀ",
  ],
  medicine: [
    "medicine",
    "medication",
    "tablet",
    "pill",
    "dose",
    "allegra",
    "crocin",
    "paracetamol",
    "दवा",
    "दवाई",
    "औषध",
    "ওষুধ",
    "மருந்து",
    "మందు",
    "દવા",
    "ಔಷಧ",
    "മരുന്ന്",
    "ਦਵਾਈ",
  ],
  birthday: [
    "birthday",
    "जन्मदिन",
    "জন্মদিন",
    "वाढदिवस",
    "பிறந்தநாள்",
    "పుట్టినరోజు",
    "જન્મદિવસ",
    "ಹುಟ್ಟುಹಬ್ಬ",
    "ജന്മദിനം",
    "ਜਨਮਦਿਨ",
  ],
  anniversary: [
    "anniversary",
    "सालगिरह",
    "वर्धापनदिन",
    "বার্ষিকী",
    "ஆண்டுவிழா",
    "వార్షికోత్సవం",
    "વર્ષગાંઠ",
    "ವಾರ್ಷಿಕೋತ್ಸವ",
    "വാർഷികം",
    "ਵਰ੍ਹੇਗੰਢ",
  ],
  custom: ["custom", "routine", "other", "anything else"],
};

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const AFFIRMATIVE = /^(yes|yeah|yep|confirm|okay|ok|sure|daily|every day)$/i;
const NEGATIVE = /^(no|nope|cancel|stop)$/i;

function normalizeInput(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function includesKeyword(input: string, keyword: string) {
  const normalized = input.toLocaleLowerCase();
  const candidate = keyword.toLocaleLowerCase();

  if (/^[a-z\s]+$/i.test(candidate)) {
    return new RegExp(`\\b${candidate.replaceAll(" ", "\\s+")}\\b`, "i").test(
      normalized
    );
  }

  return normalized.includes(candidate);
}

export function classifyAssistantIntent(
  input: string,
  knownMedicineNames: string[] = []
) {
  const matches = new Set<ReminderCategory>();
  const hasExplicitCustomCategory = CATEGORY_KEYWORDS.custom.some((keyword) =>
    includesKeyword(input, keyword)
  );

  for (const category of [
    "water",
    "medicine",
    "birthday",
    "anniversary",
  ] as const) {
    if (CATEGORY_KEYWORDS[category].some((keyword) => includesKeyword(input, keyword))) {
      matches.add(category);
    }
  }

  const hasKnownMedicineName = knownMedicineNames.some((name) =>
      name.trim() ? input.toLocaleLowerCase().includes(name.toLocaleLowerCase()) : false
    );
  if (hasKnownMedicineName) {
    matches.add("medicine");
  }

  if (/^(?:remind me to\s+)?take\s+[^\s]+/i.test(input)) {
    matches.add("medicine");
  }

  const datedMatches = ["birthday", "anniversary"].filter((category) =>
    matches.has(category as ReminderCategory)
  ) as ReminderCategory[];
  if (datedMatches.length === 1) {
    return { category: datedMatches[0], ambiguous: false } as const;
  }

  if (hasExplicitCustomCategory) {
    return { category: "custom", ambiguous: false } as const;
  }

  if (matches.size > 1) {
    return { category: undefined, ambiguous: true } as const;
  }

  return {
    category: matches.values().next().value ?? "custom",
    ambiguous: false,
  } as const;
}

function parseDurationDays(input: string) {
  const match =
    input.match(/\bfor\s+(\d+)\s+days?\b/i) ??
    input.match(/\b(\d+)\s+days?\s+for\b/i) ??
    input.match(/\b(\d+)\s+days?\b/i);

  if (!match) {
    return undefined;
  }

  const durationDays = Number(match[1]);
  return Number.isInteger(durationDays) &&
    durationDays >= 1 &&
    durationDays <= ASSISTANT_RECURRENCE_LIMITS.maxDurationDays
    ? durationDays
    : undefined;
}

function hasOneTimeIntent(input: string) {
  return /^(?:no\s+)?(?:only\s+|just\s+)?(?:once|one\s+time)(?:\s+only)?$/i.test(input.trim()) ||
    /\b(?:only once|just once|one time only)\b/i.test(input);
}

function parseTimesPerDay(input: string) {
  const match =
    input.match(/\b(\d+)\s+times?\s+(?:a|per)\s+day\b/i) ??
    input.match(/\b(?:per\s+day|in\s+a\s+day)\s+(\d+)\s+times?\b/i) ??
    input.match(/\b(\d+)\s+times?\s+daily\b/i) ??
    input.match(/^\s*(\d+)\s*(?:times?)?\s*$/i);
  const value = match ? Number(match[1]) : /\b(?:daily|every day|once a day)\b/i.test(input) ? 1 : undefined;

  return Number.isInteger(value) &&
    value! >= 1 &&
    value! <= ASSISTANT_RECURRENCE_LIMITS.maxTimesPerDay
    ? value
    : undefined;
}

function hasStatedTimesPerDay(input: string) {
  return /\b(?:\d+\s+times?\s+(?:a|per)\s+day|(?:per\s+day|in\s+a\s+day)\s+\d+\s+times?|\d+\s+times?\s+daily|daily|every day|once a day)\b/i.test(input);
}

function parseCalendarDate(input: string, now: Date) {
  const lower = input.toLocaleLowerCase();
  const base = new Date(now);

  if (/\bday after tomorrow\b/i.test(lower)) {
    base.setDate(base.getDate() + 2);
    return {
      day: base.getDate(),
      month: base.getMonth() + 1,
      source: "relative" as const,
    };
  }

  if (/\btomorrow\b/i.test(lower)) {
    base.setDate(base.getDate() + 1);
    return {
      day: base.getDate(),
      month: base.getMonth() + 1,
      source: "tomorrow" as const,
    };
  }

  if (/\btoday\b/i.test(lower)) {
    return {
      day: base.getDate(),
      month: base.getMonth() + 1,
      source: "today" as const,
    };
  }

  const monthNames = Object.keys(MONTHS).join("|");
  const namedDate = lower.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\b`, "i")
  ) ?? lower.match(
    new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i")
  );

  if (namedDate) {
    const monthFirst = MONTHS[namedDate[1].toLocaleLowerCase()] !== undefined;
    const day = Number(namedDate[monthFirst ? 2 : 1]);
    const month = MONTHS[namedDate[monthFirst ? 1 : 2].toLocaleLowerCase()];

    if (day >= 1 && day <= new Date(2024, month, 0).getDate()) {
      return { day, month, source: "explicit" as const };
    }
  }

  const numericDate = lower.match(/\b(\d{1,2})[/-](\d{1,2})\b/);

  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]);

    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= new Date(2024, month, 0).getDate()
    ) {
      return { day, month, source: "explicit" as const };
    }
  }

  return undefined;
}

type AssistantTemporalIntent =
  | {
      kind: "relative";
      offsetMinutes: number;
      hour: number;
      minute: number;
      day: number;
      month: number;
      source: "relative";
      targetAtMillis: number;
    }
  | {
      kind: "clock";
      hour: number;
      minute: number;
      day: number;
      month: number;
      source: AssistantDateSource;
      targetAtMillis: number;
    }
  | {
      kind: "ambiguous-clock";
      ambiguousPeriod: true;
      hour: number;
      minute: number;
    };

function parseTemporalIntent(input: string, now: Date): AssistantTemporalIntent | undefined {
  const relative =
    input.match(/\b(?:in|after)\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i) ??
    input.match(/\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\s*(?:after|from now|in)\b/i) ??
    input.match(/\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\s+from\s+now\b/i);

  if (relative) {
    const value = Number(relative[1]);
    const unit = relative[2];
    const multiplier = /^h/i.test(unit) ? 60 : 1;
    const offsetMinutes = value * multiplier;
    const target = new Date(now.getTime() + offsetMinutes * 60_000);

    if (value > 0) {
      return {
        kind: "relative",
        offsetMinutes,
        hour: target.getHours(),
        minute: target.getMinutes(),
        day: target.getDate(),
        month: target.getMonth() + 1,
        source: "relative" as const,
        targetAtMillis: target.getTime(),
      };
    }
  }

  const periodPattern = `(${ASSISTANT_DAY_PERIOD_PATTERN})`;
  const conventional =
    input.match(new RegExp(
      `\\bat\\s+(\\d{1,2})(?::(\\d{2}))?(?:\\s+(?:day after tomorrow|tomorrow|today))?(?:\\s+at)?\\s*${periodPattern}?(?=\\s|$|[.,!?])`,
      "i"
    )) ??
    input.match(new RegExp(
      `\\b(\\d{1,2})(?::(\\d{2}))?(?:\\s+(?:day after tomorrow|tomorrow|today))?(?:\\s+at)?\\s*${periodPattern}\\b(?!\\s+\\d)`,
      "i"
    )) ??
    input.match(
      /\b(\d{1,2})(?::(\d{2}))?\s+at(?:\s|$)/i
    ) ??
    input.match(new RegExp(
      `^\\s*(\\d{1,2})(?::(\\d{2}))?\\s*${periodPattern}?\\s*[.,!?]?\\s*$`,
      "i"
    ));

  const periodFirstPattern = `(${ASSISTANT_PERIOD_FIRST_PATTERN})`;
  const periodFirst = input.match(new RegExp(
    `\\b${periodFirstPattern}\\s+(\\d{1,2})(?::(\\d{2}))?(?:\\s+at)?\\b`,
    "i"
  ));

  if (!conventional && !periodFirst) {
    const standalone = input.match(/\b(noon|midnight)\b/i);
    if (!standalone) return undefined;
    const hour = standalone[1].toLocaleLowerCase() === "midnight" ? 0 : 12;
    const calendar = parseCalendarDate(input, now);
    const day = calendar?.day ?? now.getDate();
    const month = calendar?.month ?? now.getMonth() + 1;
    return {
      kind: "clock",
      hour,
      minute: 0,
      day,
      month,
      source: calendar?.source ?? ("none" as const),
      targetAtMillis: new Date(now.getFullYear(), month - 1, day, hour, 0, 0, 0).getTime(),
    };
  }

  let hour = Number(periodFirst?.[2] ?? conventional?.[1]);
  const minute = Number(periodFirst?.[3] ?? conventional?.[2] ?? 0);
  const period = normalizeAssistantDayPeriod(periodFirst?.[1] ?? conventional?.[3]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    (period && (hour < 1 || hour > 12))
  ) {
    return undefined;
  }

  if (period) {
    const resolvedHour = resolveAssistantDayPeriodHour(hour, period);
    if (resolvedHour === undefined) return undefined;
    hour = resolvedHour;
  } else if (hour <= 12) {
    return {
      kind: "ambiguous-clock",
      ambiguousPeriod: true as const,
      hour,
      minute,
    };
  }

  const calendar = parseCalendarDate(input, now);
  const day = calendar?.day ?? now.getDate();
  const month = calendar?.month ?? now.getMonth() + 1;
  const target = new Date(now.getFullYear(), month - 1, day, hour, minute, 0, 0);

  if (calendar?.source === "tomorrow" && target.getTime() <= now.getTime()) {
    target.setFullYear(target.getFullYear() + 1);
  }

  return {
    kind: "clock",
    hour,
    minute,
    day,
    month,
    source: calendar?.source ?? ("none" as const),
    targetAtMillis: target.getTime(),
  };
}

function parseAllTimeSlots(input: string, locale?: string): AssistantTimeSlot[] {
  type TimeCandidate = {
    index: number;
    length: number;
    raw: string;
    hour: number;
    minute: number;
    period?: AssistantDayPeriod;
  };
  const candidates: TimeCandidate[] = [];
  const amPmPattern = "(a\\.?m\\.?|p\\.?m\\.?)";
  const periodFirstPattern = `(${ASSISTANT_PERIOD_FIRST_PATTERN})`;
  for (const match of input.matchAll(new RegExp(
    `\\b(\\d{1,2})(?::(\\d{2}))?(?:\\s+(?:day after tomorrow|tomorrow|today))?(?:\\s+at)?\\s*${amPmPattern}\\b`,
    "gi"
  ))) {
    const period = normalizeAssistantDayPeriod(match[3]);
    if (period) candidates.push({ index: match.index ?? 0, length: match[0].length, raw: match[0], hour: Number(match[1]), minute: Number(match[2] ?? 0), period });
  }
  for (const match of input.matchAll(new RegExp(
    `\\b(\\d{1,2})(?::(\\d{2}))?(?:\\s+(?:day after tomorrow|tomorrow|today))?(?:\\s+at)?\\s*${periodFirstPattern}\\b(?!\\s+\\d)`,
    "gi"
  ))) {
    const period = normalizeAssistantDayPeriod(match[3]);
    if (period) candidates.push({ index: match.index ?? 0, length: match[0].length, raw: match[0], hour: Number(match[1]), minute: Number(match[2] ?? 0), period });
  }
  for (const match of input.matchAll(new RegExp(
    `\\b${periodFirstPattern}\\s+(\\d{1,2})(?::(\\d{2}))?(?:\\s+at)?\\b`,
    "gi"
  ))) {
    const period = normalizeAssistantDayPeriod(match[1]);
    if (period) candidates.push({ index: match.index ?? 0, length: match[0].length, raw: match[0], hour: Number(match[2]), minute: Number(match[3] ?? 0), period });
  }
  for (const match of input.matchAll(/\b(noon|midnight)\b/gi)) {
    const index = match.index ?? 0;
    if (candidates.some((candidate) => index >= candidate.index && index < candidate.index + candidate.length)) continue;
    const period = normalizeAssistantDayPeriod(match[1]);
    if (period) candidates.push({ index, length: match[0].length, raw: match[0], hour: 12, minute: 0, period });
  }
  for (const match of input.matchAll(/\b(\d{1,2})(?::(\d{2}))?(?:\s+at)?(?=\s*(?:and\b|,|$))/gi)) {
    const index = match.index ?? 0;
    if (candidates.some((candidate) => index >= candidate.index && index < candidate.index + candidate.length)) continue;
    candidates.push({
      index,
      length: match[0].length,
      raw: match[0],
      hour: Number(match[1]),
      minute: Number(match[2] ?? 0),
    });
  }
  candidates.sort((left, right) => left.index - right.index);
  const slots: AssistantTimeSlot[] = [];

  for (const candidate of candidates) {
    if (candidate.minute < 0 || candidate.minute > 59 || candidate.hour < 0 || candidate.hour > 23) continue;
    const resolvedHour = candidate.period
      ? resolveAssistantDayPeriodHour(candidate.hour, candidate.period)
      : candidate.hour === 0 || candidate.hour > 12
        ? candidate.hour
        : undefined;
    if (candidate.period && resolvedHour === undefined) continue;
    slots.push({
      index: slots.length,
      hour: candidate.hour,
      minute: candidate.minute,
      status: resolvedHour === undefined ? "unresolved" : "resolved",
      period: candidate.period,
      resolvedHour,
    });
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTime locale=${locale ?? "unknown"} raw=${JSON.stringify(candidate.raw)} normalizedPeriod=${candidate.period ?? "none"} parsed=${candidate.hour}:${candidate.minute} final24=${resolvedHour === undefined ? "unresolved" : `${resolvedHour}:${candidate.minute}`} ambiguity=${resolvedHour === undefined}`);
    }
  }

  if (candidates.length && (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
    console.log(`HydroMateAssistantTime locale=${locale ?? "unknown"} raw=${JSON.stringify(candidates.map((candidate) => candidate.raw).join(" | "))} slots=${JSON.stringify(slots)}`);
  }

  return slots;
}

function resolvedTimesFromSlots(slots: AssistantTimeSlot[] | undefined) {
  return (slots ?? [])
    .filter((slot): slot is AssistantTimeSlot & { resolvedHour: number } =>
      slot.status === "resolved" && slot.resolvedHour !== undefined
    )
    .map((slot) => ({ hour: slot.resolvedHour, minute: slot.minute }));
}

function unresolvedTimeSlots(slots: AssistantTimeSlot[] | undefined) {
  return (slots ?? []).filter((slot) => slot.status === "unresolved");
}

function timeSlotKey(slot: AssistantTimeSlot) {
  return `timePeriod:${slot.index}:${slot.hour}:${String(slot.minute).padStart(2, "0")}`;
}

export function reconcileAssistantTimeState(draft: AssistantReminderDraft, previous?: AssistantReminderDraft) {
  let slots = (draft.timeSlots ?? previous?.timeSlots)?.map((slot) => ({ ...slot }));
  const validTime = (time: { hour?: number; minute?: number }) =>
    Number.isInteger(time.hour) && time.hour! >= 0 && time.hour! <= 23 &&
    Number.isInteger(time.minute) && time.minute! >= 0 && time.minute! <= 59;
  const expected = draft.timesPerDay ?? Math.max(slots?.length ?? 0, 1);
  const exact = draft.times ?? [];
  // A complete authoritative exact-time list wins over stale compatibility or pending fields.
  if (exact.length === expected && exact.every(validTime) &&
      new Set(exact.map((time) => `${time.hour}:${time.minute}`)).size === expected) {
    slots = exact.map((time, index) => {
      const existing = slots?.[index];
      return { index, hour: existing?.resolvedHour === time.hour ? existing.hour : time.hour % 12 || 12,
        minute: time.minute, status: "resolved" as const, resolvedHour: time.hour,
        period: existing?.resolvedHour === time.hour && existing.period ? existing.period : time.hour < 12 ? "am" as const : "pm" as const };
    });
  }
  if (!slots?.length && draft.ambiguousHour !== undefined) {
    slots = [{ index: 0, hour: draft.ambiguousHour, minute: draft.ambiguousMinute ?? 0, status: "unresolved" }];
  }
  if (!slots?.length) return draft;
  slots = slots.map((slot) => {
    const resolvedHour = validTime({ hour: slot.resolvedHour, minute: slot.minute })
      ? slot.resolvedHour
      : slot.period ? resolveAssistantDayPeriodHour(slot.hour, slot.period) : undefined;
    const prior = previous?.timeSlots?.find((item) => item.index === slot.index &&
      item.hour === slot.hour && item.minute === slot.minute && item.status === "resolved");
    if ((slot.status === "unresolved" || !validTime({ hour: resolvedHour, minute: slot.minute })) && prior) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) console.error("HydroMateAssistantLoopGuard resolved-slot-regression BLOCKED", slot.index);
      return { ...prior };
    }
    if (validTime({ hour: resolvedHour, minute: slot.minute })) {
      return { ...slot, status: "resolved" as const, resolvedHour,
        period: slot.period ?? (resolvedHour! < 12 ? "am" as const : "pm" as const) };
    }
    return { ...slot, status: "unresolved" as const, resolvedHour: undefined };
  });
  const resolvedTimes = resolvedTimesFromSlots(slots);
  const unresolved = unresolvedTimeSlots(slots);
  const firstPending = unresolved[0];
  const firstResolved = resolvedTimes[0];
  return {
    ...draft,
    timeSlots: slots,
    times: resolvedTimes,
    hour: firstResolved?.hour,
    minute: firstResolved?.minute,
    ambiguousHour: firstPending?.hour,
    ambiguousMinute: firstPending?.minute,
    lastAskedTimeSlotKey: firstPending
      ? draft.lastAskedTimeSlotKey
      : undefined,
  };
}

const synchronizeTimeSlotDraft = reconcileAssistantTimeState;

function logTimeSlotState(
  draft: AssistantReminderDraft,
  fields: {
    incoming?: string;
    resolvedSlot?: string;
    before?: AssistantTimeSlot[];
    pendingBefore?: AssistantQuestionCode;
    pendingAfter?: AssistantQuestionCode | "ready";
    loopGuard?: string;
  } = {}
) {
  if (!(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) return;
  const slots = draft.timeSlots ?? [];
  console.log(
    `HydroMateAssistantTimeState expectedTimes=${draft.timesPerDay ?? 1} resolvedTimes=${JSON.stringify(resolvedTimesFromSlots(slots))} unresolvedTimes=${JSON.stringify(unresolvedTimeSlots(slots).map(({ index, hour, minute }) => ({ index, hour, minute })))} currentPending=${unresolvedTimeSlots(slots)[0]?.index ?? "none"} incoming=${JSON.stringify(fields.incoming ?? "")} resolvedSlot=${fields.resolvedSlot ?? "none"} pendingBefore=${fields.pendingBefore ?? "none"} pendingAfter=${fields.pendingAfter ?? "none"} pendingListBefore=${JSON.stringify(fields.before ?? [])} pendingListAfter=${JSON.stringify(slots)}${fields.loopGuard ? ` loopGuard=${fields.loopGuard}` : ""}`
  );
}

function stripTemporalText(input: string) {
  const monthNames = Object.keys(MONTHS).join("|");

  return input
    .replace(/\b(?:day after tomorrow|today|tomorrow)\b/gi, " ")
    .replace(
      new RegExp(`\\b(?:on\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${monthNames})\\b`, "gi"),
      " "
    )
    .replace(/\b(?:on\s+)?\d{1,2}[/-]\d{1,2}\b/gi, " ")
    .replace(/\b(?:in|after)\s+\d+\s*(?:minutes?|mins?|hours?|hrs?)\b/gi, " ")
    .replace(/\b\d+\s*(?:minutes?|mins?|hours?|hrs?)\s*(?:after|from now|in)\b/gi, " ")
    .replace(/\bfor\s+-?\d+\s+days?\b/gi, " ")
    .replace(/\b-?\d+\s+days?\s+for\b/gi, " ")
    .replace(/\b(?:per\s+day\s+)?\d+\s+times?(?:\s+(?:a|per)\s+day|\s+daily)?\b/gi, " ")
    .replace(/\b(?:only once|just once|one time only|once a day|daily)\b/gi, " ")
    .replace(
      /\bat\s+\d{1,2}(?::\d{2})?(?:\s+at)?\s*(?:a\.?m\.?|p\.?m\.?|morning|afternoon|evening|night|noon|midnight)?/gi,
      " "
    )
    .replace(
      /\band\s+\d{1,2}(?::\d{2})?(?:\s+at)?\s*(?:a\.?m\.?|p\.?m\.?|morning|afternoon|evening|night|noon|midnight)?/gi,
      " "
    )
    .replace(
      /\b\d{1,2}(?::\d{2})?(?:\s+at)?\s*(?:a\.?m\.?|p\.?m\.?|morning|afternoon|evening|night|noon|midnight)\b/gi,
      " "
    )
    .replace(
      /\b(?:morning|afternoon|evening|night|noon|midnight)\s+\d{1,2}(?::\d{2})?(?:\s+at)?\b/gi,
      " "
    )
    .replace(/\b(?:noon|midnight)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecurrenceQuestion(
  draft: AssistantReminderDraft,
  now: Date
): AssistantTurnResult | undefined {
  if (!draft.scheduleMode && !draft.timesPerDay) {
    return { state: "question", question: "timesPerDay", draft };
  }
  if (draft.scheduleMode === "once") {
    const target = draft.targetAtMillis ? new Date(draft.targetAtMillis) : null;
    if (target && target.getTime() <= now.getTime()) {
      return { state: "question", question: "pastTime", draft };
    }
    return { state: "ready", draft };
  }
  if (!draft.durationDays) {
    return { state: "question", question: "durationDays", draft };
  }
  const expectedTimes = draft.timesPerDay ?? 1;
  const unresolved = unresolvedTimeSlots(draft.timeSlots);
  if (unresolved.length) {
    return { state: "question", question: "timePeriod", draft };
  }
  const uniqueTimeCount = new Set(
    (draft.times ?? []).map((time) => `${time.hour}:${time.minute}`)
  ).size;
  if (
    draft.category !== "water" &&
    ((draft.times?.length ?? 0) !== expectedTimes || uniqueTimeCount !== expectedTimes)
  ) {
    return { state: "question", question: "recurrenceTimes", draft };
  }
  return { state: "ready", draft };
}

function cleanCustomTitle(input: string) {
  return stripTemporalText(input)
    .replace(/^please\s+/i, "")
    .replace(/^remind me\s+(?:to|about)\s+/i, "")
    .replace(
      /^add\s+(?:a\s+)?(?:(?:custom|routine)\s+)?reminder\s+(?:to|for)\s+/i,
      ""
    )
    .replace(/^add\s+/i, "")
    .replace(/\b(?:reminder|routine|every day|every week)\b/gi, " ")
    .replace(/(?:^|\s)(?:का|की|के|करने|करना|করতে|करण्यासाठी|செய்ய|చేయడానికి|કરવા|ಮಾಡಲು|ചെയ്യാൻ|ਕਰਨ)(?=\s|$)/gu, " ")
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMedicineName(input: string) {
  const stripped = stripTemporalText(input)
    .replace(/^please\s+/i, "")
    .replace(/^remind me\s+to\s+/i, "")
    .replace(/^add\s+/i, "")
    .replace(/^take\s+/i, "")
    .replace(/\b(?:reminder|medicine|medication|tablet|pill|dose|cream|drops|injection|other|take|every day|every week)\b/gi, " ")
    .replace(/(?:^|\s)(?:का|की|के|लेने|करने|করতে|घ्यायला|எடுக்க|తీసుకోవడానికి|લેવા|ತೆಗೆದುಕೊಳ್ಳಲು|കഴിക്കണം|ਲੈਣ)(?=\s|$)/gu, " ")
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const withoutGeneric = stripped
    .replace(/^(?:my\s+)?(?:medicine|medication|tablet|pill|dose)$/i, "")
    .trim();

  return withoutGeneric || undefined;
}

function extractMedicineType(input: string) {
  if (/\bcream\b/i.test(input)) return "cream";
  if (/\bdrops\b/i.test(input)) return "drops";
  if (/\binjection\b/i.test(input)) return "injection";
  if (/\bother\b/i.test(input)) return "other";
  return "tablet";
}

function extractBirthdayName(input: string) {
  const name = stripTemporalText(input)
    .replace(/^please\s+/i, "")
    .replace(/^remind me\s+(?:to|about)\s+/i, "")
    .replace(/^add\s+/i, "")
    .replace(/\b(?:a|the|birthday|reminder|for|on)\b/gi, " ")
    .replace(/(?:^|\s)(?:का|की|के|चा|ची|चे|ன்|యొక్క|નું|ನ|യുടെ|ਦਾ)(?=\s|$)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return name && !/^(?:a|the|birthday)$/i.test(name) ? name : undefined;
}

function extractAnniversaryName(input: string) {
  const stripped = stripTemporalText(input)
    .replace(/^please\s+/i, "")
    .replace(/^remind me about\s+/i, "")
    .replace(/^add\s+/i, "")
    .replace(/\b(?:anniversary|reminder|for|on)\b/gi, " ")
    .replace(/(?:^|\s)(?:का|की|के|चा|ची|चे|ன்|యొక్క|નું|ನ|യുടെ|ਦਾ)(?=\s|$)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/\bour anniversary\b/i.test(input)) {
    return "Our";
  }

  return stripped || undefined;
}

export function resolveAssistantNextState(draft: AssistantReminderDraft, now: Date): AssistantTurnResult {
  draft = synchronizeTimeSlotDraft(draft);
  if (draft.hour !== undefined && draft.minute !== undefined &&
      (draft.category === "medicine" || draft.category === "custom" || draft.category === "water")) {
    draft = { ...draft, day: draft.day ?? now.getDate(), month: draft.month ?? now.getMonth() + 1 };
  }
  if (!draft.category) {
    return { state: "question", question: "category", draft };
  }

  const unresolved = unresolvedTimeSlots(draft.timeSlots);
  if (unresolved.length) {
    const current = unresolved[0];
    const key = timeSlotKey(current);
      draft = { ...draft, lastAskedTimeSlotKey: key };
      logTimeSlotState(draft, { pendingAfter: "timePeriod" });
      return { state: "question", question: "timePeriod", draft };
  } else if (draft.ambiguousHour !== undefined) {
    // Compatibility migration for drafts created before per-time slot state.
    draft = synchronizeTimeSlotDraft({
      ...draft,
      timeSlots: [{
        index: 0,
        hour: draft.ambiguousHour,
        minute: draft.ambiguousMinute ?? 0,
        status: "unresolved",
      }],
    });
    return resolveQuestion(draft, now);
  }

  if (draft.category === "medicine") {
    if (!draft.medicineName) {
      return { state: "question", question: "medicineName", draft };
    }
    if (draft.hour === undefined || draft.minute === undefined) {
      return { state: "question", question: "time", draft };
    }
    return getRecurrenceQuestion(draft, now)!;
  }

  if (draft.category === "water") {
    if (!draft.amountMl) {
      return {
        state: "question",
        question: "waterAmount",
        draft: { ...draft, waterAmountPromptAttempts: draft.waterAmountPromptAttempts ?? 0 },
      };
    }
    if (
      (draft.hour === undefined || draft.minute === undefined) &&
      !(
        draft.scheduleMode === "recurring" &&
        draft.timesPerDay &&
        draft.durationDays
      )
    ) {
      return { state: "question", question: "time", draft };
    }
    if (draft.hour === 23 && draft.minute === 59) {
      return { state: "question", question: "time", draft: { ...draft, hour: undefined, minute: undefined } };
    }
    return getRecurrenceQuestion(draft, now)!;
  }

  if (draft.category === "birthday" || draft.category === "anniversary") {
    if (!draft.title) {
      return { state: "question", question: "title", draft };
    }
    if (draft.dateSource === "none" || !draft.day || !draft.month) {
      return { state: "question", question: "date", draft };
    }
    if (draft.hour === undefined || draft.minute === undefined) {
      return { state: "question", question: "time", draft };
    }
    return { state: "ready", draft };
  }

  if (!draft.title) {
    return { state: "question", question: "title", draft };
  }
  if (draft.hour === undefined || draft.minute === undefined) {
    return { state: "question", question: "time", draft };
  }

  const target = draft.targetAtMillis
    ? new Date(draft.targetAtMillis)
    : new Date(
        now.getFullYear(),
        (draft.month ?? now.getMonth() + 1) - 1,
        draft.day ?? now.getDate(),
        draft.hour,
        draft.minute,
        0,
        0
      );
  if (target.getTime() <= now.getTime() && !(draft.scheduleMode === "recurring" && draft.dateSource === "none")) {
    return { state: "question", question: "pastTime", draft };
  }

  return getRecurrenceQuestion(draft, now)!;
}

const resolveQuestion = resolveAssistantNextState;

function logWaterAmountDiagnostic(
  locale: string | undefined,
  extraction: WaterAmountExtraction,
  pendingQuestion: AssistantQuestionCode | undefined,
  result: AssistantTurnResult
) {
  const isDevelopment = (
    globalThis as typeof globalThis & { __DEV__?: boolean }
  ).__DEV__;
  if (!isDevelopment) return;
  const transition =
    result.state === "question"
      ? `${pendingQuestion ?? "direct"}->${result.question}`
      : result.state;
  console.log(
    `HydroMateAssistantState amount locale=${locale ?? "unknown"} normalized=${JSON.stringify(extraction.normalizedTranscript)} intent=water pending=${pendingQuestion ?? "none"} amount=${extraction.amountMl ?? "none"} source=${extraction.source ?? "none"} invalid=${extraction.invalid} transition=${transition}`
  );
}

export function parseAssistantTurn(
  rawInput: string,
  options: ParseAssistantTurnOptions = {}
): AssistantTurnResult {
  const input = normalizeInput(rawInput);
  const semanticInput = normalizeAssistantTranscript(
    input,
    options.locale,
    {
      normalizeBareNumberWords:
        options.pendingQuestion === "time" ||
        options.pendingQuestion === "timePeriod" ||
        options.pendingQuestion === "duration" ||
        options.pendingQuestion === "timesPerDay" ||
        options.pendingQuestion === "timesPerDayInvalid" ||
        options.pendingQuestion === "durationDays" ||
        options.pendingQuestion === "durationDaysInvalid",
    }
  ).normalizedTranscript;
  const now = options.now ? new Date(options.now) : new Date();
  let draft: AssistantReminderDraft = options.draft
    ? { ...options.draft }
    : { dateSource: "none" };

  if (!input) {
    return { state: "question", question: "unclear", draft };
  }

  if (
    isAssistantCancellation(input, options.locale) &&
    !(
      options.pendingQuestion === "medicineDaily" &&
      /^(?:no|nope)$/i.test(semanticInput)
    )
  ) {
    return { state: "cancelled", draft };
  }

  if (options.pendingQuestion === "timePeriod") {
    draft = reconcileAssistantTimeState(draft);
    const completeAnswer = parseAllTimeSlots(semanticInput, options.locale);
    if (completeAnswer.length === (draft.timesPerDay ?? draft.timeSlots?.length ?? 1) &&
        completeAnswer.every((slot) => slot.status === "resolved")) {
      const first = completeAnswer[0];
      const day = draft.day ?? now.getDate();
      const month = draft.month ?? now.getMonth() + 1;
      return resolveQuestion(reconcileAssistantTimeState({
        ...draft, timeSlots: completeAnswer, times: resolvedTimesFromSlots(completeAnswer),
        day, month,
        targetAtMillis: new Date(now.getFullYear(), month - 1, day, first.resolvedHour!, first.minute, 0, 0).getTime(),
      }, options.draft), now);
    }
    if (!draft.timeSlots?.length && draft.ambiguousHour !== undefined) {
      draft = synchronizeTimeSlotDraft({
        ...draft,
        timeSlots: [{
          index: 0,
          hour: draft.ambiguousHour,
          minute: draft.ambiguousMinute ?? 0,
          status: "unresolved",
        }],
      });
    }
    const beforeSlots = draft.timeSlots?.map((slot) => ({ ...slot })) ?? [];
    const beforeUnresolved = unresolvedTimeSlots(beforeSlots);
    const replacementTemporal = parseTemporalIntent(semanticInput, now);
    if (replacementTemporal?.kind === "relative") {
      draft = {
        ...draft,
        hour: replacementTemporal.hour,
        minute: replacementTemporal.minute,
        times: [{ hour: replacementTemporal.hour, minute: replacementTemporal.minute }],
        day: replacementTemporal.day,
        month: replacementTemporal.month,
        dateSource: replacementTemporal.source,
        targetAtMillis: replacementTemporal.targetAtMillis,
        relativeDurationMinutes: replacementTemporal.offsetMinutes,
        timeSlots: [{
          index: 0,
          hour: replacementTemporal.hour,
          minute: replacementTemporal.minute,
          status: "resolved",
          resolvedHour: replacementTemporal.hour,
        }],
        lastAskedTimeSlotKey: undefined,
        ambiguousHour: undefined,
        ambiguousMinute: undefined,
      };
      logTimeSlotState(draft, {
        incoming: semanticInput,
        before: beforeSlots,
        pendingBefore: options.pendingQuestion,
        pendingAfter: "ready",
        resolvedSlot: "relative-replacement",
      });
      return resolveQuestion(draft, now);
    }
    if (!beforeUnresolved.length) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.error("HydroMateAssistantLoopGuard slot=none action=block-time-period-without-unresolved-slot");
      }
      draft = synchronizeTimeSlotDraft(draft);
      logTimeSlotState(draft, {
        incoming: semanticInput,
        before: beforeSlots,
        pendingBefore: options.pendingQuestion,
        loopGuard: "time-period-without-unresolved-slot",
      });
      return resolveQuestion(draft, now);
    }

    const explicitAnswerSlots = parseAllTimeSlots(semanticInput, options.locale)
      .filter((slot) => slot.status === "resolved");
    let nextSlots = beforeSlots;
    const resolvedKeys: string[] = [];
    if (explicitAnswerSlots.length) {
      nextSlots = beforeSlots.map((slot) => {
        if (slot.status === "resolved") return slot;
        const matchingIndex = explicitAnswerSlots.findIndex((answer) =>
          answer.hour === slot.hour && answer.minute === slot.minute
        );
        const positionalIndex = matchingIndex >= 0
          ? matchingIndex
          : explicitAnswerSlots.findIndex((answer) => answer.index === slot.index);
        if (positionalIndex < 0) return slot;
        const answer = explicitAnswerSlots[positionalIndex];
        explicitAnswerSlots.splice(positionalIndex, 1);
        resolvedKeys.push(timeSlotKey(slot));
        return { ...slot, hour: answer.hour, minute: answer.minute, period: answer.period, status: "resolved" as const, resolvedHour: answer.resolvedHour };
      });
    } else {
      const responsePeriod = normalizeAssistantDayPeriod(semanticInput);
      const current = beforeUnresolved[0];
      const resolvedHour = responsePeriod
        ? resolveAssistantDayPeriodHour(current.hour, responsePeriod)
        : undefined;
      if (resolvedHour !== undefined) {
        nextSlots = beforeSlots.map((slot) => slot.index === current.index
          ? { ...slot, period: responsePeriod, status: "resolved" as const, resolvedHour }
          : slot
        );
        resolvedKeys.push(timeSlotKey(current));
      }
    }

    if (!resolvedKeys.length) {
      return { state: "question", question: "timePeriod", draft };
    }
    const afterUnresolved = unresolvedTimeSlots(nextSlots);
    if (afterUnresolved.length >= beforeUnresolved.length) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.error("HydroMateAssistantLoopGuard action=block-nondecreasing-pending-slots");
      }
      return { state: "question", question: "timePeriod", draft };
    }
    const resolvedTimes = resolvedTimesFromSlots(nextSlots);
    const firstResolved = resolvedTimes[0];
    const target = new Date(now);
    if (firstResolved) target.setHours(firstResolved.hour, firstResolved.minute, 0, 0);
    draft = synchronizeTimeSlotDraft({
      ...draft,
      timeSlots: nextSlots,
      times: resolvedTimes,
      day: draft.day ?? now.getDate(),
      month: draft.month ?? now.getMonth() + 1,
      targetAtMillis: target.getTime(),
      lastAskedTimeSlotKey: afterUnresolved.length
        ? draft.lastAskedTimeSlotKey
        : undefined,
    });
    const nextResult = resolveQuestion(draft, now);
    logTimeSlotState(nextResult.draft, {
      incoming: semanticInput,
      resolvedSlot: resolvedKeys.join(","),
      before: beforeSlots,
      pendingBefore: options.pendingQuestion,
      pendingAfter: nextResult.state === "question" ? nextResult.question : "ready",
    });
    return nextResult;
  }

  if (options.pendingQuestion === "medicineDaily") {
    if (AFFIRMATIVE.test(semanticInput)) {
      draft.medicineDailyConfirmed = true;
      return resolveQuestion(draft, now);
    }
    if (NEGATIVE.test(semanticInput)) {
      return { state: "question", question: "unsupportedMedicineDate", draft };
    }
  }

  if (
    options.pendingQuestion === "timesPerDay" ||
    options.pendingQuestion === "timesPerDayInvalid"
  ) {
    if (hasOneTimeIntent(semanticInput)) {
      draft = {
        ...draft,
        scheduleMode: "once",
        timesPerDay: undefined,
        durationDays: undefined,
        times: draft.hour === undefined || draft.minute === undefined
          ? undefined
          : [{ hour: draft.hour, minute: draft.minute }],
        timesPerDayPromptAttempts: undefined,
      };
      return resolveQuestion(draft, now);
    }
    const timesPerDay = parseTimesPerDay(semanticInput);
    if (timesPerDay) {
      draft = {
        ...draft,
        scheduleMode: "recurring",
        timesPerDay,
        timesPerDayPromptAttempts: undefined,
      };
      const durationDays = parseDurationDays(semanticInput);
      if (durationDays) draft.durationDays = durationDays;
      return resolveQuestion(draft, now);
    }
    const attempts = (draft.timesPerDayPromptAttempts ?? 0) + 1;
    draft = { ...draft, timesPerDayPromptAttempts: attempts };
    return attempts >= ASSISTANT_RECURRENCE_LIMITS.maxInvalidAttempts
      ? { state: "cancelled", draft }
      : { state: "question", question: "timesPerDayInvalid", draft };
  }

  if (
    options.pendingQuestion === "durationDays" ||
    options.pendingQuestion === "durationDaysInvalid"
  ) {
    if (hasOneTimeIntent(semanticInput)) {
      draft = {
        ...draft,
        scheduleMode: "once",
        timesPerDay: undefined,
        durationDays: undefined,
        times: draft.hour === undefined || draft.minute === undefined
          ? undefined
          : [{ hour: draft.hour, minute: draft.minute }],
        durationDaysPromptAttempts: undefined,
      };
      return resolveQuestion(draft, now);
    }
    const durationDays = parseDurationDays(semanticInput) ??
      (/^\d+$/.test(semanticInput) ? Number(semanticInput) : undefined);
    if (
      Number.isInteger(durationDays) &&
      durationDays! >= 1 &&
      durationDays! <= ASSISTANT_RECURRENCE_LIMITS.maxDurationDays
    ) {
      draft = { ...draft, durationDays, durationDaysPromptAttempts: undefined };
      return resolveQuestion(draft, now);
    }
    const attempts = (draft.durationDaysPromptAttempts ?? 0) + 1;
    draft = { ...draft, durationDaysPromptAttempts: attempts };
    return attempts >= ASSISTANT_RECURRENCE_LIMITS.maxInvalidAttempts
      ? { state: "cancelled", draft }
      : { state: "question", question: "durationDaysInvalid", draft };
  }

  if (
    options.pendingQuestion === "recurrenceTimes" ||
    options.pendingQuestion === "recurrenceTimesInvalid"
  ) {
    const timeSlots = parseAllTimeSlots(semanticInput, options.locale);
    const resolvedTimes = resolvedTimesFromSlots(timeSlots);
    const hasDuplicateResolvedTimes = new Set(
      resolvedTimes.map((time) => `${time.hour}:${time.minute}`)
    ).size !== resolvedTimes.length;
    if (timeSlots.length === draft.timesPerDay && !hasDuplicateResolvedTimes) {
      draft = synchronizeTimeSlotDraft({
        ...draft,
        timeSlots,
        times: resolvedTimes,
        recurrenceTimesPromptAttempts: undefined,
      });
      const result = resolveQuestion(draft, now);
      logTimeSlotState(result.draft, {
        incoming: semanticInput,
        before: [],
        pendingBefore: options.pendingQuestion,
        pendingAfter: result.state === "question" ? result.question : "ready",
      });
      return result;
    }
    const attempts = (draft.recurrenceTimesPromptAttempts ?? 0) + 1;
    draft = { ...draft, recurrenceTimesPromptAttempts: attempts };
    return attempts >= ASSISTANT_RECURRENCE_LIMITS.maxInvalidAttempts
      ? { state: "cancelled", draft }
      : { state: "question", question: "recurrenceTimesInvalid", draft };
  }

  if (options.pendingQuestion === "category") {
    const classification = classifyAssistantIntent(semanticInput, options.knownMedicineNames);
    if (classification.ambiguous) {
      return { state: "question", question: "category", draft };
    }
    draft.category = classification.category;
    return resolveQuestion(draft, now);
  } else if (!draft.category) {
    const classification = classifyAssistantIntent(semanticInput, options.knownMedicineNames);
    if (classification.ambiguous) {
      return { state: "question", question: "category", draft };
    }
    draft.category = classification.category;
  }

  let waterAmountExtraction: WaterAmountExtraction | undefined;
  if (draft.category === "water") {
    const isAmountFollowUp =
      options.pendingQuestion === "waterAmount" ||
      options.pendingQuestion === "waterAmountInvalid" ||
      (draft.amountMl === undefined &&
        draft.waterAmountPromptAttempts !== undefined);
    waterAmountExtraction = extractWaterAmount(input, {
      allowBareNumber: isAmountFollowUp,
    });

    if (isAmountFollowUp) {
      if (waterAmountExtraction.amountMl !== undefined) {
        draft = {
          ...draft,
          amountMl: waterAmountExtraction.amountMl,
          waterAmountPromptAttempts: undefined,
        };
        const result = resolveQuestion(draft, now);
        if (
          result.state === "question" &&
          (result.question === "waterAmount" || result.question === "waterAmountInvalid")
        ) {
          const isDevelopment = (
            globalThis as typeof globalThis & { __DEV__?: boolean }
          ).__DEV__;
          if (isDevelopment) {
            console.error("HydroMateAssistantState invariant=valid-water-amount-reprompt prevented");
          }
          return draft.hour === undefined || draft.minute === undefined
            ? { state: "question", question: "time", draft }
            : { state: "ready", draft };
        }
        logWaterAmountDiagnostic(options.locale, waterAmountExtraction, options.pendingQuestion, result);
        return result;
      }

      const nextAttempt = Math.min(
        (draft.waterAmountPromptAttempts ?? 0) + 1,
        2
      );
      draft = {
        ...draft,
        waterAmountPromptAttempts: nextAttempt,
      };
      const result: AssistantTurnResult = nextAttempt === 1
        ? { state: "question", question: "waterAmountInvalid", draft }
        : { state: "cancelled", draft };
      logWaterAmountDiagnostic(options.locale, waterAmountExtraction, options.pendingQuestion, result);
      return result;
    }
  }

  if (options.pendingQuestion === "duration" && /^\d+$/.test(semanticInput)) {
    const durationDays = Number(semanticInput);
    if (Number.isInteger(durationDays) && durationDays > 0) {
      draft.durationDays = durationDays;
      return resolveQuestion(draft, now);
    }
  }

  const statedDuration = semanticInput.match(/\bfor\s+(-?\d+)\s+days?\b/i);
  const hasInvalidStatedDuration =
    Boolean(statedDuration) && Number(statedDuration?.[1]) <= 0;

  const parsedSlots = parseAllTimeSlots(semanticInput, options.locale);
  const parsedTime = parseTemporalIntent(semanticInput, now) ??
    (parsedSlots.length && parsedSlots[0].status === "unresolved"
      ? { kind: "ambiguous-clock" as const, hour: parsedSlots[0].hour, minute: parsedSlots[0].minute }
      : undefined);
  if (parsedTime?.kind === "ambiguous-clock") {
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTime locale=${options.locale ?? "unknown"} raw=${JSON.stringify(`${parsedTime.hour}:${parsedTime.minute}`)} normalizedPeriod=none parsed=${parsedTime.hour}:${parsedTime.minute} final24=unresolved multiTime=[] ambiguity=true`);
    }
    draft = synchronizeTimeSlotDraft({
      ...draft,
      times: resolvedTimesFromSlots(parsedSlots),
      timeSlots: parsedSlots.length
        ? parsedSlots
        : [{
            index: 0,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
            status: "unresolved",
          }],
    });
  } else if (parsedTime) {
    const preserveExistingDate =
      parsedTime.source === "none" &&
      draft.dateSource !== "none" &&
      draft.day !== undefined &&
      draft.month !== undefined;
    const day = preserveExistingDate ? draft.day! : parsedTime.day;
    const month = preserveExistingDate ? draft.month! : parsedTime.month;
    const targetAtMillis = preserveExistingDate
      ? new Date(
          now.getFullYear(),
          month - 1,
          day,
          parsedTime.hour,
          parsedTime.minute,
          0,
          0
        ).getTime()
      : parsedTime.targetAtMillis;

    const parsedAbsoluteTimes = resolvedTimesFromSlots(parsedSlots);
    draft = synchronizeTimeSlotDraft({
      ...draft,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      day,
      month,
      dateSource: preserveExistingDate ? draft.dateSource : parsedTime.source,
      targetAtMillis,
      relativeDurationMinutes:
        parsedTime.kind === "relative"
          ? parsedTime.offsetMinutes
          : undefined,
      times: parsedAbsoluteTimes.length
        ? parsedAbsoluteTimes
        : [{ hour: parsedTime.hour, minute: parsedTime.minute }],
      timeSlots: parsedSlots.length
        ? parsedSlots
        : [{
            index: 0,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
            status: "resolved",
            resolvedHour: parsedTime.hour,
          }],
      lastAskedTimeSlotKey: undefined,
      ambiguousHour: undefined,
      ambiguousMinute: undefined,
    });
  } else {
    const calendar = parseCalendarDate(semanticInput, now);
    if (calendar) {
      draft.day = calendar.day;
      draft.month = calendar.month;
      draft.dateSource = calendar.source;
    }
  }

  if (hasOneTimeIntent(semanticInput)) {
    draft.scheduleMode = "once";
    draft.timesPerDay = undefined;
    draft.durationDays = undefined;
    draft.times = draft.hour === undefined || draft.minute === undefined
      ? undefined
      : [{ hour: draft.hour, minute: draft.minute }];
  } else {
    const parsedTimesPerDay = parseTimesPerDay(semanticInput);
    if (hasStatedTimesPerDay(semanticInput) && parsedTimesPerDay) {
      draft.scheduleMode = "recurring";
      draft.timesPerDay = parsedTimesPerDay;
    }
    const parsedDuration = parseDurationDays(semanticInput);
    if (parsedDuration) draft.durationDays = parsedDuration;
  }

  if (draft.category === "medicine") {
    draft.durationDays =
      draft.durationDays ??
      parseDurationDays(semanticInput) ??
      (options.pendingQuestion === "duration" && /^\d+$/.test(semanticInput)
        ? Number(semanticInput)
        : undefined);
    if (options.pendingQuestion === "medicineName") {
      draft.medicineName = input.replace(/[.,!?]+$/g, "").trim();
    } else {
      draft.medicineName = draft.medicineName?.trim()
        ? draft.medicineName
        : extractMedicineName(semanticInput);
    }
    draft.medicineType = draft.medicineType ?? extractMedicineType(semanticInput);
  } else if (draft.category === "water") {
    if (draft.amountMl === undefined && waterAmountExtraction?.amountMl !== undefined) {
      draft = {
        ...draft,
        amountMl: waterAmountExtraction.amountMl,
        waterAmountPromptAttempts: undefined,
      };
    }
    if (waterAmountExtraction?.invalid) {
      const result: AssistantTurnResult = {
        state: "question",
        question: "waterAmountInvalid",
        draft: { ...draft, waterAmountPromptAttempts: 1 },
      };
      logWaterAmountDiagnostic(options.locale, waterAmountExtraction, options.pendingQuestion, result);
      return result;
    }
  } else if (draft.category === "birthday") {
    draft.title =
      draft.title?.trim()
        ? draft.title
        : options.pendingQuestion === "title"
          ? input.replace(/[.,!?]+$/g, "").trim()
          : extractBirthdayName(semanticInput);
  } else if (draft.category === "anniversary") {
    draft.title =
      draft.title?.trim()
        ? draft.title
        : options.pendingQuestion === "title"
          ? input.replace(/[.,!?]+$/g, "").trim()
          : extractAnniversaryName(semanticInput);
  } else {
    draft.durationDays =
      draft.durationDays ??
      parseDurationDays(semanticInput) ??
      (options.pendingQuestion === "duration" && /^\d+$/.test(semanticInput)
        ? Number(semanticInput)
        : undefined);
    draft.title =
      draft.title?.trim()
        ? draft.title
        : options.pendingQuestion === "title"
          ? input.replace(/[.,!?]+$/g, "").trim()
          : cleanCustomTitle(semanticInput);
  }

  if (hasInvalidStatedDuration) {
    return { state: "question", question: "duration", draft };
  }

  const result = resolveQuestion(draft, now);
  if (draft.category === "water" && waterAmountExtraction) {
    logWaterAmountDiagnostic(options.locale, waterAmountExtraction, options.pendingQuestion, result);
  }
  return result;
}

export function splitAssistantReminderClauses(rawInput: string) {
  const input = normalizeInput(rawInput);
  const clauses = input
    .split(/\s*(?:,\s*)?(?:and\s+|then\s+)?(?=(?:also\s+)?remind\s+me\s+(?:to|about)\s+)/i)
    .map((clause) => clause.trim().replace(/^also\s+/i, ""))
    .filter(Boolean);

  return clauses.length ? clauses : [input];
}

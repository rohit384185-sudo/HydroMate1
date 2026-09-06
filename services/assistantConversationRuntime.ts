import { isAssistantCancellation, normalizeAssistantConfirmation, normalizeAssistantTranscript } from "./assistantLocaleNormalizer";
import { ASSISTANT_SUCCESS_SPEECH_FALLBACK_MILLIS } from "./assistantTiming";
import {
  parseAssistantTurn, reconcileAssistantTimeState, resolveAssistantNextState,
  type AssistantReminderDraft, type AssistantQuestionCode, type AssistantTurnResult,
} from "./hydromateAssistantParser";

export function reconcileAssistantRuntimeResult(result: AssistantTurnResult, previous?: AssistantReminderDraft, now = new Date()) {
  if (result.state === "cancelled") return result;
  const draft = reconcileAssistantTimeState(result.draft, previous);
  // The modal uses this boundary immediately before committing/speaking a question.
  if (result.state === "ready" || ["timePeriod", "time", "recurrenceTimes"].includes(result.question)) {
    const next = resolveAssistantNextState(draft, now);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.assert(!(next.state === "question" && next.question === "timePeriod" &&
        next.draft.times?.length === (next.draft.timesPerDay ?? Math.max(next.draft.timeSlots?.length ?? 0, 1))), "HydroMateAssistantRuntime complete-times-period-question");
      console.assert(!next.draft.timeSlots?.some((slot) => slot.period && slot.status === "unresolved"),
        "HydroMateAssistantRuntime explicit-period-unresolved");
    }
    return next;
  }
  return { ...result, draft };
}

export function processAssistantRuntimeTurn(raw: string, options: {
  draft?: AssistantReminderDraft;
  pendingQuestion?: AssistantQuestionCode;
  locale?: string;
  now?: Date;
  knownMedicineNames?: string[];
}) {
  if (options.pendingQuestion === "confirmation" || options.pendingQuestion === "confirmationInvalid") {
    return { kind: "confirmation" as const, confirmation: normalizeAssistantConfirmation(raw, options.locale) };
  }
  let result = reconcileAssistantRuntimeResult(parseAssistantTurn(raw, options), options.draft, options.now);
  if (result.state === "cancelled" && !isAssistantCancellation(raw, options.locale)) {
    // A parser retry limit is not an explicit user cancellation.
    result = { state: "question", question: "unclear", draft: result.draft };
  }
  return { kind: "reminder" as const, result,
    normalized: normalizeAssistantTranscript(raw, options.locale).normalizedTranscript,
    reason: result.state === "ready" ? "required-fields-complete" : result.state === "cancelled" ? "cancelled" : `missing:${result.question}` };
}

export type AssistantCloseReason = "explicit-reject" | "explicit-cancel" | "initial-silence-timeout" |
  "recognition-error" | "manual" | "persistence-success" | "reminder-save-success" | "speechend" | "stale-timeout" |
  "stt-restart" | "expected-abort" | "old-turn" | "old-session";

export function canCloseAssistant(reason: AssistantCloseReason, state: {
  activeReminder: boolean; saving: boolean; persistenceVerified: boolean;
  timeoutCycle: number; userSpeechActive: boolean; currentCallback?: boolean;
}) {
  if (state.currentCallback === false) return false;
  if (reason === "persistence-success" || reason === "reminder-save-success") return state.persistenceVerified;
  if (state.saving) return false;
  if (["speechend", "stale-timeout", "stt-restart", "expected-abort", "old-turn", "old-session"].includes(reason)) return false;
  if (reason === "manual" || reason === "explicit-cancel" || reason === "explicit-reject") return true;
  if (state.userSpeechActive) return false;
  if (reason === "recognition-error") return !state.activeReminder;
  return !state.activeReminder || state.timeoutCycle >= 2;
}

export function nextAssistantSilenceAction(state: {
  activeReminder: boolean; timeoutCycle: number; saving: boolean;
  currentCallback: boolean; userSpeechActive: boolean; responded: boolean;
}) {
  if (!state.currentCallback || state.saving || state.userSpeechActive || state.responded) {
    return { action: "ignore" as const, timeoutCycle: state.timeoutCycle };
  }
  const timeoutCycle = state.timeoutCycle + 1;
  return { action: state.activeReminder && timeoutCycle === 1 ? "reprompt" as const : "close" as const, timeoutCycle };
}

export type VerifiedAssistantSave = { success: true; reference: { recordId: string } };
export async function writeVerifiedAssistantRecord(storage: {
  setItem: (key: string, value: string) => Promise<unknown>;
  getItem: (key: string) => Promise<string | null>;
}, key: string, value: string) {
  await storage.setItem(key, value);
  if (await storage.getItem(key) !== value) throw new Error("Assistant storage read-back did not match the saved reminder.");
}
export type AssistantSaveLedger<T extends VerifiedAssistantSave> = {
  results: T[]; inProgress: boolean; verified: boolean; completed: boolean; confirmationTimestamp?: number;
};
export function createAssistantSaveLedger<T extends VerifiedAssistantSave>(): AssistantSaveLedger<T> {
  return { results: [], inProgress: false, verified: false, completed: false };
}

export function claimAssistantSave<T extends VerifiedAssistantSave>(ledger: AssistantSaveLedger<T>) {
  if (ledger.inProgress || ledger.completed) return false;
  ledger.inProgress = true;
  ledger.confirmationTimestamp ??= Date.now();
  return true;
}

export async function persistAssistantConfirmation<T extends VerifiedAssistantSave>(
  ledger: AssistantSaveLedger<T>, drafts: AssistantReminderDraft[],
  persist: (draft: AssistantReminderDraft, options: { confirmationTimestamp: number }) => Promise<T>
) {
  if (!ledger.inProgress || !drafts.length) throw new Error("Assistant save must be claimed with a nonempty snapshot.");
  for (let index = ledger.results.length; index < drafts.length; index += 1) {
    const result = await persist(drafts[index], { confirmationTimestamp: ledger.confirmationTimestamp! });
    if (result?.success !== true || !result.reference?.recordId) throw new Error("Assistant persistence was not verified.");
    // Keep successful writes on retry; a later failed item must not recreate them.
    ledger.results.push(result);
  }
  ledger.verified = ledger.results.length === drafts.length;
  if (!ledger.verified) throw new Error("Assistant persistence did not return every saved reminder.");
  return ledger.results;
}

export async function finishAssistantConfirmation<T extends VerifiedAssistantSave>(ledger: AssistantSaveLedger<T>, actions: {
  speakSuccess: (signal: AbortSignal) => Promise<unknown>; clearDraft: () => void; close: () => void;
}) {
  if (!ledger.inProgress || !ledger.verified || ledger.completed) throw new Error("Unverified/duplicate confirmation close blocked.");
  const speech = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    Promise.resolve().then(() => actions.speakSuccess(speech.signal)).then(
      (result) => result === "error" ? "failed" : "completed",
      () => "failed"
    ),
    new Promise<string>((resolve) => {
      timer = setTimeout(() => resolve("fallback"), ASSISTANT_SUCCESS_SPEECH_FALLBACK_MILLIS);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
  // Cancel only this utterance, including a delayed voice lookup.
  if (outcome !== "completed") speech.abort();
  if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
    console.log(`HydroMateAssistantConfirm successTts=${outcome}`);
  }
  actions.clearDraft();
  ledger.completed = true;
  actions.close();
}

export function logAssistantRuntime(fields: Record<string, unknown>) {
  if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
    console.log(`HydroMateAssistantRuntime ${JSON.stringify(fields)}`);
  }
}

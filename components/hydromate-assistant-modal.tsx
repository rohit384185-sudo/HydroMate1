import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useHydroMateSpeechRecognition } from "../hooks/useHydroMateSpeechRecognition";
import { useLocalization } from "../localization";
import { normalizeAssistantTranscript } from "../services/assistantLocaleNormalizer";
import { getAssistantFirstDailyOccurrences } from "../services/assistantNextOccurrence";
import { getAssistantTurnResponseWaitMillis } from "../services/assistantTiming";
import {
  canCloseAssistant, nextAssistantSilenceAction, processAssistantRuntimeTurn,
  reconcileAssistantRuntimeResult, createAssistantSaveLedger, claimAssistantSave,
  persistAssistantConfirmation, finishAssistantConfirmation, logAssistantRuntime,
  type AssistantCloseReason,
} from "../services/assistantConversationRuntime";
import {
  beginAssistantManualTurn,
  beginAssistantRuntimeSession,
  claimAssistantSpeechTurn,
  clearAssistantRuntimeState,
  inactiveAssistantRuntimeState,
  isCurrentAssistantTurn,
} from "../services/assistantRuntimeState";
import { loadKnownMedicineNames, saveAssistantReminder, type AssistantReminderSaveResult } from "../services/assistantReminderCreationService";
import {
  getAssistantRecentReminderAgeDays,
  isAssistantRecentReminderReadyForReview,
  type AssistantRecentReminder,
} from "../services/assistantRecentReminderModel";
import {
  keepAssistantRecentReminder,
  loadAssistantRecentReminders,
  recordAssistantRecentReminders,
  removeAssistantRecentReminder,
} from "../services/assistantRecentReminderService";
import { splitAssistantReminderClauses, type AssistantQuestionCode, type AssistantReminderDraft } from "../services/hydromateAssistantParser";
import type { ReminderCategory } from "../services/reminderCategoryService";
import { archiveReminderPlan, continueReminderPlan, createReminderPlan, getReminderPlanProgress, loadReminderPlans, type ReminderPlan } from "../services/reminderPlanService";
import { getVoiceRemindersEnabled, speakAssistantResponse, stopAssistantResponse } from "../services/voiceReminderService";

type Props = { visible: boolean; userName?: string; assistantSessionId: number; responseWaitSeconds: number; wakeWordEnabled: boolean; onClose: () => void; onReminderSaved?: () => void };
const CATEGORIES: ReminderCategory[] = ["water", "medicine", "birthday", "anniversary", "custom"];
const questionKey = (question: AssistantQuestionCode) => `assistant.question.${question}` as const;

export function HydroMateAssistantModal({ visible, userName, assistantSessionId, responseWaitSeconds, wakeWordEnabled, onClose, onReminderSaved }: Props) {
  const { language, locale, t } = useLocalization();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [drafts, setDrafts] = useState<AssistantReminderDraft[]>([]);
  const [editingIndex, setEditingIndex] = useState<number>();
  const [pendingQuestion, setPendingQuestion] = useState<AssistantQuestionCode>();
  const [assistantText, setAssistantText] = useState("");
  const [knownMedicineNames, setKnownMedicineNames] = useState<string[]>([]);
  const [showPermissionExplanation, setShowPermissionExplanation] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState("");
  const [plans, setPlans] = useState<ReminderPlan[]>([]);
  const [continuingPlan, setContinuingPlan] = useState<ReminderPlan>();
  const [recentReminders, setRecentReminders] = useState<AssistantRecentReminder[]>([]);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const processedSpeechSessionRef = useRef<number | undefined>(undefined);
  const draftRef = useRef<AssistantReminderDraft | undefined>(undefined);
  const pendingQuestionRef = useRef<AssistantQuestionCode | undefined>(undefined);
  const runtimeStateRef = useRef(inactiveAssistantRuntimeState);
  const initializedAssistantSessionRef = useRef(0);
  const activeAssistantSessionRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const beginListeningRef = useRef<(request: boolean, responseWaitMillis?: number) => Promise<boolean | undefined>>(
    async () => false
  );
  const abortListeningRef = useRef<() => void>(() => {});
  const savingRef = useRef(false);
  const confirmationCommitInProgressRef = useRef(false);
  const draftsRef = useRef<AssistantReminderDraft[]>([]);
  const confirmationAttemptsRef = useRef(0);
  const finalizeReminderConfirmationRef = useRef<(source: "voice" | "tap") => Promise<void>>(async () => {});
  const confirmationContextRef = useRef({ assistantSessionId: 0, turnId: 0, speechSessionId: 0 });
  const timeoutCycleRef = useRef(0);
  const lastTimeoutSpeechSessionRef = useRef(0);
  const saveLedgerRef = useRef(createAssistantSaveLedger<AssistantReminderSaveResult>());
  const savedPlanIdsRef = useRef(new Map<number, string>());
  const speechRuntimeRef = useRef(() => ({ assistantSessionId: 0, speechSessionId: 0, userSpeechActive: false, responded: false }));
  const hasActiveReminder = useCallback(() => Boolean(draftRef.current || draftsRef.current.length || pendingQuestionRef.current), []);
  const requestAssistantClose = useCallback((reason: AssistantCloseReason) => {
    const saveActive = confirmationCommitInProgressRef.current || savingRef.current;
    const allowed = canCloseAssistant(reason, {
      activeReminder: hasActiveReminder(), saving: saveActive,
      persistenceVerified: saveLedgerRef.current.verified, timeoutCycle: timeoutCycleRef.current,
      userSpeechActive: speechRuntimeRef.current().userSpeechActive,
    });
    logAssistantRuntime({ assistantSessionId: initializedAssistantSessionRef.current, turnId: runtimeStateRef.current.turnId,
      closeRequested: reason, close: allowed ? "ALLOWED" : "BLOCKED", timeoutCycle: timeoutCycleRef.current, saveActive });
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.assert(!allowed || !saveActive || (reason === "reminder-save-success" && saveLedgerRef.current.verified), "HydroMateAssistantRuntime close-before-verified-save");
      console.assert(reason !== "initial-silence-timeout" || !allowed || !hasActiveReminder() ||
        (timeoutCycleRef.current >= 2 && !speechRuntimeRef.current().userSpeechActive), "HydroMateAssistantRuntime premature-timeout-close");
    }
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantConfirm close=requested reason=${reason} saveActive=${saveActive} result=${allowed ? "allowed" : "blocked"}`);
    }
    if (!allowed) return false;
    onCloseRef.current();
    return true;
  }, [hasActiveReminder]);
  const configuredResponseWaitMillis = responseWaitSeconds * 1_000;
  const getTurnResponseWaitMillis = useCallback(
    (question?: AssistantQuestionCode) => getAssistantTurnResponseWaitMillis(
      configuredResponseWaitMillis,
      question === "confirmation" || question === "confirmationInvalid",
      hasActiveReminder()
    ),
    [configuredResponseWaitMillis, hasActiveReminder]
  );

  const commitPendingState = useCallback((
    nextDraft: AssistantReminderDraft | undefined,
    nextQuestion: AssistantQuestionCode | undefined
  ) => {
    draftRef.current = nextDraft;
    pendingQuestionRef.current = nextQuestion;
    setPendingQuestion(nextQuestion);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (await getVoiceRemindersEnabled()) await speakAssistantResponse(language, text);
  }, [language]);
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const categoryLabel = useCallback((category: ReminderCategory) => t(category === "custom" ? "reminders.routine" : `reminders.${category}`), [t]);
  const getQuestionText = useCallback((question: AssistantQuestionCode, draft?: AssistantReminderDraft) => {
    const slot = draft?.timeSlots?.find((item) => item.status === "unresolved");
    return question === "timePeriod" && slot
      ? t("assistant.question.timePeriodSlot", { time: `${slot.hour}:${String(slot.minute).padStart(2, "0")}` })
      : t(questionKey(question), { count: draft?.timesPerDay ?? 1 });
  }, [t]);
  const formatTimes = useCallback((item: AssistantReminderDraft) => (item.times?.length ? item.times : item.hour === undefined || item.minute === undefined ? [] : [{ hour: item.hour, minute: item.minute }]).map(({ hour, minute }) => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hour, minute))).join(" + "), [locale]);
  const titleFor = useCallback((item: AssistantReminderDraft) => item.category === "medicine" ? item.medicineName : item.category === "water" ? t("assistant.waterAmount", { amount: item.amountMl ?? 0 }) : item.title, [t]);
  const buildConfirmationSummary = useCallback((items: AssistantReminderDraft[]) => {
    const confirmationNow = new Date();
    const summary = items.map((item) => {
      const timing = item.relativeDurationMinutes
        ? t("assistant.relativeTimeSummary", { count: item.relativeDurationMinutes })
        : formatTimes(item);
      const recurrence = item.scheduleMode === "once"
        ? t("assistant.onceSummary")
        : t("assistant.recurringSummary", {
            times: item.timesPerDay ?? item.times?.length ?? 1,
            days: item.durationDays ?? 1,
          });
      let rolloverSummary = "";
      if (item.scheduleMode === "recurring" && item.dateSource === "none") {
        const times = item.times?.length
          ? item.times
          : item.hour === undefined || item.minute === undefined
            ? []
            : [{ hour: item.hour, minute: item.minute }];
        const firstOccurrences = getAssistantFirstDailyOccurrences(times, confirmationNow);
        const todayTimes = firstOccurrences.filter((occurrence) => occurrence.rollover === "today");
        const tomorrowTimes = firstOccurrences.filter((occurrence) => occurrence.rollover === "tomorrow");
        const formatOccurrenceTimes = (occurrences: typeof firstOccurrences) =>
          occurrences.map(({ hour, minute }) => formatTimes({ ...item, times: [{ hour, minute }] })).join(" + ");
        rolloverSummary = todayTimes.length && tomorrowTimes.length
          ? t("assistant.rolloverMixed", {
              todayTimes: formatOccurrenceTimes(todayTimes),
              tomorrowTimes: formatOccurrenceTimes(tomorrowTimes),
            })
          : tomorrowTimes.length
            ? t("assistant.rolloverTomorrow", { times: formatOccurrenceTimes(tomorrowTimes) })
            : todayTimes.length
              ? t("assistant.rolloverToday", { times: formatOccurrenceTimes(todayTimes) })
              : "";
      }
      return [titleFor(item), timing, recurrence, rolloverSummary].filter(Boolean).join(" ");
    }).join(" ");
    return t("assistant.question.confirmation", { summary });
  }, [formatTimes, t, titleFor]);
  const addReadyDraft = useCallback((ready: AssistantReminderDraft) => {
    const nextDrafts = editingIndex === undefined
      ? [...draftsRef.current, ready]
      : draftsRef.current.map((item, index) => index === editingIndex ? ready : item);
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    setEditingIndex(undefined); commitPendingState(undefined, undefined);
  }, [commitPendingState, editingIndex]);

  const processInput = useCallback(async (raw: string, claimedTurnId?: number, claimedSpeechSessionId = 0) => {
    if (confirmationCommitInProgressRef.current || savingRef.current) return;
    const command = raw.trim();
    if (!command) { setAssistantText(t("assistant.question.unclear")); return; }
    let turnId = claimedTurnId;
    if (turnId === undefined) {
      abortListeningRef.current();
      const claim = beginAssistantManualTurn(runtimeStateRef.current);
      runtimeStateRef.current = claim.state;
      if (!claim.accepted) return;
      turnId = claim.turnId;
    }
    const turnAssistantSessionId = runtimeStateRef.current.assistantSessionId;
    timeoutCycleRef.current = 0;
    if (continuingPlan && pendingQuestionRef.current !== "confirmation" && pendingQuestionRef.current !== "confirmationInvalid") {
      const days = Number(command.match(/\d+/)?.[0]);
      if (!Number.isInteger(days) || days <= 0) {
        setAssistantText(t("assistant.customContinuePrompt"));
        return;
      }
      void continueReminderPlan(continuingPlan, days).then(async () => {
        setContinuingPlan(undefined); setInput(""); setPlans(await loadReminderPlans());
        setAssistantText(t("assistant.planContinued", { count: days }));
      });
      return;
    }
    setLastTranscript(command); setInput("");
    const currentDraft = draftRef.current;
    const currentQuestion = pendingQuestionRef.current;
    if (currentQuestion === "confirmation" || currentQuestion === "confirmationInvalid") {
      const turn = processAssistantRuntimeTurn(command, { pendingQuestion: currentQuestion, locale: language });
      if (turn.kind !== "confirmation") return;
      const confirmation = turn.confirmation;
      const intent = confirmation.intent;
      logAssistantRuntime({ locale: language, assistantSessionId: turnAssistantSessionId, turnId, speechSessionId: claimedSpeechSessionId,
        raw: command, normalized: confirmation.normalizedText, pendingBefore: currentQuestion,
        confirmation: intent === "confirm" ? "ACCEPT" : intent === "reject" ? "REJECT" : "UNCLEAR", timeoutCycle: 0 });
      confirmationContextRef.current = {
        assistantSessionId: turnAssistantSessionId,
        turnId,
        speechSessionId: claimedSpeechSessionId,
      };
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantConfirm locale=${language} assistantSession=${turnAssistantSessionId} turn=${turnId} speechSession=${claimedSpeechSessionId} raw=${JSON.stringify(command)} normalized=${JSON.stringify(confirmation.normalizedText)} result=${intent === "confirm" ? "ACCEPT" : intent === "reject" ? "REJECT" : "UNCLEAR"}`);
      }
      if (intent === "confirm") {
        if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
          console.log("HydroMateAssistantState confirmation=normalized intent=confirm");
        }
        await finalizeReminderConfirmationRef.current("voice");
        return;
      }
      if (intent === "reject") {
        draftsRef.current = [];
        confirmationAttemptsRef.current = 0;
        setDrafts([]);
        commitPendingState(undefined, undefined);
        setLastTranscript("");
        setInput("");
        const cancelled = t("assistant.cancelled");
        setAssistantText(cancelled);
        void speak(cancelled).finally(() => {
          if (!isCurrentAssistantTurn(runtimeStateRef.current, turnAssistantSessionId, turnId!)) return;
          runtimeStateRef.current = clearAssistantRuntimeState(runtimeStateRef.current);
          activeAssistantSessionRef.current = 0;
          requestAssistantClose("explicit-reject");
        });
        return;
      }

      confirmationAttemptsRef.current += 1;
      commitPendingState(undefined, "confirmationInvalid");
      const retry = t("assistant.question.confirmationInvalid");
      setAssistantText(retry);
      void (async () => {
        if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
          console.log(`HydroMateAssistantTiming turn=${turnId} tts=start kind=confirmation-retry`);
        }
        await speak(retry);
        if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
          console.log(`HydroMateAssistantTiming turn=${turnId} tts=end kind=confirmation-retry`);
        }
        if (!isCurrentAssistantTurn(runtimeStateRef.current, turnAssistantSessionId, turnId!)) return;
        await beginListeningRef.current(false, getTurnResponseWaitMillis("confirmationInvalid"));
      })();
      return;
    }
    const clauses = currentDraft || currentQuestion ? [command] : splitAssistantReminderClauses(command);
    let activeDraft = currentDraft; let activeQuestion = currentQuestion;
    for (const clause of clauses) {
      let result;
      try {
        const turn = processAssistantRuntimeTurn(clause, { draft: activeDraft, pendingQuestion: activeQuestion, knownMedicineNames, locale: language });
        if (turn.kind !== "reminder") return;
        result = reconcileAssistantRuntimeResult(turn.result, draftRef.current);
        logAssistantRuntime({ locale: language, assistantSessionId: turnAssistantSessionId, turnId, speechSessionId: claimedSpeechSessionId,
          raw: clause, normalized: turn.normalized, expectedTimes: result.draft.timesPerDay ?? 1,
          timeSlots: result.draft.timeSlots?.map((slot) => ({ ...slot, resolved24Hour: slot.resolvedHour === undefined ? null : `${String(slot.resolvedHour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}` })),
          exactTimes: result.draft.times, pendingBefore: activeQuestion,
          pendingAfter: result.state === "ready" ? "confirmation" : result.state === "question" ? result.question : "cancelled",
          reason: turn.reason, timeoutCycle: timeoutCycleRef.current });
      } catch (error) {
        console.error("HydroMateAssistantState parser=error draft=preserved", error);
        setAssistantText(t("assistant.speechError"));
        return;
      }
      const isDevelopment = (
        globalThis as typeof globalThis & { __DEV__?: boolean }
      ).__DEV__;
      if (isDevelopment) {
        const normalized = normalizeAssistantTranscript(clause, language).normalizedTranscript;
        console.log(
          `HydroMateAssistantState turn=${turnId} locale=${language} raw=${JSON.stringify(command)} normalized=${JSON.stringify(normalized)} beforeDraft=${JSON.stringify(activeDraft ?? null)} beforePending=${activeQuestion ?? "none"} result=${result.state}${result.state === "question" ? `:${result.question}` : ""} entities=amount:${result.draft.amountMl ?? "none"},time:${result.draft.hour === undefined ? "none" : `${result.draft.hour}:${result.draft.minute ?? 0}`},date:${result.draft.day && result.draft.month ? `${result.draft.day}/${result.draft.month}` : "none"},relative:${result.draft.relativeDurationMinutes ? "yes" : "no"} afterDraft=${JSON.stringify(result.draft)} nextPending=${result.state === "question" ? result.question : "none"}`
        );
      }
      if (result.state === "cancelled") {
        commitPendingState(undefined, undefined); setLastTranscript(""); setInput("");
        const cancelled = t("assistant.cancelled"); setAssistantText(cancelled);
        if (isDevelopment) {
          console.log(`HydroMateAssistantState turn=${turnId} response=cancelled state=cleared`);
        }
        void speak(cancelled).finally(() => {
          if (!isCurrentAssistantTurn(runtimeStateRef.current, turnAssistantSessionId, turnId!)) return;
          runtimeStateRef.current = clearAssistantRuntimeState(runtimeStateRef.current);
          requestAssistantClose("explicit-cancel");
        });
        return;
      }
      if (result.state === "question") {
        commitPendingState(result.draft, result.question);
        const question = getQuestionText(result.question, result.draft); setAssistantText(question);
        void (async () => {
          if (isDevelopment) console.log(`HydroMateAssistantTiming turn=${turnId} tts=start kind=${result.question}`);
          await speak(question);
          if (isDevelopment) console.log(`HydroMateAssistantTiming turn=${turnId} tts=end kind=${result.question}`);
          if (!isCurrentAssistantTurn(runtimeStateRef.current, turnAssistantSessionId, turnId!)) return;
          const started = await beginListeningRef.current(false, getTurnResponseWaitMillis(result.question));
          if (isDevelopment) {
            console.log(`HydroMateAssistantState turn=${turnId} response=question sttRestarted=${started === true} timeout=${started === true ? "armed" : "not-armed"}`);
          }
        })();
        return;
      }
      addReadyDraft(result.draft); activeDraft = undefined; activeQuestion = undefined;
    }
    confirmationAttemptsRef.current = 0;
    commitPendingState(undefined, "confirmation");
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTimeState transition=confirmation exactTimes=${JSON.stringify(draftsRef.current.map((item) => item.times ?? []))}`);
    }
    const understood = buildConfirmationSummary(draftsRef.current);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantState turn=${turnId} response=confirmation pending=confirmation drafts=${draftsRef.current.length}`);
    }
    setAssistantText(understood);
    void (async () => {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantTiming turn=${turnId} tts=start kind=confirmation`);
      }
      await speak(understood);
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantTiming turn=${turnId} tts=end kind=confirmation`);
      }
      if (!isCurrentAssistantTurn(runtimeStateRef.current, turnAssistantSessionId, turnId!)) return;
      await beginListeningRef.current(false, getTurnResponseWaitMillis("confirmation"));
    })();
  }, [addReadyDraft, buildConfirmationSummary, commitPendingState, continuingPlan, getQuestionText, getTurnResponseWaitMillis, knownMedicineNames, language, requestAssistantClose, speak, t]);

  const handleSpeechError = useCallback((failure: string) => {
    if (failure === "aborted") {
      if (confirmationCommitInProgressRef.current && (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log("HydroMateAssistantConfirm callback=stt-abort result=ignored reason=commit-active");
      }
      return;
    }
    if (confirmationCommitInProgressRef.current) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantState stt=error reason=${failure} ignored=save-committed`);
      }
      return;
    }
    if (failure === "permission-blocked") { setPermissionBlocked(true); setAssistantText(t("assistant.speechPermissionBlocked")); }
    else if (failure === "not-allowed") setAssistantText(t("assistant.speechPermissionDenied"));
    else if (failure === "no-speech" || failure === "speech-timeout") setAssistantText(t("assistant.speechTimeout"));
    else if (failure === "language-not-supported" || failure === "unsupported-locale") setAssistantText(t("assistant.speechLocaleUnavailable"));
    else if (failure === "unavailable" || failure === "service-not-allowed") setAssistantText(t("assistant.speechUnavailable"));
    else setAssistantText(t("assistant.speechError"));
    // Recognition failures are retryable: never erase an active reminder or confirmation.
    if (hasActiveReminder()) {
      logAssistantRuntime({ assistantSessionId: activeAssistantSessionRef.current, reason: failure, close: "BLOCKED", draft: "preserved" });
      return;
    }
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantState stt=error reason=${failure} state=cleared modal=closing`);
      console.log(`HydroMateAssistantTiming close=stt-error reason=${failure}`);
    }
    const errorSessionId = activeAssistantSessionRef.current;
    const errorTurnId = runtimeStateRef.current.turnId;
    void stopAssistantResponse().finally(() => {
      if (isCurrentAssistantTurn(runtimeStateRef.current, errorSessionId, errorTurnId)) requestAssistantClose("recognition-error");
    });
  }, [hasActiveReminder, requestAssistantClose, t]);
  const handleTranscript = useCallback((transcript: string, sessionId: number) => {
    const claim = claimAssistantSpeechTurn(
      runtimeStateRef.current,
      activeAssistantSessionRef.current,
      sessionId
    );
    runtimeStateRef.current = claim.state;
    if (!claim.accepted || sessionId <= (processedSpeechSessionRef.current ?? 0)) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantState stt=stale speechSession=${sessionId} ignored=true`);
      }
      return;
    }
    processedSpeechSessionRef.current = sessionId;
    setInput(transcript);
    processInput(transcript, claim.turnId, sessionId);
  }, [processInput]);
  const handlePartialTranscript = useCallback((transcript: string, sessionId: number) => {
    if (
      !runtimeStateRef.current.active ||
      runtimeStateRef.current.assistantSessionId !== activeAssistantSessionRef.current ||
      sessionId <= (processedSpeechSessionRef.current ?? 0)
    ) return;
    setInput(transcript);
  }, []);
  const handleInitialSilenceTimeout = useCallback(async (timedOutAssistantSessionId: number, timedOutSpeechSessionId: number) => {
    if (confirmationCommitInProgressRef.current) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantState timeout=ignored reason=save-committed speechSession=${timedOutSpeechSessionId}`);
      }
      return;
    }
    const speech = speechRuntimeRef.current();
    const decision = nextAssistantSilenceAction({
      activeReminder: hasActiveReminder(), timeoutCycle: timeoutCycleRef.current,
      saving: confirmationCommitInProgressRef.current,
      currentCallback: activeAssistantSessionRef.current === timedOutAssistantSessionId &&
        speech.speechSessionId === timedOutSpeechSessionId &&
        timedOutSpeechSessionId > lastTimeoutSpeechSessionRef.current &&
        timedOutSpeechSessionId > (processedSpeechSessionRef.current ?? 0),
      userSpeechActive: speech.userSpeechActive, responded: speech.responded,
    });
    logAssistantRuntime({ assistantSessionId: timedOutAssistantSessionId, speechSessionId: timedOutSpeechSessionId,
      timeoutCycle: decision.timeoutCycle, timeout: decision.action });
    if (decision.action === "ignore") return;
    lastTimeoutSpeechSessionRef.current = timedOutSpeechSessionId;
    timeoutCycleRef.current = decision.timeoutCycle;
    const timeoutTurnId = runtimeStateRef.current.turnId;
    if (decision.action === "reprompt") {
      const currentQuestion = pendingQuestionRef.current;
      const prompt = t("assistant.stillListening", { question: currentQuestion ? getQuestionText(currentQuestion, draftRef.current) : t("assistant.question.unclear") });
      setAssistantText(prompt);
      await speak(prompt);
      if (!isCurrentAssistantTurn(runtimeStateRef.current, timedOutAssistantSessionId, timeoutTurnId) || confirmationCommitInProgressRef.current) return;
      await beginListeningRef.current(false, getTurnResponseWaitMillis(currentQuestion));
      return;
    }
    await stopAssistantResponse();
    if (
      confirmationCommitInProgressRef.current ||
      !isCurrentAssistantTurn(runtimeStateRef.current, timedOutAssistantSessionId, timeoutTurnId) ||
      speechRuntimeRef.current().userSpeechActive || speechRuntimeRef.current().responded
    ) return;
    if (!requestAssistantClose("initial-silence-timeout")) return;
    activeAssistantSessionRef.current = 0;
    draftsRef.current = [];
    confirmationAttemptsRef.current = 0;
    commitPendingState(undefined, undefined); setLastTranscript(""); setInput(""); setDrafts([]);
    runtimeStateRef.current = clearAssistantRuntimeState(runtimeStateRef.current);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTiming speechSession=${timedOutSpeechSessionId} close=initial-silence-timeout`);
    }
  }, [commitPendingState, getQuestionText, getTurnResponseWaitMillis, hasActiveReminder, requestAssistantClose, speak, t]);
  const { isListening, isUserSpeechActive, getSpeechRuntimeState, getPermissionState, startListening, abortListening, cancelInitialSilenceTimeout } = useHydroMateSpeechRecognition({
    language,
    assistantSessionId,
    initialSilenceTimeoutMillis: responseWaitSeconds * 1_000,
    onTranscript: handleTranscript,
    onPartialTranscript: handlePartialTranscript,
    onInitialSilenceTimeout: handleInitialSilenceTimeout,
    onError: handleSpeechError,
  });
  speechRuntimeRef.current = getSpeechRuntimeState;
  const beginListening = useCallback(async (request: boolean, responseWaitMillis?: number) => {
    if (activeAssistantSessionRef.current !== assistantSessionId || confirmationCommitInProgressRef.current) return false;
    setShowPermissionExplanation(false);
    await stopAssistantResponse();
    if (activeAssistantSessionRef.current !== assistantSessionId || confirmationCommitInProgressRef.current) return false;
    return startListening(request, responseWaitMillis ?? getTurnResponseWaitMillis(pendingQuestionRef.current));
  }, [assistantSessionId, getTurnResponseWaitMillis, startListening]);
  beginListeningRef.current = beginListening;
  abortListeningRef.current = abortListening;
  const sessionTextRef = useRef({ greeting: "", defaultPlanName: "" });
  sessionTextRef.current = {
    greeting: userName?.trim() ? t("assistant.greetingName", { name: userName.trim() }) : t("assistant.greeting"),
    defaultPlanName: t("assistant.defaultPlanName"),
  };
  const handleClose = useCallback(async () => {
    if (confirmationCommitInProgressRef.current) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log("HydroMateAssistantState close=ignored reason=save-committed");
      }
      return;
    }
    activeAssistantSessionRef.current = 0;
    runtimeStateRef.current = clearAssistantRuntimeState(runtimeStateRef.current);
    abortListening();
    await stopAssistantResponse();
    commitPendingState(undefined, undefined);
    draftsRef.current = [];
    confirmationAttemptsRef.current = 0;
    setDrafts([]);
    setLastTranscript("");
    setInput("");
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log("HydroMateAssistantState modal=closed state=cleared timeout=cancelled");
      console.log("HydroMateAssistantTiming close=manual");
    }
    requestAssistantClose("manual");
  }, [abortListening, commitPendingState, requestAssistantClose]);

  const previousWakeWordEnabledRef = useRef(wakeWordEnabled);
  useEffect(() => {
    if (previousWakeWordEnabledRef.current && !wakeWordEnabled) {
      cancelInitialSilenceTimeout();
    }
    previousWakeWordEnabledRef.current = wakeWordEnabled;
  }, [cancelInitialSilenceTimeout, wakeWordEnabled]);

  useEffect(() => {
    if (!visible) {
      if (confirmationCommitInProgressRef.current) return;
      activeAssistantSessionRef.current = 0;
      runtimeStateRef.current = clearAssistantRuntimeState(runtimeStateRef.current);
      abortListeningRef.current();
      return;
    }
    if (assistantSessionId <= 0 || initializedAssistantSessionRef.current === assistantSessionId) return;
    abortListeningRef.current();
    initializedAssistantSessionRef.current = assistantSessionId;
    activeAssistantSessionRef.current = assistantSessionId;
    runtimeStateRef.current = beginAssistantRuntimeSession(assistantSessionId);
    const { greeting, defaultPlanName } = sessionTextRef.current;
    draftsRef.current = [];
    confirmationAttemptsRef.current = 0;
    timeoutCycleRef.current = 0;
    lastTimeoutSpeechSessionRef.current = 0;
    saveLedgerRef.current = createAssistantSaveLedger<AssistantReminderSaveResult>();
    savedPlanIdsRef.current = new Map();
    setInput(""); setLastTranscript(""); commitPendingState(undefined, undefined); setDrafts([]); setEditingIndex(undefined);
    setAssistantText(greeting); setShowPermissionExplanation(false); setPermissionBlocked(false); setSaving(false); savingRef.current = false; confirmationCommitInProgressRef.current = false;
    setPlanName(defaultPlanName); setContinuingPlan(undefined);
    processedSpeechSessionRef.current = undefined;
    void loadKnownMedicineNames().then(setKnownMedicineNames);
    void loadReminderPlans().then(setPlans);
    void loadAssistantRecentReminders().then(setRecentReminders);
    setRecentExpanded(false);
    const greetAndListen = async () => {
      await speakRef.current(greeting);
      if (activeAssistantSessionRef.current === assistantSessionId) await beginListeningRef.current(false);
    };
    void greetAndListen();
  }, [assistantSessionId, commitPendingState, visible]);

  useEffect(() => () => {
    activeAssistantSessionRef.current = 0;
  }, []);

  const activePlans = useMemo(() => plans.filter((plan) => plan.status === "active"), [plans]);
  const finishedPlans = useMemo(() => plans.filter((plan) => plan.status === "finished"), [plans]);
  const reviewReadyCount = useMemo(
    () => recentReminders.filter((reminder) =>
      isAssistantRecentReminderReadyForReview(reminder)
    ).length,
    [recentReminders]
  );
  const resetDraft = () => {
    if (confirmationCommitInProgressRef.current) return;
    abortListeningRef.current();
    runtimeStateRef.current = beginAssistantManualTurn(runtimeStateRef.current).state;
    confirmationAttemptsRef.current = 0; timeoutCycleRef.current = 0;
    saveLedgerRef.current = createAssistantSaveLedger<AssistantReminderSaveResult>();
    savedPlanIdsRef.current = new Map();
    commitPendingState(undefined, undefined); setLastTranscript(""); setInput("");
  };

  const finalizeReminderConfirmation = async (source: "voice" | "tap") => {
    const context = confirmationContextRef.current;
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantConfirm source=${source} result=ACCEPT finalize=requested`);
    }
    if (!draftsRef.current.length || confirmationCommitInProgressRef.current || savingRef.current) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantConfirm assistantSession=${context.assistantSessionId} turn=${context.turnId} speechSession=${context.speechSessionId} commitLock=not-acquired duplicate=true`);
      }
      return;
    }
    if (!claimAssistantSave(saveLedgerRef.current)) return;
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantConfirm source=${source} finalize=claimed`);
    }
    confirmationCommitInProgressRef.current = true;
    savingRef.current = true;
    setSaving(true);
    cancelInitialSilenceTimeout();
    abortListening();
    const draftsToSave = draftsRef.current.map((draft) => ({
      ...draft,
      ...(draft.times ? { times: draft.times.map((time) => ({ ...time })) } : {}),
      ...(draft.timeSlots ? { timeSlots: draft.timeSlots.map((slot) => ({ ...slot })) } : {}),
    }));
    let retryAfterFailure = false;
    logAssistantRuntime({ ...context, locale: language, save: "START", timeoutCycle: timeoutCycleRef.current });
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantState confirmation=committed saveLock=acquired drafts=${draftsToSave.length} timeout=cancelled stt=stopped`);
      console.log(`HydroMateAssistantConfirm locale=${language} assistantSession=${context.assistantSessionId} turn=${context.turnId} speechSession=${context.speechSessionId} commitLock=acquired timers=cancelled sttAbort=expected drafts=${draftsToSave.length}`);
    }
    try {
      const isDevelopment = (
        globalThis as typeof globalThis & { __DEV__?: boolean }
      ).__DEV__;
      if (isDevelopment) {
        console.log(`[AskHydroMate] confirmation=accepted saveHandoff=${draftsToSave.map((item) => item.category).join(",")}`);
        console.log("HydroMateAssistantConfirm save=started");
      }
      const results = await persistAssistantConfirmation(saveLedgerRef.current, draftsToSave, saveAssistantReminder);
      logAssistantRuntime({ ...context, save: "SUCCESS", recordIds: results.map((result) => result.reference.recordId) });
      const createdPlanIds = savedPlanIdsRef.current;
      for (let index = 0; index < results.length; index += 1) {
        const item = draftsToSave[index];
        if (
          !createdPlanIds.has(index) && item.scheduleMode === "recurring" &&
          item.durationDays &&
          (item.category === "water" || item.category === "medicine" || item.category === "custom")
        ) {
          const plan = await createReminderPlan(
            planName,
            [results[index].reference],
            item.durationDays
          );
          createdPlanIds.set(index, plan.id);
        }
      }
      try {
        await recordAssistantRecentReminders(
          results.map((result, index) => ({
            authoritativeRecordId: result.reference.recordId,
            category: result.reference.category,
            displayTitle: result.reference.label,
            times: (draftsToSave[index].times?.length
              ? draftsToSave[index].times!
              : draftsToSave[index].hour === undefined || draftsToSave[index].minute === undefined
                ? []
                : [{ hour: draftsToSave[index].hour!, minute: draftsToSave[index].minute! }]
            ).map(({ hour, minute }) =>
              `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
            ),
            durationDays: draftsToSave[index].durationDays,
            ...(createdPlanIds.has(index) ? { planId: createdPlanIds.get(index)! } : {}),
          }))
        );
        setRecentReminders(await loadAssistantRecentReminders());
      } catch (historyError) {
        console.log("Ask HydroMate recent history was not updated:", historyError);
      }
      const text = results.some((result) => !result.masterEnabled) ? t("assistant.savedMasterOff") : results.some((result) => !result.categoryEnabled) ? t("assistant.savedSomeCategoriesOff") : t("assistant.savedAll", { count: results.length });
      const nextPlans = await loadReminderPlans();
      setAssistantText(text); setPlans(nextPlans);
      if (isDevelopment) console.log("HydroMateAssistantConfirm save=success successTts=start");
      await finishAssistantConfirmation(saveLedgerRef.current, {
        speakSuccess: async (signal) => {
          if (await getVoiceRemindersEnabled()) return speakAssistantResponse(language, text, signal);
          if (isDevelopment) console.log("HydroMateAssistantConfirm successTts=disabled");
        },
        clearDraft: () => {
          commitPendingState(undefined, undefined);
          runtimeStateRef.current = clearAssistantRuntimeState(runtimeStateRef.current);
          activeAssistantSessionRef.current = 0;
          draftsRef.current = [];
          confirmationAttemptsRef.current = 0;
          setLastTranscript(""); setInput(""); setDrafts([]); setEditingIndex(undefined);
        },
        close: () => {
          requestAssistantClose("reminder-save-success");
          try { onReminderSaved?.(); } catch (refreshError) { console.log("Ask HydroMate post-save refresh failed:", refreshError); }
        },
      });
    } catch (error) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log("HydroMateAssistantState save=failure confirmation=preserved", error);
        console.log("HydroMateAssistantConfirm save=failure modal=open retryable=true", error);
      }
      setAssistantText(t("assistant.saveError"));
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.assert(draftsRef.current.length === draftsToSave.length, "HydroMateAssistantRuntime failed-save-cleared-draft");
      }
      logAssistantRuntime({ ...context, save: "FAILED", draft: "preserved", close: "BLOCKED" });
      retryAfterFailure = true;
      try { await speak(t("assistant.saveError")); } catch { /* Text and manual retry remain available. */ }
    } finally {
      saveLedgerRef.current.inProgress = false;
      confirmationCommitInProgressRef.current = false;
      savingRef.current = false;
      setSaving(false);
    }
    if (retryAfterFailure && activeAssistantSessionRef.current === assistantSessionId) {
      timeoutCycleRef.current = 0;
      await beginListeningRef.current(false, getTurnResponseWaitMillis("confirmation"));
    }
  };
  finalizeReminderConfirmationRef.current = finalizeReminderConfirmation;
  const handleListen = async () => {
    if (confirmationCommitInProgressRef.current || savingRef.current) return;
    if (isListening) { abortListening(); return; }
    try {
      const state = await getPermissionState();
      if (state === "granted") await beginListening(false);
      else if (state === "requestable") setShowPermissionExplanation(true);
      else { setPermissionBlocked(true); setAssistantText(t("assistant.speechPermissionBlocked")); }
    } catch {
      setAssistantText(t("assistant.speechUnavailable"));
    }
  };

  return <Modal animationType="slide" onRequestClose={() => void handleClose()} transparent visible={visible}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}><View style={styles.card}>
      <View style={styles.header}><View><Text style={styles.title}>🎙 {t("assistant.title")}</Text><Text style={styles.subtitle}>{t("assistant.tapToTalk")}</Text></View><TouchableOpacity onPress={() => void handleClose()} style={styles.closeButton}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
      <ScrollView pointerEvents={saving ? "none" : "auto"} contentContainerStyle={styles.conversation} keyboardShouldPersistTaps="handled">
        <View style={styles.assistantBubble}><Text style={styles.assistantBubbleText}>{assistantText}</Text></View>
        {isListening ? <Text style={styles.listeningStatus}>{pendingQuestion === "confirmation" || pendingQuestion === "confirmationInvalid" ? t("assistant.listeningConfirmation") : isUserSpeechActive ? t("assistant.listeningSpeech") : t("assistant.listeningWaiting")}</Text> : null}
        {reviewReadyCount ? <TouchableOpacity onPress={() => setRecentExpanded(true)} style={styles.reviewNotice}><Text style={styles.reviewNoticeTitle}>{t("assistant.recentReviewCount", { count: reviewReadyCount })}</Text><Text style={styles.reviewNoticeAction}>{t("assistant.reviewRecent")}</Text></TouchableOpacity> : null}
        {lastTranscript ? <View style={styles.userBubble}><Text style={styles.userBubbleLabel}>{t("assistant.youSaid")}</Text><Text style={styles.userBubbleText}>{lastTranscript}</Text></View> : null}
        {pendingQuestion === "category" ? <View style={styles.quickChoices}>{CATEGORIES.map((category) => <Choice key={category} label={categoryLabel(category)} onPress={() => processInput(category)} />)}</View> : null}
        {pendingQuestion === "timePeriod" ? <View style={styles.quickChoices}><Choice label={t("common.am")} onPress={() => processInput("AM")} /><Choice label={t("common.pm")} onPress={() => processInput("PM")} /></View> : null}
        {pendingQuestion === "medicineDaily" ? <View style={styles.quickChoices}><Choice label={t("assistant.yes")} onPress={() => processInput("yes")} /><Choice label={t("assistant.no")} onPress={() => processInput("no")} /></View> : null}
        {pendingQuestion === "timesPerDay" || pendingQuestion === "timesPerDayInvalid" ? <View style={styles.quickChoices}><Choice label={t("assistant.onceChoice")} onPress={() => processInput("only once")} />{[1, 2, 3].map((count) => <Choice key={count} label={t("assistant.timesDailyChoice", { count })} onPress={() => processInput(`${count} times per day`)} />)}</View> : null}
        {pendingQuestion === "durationDays" || pendingQuestion === "durationDaysInvalid" ? <View style={styles.quickChoices}>{[1, 7, 30].map((count) => <Choice key={count} label={t("assistant.daysChoice", { count })} onPress={() => processInput(`${count} days`)} />)}</View> : null}

        {drafts.length ? <View style={styles.reviewCard}><Text style={styles.reviewHeading}>{t("assistant.understoodCount", { count: drafts.length })}</Text>
          {drafts.map((item, index) => { const formattedTimes = item.scheduleMode === "once" || (item.times?.length ?? 0) === item.timesPerDay ? formatTimes(item) : ""; return <View key={`${item.category}-${index}`} style={styles.draftCard}><Text style={styles.category}>{categoryLabel(item.category!)}</Text><Text style={styles.itemTitle}>{titleFor(item)}</Text>{formattedTimes ? <Text style={styles.detail}>{t("assistant.explicitTimesSummary", { times: formattedTimes })}</Text> : null}<Text style={styles.detail}>{item.scheduleMode === "once" ? t("assistant.onceSummary") : t("assistant.recurringSummary", { times: item.timesPerDay ?? item.times?.length ?? 1, days: item.durationDays ?? 1 })}</Text><View style={styles.row}><Small label={t("common.edit")} onPress={() => { setEditingIndex(index); resetDraft(); setAssistantText(t("assistant.editItemPrompt")); }} /><Small label={t("common.remove")} onPress={() => { const next = draftsRef.current.filter((_, itemIndex) => itemIndex !== index); draftsRef.current = next; setDrafts(next); }} /></View></View>; })}
          <TouchableOpacity onPress={() => { resetDraft(); setAssistantText(t("assistant.addAnotherPrompt")); }} style={styles.secondary}><Text style={styles.secondaryText}>{t("assistant.addAnother")}</Text></TouchableOpacity>
          <View style={styles.row}><TouchableOpacity disabled={saving} onPress={() => void finalizeReminderConfirmation("tap")} style={styles.confirm}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>{t("assistant.confirmAll")}</Text>}</TouchableOpacity><TouchableOpacity disabled={saving} onPress={() => { draftsRef.current = []; setDrafts([]); resetDraft(); setAssistantText(t("assistant.cancelled")); }} style={styles.secondary}><Text style={styles.secondaryText}>{t("common.cancel")}</Text></TouchableOpacity></View>
        </View> : null}

        {finishedPlans.map((plan) => <View key={plan.id} style={styles.planCard}><Text style={styles.itemTitle}>{t("assistant.planFinished", { name: plan.name })}</Text><Text style={styles.detail}>{t("assistant.planFinishedQuestion")}</Text><View style={styles.quickChoices}>{[7, 15, 30].map((days) => <Choice key={days} label={t("assistant.continueDays", { count: days })} onPress={async () => { await continueReminderPlan(plan, days); setPlans(await loadReminderPlans()); }} />)}<Choice label={t("assistant.continueCustom")} onPress={() => { setContinuingPlan(plan); setAssistantText(t("assistant.customContinuePrompt")); }} /><Choice label={t("assistant.updatePlan")} onPress={async () => { await handleClose(); router.push("/(tabs)/reminders"); }} /><Choice label={t("assistant.archivePlan")} onPress={async () => { await archiveReminderPlan(plan); setPlans(await loadReminderPlans()); onReminderSaved?.(); }} /></View></View>)}
        {activePlans.map((plan) => { const progress = getReminderPlanProgress(plan); return <View key={plan.id} style={styles.planCard}><Text style={styles.itemTitle}>{plan.name}</Text>{progress ? <Text style={styles.detail}>{t("assistant.planProgress", { day: progress.day, total: progress.total })}</Text> : null}<Text style={styles.detail}>{plan.reminderReferences.map((reference) => reference.label).join(" • ")}</Text></View>; })}
        {recentReminders.length ? <View style={styles.recentSection}>
          <TouchableOpacity onPress={() => setRecentExpanded((value) => !value)} style={styles.recentHeader}><Text style={styles.recentHeading}>{t("assistant.recentReminders")}</Text><Text style={styles.recentToggle}>{recentExpanded ? t("assistant.hideRecent") : t("assistant.showRecent", { count: recentReminders.length })}</Text></TouchableOpacity>
          {recentExpanded ? recentReminders.map((reminder) => {
            const ageDays = getAssistantRecentReminderAgeDays(reminder);
            const ready = isAssistantRecentReminderReadyForReview(reminder);
            const timeSummary = reminder.times.map((time) => {
              const [hour, minute] = time.split(":").map(Number);
              return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hour, minute));
            }).join(", ");
            const icon = reminder.category === "medicine" ? "💊" : reminder.category === "water" ? "💧" : reminder.category === "birthday" ? "🎂" : reminder.category === "anniversary" ? "💍" : "🏃";
            return <View key={reminder.id} style={styles.recentItem}><Text style={styles.recentTitle}>{icon} {reminder.displayTitle}</Text>{timeSummary ? <Text style={styles.detail}>{timeSummary}</Text> : null}{reminder.durationDays ? <Text style={styles.detail}>{t("reminders.durationSummary", { count: reminder.durationDays })}</Text> : null}<Text style={[styles.recentAge, ready && styles.recentReady]}>{ready ? t("assistant.readyForReview") : ageDays === 0 ? t("assistant.addedToday") : t("assistant.addedDaysAgo", { count: ageDays })}</Text>{ready ? <><Text style={styles.reviewMessage}>{t("assistant.recentSevenDayMessage")}</Text><View style={styles.row}><Small label={t("assistant.keepRecent")} onPress={() => { void keepAssistantRecentReminder(reminder.id).then(async () => { setRecentReminders(await loadAssistantRecentReminders()); setAssistantText(t("assistant.reviewAgainSevenDays")); }); }} /><Small label={t("assistant.removeFromRecent")} onPress={() => { void removeAssistantRecentReminder(reminder.id).then(async () => { setRecentReminders(await loadAssistantRecentReminders()); }); }} /></View></> : null}</View>;
          }) : null}
        </View> : null}
        {showPermissionExplanation ? <View style={styles.permissionCard}><Text style={styles.permissionTitle}>{t("assistant.microphoneTitle")}</Text><Text style={styles.permissionText}>{t("assistant.microphoneMessage")}</Text><View style={styles.row}><TouchableOpacity onPress={() => void beginListening(true)} style={styles.permissionContinue}><Text style={styles.confirmText}>{t("assistant.continue")}</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowPermissionExplanation(false)} style={styles.secondary}><Text style={styles.secondaryText}>{t("assistant.notNow")}</Text></TouchableOpacity></View></View> : null}
        {permissionBlocked ? <View style={styles.permissionCard}><Text style={styles.permissionTitle}>{t("assistant.microphoneSettingsTitle")}</Text><Text style={styles.permissionText}>{t("assistant.microphoneSettingsMessage")}</Text></View> : null}
      </ScrollView>
      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}><Text style={styles.fallback}>{t("assistant.textFallback")}</Text><View style={styles.inputRow}><TextInput multiline onChangeText={setInput} onSubmitEditing={() => processInput(input)} placeholder={t("assistant.inputPlaceholder")} style={styles.input} value={input} /><TouchableOpacity onPress={() => processInput(input)} style={styles.send}><Text style={styles.confirmText}>{t("assistant.send")}</Text></TouchableOpacity></View><TouchableOpacity onPress={() => void handleListen()} style={[styles.listen, isListening && styles.listening]}><Text style={styles.confirmText}>{isListening ? `■ ${t("assistant.stopListening")}` : `🎙 ${t("assistant.listen")}`}</Text></TouchableOpacity></View>
    </View></KeyboardAvoidingView>
  </Modal>;
}

function Choice({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) { return <TouchableOpacity onPress={() => void onPress()} style={styles.choice}><Text style={styles.choiceText}>{label}</Text></TouchableOpacity>; }
function Small({ label, onPress }: { label: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.small}><Text style={styles.smallText}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14,39,56,.42)" }, card: { maxHeight: "92%", minHeight: "72%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#F5FAFD", overflow: "hidden" },
  header: { paddingHorizontal: 20, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#CFE2EC", backgroundColor: "#E3F5FD" }, title: { color: "#173B52", fontSize: 21, fontWeight: "800" }, subtitle: { marginTop: 2, color: "#5E7888", fontSize: 12 }, closeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "#FFF" }, closeText: { color: "#536C7A", fontSize: 27, lineHeight: 30 },
  conversation: { padding: 18, paddingBottom: 24 }, assistantBubble: { alignSelf: "flex-start", maxWidth: "90%", padding: 14, borderRadius: 17, backgroundColor: "#DDF3FF" }, assistantBubbleText: { color: "#1F4C68", fontSize: 15, lineHeight: 22 }, userBubble: { alignSelf: "flex-end", maxWidth: "90%", marginTop: 12, padding: 13, borderRadius: 17, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DCE8EE" }, userBubbleLabel: { color: "#7C8C96", fontSize: 10, fontWeight: "800" }, userBubbleText: { marginTop: 3, color: "#2B4657", fontSize: 14 },
  listeningStatus: { marginTop: 7, marginLeft: 6, color: "#557487", fontSize: 12, fontWeight: "700" },
  quickChoices: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#BFDCEB" }, choiceText: { color: "#2876A5", fontSize: 13, fontWeight: "700" }, reviewCard: { marginTop: 16, padding: 15, borderRadius: 18, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#CCE2EC" }, reviewHeading: { color: "#17384E", fontSize: 17, fontWeight: "800", marginBottom: 8 }, draftCard: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#DCE8EE" }, category: { color: "#2D80B0", fontSize: 12, fontWeight: "800" }, itemTitle: { marginTop: 4, color: "#17384E", fontSize: 18, fontWeight: "800" }, detail: { marginTop: 6, color: "#506C7B", fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }, small: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#EEF4F7" }, smallText: { color: "#536D7B", fontSize: 12, fontWeight: "700" }, secondary: { minHeight: 40, marginTop: 8, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#EEF4F7" }, secondaryText: { color: "#536D7B", fontSize: 13, fontWeight: "700" }, confirm: { minWidth: 115, minHeight: 42, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#0A7EA4" }, confirmText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  planToggle: { marginTop: 14, paddingVertical: 9 }, planToggleText: { color: "#5B4EB5", fontWeight: "800" }, planInput: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: "#C9DAE3", borderRadius: 11, backgroundColor: "#F8FBFC" }, planCard: { marginTop: 14, padding: 15, borderRadius: 16, backgroundColor: "#F0EDFF", borderWidth: 1, borderColor: "#D4CDF8" }, permissionCard: { marginTop: 14, padding: 15, borderRadius: 16, backgroundColor: "#FFF8E9", borderWidth: 1, borderColor: "#F0D59F" }, permissionTitle: { color: "#75501F", fontSize: 15, fontWeight: "800" }, permissionText: { marginTop: 5, color: "#7D6849", fontSize: 13, lineHeight: 20 }, permissionContinue: { minHeight: 40, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#A66C1C" },
  reviewNotice: { marginTop: 12, padding: 13, borderRadius: 14, backgroundColor: "#FFF4D8", borderWidth: 1, borderColor: "#E7C66F" }, reviewNoticeTitle: { color: "#6D5116", fontSize: 14, fontWeight: "800" }, reviewNoticeAction: { marginTop: 4, color: "#9A6810", fontSize: 12, fontWeight: "700" }, recentSection: { marginTop: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8E5EB", overflow: "hidden" }, recentHeader: { padding: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }, recentHeading: { color: "#27485D", fontSize: 15, fontWeight: "800" }, recentToggle: { color: "#2F80C9", fontSize: 12, fontWeight: "800" }, recentItem: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D8E5EB" }, recentTitle: { color: "#17384E", fontSize: 15, fontWeight: "800" }, recentAge: { marginTop: 7, color: "#687E8A", fontSize: 12, fontWeight: "700" }, recentReady: { color: "#A46214" }, reviewMessage: { marginTop: 6, color: "#75501F", fontSize: 12, lineHeight: 18 },
  inputArea: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#CFE0E8", backgroundColor: "#FFF" }, fallback: { marginBottom: 7, color: "#71838E", fontSize: 11 }, inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 }, input: { flex: 1, maxHeight: 110, minHeight: 46, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: "#C9DAE3", borderRadius: 13, color: "#263F50", backgroundColor: "#F8FBFC" }, send: { minHeight: 46, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#2F80C9" }, listen: { marginTop: 10, minHeight: 45, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#6D5BD0" }, listening: { backgroundColor: "#C54F5D" },
});

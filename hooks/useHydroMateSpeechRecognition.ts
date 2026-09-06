import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from "expo-speech-recognition";

import type { AppLanguage } from "../localization";
import { getTtsLocaleCandidates } from "../localization/languages";
import {
  getHydroMateSpeechPermissionState,
  type HydroMateSpeechPermissionState,
} from "../services/speechPermissionState";
import {
  beginInitialSilenceTimeout,
  beginSpeechTranscriptSession,
  cancelSpeechTranscriptSession,
  claimInitialSilenceTimeout,
  inactiveInitialSilenceTimeoutState,
  markInitialSilenceSpeechActivity,
  type InitialSilenceTimeoutState,
  claimSpeechTranscript,
  type SpeechTranscriptDeliveryState,
} from "../services/speechTranscriptDelivery";
import {
  ASSISTANT_SPEECH_END_FALLBACK_MILLIS,
  ASSISTANT_SPEECH_GRACE_MILLIS,
} from "../services/assistantTiming";

const LISTEN_TIMEOUT_MILLIS = 20_000;

type SpeechRecognitionFailure =
  | ExpoSpeechRecognitionErrorCode
  | "unavailable"
  | "unsupported-locale"
  | "permission-blocked";

export type { HydroMateSpeechPermissionState } from "../services/speechPermissionState";

type UseHydroMateSpeechRecognitionOptions = {
  language: AppLanguage;
  assistantSessionId: number;
  initialSilenceTimeoutMillis: number;
  onTranscript: (transcript: string, sessionId: number) => void;
  onPartialTranscript?: (transcript: string, sessionId: number) => void;
  onInitialSilenceTimeout: (
    assistantSessionId: number,
    speechSessionId: number
  ) => void;
  onError: (failure: SpeechRecognitionFailure) => void;
};

function getRequestedLocales(language: AppLanguage) {
  if (language === "bho" || language === "bgc") {
    return ["hi-IN"];
  }

  return getTtsLocaleCandidates(language);
}

function normalizeLocale(locale: string) {
  return locale.replaceAll("_", "-").toLocaleLowerCase();
}

export function useHydroMateSpeechRecognition({
  language,
  assistantSessionId,
  initialSilenceTimeoutMillis,
  onTranscript,
  onPartialTranscript,
  onInitialSilenceTimeout,
  onError,
}: UseHydroMateSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeechActive, setIsUserSpeechActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSilenceTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechEndFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSilenceStateRef = useRef<InitialSilenceTimeoutState>(
    inactiveInitialSilenceTimeoutState
  );
  const pendingInitialSilenceRef = useRef<{
    assistantSessionId: number;
    speechSessionId: number;
    timeoutMillis: number;
  } | null>(null);
  const assistantSessionIdRef = useRef(assistantSessionId);
  assistantSessionIdRef.current = assistantSessionId;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onPartialTranscriptRef = useRef(onPartialTranscript);
  onPartialTranscriptRef.current = onPartialTranscript;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onInitialSilenceTimeoutRef = useRef(onInitialSilenceTimeout);
  onInitialSilenceTimeoutRef.current = onInitialSilenceTimeout;
  const ignoreAbortRef = useRef(false);
  const userSpeechActiveRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const startRequestRef = useRef(0);
  const recognitionOptionsRef = useRef<Parameters<typeof ExpoSpeechRecognitionModule.start>[0] | null>(null);
  const latestTranscriptRef = useRef("");
  const deliveryStateRef = useRef<SpeechTranscriptDeliveryState>({
    sessionId: 0,
  });

  const clearListenTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearSpeechEndFallback = useCallback(() => {
    if (speechEndFallbackRef.current) {
      clearTimeout(speechEndFallbackRef.current);
      speechEndFallbackRef.current = null;
    }
  }, []);

  const cancelInitialSilenceTimeout = useCallback(() => {
    pendingInitialSilenceRef.current = null;
    if (initialSilenceTimeoutRef.current) {
      clearTimeout(initialSilenceTimeoutRef.current);
      initialSilenceTimeoutRef.current = null;
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log("HydroMateAssistantState timeout=cancelled");
      }
    }
    initialSilenceStateRef.current = inactiveInitialSilenceTimeoutState;
  }, []);

  const recordSpeechActivity = useCallback(() => {
    initialSilenceStateRef.current = markInitialSilenceSpeechActivity(
      initialSilenceStateRef.current,
      assistantSessionIdRef.current,
      deliveryStateRef.current.sessionId
    );
    if (initialSilenceTimeoutRef.current) {
      clearTimeout(initialSilenceTimeoutRef.current);
      initialSilenceTimeoutRef.current = null;
    }
  }, []);

  const setUserSpeechActive = useCallback((active: boolean) => {
    userSpeechActiveRef.current = active;
    setIsUserSpeechActive(active);
  }, []);

  const abortListening = useCallback(() => {
    startRequestRef.current += 1;
    clearListenTimeout();
    clearSpeechEndFallback();
    cancelInitialSilenceTimeout();
    recognitionActiveRef.current = false;
    setUserSpeechActive(false);
    ignoreAbortRef.current = true;
    ExpoSpeechRecognitionModule.abort();
    setIsListening(false);
    latestTranscriptRef.current = "";
    deliveryStateRef.current = cancelSpeechTranscriptSession(
      deliveryStateRef.current
    );
  }, [cancelInitialSilenceTimeout, clearListenTimeout, clearSpeechEndFallback, setUserSpeechActive]);

  const deliverTranscript = useCallback(
    (transcript: string) => {
      const claimed = claimSpeechTranscript(
        deliveryStateRef.current,
        transcript
      );
      deliveryStateRef.current = claimed.state;

      if (claimed.transcript) {
        onTranscriptRef.current(claimed.transcript, claimed.sessionId);
      }
    },
    []
  );

  useSpeechRecognitionEvent("start", () => {
    if (deliveryStateRef.current.deliveredSessionId === deliveryStateRef.current.sessionId) return;
    recognitionActiveRef.current = true;
    setIsListening(true);
    const pending = pendingInitialSilenceRef.current;
    if (!pending) return;
    const { assistantSessionId: timeoutAssistantSessionId, speechSessionId, timeoutMillis } = pending;
    pendingInitialSilenceRef.current = null;
    initialSilenceStateRef.current = beginInitialSilenceTimeout(
      timeoutAssistantSessionId,
      speechSessionId
    );
    initialSilenceTimeoutRef.current = setTimeout(() => {
      if (
        assistantSessionIdRef.current !== timeoutAssistantSessionId ||
        deliveryStateRef.current.sessionId !== speechSessionId ||
        userSpeechActiveRef.current
      ) return;
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log(`HydroMateAssistantTiming speechSession=${speechSessionId} grace=end timeout=armed timeoutMs=${timeoutMillis}`);
      }
      initialSilenceTimeoutRef.current = setTimeout(() => {
        initialSilenceTimeoutRef.current = null;
        if (
          assistantSessionIdRef.current !== timeoutAssistantSessionId ||
          deliveryStateRef.current.sessionId !== speechSessionId ||
          userSpeechActiveRef.current
        ) return;
        const claim = claimInitialSilenceTimeout(
          initialSilenceStateRef.current,
          timeoutAssistantSessionId,
          speechSessionId
        );
        initialSilenceStateRef.current = claim.state;
        if (!claim.claimed || claim.assistantSessionId === undefined) return;

        clearListenTimeout();
        clearSpeechEndFallback();
        ignoreAbortRef.current = true;
        recognitionActiveRef.current = false;
        ExpoSpeechRecognitionModule.abort();
        setIsListening(false);
        setUserSpeechActive(false);
        latestTranscriptRef.current = "";
        deliveryStateRef.current = cancelSpeechTranscriptSession(
          deliveryStateRef.current
        );
        onInitialSilenceTimeoutRef.current(claim.assistantSessionId, speechSessionId);
        if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
          console.log(`HydroMateAssistantTiming speechSession=${speechSessionId} timeout=fired userSpeechActive=false`);
        }
      }, timeoutMillis);
    }, ASSISTANT_SPEECH_GRACE_MILLIS);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTiming speechSession=${speechSessionId} stt=start grace=start graceMs=${ASSISTANT_SPEECH_GRACE_MILLIS}`);
    }
  });

  useSpeechRecognitionEvent("speechstart", () => {
    if (!recognitionActiveRef.current) return;
    setUserSpeechActive(true);
    recordSpeechActivity();
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTiming speechSession=${deliveryStateRef.current.sessionId} speech=start timeout=cancelled`);
    }
  });

  useSpeechRecognitionEvent("speechend", () => {
    if (!recognitionActiveRef.current) return;
    setUserSpeechActive(false);
    clearSpeechEndFallback();
    const speechSessionId = deliveryStateRef.current.sessionId;
    speechEndFallbackRef.current = setTimeout(() => {
      speechEndFallbackRef.current = null;
      if (
        deliveryStateRef.current.sessionId !== speechSessionId ||
        deliveryStateRef.current.deliveredSessionId === speechSessionId ||
        userSpeechActiveRef.current
      ) return;
      if (latestTranscriptRef.current) {
        deliverTranscript(latestTranscriptRef.current);
        ignoreAbortRef.current = true;
        recognitionActiveRef.current = false;
        ExpoSpeechRecognitionModule.abort();
        setIsListening(false);
      } else {
        recognitionActiveRef.current = false;
        setIsListening(false);
        onErrorRef.current("no-speech");
      }
    }, ASSISTANT_SPEECH_END_FALLBACK_MILLIS);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTiming speechSession=${speechSessionId} speech=end finalFallbackMs=${ASSISTANT_SPEECH_END_FALLBACK_MILLIS}`);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (deliveryStateRef.current.deliveredSessionId === deliveryStateRef.current.sessionId) return;
    const transcript = event.results[0]?.transcript?.trim();

    if (!transcript) {
      return;
    }

    recordSpeechActivity();
    latestTranscriptRef.current = transcript;

    if (!event.isFinal) {
      onPartialTranscriptRef.current?.(
        transcript,
        deliveryStateRef.current.sessionId
      );
      return;
    }

    clearListenTimeout();
    clearSpeechEndFallback();
    cancelInitialSilenceTimeout();
    setUserSpeechActive(false);
    recognitionActiveRef.current = false;
    setIsListening(false);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTiming speechSession=${deliveryStateRef.current.sessionId} final=result-received`);
    }
    deliverTranscript(transcript);
  });

  useSpeechRecognitionEvent("error", (event) => {
    // An expected abort belongs to cleanup; it must not cancel the next session's timers/results.
    if (event.error === "aborted" && ignoreAbortRef.current) {
      ignoreAbortRef.current = false;
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log("HydroMateAssistantConfirm callback=stt-abort result=ignored reason=expected-cleanup");
      }
      return;
    }
    if (deliveryStateRef.current.deliveredSessionId === deliveryStateRef.current.sessionId) return;
    if (latestTranscriptRef.current) {
      clearListenTimeout();
      clearSpeechEndFallback();
      cancelInitialSilenceTimeout();
      recognitionActiveRef.current = false;
      setUserSpeechActive(false);
      setIsListening(false);
      deliverTranscript(latestTranscriptRef.current);
      return;
    }
    if ((event.error === "no-speech" || event.error === "speech-timeout") &&
        initialSilenceStateRef.current.active && !initialSilenceStateRef.current.speechActivityDetected) {
      // Samsung may end recognition before our full grace + response window.
      // Keep that owned timer; only it can count a genuine no-response cycle.
      recognitionActiveRef.current = false;
      setIsListening(false);
      clearListenTimeout();
      return;
    }
    clearListenTimeout();
    clearSpeechEndFallback();
    cancelInitialSilenceTimeout();
    recognitionActiveRef.current = false;
    setUserSpeechActive(false);
    setIsListening(false);
    latestTranscriptRef.current = "";
    deliveryStateRef.current = cancelSpeechTranscriptSession(
      deliveryStateRef.current
    );

    onErrorRef.current(event.error);
  });

  useSpeechRecognitionEvent("end", () => {
    if (deliveryStateRef.current.deliveredSessionId === deliveryStateRef.current.sessionId) return;
    if (initialSilenceStateRef.current.active && !initialSilenceStateRef.current.speechActivityDetected && recognitionOptionsRef.current) {
      // Continue the SAME owned response window after an early native no-speech end.
      // pendingInitialSilenceRef is null: the next start cannot reset grace/deadline.
      ExpoSpeechRecognitionModule.start(recognitionOptionsRef.current);
      return;
    }
    clearListenTimeout();
    recognitionActiveRef.current = false;
    setUserSpeechActive(false);
    setIsListening(false);
    if (latestTranscriptRef.current) {
      clearSpeechEndFallback();
      cancelInitialSilenceTimeout();
      deliverTranscript(latestTranscriptRef.current);
    } else if (
      initialSilenceStateRef.current.speechActivityDetected &&
      !speechEndFallbackRef.current
    ) {
      const speechSessionId = deliveryStateRef.current.sessionId;
      speechEndFallbackRef.current = setTimeout(() => {
        speechEndFallbackRef.current = null;
        if (
          deliveryStateRef.current.sessionId !== speechSessionId ||
          deliveryStateRef.current.deliveredSessionId === speechSessionId
        ) return;
        onErrorRef.current("no-speech");
      }, ASSISTANT_SPEECH_END_FALLBACK_MILLIS);
    }
  });

  useEffect(
    () => () => {
      startRequestRef.current += 1;
      clearListenTimeout();
      clearSpeechEndFallback();
      cancelInitialSilenceTimeout();
      ignoreAbortRef.current = true;
      ExpoSpeechRecognitionModule.abort();
    },
    [cancelInitialSilenceTimeout, clearListenTimeout, clearSpeechEndFallback]
  );

  const getPermissionState = useCallback(async (): Promise<HydroMateSpeechPermissionState> => {
    const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();

    return getHydroMateSpeechPermissionState(permission);
  }, []);

  const startListening = useCallback(async (
    requestPermission = false,
    responseWaitMillis = initialSilenceTimeoutMillis
  ) => {
    clearListenTimeout();
    clearSpeechEndFallback();
    if (recognitionActiveRef.current || pendingInitialSilenceRef.current) {
      if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
        console.log("HydroMateAssistantTiming stt=request ignored=already-active");
      }
      return false;
    }
    const startRequest = ++startRequestRef.current;
    const isCurrentStart = () => startRequestRef.current === startRequest && assistantSessionIdRef.current === assistantSessionId;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      onErrorRef.current("unavailable");
      return false;
    }

    let permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!isCurrentStart()) return false;

    if (!permission.granted && requestPermission && permission.canAskAgain) {
      permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!isCurrentStart()) return false;
    }

    if (!permission.granted) {
      onErrorRef.current(permission.canAskAgain ? "not-allowed" : "permission-blocked");
      return false;
    }

    const requestedLocales = getRequestedLocales(language);
    let selectedLocale = requestedLocales[0];

    try {
      const supported =
        await ExpoSpeechRecognitionModule.getSupportedLocales({});
      if (!isCurrentStart()) return false;
      const normalizedSupported = new Set(
        supported.locales.map(normalizeLocale)
      );

      if (normalizedSupported.size > 0) {
        const compatible = requestedLocales.find((candidate) =>
          normalizedSupported.has(normalizeLocale(candidate))
        );

        if (!compatible) {
          onErrorRef.current("unsupported-locale");
          return false;
        }

        selectedLocale = compatible;
      }
    } catch {
      // Android 12 and older cannot enumerate locales; the recognizer itself
      // will return language-not-supported if the requested locale is absent.
    }

    if (!isCurrentStart()) return false;

    latestTranscriptRef.current = "";
    cancelInitialSilenceTimeout();
    deliveryStateRef.current = beginSpeechTranscriptSession(
      deliveryStateRef.current
    );
    const speechSessionId = deliveryStateRef.current.sessionId;
    pendingInitialSilenceRef.current = {
      assistantSessionId,
      speechSessionId,
      timeoutMillis: responseWaitMillis,
    };
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(`HydroMateAssistantTiming speechSession=${speechSessionId} stt=request timeoutMs=${responseWaitMillis}`);
    }
    recognitionOptionsRef.current = {
      lang: selectedLocale,
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      contextualStrings: [
        "HydroMate",
        "water",
        "medicine",
        "birthday",
        "anniversary",
        "Allegra",
        "Crocin",
      ],
    };
    ExpoSpeechRecognitionModule.start(recognitionOptionsRef.current);
    if ((globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__) {
      console.log(
        `HydroMateAssistantState stt=started assistantSession=${assistantSessionId} speechSession=${speechSessionId} timeoutMs=${responseWaitMillis}`
      );
    }
    const settleRecognition = () => {
      if (
        assistantSessionIdRef.current !== assistantSessionId ||
        deliveryStateRef.current.sessionId !== speechSessionId
      ) {
        return;
      }
      if (userSpeechActiveRef.current) {
        timeoutRef.current = setTimeout(settleRecognition, 2_500);
        return;
      }
      if (latestTranscriptRef.current) {
        ExpoSpeechRecognitionModule.stop();
        timeoutRef.current = setTimeout(() => {
          if (
            assistantSessionIdRef.current !== assistantSessionId ||
            deliveryStateRef.current.sessionId !== speechSessionId
          ) {
            return;
          }
          deliverTranscript(latestTranscriptRef.current);
          ignoreAbortRef.current = true;
          ExpoSpeechRecognitionModule.abort();
          setIsListening(false);
        }, 2_500);
        return;
      }

      ignoreAbortRef.current = true;
      ExpoSpeechRecognitionModule.abort();
      setIsListening(false);
      onErrorRef.current("speech-timeout");
    };
    timeoutRef.current = setTimeout(settleRecognition, LISTEN_TIMEOUT_MILLIS);

    return true;
  }, [assistantSessionId, cancelInitialSilenceTimeout, clearListenTimeout, clearSpeechEndFallback, deliverTranscript, initialSilenceTimeoutMillis, language]);

  return {
    getSpeechRuntimeState: () => ({ assistantSessionId: assistantSessionIdRef.current,
      speechSessionId: deliveryStateRef.current.sessionId, userSpeechActive: userSpeechActiveRef.current,
      responded: initialSilenceStateRef.current.speechActivityDetected || Boolean(latestTranscriptRef.current) }),
    isListening,
    isUserSpeechActive,
    getPermissionState,
    startListening,
    abortListening,
    cancelInitialSilenceTimeout,
  };
}

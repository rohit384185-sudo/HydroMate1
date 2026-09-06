import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

import {
  addWakeWordDetectedListener,
  addWakeWordDiagnosticListener,
  addWakeWordErrorListener,
  isNativeWakeWordAvailable,
  setDebugCandidateAudioCaptureEnabled,
  startWakeWordListening,
  stopWakeWordListening,
} from "../modules/hydromate-wake-word";
import { getHydroMateSpeechPermissionState } from "../services/speechPermissionState";
import {
  claimWakeWordEvent,
  getInactiveWakeWordStatus,
  shouldWakeWordListen,
  WAKE_WORD_DETECTION_CONFIG,
  type WakeWordStatus,
} from "../services/wakeWordState";
import {
  DEFAULT_WAKE_WORD_RESPONSE_WAIT_SECONDS,
  loadWakeWordPreferences,
  saveWakeWordConsent,
  saveWakeWordEnabled,
  saveWakeWordResponseWaitSeconds,
} from "../services/wakeWordService";
import type { WakeWordDiagnosticEvent } from "../modules/hydromate-wake-word";
import {
  emptyWakeWordCandidateState,
  formatWakeWordCandidateSummary,
  recordWakeWordCandidateFrame,
  type WakeWordCandidateState,
  type WakeWordCandidateSummary,
} from "../services/wakeWordCandidateState";
import {
  DEFAULT_SPEAKER_VERIFICATION_SENSITIVITY,
  loadSpeakerVerificationPreferences,
  SPEAKER_VERIFICATION_ENABLED_KEY,
  SPEAKER_VERIFICATION_SENSITIVITY_KEY,
  type SpeakerVerificationSensitivity,
} from "../services/speakerProfileStorageService";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Options = {
  assistantVisible: boolean;
  onWakeDetected: () => void;
};

export function useHydroMateWakeWord({
  assistantVisible,
  onWakeDetected,
}: Options) {
  const [enabled, setEnabled] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [status, setStatus] = useState<WakeWordStatus>("disabled");
  const [responseWaitSeconds, setResponseWaitSeconds] = useState(
    DEFAULT_WAKE_WORD_RESPONSE_WAIT_SECONDS
  );
  const [diagnostic, setDiagnostic] =
    useState<WakeWordDiagnosticEvent | null>(null);
  const [candidateSummary, setCandidateSummary] =
    useState<WakeWordCandidateSummary | null>(null);
  const [debugAudioCaptureEnabled, setDebugAudioCaptureEnabled] =
    useState(false);
  const [speakerEnrollmentActive, setSpeakerEnrollmentActive] = useState(false);
  const [speakerVerificationEnabled, setSpeakerVerificationEnabledState] =
    useState(false);
  const [speakerVerificationSensitivity, setSpeakerVerificationSensitivityState] =
    useState<SpeakerVerificationSensitivity>(
      DEFAULT_SPEAKER_VERIFICATION_SENSITIVITY
    );
  const candidateStateRef = useRef<WakeWordCandidateState>(
    emptyWakeWordCandidateState
  );
  const onWakeDetectedRef = useRef(onWakeDetected);
  const assistantVisibleRef = useRef(assistantVisible);
  const wakeResumeLogPendingRef = useRef(false);
  const enabledRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastDetectionAtRef = useRef(0);
  const reconcileSequenceRef = useRef(0);

  useEffect(() => {
    onWakeDetectedRef.current = onWakeDetected;
  }, [onWakeDetected]);

  useEffect(() => {
    assistantVisibleRef.current = assistantVisible;
    if (assistantVisible) wakeResumeLogPendingRef.current = true;
  }, [assistantVisible]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const refreshPermission = useCallback(async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      const granted =
        getHydroMateSpeechPermissionState(permission) === "granted";
      setPermissionGranted(granted);
      return granted;
    } catch {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadWakeWordPreferences(),
      refreshPermission(),
      loadSpeakerVerificationPreferences(),
    ])
      .then(([preferences, , speakerPreferences]) => {
        setEnabled(preferences.enabled);
        setConsentAccepted(preferences.consentAccepted);
        setResponseWaitSeconds(preferences.responseWaitSeconds);
        setSpeakerVerificationEnabledState(speakerPreferences.enabled);
        setSpeakerVerificationSensitivityState(speakerPreferences.sensitivity);
      })
      .finally(() => setLoaded(true));
  }, [refreshPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      setAppState(nextState);
      if (nextState === "active") void refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  useEffect(() => {
    setDebugCandidateAudioCaptureEnabled(__DEV__ && debugAudioCaptureEnabled);
    return () => {
      setDebugCandidateAudioCaptureEnabled(false);
    };
  }, [debugAudioCaptureEnabled]);

  useEffect(() => {
    const detectionSubscription = addWakeWordDetectedListener((event) => {
      if (
        !enabledRef.current ||
        appStateRef.current !== "active" ||
        assistantVisibleRef.current
      ) return;
      const claim = claimWakeWordEvent(
        lastDetectionAtRef.current,
        event.detectedAtMillis
      );
      if (!claim.claimed) return;
      lastDetectionAtRef.current = claim.detectionAtMillis;
      setStatus("paused");
      onWakeDetectedRef.current();
    });
    const errorSubscription = addWakeWordErrorListener(() => {
      setStatus("error");
    });
    const diagnosticSubscription = addWakeWordDiagnosticListener((event) => {
      setDiagnostic(event);
      const update = recordWakeWordCandidateFrame(
        candidateStateRef.current,
        event
      );
      candidateStateRef.current = update.state;
      if (update.summary) {
        setCandidateSummary(update.summary);
        console.log(formatWakeWordCandidateSummary(update.summary));
      }
    });
    return () => {
      detectionSubscription.remove();
      diagnosticSubscription.remove();
      errorSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const sequence = ++reconcileSequenceRef.current;
    const conditions = {
      enabled,
      appActive: appState === "active",
      assistantVisible: assistantVisible || speakerEnrollmentActive,
      nativeAvailable: isNativeWakeWordAvailable,
      permissionGranted,
    };

    const reconcile = async () => {
      if (!shouldWakeWordListen(conditions)) {
        await stopWakeWordListening();
        if (sequence === reconcileSequenceRef.current) {
          setStatus(getInactiveWakeWordStatus(conditions));
        }
        return;
      }

      // Give Ask HydroMate's recognizer a bounded interval to release the mic.
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (sequence !== reconcileSequenceRef.current) return;
      try {
        const started = await startWakeWordListening({
          ...WAKE_WORD_DETECTION_CONFIG,
          diagnosticsEnabled: __DEV__,
          calibrationOnly: false,
          speakerVerificationEnabled,
          speakerVerificationSensitivity,
        });
        if (sequence === reconcileSequenceRef.current) {
          setStatus(started ? "listening" : "unavailable");
          if (started && wakeResumeLogPendingRef.current) {
            if (__DEV__) console.log("HydroMateAssistantConfirm wake=resumed nativeStart=success");
            wakeResumeLogPendingRef.current = false;
          }
        }
      } catch {
        if (sequence === reconcileSequenceRef.current) setStatus("error");
      }
    };

    void reconcile();
    return () => {
      ++reconcileSequenceRef.current;
    };
  }, [
    appState,
    assistantVisible,
    enabled,
    loaded,
    permissionGranted,
    speakerEnrollmentActive,
    speakerVerificationEnabled,
    speakerVerificationSensitivity,
  ]);

  useEffect(
    () => () => {
      void stopWakeWordListening();
    },
    []
  );

  const enable = useCallback(async (acceptConsent: boolean) => {
    if (acceptConsent) {
      await saveWakeWordConsent();
      setConsentAccepted(true);
    }
    let permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    }
    const granted =
      getHydroMateSpeechPermissionState(permission) === "granted";
    setPermissionGranted(granted);
    if (!granted) {
      setStatus("permission-required");
      return false;
    }
    await saveWakeWordEnabled(true);
    enabledRef.current = true;
    setEnabled(true);
    return true;
  }, []);

  const disable = useCallback(async () => {
    enabledRef.current = false;
    setEnabled(false);
    setStatus("disabled");
    await stopWakeWordListening();
    await saveWakeWordEnabled(false);
  }, []);

  const pauseForAssistant = useCallback(async () => {
    setStatus("paused");
    await stopWakeWordListening();
  }, []);

  const pauseForSpeakerEnrollment = useCallback(async () => {
    ++reconcileSequenceRef.current;
    setSpeakerEnrollmentActive(true);
    setStatus("paused");
    await stopWakeWordListening();
  }, []);

  const resumeAfterSpeakerEnrollment = useCallback(() => {
    setSpeakerEnrollmentActive(false);
  }, []);

  const updateResponseWaitSeconds = useCallback(async (seconds: number) => {
    const savedSeconds = await saveWakeWordResponseWaitSeconds(seconds);
    setResponseWaitSeconds(savedSeconds);
    return savedSeconds;
  }, []);

  const setSpeakerVerificationEnabled = useCallback(async (nextEnabled: boolean) => {
    await AsyncStorage.setItem(
      SPEAKER_VERIFICATION_ENABLED_KEY,
      String(nextEnabled)
    );
    setSpeakerVerificationEnabledState(nextEnabled);
  }, []);

  const setSpeakerVerificationSensitivity = useCallback(
    async (nextSensitivity: SpeakerVerificationSensitivity) => {
      await AsyncStorage.setItem(
        SPEAKER_VERIFICATION_SENSITIVITY_KEY,
        nextSensitivity
      );
      setSpeakerVerificationSensitivityState(nextSensitivity);
    },
    []
  );

  return {
    available: isNativeWakeWordAvailable,
    enabled,
    consentAccepted,
    permissionGranted,
    status,
    responseWaitSeconds,
    diagnostic,
    candidateSummary,
    debugAudioCaptureEnabled,
    speakerVerificationEnabled,
    speakerVerificationSensitivity,
    enable,
    disable,
    pauseForAssistant,
    pauseForSpeakerEnrollment,
    resumeAfterSpeakerEnrollment,
    setResponseWaitSeconds: updateResponseWaitSeconds,
    setDebugAudioCaptureEnabled,
    setSpeakerVerificationEnabled,
    setSpeakerVerificationSensitivity,
  };
}

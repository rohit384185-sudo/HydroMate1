export const WAKE_WORD_DETECTION_CONFIG = {
  threshold: 0.5,
  releaseThreshold: 0.35,
  consecutiveFrames: 3,
  cooldownMillis: 3_500,
  diagnosticIntervalMillis: 250,
} as const;
export const WAKE_WORD_CALIBRATION_CONFIG = {
  classifierFrameMillis: 80,
  highScoreThreshold: 0.7,
  veryHighScoreThreshold: 0.9,
} as const;
export const WAKE_WORD_JS_DEBOUNCE_MILLIS = 2_000;

export type WakeWordStatus =
  | "disabled"
  | "stopped"
  | "listening"
  | "paused"
  | "permission-required"
  | "unavailable"
  | "error";

type WakeListeningConditions = {
  enabled: boolean;
  appActive: boolean;
  assistantVisible: boolean;
  nativeAvailable: boolean;
  permissionGranted: boolean;
};

export function shouldWakeWordListen({
  enabled,
  appActive,
  assistantVisible,
  nativeAvailable,
  permissionGranted,
}: WakeListeningConditions) {
  return (
    enabled &&
    appActive &&
    !assistantVisible &&
    nativeAvailable &&
    permissionGranted
  );
}

export function getInactiveWakeWordStatus({
  enabled,
  appActive,
  assistantVisible,
  nativeAvailable,
  permissionGranted,
}: WakeListeningConditions): WakeWordStatus {
  if (!nativeAvailable) return "unavailable";
  if (!enabled) return "disabled";
  if (!permissionGranted) return "permission-required";
  if (assistantVisible) return "paused";
  if (!appActive) return "stopped";
  return "stopped";
}

export function claimWakeWordEvent(
  previousDetectionAtMillis: number,
  detectedAtMillis: number,
  debounceMillis = WAKE_WORD_JS_DEBOUNCE_MILLIS
) {
  if (
    detectedAtMillis <= 0 ||
    detectedAtMillis - previousDetectionAtMillis < debounceMillis
  ) {
    return { claimed: false, detectionAtMillis: previousDetectionAtMillis };
  }

  return { claimed: true, detectionAtMillis: detectedAtMillis };
}

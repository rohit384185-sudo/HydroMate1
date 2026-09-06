import AsyncStorage from "@react-native-async-storage/async-storage";

const WAKE_WORD_ENABLED_KEY = "hydromate-wake-word-enabled";
const WAKE_WORD_CONSENT_KEY = "hydromate-wake-word-consent-v1";
const WAKE_WORD_RESPONSE_WAIT_SECONDS_KEY =
  "hydromate-wake-word-response-wait-seconds";
const CONSENT_VALUE = "accepted";
export const DEFAULT_WAKE_WORD_RESPONSE_WAIT_SECONDS = 5;
export const MIN_WAKE_WORD_RESPONSE_WAIT_SECONDS = 2;
export const MAX_WAKE_WORD_RESPONSE_WAIT_SECONDS = 15;
export const WAKE_WORD_RESPONSE_WAIT_PRESETS = [2, 3, 5] as const;

export function normalizeWakeWordResponseWaitSeconds(value: unknown) {
  const seconds = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(seconds)) {
    return DEFAULT_WAKE_WORD_RESPONSE_WAIT_SECONDS;
  }

  return Math.min(
    MAX_WAKE_WORD_RESPONSE_WAIT_SECONDS,
    Math.max(MIN_WAKE_WORD_RESPONSE_WAIT_SECONDS, Math.round(seconds))
  );
}

export async function loadWakeWordPreferences() {
  const [enabled, consent, responseWaitSeconds] = await Promise.all([
    AsyncStorage.getItem(WAKE_WORD_ENABLED_KEY),
    AsyncStorage.getItem(WAKE_WORD_CONSENT_KEY),
    AsyncStorage.getItem(WAKE_WORD_RESPONSE_WAIT_SECONDS_KEY),
  ]);

  return {
    enabled: enabled === "true",
    consentAccepted: consent === CONSENT_VALUE,
    responseWaitSeconds: normalizeWakeWordResponseWaitSeconds(
      responseWaitSeconds ?? DEFAULT_WAKE_WORD_RESPONSE_WAIT_SECONDS
    ),
  };
}

export async function saveWakeWordEnabled(enabled: boolean) {
  await AsyncStorage.setItem(WAKE_WORD_ENABLED_KEY, String(enabled));
}

export async function saveWakeWordConsent() {
  await AsyncStorage.setItem(WAKE_WORD_CONSENT_KEY, CONSENT_VALUE);
}

export async function saveWakeWordResponseWaitSeconds(value: number) {
  const seconds = normalizeWakeWordResponseWaitSeconds(value);
  await AsyncStorage.setItem(
    WAKE_WORD_RESPONSE_WAIT_SECONDS_KEY,
    String(seconds)
  );
  return seconds;
}

export const wakeWordStorageKeys = {
  enabled: WAKE_WORD_ENABLED_KEY,
  consent: WAKE_WORD_CONSENT_KEY,
  responseWaitSeconds: WAKE_WORD_RESPONSE_WAIT_SECONDS_KEY,
} as const;

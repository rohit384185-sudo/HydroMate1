import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

import type { VoiceLanguageCode } from "../localization";
import {
  getTtsLocaleCandidates,
  TTS_LOCALE_BY_LANGUAGE,
} from "../localization/languages";
import {
  cancelAllDatedVoiceAlarms,
  cancelAllMedicineVoiceAlarms,
  cancelAllWaterVoiceAlarms,
  setNativeSelectedVoiceIdentifier,
  setNativeVoiceRemindersEnabled,
  syncNativeVoicePreferences,
} from "../modules/hydromate-voice";

export const VOICE_REMINDERS_STORAGE_KEY =
  "hydromate-voice-reminders-enabled";
export const VOICE_SELECTION_STORAGE_KEY =
  "hydromate-voice-reminders-selected-voice";

export type CompatibleVoice = Speech.Voice & {
  isFallbackLanguage: boolean;
};

type StoredVoicePreference = {
  language: VoiceLanguageCode;
  identifier: string;
};

export type VoiceReminderResult =
  | "spoken"
  | "voice-unavailable"
  | "busy"
  | "stopped"
  | "error";

let voiceRequestInProgress = false;

const normalizeLanguage = (language: string) =>
  language.replaceAll("_", "-").toLowerCase();

function getCompatibleVoicesFromList(
  language: VoiceLanguageCode,
  availableVoices: Speech.Voice[]
) {
  const localeCandidates = getTtsLocaleCandidates(language);

  for (const [candidateIndex, candidateLocale] of localeCandidates.entries()) {
    const normalizedCandidate = normalizeLanguage(candidateLocale);
    const baseLanguage = normalizedCandidate.split("-")[0];
    const matchingVoices = availableVoices
      .filter((voice) => {
        const normalizedVoiceLanguage = normalizeLanguage(voice.language);

        return (
          normalizedVoiceLanguage === baseLanguage ||
          normalizedVoiceLanguage.startsWith(`${baseLanguage}-`)
        );
      })
      .sort((first, second) => {
        const firstIsExact =
          normalizeLanguage(first.language) === normalizedCandidate;
        const secondIsExact =
          normalizeLanguage(second.language) === normalizedCandidate;

        return Number(secondIsExact) - Number(firstIsExact);
      })
      .map((voice) => ({
        ...voice,
        isFallbackLanguage: candidateIndex > 0,
      }));

    if (matchingVoices.length > 0) {
      return matchingVoices;
    }
  }

  return [];
}

export async function getCompatibleVoices(language: VoiceLanguageCode) {
  const availableVoices = await Speech.getAvailableVoicesAsync();

  return getCompatibleVoicesFromList(language, availableVoices);
}

export async function getSelectedVoiceIdentifier(
  language: VoiceLanguageCode
) {
  try {
    const savedPreference = await AsyncStorage.getItem(
      VOICE_SELECTION_STORAGE_KEY
    );

    if (!savedPreference) {
      return null;
    }

    const parsedPreference = JSON.parse(
      savedPreference
    ) as Partial<StoredVoicePreference>;

    return parsedPreference.language === language &&
      typeof parsedPreference.identifier === "string"
      ? parsedPreference.identifier
      : null;
  } catch (error) {
    console.log("Error loading selected voice:", error);
    return null;
  }
}

export async function setSelectedVoiceIdentifier(
  language: VoiceLanguageCode,
  identifier: string | null
) {
  if (!identifier) {
    await AsyncStorage.removeItem(VOICE_SELECTION_STORAGE_KEY);
    try {
      await setNativeSelectedVoiceIdentifier(language, null);
    } catch (error) {
      console.log("Could not clear native voice selection:", error);
    }
    return;
  }

  const preference: StoredVoicePreference = { language, identifier };

  await AsyncStorage.setItem(
    VOICE_SELECTION_STORAGE_KEY,
    JSON.stringify(preference)
  );

  try {
    await setNativeSelectedVoiceIdentifier(language, identifier);
  } catch (error) {
    console.log("Could not update native voice selection:", error);
  }
}

export async function getVoiceRemindersEnabled() {
  try {
    return (
      (await AsyncStorage.getItem(VOICE_REMINDERS_STORAGE_KEY)) === "true"
    );
  } catch (error) {
    console.log("Error loading voice reminder setting:", error);
    return false;
  }
}

export async function setVoiceRemindersEnabled(enabled: boolean) {
  await AsyncStorage.setItem(
    VOICE_REMINDERS_STORAGE_KEY,
    enabled ? "true" : "false"
  );

  try {
    await setNativeVoiceRemindersEnabled(enabled);
    if (!enabled) {
      await Promise.all([
        cancelAllWaterVoiceAlarms(),
        cancelAllMedicineVoiceAlarms(),
        cancelAllDatedVoiceAlarms("birthday"),
        cancelAllDatedVoiceAlarms("anniversary"),
        cancelAllDatedVoiceAlarms("custom"),
      ]);
    }
  } catch (error) {
    console.log("Could not update native voice reminder state:", error);
  }
}

type NativeVoiceReminderPreferences = {
  language: VoiceLanguageCode;
  waterSpeechTemplate: string;
  medicineSpeechTemplate: string;
  lockedMedicineSpeechTemplate: string;
  birthdaySpeechTemplate: string;
  lockedBirthdaySpeechTemplate: string;
  anniversarySpeechTemplate: string;
  lockedAnniversarySpeechTemplate: string;
  customSpeechTemplate: string;
  lockedCustomSpeechTemplate: string;
};

export async function syncNativeVoiceReminderPreferences(
  preferences: NativeVoiceReminderPreferences
) {
  const { language } = preferences;
  try {
    const [enabled, selectedVoiceIdentifier] = await Promise.all([
      getVoiceRemindersEnabled(),
      getSelectedVoiceIdentifier(language),
    ]);
    await syncNativeVoicePreferences({
      enabled,
      language,
      selectedVoiceIdentifier,
      waterSpeechTemplate: preferences.waterSpeechTemplate,
      medicineSpeechTemplate: preferences.medicineSpeechTemplate,
      lockedMedicineSpeechTemplate: preferences.lockedMedicineSpeechTemplate,
      birthdaySpeechTemplate: preferences.birthdaySpeechTemplate,
      lockedBirthdaySpeechTemplate: preferences.lockedBirthdaySpeechTemplate,
      anniversarySpeechTemplate: preferences.anniversarySpeechTemplate,
      lockedAnniversarySpeechTemplate:
        preferences.lockedAnniversarySpeechTemplate,
      customSpeechTemplate: preferences.customSpeechTemplate,
      lockedCustomSpeechTemplate: preferences.lockedCustomSpeechTemplate,
      localeCandidates: getTtsLocaleCandidates(language),
    });
  } catch (error) {
    console.log("Could not synchronize native voice preferences:", error);
  }
}

async function speakReminder(
  language: VoiceLanguageCode,
  text: string,
  selectedVoiceIdentifier?: string | null,
  signal?: AbortSignal
): Promise<VoiceReminderResult> {
  if (signal?.aborted) return "stopped";
  if (voiceRequestInProgress) {
    return "busy";
  }

  voiceRequestInProgress = true;
  let cancelled = false;
  let started = false;
  let finishCancelled: (() => void) | undefined;
  const cancel = () => {
    cancelled = true;
    voiceRequestInProgress = false;
    if (started) void Speech.stop().catch(() => {});
    finishCancelled?.();
  };
  signal?.addEventListener("abort", cancel, { once: true });

  try {
    const preferredLanguage = TTS_LOCALE_BY_LANGUAGE[language];
    const normalizedPreferredLanguage = normalizeLanguage(preferredLanguage);
    const availableVoices = await Speech.getAvailableVoicesAsync();
    const compatibleVoices = getCompatibleVoicesFromList(
      language,
      availableVoices
    );
    const storedVoiceIdentifier =
      selectedVoiceIdentifier === undefined
        ? await getSelectedVoiceIdentifier(language)
        : selectedVoiceIdentifier;
    const selectedVoice = storedVoiceIdentifier
      ? compatibleVoices.find(
          (voice) => voice.identifier === storedVoiceIdentifier
        )
      : undefined;
    const compatibleVoice = selectedVoice ?? compatibleVoices[0];

    if (
      selectedVoiceIdentifier === undefined &&
      storedVoiceIdentifier &&
      !selectedVoice
    ) {
      await setSelectedVoiceIdentifier(language, null);
    }

    if (cancelled) return "stopped";
    if (!compatibleVoice) {
      voiceRequestInProgress = false;
      return "voice-unavailable";
    }

    const alreadySpeaking = await Speech.isSpeakingAsync();
    if (cancelled) return "stopped";
    if (alreadySpeaking) {
      voiceRequestInProgress = false;
      return "busy";
    }

    const speechLanguage =
      normalizeLanguage(compatibleVoice.language) ===
      normalizedPreferredLanguage
        ? preferredLanguage
        : compatibleVoice.language;

    return await new Promise<VoiceReminderResult>((resolve) => {
      let hasFinished = false;
      let safetyTimeout: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: VoiceReminderResult) => {
        if (hasFinished) {
          return;
        }

        hasFinished = true;
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
        }
        voiceRequestInProgress = false;
        resolve(result);
      };

      safetyTimeout = setTimeout(() => finish("error"), 15000);
      finishCancelled = () => finish("stopped");
      started = true;

      Speech.speak(text, {
        language: speechLanguage,
        voice: selectedVoice?.identifier,
        onDone: () => finish("spoken"),
        onStopped: () => finish("stopped"),
        onError: () => finish("error"),
      });
    });
  } catch (error) {
    if (!cancelled) voiceRequestInProgress = false;
    console.log("Error speaking voice reminder:", error);
    return "error";
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}

export function speakWaterReminder(
  language: VoiceLanguageCode,
  text: string,
  selectedVoiceIdentifier?: string | null
) {
  return speakReminder(language, text, selectedVoiceIdentifier);
}

export function speakMedicineReminder(
  language: VoiceLanguageCode,
  text: string
) {
  return speakReminder(language, text);
}

export function speakCustomReminder(language: VoiceLanguageCode, text: string) {
  return speakReminder(language, text);
}

export function speakBirthdayReminder(
  language: VoiceLanguageCode,
  text: string
) {
  return speakReminder(language, text);
}

export function speakAnniversaryReminder(
  language: VoiceLanguageCode,
  text: string
) {
  return speakReminder(language, text);
}

export function speakAssistantResponse(
  language: VoiceLanguageCode,
  text: string,
  signal?: AbortSignal
) {
  return speakReminder(language, text, undefined, signal);
}

export async function stopAssistantResponse() {
  if (await Speech.isSpeakingAsync()) {
    await Speech.stop();
  }
}

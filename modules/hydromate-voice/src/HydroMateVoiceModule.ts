import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type HydroMateVoiceNativeModule = {
  scheduleVoiceTest: (secondsFromNow: number) => Promise<number>;
  scheduleWaterVoiceAlarm?: (
    identifier: string,
    expectedAtMillis: number,
    amountMl: number,
    repeatsDaily: boolean
  ) => Promise<number>;
  cancelWaterVoiceAlarm?: (identifier: string) => Promise<void>;
  cancelAllWaterVoiceAlarms?: () => Promise<void>;
  scheduleMedicineVoiceAlarm?: (
    identifier: string,
    expectedAtMillis: number,
    medicineName: string,
    repeatsDaily: boolean
  ) => Promise<number>;
  cancelMedicineVoiceAlarm?: (identifier: string) => Promise<void>;
  cancelAllMedicineVoiceAlarms?: () => Promise<void>;
  scheduleDatedVoiceAlarm?: (
    identifier: string,
    expectedAtMillis: number,
    reminderType: DatedVoiceReminderType,
    reminderText: string,
    repeatsYearly: boolean
  ) => Promise<number>;
  cancelDatedVoiceAlarm?: (
    identifier: string,
    reminderType: DatedVoiceReminderType
  ) => Promise<void>;
  cancelAllDatedVoiceAlarms?: (
    reminderType: DatedVoiceReminderType
  ) => Promise<void>;
  syncVoicePreferences?: (
    configuration: NativeVoicePreferencesConfiguration
  ) => Promise<void>;
  setVoiceRemindersEnabled?: (enabled: boolean) => Promise<void>;
  setSelectedVoiceIdentifier?: (
    language: string,
    identifier: string | null
  ) => Promise<void>;
};

export type DatedVoiceReminderType = "birthday" | "anniversary" | "custom";

export type NativeVoicePreferencesConfiguration = {
  enabled: boolean;
  language: string;
  selectedVoiceIdentifier: string | null;
  waterSpeechTemplate: string;
  medicineSpeechTemplate: string;
  lockedMedicineSpeechTemplate: string;
  birthdaySpeechTemplate: string;
  lockedBirthdaySpeechTemplate: string;
  anniversarySpeechTemplate: string;
  lockedAnniversarySpeechTemplate: string;
  customSpeechTemplate: string;
  lockedCustomSpeechTemplate: string;
  localeCandidates: string[];
};

const nativeModule =
  requireOptionalNativeModule<HydroMateVoiceNativeModule>("HydroMateVoice");

export const isLockedVoiceTestAvailable =
  Platform.OS === "android" && nativeModule !== null;

export const isWaterVoiceCompanionAvailable =
  Platform.OS === "android" &&
  typeof nativeModule?.scheduleWaterVoiceAlarm === "function";

export const isMedicineVoiceCompanionAvailable =
  Platform.OS === "android" &&
  typeof nativeModule?.scheduleMedicineVoiceAlarm === "function";

export const isDatedVoiceCompanionAvailable =
  Platform.OS === "android" &&
  typeof nativeModule?.scheduleDatedVoiceAlarm === "function";

export async function scheduleVoiceTest(secondsFromNow: number) {
  if (!nativeModule) {
    throw new Error(
      "The HydroMate native voice module is not included in this build."
    );
  }

  return nativeModule.scheduleVoiceTest(secondsFromNow);
}

export async function scheduleWaterVoiceAlarm(
  identifier: string,
  expectedAtMillis: number,
  amountMl: number,
  repeatsDaily = true
) {
  if (!nativeModule?.scheduleWaterVoiceAlarm) {
    return false;
  }

  await nativeModule.scheduleWaterVoiceAlarm(
    identifier,
    expectedAtMillis,
    amountMl,
    repeatsDaily
  );
  return true;
}

export async function cancelWaterVoiceAlarm(identifier: string) {
  await nativeModule?.cancelWaterVoiceAlarm?.(identifier);
}

export async function cancelAllWaterVoiceAlarms() {
  await nativeModule?.cancelAllWaterVoiceAlarms?.();
}

export async function scheduleMedicineVoiceAlarm(
  identifier: string,
  expectedAtMillis: number,
  medicineName: string,
  repeatsDaily = true
) {
  if (!nativeModule?.scheduleMedicineVoiceAlarm) {
    return false;
  }

  await nativeModule.scheduleMedicineVoiceAlarm(
    identifier,
    expectedAtMillis,
    medicineName,
    repeatsDaily
  );
  return true;
}

export async function cancelMedicineVoiceAlarm(identifier: string) {
  await nativeModule?.cancelMedicineVoiceAlarm?.(identifier);
}

export async function cancelAllMedicineVoiceAlarms() {
  await nativeModule?.cancelAllMedicineVoiceAlarms?.();
}

export async function scheduleDatedVoiceAlarm(
  identifier: string,
  expectedAtMillis: number,
  reminderType: DatedVoiceReminderType,
  reminderText: string,
  repeatsYearly = true
) {
  if (!nativeModule?.scheduleDatedVoiceAlarm) {
    return false;
  }

  await nativeModule.scheduleDatedVoiceAlarm(
    identifier,
    expectedAtMillis,
    reminderType,
    reminderText,
    repeatsYearly
  );
  return true;
}

export async function cancelDatedVoiceAlarm(
  identifier: string,
  reminderType: DatedVoiceReminderType
) {
  await nativeModule?.cancelDatedVoiceAlarm?.(identifier, reminderType);
}

export async function cancelAllDatedVoiceAlarms(
  reminderType: DatedVoiceReminderType
) {
  await nativeModule?.cancelAllDatedVoiceAlarms?.(reminderType);
}

export async function syncNativeVoicePreferences(
  configuration: NativeVoicePreferencesConfiguration
) {
  if (!nativeModule?.syncVoicePreferences) {
    return;
  }

  await nativeModule.syncVoicePreferences(configuration);
}

export async function setNativeVoiceRemindersEnabled(enabled: boolean) {
  await nativeModule?.setVoiceRemindersEnabled?.(enabled);
}

export async function setNativeSelectedVoiceIdentifier(
  language: string,
  identifier: string | null
) {
  await nativeModule?.setSelectedVoiceIdentifier?.(language, identifier);
}

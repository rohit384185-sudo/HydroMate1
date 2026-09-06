export {
  cancelAllWaterVoiceAlarms,
  cancelAllMedicineVoiceAlarms,
  cancelAllDatedVoiceAlarms,
  cancelDatedVoiceAlarm,
  cancelMedicineVoiceAlarm,
  cancelWaterVoiceAlarm,
  isLockedVoiceTestAvailable,
  isWaterVoiceCompanionAvailable,
  isMedicineVoiceCompanionAvailable,
  isDatedVoiceCompanionAvailable,
  scheduleVoiceTest,
  scheduleWaterVoiceAlarm,
  scheduleMedicineVoiceAlarm,
  scheduleDatedVoiceAlarm,
  setNativeSelectedVoiceIdentifier,
  setNativeVoiceRemindersEnabled,
  syncNativeVoicePreferences,
} from "./src/HydroMateVoiceModule";

export type {
  DatedVoiceReminderType,
  NativeVoicePreferencesConfiguration,
} from "./src/HydroMateVoiceModule";

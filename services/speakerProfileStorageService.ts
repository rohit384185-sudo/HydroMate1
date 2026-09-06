import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export const SPEAKER_VERIFICATION_ENABLED_KEY =
  "hydromate-speaker-verification-enabled";
export const SPEAKER_PROFILE_ENROLLED_KEY =
  "hydromate-speaker-profile-enrolled";
export const SPEAKER_VERIFICATION_SENSITIVITY_KEY =
  "hydromate-speaker-verification-sensitivity";

export const SPEAKER_VERIFICATION_SENSITIVITIES = [
  "lenient",
  "balanced",
  "strict",
] as const;
export type SpeakerVerificationSensitivity =
  (typeof SPEAKER_VERIFICATION_SENSITIVITIES)[number];
export const DEFAULT_SPEAKER_VERIFICATION_SENSITIVITY: SpeakerVerificationSensitivity =
  "balanced";

export async function loadSpeakerVerificationPreferences() {
  const [enabled, enrolled, savedSensitivity] = await AsyncStorage.multiGet([
    SPEAKER_VERIFICATION_ENABLED_KEY,
    SPEAKER_PROFILE_ENROLLED_KEY,
    SPEAKER_VERIFICATION_SENSITIVITY_KEY,
  ]);
  const sensitivity = SPEAKER_VERIFICATION_SENSITIVITIES.includes(
    savedSensitivity[1] as SpeakerVerificationSensitivity
  )
    ? (savedSensitivity[1] as SpeakerVerificationSensitivity)
    : DEFAULT_SPEAKER_VERIFICATION_SENSITIVITY;
  const defaults: [string, string][] = [];
  if (enabled[1] === null) defaults.push([SPEAKER_VERIFICATION_ENABLED_KEY, "false"]);
  if (enrolled[1] === null) defaults.push([SPEAKER_PROFILE_ENROLLED_KEY, "false"]);
  if (savedSensitivity[1] === null) {
    defaults.push([
      SPEAKER_VERIFICATION_SENSITIVITY_KEY,
      DEFAULT_SPEAKER_VERIFICATION_SENSITIVITY,
    ]);
  }
  if (defaults.length) await AsyncStorage.multiSet(defaults);
  return {
    enabled: enabled[1] === "true",
    enrolled: enrolled[1] === "true",
    sensitivity,
  };
}

const PROFILE_DIRECTORIES = [
  "speaker_enrollment",
  "speaker_enrollment_pending",
  "speaker_enrollment_backup",
  "speaker_profile",
  "speaker_profile_pending",
  "speaker_profile_backup",
] as const;

const PROFILE_FILES = [
  "speaker_profile.json",
  "speaker_profile.bin",
] as const;

export function deleteLocalSpeakerProfileFiles() {
  PROFILE_DIRECTORIES.forEach((name) => {
    const directory = new Directory(Paths.document, name);
    if (directory.exists) directory.delete();
  });
  PROFILE_FILES.forEach((name) => {
    const file = new File(Paths.document, name);
    if (file.exists) file.delete();
  });
}

export async function clearLocalSpeakerProfile() {
  deleteLocalSpeakerProfileFiles();
  await AsyncStorage.multiSet([
    [SPEAKER_PROFILE_ENROLLED_KEY, "false"],
    [SPEAKER_VERIFICATION_ENABLED_KEY, "false"],
  ]);
}

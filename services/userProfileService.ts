import AsyncStorage from "@react-native-async-storage/async-storage";

export const USER_PROFILE_KEY = "USER_PROFILE";

export const PROFILE_AGE_RANGE = { min: 1, max: 120 } as const;
export const PROFILE_WEIGHT_RANGE_KG = { min: 20, max: 300 } as const;

export const PROFILE_GENDERS = [
  "male",
  "female",
  "prefer-not-to-say",
] as const;

export type ProfileGender = (typeof PROFILE_GENDERS)[number];

export type HydroMateUserProfile = {
  userName: string;
  phoneNumber?: string;
  age?: number;
  gender?: ProfileGender;
  weightKg?: number;
};

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(
  value: unknown,
  range: { min: number; max: number },
  integer = false
) {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) &&
    number >= range.min &&
    number <= range.max &&
    (!integer || Number.isInteger(number))
    ? number
    : undefined;
}

export function parseUserProfile(value: unknown): HydroMateUserProfile {
  if (!value || typeof value !== "object") return { userName: "" };

  const profile = value as Record<string, unknown>;
  const gender = PROFILE_GENDERS.includes(profile.gender as ProfileGender)
    ? (profile.gender as ProfileGender)
    : undefined;

  return {
    userName: optionalString(profile.userName) ?? "",
    phoneNumber: optionalString(profile.phoneNumber),
    age: optionalNumber(profile.age, PROFILE_AGE_RANGE, true),
    gender,
    weightKg: optionalNumber(profile.weightKg, PROFILE_WEIGHT_RANGE_KG),
  };
}

export async function loadUserProfile(): Promise<HydroMateUserProfile | null> {
  const savedProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
  if (!savedProfile) return null;

  try {
    return parseUserProfile(JSON.parse(savedProfile));
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: HydroMateUserProfile) {
  await AsyncStorage.setItem(
    USER_PROFILE_KEY,
    JSON.stringify(parseUserProfile(profile))
  );
}

export async function clearUserProfile() {
  await AsyncStorage.removeItem(USER_PROFILE_KEY);
}

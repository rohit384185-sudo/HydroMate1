export const LANGUAGE_CONFIG = {
  en: {
    displayName: "English",
    ttsLocale: "en-IN",
    fullyLocalized: true,
  },
  hi: {
    displayName: "हिंदी",
    ttsLocale: "hi-IN",
    fullyLocalized: true,
  },
  bn: {
    displayName: "বাংলা",
    ttsLocale: "bn-IN",
    fullyLocalized: true,
  },
  mr: {
    displayName: "मराठी",
    ttsLocale: "mr-IN",
    fullyLocalized: true,
  },
  ta: {
    displayName: "தமிழ்",
    ttsLocale: "ta-IN",
    fullyLocalized: true,
  },
  te: {
    displayName: "తెలుగు",
    ttsLocale: "te-IN",
    fullyLocalized: true,
  },
  gu: {
    displayName: "ગુજરાતી",
    ttsLocale: "gu-IN",
    fullyLocalized: true,
  },
  kn: {
    displayName: "ಕನ್ನಡ",
    ttsLocale: "kn-IN",
    fullyLocalized: true,
  },
  ml: {
    displayName: "മലയാളം",
    ttsLocale: "ml-IN",
    fullyLocalized: true,
  },
  pa: {
    displayName: "ਪੰਜਾਬੀ",
    ttsLocale: "pa-IN",
    fullyLocalized: true,
  },
  bho: {
    displayName: "भोजपुरी",
    ttsLocale: "bho-IN",
    ttsFallbackLocales: ["hi-IN"],
    fullyLocalized: true,
  },
  bgc: {
    displayName: "हरियाणवी",
    ttsLocale: "bgc-IN",
    ttsFallbackLocales: ["hi-IN"],
    fullyLocalized: true,
  },
} as const;

export type VoiceLanguageCode = keyof typeof LANGUAGE_CONFIG;

export const ACTIVE_APP_LANGUAGES = [
  "en", "hi", "bn", "mr", "ta", "te",
  "gu", "kn", "ml", "pa", "bho", "bgc",
] as const;
export type AppLanguage = (typeof ACTIVE_APP_LANGUAGES)[number];

export const TTS_LOCALE_BY_LANGUAGE: Record<VoiceLanguageCode, string> =
  Object.fromEntries(
    Object.entries(LANGUAGE_CONFIG).map(([language, config]) => [
      language,
      config.ttsLocale,
    ])
  ) as Record<VoiceLanguageCode, string>;

export function getTtsLocaleCandidates(language: VoiceLanguageCode) {
  const config: {
    ttsLocale: string;
    ttsFallbackLocales?: readonly string[];
  } = LANGUAGE_CONFIG[language];

  return [config.ttsLocale, ...(config.ttsFallbackLocales ?? [])];
}

export function isAppLanguage(value: string | null): value is AppLanguage {
  return ACTIVE_APP_LANGUAGES.some((language) => language === value);
}

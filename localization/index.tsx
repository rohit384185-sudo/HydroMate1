import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocales } from "expo-localization";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { en, TranslationKey } from "./en";
import { bgc } from "./bgc";
import { bho } from "./bho";
import { bn } from "./bn";
import { gu } from "./gu";
import { hi } from "./hi";
import { kn } from "./kn";
import { ml } from "./ml";
import { mr } from "./mr";
import { pa } from "./pa";
import { ta } from "./ta";
import { te } from "./te";
import { AppLanguage, isAppLanguage } from "./languages";
import { syncNativeVoiceReminderPreferences } from "../services/voiceReminderService";

export type { AppLanguage, VoiceLanguageCode } from "./languages";
type TranslationParams = Record<string, string | number>;

type LocalizationContextValue = {
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const dictionaries = { en, hi, bn, mr, ta, te, gu, kn, ml, pa, bho, bgc };
const LANGUAGE_PREFERENCE_KEY = "hydromate-language-preference";

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: PropsWithChildren) {
  const locales = useLocales();
  const deviceLocale = locales[0];
  const detectedDeviceLanguage = deviceLocale?.languageCode ?? null;
  const deviceLanguage: AppLanguage = isAppLanguage(detectedDeviceLanguage)
    ? detectedDeviceLanguage
    : "en";
  const [languagePreference, setLanguagePreference] =
    useState<AppLanguage | null>(null);
  const language = languagePreference ?? deviceLanguage;
  const locale = languagePreference
    ? language
    : deviceLocale?.languageTag ?? language;

  useEffect(() => {
    void syncNativeVoiceReminderPreferences({
      language,
      waterSpeechTemplate:
        dictionaries[language]["voice.waterSpeechAmount"],
      medicineSpeechTemplate: dictionaries[language]["voice.medicineSpeech"],
      lockedMedicineSpeechTemplate:
        dictionaries[language]["voice.medicineLockedSpeech"],
      birthdaySpeechTemplate: dictionaries[language]["voice.birthdaySpeech"],
      lockedBirthdaySpeechTemplate:
        dictionaries[language]["voice.birthdayLockedSpeech"],
      anniversarySpeechTemplate:
        dictionaries[language]["voice.anniversarySpeech"],
      lockedAnniversarySpeechTemplate:
        dictionaries[language]["voice.anniversaryLockedSpeech"],
      customSpeechTemplate: dictionaries[language]["voice.customSpeech"],
      lockedCustomSpeechTemplate:
        dictionaries[language]["voice.customLockedSpeech"],
    });
  }, [language]);

  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(
          LANGUAGE_PREFERENCE_KEY
        );

        if (isAppLanguage(savedLanguage)) {
          setLanguagePreference(savedLanguage);
        }
      } catch (error) {
        console.log("Error loading language preference:", error);
      }
    };

    loadLanguagePreference();
  }, []);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguagePreference(nextLanguage);

    try {
      await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, nextLanguage);
    } catch (error) {
      console.log("Error saving language preference:", error);
    }
  };

  const value = useMemo<LocalizationContextValue>(() => {
    const dictionary = dictionaries[language];

    return {
      language,
      locale,
      setLanguage,
      t: (key, params) => {
        const template = dictionary[key] ?? en[key];

        if (!params) {
          return template;
        }

        return Object.entries(params).reduce(
          (message, [name, replacement]) =>
            message.replaceAll(`{${name}}`, String(replacement)),
          template as string
        );
      },
    };
  }, [language, locale]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }

  return context;
}

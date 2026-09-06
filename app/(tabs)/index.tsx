import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
} from "@react-native-firebase/auth";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalization } from "../../localization";
import {
  ACTIVE_APP_LANGUAGES,
  type AppLanguage,
  isAppLanguage,
  LANGUAGE_CONFIG,
} from "../../localization/languages";
import {
  requestNotificationPermission,
  restoreDatedVoiceCompanionAlarms,
  restoreMedicineVoiceCompanionAlarms,
} from "../../services/notificationService";
import {
  type CompatibleVoice,
  getCompatibleVoices,
  getSelectedVoiceIdentifier,
  getVoiceRemindersEnabled,
  setSelectedVoiceIdentifier,
  setVoiceRemindersEnabled,
  speakWaterReminder,
  syncNativeVoiceReminderPreferences,
} from "../../services/voiceReminderService";
import { restoreWaterVoiceCompanionAlarms } from "../../services/reminderService";
import {
  isLockedVoiceTestAvailable,
  scheduleVoiceTest,
} from "../../modules/hydromate-voice";
import {
  loadTodayTimeline,
  partitionTodayTimeline,
  type TodayTimelineItem,
} from "../../services/todayTimelineService";
import { HydroMateAssistantModal } from "../../components/hydromate-assistant-modal";
import { useHydroMateAssistant } from "../../hooks/useHydroMateAssistant";
import { useHydroMateWakeWord } from "../../hooks/useHydroMateWakeWord";
import {
  clearWakeWordSettingsController,
  publishWakeWordSettingsController,
} from "../../services/wakeWordSettingsBridge";
import {
  loadUserProfile,
  PROFILE_AGE_RANGE,
  PROFILE_GENDERS,
  PROFILE_WEIGHT_RANGE_KG,
  saveUserProfile,
  type ProfileGender,
} from "../../services/userProfileService";

const STORAGE_KEY = "hydromate_water_data";
const WATER_HISTORY_KEY = "hydromate_water_history";
const BETA_FEEDBACK_KEY = "hydromate-beta-feedback";

type FeedbackType = "bug" | "suggestion" | "other";

type FeedbackSubmission = {
  type: FeedbackType;
  message: string;
  timestamp: string;
  language: AppLanguage;
  appVersion?: string;
};

const APP_VERSION = Constants.expoConfig?.version;

const parseFeedbackSubmissions = (
  savedFeedback: string | null
): FeedbackSubmission[] => {
  if (!savedFeedback) {
    return [];
  }

  try {
    const parsedFeedback: unknown = JSON.parse(savedFeedback);

    if (!Array.isArray(parsedFeedback)) {
      return [];
    }

    return parsedFeedback.filter((item): item is FeedbackSubmission => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const feedback = item as Record<string, unknown>;

      return (
        (feedback.type === "bug" ||
          feedback.type === "suggestion" ||
          feedback.type === "other") &&
        typeof feedback.message === "string" &&
        typeof feedback.timestamp === "string" &&
        typeof feedback.language === "string" &&
        isAppLanguage(feedback.language) &&
        (feedback.appVersion === undefined ||
          typeof feedback.appVersion === "string")
      );
    });
  } catch {
    return [];
  }
};

export default function HomeScreen() {
  const { language, locale, setLanguage, t } = useLocalization();
  const router = useRouter();
  const {
    assistantVisible,
    assistantSessionId,
    startHydroMateAssistant,
    closeHydroMateAssistant,
  } = useHydroMateAssistant();
  const handleWakeWordDetected = useCallback(() => {
    startHydroMateAssistant();
  }, [startHydroMateAssistant]);
  const wakeWord = useHydroMateWakeWord({
    assistantVisible,
    onWakeDetected: handleWakeWordDetected,
  });
  const openAssistantManually = useCallback(async () => {
    await wakeWord.pauseForAssistant();
    startHydroMateAssistant();
  }, [startHydroMateAssistant, wakeWord]);
  const setWakeWordMode = useCallback((nextEnabled: boolean) => {
    if (!nextEnabled) {
      void wakeWord.disable();
      return;
    }

    const enable = (acceptConsent: boolean) => {
      void wakeWord.enable(acceptConsent);
    };
    if (wakeWord.consentAccepted && wakeWord.permissionGranted) {
      enable(false);
      return;
    }

    Alert.alert(
      t("wakeWord.consentTitle"),
      `${t("wakeWord.privacyExplanation")}\n\n${t("wakeWord.batteryNotice")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("wakeWord.enable"), onPress: () => enable(true) },
      ]
    );
  }, [t, wakeWord]);
  const wakeWordSettingsOwnerRef = useRef({});
  useEffect(
    () => () => {
      clearWakeWordSettingsController(wakeWordSettingsOwnerRef.current);
    },
    []
  );
  const [nextReminder, setNextReminder] =
    useState<TodayTimelineItem | null>(null);
  const [water, setWater] = useState(0);
  const [lastWaterAdded, setLastWaterAdded] = useState(0);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<AppLanguage>(
    language
  );
  const [voiceRemindersEnabled, setVoiceRemindersEnabledState] =
    useState(false);
  const [pendingVoiceRemindersEnabled, setPendingVoiceRemindersEnabled] =
    useState(false);
  const [showVoiceReminderModal, setShowVoiceReminderModal] = useState(false);
  const [savingVoiceSetting, setSavingVoiceSetting] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [schedulingLockedVoiceTest, setSchedulingLockedVoiceTest] =
    useState(false);
  const [availableVoices, setAvailableVoices] = useState<CompatibleVoice[]>([]);
  const [pendingVoiceIdentifier, setPendingVoiceIdentifier] = useState<
    string | null
  >(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackView, setFeedbackView] = useState<"form" | "history">(
    "form"
  );
  const [feedbackHistory, setFeedbackHistory] = useState<
    FeedbackSubmission[]
  >([]);
  const [selectedFeedback, setSelectedFeedback] =
    useState<FeedbackSubmission | null>(null);
  const [loadingFeedbackHistory, setLoadingFeedbackHistory] = useState(false);
  const [showCustomWater, setShowCustomWater] = useState(false);
const [customWaterAmount, setCustomWaterAmount] = useState("");
  const [userName, setUserName] = useState("");
const [phoneNumber, setPhoneNumber] = useState("");
const [age, setAge] = useState("");
const [gender, setGender] = useState<ProfileGender | undefined>();
const [weightKg, setWeightKg] = useState("");
const [nameError, setNameError] = useState(false);
const [ageError, setAgeError] = useState(false);
const [weightError, setWeightError] = useState(false);
const [profileSaved, setProfileSaved] = useState(false);
const [confirmation, setConfirmation] = useState<any>(null);
const [otpCode, setOtpCode] = useState("");
const [sendingOtp, setSendingOtp] = useState(false);
const [resendCount, setResendCount] = useState(0);
const [resendTimer, setResendTimer] = useState(0);
const [showOpeningScreen, setShowOpeningScreen] = useState(true);
const [phoneVerified, setPhoneVerified] = useState(false);
  const [waterHistory, setWaterHistory] = useState<
  {
    date: string;
    water: number;
  }[]
>([]);
  useEffect(() => {
  requestNotificationPermission();
  
}, []);
useEffect(() => {
  const loadVoiceReminderSetting = async () => {
    setVoiceRemindersEnabledState(await getVoiceRemindersEnabled());
  };

  void loadVoiceReminderSetting();
}, []);
useEffect(() => {
  if (resendTimer <= 0) {
    return;
  }
  

  const timer = setInterval(() => {
    setResendTimer((time) => time - 1);
  }, 1000);

  return () => clearInterval(timer);
}, [resendTimer]);
useEffect(() => {
  const firebaseAuth = getAuth();

  const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      setPhoneVerified(true);
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
    } else {
      setPhoneVerified(false);
    }
  });

  return unsubscribe;
}, []);
  const [loading, setLoading] = useState(true);

 const [dailyGoal, setDailyGoal] = useState(4000);
 const currentHour = new Date().getHours();

const greeting =
  currentHour < 12
    ? t("home.goodMorning")
    : currentHour < 17
    ? t("home.goodAfternoon")
    : t("home.goodEvening");

  // Get today's date
  const getToday = () => {
    return new Date().toISOString().split("T")[0];
  };
const loadProfile = async () => {
  try {
    const profile = await loadUserProfile();

    if (profile) {
      setUserName(profile.userName);
      setPhoneNumber(getAuth().currentUser?.phoneNumber || profile.phoneNumber || "");
      setAge(profile.age === undefined ? "" : String(profile.age));
      setGender(profile.gender);
      setWeightKg(
        profile.weightKg === undefined ? "" : String(profile.weightKg)
      );
      setProfileSaved(true);

      console.log("Profile loaded:", profile);
    }
  } catch (error) {
    console.log("Error loading profile:", error);
  }
};
const sendOtp = async () => {
  try {
    setSendingOtp(true);
    setPhoneVerified(false);
setOtpCode("");
    const fullPhoneNumber = `+91${phoneNumber}`;

    const firebaseAuth = getAuth();

const confirmationResult =
  await signInWithPhoneNumber(firebaseAuth, fullPhoneNumber);

    setConfirmation(confirmationResult);
    setResendCount((count) => count + 1);
    setResendTimer(30);
    setSendingOtp(false);

    alert(t("home.otpSent"));
  } catch (error: any) {
    setSendingOtp(false);
  console.log("OTP send error:", error);
  console.log("OTP error code:", error?.code);
  console.log("OTP error message:", error?.message);

  alert(
    t("home.otpError", {
      code: error?.code || t("home.unknown"),
      message: error?.message || t("home.unknownError"),
    })
  );
}
};
const verifyOtp = async () => {
  try {
    if (!confirmation) {
      alert(t("home.sendOtpFirst"));
      return;
    }

    await confirmation.confirm(otpCode);

setPhoneVerified(true);
await saveUserProfile({
  userName,
  phoneNumber: getAuth().currentUser?.phoneNumber || phoneNumber || undefined,
  age: age ? Number(age) : undefined,
  gender,
  weightKg: weightKg ? Number(weightKg) : undefined,
});

setProfileSaved(true);

alert(t("home.phoneVerified"));
  } catch (error) {
    console.log("OTP verification error:", error);
    alert(t("home.invalidOtp"));
  }
};

const loadNextReminder = useCallback(async () => {
  try {
    const now = new Date();
    const timeline = await loadTodayTimeline(now, t);
    setNextReminder(partitionTodayTimeline(timeline.items, now).nextItem);
  } catch (error) {
    console.log("Error loading Today timeline:", error);
    setNextReminder(null);
  }
}, [t]);

  // Load saved water when the app starts
  useEffect(() => {
    loadWaterData();
  loadProfile();
  }, []);
  useEffect(() => {
  const loadWaterHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(WATER_HISTORY_KEY);

      if (savedHistory) {
        setWaterHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.log("Error loading water history:", error);
    }
  };

  loadWaterHistory();
}, []);
useEffect(() => {
  const saveWaterHistory = async () => {
    try {
      await AsyncStorage.setItem(
        WATER_HISTORY_KEY,
        JSON.stringify(waterHistory)
      );
    } catch (error) {
      console.log("Error saving water history:", error);
    }
  };

  saveWaterHistory();
}, [waterHistory]);
useEffect(() => {
  loadDailyGoal();
}, []);
useEffect(() => {
  void loadNextReminder();

  const timer = setInterval(() => {
    void loadNextReminder();
  }, 60000);

  return () => clearInterval(timer);
}, [loadNextReminder]);
useFocusEffect(
  useCallback(() => {
    void loadNextReminder();
  }, [loadNextReminder])
);
  const loadWaterData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);

      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const today = getToday();

        // Saved data is from today
        if (parsedData.date === today) {
          setWater(parsedData.water);
        } else {
          // New day = reset water
          setWater(0);

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              date: today,
              water: 0,
            })
          );
        }
      }
    } catch (error) {
      console.log("Error loading water data:", error);
    } finally {
      setLoading(false);
    }
  };
const loadDailyGoal = async () => {
  try {
    const savedSettings = await AsyncStorage.getItem(
      "hydromate-reminder-settings"
    );

    if (savedSettings) {
      const settings = JSON.parse(savedSettings);

      if (settings.dailyGoal) {
        setDailyGoal(Number(settings.dailyGoal));
      }
    }
  } catch (error) {
    console.log("Error loading daily goal:", error);
  }
};
  // Save water whenever water amount changes
  useEffect(() => {
    if (!loading) {
      saveWaterData(water);
    }
  }, [water, loading]);

  const saveWaterData = async (amount: number) => {
    try {
      const today = getToday();

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          date: today,
          water: amount,
        })
      );
    } catch (error) {
      console.log("Error saving water data:", error);
    }
  };

const addWater = (amount: number) => {
  setLastWaterAdded(amount);
  setWater((currentWater) => {
    const newWater = currentWater + amount;
    const today = getToday();

    saveWaterData(newWater);

    setWaterHistory((currentHistory) => {
      const todayExists = currentHistory.some(
        (item) => item.date === today
      );

      if (todayExists) {
        return currentHistory.map((item) =>
          item.date === today
            ? { ...item, water: newWater }
            : item
        );
      }

      return [
        ...currentHistory,
        {
          date: today,
          water: newWater,
        },
      ];
    });

    return newWater;
  });
};

const undoLastWater = () => {
  if (lastWaterAdded <= 0) {
    return;
  }

  setWater((currentWater) => {
    const newWater = Math.max(0, currentWater - lastWaterAdded);
    const today = getToday();

    saveWaterData(newWater);

    setWaterHistory((currentHistory) =>
      currentHistory.map((item) =>
        item.date === today
          ? { ...item, water: newWater }
          : item
      )
    );

    return newWater;
  });

  setLastWaterAdded(0);
};

  const percentage = Math.min(
    (water / dailyGoal) * 100,
    100
  );
  const last7Days = [...waterHistory].slice(-7);

const sevenDayAverage =
  last7Days.length > 0
    ? Math.round(
        last7Days.reduce(
          (total, item) => total + item.water,
          0
        ) / last7Days.length
      )
    : 0;
    const goalDays = last7Days.filter(
  (item) => item.water >= dailyGoal
).length;
let currentStreak = 0;

for (let i = waterHistory.length - 1; i >= 0; i--) {
  if (waterHistory[i].water >= dailyGoal) {
    currentStreak++;
  } else {
    break;
  }
}
let bestStreak = 0;
let runningStreak = 0;

for (const item of waterHistory) {
  if (item.water >= dailyGoal) {
    runningStreak++;
    bestStreak = Math.max(bestStreak, runningStreak);
  } else {
    runningStreak = 0;
  }
}
const saveNameProfile = async () => {
  try {
    if (!userName.trim()) {
      setNameError(true);
      return;
    }

    const parsedAge = age.trim() ? Number(age) : undefined;
    const parsedWeight = weightKg.trim() ? Number(weightKg) : undefined;
    const nextAgeError =
      parsedAge !== undefined &&
      (!Number.isInteger(parsedAge) ||
        parsedAge < PROFILE_AGE_RANGE.min ||
        parsedAge > PROFILE_AGE_RANGE.max);
    const nextWeightError =
      parsedWeight !== undefined &&
      (!Number.isFinite(parsedWeight) ||
        parsedWeight < PROFILE_WEIGHT_RANGE_KG.min ||
        parsedWeight > PROFILE_WEIGHT_RANGE_KG.max);

    setAgeError(nextAgeError);
    setWeightError(nextWeightError);
    if (nextAgeError || nextWeightError) return;

    const authenticatedPhone = getAuth().currentUser?.phoneNumber;

    await saveUserProfile({
      userName: userName.trim(),
      phoneNumber: authenticatedPhone || phoneNumber || undefined,
      age: parsedAge,
      gender,
      weightKg: parsedWeight,
    });

    setUserName(userName.trim());
    if (authenticatedPhone) setPhoneNumber(authenticatedPhone);
    setProfileSaved(true);

    console.log("Name profile saved:", userName.trim());
  } catch (error) {
    console.log("Error saving name profile:", error);
  }
};
const saveProfile = async () => {
  try {
    if (!phoneVerified) {
  alert(t("home.verifyPhoneFirst"));
  return;
}
    if (phoneNumber.length !== 10) {
  alert(t("home.invalidPhone"));
  return;
}
    await saveUserProfile({
      userName,
      phoneNumber,
      age: age ? Number(age) : undefined,
      gender,
      weightKg: weightKg ? Number(weightKg) : undefined,
    });
    
setProfileSaved(true);
    console.log("Profile saved:", userName, phoneNumber);
  } catch (error) {
    console.log("Error saving profile:", error);
  }
};
const loadVoiceOptions = useCallback(async () => {
  try {
    setLoadingVoices(true);
    const [voices, selectedIdentifier] = await Promise.all([
      getCompatibleVoices(language),
      getSelectedVoiceIdentifier(language),
    ]);
    const selectedVoiceIsAvailable =
      selectedIdentifier !== null &&
      voices.some((voice) => voice.identifier === selectedIdentifier);

    setAvailableVoices(voices);
    setPendingVoiceIdentifier(
      selectedVoiceIsAvailable ? selectedIdentifier : null
    );

    if (selectedIdentifier && !selectedVoiceIsAvailable) {
      await setSelectedVoiceIdentifier(language, null);
    }
  } catch (error) {
    console.log("Error loading compatible voices:", error);
    setAvailableVoices([]);
    setPendingVoiceIdentifier(null);
  } finally {
    setLoadingVoices(false);
  }
}, [language]);

const openVoiceReminderModal = useCallback(() => {
  setPendingVoiceRemindersEnabled(voiceRemindersEnabled);
  setShowVoiceReminderModal(true);
  void loadVoiceOptions();
}, [loadVoiceOptions, voiceRemindersEnabled]);

const openLanguageSettings = useCallback(() => {
  setPendingLanguage(language);
  setShowLanguagePicker(true);
}, [language]);

const openProfileSettings = useCallback(() => {
  setNameError(false);
  setAgeError(false);
  setWeightError(false);
  setProfileSaved(false);
}, []);

const resetProfileSettings = useCallback(() => {
  setUserName("");
  setPhoneNumber(getAuth().currentUser?.phoneNumber || "");
  setAge("");
  setGender(undefined);
  setWeightKg("");
  setNameError(false);
  setAgeError(false);
  setWeightError(false);
  setProfileSaved(false);
}, []);

const testVoiceReminder = async () => {
  try {
    setTestingVoice(true);
    const result = await speakWaterReminder(
      language,
      t("voice.waterSpeech"),
      pendingVoiceIdentifier
    );

    if (result === "voice-unavailable") {
      Alert.alert(
        t("voice.unavailableTitle"),
        t("voice.unavailableMessage")
      );
    } else if (result === "busy") {
      Alert.alert(t("voice.busyTitle"), t("voice.busyMessage"));
    } else if (result === "error" || result === "stopped") {
      Alert.alert(
        t("voice.testErrorTitle"),
        t("voice.testErrorMessage")
      );
    }
  } finally {
    setTestingVoice(false);
  }
};

const scheduleLockedVoiceTest = async () => {
  try {
    setSchedulingLockedVoiceTest(true);
    await scheduleVoiceTest(30);
    Alert.alert(
      "Beta voice test scheduled",
      "Put HydroMate in the background or lock the screen. The native water message will play in about 30 seconds."
    );
  } catch (error) {
    console.log("Error scheduling locked voice test:", error);
    Alert.alert(
      "Could not schedule locked voice test",
      error instanceof Error
        ? error.message
        : "The native Android voice test could not be scheduled."
    );
  } finally {
    setSchedulingLockedVoiceTest(false);
  }
};

const saveVoiceReminderSetting = async () => {
  try {
    setSavingVoiceSetting(true);
    await Promise.all([
      setVoiceRemindersEnabled(pendingVoiceRemindersEnabled),
      setSelectedVoiceIdentifier(language, pendingVoiceIdentifier),
    ]);
    await syncNativeVoiceReminderPreferences({
      language,
      waterSpeechTemplate: t("voice.waterSpeechAmount"),
      medicineSpeechTemplate: t("voice.medicineSpeech"),
      lockedMedicineSpeechTemplate: t("voice.medicineLockedSpeech"),
      birthdaySpeechTemplate: t("voice.birthdaySpeech"),
      lockedBirthdaySpeechTemplate: t("voice.birthdayLockedSpeech"),
      anniversarySpeechTemplate: t("voice.anniversarySpeech"),
      lockedAnniversarySpeechTemplate: t("voice.anniversaryLockedSpeech"),
      customSpeechTemplate: t("voice.customSpeech"),
      lockedCustomSpeechTemplate: t("voice.customLockedSpeech"),
    });
    if (pendingVoiceRemindersEnabled) {
      await Promise.all([
        restoreWaterVoiceCompanionAlarms(),
        restoreMedicineVoiceCompanionAlarms(),
        restoreDatedVoiceCompanionAlarms(),
      ]);
    }
    setVoiceRemindersEnabledState(pendingVoiceRemindersEnabled);
    setShowVoiceReminderModal(false);
  } catch (error) {
    console.log("Error saving voice reminder setting:", error);
    Alert.alert(
      t("voice.saveErrorTitle"),
      t("voice.saveErrorMessage")
    );
  } finally {
    setSavingVoiceSetting(false);
  }
};

const getFeedbackTypeLabel = (type: FeedbackType) => {
  if (type === "bug") {
    return t("feedback.bug");
  }

  if (type === "suggestion") {
    return t("feedback.suggestion");
  }

  return t("feedback.other");
};

const getFeedbackLanguageLabel = (feedbackLanguage: AppLanguage) =>
  LANGUAGE_CONFIG[feedbackLanguage].displayName;

const formatFeedbackDate = (timestamp: string) => {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleString(locale);
};

const sortFeedbackNewestFirst = (items: FeedbackSubmission[]) =>
  [...items].sort(
    (first, second) =>
      new Date(second.timestamp).getTime() -
      new Date(first.timestamp).getTime()
  );

const loadFeedbackHistory = useCallback(async () => {
  try {
    setLoadingFeedbackHistory(true);
    const savedFeedback = await AsyncStorage.getItem(BETA_FEEDBACK_KEY);
    setFeedbackHistory(
      sortFeedbackNewestFirst(parseFeedbackSubmissions(savedFeedback))
    );
  } catch (error) {
    console.log("Error loading beta feedback:", error);
    Alert.alert(
      t("feedback.historyErrorTitle"),
      t("feedback.historyError")
    );
  } finally {
    setLoadingFeedbackHistory(false);
  }
}, [t]);

const shareFeedback = async (submission: FeedbackSubmission) => {
  const version = submission.appVersion ?? APP_VERSION;
  const messageLines = [
    t("feedback.shareHeading"),
    `${t("feedback.shareType")}: ${getFeedbackTypeLabel(submission.type)}`,
    `${t("feedback.shareMessage")}: ${submission.message}`,
    `${t("feedback.shareLanguage")}: ${getFeedbackLanguageLabel(
      submission.language
    )}`,
    `${t("feedback.shareDateTime")}: ${formatFeedbackDate(
      submission.timestamp
    )}`,
  ];

  if (version) {
    messageLines.push(`${t("feedback.shareAppVersion")}: ${version}`);
  }

  try {
    await Share.share({
      title: t("feedback.shareHeading"),
      message: messageLines.join("\n"),
    });
  } catch (error) {
    console.log("Error sharing beta feedback:", error);
    Alert.alert(
      t("feedback.shareErrorTitle"),
      t("feedback.shareError")
    );
  }
};

const openFeedbackModal = useCallback(() => {
  setFeedbackView("form");
  setSelectedFeedback(null);
  setShowFeedbackModal(true);
  void loadFeedbackHistory();
}, [loadFeedbackHistory]);

const closeFeedbackModal = () => {
  setShowFeedbackModal(false);
  setFeedbackView("form");
  setSelectedFeedback(null);
};

const clearFeedbackHistory = async () => {
  try {
    await AsyncStorage.setItem(BETA_FEEDBACK_KEY, JSON.stringify([]));
    setFeedbackHistory([]);
    setSelectedFeedback(null);
    Alert.alert(t("feedback.historyCleared"));
  } catch (error) {
    console.log("Error clearing beta feedback:", error);
    Alert.alert(
      t("feedback.clearErrorTitle"),
      t("feedback.clearError")
    );
  }
};

const confirmClearFeedbackHistory = () => {
  Alert.alert(
    t("feedback.clearConfirmTitle"),
    t("feedback.clearConfirmMessage"),
    [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("feedback.clear"),
        style: "destructive",
        onPress: () => void clearFeedbackHistory(),
      },
    ]
  );
};

const submitFeedback = async () => {
  const message = feedbackMessage.trim();

  if (!message) {
    Alert.alert(
      t("feedback.requiredTitle"),
      t("feedback.requiredMessage")
    );
    return;
  }

  try {
    setSubmittingFeedback(true);

    const savedFeedback = await AsyncStorage.getItem(BETA_FEEDBACK_KEY);
    const submissions = parseFeedbackSubmissions(savedFeedback);
    const submission: FeedbackSubmission = {
      type: feedbackType,
      message,
      timestamp: new Date().toISOString(),
      language,
      appVersion: APP_VERSION,
    };
    const updatedSubmissions = [...submissions, submission];

    await AsyncStorage.setItem(
      BETA_FEEDBACK_KEY,
      JSON.stringify(updatedSubmissions)
    );

    setFeedbackHistory(sortFeedbackNewestFirst(updatedSubmissions));
    setFeedbackType("bug");
    setFeedbackMessage("");
    closeFeedbackModal();
    Alert.alert(
      t("feedback.thankYou"),
      t("feedback.sharePrompt"),
      [
        { text: t("feedback.later"), style: "cancel" },
        {
          text: t("feedback.shareFeedback"),
          onPress: () => void shareFeedback(submission),
        },
      ]
    );
  } catch (error) {
    console.log("Error saving beta feedback:", error);
    Alert.alert(
      t("feedback.saveErrorTitle"),
      t("feedback.saveError")
    );
  } finally {
    setSubmittingFeedback(false);
  }
};

  useEffect(() => {
    publishWakeWordSettingsController(wakeWordSettingsOwnerRef.current, {
      available: wakeWord.available,
      enabled: wakeWord.enabled,
      status: wakeWord.status,
      responseWaitSeconds: wakeWord.responseWaitSeconds,
      diagnostic: wakeWord.diagnostic,
      candidateSummary: wakeWord.candidateSummary,
      debugAudioCaptureEnabled: wakeWord.debugAudioCaptureEnabled,
      voiceRemindersEnabled,
      speakerVerificationEnabled: wakeWord.speakerVerificationEnabled,
      speakerVerificationSensitivity: wakeWord.speakerVerificationSensitivity,
      setEnabled: setWakeWordMode,
      setResponseWaitSeconds: wakeWord.setResponseWaitSeconds,
      setDebugAudioCaptureEnabled: wakeWord.setDebugAudioCaptureEnabled,
      setSpeakerVerificationEnabled: wakeWord.setSpeakerVerificationEnabled,
      setSpeakerVerificationSensitivity:
        wakeWord.setSpeakerVerificationSensitivity,
      openLanguageSettings,
      openVoiceReminderSettings: openVoiceReminderModal,
      openFeedback: openFeedbackModal,
      openProfileSettings,
      resetProfileSettings,
      pauseForSpeakerEnrollment: wakeWord.pauseForSpeakerEnrollment,
      resumeAfterSpeakerEnrollment: wakeWord.resumeAfterSpeakerEnrollment,
    });
  }, [
    openFeedbackModal,
    openLanguageSettings,
    openProfileSettings,
    resetProfileSettings,
    openVoiceReminderModal,
    setWakeWordMode,
    voiceRemindersEnabled,
    wakeWord,
  ]);

  // Show loading screen while saved data is being loaded.
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text>{t("home.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>

        {/* App Header */}

        <Text style={styles.logo}>
          💧 HydroMate
        </Text>
{!profileSaved && (
  <View style={styles.loginCard}>
    <Text style={styles.loginTitle}>{t("home.welcome")}</Text>

    <Text style={styles.loginSubtitle}>
      {t("home.enterName")}
    </Text>

    <TextInput
      style={[styles.profileInput, nameError && styles.profileInputError]}
      placeholder={t("home.yourName")}
      value={userName}
      onChangeText={(value) => {
        setUserName(value);
        setNameError(false);
      }}
    />
    {nameError ? (
      <Text style={styles.profileValidationError}>{t("home.enterYourName")}</Text>
    ) : null}

    {phoneNumber ? (
      <View style={styles.readOnlyProfileField}>
        <Text style={styles.profileFieldLabel}>{t("settings.profilePhone")}</Text>
        <Text style={styles.readOnlyProfileValue}>{phoneNumber}</Text>
        <Text style={styles.profileFieldHelp}>{t("profile.phoneReadOnly")}</Text>
      </View>
    ) : null}

    <Text style={styles.profileFieldLabel}>{t("settings.profileAge")}</Text>
    <TextInput
      keyboardType="number-pad"
      maxLength={3}
      onChangeText={(value) => {
        setAge(value.replace(/[^0-9]/g, ""));
        setAgeError(false);
      }}
      placeholder={t("profile.agePlaceholder")}
      style={[styles.profileInput, ageError && styles.profileInputError]}
      value={age}
    />
    {ageError ? (
      <Text style={styles.profileValidationError}>{t("profile.ageError")}</Text>
    ) : null}

    <Text style={styles.profileFieldLabel}>{t("settings.profileGender")}</Text>
    <View style={styles.genderOptions}>
      {PROFILE_GENDERS.map((option) => {
        const labelKey =
          option === "male"
            ? "profile.genderMale"
            : option === "female"
              ? "profile.genderFemale"
              : "profile.genderPreferNotToSay";
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: gender === option }}
            key={option}
            onPress={() => setGender(gender === option ? undefined : option)}
            style={[
              styles.genderOption,
              gender === option && styles.genderOptionSelected,
            ]}
          >
            <Text
              style={[
                styles.genderOptionText,
                gender === option && styles.genderOptionTextSelected,
              ]}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <Text style={styles.profileFieldLabel}>{t("settings.profileWeight")}</Text>
    <View style={styles.weightInputRow}>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setWeightKg(value.replace(/[^0-9.]/g, ""));
          setWeightError(false);
        }}
        placeholder={t("profile.weightPlaceholder")}
        style={[
          styles.profileInput,
          styles.weightInput,
          weightError && styles.profileInputError,
        ]}
        value={weightKg}
      />
      <Text style={styles.weightUnit}>kg</Text>
    </View>
    {weightError ? (
      <Text style={styles.profileValidationError}>{t("profile.weightError")}</Text>
    ) : null}

    <TouchableOpacity
      style={styles.saveProfileButton}
      onPress={saveNameProfile}
    >
      <Text style={styles.saveProfileButtonText}>
        {t("home.continue")}
      </Text>
    </TouchableOpacity>

    <Text style={styles.verificationStatus}>
      {phoneNumber ? t("profile.optionalFields") : t("home.phoneLater")}
    </Text>
  </View>
)}
        <Text style={styles.greeting}>
  {greeting}{userName ? `, ${userName}` : ""} 👋
</Text>
{profileSaved && (
  <TouchableOpacity
    onPress={() => setProfileSaved(false)}
  >
    <Text style={styles.editProfileText}>
      {t("home.editProfile")}
    </Text>
  </TouchableOpacity>
)}

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void openAssistantManually()}
          style={styles.assistantButton}
        >
          <View style={styles.assistantButtonIcon}>
            <Text style={styles.assistantButtonIconText}>🎙</Text>
          </View>
          <Text style={styles.assistantButtonText}>
            {t("assistant.openButton")}
          </Text>
          <Text style={styles.assistantButtonChevron}>›</Text>
        </TouchableOpacity>

        <Modal
          animationType="fade"
          transparent
          visible={showLanguagePicker}
          onRequestClose={() => setShowLanguagePicker(false)}
        >
          <View style={styles.languageModalBackdrop}>
            <View style={styles.languageModalCard}>
              <Text style={styles.languageModalTitle}>
                {t("home.selectLanguage")}
              </Text>

              <ScrollView
                style={styles.languagePickerList}
                contentContainerStyle={styles.languagePickerContent}
                showsVerticalScrollIndicator
              >
                {ACTIVE_APP_LANGUAGES.map((code) => {
                  const option = {
                    code,
                    label: LANGUAGE_CONFIG[code].displayName,
                  };
                  const isSelected = pendingLanguage === option.code;

                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={option.code}
                      style={[
                        styles.languagePickerOption,
                        isSelected && styles.languagePickerOptionSelected,
                      ]}
                      onPress={() => setPendingLanguage(option.code)}
                    >
                      <Text
                        style={[
                          styles.languagePickerOptionText,
                          option.code !== "en" &&
                            styles.languagePickerIndicOptionText,
                          isSelected && styles.languagePickerOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Text style={styles.languagePickerCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.languageModalActions}>
                <TouchableOpacity
                  style={styles.languageCancelButton}
                  onPress={() => setShowLanguagePicker(false)}
                >
                  <Text style={styles.languageCancelButtonText}>
                    ✕ {t("common.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.languageDoneButton}
                  onPress={() => {
                    void setLanguage(pendingLanguage);
                    setShowLanguagePicker(false);
                  }}
                >
                  <Text style={styles.languageDoneButtonText}>
                    ✓ {t("common.done")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={showVoiceReminderModal}
          onRequestClose={() => setShowVoiceReminderModal(false)}
        >
          <View style={styles.languageModalBackdrop}>
            <View style={styles.languageModalCard}>
              <Text style={styles.languageModalTitle}>
                {t("voice.modalTitle")}
              </Text>

              <View style={styles.voiceToggleRow}>
                <View style={styles.voiceToggleLabelGroup}>
                  <Text style={styles.voiceToggleLabel}>
                    {t("voice.enabledLabel")}
                  </Text>
                  <Text style={styles.voiceToggleStatus}>
                    {t(
                      pendingVoiceRemindersEnabled ? "voice.on" : "voice.off"
                    )}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#C9D7E1", true: "#90CAF9" }}
                  thumbColor={
                    pendingVoiceRemindersEnabled ? "#2196F3" : "#F4F4F4"
                  }
                  value={pendingVoiceRemindersEnabled}
                  onValueChange={setPendingVoiceRemindersEnabled}
                />
              </View>

              <View style={styles.voiceLanguageRow}>
                <Text style={styles.voiceLanguageLabel}>
                  {t("voice.currentLanguage")}
                </Text>
                <Text style={styles.voiceLanguageValue}>
                  {LANGUAGE_CONFIG[language].displayName}
                </Text>
              </View>

              <View style={styles.voiceSelectionSection}>
                <Text style={styles.voiceSelectionLabel}>
                  {t("voice.voiceSelection")}
                </Text>

                {loadingVoices ? (
                  <Text style={styles.voiceSelectionInfo}>
                    {t("voice.loadingVoices")}
                  </Text>
                ) : (
                  <ScrollView
                    style={styles.voiceSelectionList}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.voiceSelectionOption,
                        pendingVoiceIdentifier === null &&
                          styles.voiceSelectionOptionSelected,
                      ]}
                      onPress={() => setPendingVoiceIdentifier(null)}
                    >
                      <Text style={styles.voiceSelectionOptionText}>
                        {t("voice.systemDefault")}
                      </Text>
                      {pendingVoiceIdentifier === null ? (
                        <Text style={styles.voiceSelectionCheck}>✓</Text>
                      ) : null}
                    </TouchableOpacity>

                    {availableVoices.map((voice) => {
                      const isSelected =
                        pendingVoiceIdentifier === voice.identifier;

                      return (
                        <TouchableOpacity
                          accessibilityRole="button"
                          key={voice.identifier}
                          style={[
                            styles.voiceSelectionOption,
                            isSelected && styles.voiceSelectionOptionSelected,
                          ]}
                          onPress={() =>
                            setPendingVoiceIdentifier(voice.identifier)
                          }
                        >
                          <View style={styles.voiceSelectionOptionContent}>
                            <Text style={styles.voiceSelectionOptionText}>
                              {voice.name}
                            </Text>
                            <Text style={styles.voiceSelectionOptionMeta}>
                              {voice.language} · {voice.quality}
                              {voice.isFallbackLanguage
                                ? ` · ${LANGUAGE_CONFIG.hi.displayName}`
                                : ""}
                            </Text>
                          </View>
                          {isSelected ? (
                            <Text style={styles.voiceSelectionCheck}>✓</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}

                    {availableVoices.length === 0 ? (
                      <Text style={styles.voiceSelectionInfo}>
                        {t("voice.noCompatibleVoices")}
                      </Text>
                    ) : null}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                disabled={testingVoice || loadingVoices}
                style={[
                  styles.voiceTestButton,
                  (testingVoice || loadingVoices) &&
                    styles.feedbackButtonDisabled,
                ]}
                onPress={() => void testVoiceReminder()}
              >
                <Text style={styles.voiceTestButtonText}>
                  {testingVoice
                    ? t("voice.testingVoice")
                    : t("voice.testVoice")}
                </Text>
              </TouchableOpacity>

              {__DEV__ && isLockedVoiceTestAvailable ? (
                <TouchableOpacity
                  disabled={schedulingLockedVoiceTest}
                  style={[
                    styles.lockedVoiceTestButton,
                    schedulingLockedVoiceTest &&
                      styles.feedbackButtonDisabled,
                  ]}
                  onPress={() => void scheduleLockedVoiceTest()}
                >
                  <Text style={styles.lockedVoiceTestButtonText}>
                    {schedulingLockedVoiceTest
                      ? "Scheduling native test…"
                      : "Test Locked Voice — 30 sec"}
                  </Text>
                  <Text style={styles.lockedVoiceTestBetaText}>
                    Beta/development test
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.voiceOpenOnlyInfo}>
                {t("voice.openOnlyInfo")}
              </Text>

              <View style={styles.languageModalActions}>
                <TouchableOpacity
                  disabled={savingVoiceSetting}
                  style={styles.languageCancelButton}
                  onPress={() => setShowVoiceReminderModal(false)}
                >
                  <Text style={styles.languageCancelButtonText}>
                    ✕ {t("common.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={savingVoiceSetting || loadingVoices}
                  style={[
                    styles.languageDoneButton,
                    (savingVoiceSetting || loadingVoices) &&
                      styles.feedbackButtonDisabled,
                  ]}
                  onPress={() => void saveVoiceReminderSetting()}
                >
                  <Text style={styles.languageDoneButtonText}>
                    ✓ {t("common.done")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={showFeedbackModal}
          onRequestClose={closeFeedbackModal}
        >
          <View style={styles.languageModalBackdrop}>
            <View style={[styles.languageModalCard, styles.feedbackModalCard]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {feedbackView === "form" ? (
                  <>
                    <Text style={styles.languageModalTitle}>
                      {t("feedback.modalTitle")}
                    </Text>

                    <Text style={styles.feedbackFieldLabel}>
                      {t("feedback.typeLabel")}
                    </Text>
                    <View style={styles.feedbackTypeRow}>
                      {([
                        { type: "bug" as const, label: t("feedback.bug") },
                        {
                          type: "suggestion" as const,
                          label: t("feedback.suggestion"),
                        },
                        {
                          type: "other" as const,
                          label: t("feedback.other"),
                        },
                      ]).map((option) => {
                        const isSelected = feedbackType === option.type;

                        return (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={option.type}
                            style={[
                              styles.feedbackTypeButton,
                              isSelected && styles.feedbackTypeButtonSelected,
                            ]}
                            onPress={() => setFeedbackType(option.type)}
                          >
                            <Text
                              style={[
                                styles.feedbackTypeButtonText,
                                isSelected &&
                                  styles.feedbackTypeButtonTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      multiline
                      numberOfLines={5}
                      placeholder={t("feedback.messagePlaceholder")}
                      style={styles.feedbackMessageInput}
                      textAlignVertical="top"
                      value={feedbackMessage}
                      onChangeText={setFeedbackMessage}
                    />

                    <View style={styles.languageModalActions}>
                      <TouchableOpacity
                        disabled={submittingFeedback}
                        style={styles.languageCancelButton}
                        onPress={closeFeedbackModal}
                      >
                        <Text style={styles.languageCancelButtonText}>
                          ✕ {t("common.cancel")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={submittingFeedback}
                        style={[
                          styles.languageDoneButton,
                          submittingFeedback && styles.feedbackButtonDisabled,
                        ]}
                        onPress={() => void submitFeedback()}
                      >
                        <Text style={styles.languageDoneButtonText}>
                          {submittingFeedback
                            ? t("feedback.submitting")
                            : `✓ ${t("feedback.submit")}`}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.feedbackHistoryButton}
                      onPress={() => {
                        setFeedbackView("history");
                        setSelectedFeedback(null);
                        void loadFeedbackHistory();
                      }}
                    >
                      <Text style={styles.feedbackHistoryButtonText}>
                        {t("feedback.history")}
                      </Text>
                      <Text style={styles.settingChevron}>›</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.feedbackBackButton}
                      onPress={() => {
                        if (selectedFeedback) {
                          setSelectedFeedback(null);
                        } else {
                          setFeedbackView("form");
                        }
                      }}
                    >
                      <Text style={styles.feedbackBackButtonText}>
                        ‹ {t("feedback.back")}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.languageModalTitle}>
                      {selectedFeedback
                        ? t("feedback.detailsTitle")
                        : t("feedback.history")}
                    </Text>

                    {selectedFeedback ? (
                      <View style={styles.feedbackDetailCard}>
                        <Text style={styles.feedbackDetailType}>
                          {getFeedbackTypeLabel(selectedFeedback.type)}
                        </Text>
                        <Text style={styles.feedbackDetailMeta}>
                          {formatFeedbackDate(selectedFeedback.timestamp)}
                        </Text>
                        <Text style={styles.feedbackDetailMeta}>
                          {t("feedback.shareLanguage")}: {getFeedbackLanguageLabel(
                            selectedFeedback.language
                          )}
                        </Text>
                        {(selectedFeedback.appVersion ?? APP_VERSION) && (
                          <Text style={styles.feedbackDetailMeta}>
                            {t("feedback.shareAppVersion")}: {selectedFeedback.appVersion ?? APP_VERSION}
                          </Text>
                        )}
                        <Text style={styles.feedbackDetailMessage}>
                          {selectedFeedback.message}
                        </Text>

                        <TouchableOpacity
                          style={styles.feedbackShareButton}
                          onPress={() => void shareFeedback(selectedFeedback)}
                        >
                          <Text style={styles.languageDoneButtonText}>
                            {t("feedback.shareFeedback")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : loadingFeedbackHistory ? (
                      <Text style={styles.feedbackEmptyText}>
                        {t("feedback.historyLoading")}
                      </Text>
                    ) : feedbackHistory.length === 0 ? (
                      <Text style={styles.feedbackEmptyText}>
                        {t("feedback.historyEmpty")}
                      </Text>
                    ) : (
                      <>
                        {feedbackHistory.map((item, index) => {
                          const preview =
                            item.message.length > 90
                              ? `${item.message.slice(0, 87)}…`
                              : item.message;

                          return (
                            <TouchableOpacity
                              key={`${item.timestamp}-${index}`}
                              style={styles.feedbackHistoryItem}
                              onPress={() => setSelectedFeedback(item)}
                            >
                              <View style={styles.feedbackHistoryItemHeader}>
                                <Text style={styles.feedbackHistoryItemType}>
                                  {getFeedbackTypeLabel(item.type)}
                                </Text>
                                <Text style={styles.feedbackHistoryItemDate}>
                                  {formatFeedbackDate(item.timestamp)}
                                </Text>
                              </View>
                              <Text style={styles.feedbackHistoryPreview}>
                                {preview}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        <TouchableOpacity
                          style={styles.feedbackClearButton}
                          onPress={confirmClearFeedbackHistory}
                        >
                          <Text style={styles.feedbackClearButtonText}>
                            {t("feedback.clearHistory")}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Text style={styles.subtitle}>
          {t("home.tagline")}
        </Text>


        {/* Water Progress Card */}

        <View style={styles.waterCard}>

          <Text style={styles.cardTitle}>
            {t("home.todaysWater")}
          </Text>

          <View style={styles.waterRow}>

            <Text style={styles.waterAmount}>
              {(water / 1000).toFixed(2)} L
            </Text>

            <Text style={styles.goalText}>
              / {(dailyGoal / 1000).toFixed(2)} L
            </Text>

          </View>


        </View>
<View
  style={{
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  }}
>
  <Text
    style={{
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 12,
    }}
  >
    {t("home.dailyHistory")}
  </Text>

<View
  style={{
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F7F8FA",
    marginBottom: 14,
  }}
>
 <Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  {t("home.sevenDayAverage", { amount: sevenDayAverage })}
</Text>

<Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  {t("home.goalAchieved", { achieved: goalDays, total: last7Days.length || 7 })}
</Text>
<Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  {t("home.currentStreak", {
    count: currentStreak,
    days: t(currentStreak === 1 ? "home.day" : "home.days"),
  })}
</Text>
<Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  {t("home.bestStreak", {
    count: bestStreak,
    days: t(bestStreak === 1 ? "home.day" : "home.days"),
  })}
</Text>
</View>
<Text
  style={{
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  }}
>
  {t("home.weeklyProgress", {
    count: goalDays,
    days: t(goalDays === 1 ? "home.day" : "home.days"),
    total: last7Days.length || 7,
  })}
</Text>

  {waterHistory.length === 0 ? (
    <Text style={{ fontSize: 15 }}>
      {t("home.noHistory")}
    </Text>
  ) : (
    [...waterHistory]
      .reverse()
      .slice(0, 7)
      .map((item) => (
        <View
          key={item.date}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 15 }}>
            {new Date(item.date).toLocaleDateString(locale, {
  day: "2-digit",
  month: "short",
  year: "numeric",
})}
          </Text>

          <View
  style={{
    alignItems: "flex-end",
  }}
>
  <Text
    style={{
      fontSize: 15,
      fontWeight: "600",
    }}
  >
    {item.water} ml
  </Text>

  <Text
    style={{
      fontSize: 13,
      marginTop: 2,
    }}
  >
    {t("home.percentOfGoal", {
      percent: Math.round((item.water / dailyGoal) * 100),
    })}
  </Text>
</View>
        </View>
      ))
  )}
</View>

          {/* Progress Bar */}

          <View style={styles.progressBackground}>

            <View
              style={[
                styles.progress,
                {
                  width: `${percentage}%`,
                },
              ]}
            />

          </View>


          <Text style={styles.percentage}>
            {t("home.percentOfTodaysGoal", { percent: Math.round(percentage) })}
          </Text>

        {/* Next Reminder */}

        <TouchableOpacity
          style={styles.reminderCard}
          activeOpacity={0.85}
          onPress={() => router.push("/today")}
        >

          <View style={styles.nextUpContent}>

            <Text style={styles.reminderTitle}>
              {t("today.nextUp")}
            </Text>

            {nextReminder ? (
              <>
                <Text style={styles.homeNextTitle} numberOfLines={2}>
                  {nextReminder.icon} {nextReminder.title}
                </Text>
                <Text style={styles.reminderTime}>
                  {nextReminder.scheduledAt.toLocaleTimeString(locale, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </>
            ) : (
              <Text style={styles.homeNextEmpty}>{t("today.noMore")}</Text>
            )}

          </View>

          <Text style={styles.viewTodayText}>
            {t("today.viewToday")} ›
          </Text>

        </TouchableOpacity>


        {/* Add Water */}

        <Text style={styles.sectionTitle}>
          {t("home.addWater")}
        </Text>

        <View style={styles.buttonRow}>

          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => addWater(250)}
          >
            <Text style={styles.buttonText}>
              +250 ml
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => addWater(500)}
          >
            <Text style={styles.buttonText}>
              +500 ml
            </Text>
          </TouchableOpacity>

        </View>
<TouchableOpacity
  style={styles.customButton}
  onPress={() => addWater(750)}
>
  <Text style={styles.customButtonText}>
    +750 ml
  </Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.customButton}
  onPress={() => setShowCustomWater(true)}
>
  <Text style={styles.customButtonText}>
    {t("home.custom")}
  </Text>
</TouchableOpacity>
{showCustomWater && (
  <View style={{ marginTop: 12 }}>
    <TextInput
      style={styles.profileInput}
      placeholder={t("home.customWaterPlaceholder")}
      value={customWaterAmount}
      onChangeText={setCustomWaterAmount}
      keyboardType="number-pad"
    />

    <TouchableOpacity
      style={styles.saveProfileButton}
      onPress={() => {
        const amount = Number(customWaterAmount);

        if (!amount || amount <= 0) {
          alert(t("home.invalidWater"));
          return;
        }

        addWater(amount);
        setCustomWaterAmount("");
        setShowCustomWater(false);
      }}
    >
      <Text style={styles.saveProfileButtonText}>
        {t("home.addWater")}
      </Text>
    </TouchableOpacity>
  </View>
)}
{lastWaterAdded > 0 && (
  <TouchableOpacity
    onPress={undoLastWater}
    style={{
      marginTop: 12,
      alignSelf: "center",
      paddingVertical: 8,
      paddingHorizontal: 16,
    }}
  >
    <Text
      style={{
        fontSize: 15,
        fontWeight: "600",
      }}
    >
      {t("home.undoLastWater", { amount: lastWaterAdded })}
    </Text>
  </TouchableOpacity>
)}
        {/* Today's Status */}

        <View style={styles.statusCard}>

          <Text style={styles.statusTitle}>
            {t("home.todaysStatus")}
          </Text>

          <Text style={styles.statusText}>
            {water >= dailyGoal
              ? t("home.goalCompleted")
              : t("home.litersRemaining", { amount: (
                  (dailyGoal - water) /
                  1000
                ).toFixed(2) })}
          </Text>

        </View>


        <Text style={styles.footer}>
          {t("home.footer")}
        </Text>

            </View>
    </ScrollView>
    <HydroMateAssistantModal
      assistantSessionId={assistantSessionId}
      onClose={closeHydroMateAssistant}
      onReminderSaved={() => void loadNextReminder()}
      responseWaitSeconds={wakeWord.responseWaitSeconds}
      userName={userName}
      visible={assistantVisible}
      wakeWordEnabled={wakeWord.enabled}
    />
  </SafeAreaView>
);
}


const styles = StyleSheet.create({
assistantButton: {
  minHeight: 68,
  marginTop: 14,
  marginBottom: 15,
  paddingHorizontal: 16,
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#BCE3F3",
  backgroundColor: "#DFF4FC",
},
assistantButtonIcon: {
  width: 42,
  height: 42,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 21,
  backgroundColor: "#FFFFFF",
},
assistantButtonIconText: {
  fontSize: 21,
},
assistantButtonText: {
  flex: 1,
  marginLeft: 12,
  color: "#176487",
  fontSize: 18,
  fontWeight: "800",
},
assistantButtonChevron: {
  color: "#4D8CA8",
  fontSize: 28,
  fontWeight: "500",
},
wakeWordRow: {
  alignItems: "center",
  gap: 12,
},
wakeWordLabelGroup: {
  flex: 1,
  paddingRight: 8,
},
wakeWordExplanation: {
  marginTop: 3,
  color: "#617987",
  fontSize: 12,
  lineHeight: 17,
},
wakeWordStatus: {
  marginTop: 5,
  color: "#176487",
  fontSize: 12,
  fontWeight: "700",
},
wakeResponseCard: {
  marginTop: 10,
  padding: 14,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#D7E7EF",
  backgroundColor: "#F8FCFE",
},
wakeResponseOptions: {
  marginTop: 10,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
},
wakeResponseOption: {
  minHeight: 36,
  paddingHorizontal: 12,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 11,
  borderWidth: 1,
  borderColor: "#C7DCE7",
  backgroundColor: "#FFFFFF",
},
wakeResponseOptionSelected: {
  borderColor: "#2F80C9",
  backgroundColor: "#E4F2FC",
},
wakeResponseOptionText: {
  color: "#577180",
  fontSize: 12,
  fontWeight: "700",
},
wakeResponseOptionTextSelected: {
  color: "#17689B",
},
wakeResponseCustomArea: {
  marginTop: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
wakeResponseInput: {
  flex: 1,
  minHeight: 42,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: "#C7DCE7",
  borderRadius: 11,
  color: "#294859",
  backgroundColor: "#FFFFFF",
},
wakeResponseSave: {
  minHeight: 42,
  paddingHorizontal: 14,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 11,
  backgroundColor: "#2F80C9",
},
wakeResponseSaveText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "800",
},
wakeResponseError: {
  marginTop: 7,
  color: "#B34552",
  fontSize: 11,
},
wakeDiagnosticText: {
  marginTop: 9,
  color: "#6A7480",
  fontSize: 10,
  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
},
wakeCalibrationButton: {
  marginTop: 9,
  minHeight: 36,
  paddingHorizontal: 10,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  backgroundColor: "#E8EEF2",
},
wakeCalibrationButtonActive: {
  backgroundColor: "#FFE8B8",
},
wakeCalibrationButtonText: {
  color: "#4E6572",
  fontSize: 10,
  fontWeight: "800",
},
testButton: {
  marginTop: 14,
  height: 58,
  borderRadius: 15,
  borderWidth: 2,
  borderColor: "#2196F3",
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
},
profileInput: {
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 12,
  paddingHorizontal: 15,
  paddingVertical: 14,
  fontSize: 17,
  width: "100%",
  marginBottom: 12,
},
profileInputError: { borderColor: "#C53C3C" },
profileFieldLabel: {
  marginBottom: 7,
  color: "#526B79",
  fontSize: 13,
  fontWeight: "700",
},
profileFieldHelp: { marginTop: 4, color: "#78909C", fontSize: 11 },
profileValidationError: {
  marginTop: -6,
  marginBottom: 12,
  color: "#C53C3C",
  fontSize: 12,
},
readOnlyProfileField: {
  marginBottom: 14,
  padding: 12,
  borderRadius: 12,
  backgroundColor: "#F2F6F8",
},
readOnlyProfileValue: { color: "#304E5E", fontSize: 15, fontWeight: "700" },
genderOptions: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 14,
},
genderOption: {
  minHeight: 40,
  justifyContent: "center",
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: "#C8DCE7",
  borderRadius: 11,
  backgroundColor: "#FFFFFF",
},
genderOptionSelected: { borderColor: "#2187B5", backgroundColor: "#E1F2FA" },
genderOptionText: { color: "#526B79", fontSize: 13, fontWeight: "700" },
genderOptionTextSelected: { color: "#176B90" },
weightInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
weightInput: { flex: 1 },
weightUnit: { marginBottom: 12, color: "#526B79", fontSize: 15, fontWeight: "700" },
saveProfileButton: {
  backgroundColor: "#2196F3",
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
  marginBottom: 15,
},

saveProfileButtonText: {
  color: "#fff",
  fontSize: 17,
  fontWeight: "600",
},

testButtonText: {
  color: "#2196F3",
  fontSize: 17,
  fontWeight: "700",
},

  container: {
    flex: 1,
    backgroundColor: "#F4FAFF",
  },

  content: {
    padding: 24,
  },

  logo: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },

  greeting: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 28,
  },

  subtitle: {
    fontSize: 15,
    color: "#666666",
    marginTop: 6,
  },

  waterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginTop: 25,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 4,
  },

  cardTitle: {
    fontSize: 18,
    color: "#555555",
    fontWeight: "500",
  },

  waterRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },

  waterAmount: {
    fontSize: 46,
    fontWeight: "700",
  },

  goalText: {
    fontSize: 18,
    color: "#777777",
    marginLeft: 5,
  },

  progressBackground: {
    height: 12,
    backgroundColor: "#E5E5E5",
    borderRadius: 10,
    marginTop: 22,
    overflow: "hidden",
  },

  progress: {
    height: "100%",
    backgroundColor: "#2196F3",
    borderRadius: 10,
  },

  percentage: {
    marginTop: 10,
    fontSize: 14,
    color: "#666666",
  },

  reminderCard: {
    backgroundColor: "#E8F5FF",
    borderRadius: 18,
    padding: 20,
    marginTop: 18,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  nextUpContent: {
    flex: 1,
    paddingRight: 14,
  },

  reminderTitle: {
    fontSize: 13,
    color: "#666666",
  },

  reminderTime: {
    color: "#2875A8",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
  },

  homeNextTitle: {
    marginTop: 5,
    color: "#17324D",
    fontSize: 18,
    fontWeight: "700",
  },

  homeNextEmpty: {
    marginTop: 5,
    color: "#526C7C",
    fontSize: 15,
    fontWeight: "600",
  },

  viewTodayText: {
    color: "#1976B8",
    fontSize: 14,
    fontWeight: "800",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 25,
    marginBottom: 12,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },

  waterButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 17,
    borderRadius: 15,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  customButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 15,

    borderWidth: 1,
    borderColor: "#2196F3",

    alignItems: "center",
  },

  customButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "600",
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  statusText: {
    fontSize: 15,
    color: "#666666",
    marginTop: 7,
  },

  footer: {
    textAlign: "center",
    marginTop: 22,
    color: "#888888",
    fontSize: 13,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 18,
  },
scrollContent: {
  paddingBottom: 120,
},
editProfileText: {
  fontSize: 14,
  marginTop: 6,
  marginBottom: 10,
  textDecorationLine: "underline",
},
languageRow: {
  minHeight: 54,
  marginTop: 12,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  overflow: "visible",
},
feedbackRow: {
  marginTop: 10,
},
voiceReminderRow: {
  marginTop: 10,
},
languageRowLabelContainer: {
  flex: 1,
  justifyContent: "center",
  paddingRight: 12,
},
languageRowLabel: {
  flexShrink: 0,
  fontSize: 16,
  lineHeight: 26,
  fontWeight: "600",
  includeFontPadding: true,
  textAlignVertical: "center",
},
languageRowValue: {
  flexShrink: 0,
  flexDirection: "row",
  alignItems: "center",
},
  languageRowValueText: {
    flexShrink: 0,
    fontSize: 16,
  lineHeight: 26,
  color: "#2196F3",
  fontWeight: "600",
    includeFontPadding: true,
    textAlignVertical: "center",
  },
settingChevron: {
  flexShrink: 0,
  width: 20,
  marginLeft: 8,
  fontSize: 26,
  lineHeight: 28,
  color: "#777777",
  textAlign: "center",
  textAlignVertical: "center",
},
languageModalBackdrop: {
  flex: 1,
  justifyContent: "center",
  padding: 24,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
},
languageModalCard: {
  padding: 20,
  borderRadius: 20,
  backgroundColor: "#FFFFFF",
},
languageModalTitle: {
  marginBottom: 16,
  fontSize: 21,
  fontWeight: "700",
  textAlign: "center",
},
languagePickerList: {
  maxHeight: 160,
},
languagePickerContent: {
  gap: 10,
},
languagePickerOption: {
  minHeight: 58,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#FFFFFF",
},
languagePickerOptionSelected: {
  borderColor: "#2196F3",
  backgroundColor: "#DFF3FF",
},
languagePickerOptionText: {
  fontSize: 18,
  fontWeight: "600",
},
languagePickerIndicOptionText: {
  fontWeight: "400",
},
languagePickerOptionTextSelected: {
  color: "#1565C0",
},
languagePickerCheck: {
  color: "#2196F3",
  fontSize: 22,
  fontWeight: "700",
},
languageModalActions: {
  marginTop: 20,
  flexDirection: "row",
  gap: 12,
},
languageCancelButton: {
  flex: 1,
  minHeight: 56,
  borderWidth: 1,
  borderColor: "#777777",
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
},
languageCancelButtonText: {
  fontSize: 16,
  fontWeight: "600",
  textAlign: "center",
},
languageDoneButton: {
  flex: 1,
  minHeight: 56,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#2196F3",
},
languageDoneButtonText: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "700",
  textAlign: "center",
},
voiceToggleRow: {
  minHeight: 64,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#F7FBFF",
},
voiceToggleLabelGroup: {
  flex: 1,
  paddingRight: 12,
},
voiceToggleLabel: {
  fontSize: 16,
  fontWeight: "600",
},
voiceToggleStatus: {
  marginTop: 3,
  color: "#2196F3",
  fontSize: 13,
  fontWeight: "700",
},
voiceLanguageRow: {
  minHeight: 52,
  marginTop: 12,
  paddingHorizontal: 14,
  borderRadius: 13,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#F4FAFF",
},
voiceLanguageLabel: {
  color: "#555555",
  fontSize: 15,
  fontWeight: "600",
},
voiceLanguageValue: {
  color: "#1565C0",
  fontSize: 15,
  fontWeight: "700",
},
voiceSelectionSection: {
  marginTop: 12,
},
voiceSelectionLabel: {
  marginBottom: 7,
  color: "#555555",
  fontSize: 15,
  fontWeight: "600",
},
voiceSelectionList: {
  maxHeight: 128,
},
voiceSelectionOption: {
  minHeight: 48,
  marginBottom: 7,
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 11,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#FFFFFF",
},
voiceSelectionOptionSelected: {
  borderColor: "#2196F3",
  backgroundColor: "#DFF3FF",
},
voiceSelectionOptionContent: {
  flex: 1,
  paddingRight: 10,
},
voiceSelectionOptionText: {
  color: "#333333",
  fontSize: 14,
  fontWeight: "600",
},
voiceSelectionOptionMeta: {
  marginTop: 2,
  color: "#666666",
  fontSize: 12,
},
voiceSelectionCheck: {
  color: "#2196F3",
  fontSize: 18,
  fontWeight: "700",
},
voiceSelectionInfo: {
  paddingVertical: 10,
  color: "#666666",
  fontSize: 13,
  textAlign: "center",
},
voiceTestButton: {
  minHeight: 52,
  marginTop: 14,
  borderWidth: 1,
  borderColor: "#2196F3",
  borderRadius: 13,
  alignItems: "center",
  justifyContent: "center",
},
voiceTestButtonText: {
  color: "#2196F3",
  fontSize: 16,
  fontWeight: "700",
},
lockedVoiceTestButton: {
  minHeight: 58,
  marginTop: 10,
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "#FF9800",
  borderRadius: 13,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 12,
},
lockedVoiceTestButtonText: {
  color: "#E67E00",
  fontSize: 15,
  fontWeight: "700",
},
lockedVoiceTestBetaText: {
  marginTop: 2,
  color: "#8A6D3B",
  fontSize: 11,
  fontWeight: "600",
},
voiceOpenOnlyInfo: {
  marginTop: 14,
  color: "#666666",
  fontSize: 13,
  lineHeight: 19,
  textAlign: "center",
},
feedbackModalCard: {
  maxHeight: "85%",
},
feedbackFieldLabel: {
  marginBottom: 9,
  fontSize: 15,
  fontWeight: "600",
  color: "#555555",
},
feedbackTypeRow: {
  flexDirection: "row",
  gap: 8,
  marginBottom: 18,
},
feedbackTypeButton: {
  flex: 1,
  minHeight: 44,
  paddingHorizontal: 6,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 11,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFFFFF",
},
feedbackTypeButtonSelected: {
  borderColor: "#2196F3",
  backgroundColor: "#DFF3FF",
},
feedbackTypeButtonText: {
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
},
feedbackTypeButtonTextSelected: {
  color: "#1565C0",
},
feedbackMessageInput: {
  minHeight: 130,
  padding: 14,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  fontSize: 16,
},
feedbackButtonDisabled: {
  opacity: 0.55,
},
feedbackHistoryButton: {
  minHeight: 52,
  marginTop: 14,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 13,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#F4FAFF",
},
feedbackHistoryButtonText: {
  color: "#1565C0",
  fontSize: 16,
  fontWeight: "600",
},
feedbackBackButton: {
  alignSelf: "flex-start",
  marginBottom: 6,
  paddingVertical: 5,
  paddingHorizontal: 4,
},
feedbackBackButtonText: {
  color: "#2196F3",
  fontSize: 16,
  fontWeight: "600",
},
feedbackEmptyText: {
  paddingVertical: 28,
  color: "#666666",
  fontSize: 15,
  textAlign: "center",
},
feedbackHistoryItem: {
  marginBottom: 10,
  padding: 14,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 14,
  backgroundColor: "#F7FBFF",
},
feedbackHistoryItemHeader: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
},
feedbackHistoryItemType: {
  color: "#1565C0",
  fontSize: 15,
  fontWeight: "700",
},
feedbackHistoryItemDate: {
  flexShrink: 1,
  color: "#777777",
  fontSize: 12,
  textAlign: "right",
},
feedbackHistoryPreview: {
  marginTop: 8,
  color: "#444444",
  fontSize: 14,
  lineHeight: 20,
},
feedbackDetailCard: {
  padding: 16,
  borderWidth: 1,
  borderColor: "#D8EAF7",
  borderRadius: 14,
  backgroundColor: "#F7FBFF",
},
feedbackDetailType: {
  color: "#1565C0",
  fontSize: 18,
  fontWeight: "700",
},
feedbackDetailMeta: {
  marginTop: 5,
  color: "#666666",
  fontSize: 13,
},
feedbackDetailMessage: {
  marginTop: 16,
  color: "#333333",
  fontSize: 16,
  lineHeight: 23,
},
feedbackShareButton: {
  minHeight: 52,
  marginTop: 20,
  borderRadius: 13,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#2196F3",
},
feedbackClearButton: {
  minHeight: 48,
  marginTop: 10,
  borderWidth: 1,
  borderColor: "#E53935",
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
},
feedbackClearButtonText: {
  color: "#E53935",
  fontSize: 15,
  fontWeight: "700",
},
loginCard: {
  padding: 18,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 16,
  marginBottom: 18,
  backgroundColor: "#fff",
},
loginTitle: {
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 6,
},

loginSubtitle: {
  fontSize: 14,
  marginBottom: 18,
},
verificationStatus: {
  fontSize: 13,
  marginBottom: 10,
},
openingScreen: {
  flex: 1,
  backgroundColor: "#ffffff",
},

openingImage: {
  width: "100%",
  height: "100%",
},
});

import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, signOut } from "@react-native-firebase/auth";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocalization } from "../../localization";
import { LANGUAGE_CONFIG } from "../../localization/languages";
import {
  beginSpeakerEnrollment,
  cancelSpeakerEnrollment,
  clearDebugWakeAudioFiles,
  commitSpeakerEnrollment,
  ensureSpeakerProfile,
  recordSpeakerEnrollmentSample,
} from "../../modules/hydromate-wake-word";
import {
  MAX_WAKE_WORD_RESPONSE_WAIT_SECONDS,
  MIN_WAKE_WORD_RESPONSE_WAIT_SECONDS,
  WAKE_WORD_RESPONSE_WAIT_PRESETS,
} from "../../services/wakeWordService";
import { WAKE_WORD_DETECTION_CONFIG } from "../../services/wakeWordState";
import { useWakeWordSettingsController } from "../../services/wakeWordSettingsBridge";
import {
  loadReminderControlState,
  setCategoryReminderControlEnabled,
  setMasterReminderControlEnabled,
} from "../../services/reminderControlService";
import type {
  CategoryEnabledStates,
  ReminderCategory,
} from "../../services/reminderCategoryService";
import {
  clearLocalSpeakerProfile,
  loadSpeakerVerificationPreferences,
  SPEAKER_PROFILE_ENROLLED_KEY,
  SPEAKER_VERIFICATION_ENABLED_KEY,
  SPEAKER_VERIFICATION_SENSITIVITIES,
  SPEAKER_VERIFICATION_SENSITIVITY_KEY,
  type SpeakerVerificationSensitivity,
} from "../../services/speakerProfileStorageService";
import {
  clearUserProfile,
  loadUserProfile,
  type ProfileGender,
} from "../../services/userProfileService";

const SPEAKER_ENROLLMENT_SAMPLE_COUNT = 5;
const REMINDER_SETTINGS_KEY = "hydromate-reminder-settings";
const DEFAULT_CATEGORY_STATES: CategoryEnabledStates = {
  water: true,
  medicine: true,
  birthday: true,
  anniversary: true,
  custom: true,
};
const REMINDER_CATEGORY_CONTROLS = [
  { category: "water", labelKey: "reminders.enableWaterReminders" },
  { category: "medicine", labelKey: "reminders.enableMedicineReminders" },
  { category: "birthday", labelKey: "reminders.enableBirthdayReminders" },
  {
    category: "anniversary",
    labelKey: "reminders.enableAnniversaryReminders",
  },
  { category: "custom", labelKey: "reminders.enableRoutineReminders" },
] as const;

type SettingsSectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
};

function SettingsSection({ icon, onPress, title }: SettingsSectionProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.placeholderCard}
    >
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons color="#526B79" name={icon} size={18} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons color="#78909C" name="chevron-forward" size={18} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { language, t } = useLocalization();
  const router = useRouter();
  const wakeWord = useWakeWordSettingsController();
  const [showReminderControls, setShowReminderControls] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [masterRemindersEnabled, setMasterRemindersEnabled] = useState(true);
  const [categoryStates, setCategoryStates] = useState<CategoryEnabledStates>(
    DEFAULT_CATEGORY_STATES
  );
  const [updatingReminderControl, setUpdatingReminderControl] = useState<
    ReminderCategory | "master" | null
  >(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAge, setProfileAge] = useState<number | undefined>();
  const [profileGender, setProfileGender] = useState<ProfileGender | undefined>();
  const [profileWeightKg, setProfileWeightKg] = useState<number | undefined>();
  const [dailyWaterGoal, setDailyWaterGoal] = useState<number | null>(null);
  const [showCustomWait, setShowCustomWait] = useState(false);
  const [customWait, setCustomWait] = useState("5");
  const [customWaitError, setCustomWaitError] = useState(false);
  const [speakerSettingsLoaded, setSpeakerSettingsLoaded] = useState(false);
  const [speakerVerificationEnabled, setSpeakerVerificationEnabled] =
    useState(false);
  const [speakerProfileEnrolled, setSpeakerProfileEnrolled] = useState(false);
  const [speakerVerificationSensitivity, setSpeakerVerificationSensitivity] =
    useState<SpeakerVerificationSensitivity>("balanced");
  const [showSpeakerSetup, setShowSpeakerSetup] = useState(false);
  const [speakerEnrollmentPreparing, setSpeakerEnrollmentPreparing] =
    useState(false);
  const [showSpeakerEnrollment, setShowSpeakerEnrollment] = useState(false);
  const [speakerEnrollmentSample, setSpeakerEnrollmentSample] = useState(1);
  const [speakerSampleRecorded, setSpeakerSampleRecorded] = useState(false);
  const [speakerSampleRecording, setSpeakerSampleRecording] = useState(false);
  const [speakerEnrollmentCompleting, setSpeakerEnrollmentCompleting] =
    useState(false);
  const speakerEnrollmentSessionRef = useRef(0);
  const speakerEnrollmentActiveRef = useRef(false);
  const speakerSampleRecordingRef = useRef(false);
  const speakerEnrollmentCompletingRef = useRef(false);
  const wakeWordRef = useRef(wakeWord);
  const responseWaitSeconds = wakeWord?.responseWaitSeconds ?? 5;
  const responseUsesCustomValue = !WAKE_WORD_RESPONSE_WAIT_PRESETS.includes(
    responseWaitSeconds as (typeof WAKE_WORD_RESPONSE_WAIT_PRESETS)[number]
  );
  const enabledCategoryCount = Object.values(categoryStates).filter(Boolean).length;
  const appVersion = Constants.expoConfig?.version ?? t("common.notAvailable");
  const buildNumber = Constants.expoConfig?.android?.versionCode;

  const loadSettingsDetails = useCallback(async () => {
    try {
      const [reminderControls, profile, savedReminderSettings] =
        await Promise.all([
          loadReminderControlState(),
          loadUserProfile(),
          AsyncStorage.getItem(REMINDER_SETTINGS_KEY),
        ]);
      setMasterRemindersEnabled(reminderControls.masterEnabled);
      setCategoryStates(reminderControls.categories);

      if (profile) {
        setProfileName(profile.userName);
        setProfilePhone(
          getAuth().currentUser?.phoneNumber || profile.phoneNumber || ""
        );
        setProfileAge(profile.age);
        setProfileGender(profile.gender);
        setProfileWeightKg(profile.weightKg);
      } else {
        setProfileName("");
        setProfilePhone(getAuth().currentUser?.phoneNumber || "");
        setProfileAge(undefined);
        setProfileGender(undefined);
        setProfileWeightKg(undefined);
      }

      if (savedReminderSettings) {
        const settings = JSON.parse(savedReminderSettings) as {
          dailyGoal?: unknown;
        };
        const goal = Number(settings.dailyGoal);
        setDailyWaterGoal(Number.isFinite(goal) && goal > 0 ? goal : null);
      } else {
        setDailyWaterGoal(null);
      }
    } catch (error) {
      console.log("Error loading Settings details:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettingsDetails();
    }, [loadSettingsDetails])
  );

  useEffect(() => {
    setCustomWait(String(responseWaitSeconds));
  }, [responseWaitSeconds]);

  useEffect(() => {
    wakeWordRef.current = wakeWord;
  }, [wakeWord]);

  useEffect(
    () => () => {
      if (!speakerEnrollmentActiveRef.current) return;
      speakerEnrollmentSessionRef.current += 1;
      speakerEnrollmentActiveRef.current = false;
      cancelSpeakerEnrollment();
      wakeWordRef.current?.resumeAfterSpeakerEnrollment();
    },
    []
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" || !speakerEnrollmentActiveRef.current) return;
      speakerEnrollmentSessionRef.current += 1;
      speakerEnrollmentActiveRef.current = false;
      cancelSpeakerEnrollment();
      setShowSpeakerEnrollment(false);
      setShowSpeakerSetup(false);
      setSpeakerEnrollmentPreparing(false);
      setSpeakerEnrollmentSample(1);
      setSpeakerSampleRecorded(false);
      setSpeakerSampleRecording(false);
      setSpeakerEnrollmentCompleting(false);
      speakerSampleRecordingRef.current = false;
      speakerEnrollmentCompletingRef.current = false;
      wakeWordRef.current?.resumeAfterSpeakerEnrollment();
      if (__DEV__) console.log("Speaker enrollment cancelled");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;

    const loadSpeakerSettings = async () => {
      try {
        const preferences = await loadSpeakerVerificationPreferences();
        const profileReady = await ensureSpeakerProfile();

        if (!active) return;

        setSpeakerVerificationEnabled(preferences.enabled);
        setSpeakerVerificationSensitivity(preferences.sensitivity);
        setSpeakerProfileEnrolled(profileReady);
        if (profileReady !== preferences.enrolled) {
          await AsyncStorage.setItem(
            SPEAKER_PROFILE_ENROLLED_KEY,
            String(profileReady)
          );
        }
      } catch (error) {
        console.log("Error loading speaker verification settings:", error);
      } finally {
        if (active) setSpeakerSettingsLoaded(true);
      }
    };

    void loadSpeakerSettings();

    return () => {
      active = false;
    };
  }, []);

  const updateSpeakerVerification = async (enabled: boolean) => {
    const previousValue = speakerVerificationEnabled;
    setSpeakerVerificationEnabled(enabled);

    try {
      if (wakeWord) {
        await wakeWord.setSpeakerVerificationEnabled(enabled);
      } else {
        await AsyncStorage.setItem(
          SPEAKER_VERIFICATION_ENABLED_KEY,
          String(enabled)
        );
      }
    } catch (error) {
      setSpeakerVerificationEnabled(previousValue);
      console.log("Error saving speaker verification setting:", error);
    }
  };

  const updateSpeakerSensitivity = async (
    sensitivity: SpeakerVerificationSensitivity
  ) => {
    const previousValue = speakerVerificationSensitivity;
    setSpeakerVerificationSensitivity(sensitivity);
    try {
      if (wakeWord) {
        await wakeWord.setSpeakerVerificationSensitivity(sensitivity);
      } else {
        await AsyncStorage.setItem(
          SPEAKER_VERIFICATION_SENSITIVITY_KEY,
          sensitivity
        );
      }
    } catch (error) {
      setSpeakerVerificationSensitivity(previousValue);
      console.log("Error saving speaker sensitivity:", error);
    }
  };

  const openSpeakerSetup = () => {
    setShowSpeakerSetup(true);
  };

  const closeSpeakerSetup = () => {
    setShowSpeakerSetup(false);
  };

  const resetEnrollmentUi = () => {
    setShowSpeakerSetup(false);
    setShowSpeakerEnrollment(false);
    setSpeakerEnrollmentPreparing(false);
    setSpeakerEnrollmentSample(1);
    setSpeakerSampleRecorded(false);
    setSpeakerSampleRecording(false);
    setSpeakerEnrollmentCompleting(false);
    speakerSampleRecordingRef.current = false;
    speakerEnrollmentCompletingRef.current = false;
  };

  const finishEnrollmentMicrophoneOwnership = () => {
    speakerEnrollmentActiveRef.current = false;
    wakeWordRef.current?.resumeAfterSpeakerEnrollment();
  };

  const cancelEnrollmentFlow = () => {
    speakerEnrollmentSessionRef.current += 1;
    cancelSpeakerEnrollment();
    resetEnrollmentUi();
    finishEnrollmentMicrophoneOwnership();
    if (__DEV__) console.log("Speaker enrollment cancelled");
  };

  const failEnrollment = (error: unknown) => {
    speakerEnrollmentSessionRef.current += 1;
    cancelSpeakerEnrollment();
    resetEnrollmentUi();
    finishEnrollmentMicrophoneOwnership();
    if (__DEV__) console.log("Speaker enrollment error:", error);
    Alert.alert(
      t("speakerVerification.errorTitle"),
      t("speakerVerification.errorMessage")
    );
  };

  const startEnrollmentFlow = async () => {
    if (speakerEnrollmentActiveRef.current) return;
    const controller = wakeWordRef.current;
    if (!controller) {
      failEnrollment(new Error("Wake-word controller is unavailable"));
      return;
    }

    const sessionId = speakerEnrollmentSessionRef.current + 1;
    speakerEnrollmentSessionRef.current = sessionId;
    speakerEnrollmentActiveRef.current = true;
    setSpeakerEnrollmentPreparing(true);
    try {
      await controller.pauseForSpeakerEnrollment();
      if (speakerEnrollmentSessionRef.current !== sessionId) return;
      await beginSpeakerEnrollment();
      if (speakerEnrollmentSessionRef.current !== sessionId) {
        cancelSpeakerEnrollment();
        finishEnrollmentMicrophoneOwnership();
        return;
      }
      setShowSpeakerSetup(false);
      setSpeakerEnrollmentPreparing(false);
      setSpeakerEnrollmentSample(1);
      setSpeakerSampleRecorded(false);
      setShowSpeakerEnrollment(true);
      if (__DEV__) console.log("Speaker enrollment started");
    } catch (error) {
      if (speakerEnrollmentSessionRef.current === sessionId) {
        failEnrollment(error);
      }
    }
  };

  const recordEnrollmentSample = async () => {
    if (
      speakerSampleRecordingRef.current ||
      speakerEnrollmentCompletingRef.current
    ) return;
    const sessionId = speakerEnrollmentSessionRef.current;
    const sampleNumber = speakerEnrollmentSample;
    setSpeakerSampleRecorded(false);
    setSpeakerSampleRecording(true);
    speakerSampleRecordingRef.current = true;
    try {
      const sample = await recordSpeakerEnrollmentSample(sampleNumber);
      if (speakerEnrollmentSessionRef.current !== sessionId) return;
      setSpeakerSampleRecorded(true);
      if (__DEV__) {
        console.log(
          `Speaker enrollment sample=${sampleNumber} saved path=${sample.path} duration=${sample.durationMillis}ms`
        );
      }
    } catch (error) {
      if (speakerEnrollmentSessionRef.current === sessionId) {
        failEnrollment(error);
      }
    } finally {
      if (speakerEnrollmentSessionRef.current === sessionId) {
        setSpeakerSampleRecording(false);
        speakerSampleRecordingRef.current = false;
      }
    }
  };

  const acceptEnrollmentSample = async () => {
    if (speakerEnrollmentCompletingRef.current) return;
    if (speakerEnrollmentSample < SPEAKER_ENROLLMENT_SAMPLE_COUNT) {
      setSpeakerEnrollmentSample((sample) => sample + 1);
      setSpeakerSampleRecorded(false);
      return;
    }

    const sessionId = speakerEnrollmentSessionRef.current;
    setSpeakerEnrollmentCompleting(true);
    speakerEnrollmentCompletingRef.current = true;
    try {
      await commitSpeakerEnrollment();
      await AsyncStorage.setItem(SPEAKER_PROFILE_ENROLLED_KEY, "true");
      if (speakerEnrollmentSessionRef.current !== sessionId) return;
      setSpeakerProfileEnrolled(true);
      resetEnrollmentUi();
      finishEnrollmentMicrophoneOwnership();
      if (__DEV__) console.log("Speaker enrollment completed");
      Alert.alert(
        t("speakerVerification.completeTitle"),
        t("speakerVerification.completeMessage")
      );
    } catch (error) {
      if (speakerEnrollmentSessionRef.current === sessionId) {
        failEnrollment(error);
      }
    }
  };

  const saveCustomWait = () => {
    const seconds = Number(customWait);
    if (
      !Number.isInteger(seconds) ||
      seconds < MIN_WAKE_WORD_RESPONSE_WAIT_SECONDS ||
      seconds > MAX_WAKE_WORD_RESPONSE_WAIT_SECONDS
    ) {
      setCustomWaitError(true);
      return;
    }
    setCustomWaitError(false);
    void wakeWord?.setResponseWaitSeconds(seconds);
  };

  const updateMasterReminderControl = async (enabled: boolean) => {
    setMasterRemindersEnabled(enabled);
    setUpdatingReminderControl("master");
    try {
      const savedCategories = await setMasterReminderControlEnabled(enabled);
      setCategoryStates(savedCategories);
    } catch (error) {
      const savedState = await loadReminderControlState();
      setMasterRemindersEnabled(savedState.masterEnabled);
      setCategoryStates(savedState.categories);
      console.log("Error updating master reminder control:", error);
      Alert.alert(t("settings.updateErrorTitle"), t("settings.updateErrorMessage"));
    } finally {
      setUpdatingReminderControl(null);
    }
  };

  const updateCategoryReminderControl = async (
    category: ReminderCategory,
    enabled: boolean
  ) => {
    setCategoryStates((states) => ({ ...states, [category]: enabled }));
    setUpdatingReminderControl(category);
    try {
      await setCategoryReminderControlEnabled(category, enabled);
    } catch (error) {
      const savedState = await loadReminderControlState();
      setMasterRemindersEnabled(savedState.masterEnabled);
      setCategoryStates(savedState.categories);
      console.log(`Error updating ${category} reminder control:`, error);
      Alert.alert(t("settings.updateErrorTitle"), t("settings.updateErrorMessage"));
    } finally {
      setUpdatingReminderControl(null);
    }
  };

  const editProfile = () => {
    setShowProfile(false);
    wakeWord?.openProfileSettings();
    router.push("/");
  };

  const profileGenderLabel = profileGender
    ? t(
        profileGender === "male"
          ? "profile.genderMale"
          : profileGender === "female"
            ? "profile.genderFemale"
            : "profile.genderPreferNotToSay"
      )
    : t("settings.notSet");

  const confirmLogout = () => {
    Alert.alert(t("settings.logoutConfirmTitle"), t("settings.logoutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const auth = getAuth();
              if (auth.currentUser) await signOut(auth);
              setShowProfile(false);
              wakeWord?.openProfileSettings();
              router.push("/");
            } catch (error) {
              console.log("Error signing out:", error);
              Alert.alert(
                t("settings.logoutErrorTitle"),
                t("settings.logoutErrorMessage")
              );
            }
          })();
        },
      },
    ]);
  };

  const confirmResetProfile = () => {
    Alert.alert(
      t("settings.resetProfileConfirmTitle"),
      t("settings.resetProfileConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.resetProfile"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await clearUserProfile();
                setProfileName("");
                setProfilePhone(getAuth().currentUser?.phoneNumber || "");
                setProfileAge(undefined);
                setProfileGender(undefined);
                setProfileWeightKg(undefined);
                setShowProfile(false);
                wakeWord?.resetProfileSettings();
                router.push("/");
              } catch (error) {
                console.log("Error resetting profile:", error);
                Alert.alert(
                  t("settings.updateErrorTitle"),
                  t("settings.updateErrorMessage")
                );
              }
            })();
          },
        },
      ]
    );
  };

  const confirmDeleteVoiceProfile = () => {
    Alert.alert(
      t("settings.deleteVoiceProfileConfirmTitle"),
      t("settings.deleteVoiceProfileConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteVoiceProfile"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                cancelSpeakerEnrollment();
                await clearLocalSpeakerProfile();
                await wakeWord?.setSpeakerVerificationEnabled(false);
                setSpeakerProfileEnrolled(false);
                setSpeakerVerificationEnabled(false);
                Alert.alert(t("settings.voiceProfileDeleted"));
              } catch (error) {
                console.log("Error deleting local speaker profile:", error);
                Alert.alert(
                  t("settings.updateErrorTitle"),
                  t("settings.updateErrorMessage")
                );
              }
            })();
          },
        },
      ]
    );
  };

  const clearWakeDebugRecordings = async () => {
    try {
      const count = await clearDebugWakeAudioFiles();
      Alert.alert(
        t("settings.debugRecordingsClearedTitle"),
        t("settings.debugRecordingsClearedMessage", { count })
      );
    } catch (error) {
      console.log("Error clearing wake debug recordings:", error);
      Alert.alert(t("settings.updateErrorTitle"), t("settings.updateErrorMessage"));
    }
  };

  const wakeStatusKey =
    wakeWord?.status === "listening"
      ? "wakeWord.listening"
      : wakeWord?.status === "paused"
        ? "wakeWord.paused"
        : wakeWord?.status === "permission-required"
          ? "wakeWord.permissionRequired"
          : wakeWord?.status === "unavailable" || wakeWord?.status === "error"
            ? "wakeWord.unavailable"
            : wakeWord?.status === "stopped"
              ? "wakeWord.foregroundOnly"
              : "wakeWord.off";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("settings.title")}</Text>

        <View style={styles.wakeCard}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.wakeIcon]}>
              <Ionicons color="#1976A3" name="mic-outline" size={19} />
            </View>
            <Text style={styles.sectionTitle}>{t("settings.voiceWakeWord")}</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.controlTitle}>{t("wakeWord.title")}</Text>
              <Text style={styles.explanation}>
                {t("wakeWord.foregroundExplanation")}
              </Text>
              <Text style={styles.status}>{t(wakeStatusKey)}</Text>
            </View>
            <Switch
              accessibilityLabel={t("wakeWord.title")}
              disabled={!wakeWord?.available}
              onValueChange={(enabled) => wakeWord?.setEnabled(enabled)}
              thumbColor={wakeWord?.enabled ? "#2196F3" : "#F4F4F4"}
              trackColor={{ false: "#C9D7E1", true: "#90CAF9" }}
              value={wakeWord?.enabled ?? false}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.controlTitle}>{t("wakeWord.responseWaitTitle")}</Text>
          <Text style={styles.explanation}>
            {t("wakeWord.responseWaitExplanation")}
          </Text>
          <View style={styles.responseOptions}>
            {WAKE_WORD_RESPONSE_WAIT_PRESETS.map((seconds) => (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!wakeWord}
                key={seconds}
                onPress={() => {
                  setShowCustomWait(false);
                  setCustomWaitError(false);
                  void wakeWord?.setResponseWaitSeconds(seconds);
                }}
                style={[
                  styles.responseOption,
                  responseWaitSeconds === seconds && styles.responseOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.responseOptionText,
                    responseWaitSeconds === seconds &&
                      styles.responseOptionTextSelected,
                  ]}
                >
                  {t("wakeWord.secondsShort", { count: seconds })}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!wakeWord}
              onPress={() => setShowCustomWait(true)}
              style={[
                styles.responseOption,
                responseUsesCustomValue && styles.responseOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.responseOptionText,
                  responseUsesCustomValue && styles.responseOptionTextSelected,
                ]}
              >
                {t("wakeWord.custom")}
              </Text>
            </TouchableOpacity>
          </View>

          {showCustomWait || responseUsesCustomValue ? (
            <View style={styles.customRow}>
              <TextInput
                accessibilityLabel={t("wakeWord.custom")}
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={setCustomWait}
                placeholder={t("wakeWord.customSecondsPlaceholder")}
                style={styles.customInput}
                value={customWait}
              />
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!wakeWord}
                onPress={saveCustomWait}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>
                  {t("wakeWord.saveResponseWait")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {customWaitError ? (
            <Text style={styles.errorText}>
              {t("wakeWord.responseWaitRange", {
                min: MIN_WAKE_WORD_RESPONSE_WAIT_SECONDS,
                max: MAX_WAKE_WORD_RESPONSE_WAIT_SECONDS,
              })}
            </Text>
          ) : null}

          {__DEV__ && wakeWord?.diagnostic ? (
            <Text style={styles.diagnosticText}>
              {`wake score = ${wakeWord.diagnostic.score.toFixed(3)} · peak = ${wakeWord.diagnostic.peakScore.toFixed(3)} · ${wakeWord.diagnostic.state} · ${wakeWord.diagnostic.consecutiveFrames}/${WAKE_WORD_DETECTION_CONFIG.consecutiveFrames}`}
            </Text>
          ) : null}
          {__DEV__ && wakeWord?.candidateSummary ? (
            <Text style={styles.diagnosticText}>
              {`candidate frames=${wakeWord.candidateSummary.frames} duration=${wakeWord.candidateSummary.durationMillis}ms max=${wakeWord.candidateSummary.maximumScore.toFixed(3)} mean=${wakeWord.candidateSummary.meanScore.toFixed(3)} over70=${wakeWord.candidateSummary.framesOver70} over90=${wakeWord.candidateSummary.framesOver90} result=${wakeWord.candidateSummary.terminationReason}`}
            </Text>
          ) : null}
          {__DEV__ ? (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!wakeWord}
              onPress={() =>
                wakeWord?.setDebugAudioCaptureEnabled(
                  !wakeWord.debugAudioCaptureEnabled
                )
              }
              style={[
                styles.debugButton,
                wakeWord?.debugAudioCaptureEnabled && styles.debugButtonActive,
              ]}
            >
              <Text style={styles.debugButtonText}>
                {`Debug WAV capture: ${wakeWord?.debugAudioCaptureEnabled ? "ON" : "OFF"}`}
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider} />
          <View style={styles.switchRowNoMargin}>
            <View style={styles.switchCopy}>
              <Text style={styles.controlTitle}>
                {t("speakerVerification.title")}
              </Text>
              <Text style={styles.status}>
                {t(
                  !speakerVerificationEnabled
                    ? "speakerVerification.off"
                    : speakerProfileEnrolled
                      ? "speakerVerification.ready"
                      : "speakerVerification.setupRequired"
                )}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t("speakerVerification.title")}
              disabled={!speakerSettingsLoaded}
              onValueChange={(enabled) =>
                void updateSpeakerVerification(enabled)
              }
              thumbColor={speakerVerificationEnabled ? "#2196F3" : "#F4F4F4"}
              trackColor={{ false: "#C9D7E1", true: "#90CAF9" }}
              value={speakerVerificationEnabled}
            />
          </View>
          {speakerVerificationEnabled ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={openSpeakerSetup}
              style={styles.speakerSetupButton}
            >
              <Text style={styles.speakerSetupButtonText}>
                {t(
                  speakerProfileEnrolled
                    ? "speakerVerification.rerecord"
                    : "speakerVerification.setup"
                )}
              </Text>
            </TouchableOpacity>
          ) : null}
          {speakerVerificationEnabled && speakerProfileEnrolled ? (
            <View style={styles.sensitivitySection}>
              <Text style={styles.profileLabel}>
                {t("speakerVerification.sensitivity")}
              </Text>
              <View style={styles.sensitivityOptions}>
                {SPEAKER_VERIFICATION_SENSITIVITIES.map((sensitivity) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: speakerVerificationSensitivity === sensitivity,
                    }}
                    key={sensitivity}
                    onPress={() => void updateSpeakerSensitivity(sensitivity)}
                    style={[
                      styles.sensitivityOption,
                      speakerVerificationSensitivity === sensitivity &&
                        styles.sensitivityOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sensitivityOptionText,
                        speakerVerificationSensitivity === sensitivity &&
                          styles.sensitivityOptionTextSelected,
                      ]}
                    >
                      {t(`speakerVerification.sensitivity.${sensitivity}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.privacyNote}>
            <Ionicons color="#557582" name="lock-closed-outline" size={15} />
            <Text style={styles.privacyNoteText}>
              {t("speakerVerification.privacy")}
            </Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.languageIcon]}>
              <Ionicons color="#6A5A9E" name="language-outline" size={19} />
            </View>
            <Text style={styles.sectionTitle}>{t("settings.languageVoice")}</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={!wakeWord}
            onPress={() => wakeWord?.openLanguageSettings()}
            style={styles.settingRow}
          >
            <Text style={styles.settingLabel}>{t("home.language")}</Text>
            <View style={styles.settingValueGroup}>
              <Text numberOfLines={2} style={styles.settingValue}>
                {LANGUAGE_CONFIG[language].displayName}
              </Text>
              <Ionicons color="#78909C" name="chevron-forward" size={18} />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            accessibilityRole="button"
            disabled={!wakeWord}
            onPress={() => wakeWord?.openVoiceReminderSettings()}
            style={styles.settingRow}
          >
            <Text style={styles.settingLabel}>{t("voice.rowTitle")}</Text>
            <View style={styles.settingValueGroup}>
              <Text style={styles.settingValue}>
                {t(wakeWord?.voiceRemindersEnabled ? "voice.on" : "voice.off")}
              </Text>
              <Ionicons color="#78909C" name="chevron-forward" size={18} />
            </View>
          </TouchableOpacity>
        </View>

        <SettingsSection
          icon="notifications-outline"
          onPress={() => setShowReminderControls(true)}
          title={t("settings.reminderControls")}
        />
        <SettingsSection
          icon="person-outline"
          onPress={() => setShowProfile(true)}
          title={t("settings.profile")}
        />
        <SettingsSection
          icon="shield-checkmark-outline"
          onPress={() => setShowPrivacy(true)}
          title={t("settings.privacy")}
        />
        <View style={styles.settingsCard}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.feedbackIcon]}>
              <Ionicons
                color="#AA6A20"
                name="chatbubble-ellipses-outline"
                size={18}
              />
            </View>
            <Text style={styles.sectionTitle}>{t("settings.feedback")}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!wakeWord}
            onPress={() => wakeWord?.openFeedback()}
            style={styles.settingRow}
          >
            <Text style={styles.settingLabel}>{t("feedback.rowTitle")}</Text>
            <Ionicons color="#78909C" name="chevron-forward" size={18} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowReminderControls(false)}
        transparent
        visible={showReminderControls}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.detailModalCard]}>
            <Text style={styles.detailModalTitle}>
              {t("settings.reminderControls")}
            </Text>
            <Text style={styles.detailSummary}>
              {t("settings.reminderCategorySummary", {
                enabled: enabledCategoryCount,
                total: REMINDER_CATEGORY_CONTROLS.length,
              })}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.controlDetailRow}>
                <View style={styles.controlDetailCopy}>
                  <Text style={styles.controlTitle}>
                    {t("reminders.masterTitle")}
                  </Text>
                  <Text style={styles.explanation}>
                    {t("reminders.masterControlsAll")}
                  </Text>
                  <Text style={styles.status}>
                    {t(
                      masterRemindersEnabled
                        ? "settings.stateOn"
                        : "settings.stateOff"
                    )}
                  </Text>
                </View>
                <Switch
                  disabled={updatingReminderControl !== null}
                  onValueChange={(enabled) =>
                    void updateMasterReminderControl(enabled)
                  }
                  value={masterRemindersEnabled}
                />
              </View>

              <View style={styles.divider} />

              {REMINDER_CATEGORY_CONTROLS.map(({ category, labelKey }, index) => (
                <View key={category}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <View style={styles.controlDetailRow}>
                    <View style={styles.controlDetailCopy}>
                      <Text style={styles.controlTitle}>{t(labelKey)}</Text>
                      <Text style={styles.status}>
                        {t(
                          categoryStates[category]
                            ? "settings.stateOn"
                            : "settings.stateOff"
                        )}
                      </Text>
                    </View>
                    <Switch
                      disabled={updatingReminderControl !== null}
                      onValueChange={(enabled) =>
                        void updateCategoryReminderControl(category, enabled)
                      }
                      value={categoryStates[category]}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowReminderControls(false)}
              style={[styles.modalPrimaryButton, styles.detailDoneButton]}
            >
              <Text style={styles.modalPrimaryButtonText}>{t("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowProfile(false)}
        transparent
        visible={showProfile}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.detailModalCard]}>
            <Text style={styles.detailModalTitle}>{t("settings.profile")}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>{t("settings.profileName")}</Text>
              <Text style={styles.profileValue}>
                {profileName || t("settings.notSet")}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>{t("settings.profilePhone")}</Text>
              <Text style={styles.profileValue}>
                {profilePhone || t("settings.notSet")}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>{t("settings.profileAge")}</Text>
              <Text style={styles.profileValue}>
                {profileAge ?? t("settings.notSet")}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>{t("settings.profileGender")}</Text>
              <Text style={styles.profileValue}>{profileGenderLabel}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>{t("settings.profileWeight")}</Text>
              <Text style={styles.profileValue}>
                {profileWeightKg === undefined
                  ? t("settings.notSet")
                  : t("settings.kilograms", { amount: profileWeightKg })}
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>
                {t("settings.dailyWaterGoal")}
              </Text>
              <Text style={styles.profileValue}>
                {dailyWaterGoal === null
                  ? t("settings.notSet")
                  : t("settings.milliliters", { amount: dailyWaterGoal })}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={confirmLogout}
              style={styles.profileLogoutButton}
            >
              <Text style={styles.profileLogoutButtonText}>{t("settings.logout")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={confirmResetProfile}
              style={styles.destructiveButton}
            >
              <Text style={styles.destructiveButtonText}>
                {t("settings.resetProfile")}
              </Text>
            </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setShowProfile(false)}
                style={[styles.modalSecondaryButton, styles.modalActionButton]}
              >
                <Text style={styles.modalSecondaryButtonText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={editProfile}
                style={[styles.modalPrimaryButton, styles.modalActionButton]}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {t("home.editProfile")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowPrivacy(false)}
        transparent
        visible={showPrivacy}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.detailModalCard]}>
            <Text style={styles.detailModalTitle}>{t("settings.privacy")}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.privacyHeading}>
                {t("settings.wakeWordPrivacyTitle")}
              </Text>
              <Text style={styles.privacyBody}>
                {t("settings.wakeWordPrivacyText")}
              </Text>

              <View style={styles.divider} />
              <Text style={styles.privacyHeading}>
                {t("settings.speakerProfileTitle")}
              </Text>
              <Text style={styles.privacyBody}>
                {t("settings.speakerProfileText")}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={confirmDeleteVoiceProfile}
                style={styles.destructiveButton}
              >
                <Text style={styles.destructiveButtonText}>
                  {t("settings.deleteVoiceProfile")}
                </Text>
              </TouchableOpacity>

              {__DEV__ ? (
                <>
                  <View style={styles.divider} />
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => void clearWakeDebugRecordings()}
                    style={styles.debugClearButton}
                  >
                    <Text style={styles.debugClearButtonText}>
                      {t("settings.clearWakeDebugRecordings")}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <View style={styles.divider} />
              <Text style={styles.privacyHeading}>{t("settings.appInformation")}</Text>
              <Text style={styles.privacyBody}>HydroMate</Text>
              <Text style={styles.privacyBody}>
                {t("settings.versionValue", { version: appVersion })}
              </Text>
              {buildNumber !== undefined ? (
                <Text style={styles.privacyBody}>
                  {t("settings.buildValue", { build: buildNumber })}
                </Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowPrivacy(false)}
              style={[styles.modalPrimaryButton, styles.detailDoneButton]}
            >
              <Text style={styles.modalPrimaryButtonText}>{t("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!speakerEnrollmentPreparing) closeSpeakerSetup();
        }}
        transparent
        visible={showSpeakerSetup}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons color="#1976A3" name="person-circle-outline" size={30} />
            </View>
            <Text style={styles.modalTitle}>
              {t("speakerVerification.setupTitle")}
            </Text>
            <Text style={styles.modalMessage}>
              {t("speakerVerification.setupExplanation")}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={speakerEnrollmentPreparing}
                onPress={closeSpeakerSetup}
                style={[
                  styles.modalSecondaryButton,
                  styles.modalActionButton,
                  speakerEnrollmentPreparing && styles.disabledButton,
                ]}
              >
                <Text style={styles.modalSecondaryButtonText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={speakerEnrollmentPreparing}
                onPress={() => void startEnrollmentFlow()}
                style={[
                  styles.modalPrimaryButton,
                  styles.modalActionButton,
                  speakerEnrollmentPreparing && styles.disabledButton,
                ]}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {t("speakerVerification.continue")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!speakerEnrollmentCompleting) cancelEnrollmentFlow();
        }}
        transparent
        visible={showSpeakerEnrollment}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons color="#1976A3" name="mic-outline" size={30} />
            </View>
            <Text style={styles.modalTitle}>
              {t("speakerVerification.setupTitle")}
            </Text>
            <Text style={styles.modalMessage}>
              {t("speakerVerification.enrollmentInstruction")}
            </Text>
            <Text style={styles.sampleProgress}>
              {t("speakerVerification.sampleProgress", {
                current: speakerEnrollmentSample,
                total: SPEAKER_ENROLLMENT_SAMPLE_COUNT,
              })}
            </Text>

            <View style={styles.recordingState}>
              <Ionicons
                color={speakerSampleRecording ? "#D84A4A" : "#2187B5"}
                name={speakerSampleRecording ? "radio-button-on" : "mic-circle-outline"}
                size={26}
              />
              <Text style={styles.recordingStateText}>
                {t(
                  speakerSampleRecording
                    ? "speakerVerification.listening"
                    : speakerSampleRecorded
                      ? "speakerVerification.sampleRecorded"
                      : "speakerVerification.readyToRecord"
                )}
              </Text>
            </View>

            {!speakerSampleRecorded ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={speakerSampleRecording}
                onPress={() => void recordEnrollmentSample()}
                style={[
                  styles.recordButton,
                  speakerSampleRecording && styles.disabledButton,
                ]}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {t(
                    speakerSampleRecording
                      ? "speakerVerification.listening"
                      : "speakerVerification.record"
                  )}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sampleActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => void recordEnrollmentSample()}
                  style={[styles.modalSecondaryButton, styles.modalActionButton]}
                >
                  <Text style={styles.modalSecondaryButtonText}>
                    {t("speakerVerification.tryAgain")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={speakerEnrollmentCompleting}
                  onPress={() => void acceptEnrollmentSample()}
                  style={[
                    styles.modalPrimaryButton,
                    styles.modalActionButton,
                    speakerEnrollmentCompleting && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {t("speakerVerification.useSample")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              disabled={speakerEnrollmentCompleting}
              onPress={cancelEnrollmentFlow}
              style={styles.enrollmentCancelButton}
            >
              <Text style={styles.enrollmentCancelButtonText}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FBFF" },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  title: { color: "#17394A", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  wakeCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCEAF1",
    backgroundColor: "#FFFFFF",
  },
  settingsCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCEAF1",
    backgroundColor: "#FFFFFF",
  },
  placeholderCard: {
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCEAF1",
    backgroundColor: "#FFFFFF",
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#EEF3F6",
  },
  wakeIcon: { backgroundColor: "#E5F5FC" },
  languageIcon: { backgroundColor: "#F0EBFF" },
  feedbackIcon: { backgroundColor: "#FFF1DC" },
  sectionTitle: { flex: 1, color: "#243F4E", fontSize: 17, fontWeight: "800" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  switchRowNoMargin: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchCopy: { flex: 1, paddingRight: 6 },
  controlTitle: { color: "#304E5E", fontSize: 15, fontWeight: "700" },
  explanation: { marginTop: 3, color: "#617987", fontSize: 12, lineHeight: 17 },
  status: { marginTop: 5, color: "#176487", fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E3EDF2", marginVertical: 16 },
  responseOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11 },
  responseOption: {
    minHeight: 38,
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#C8DCE7",
    backgroundColor: "#F4F9FC",
  },
  responseOptionSelected: { borderColor: "#2187B5", backgroundColor: "#DFF3FC" },
  responseOptionText: { color: "#526B79", fontSize: 12, fontWeight: "700" },
  responseOptionTextSelected: { color: "#12698E" },
  customRow: { flexDirection: "row", gap: 9, marginTop: 10 },
  customInput: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#C8DCE7",
    backgroundColor: "#FFFFFF",
  },
  saveButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: "#2187B5",
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  errorText: { marginTop: 7, color: "#C53C3C", fontSize: 11 },
  diagnosticText: {
    marginTop: 9,
    color: "#5B6C75",
    fontSize: 10,
    fontFamily: "monospace",
  },
  debugButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#E8EEF2",
  },
  debugButtonActive: { backgroundColor: "#FFE8B8" },
  debugButtonText: { color: "#4E6572", fontSize: 10, fontWeight: "800" },
  settingRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  settingLabel: { flex: 1, color: "#304E5E", fontSize: 15, fontWeight: "700" },
  settingValueGroup: {
    maxWidth: "58%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  settingValue: {
    flexShrink: 1,
    color: "#617987",
    fontSize: 13,
    textAlign: "right",
  },
  rowDivider: { height: 1, backgroundColor: "#E3EDF2" },
  speakerSetupButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: "#E1F2FA",
  },
  speakerSetupButtonText: { color: "#176B90", fontSize: 13, fontWeight: "800" },
  sensitivitySection: { marginTop: 14 },
  sensitivityOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  sensitivityOption: {
    flexGrow: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#C8DCE7",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  sensitivityOptionSelected: { borderColor: "#2187B5", backgroundColor: "#E1F2FA" },
  sensitivityOptionText: { color: "#526B79", fontSize: 12, fontWeight: "700" },
  sensitivityOptionTextSelected: { color: "#176B90" },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  privacyNoteText: { flex: 1, color: "#557582", fontSize: 12, lineHeight: 17 },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(17, 40, 52, 0.48)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  detailModalCard: { maxHeight: "86%" },
  detailModalTitle: {
    color: "#243F4E",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  detailSummary: {
    marginTop: 7,
    marginBottom: 8,
    color: "#617987",
    fontSize: 13,
    textAlign: "center",
  },
  controlDetailRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  controlDetailCopy: { flex: 1, paddingRight: 6 },
  detailDoneButton: { marginTop: 16 },
  profileField: { paddingVertical: 14 },
  profileLabel: { color: "#617987", fontSize: 12, fontWeight: "700" },
  profileValue: { marginTop: 4, color: "#243F4E", fontSize: 16, fontWeight: "700" },
  profileLogoutButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: "#E7F1F6",
  },
  profileLogoutButtonText: { color: "#405F6F", fontSize: 13, fontWeight: "800" },
  privacyHeading: {
    marginTop: 14,
    color: "#304E5E",
    fontSize: 15,
    fontWeight: "800",
  },
  privacyBody: { marginTop: 5, color: "#617987", fontSize: 13, lineHeight: 19 },
  destructiveButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: "#FDE8E8",
  },
  destructiveButtonText: { color: "#B63737", fontSize: 13, fontWeight: "800" },
  debugClearButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: "#FFF1D8",
  },
  debugClearButtonText: { color: "#875816", fontSize: 13, fontWeight: "800" },
  modalIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 16,
    backgroundColor: "#E5F5FC",
  },
  modalTitle: {
    marginTop: 14,
    color: "#243F4E",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  modalMessage: {
    marginTop: 10,
    color: "#5B7380",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  modalSecondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#EDF2F5",
  },
  modalSecondaryButtonText: { color: "#4F6875", fontSize: 14, fontWeight: "800" },
  modalPrimaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#2187B5",
  },
  modalActionButton: { flex: 1 },
  modalPrimaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sampleProgress: {
    marginTop: 18,
    color: "#176B90",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  recordingState: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F1F8FB",
  },
  recordingStateText: { color: "#405F6F", fontSize: 14, fontWeight: "700" },
  recordButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#2187B5",
  },
  sampleActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  disabledButton: { opacity: 0.55 },
  enrollmentCancelButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  enrollmentCancelButtonText: { color: "#647B87", fontSize: 13, fontWeight: "700" },
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  cancelAllAnniversaryNotifications,
  cancelAllBirthdayNotifications,
  cancelAllCustomNotifications,
  cancelAllMedicineNotifications,
  cancelAnniversaryNotification,
  cancelBirthdayNotification,
  cancelCustomNotification,
  getAnniversaryNotificationIdentifier,
  getBirthdayNotificationIdentifier,
  getCustomNotificationIdentifier,
  scheduleAnniversaryNotification,
  scheduleBirthdayNotification,
  scheduleCustomNotification,
} from "../../services/notificationService";
import {
  scheduleWaterReminders,
} from "../../services/reminderService";
import {
  CATEGORY_ENABLED_KEYS,
  getMasterReminderModeEnabled,
  setReminderCategoryEnabled,
  type ReminderCategory,
} from "../../services/reminderCategoryService";
import {
  reconcileReminderCategory,
  reconcileSavedReminderCategories,
  loadReminderControlState,
  setMasterReminderControlEnabled,
} from "../../services/reminderControlService";
import { useLocalization } from "../../localization";
import { CompactTimePicker } from "../../components/compact-time-picker";
import {
  scheduleDatedReminderNotifications,
  scheduleMedicineNotifications,
  type DatedReminder,
  type DatedReminderIdentifier,
  type DatedReminderScheduler,
  type HealthReminder,
} from "../../services/savedReminderService";
import {
  getLocalDateKey,
  getValidDurationDays,
  parseLocalDateKey,
} from "../../services/reminderDurationService";

const REMINDER_SETTINGS_KEY =
  "hydromate-reminder-settings";
const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
const BIRTHDAY_REMINDERS_KEY = "hydromate-birthday-reminders";
const ANNIVERSARY_REMINDERS_KEY = "hydromate-anniversary-reminders";
const CUSTOM_REMINDERS_KEY = "hydromate-custom-reminders";
const WATER_ENABLED_KEY = CATEGORY_ENABLED_KEYS.water;

const MEDICINE_TYPE_OPTIONS = [
  { value: "tablet", icon: "💊", labelKey: "reminders.tablet" },
  { value: "cream", icon: "🧴", labelKey: "reminders.cream" },
  { value: "drops", icon: "💧", labelKey: "reminders.drops" },
  { value: "injection", icon: "💉", labelKey: "reminders.injection" },
  { value: "other", icon: "🩹", labelKey: "reminders.other" },
] as const;

type DurationChoice = 1 | 3 | 5 | 7 | "custom" | "ongoing" | "legacy";

const FINITE_DURATION_CHOICES = [1, 3, 5, 7] as const;

type DurationSelectorProps = {
  label: string;
  choice: DurationChoice;
  includeOngoing?: boolean;
  customLabel: string;
  ongoingLabel: string;
  dayLabel: (days: number) => string;
  onChange: (choice: DurationChoice) => void;
};

function DurationSelector({
  label,
  choice,
  includeOngoing = false,
  customLabel,
  ongoingLabel,
  dayLabel,
  onChange,
}: DurationSelectorProps) {
  const options: { value: DurationChoice; label: string }[] = [
    ...FINITE_DURATION_CHOICES.map((days) => ({
      value: days,
      label: dayLabel(days),
    })),
    { value: "custom", label: customLabel },
    ...(includeOngoing
      ? [{ value: "ongoing" as const, label: ongoingLabel }]
      : []),
  ];

  return (
    <View style={styles.durationSection}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.durationOptions}>
        {options.map((option) => {
          const selected = choice === option.value;
          return (
            <TouchableOpacity
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.durationOption,
                selected && styles.durationOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.durationOptionText,
                  selected && styles.durationOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function getDurationChoice(durationDays?: number): DurationChoice {
  if (durationDays === 1 || durationDays === 3 || durationDays === 5 || durationDays === 7) {
    return durationDays;
  }
  return getValidDurationDays(durationDays) ? "custom" : "ongoing";
}

function resolveDurationDays(
  choice: DurationChoice,
  customValue: string
) {
  if (choice === "ongoing" || choice === "legacy") {
    return undefined;
  }

  return choice === "custom"
    ? getValidDurationDays(Number(customValue)) ?? null
    : choice;
}

function getNextStartDateKey(day: number, month: number, now = new Date()) {
  let year = now.getFullYear();
  let date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    year += 1;
    date = new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  return getLocalDateKey(date);
}

const removeLeadingMedicineTypeIcon = (label: string, icon: string) =>
  label.startsWith(icon) ? label.slice(icon.length).trimStart() : label;

type CategoryReminderSwitchProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function CategoryReminderSwitch({
  label,
  value,
  onValueChange,
}: CategoryReminderSwitchProps) {
  return (
    <View style={styles.categorySwitchRow}>
      <Text style={styles.categorySwitchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const getDatedReminderTime = (reminder: DatedReminder) => {
  const [hour, minute] = reminder.time.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
};

const cancelRemovedDatedReminderNotification = async (
  removedReminder: DatedReminder,
  remainingReminders: DatedReminder[],
  reminderModeEnabled: boolean,
  cancel: DatedReminderScheduler,
  getIdentifier: DatedReminderIdentifier,
  schedule: DatedReminderScheduler
) => {
  const removedTime = getDatedReminderTime(removedReminder);

  if (!removedTime) {
    return;
  }

  await cancel(
    removedReminder.name,
    removedReminder.month,
    removedReminder.day,
    removedTime.hour,
    removedTime.minute
  );

  if (!reminderModeEnabled) {
    return;
  }

  const removedIdentifier = getIdentifier(
    removedReminder.name,
    removedReminder.month,
    removedReminder.day,
    removedTime.hour,
    removedTime.minute
  );
  const matchingReminder = remainingReminders.find((reminder) => {
    const time = getDatedReminderTime(reminder);

    return (
      time !== null &&
      getIdentifier(
        reminder.name,
        reminder.month,
        reminder.day,
        time.hour,
        time.minute
      ) === removedIdentifier
    );
  });

  if (!matchingReminder) {
    return;
  }

  const matchingTime = getDatedReminderTime(matchingReminder);

  if (matchingTime) {
    await schedule(
      matchingReminder.name,
      matchingReminder.month,
      matchingReminder.day,
      matchingTime.hour,
      matchingTime.minute,
      matchingReminder.durationDays,
      matchingReminder.startDate
    );
  }
};

export default function RemindersScreen() {
  const { t } = useLocalization();
  const [dailyGoal, setDailyGoal] = useState("4000");
  const [amount, setAmount] = useState("250");
  const [interval, setInterval] = useState("60");
  const [reminderCategory, setReminderCategory] = useState("water");
const [newMedicineName, setNewMedicineName] = useState("");
const [customReminderName, setCustomReminderName] = useState("");
const [customReminderDay, setCustomReminderDay] = useState("");
const [customReminderMonth, setCustomReminderMonth] = useState("");
const [customReminderTime, setCustomReminderTime] = useState("09:00");
const [routineDurationChoice, setRoutineDurationChoice] =
  useState<DurationChoice>(1);
const [routineCustomDurationDays, setRoutineCustomDurationDays] = useState("");
const [routineStartDate, setRoutineStartDate] = useState<string>();
const [showCustomReminderTimePicker, setShowCustomReminderTimePicker] =
  useState(false);
const [customRemindersLoaded, setCustomRemindersLoaded] = useState(false);
const [customReminders, setCustomReminders] = useState<DatedReminder[]>([]);
const [anniversaryName, setAnniversaryName] = useState("");
const [anniversaryDay, setAnniversaryDay] = useState("");
const [anniversaryReminders, setAnniversaryReminders] =
  useState<DatedReminder[]>([]);
const [anniversaryRemindersLoaded, setAnniversaryRemindersLoaded] =
  useState(false);
const [anniversaryMonth, setAnniversaryMonth] = useState("");
const [anniversaryTime, setAnniversaryTime] = useState("09:00");
const [showAnniversaryTimePicker, setShowAnniversaryTimePicker] =
  useState(false);
const [birthdayName, setBirthdayName] = useState("");
const [birthdayTime, setBirthdayTime] = useState("09:00");
const [showBirthdayTimePicker, setShowBirthdayTimePicker] = useState(false);
const [birthdayDay, setBirthdayDay] = useState("");
const [birthdayMonth, setBirthdayMonth] = useState("");
const [birthdayReminders, setBirthdayReminders] =
  useState<DatedReminder[]>([]);
const [birthdayRemindersLoaded, setBirthdayRemindersLoaded] = useState(false);
const [reminderModeEnabled, setReminderModeEnabled] = useState(true);
const [medicineRemindersEnabled, setMedicineRemindersEnabled] = useState(true);
const [birthdayRemindersEnabled, setBirthdayRemindersEnabled] = useState(true);
const [anniversaryRemindersEnabled, setAnniversaryRemindersEnabled] =
  useState(true);
const [customRemindersEnabled, setCustomRemindersEnabled] = useState(true);
const [healthReminderType, setHealthReminderType] = useState("tablet");
const [newMedicineTimes, setNewMedicineTimes] = useState<string[]>([]);
const [newMedicineTime, setNewMedicineTime] = useState("09:00");
const [medicineDurationChoice, setMedicineDurationChoice] =
  useState<DurationChoice>("ongoing");
const [medicineCustomDurationDays, setMedicineCustomDurationDays] = useState("");
const [medicineStartDate, setMedicineStartDate] = useState<string>();
const [showMedicineTimePicker, setShowMedicineTimePicker] = useState(false);
const [healthReminders, setHealthReminders] = useState<HealthReminder[]>([]);
const [editingMedicineIndex, setEditingMedicineIndex] = useState<number | null>(null);
const [editingMedicineTimeIndex, setEditingMedicineTimeIndex] = useState<number | null>(null);
const [editingBirthdayIndex, setEditingBirthdayIndex] = useState<number | null>(null);
const [editingAnniversaryIndex, setEditingAnniversaryIndex] = useState<number | null>(null);
const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(null);
useEffect(() => {
  const loadReminderModeState = async () => {
    try {
      setReminderModeEnabled(await getMasterReminderModeEnabled());
    } catch (error) {
      console.log("Error loading reminder mode state:", error);
    }
  };

  loadReminderModeState();
}, []);
const [healthRemindersLoaded, setHealthRemindersLoaded] = useState(false);
useEffect(() => {
  const loadHealthReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem(HEALTH_REMINDERS_KEY);
      const parsedReminders: HealthReminder[] = saved
        ? JSON.parse(saved)
        : [];

      setHealthReminders(parsedReminders);

    } catch (error) {
      console.log("Failed to load health reminders:", error);
    } finally {
      setHealthRemindersLoaded(true);
    }
  };

  loadHealthReminders();
}, []);
useEffect(() => {
  const loadBirthdayReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem(BIRTHDAY_REMINDERS_KEY);

      if (saved) {
        setBirthdayReminders(JSON.parse(saved));
      }
    } catch (error) {
      console.log("Failed to load birthday reminders:", error);
    } finally {
      setBirthdayRemindersLoaded(true);
    }
  };

  loadBirthdayReminders();
}, []);
useEffect(() => {
  const loadAnniversaryReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem(
        ANNIVERSARY_REMINDERS_KEY
      );

      if (saved) {
        setAnniversaryReminders(JSON.parse(saved));
      }
    } catch (error) {
      console.log(
        "Failed to load anniversary reminders:",
        error
      );
    } finally {
      setAnniversaryRemindersLoaded(true);
    }
  };

  loadAnniversaryReminders();
}, []);
useEffect(() => {
  const loadCustomReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem(CUSTOM_REMINDERS_KEY);

      if (saved) {
        setCustomReminders(JSON.parse(saved));
      }
    } catch (error) {
      console.log("Failed to load custom reminders:", error);
    } finally {
      setCustomRemindersLoaded(true);
    }
  };

  loadCustomReminders();
}, []);
useEffect(() => {
  if (!customRemindersLoaded) return;

  const saveCustomReminders = async () => {
    try {
      await AsyncStorage.setItem(
        CUSTOM_REMINDERS_KEY,
        JSON.stringify(customReminders)
      );
    } catch (error) {
      console.log("Failed to save custom reminders:", error);
    }
  };

  saveCustomReminders();
}, [customReminders, customRemindersLoaded]);
useEffect(() => {
  if (!anniversaryRemindersLoaded) return;

  const saveAnniversaryReminders = async () => {
    try {
      await AsyncStorage.setItem(
        ANNIVERSARY_REMINDERS_KEY,
        JSON.stringify(anniversaryReminders)
      );
    } catch (error) {
      console.log("Failed to save anniversary reminders:", error);
    }
  };

  saveAnniversaryReminders();
}, [anniversaryReminders, anniversaryRemindersLoaded]);

useEffect(() => {
  if (!birthdayRemindersLoaded) return;

  const saveBirthdayReminders = async () => {
    try {
      await AsyncStorage.setItem(
        BIRTHDAY_REMINDERS_KEY,
        JSON.stringify(birthdayReminders)
      );
    } catch (error) {
      console.log("Failed to save birthday reminders:", error);
    }
  };

  saveBirthdayReminders();
}, [birthdayReminders, birthdayRemindersLoaded]);
useEffect(() => {
  if (!healthRemindersLoaded) return;

  const saveHealthReminders = async () => {
    try {
      await AsyncStorage.setItem(
        HEALTH_REMINDERS_KEY,
        JSON.stringify(healthReminders)
      );
    } catch (error) {
      console.log("Failed to save health reminders:", error);
    }
  };

  saveHealthReminders();
}, [healthReminders, healthRemindersLoaded]);
  const [startHour, setStartHour] = useState("9");
  const [startMinute, setStartMinute] = useState("0");
  const [endHour, setEndHour] = useState("21");
  const [endMinute, setEndMinute] = useState("0");
  const [showStartPicker, setShowStartPicker] = useState(false);
const [showEndPicker, setShowEndPicker] = useState(false);
  
const [reminderMode, setReminderMode] =
  useState<"smart" | "fixed">("smart");
const [remindersEnabled, setRemindersEnabled] = useState(true);
useFocusEffect(
  useCallback(() => {
    let active = true;
    void loadReminderControlState().then(({ masterEnabled, categories }) => {
      if (!active) return;
      setReminderModeEnabled(masterEnabled);
      setRemindersEnabled(categories.water);
      setMedicineRemindersEnabled(categories.medicine);
      setBirthdayRemindersEnabled(categories.birthday);
      setAnniversaryRemindersEnabled(categories.anniversary);
      setCustomRemindersEnabled(categories.custom);
    });
    return () => {
      active = false;
    };
  }, [])
);
useEffect(() => {
  const reconcileSavedReminders = async () => {
    try {
      const masterEnabled = await getMasterReminderModeEnabled();
      const categoryStates = await reconcileSavedReminderCategories(
        masterEnabled
      );

      setReminderModeEnabled(masterEnabled);
      setRemindersEnabled(categoryStates.water);
      setMedicineRemindersEnabled(categoryStates.medicine);
      setBirthdayRemindersEnabled(categoryStates.birthday);
      setAnniversaryRemindersEnabled(categoryStates.anniversary);
      setCustomRemindersEnabled(categoryStates.custom);
    } catch (error) {
      console.log("Could not reconcile saved reminder categories:", error);
    }
  };

  void reconcileSavedReminders();
}, []);
  const getStartMinutes = () =>
    Number(startHour) * 60 + Number(startMinute);
  const getEndMinutes = () =>
    Number(endHour) * 60 + Number(endMinute);

const formatHealthTime = (time: string) => {
  if (!time) {
    return t("reminders.noTime");
  }

  const cleanTime = time.trim().toLowerCase();

  const match = cleanTime.match(
    /^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/
  );

  if (!match) {
    return t("reminders.invalidTime");
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const typedPeriod = match[3];

  if (minute < 0 || minute > 59) {
    return t("reminders.invalidTime");
  }

  if (typedPeriod) {
    if (hour < 1 || hour > 12) {
      return t("reminders.invalidTime");
    }

    if (typedPeriod === "pm" && hour !== 12) {
      hour += 12;
    }

    if (typedPeriod === "am" && hour === 12) {
      hour = 0;
    }
  } else {
    if (hour < 0 || hour > 23) {
      return t("reminders.invalidTime");
    }
  }

  const period = hour >= 12 ? t("common.pm") : t("common.am");
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute
    .toString()
    .padStart(2, "0")} ${period}`;
};
const formatMinutesOfDay = (totalMinutes: number) => {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  const displayHour =
    hour === 0
      ? 12
      : hour > 12
      ? hour - 12
      : hour;

  const amPm = hour < 12 ? t("common.am") : t("common.pm");

  return `${displayHour}:${String(minute).padStart(2, "0")} ${amPm}`;
};
const getNextFixedReminderMinutes = () => {
  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const start = getStartMinutes();
  const end = getEndMinutes();
  const step = Number(interval);

  if (step <= 0 || end < start) {
    return null;
  }

  for (
    let minutes = start;
    minutes <= end;
    minutes += step
  ) {
    if (minutes > currentMinutes) {
      return minutes;
    }
  }

  return null;
};

const getFixedScheduleTimes = () => {
  const start = getStartMinutes();
  const end = getEndMinutes();
  const step = Number(interval);

  if (step <= 0 || end < start) {
    return [];
  }

  const times: string[] = [];

  for (
    let minutes = start;
    minutes <= end;
    minutes += step
  ) {
    times.push(formatMinutesOfDay(minutes));
  }

  return times;
};
const getRemainingFixedReminders = () => {
  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const start = getStartMinutes();
  const end = getEndMinutes();
  const step = Number(interval);

  if (step <= 0 || end < start) {
    return 0;
  }

  let remaining = 0;

  for (
    let minutes = start;
    minutes <= end;
    minutes += step
  ) {
    if (minutes > currentMinutes) {
      remaining++;
    }
  }

  return remaining;
};
 const getNextSmartReminderMinutes = () => {
  const scheduleMinutes =
    getSmartScheduleMinutes();

  if (scheduleMinutes.length === 0) {
    return null;
  }

  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  for (const reminderMinutes of scheduleMinutes) {
    if (reminderMinutes > currentMinutes) {
      return reminderMinutes;
    }
  }

  return null;
};
const getSmartScheduleMinutes = () => {
  const goal = Number(dailyGoal);
  const perReminder = Number(amount);
  const start = getStartMinutes();
  const end = getEndMinutes();

  if (
    goal <= 0 ||
    perReminder <= 0 ||
    end <= start
  ) {
    return [];
  }

  const totalReminders = Math.ceil(
    goal / perReminder
  );

  const startMinutes = start;
  const endMinutes = end;

  const intervalMinutes =
    totalReminders === 1
      ? 0
      : (endMinutes - startMinutes) /
        (totalReminders - 1);

  const times: number[] = [];

  for (
    let i = 0;
    i < totalReminders;
    i++
  ) {
    times.push(
      Math.round(
        startMinutes +
          i * intervalMinutes
      )
    );
  }

  return times;
};
const getSmartScheduleTimes = () => {
  const goal = Number(dailyGoal);
  const perReminder = Number(amount);
  const start = getStartMinutes();
  const end = getEndMinutes();

  if (
    goal <= 0 ||
    perReminder <= 0 ||
    end <= start
  ) {
    return [];
  }

  const totalReminders = Math.ceil(
    goal / perReminder
  );

  const startMinutes = start;
  const endMinutes = end;

  const intervalMinutes =
    totalReminders === 1
      ? 0
      : (endMinutes - startMinutes) /
        (totalReminders - 1);

  const times: string[] = [];

  for (
    let i = 0;
    i < totalReminders;
    i++
  ) {
    const reminderMinutes = Math.round(
      startMinutes + i * intervalMinutes
    );

    times.push(
      formatMinutesOfDay(reminderMinutes)
    );
  }

  return times;
};
useEffect(() => {
  loadSavedSettings();
}, []);
const loadSavedSettings = async () => {
  try {
    const savedSettings =
      await AsyncStorage.getItem(
        REMINDER_SETTINGS_KEY
      );

    if (!savedSettings) {
      return;
    }

    const settings = JSON.parse(
      savedSettings
    );

    setDailyGoal(
      String(settings.dailyGoal)
    );

    setAmount(
      String(settings.amount)
    );

    setInterval(
      String(settings.interval)
    );

    setStartHour(
      String(settings.startHour)
    );

    setStartMinute(
      String(settings.startMinute ?? 0)
    );

    setEndHour(
      String(settings.endHour)
    );

    setEndMinute(
      String(settings.endMinute ?? 0)
    );
    if (settings.mode === "smart" || settings.mode === "fixed") {
  setReminderMode(settings.mode);
}
const enabledValue = await AsyncStorage.getItem(
  WATER_ENABLED_KEY
);

if (enabledValue !== null) {
  setRemindersEnabled(enabledValue !== "false");
}
  } catch (error) {
    console.log(
      "Could not load reminder settings:",
      error
    );
   
  }
};
const isFormValid =
  Number(dailyGoal) > 0 &&
  Number(amount) > 0 &&
  Number.isInteger(Number(startHour)) &&
  Number.isInteger(Number(startMinute)) &&
  Number.isInteger(Number(endHour)) &&
  Number.isInteger(Number(endMinute)) &&
  Number(startHour) >= 0 &&
  Number(startHour) <= 23 &&
  Number(startMinute) >= 0 &&
  Number(startMinute) <= 59 &&
  Number(endHour) >= 0 &&
  Number(endHour) <= 23 &&
  Number(endMinute) >= 0 &&
  Number(endMinute) <= 59 &&
  getEndMinutes() > getStartMinutes() &&
  (
    reminderMode === "smart" ||
    Number(interval) > 0
  );
  const saveWaterSettings = async () => {
  try {
    if (getEndMinutes() <= getStartMinutes()) {
  Alert.alert(
    t("reminders.invalidTimeTitle"),
    t("reminders.endAfterStart")
  );
  return;
}
if (
  Number(dailyGoal) <= 0 ||
  Number(amount) <= 0
) {
  Alert.alert(
    t("reminders.invalidAmountTitle"),
    t("reminders.invalidAmount")
  );
  return;
}
if (
  reminderMode === "fixed" &&
  Number(interval) <= 0
) {
  Alert.alert(
    t("reminders.invalidIntervalTitle"),
    t("reminders.invalidInterval")
  );
  return;
}
    const settings = {
      dailyGoal: Number(dailyGoal),
      amount: Number(amount),
      interval: Number(interval),
      startHour: Number(startHour),
      startMinute: Number(startMinute),
      endHour: Number(endHour),
      endMinute: Number(endMinute),
      mode: reminderMode,
    };

    await AsyncStorage.setItem(
      REMINDER_SETTINGS_KEY,
      JSON.stringify(settings)
    );
    if (!reminderModeEnabled || !remindersEnabled) {
      Alert.alert("💧 HydroMate", t("reminders.waterSettingsSaved"));
      return;
    }

    const schedulerSettings = {
      dailyGoal: settings.dailyGoal,
      amountPerReminder: settings.amount,
      intervalHours: settings.interval,
      startHour: settings.startHour,
      startMinute: settings.startMinute,
      endHour: settings.endHour,
      endMinute: settings.endMinute,
      mode: settings.mode,
    };

    const result = await scheduleWaterReminders(schedulerSettings);

    Alert.alert(
      "💧 HydroMate",
      t("reminders.scheduled", {
        count: result.scheduledCount,
        amount: result.scheduledAmount,
      })
    );
  } catch (error) {
    Alert.alert(
      t("reminders.somethingWrong"),
      t("reminders.scheduleFailed")
    );

    console.error("WATER SCHEDULING ERROR:", error);
  }
};
const updateCategoryEnabledState = (
  category: ReminderCategory,
  enabled: boolean
) => {
  if (category === "water") {
    setRemindersEnabled(enabled);
  } else if (category === "medicine") {
    setMedicineRemindersEnabled(enabled);
  } else if (category === "birthday") {
    setBirthdayRemindersEnabled(enabled);
  } else if (category === "anniversary") {
    setAnniversaryRemindersEnabled(enabled);
  } else {
    setCustomRemindersEnabled(enabled);
  }
};

const toggleCategoryReminders = async (
  category: ReminderCategory,
  enabled: boolean
) => {
  updateCategoryEnabledState(category, enabled);
  await setReminderCategoryEnabled(category, enabled);
  await reconcileReminderCategory(category, enabled, reminderModeEnabled, {
    medicine: healthReminders,
    birthday: birthdayReminders,
    anniversary: anniversaryReminders,
    custom: customReminders,
  });
};

const resetMedicineForm = () => {
  setNewMedicineName("");
  setHealthReminderType("tablet");
  setNewMedicineTime("09:00");
  setNewMedicineTimes([]);
  setMedicineDurationChoice("ongoing");
  setMedicineCustomDurationDays("");
  setMedicineStartDate(undefined);
  setEditingMedicineIndex(null);
  setEditingMedicineTimeIndex(null);
  setShowMedicineTimePicker(false);
};

const resetBirthdayForm = () => {
  setBirthdayName("");
  setBirthdayDay("");
  setBirthdayMonth("");
  setBirthdayTime("09:00");
  setEditingBirthdayIndex(null);
  setShowBirthdayTimePicker(false);
};

const resetAnniversaryForm = () => {
  setAnniversaryName("");
  setAnniversaryDay("");
  setAnniversaryMonth("");
  setAnniversaryTime("09:00");
  setEditingAnniversaryIndex(null);
  setShowAnniversaryTimePicker(false);
};

const resetCustomForm = () => {
  setCustomReminderName("");
  setCustomReminderDay("");
  setCustomReminderMonth("");
  setCustomReminderTime("09:00");
  setRoutineDurationChoice(1);
  setRoutineCustomDurationDays("");
  setRoutineStartDate(undefined);
  setEditingCustomIndex(null);
  setShowCustomReminderTimePicker(false);
};

const saveDatedReminderList = async (
  reminders: DatedReminder[],
  storageKey: string,
  enabled: boolean,
  cancelAll: () => Promise<void>,
  getIdentifier: DatedReminderIdentifier,
  schedule: DatedReminderScheduler
) => {
  await cancelAll();
  await AsyncStorage.setItem(storageKey, JSON.stringify(reminders));

  if (reminderModeEnabled && enabled) {
    await scheduleDatedReminderNotifications(
      reminders,
      getIdentifier,
      schedule
    );
  }
};

const renderEditingControls = (onCancel: () => void) => (
  <View style={styles.editingBanner}>
    <Text style={styles.editingBannerText}>
      {t("reminders.editingExisting")}
    </Text>
    <TouchableOpacity style={styles.cancelEditButton} onPress={onCancel}>
      <Text style={styles.cancelEditText}>{t("common.cancelEdit")}</Text>
    </TouchableOpacity>
  </View>
);
  return (
  <SafeAreaView style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>

        <Text style={styles.title}>
          {t("reminders.title")}
        </Text>

        <Text style={styles.subtitle}>
          {t("reminders.subtitle")}
        </Text>

        <View style={styles.masterReminderRow}>
          <View style={styles.masterReminderText}>
            <Text style={styles.label}>{t("reminders.masterTitle")}</Text>
            <Text style={styles.masterReminderSubtitle}>
              {t("reminders.masterControlsAll")}
            </Text>
            <Text style={styles.masterReminderState}>
              {t(reminderModeEnabled ? "reminders.on" : "reminders.off")}
            </Text>
          </View>
          <Switch
            value={reminderModeEnabled}
            onValueChange={async (value) => {
              setReminderModeEnabled(value);
              const categoryStates = await setMasterReminderControlEnabled(value);
              setRemindersEnabled(categoryStates.water);
              setMedicineRemindersEnabled(categoryStates.medicine);
              setBirthdayRemindersEnabled(categoryStates.birthday);
              setAnniversaryRemindersEnabled(categoryStates.anniversary);
              setCustomRemindersEnabled(categoryStates.custom);
              alert(t(value ? "reminders.savedOn" : "reminders.allOff"));
            }}
          />
        </View>

        <Text style={styles.label}>
  {t("reminders.type")}
</Text>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  }}
>
  <TouchableOpacity
  onPress={() => setReminderCategory("water")}
  style={[
    styles.reminderTypeButton,
    reminderCategory === "water" && styles.reminderTypeButtonActive,
  ]}
>
  <Text style={styles.reminderTypeIcon}>💧</Text>
  <Text style={styles.reminderTypeLabel}>{t("reminders.water")}</Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => setReminderCategory("medicine")}
  style={[
    styles.reminderTypeButton,
    reminderCategory === "medicine" && styles.reminderTypeButtonActive,
  ]}
>
  <Text style={styles.reminderTypeIcon}>💊</Text>
  <Text style={styles.reminderTypeLabel}>{t("reminders.medicine")}</Text>
</TouchableOpacity>

  <TouchableOpacity
    onPress={() => setReminderCategory("birthday")}
    style={[
      styles.reminderTypeButton,
      reminderCategory === "birthday" && styles.reminderTypeButtonActive,
    ]}
  >
    <Text style={styles.reminderTypeIcon}>🎂</Text>
    <Text style={styles.reminderTypeLabel}>{t("reminders.birthday")}</Text>
  </TouchableOpacity>

  <TouchableOpacity
  onPress={() => setReminderCategory("anniversary")}
  style={[
    styles.reminderTypeButton,
    reminderCategory === "anniversary" && styles.reminderTypeButtonActive,
  ]}
>
  <Text style={styles.reminderTypeIcon}>💍</Text>
  <Text style={styles.reminderTypeLabel}>{t("reminders.anniversary")}</Text>
  </TouchableOpacity>
<TouchableOpacity
  onPress={() => setReminderCategory("custom")}
  style={[
    styles.reminderTypeButton,
    reminderCategory === "custom" && styles.reminderTypeButtonActive,
  ]}
>
  <Text style={styles.reminderTypeIcon}>📝</Text>
  <Text style={styles.reminderTypeLabel}>{t("reminders.routine")}</Text>
</TouchableOpacity>
</View>
{reminderCategory === "birthday" ? (

  <View
    style={{
      marginTop: 20,
      marginBottom: 20,
    }}
  >
    <CategoryReminderSwitch
      label={t("reminders.enableBirthdayReminders")}
      value={birthdayRemindersEnabled}
      onValueChange={(value) => {
        void toggleCategoryReminders("birthday", value);
      }}
    />
    {editingBirthdayIndex !== null
      ? renderEditingControls(resetBirthdayForm)
      : null}
    <Text style={styles.label}>{t("reminders.birthdayName")}</Text>

    <TextInput
      style={styles.input}
      value={birthdayName}
      onChangeText={setBirthdayName}
      placeholder={t("reminders.birthdayExample")}
    />

    <Text style={[styles.label, { marginTop: 16 }]}>
      {t("reminders.birthdayDate")}
    </Text>

    <View
  style={{
    flexDirection: "row",
    gap: 12,
  }}
>
  <TextInput
    style={[styles.input, { flex: 1 }]}
    value={birthdayDay}
    onChangeText={setBirthdayDay}
    placeholder="DD"
    keyboardType="numeric"
    maxLength={2}
  />

  <TextInput
    style={[styles.input, { flex: 1 }]}
    value={birthdayMonth}
    onChangeText={setBirthdayMonth}
    placeholder="MM"
    keyboardType="numeric"
    maxLength={2}
  />

</View>

    <Text style={[styles.label, { marginTop: 16 }]}>
      {t("reminders.reminderTime")}
    </Text>

    <TouchableOpacity
      style={styles.addTimeButton}
      onPress={() => setShowBirthdayTimePicker(true)}
    >
      <Text style={styles.addTimeButtonText}>
        + {t("reminders.addTime")}
      </Text>
    </TouchableOpacity>
    {birthdayTime ? (
      <View style={styles.selectedTimesList}>
        <View style={styles.selectedTimeRow}>
          <View style={styles.selectedTimeContent}>
            <Text style={styles.selectedTimeIcon}>⏰</Text>
            <Text style={styles.selectedTimeText}>
              {formatHealthTime(birthdayTime)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectedTimeRemoveButton}
            onPress={() => setBirthdayTime("")}
          >
            <Text style={styles.selectedTimeRemoveText}>
              {t("common.remove")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null}
    <CompactTimePicker
      visible={showBirthdayTimePicker}
      value={birthdayTime}
      onCancel={() => setShowBirthdayTimePicker(false)}
      onDone={(time) => {
        setBirthdayTime(time);
        setShowBirthdayTimePicker(false);
      }}
    />

    <TouchableOpacity
      onPress={async () => {
        if (!birthdayName.trim()) {
          alert(t("reminders.enterBirthdayName"));
          return;
        }

        const day = Number(birthdayDay);
const month = Number(birthdayMonth);
        const [hour, minute] = birthdayTime.split(":").map(Number);

        if (
          !day ||
          !month ||
          day < 1 ||
          day > 31 ||
          month < 1 ||
          month > 12
        ) {
          alert(t("reminders.enterBirthdayDate"));
          return;
        }

        if (
          !birthdayTime ||
          !Number.isInteger(hour) ||
          !Number.isInteger(minute) ||
          hour < 0 ||
          hour > 23 ||
          minute < 0 ||
          minute > 59
        ) {
          alert(t("reminders.enterTime"));
          return;
        }

        const reminder = {
          name: birthdayName.trim(),
          day,
          month,
          time: birthdayTime,
        };
        const updatedReminders = editingBirthdayIndex === null
          ? [...birthdayReminders, reminder]
          : birthdayReminders.map((item, index) =>
              index === editingBirthdayIndex ? reminder : item
            );

        await saveDatedReminderList(
          updatedReminders,
          BIRTHDAY_REMINDERS_KEY,
          birthdayRemindersEnabled,
          cancelAllBirthdayNotifications,
          getBirthdayNotificationIdentifier,
          scheduleBirthdayNotification
        );
        setBirthdayReminders(updatedReminders);
        if (editingBirthdayIndex === null) {
          alert(t("reminders.birthdayAdded"));
        }
        resetBirthdayForm();
      }}
      style={{
        alignSelf: "center",
        marginTop: 18,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: "#2196F3",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {t(editingBirthdayIndex === null
          ? "reminders.addBirthday"
          : "reminders.updateBirthday")}
      </Text>
    </TouchableOpacity>

  {birthdayReminders.length > 0 && (
  <View
    style={{
      marginTop: 20,
    }}
  >
    <Text
      style={[
        styles.label,
        { marginBottom: 10 },
      ]}
    >
      {t("reminders.savedBirthdays")}
    </Text>

    {birthdayReminders.map((birthday, index) => (
      <View
        key={`${birthday.name}-${birthday.day}-${birthday.month}-${index}`}
        style={styles.savedReminderCard}
      >
        <Text style={styles.savedCardTitle}>
          🎂 {birthday.name}
        </Text>

        <Text
          style={{
            marginTop: 5,
            fontSize: 15,
          }}
        >
          📅 {String(birthday.day).padStart(2, "0")}/
          {String(birthday.month).padStart(2, "0")}
        </Text>

        <Text
          style={{
            marginTop: 3,
            fontSize: 15,
          }}
        >
          ⏰ {birthday.time}
      </Text>
      <View style={styles.savedCardActions}>
        <TouchableOpacity
          style={styles.editActionButton}
          onPress={() => {
            setEditingBirthdayIndex(index);
            setBirthdayName(birthday.name);
            setBirthdayDay(String(birthday.day));
            setBirthdayMonth(String(birthday.month));
            setBirthdayTime(birthday.time);
          }}
        >
          <Text style={styles.editActionText}>{t("common.edit")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeActionButton}
          onPress={async () => {
            const updatedReminders = birthdayReminders.filter(
              (_, itemIndex) => itemIndex !== index
            );

            await cancelRemovedDatedReminderNotification(
              birthday,
              updatedReminders,
              reminderModeEnabled && birthdayRemindersEnabled,
              cancelBirthdayNotification,
              getBirthdayNotificationIdentifier,
              scheduleBirthdayNotification
            );
            await AsyncStorage.setItem(
              BIRTHDAY_REMINDERS_KEY,
              JSON.stringify(updatedReminders)
            );
            setBirthdayReminders(updatedReminders);
            if (editingBirthdayIndex === index) resetBirthdayForm();
            else if (editingBirthdayIndex !== null && editingBirthdayIndex > index) {
              setEditingBirthdayIndex(editingBirthdayIndex - 1);
            }
          }}
        >
          <Text style={styles.removeActionText}>{t("common.remove")}</Text>
        </TouchableOpacity>
      </View>
      </View>
    ))}
  </View>
)}
  </View>
) : null}
{reminderCategory === "anniversary" ? (
  <View
    style={{
      marginTop: 20,
      marginBottom: 20,
    }}
  >
    <CategoryReminderSwitch
      label={t("reminders.enableAnniversaryReminders")}
      value={anniversaryRemindersEnabled}
      onValueChange={(value) => {
        void toggleCategoryReminders("anniversary", value);
      }}
    />
    {editingAnniversaryIndex !== null
      ? renderEditingControls(resetAnniversaryForm)
      : null}
    <Text style={styles.label}>{t("reminders.anniversaryName")}</Text>

    <TextInput
      style={styles.input}
      value={anniversaryName}
      onChangeText={setAnniversaryName}
      placeholder={t("reminders.anniversaryExample")}
    />

    <Text style={[styles.label, { marginTop: 16 }]}>
      {t("reminders.anniversaryDate")}
    </Text>

    <View
      style={{
        flexDirection: "row",
        gap: 12,
      }}
    >
      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={anniversaryDay}
        onChangeText={setAnniversaryDay}
        placeholder="DD"
        keyboardType="numeric"
        maxLength={2}
      />

      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={anniversaryMonth}
        onChangeText={setAnniversaryMonth}
        placeholder="MM"
        keyboardType="numeric"
        maxLength={2}
      />
    </View>

    <Text style={[styles.label, { marginTop: 16 }]}>
      {t("reminders.reminderTime")}
    </Text>

    <TouchableOpacity
      style={styles.addTimeButton}
      onPress={() => setShowAnniversaryTimePicker(true)}
    >
      <Text style={styles.addTimeButtonText}>
        + {t("reminders.addTime")}
      </Text>
    </TouchableOpacity>
    {anniversaryTime ? (
      <View style={styles.selectedTimesList}>
        <View style={styles.selectedTimeRow}>
          <View style={styles.selectedTimeContent}>
            <Text style={styles.selectedTimeIcon}>⏰</Text>
            <Text style={styles.selectedTimeText}>
              {formatHealthTime(anniversaryTime)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectedTimeRemoveButton}
            onPress={() => setAnniversaryTime("")}
          >
            <Text style={styles.selectedTimeRemoveText}>
              {t("common.remove")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null}
    <CompactTimePicker
      visible={showAnniversaryTimePicker}
      value={anniversaryTime}
      onCancel={() => setShowAnniversaryTimePicker(false)}
      onDone={(time) => {
        setAnniversaryTime(time);
        setShowAnniversaryTimePicker(false);
      }}
    />
    <TouchableOpacity
  onPress={async () => {
    if (!anniversaryName.trim()) {
      alert(t("reminders.enterAnniversaryName"));
      return;
    }

    const day = Number(anniversaryDay);
    const month = Number(anniversaryMonth);

    const [hour, minute] = anniversaryTime
      .split(":")
      .map(Number);

    if (
      !day ||
      !month ||
      day < 1 ||
      day > 31 ||
      month < 1 ||
      month > 12 ||
      new Date(2024, month - 1, day).getMonth() !== month - 1
    ) {
      alert(t("reminders.invalidAnniversaryDate"));
      return;
    }

    if (
      !anniversaryTime ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      alert(t("reminders.enterTime"));
      return;
    }

    const reminder = {
      name: anniversaryName.trim(),
      day,
      month,
      time: anniversaryTime,
    };
    const updatedReminders = editingAnniversaryIndex === null
      ? [...anniversaryReminders, reminder]
      : anniversaryReminders.map((item, index) =>
          index === editingAnniversaryIndex ? reminder : item
        );

    await saveDatedReminderList(
      updatedReminders,
      ANNIVERSARY_REMINDERS_KEY,
      anniversaryRemindersEnabled,
      cancelAllAnniversaryNotifications,
      getAnniversaryNotificationIdentifier,
      scheduleAnniversaryNotification
    );
    setAnniversaryReminders(updatedReminders);
    if (editingAnniversaryIndex === null) {
      alert(t("reminders.anniversaryAdded"));
    }
    resetAnniversaryForm();
  }}
  style={{
    alignSelf: "center",
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <Text
    style={{
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    }}
  >
    {t(editingAnniversaryIndex === null
      ? "reminders.addAnniversary"
      : "reminders.updateAnniversary")}
    </Text>
</TouchableOpacity>
    {anniversaryReminders.length > 0 && (
  <View
    style={{
      marginTop: 20,
    }}
  >
    <Text
      style={[
        styles.label,
        { marginBottom: 10 },
      ]}
    >
      {t("reminders.savedAnniversaries")}
    </Text>

    {anniversaryReminders.map((anniversary, index) => (
      <View
        key={`${anniversary.name}-${anniversary.day}-${anniversary.month}-${index}`}
        style={styles.savedReminderCard}
      >
        <Text style={styles.savedCardTitle}>
          💍 {anniversary.name}
        </Text>

        <Text
          style={{
            marginTop: 5,
            fontSize: 15,
          }}
        >
          📅 {String(anniversary.day).padStart(2, "0")}/
          {String(anniversary.month).padStart(2, "0")}
        </Text>

        <Text
          style={{
            marginTop: 3,
            fontSize: 15,
          }}
        >
          ⏰ {anniversary.time}
        </Text>
        <View style={styles.savedCardActions}>
          <TouchableOpacity
            style={styles.editActionButton}
            onPress={() => {
              setEditingAnniversaryIndex(index);
              setAnniversaryName(anniversary.name);
              setAnniversaryDay(String(anniversary.day));
              setAnniversaryMonth(String(anniversary.month));
              setAnniversaryTime(anniversary.time);
            }}
          >
            <Text style={styles.editActionText}>{t("common.edit")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeActionButton}
            onPress={async () => {
              const updatedReminders = anniversaryReminders.filter(
                (_, itemIndex) => itemIndex !== index
              );

              await cancelRemovedDatedReminderNotification(
                anniversary,
                updatedReminders,
                reminderModeEnabled && anniversaryRemindersEnabled,
                cancelAnniversaryNotification,
                getAnniversaryNotificationIdentifier,
                scheduleAnniversaryNotification
              );
              await AsyncStorage.setItem(
                ANNIVERSARY_REMINDERS_KEY,
                JSON.stringify(updatedReminders)
              );
              setAnniversaryReminders(updatedReminders);
              if (editingAnniversaryIndex === index) resetAnniversaryForm();
              else if (
                editingAnniversaryIndex !== null &&
                editingAnniversaryIndex > index
              ) {
                setEditingAnniversaryIndex(editingAnniversaryIndex - 1);
              }
            }}
          >
            <Text style={styles.removeActionText}>{t("common.remove")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
)}
  </View>
) : null}
{reminderCategory === "custom" ? (
  <View
    style={{
      marginTop: 20,
      marginBottom: 20,
    }}
  >
    <CategoryReminderSwitch
      label={t("reminders.enableRoutineReminders")}
      value={customRemindersEnabled}
      onValueChange={(value) => {
        void toggleCategoryReminders("custom", value);
      }}
    />
    {editingCustomIndex !== null
      ? renderEditingControls(resetCustomForm)
      : null}
    <Text style={styles.label}>{t("reminders.routineName")}</Text>

    <TextInput
      style={styles.input}
      value={customReminderName}
      onChangeText={setCustomReminderName}
      placeholder={t("reminders.routineExample")}
    />

    <Text style={[styles.label, { marginTop: 16 }]}>
      {t("reminders.startDate")}
    </Text>

    <View
      style={{
        flexDirection: "row",
        gap: 12,
      }}
    >
      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={customReminderDay}
        onChangeText={setCustomReminderDay}
        placeholder="DD"
        keyboardType="numeric"
        maxLength={2}
      />

      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={customReminderMonth}
        onChangeText={setCustomReminderMonth}
        placeholder="MM"
        keyboardType="numeric"
        maxLength={2}
      />
    </View>

    <Text style={[styles.label, { marginTop: 16 }]}>
      {t("reminders.reminderTime")}
    </Text>

    <TouchableOpacity
      style={styles.addTimeButton}
      onPress={() => setShowCustomReminderTimePicker(true)}
    >
      <Text style={styles.addTimeButtonText}>
        + {t("reminders.addTime")}
      </Text>
    </TouchableOpacity>
    {customReminderTime ? (
      <View style={styles.selectedTimesList}>
        <View style={styles.selectedTimeRow}>
          <View style={styles.selectedTimeContent}>
            <Text style={styles.selectedTimeIcon}>⏰</Text>
            <Text style={styles.selectedTimeText}>
              {formatHealthTime(customReminderTime)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectedTimeRemoveButton}
            onPress={() => setCustomReminderTime("")}
          >
            <Text style={styles.selectedTimeRemoveText}>
              {t("common.remove")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null}
    <CompactTimePicker
      visible={showCustomReminderTimePicker}
      value={customReminderTime}
      onCancel={() => setShowCustomReminderTimePicker(false)}
      onDone={(time) => {
        setCustomReminderTime(time);
        setShowCustomReminderTimePicker(false);
      }}
    />
    <DurationSelector
      label={t("reminders.duration")}
      choice={routineDurationChoice}
      customLabel={t("reminders.customDuration")}
      ongoingLabel={t("reminders.ongoing")}
      dayLabel={(days) =>
        t(
          days === 1
            ? "reminders.oneDay"
            : days === 3
              ? "reminders.threeDays"
              : days === 5
                ? "reminders.fiveDays"
                : "reminders.sevenDays"
        )
      }
      onChange={(choice) => {
        setRoutineDurationChoice(choice);
        if (choice !== "custom") setRoutineCustomDurationDays("");
      }}
    />
    {routineDurationChoice === "custom" ? (
      <TextInput
        style={styles.input}
        value={routineCustomDurationDays}
        onChangeText={setRoutineCustomDurationDays}
        placeholder={t("reminders.durationDaysPlaceholder")}
        keyboardType="number-pad"
      />
    ) : null}
    {routineDurationChoice === "legacy" ? (
      <Text style={styles.durationHelp}>{t("reminders.legacyRoutineHelp")}</Text>
    ) : null}
    <TouchableOpacity
  onPress={async () => {
    if (!customReminderName.trim()) {
      alert(t("reminders.enterReminderName"));
      return;
    }

    const day = Number(customReminderDay);
    const month = Number(customReminderMonth);

    const [hour, minute] = customReminderTime
      .split(":")
      .map(Number);

    if (
      !day ||
      !month ||
      day < 1 ||
      day > 31 ||
      month < 1 ||
      month > 12 ||
      new Date(2024, month - 1, day).getMonth() !== month - 1
    ) {
      alert(t("reminders.invalidDate"));
      return;
    }

    if (
      !customReminderTime ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      alert(t("reminders.enterTime"));
      return;
    }

    const durationDays = resolveDurationDays(
      routineDurationChoice,
      routineCustomDurationDays
    );

    if (durationDays === null) {
      alert(t("reminders.invalidDuration"));
      return;
    }

    const storedStartDate = parseLocalDateKey(routineStartDate);
    const startDate = durationDays
      ? storedStartDate &&
        storedStartDate.getDate() === day &&
        storedStartDate.getMonth() + 1 === month
        ? routineStartDate
        : getNextStartDateKey(day, month)
      : undefined;
    const reminder: DatedReminder = {
      name: customReminderName.trim(),
      day,
      month,
      time: customReminderTime,
      ...(durationDays ? { durationDays, startDate } : {}),
    };
    const updatedReminders = editingCustomIndex === null
      ? [...customReminders, reminder]
      : customReminders.map((item, index) =>
          index === editingCustomIndex ? reminder : item
        );

    await saveDatedReminderList(
      updatedReminders,
      CUSTOM_REMINDERS_KEY,
      customRemindersEnabled,
      cancelAllCustomNotifications,
      getCustomNotificationIdentifier,
      scheduleCustomNotification
    );
    setCustomReminders(updatedReminders);

    if (editingCustomIndex === null) {
      alert(t("reminders.routineAdded"));
    }
    resetCustomForm();
  }}
  style={{
    alignSelf: "center",
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <Text
    style={{
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    }}
  >
    {t(editingCustomIndex === null
      ? "reminders.addRoutine"
      : "reminders.updateRoutine")}
  </Text>
</TouchableOpacity>
{customReminders.length > 0 && (
  <View
    style={{
      marginTop: 24,
      padding: 14,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
    }}
  >
    <Text
      style={[
        styles.label,
        { marginBottom: 12 },
      ]}
    >
      {t("reminders.savedRoutines")}
    </Text>

    {customReminders.map((reminder, index) => (
      <View
        key={`${reminder.name}-${reminder.day}-${reminder.month}-${index}`}
        style={[styles.savedReminderCard, styles.savedReminderCardBordered]}
      >
        <Text style={styles.savedCardTitle}>
          📝 {reminder.name}
        </Text>
        <Text
          style={{
            marginTop: 5,
            fontSize: 15,
          }}
        >
          📅 {String(reminder.day).padStart(2, "0")}/
          {String(reminder.month).padStart(2, "0")}
        </Text>

        <Text
          style={{
            marginTop: 3,
            fontSize: 15,
          }}
        >
          ⏰ {reminder.time}
        </Text>
        <Text style={styles.summaryText}>
          {reminder.durationDays
            ? t("reminders.durationSummary", {
                count: reminder.durationDays,
              })
            : t("reminders.legacyRoutineHelp")}
        </Text>
        <View style={styles.savedCardActions}>
          <TouchableOpacity
            style={styles.editActionButton}
            onPress={() => {
              setEditingCustomIndex(index);
              setCustomReminderName(reminder.name);
              setCustomReminderDay(String(reminder.day));
              setCustomReminderMonth(String(reminder.month));
              setCustomReminderTime(reminder.time);
              setRoutineDurationChoice(
                reminder.durationDays
                  ? getDurationChoice(reminder.durationDays)
                  : "legacy"
              );
              setRoutineCustomDurationDays(
                getDurationChoice(reminder.durationDays) === "custom"
                  ? String(reminder.durationDays)
                  : ""
              );
              setRoutineStartDate(reminder.startDate);
            }}
          >
            <Text style={styles.editActionText}>{t("common.edit")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeActionButton}
            onPress={async () => {
              const updatedReminders = customReminders.filter(
                (_, itemIndex) => itemIndex !== index
              );

              await cancelRemovedDatedReminderNotification(
                reminder,
                updatedReminders,
                reminderModeEnabled && customRemindersEnabled,
                cancelCustomNotification,
                getCustomNotificationIdentifier,
                scheduleCustomNotification
              );
              await AsyncStorage.setItem(
                CUSTOM_REMINDERS_KEY,
                JSON.stringify(updatedReminders)
              );
              setCustomReminders(updatedReminders);
              if (editingCustomIndex === index) resetCustomForm();
              else if (editingCustomIndex !== null && editingCustomIndex > index) {
                setEditingCustomIndex(editingCustomIndex - 1);
              }
            }}
          >
            <Text style={styles.removeActionText}>{t("common.remove")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
)}
  </View>
) : null}

{reminderCategory === "medicine" && (
  <>
   <CategoryReminderSwitch
    label={t("reminders.enableMedicineReminders")}
    value={medicineRemindersEnabled}
    onValueChange={(value) => {
     void toggleCategoryReminders("medicine", value);
    }}
  />
  {editingMedicineIndex !== null
    ? renderEditingControls(resetMedicineForm)
    : null}
   <Text style={styles.label}>
  {t("reminders.healthType")}
</Text>

<View style={styles.medicineTypeOptions}>
  {MEDICINE_TYPE_OPTIONS.map((option) => {
    const selected = healthReminderType === option.value;
    const label = removeLeadingMedicineTypeIcon(
      t(option.labelKey),
      option.icon
    );

    return (
      <TouchableOpacity
        key={option.value}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => setHealthReminderType(option.value)}
        style={[
          styles.medicineTypeOption,
          selected && styles.medicineTypeOptionSelected,
        ]}
      >
        <Text style={styles.medicineTypeOptionIcon}>{option.icon}</Text>
        <Text
          style={styles.medicineTypeOptionLabel}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
    <Text style={styles.label}>
      {t("reminders.medicineName")}
    </Text>

    <TextInput
  style={styles.input}
  value={newMedicineName}
  onChangeText={setNewMedicineName}
  placeholder={t("reminders.medicineExample")}
/>

<Text style={styles.label}>
  {t("reminders.reminderTime")}
</Text>

<TouchableOpacity
  style={styles.addTimeButton}
  onPress={() => setShowMedicineTimePicker(true)}
>
  <Text style={styles.addTimeButtonText}>
    + {t("reminders.addTime")}
  </Text>
</TouchableOpacity>
{newMedicineTimes.length > 0 ? (
  <View style={styles.selectedTimesList}>
    {newMedicineTimes.map((time, index) => (
      <View key={`${time}-${index}`} style={styles.selectedTimeRow}>
        <View style={styles.selectedTimeContent}>
          <Text style={styles.selectedTimeIcon}>⏰</Text>
          <Text style={styles.selectedTimeText}>
            {formatHealthTime(time)}
          </Text>
        </View>
        <View style={styles.selectedTimeActions}>
          <TouchableOpacity
            style={styles.selectedTimeEditButton}
            onPress={() => {
              setEditingMedicineTimeIndex(index);
              setNewMedicineTime(time);
              setShowMedicineTimePicker(true);
            }}
          >
            <Text style={styles.selectedTimeEditText}>{t("common.edit")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectedTimeRemoveButton}
            onPress={() => {
              setNewMedicineTimes(
                newMedicineTimes.filter((_, itemIndex) => itemIndex !== index)
              );
              if (editingMedicineTimeIndex === index) {
                setEditingMedicineTimeIndex(null);
              }
            }}
          >
            <Text style={styles.selectedTimeRemoveText}>
              {t("common.remove")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
) : null}
<CompactTimePicker
  visible={showMedicineTimePicker}
  value={newMedicineTime}
  onCancel={() => {
    setEditingMedicineTimeIndex(null);
    setShowMedicineTimePicker(false);
  }}
  onDone={(time) => {
    setNewMedicineTime(time);
    setNewMedicineTimes((previousTimes) => {
      const nextTimes = editingMedicineTimeIndex === null
        ? [...previousTimes, time]
        : previousTimes.map((item, index) =>
            index === editingMedicineTimeIndex ? time : item
          );
      return Array.from(new Set(nextTimes));
    });
    setEditingMedicineTimeIndex(null);
    setShowMedicineTimePicker(false);
  }}
/>

<DurationSelector
  label={t("reminders.duration")}
  choice={medicineDurationChoice}
  includeOngoing
  customLabel={t("reminders.customDuration")}
  ongoingLabel={t("reminders.ongoing")}
  dayLabel={(days) =>
    t(
      days === 1
        ? "reminders.oneDay"
        : days === 3
          ? "reminders.threeDays"
          : days === 5
            ? "reminders.fiveDays"
            : "reminders.sevenDays"
    )
  }
  onChange={(choice) => {
    setMedicineDurationChoice(choice);
    if (choice !== "custom") setMedicineCustomDurationDays("");
    if (choice !== "ongoing" && !medicineStartDate) {
      setMedicineStartDate(getLocalDateKey(new Date()));
    }
  }}
/>
{medicineDurationChoice === "custom" ? (
  <TextInput
    style={styles.input}
    value={medicineCustomDurationDays}
    onChangeText={setMedicineCustomDurationDays}
    placeholder={t("reminders.durationDaysPlaceholder")}
    keyboardType="number-pad"
  />
) : null}
{medicineDurationChoice === "ongoing" ? (
  <Text style={styles.durationHelp}>{t("reminders.ongoingHelp")}</Text>
) : null}

 {healthReminders.map((reminder, index) => (
  <View
    key={index}
    style={[styles.savedReminderCard, styles.savedMedicineCard]}
  >
      <Text style={styles.savedCardTitle}>
        {reminder.type === "tablet"
          ? "💊"
          : reminder.type === "cream"
          ? "🧴"
          : reminder.type === "drops"
          ? "💧"
          : reminder.type === "injection"
          ? "💉"
          : "🩹"}{" "}
        {reminder.name}
      </Text>

    <Text style={styles.summaryText}>
  {t("reminders.timesDaily", {
    count: reminder.times.length,
    times: t(reminder.times.length === 1 ? "reminders.time" : "reminders.times"),
  })}
</Text>

<Text style={styles.summaryText}>
  {reminder.times.map(formatHealthTime).join(" • ")}
</Text>
<Text style={styles.summaryText}>
  {reminder.durationDays
    ? t("reminders.durationSummary", { count: reminder.durationDays })
    : t("reminders.ongoing")}
</Text>
    <View style={styles.savedCardActions}>
      <TouchableOpacity
        style={styles.editActionButton}
        onPress={() => {
          setEditingMedicineIndex(index);
          setEditingMedicineTimeIndex(null);
          setNewMedicineName(reminder.name);
          setHealthReminderType(reminder.type);
          setNewMedicineTimes([...reminder.times]);
          setNewMedicineTime(reminder.times[0] ?? "09:00");
          setMedicineDurationChoice(getDurationChoice(reminder.durationDays));
          setMedicineCustomDurationDays(
            getDurationChoice(reminder.durationDays) === "custom"
              ? String(reminder.durationDays)
              : ""
          );
          setMedicineStartDate(reminder.startDate);
        }}
      >
        <Text style={styles.editActionText}>{t("common.edit")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeActionButton}
        onPress={async () => {
          const updatedReminders = healthReminders.filter(
            (_, i) => i !== index
          );

          await cancelAllMedicineNotifications();
          await AsyncStorage.setItem(
            HEALTH_REMINDERS_KEY,
            JSON.stringify(updatedReminders)
          );
          setHealthReminders(updatedReminders);

          if (reminderModeEnabled && medicineRemindersEnabled) {
            await scheduleMedicineNotifications(updatedReminders);
          }
          if (editingMedicineIndex === index) resetMedicineForm();
          else if (editingMedicineIndex !== null && editingMedicineIndex > index) {
            setEditingMedicineIndex(editingMedicineIndex - 1);
          }
        }}
      >
        <Text style={styles.removeActionText}>{t("common.remove")}</Text>
      </TouchableOpacity>
    </View>
  </View>
))}
</>
)}
{reminderCategory === "medicine" ? (
<TouchableOpacity
    onPress={async () => {
      if (!newMedicineName.trim()) {
        alert(t("reminders.enterMedicineName"));
        return;
      }

      if (newMedicineTimes.length === 0) {
        alert(t("reminders.addReminderTime"));
        return;
      }

      const durationDays = resolveDurationDays(
        medicineDurationChoice,
        medicineCustomDurationDays
      );

      if (durationDays === null) {
        alert(t("reminders.invalidDuration"));
        return;
      }

      const reminder: HealthReminder = {
        name: newMedicineName.trim(),
        type: healthReminderType,
        times: newMedicineTimes,
        ...(durationDays
          ? {
              durationDays,
              startDate: medicineStartDate ?? getLocalDateKey(new Date()),
            }
          : {}),
      };
      const updatedReminders = editingMedicineIndex === null
        ? [...healthReminders, reminder]
        : healthReminders.map((item, index) =>
            index === editingMedicineIndex ? reminder : item
          );

      await cancelAllMedicineNotifications();
      await AsyncStorage.setItem(
        HEALTH_REMINDERS_KEY,
        JSON.stringify(updatedReminders)
      );
      setHealthReminders(updatedReminders);

      if (reminderModeEnabled && medicineRemindersEnabled) {
        await scheduleMedicineNotifications(updatedReminders);
      }
      resetMedicineForm();
    }}
    style={{
     marginTop: 12,
      marginBottom: 20,
      minHeight: 58,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2196F3",
      paddingHorizontal: 20,
    }}
  >
    <Text
      style={{
        fontSize: 19,
        fontWeight: "700",
        textAlign: "center",
      }}
    >
      {t(editingMedicineIndex === null
        ? "reminders.addMedicine"
        : "reminders.updateMedicine")}
    </Text>
  </TouchableOpacity>
  ) : null}

{reminderCategory === "water" ? (
  <>
    <CategoryReminderSwitch
      label={t("reminders.enableWaterReminders")}
      value={remindersEnabled}
      onValueChange={(value) => {
        void toggleCategoryReminders("water", value);
      }}
    />
<View
  style={[
    styles.statusBox,
    remindersEnabled
      ? styles.statusBoxOn
      : styles.statusBoxOff,
  ]}
>
  <Text style={styles.statusText}>
    {remindersEnabled
      ? t("reminders.statusOn")
      : t("reminders.statusOff")}
  </Text>
</View>
<View style={styles.modeRow}>
  <TouchableOpacity
    style={[
      styles.modeButton,
      reminderMode === "smart" && styles.modeButtonActive,
    ]}
    onPress={() => setReminderMode("smart")}
  >
    <Text
      style={[
        styles.modeButtonText,
        reminderMode === "smart" && styles.modeButtonTextActive,
      ]}
    >
      {t("reminders.smartSchedule")}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.modeButton,
      reminderMode === "fixed" && styles.modeButtonActive,
    ]}
    onPress={() => setReminderMode("fixed")}
  >
    <Text
      style={[
        styles.modeButtonText,
        reminderMode === "fixed" && styles.modeButtonTextActive,
      ]}
    >
      {t("reminders.fixedInterval")}
    </Text>
  </TouchableOpacity>
</View>
        <Text style={styles.label}>
          {t("reminders.dailyGoal")}
        </Text>

        <TextInput
          style={styles.input}
          value={dailyGoal}
          onChangeText={setDailyGoal}
          keyboardType="numeric"
          placeholder="4000"
        />

        <Text style={styles.label}>
          {t("reminders.amountPerReminder")}
        </Text>

        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="250"
        />

        {reminderMode === "fixed" && (
  <>
    <Text style={styles.label}>
     {t("reminders.intervalMinutes")}
    </Text>

    <TextInput
      style={styles.input}
      value={interval}
      onChangeText={setInterval}
      keyboardType="numeric"
      placeholder="1"
    />
  </>
)}

        <Text style={styles.label}>
  {t("reminders.startHour")}
</Text>

<TouchableOpacity
  style={[styles.input, styles.timeSelector]}
  onPress={() => setShowStartPicker(true)}
>
  <Text style={styles.timeSelectorText}>
    {formatMinutesOfDay(getStartMinutes())}
  </Text>

  <Text style={styles.timeArrow}>
    ▼
  </Text>
</TouchableOpacity>
<CompactTimePicker
  visible={showStartPicker}
  value={`${String(startHour).padStart(2, "0")}:${String(
    startMinute
  ).padStart(2, "0")}`}
  onCancel={() => setShowStartPicker(false)}
  onDone={(time) => {
    const [hour, minute] = time.split(":").map(Number);
    const selectedStart = hour * 60 + minute;

    setStartHour(String(hour));
    setStartMinute(String(minute));

    if (getEndMinutes() <= selectedStart) {
      const adjustedEnd = Math.min(selectedStart + 60, 23 * 60 + 59);
      setEndHour(String(Math.floor(adjustedEnd / 60)));
      setEndMinute(String(adjustedEnd % 60));
    }

    setShowStartPicker(false);
  }}
/>
        

        <Text style={styles.label}>
  {t("reminders.endHour")}
</Text>

<TouchableOpacity
  style={[styles.input, styles.timeSelector]}
  onPress={() => setShowEndPicker(true)}
>
  <Text style={styles.timeSelectorText}>
    {formatMinutesOfDay(getEndMinutes())}
  </Text>

  <Text style={styles.timeArrow}>
    ▼
  </Text>
</TouchableOpacity>
<CompactTimePicker
  visible={showEndPicker}
  value={`${String(endHour).padStart(2, "0")}:${String(
    endMinute
  ).padStart(2, "0")}`}
  onCancel={() => setShowEndPicker(false)}
  onDone={(time) => {
    const [hour, minute] = time.split(":").map(Number);
    setEndHour(String(hour));
    setEndMinute(String(minute));
    setShowEndPicker(false);
  }}
/>
  {getEndMinutes() <= getStartMinutes() && (
  <Text style={styles.warningText}>
    ⚠️ {t("reminders.endAfterStart")}
  </Text>
)}
<View style={styles.summaryBox}>
  <Text style={styles.summaryTitle}>
    {t("reminders.summary")}
  </Text>

  <Text style={styles.summaryText}>
    {t("reminders.summaryMode", {
      mode: t(reminderMode === "smart"
        ? "reminders.smartSchedulePlain"
        : "reminders.fixedIntervalPlain"),
    })}
  </Text>

  <Text style={styles.summaryText}>
    {t("reminders.summaryGoal", { amount: dailyGoal })}
  </Text>

  <Text style={styles.summaryText}>
    {t("reminders.summaryAmount", { amount })}
  </Text>

  <Text style={styles.summaryText}>
  {t("reminders.summaryTime", {
    start: formatMinutesOfDay(getStartMinutes()),
    end: formatMinutesOfDay(getEndMinutes()),
  })}
</Text>
    {reminderMode === "smart" && (
    <Text style={styles.smartInfoText}>
    {t("reminders.smartInfo")}
    </Text>
)}
    {reminderMode === "smart" && (
  <Text style={styles.summaryText}>
    {t("reminders.planned", { count:
      Number(amount) > 0
        ? Math.ceil(
            Number(dailyGoal) / Number(amount)
          )
        : 0 })}
  </Text>
)}
{reminderMode === "smart" && (
  <Text style={styles.summaryText}>
    {t("reminders.schedule", { times: getSmartScheduleTimes().join(" • ") })}
  </Text>
)}
{reminderMode === "smart" && (
  <Text style={styles.summaryText}>
    {t("reminders.next", { time: getNextSmartReminderMinutes() !== null
      ? formatMinutesOfDay(getNextSmartReminderMinutes()!)
      : t("common.notAvailable") })}
  </Text>

)}

  {reminderMode === "fixed" && (
  <>
    <Text style={styles.summaryText}>
      {t("reminders.interval", { minutes: interval })}
    </Text>
<Text style={styles.summaryText}>
  {t("reminders.planned", {
    count: getFixedScheduleTimes().length,
  })}
</Text>
{reminderMode === "fixed" && (
  <Text style={[styles.summaryText, { fontWeight: "700" }]}>
    {t("reminders.next", { time: getNextFixedReminderMinutes() !== null
  ? formatMinutesOfDay(getNextFixedReminderMinutes()!)
  : t("common.notAvailable") })}
  </Text>
)}
{reminderMode === "fixed" && (
  <Text style={styles.summaryText}>
   {t("reminders.todaysSchedule", { times: getFixedScheduleTimes().join(" • ") })}
  </Text>
)}
{reminderMode === "fixed" && (
  <Text style={styles.summaryText}>
    {t("reminders.remaining", { count: getRemainingFixedReminders() })}
  </Text>
)}
    <Text style={styles.summaryText}>
  {t("reminders.plannedWater", {
    amount: getFixedScheduleTimes().length * Number(amount),
  })}
</Text>

  {getFixedScheduleTimes().length * Number(amount) === Number(dailyGoal) ? (
  <Text style={styles.summaryText}>
    {t("reminders.perfectMatch", { amount: Number(dailyGoal) })}
  </Text>
) : getFixedScheduleTimes().length * Number(amount) > Number(dailyGoal) ? (
  <>
    <Text style={styles.summaryText}>
      {t("reminders.goalCovered", {
        planned: getFixedScheduleTimes().length * Number(amount),
        goal: Number(dailyGoal),
      })}
    </Text>

    <Text style={styles.summaryText}>
      {t("reminders.aboveGoal", {
        amount: getFixedScheduleTimes().length * Number(amount) - Number(dailyGoal),
      })}
    </Text>
  </>
) : (
  <Text style={styles.summaryText}>
    {t("reminders.hydrationCheck", {
      planned: getFixedScheduleTimes().length,
      needed: Math.ceil(Number(dailyGoal) / Number(amount)),
    })}
  </Text>
)}

    {Number(interval) > 0 &&
      getFixedScheduleTimes().length * Number(amount) ===
        Number(dailyGoal) && (
        <Text style={styles.successText}>
          {t("reminders.meetsGoal")}
        </Text>
      )}

    {Number(interval) > 0 &&
      getFixedScheduleTimes().length * Number(amount) >
        Number(dailyGoal) && (
        <Text style={styles.warningText}>
          {t("reminders.exceedsGoal", {
            amount:
              getFixedScheduleTimes().length * Number(amount) -
              Number(dailyGoal),
          })}
        </Text>
      )}
  </>
)}


</View>
        <TouchableOpacity
  style={[
  styles.button,
  !isFormValid && styles.buttonDisabled,
]}
  onPress={saveWaterSettings}
  disabled={!isFormValid}
>
  <Text style={styles.buttonText}>
    {t("reminders.saveWaterSettings")}
  </Text>
</TouchableOpacity>
  </>
) : null}

        </View>
    </ScrollView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAFF",
  },

  content: {
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#666666",
    marginTop: 8,
    marginBottom: 25,
  },

  categorySwitchRow: {
    minHeight: 50,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#EAF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  categorySwitchLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#12344D",
  },

  masterReminderRow: {
    minHeight: 72,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#DFF3FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  masterReminderText: {
    flex: 1,
  },

  masterReminderSubtitle: {
    color: "#456779",
    fontSize: 13,
  },

  masterReminderState: {
    marginTop: 3,
    color: "#12344D",
    fontSize: 13,
    fontWeight: "700",
  },

  editingBanner: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#90CAF9",
    borderRadius: 10,
    backgroundColor: "#EAF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  editingBannerText: {
    flex: 1,
    color: "#145A86",
    fontSize: 14,
    fontWeight: "700",
  },

  cancelEditButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },

  cancelEditText: {
    color: "#145A86",
    fontSize: 13,
    fontWeight: "700",
  },

  savedReminderCard: {
    width: "100%",
    minWidth: 0,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    overflow: "hidden",
  },

  savedReminderCardBordered: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F7F8FA",
  },

  savedMedicineCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D5DDE3",
    backgroundColor: "#FFFFFF",
  },

  savedCardTitle: {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
    color: "#1F2933",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },

  savedCardActions: {
    width: "100%",
    minWidth: 0,
    marginTop: 14,
    paddingTop: 2,
    paddingBottom: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },

  editActionButton: {
    maxWidth: "100%",
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    backgroundColor: "#E3F2FD",
  },

  editActionText: {
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },

  removeActionButton: {
    maxWidth: "100%",
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    backgroundColor: "#FDECEC",
  },

  removeActionText: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#D8EAF7",
  },

  addTimeButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FCFF",
  },

  addTimeButtonText: {
    color: "#1677A8",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  selectedTimesList: {
    width: "100%",
    marginTop: 8,
    gap: 7,
  },

  selectedTimeRow: {
    width: "100%",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#D8EAF7",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },

  selectedTimeContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  selectedTimeActions: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  selectedTimeEditButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
  },

  selectedTimeEditText: {
    color: "#1565C0",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },

  selectedTimeIcon: {
    marginRight: 8,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "center",
  },

  selectedTimeText: {
    flexShrink: 1,
    color: "#222222",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    textAlignVertical: "center",
  },

  selectedTimeRemoveButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDECEC",
  },

  selectedTimeRemoveText: {
    color: "#C62828",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  reminderTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "transparent",
  },

  reminderTypeButtonActive: {
    backgroundColor: "#dff3ff",
  },

  reminderTypeIcon: {
    fontSize: 16,
    lineHeight: 22,
  },

  reminderTypeLabel: {
    flexShrink: 0,
    fontSize: 15,
    lineHeight: 22,
    color: "#222222",
  },

  medicineTypeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: 10,
    marginBottom: 12,
  },

  medicineTypeOption: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 140,
    minHeight: 72,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5DC",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  medicineTypeOptionSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#DFF3FF",
  },

  medicineTypeOptionIcon: {
    width: 28,
    marginRight: 8,
    fontSize: 19,
    lineHeight: 26,
    textAlign: "center",
    textAlignVertical: "center",
  },

  medicineTypeOptionLabel: {
    flex: 1,
    flexShrink: 1,
    color: "#222222",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
    includeFontPadding: true,
    textAlignVertical: "center",
  },

  durationSection: {
    marginTop: 16,
  },

  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  durationOption: {
    minHeight: 42,
    minWidth: 92,
    flexGrow: 1,
    flexBasis: "29%",
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5DC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  durationOptionSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#DFF3FF",
  },

  durationOptionText: {
    color: "#344A57",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  durationOptionTextSelected: {
    color: "#126AA4",
    fontWeight: "800",
  },

  durationHelp: {
    marginTop: 8,
    marginBottom: 4,
    color: "#667A86",
    fontSize: 12,
    lineHeight: 18,
  },

  button: {
    marginTop: 28,
    height: 58,
    borderRadius: 15,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
modeRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 10,
},

modeButton: {
  flex: 1,
  paddingVertical: 14,
  paddingHorizontal: 10,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#2196F3",
  alignItems: "center",
  justifyContent: "center",
},

modeButtonActive: {
  backgroundColor: "#2196F3",
},

modeButtonText: {
  color: "#2196F3",
  fontSize: 14,
  fontWeight: "600",
},

modeButtonTextActive: {
  color: "#FFFFFF",
},
statusBox: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  marginBottom: 16,
  alignItems: "center",
},

statusBoxOn: {
  backgroundColor: "#DFF7E8",
},

statusBoxOff: {
  backgroundColor: "#FDE8E8",
},

statusText: {
  fontSize: 15,
  fontWeight: "700",
},
warningText: {
  fontSize: 14,
  fontWeight: "600",
  marginTop: 6,
},

successText: {
  fontSize: 14,
  fontWeight: "600",
  marginTop: 6,
},
scrollContent: {
  paddingBottom: 120,
},
timeSelector: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

timeSelectorText: {
  fontSize: 16,
},

timeArrow: {
  fontSize: 14,
},
buttonDisabled: {
  opacity: 0.45,
},
summaryBox: {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  backgroundColor: "#F7F9FA",
},

summaryTitle: {
  fontSize: 17,
  fontWeight: "700",
  marginBottom: 8,
},

summaryText: {
  fontSize: 14,
  marginBottom: 6,
},
smartInfoText: {
  fontSize: 14,
  marginTop: 6,
  marginBottom: 4,
},
});

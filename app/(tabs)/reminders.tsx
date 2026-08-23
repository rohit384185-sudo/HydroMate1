import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
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
  cancelAllHydroMateReminders,
  scheduleAnniversaryNotification,
  scheduleBirthdayNotification,
  scheduleCustomNotification,
  scheduleMedicineNotification,
} from "../../services/notificationService";
import {
  cancelWaterReminders,
  scheduleWaterReminders,
} from "../../services/reminderService";

const REMINDER_SETTINGS_KEY =
  "hydromate-reminder-settings";
  const HEALTH_REMINDERS_KEY = "hydromate-health-reminders";
  const BIRTHDAY_REMINDERS_KEY = "hydromate-birthday-reminders";
  const ANNIVERSARY_REMINDERS_KEY = "hydromate-anniversary-reminders";
  const CUSTOM_REMINDERS_KEY = "hydromate-custom-reminders";
export default function RemindersScreen() {
  const [dailyGoal, setDailyGoal] = useState("4000");
  const [amount, setAmount] = useState("250");
  const [interval, setInterval] = useState("60");
  const [reminderCategory, setReminderCategory] = useState("water");
const [medicineName, setMedicineName] = useState("");
const [medicineNames, setMedicineNames] = useState<string[]>([]);
const [newMedicineName, setNewMedicineName] = useState("");
const [customReminderName, setCustomReminderName] = useState("");
const [customReminderDay, setCustomReminderDay] = useState("");
const [customReminderMonth, setCustomReminderMonth] = useState("");
const [customReminderTime, setCustomReminderTime] = useState("09:00");
const [customRemindersLoaded, setCustomRemindersLoaded] = useState(false);
const [customReminders, setCustomReminders] = useState<
  {
    name: string;
    day: number;
    month: number;
    time: string;
  }[]
>([]);
const [anniversaryName, setAnniversaryName] = useState("");
const [anniversaryDay, setAnniversaryDay] = useState("");
const [anniversaryReminders, setAnniversaryReminders] = useState<
  {
    name: string;
    day: number;
    month: number;
    time: string;
  }[]
>([]);
const [anniversaryRemindersLoaded, setAnniversaryRemindersLoaded] =
  useState(false);
const [anniversaryMonth, setAnniversaryMonth] = useState("");
const [anniversaryTime, setAnniversaryTime] = useState("09:00");
const [birthdayName, setBirthdayName] = useState("");
const [birthdayDate, setBirthdayDate] = useState("");
const [birthdayTime, setBirthdayTime] = useState("09:00");
const [birthdayDay, setBirthdayDay] = useState("");
const [birthdayMonth, setBirthdayMonth] = useState("");
const [birthdayReminders, setBirthdayReminders] = useState<

  {
    name: string;
    day: number;
    month: number;
    time: string;
  }[]
>([]);
const [birthdayRemindersLoaded, setBirthdayRemindersLoaded] = useState(false);
const [reminderModeEnabled, setReminderModeEnabled] = useState(true);
const [healthReminderType, setHealthReminderType] = useState("tablet");
const [newMedicineTimes, setNewMedicineTimes] = useState<string[]>([]);
const [newMedicineTime, setNewMedicineTime] = useState("09:00");
const [showMedicineTimePicker, setShowMedicineTimePicker] = useState(false);
const [medicinePickerHour, setMedicinePickerHour] = useState(9);
const [medicinePickerMinute, setMedicinePickerMinute] = useState(0);
const [medicinePickerPeriod, setMedicinePickerPeriod] = useState<"AM" | "PM">("AM");
const [healthReminders, setHealthReminders] = useState<


  {
  
    name: string;
    type: string;
    times: string[];
  }[]
>([]);
useEffect(() => {
  const loadReminderModeState = async () => {
    try {
      const savedValue = await AsyncStorage.getItem(
        "REMINDER_MODE_ENABLED"
      );

      if (savedValue !== null) {
        const parsedValue = JSON.parse(savedValue);
        setReminderModeEnabled(parsedValue);
      }
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

      if (saved) {
        const parsedReminders = JSON.parse(saved);
        setHealthReminders(parsedReminders);
      }
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
  const [endHour, setEndHour] = useState("21");
  const [showStartPicker, setShowStartPicker] = useState(false);
const [showEndPicker, setShowEndPicker] = useState(false);
  
const [reminderMode, setReminderMode] =
  useState<"smart" | "fixed">("smart");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const formatHour = (hour: number) => {
  if (hour === 0) {
    return "12:00 AM";
  }

  if (hour < 12) {
    return `${hour}:00 AM`;
  }

  if (hour === 12) {
    return "12:00 PM";
  }

  return `${hour - 12}:00 PM`;
};

const formatHealthTime = (time: string) => {
  if (!time) {
    return "No time";
  }

  const cleanTime = time.trim().toLowerCase();

  const match = cleanTime.match(
    /^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/
  );

  if (!match) {
    return "Invalid time";
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const typedPeriod = match[3];

  if (minute < 0 || minute > 59) {
    return "Invalid time";
  }

  if (typedPeriod) {
    if (hour < 1 || hour > 12) {
      return "Invalid time";
    }

    if (typedPeriod === "pm" && hour !== 12) {
      hour += 12;
    }

    if (typedPeriod === "am" && hour === 12) {
      hour = 0;
    }
  } else {
    if (hour < 0 || hour > 23) {
      return "Invalid time";
    }
  }

  const period = hour >= 12 ? "PM" : "AM";
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

  const amPm = hour < 12 ? "AM" : "PM";

  return `${displayHour}:${String(minute).padStart(2, "0")} ${amPm}`;
};
const getNextFixedReminderMinutes = () => {
  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const start = Number(startHour) * 60;
  const end = Number(endHour) * 60;
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
  const start = Number(startHour) * 60;
  const end = Number(endHour) * 60;
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

  const start = Number(startHour) * 60;
  const end = Number(endHour) * 60;
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
  const start = Number(startHour);
  const end = Number(endHour);

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

  const startMinutes = start * 60;
  const endMinutes = end * 60;

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
  const start = Number(startHour);
  const end = Number(endHour);

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

  const startMinutes = start * 60;
  const endMinutes = end * 60;

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
const restoreSavedReminders = async () => {
  for (const reminder of healthReminders) {
    for (const time of reminder.times) {
      const [hour, minute] = time.split(":").map(Number);

      await scheduleMedicineNotification(
        reminder.name,
        hour,
        minute
      );
    }
  }

  for (const birthday of birthdayReminders) {
    const [hour, minute] = birthday.time.split(":").map(Number);

    await scheduleBirthdayNotification(
      birthday.name,
      birthday.month,
      birthday.day,
      hour,
      minute
    );
  }
for (const anniversary of anniversaryReminders) {
  const [hour, minute] = anniversary.time.split(":").map(Number);

  await scheduleAnniversaryNotification(
    anniversary.name,
    anniversary.month,
    anniversary.day,
    hour,
    minute
  );
}
for (const customReminder of customReminders) {
  const [hour, minute] = customReminder.time.split(":").map(Number);

  await scheduleCustomNotification(
    customReminder.name,
    customReminder.month,
    customReminder.day,
    hour,
    minute
  );
}
};
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

    setEndHour(
      String(settings.endHour)
    );
    if (settings.mode === "smart" || settings.mode === "fixed") {
  setReminderMode(settings.mode);
}
const enabledValue = await AsyncStorage.getItem(
  "hydromate-reminders-enabled"
);

setRemindersEnabled(enabledValue === "true");
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
  Number(endHour) > Number(startHour) &&
  (
    reminderMode === "smart" ||
    Number(interval) > 0
  );
  const enableReminders = async () => {
  try {
    if (Number(endHour) <= Number(startHour)) {
  Alert.alert(
    "Invalid Time",
    "End time must be later than start time."
  );
  return;
}
if (
  Number(dailyGoal) <= 0 ||
  Number(amount) <= 0
) {
  Alert.alert(
    "Invalid Amount",
    "Daily goal and amount per reminder must be greater than 0."
  );
  return;
}
if (
  reminderMode === "fixed" &&
  Number(interval) <= 0
) {
  Alert.alert(
    "Invalid Interval",
    "Reminder interval must be greater than 0."
  );
  return;
}
    const settings = {
      dailyGoal: Number(dailyGoal),
      amount: Number(amount),
      interval: Number(interval),
      startHour: Number(startHour),
      endHour: Number(endHour),
      mode: reminderMode,
    };

    await AsyncStorage.setItem(
      REMINDER_SETTINGS_KEY,
      JSON.stringify(settings)
    );
await AsyncStorage.setItem(
  "hydromate-reminders-enabled",
  "true"
);

setRemindersEnabled(true);
    const result = await scheduleWaterReminders({
      dailyGoal: settings.dailyGoal,
      amountPerReminder: settings.amount,
      intervalHours: settings.interval,
      startHour: settings.startHour,
      endHour: settings.endHour,
      mode: settings.mode,
    });

    Alert.alert(
      "💧 HydroMate",
      `${result.scheduledCount} reminders scheduled.\n\nTotal planned: ${result.scheduledAmount} ml`
    );
  } catch (error) {
    Alert.alert(
      "Something went wrong",
      "Could not save or schedule your reminders."
    );

    console.log("Reminder error:", error);
  }
};
const disableReminders = async () => {
  try {
    await cancelWaterReminders();

    await AsyncStorage.setItem(
      "hydromate-reminders-enabled",
      "false"
    );

    setRemindersEnabled(false);

    Alert.alert(
      "💧 HydroMate",
      "Water reminders have been turned off."
    );
  } catch (error) {
    Alert.alert(
      "Error",
      "Could not turn off reminders."
    );
  }
};
  return (
  <SafeAreaView style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>

        <Text style={styles.title}>
          💧 Reminder Settings
        </Text>

        <Text style={styles.subtitle}>
          Choose when HydroMate should remind you.
        </Text>
        <Text style={styles.label}>
  Reminder Type
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
  style={{
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      reminderCategory === "water" ? "#dff3ff" : "transparent",
  }}
>
  <Text>💧 Water</Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => setReminderCategory("medicine")}
  style={{
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      reminderCategory === "medicine" ? "#dff3ff" : "transparent",
  }}
>
  <Text>💊 Medicine</Text>
</TouchableOpacity>

  <TouchableOpacity
    onPress={() => setReminderCategory("birthday")}
    style={{
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor:
        reminderCategory === "birthday" ? "#dff3ff" : "transparent",
    }}
  >
    <Text>🎂 Birthday</Text>
  </TouchableOpacity>

  <TouchableOpacity
  onPress={() => setReminderCategory("anniversary")}
  style={{
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      reminderCategory === "anniversary"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>💍 Anniversary</Text>
  </TouchableOpacity>
<TouchableOpacity
  onPress={() => setReminderCategory("custom")}
  style={{
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      reminderCategory === "custom"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>📝 Custom</Text>
</TouchableOpacity>
</View>
{reminderCategory === "birthday" ? (

  <View
    style={{
      marginTop: 20,
      marginBottom: 20,
    }}
  >
    <Text style={styles.label}>Birthday Name</Text>

    <TextInput
      style={styles.input}
      value={birthdayName}
      onChangeText={setBirthdayName}
      placeholder="e.g. Rohit"
    />

    <Text style={[styles.label, { marginTop: 16 }]}>
      Birthday Date
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
      Saved Birthdays
    </Text>

    {birthdayReminders.map((birthday, index) => (
      <View
        key={`${birthday.name}-${birthday.day}-${birthday.month}-${index}`}
        style={{
          padding: 14,
          marginBottom: 10,
          borderRadius: 12,
          backgroundColor: "#F5F7FA",
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
          }}
        >
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
      <TouchableOpacity
  onPress={() => {
    setBirthdayReminders((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }}
  style={{
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E53935",
  }}
>
  <Text
    style={{
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    }}
  >
    Remove
  </Text>
</TouchableOpacity>
      </View>
    ))}
  </View>
)}
</View>

    <Text style={[styles.label, { marginTop: 16 }]}>
      Reminder Time
    </Text>

    <TextInput
      style={styles.input}
      value={birthdayTime}
      onChangeText={setBirthdayTime}
      placeholder="09:00"
      keyboardType="numeric"
    />

    <TouchableOpacity
      onPress={async () => {
        if (!birthdayName.trim()) {
          alert("Please enter birthday name");
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
          alert("Please enter birthday date as DD/MM");
          return;
        }

        if (
          Number.isNaN(hour) ||
          Number.isNaN(minute) ||
          hour < 0 ||
          hour > 23 ||
          minute < 0 ||
          minute > 59
        ) {
          alert("Please enter time as HH:MM");
          return;
        }

        await scheduleBirthdayNotification(
          birthdayName.trim(),
          month,
          day,
          hour,
          minute
        );
setBirthdayReminders((prev) => [
  ...prev,
  {
    name: birthdayName.trim(),
    day,
    month,
    time: birthdayTime,
  },
]);
        alert("Birthday reminder added");
        setBirthdayName("");
setBirthdayDay("");
setBirthdayMonth("");
setBirthdayTime("09:00");
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
        🎂 Add Birthday
      </Text>
    </TouchableOpacity>
  </View>
) : null}
{reminderCategory === "anniversary" ? (
  <View
    style={{
      marginTop: 20,
      marginBottom: 20,
    }}
  >
    <Text style={styles.label}>Anniversary Name</Text>

    <TextInput
      style={styles.input}
      value={anniversaryName}
      onChangeText={setAnniversaryName}
      placeholder="e.g. Rohit & Aakriti"
    />

    <Text style={[styles.label, { marginTop: 16 }]}>
      Anniversary Date
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
      Reminder Time
    </Text>

    <TextInput
      style={styles.input}
      value={anniversaryTime}
      onChangeText={setAnniversaryTime}
      placeholder="09:00"
      keyboardType="numeric"
    />
    <TouchableOpacity
  onPress={async () => {
    if (!anniversaryName.trim()) {
      alert("Please enter anniversary name");
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
      month > 12
    ) {
      alert("Please enter a valid anniversary date");
      return;
    }

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      alert("Please enter time as HH:MM");
      return;
    }

    await scheduleAnniversaryNotification(
      anniversaryName.trim(),
      month,
      day,
      hour,
      minute
    );
setAnniversaryReminders((prev) => [
  ...prev,
  {
    name: anniversaryName.trim(),
    day,
    month,
    time: anniversaryTime,
  },
]);
    alert("Anniversary reminder added");

    setAnniversaryName("");
    setAnniversaryDay("");
    setAnniversaryMonth("");
    setAnniversaryTime("09:00");
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
    💍 Add Anniversary
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
      Saved Anniversaries
    </Text>

    {anniversaryReminders.map((anniversary, index) => (
      <View
        key={`${anniversary.name}-${anniversary.day}-${anniversary.month}-${index}`}
        style={{
          padding: 14,
          marginBottom: 10,
          borderRadius: 12,
          backgroundColor: "#F5F7FA",
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
          }}
        >
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
        <TouchableOpacity
  onPress={() => {
    setAnniversaryReminders((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }}
  style={{
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E53935",
  }}
>
  <Text
    style={{
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    }}
  >
    Remove
  </Text>
</TouchableOpacity>
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
    <Text style={styles.label}>Custom Reminder Name</Text>

    <TextInput
      style={styles.input}
      value={customReminderName}
      onChangeText={setCustomReminderName}
      placeholder="e.g. Call Doctor"
    />

    <Text style={[styles.label, { marginTop: 16 }]}>
      Reminder Date
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
      Reminder Time
    </Text>

    <TextInput
      style={styles.input}
      value={customReminderTime}
      onChangeText={setCustomReminderTime}
      placeholder="09:00"
      keyboardType="numeric"
    />
    <TouchableOpacity
  onPress={async () => {
    if (!customReminderName.trim()) {
      alert("Please enter reminder name");
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
      month > 12
    ) {
      alert("Please enter a valid date");
      return;
    }

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      alert("Please enter time as HH:MM");
      return;
    }

    await scheduleCustomNotification(
      customReminderName.trim(),
      month,
      day,
      hour,
      minute
    );
    setCustomReminders((prev) => [
  ...prev,
  {
    name: customReminderName.trim(),
    day,
    month,
    time: customReminderTime,
  },
]);

    alert("Custom reminder added");

    setCustomReminderName("");
    setCustomReminderDay("");
    setCustomReminderMonth("");
    setCustomReminderTime("09:00");
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
    📝 Add Custom Reminder
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
      Saved Custom Reminders
    </Text>

    {customReminders.map((reminder, index) => (
      <View
        key={`${reminder.name}-${reminder.day}-${reminder.month}-${index}`}
        style={{
          padding: 14,
          marginBottom: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E0E0E0",
          backgroundColor: "#F7F8FA",
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
          }}
        >
          📝 {reminder.name}
        </Text>
<TouchableOpacity
  onPress={() => {
    setCustomReminders((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }}
  style={{
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E53935",
  }}
>
  <Text
    style={{
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    }}
  >
    Remove
  </Text>
</TouchableOpacity>
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
      </View>
    ))}
  </View>
)}
  </View>
) : null}

{reminderCategory === "medicine" && (
  <>
   <Text style={styles.label}>
  Health Reminder Type
</Text>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  }}
>
  <TouchableOpacity
  onPress={() => setHealthReminderType("tablet")}
  style={{
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      healthReminderType === "tablet"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>💊 Tablet</Text>
</TouchableOpacity>

  <TouchableOpacity
  onPress={() => setHealthReminderType("cream")}
  style={{
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      healthReminderType === "cream"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>🧴 Cream</Text>
</TouchableOpacity>

  <TouchableOpacity
  onPress={() => setHealthReminderType("drops")}
  style={{
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      healthReminderType === "drops"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>💧 Drops</Text>
</TouchableOpacity>

  <TouchableOpacity
  onPress={() => setHealthReminderType("injection")}
  style={{
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      healthReminderType === "injection"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>💉 Injection</Text>
</TouchableOpacity>

  <TouchableOpacity
  onPress={() => setHealthReminderType("other")}
  style={{
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor:
      healthReminderType === "other"
        ? "#dff3ff"
        : "transparent",
  }}
>
  <Text>🩹 Other</Text>
</TouchableOpacity>
</View>
    <Text style={styles.label}>
      Medicine Name
    </Text>

    <TextInput
  style={styles.input}
  value={newMedicineName}
  onChangeText={setNewMedicineName}
  placeholder="e.g. Vitamin D, BP Medicine"
/>

<Text style={styles.label}>
  Reminder Time
</Text>

<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  }}
>
 {newMedicineTimes.map((time, index) => (
  <View
    key={index}
    style={{
      flexDirection: "row",
      alignItems: "center",
      marginRight: 10,
      marginBottom: 6,
    }}
  >
    <Text style={styles.summaryText}>
      ⏰ {formatHealthTime(time)}
    </Text>

    <TouchableOpacity
      onPress={() => {
        setNewMedicineTimes(
          newMedicineTimes.filter((_, i) => i !== index)
        );
      }}
      style={{ marginLeft: 6 }}
    >
      <Text>❌</Text>
    </TouchableOpacity>
  </View>
))}
</View>
<TouchableOpacity
  onPress={() => {
    const time = newMedicineTime.trim();

    if (!time) {
      return;
    }

    setNewMedicineTimes([
      ...newMedicineTimes,
      time,
    ]);
  }}
>
  <Text>+ Add Time</Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.input}
  onPress={() => setShowMedicineTimePicker(true)}
>
  <Text>
    ⏰ {medicinePickerHour}:
    {medicinePickerMinute.toString().padStart(2, "0")}{" "}
    {medicinePickerPeriod}
  </Text>
</TouchableOpacity>
{showMedicineTimePicker && (
  <View
    style={{
      marginTop: 10,
      marginBottom: 12,
      padding: 16,
      borderWidth: 1,
      borderRadius: 16,
    }}
  >
    <Text
      style={[
        styles.label,
        {
          fontSize: 24,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 14,
        },
      ]}
    >
      Select Reminder Time
    </Text>

    <Text
      style={{
        fontSize: 32,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 18,
      }}
    >
      ⏰ {medicinePickerHour}:
      {medicinePickerMinute.toString().padStart(2, "0")}{" "}
      {medicinePickerPeriod}
    </Text>

    <Text
      style={{
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 8,
      }}
    >
      Hour
    </Text>

    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        marginBottom: 18,
      }}
    >
      <TouchableOpacity
        onPress={() =>
          setMedicinePickerHour((prev) =>
            prev === 1 ? 12 : prev - 1
          )
        }
        style={{
          width: 64,
          height: 56,
          borderWidth: 1,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: "700" }}>
          −
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 36,
          fontWeight: "700",
          minWidth: 60,
          textAlign: "center",
        }}
      >
        {medicinePickerHour}
      </Text>

      <TouchableOpacity
        onPress={() =>
          setMedicinePickerHour((prev) =>
            prev === 12 ? 1 : prev + 1
          )
        }
        style={{
          width: 64,
          height: 56,
          borderWidth: 1,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: "700" }}>
          +
        </Text>
      </TouchableOpacity>
    </View>

    <Text
      style={{
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 10,
      }}
    >
      Minutes
    </Text>

    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 18,
      }}
    >
      {[0, 10, 20, 30, 40, 50].map((minute) => (
        <TouchableOpacity
          key={minute}
          onPress={() => setMedicinePickerMinute(minute)}
          style={{
           width: 54,
height: 42,
margin: 4,
            borderWidth: 1,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              medicinePickerMinute === minute
                ? "#dff3ff"
                : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
            }}
          >
            {minute.toString().padStart(2, "0")}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text
      style={{
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 10,
      }}
    >
      AM / PM
    </Text>

    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 16,
        marginBottom: 18,
      }}
    >
      <TouchableOpacity
        onPress={() => setMedicinePickerPeriod("AM")}
        style={{
          flex: 1,
          height: 56,
          borderWidth: 1,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            medicinePickerPeriod === "AM"
              ? "#dff3ff"
              : "transparent",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          AM
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setMedicinePickerPeriod("PM")}
        style={{
          flex: 1,
          height: 56,
          borderWidth: 1,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            medicinePickerPeriod === "PM"
              ? "#dff3ff"
              : "transparent",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          PM
        </Text>
      </TouchableOpacity>
    </View>

    <View
      style={{
        flexDirection: "row",
        gap: 12,
      }}
    >
      <TouchableOpacity
        onPress={() => setShowMedicineTimePicker(false)}
        style={{
          flex: 1,
          minHeight: 58,
          borderWidth: 1,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          ✕ Cancel
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          let hour24 = medicinePickerHour;

          if (
            medicinePickerPeriod === "PM" &&
            hour24 !== 12
          ) {
            hour24 += 12;
          }

          if (
            medicinePickerPeriod === "AM" &&
            hour24 === 12
          ) {
            hour24 = 0;
          }

          const formattedTime =
            `${hour24.toString().padStart(2, "0")}:` +
            `${medicinePickerMinute
              .toString()
              .padStart(2, "0")}`;

          setNewMedicineTime(formattedTime);
          setNewMedicineTimes((prev) =>
  prev.includes(formattedTime)
    ? prev
    : [...prev, formattedTime]
);
          setShowMedicineTimePicker(false);
        }}
        style={{
          flex: 1.4,
          minHeight: 58,
          borderWidth: 1,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          ✓ Use This Time
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}

 {healthReminders.map((reminder, index) => (
  <View
    key={index}
    style={{
      marginTop: 10,
      padding: 10,
      borderWidth: 1,
      borderRadius: 10,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={styles.summaryText}>
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

      <TouchableOpacity
        onPress={() => {
          setHealthReminders(
            healthReminders.filter((_, i) => i !== index)
          );
        }}
      >
        <Text>❌ Remove</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.summaryText}>
  ⏰ {reminder.times.length} time{reminder.times.length > 1 ? "s" : ""} daily
</Text>

<Text style={styles.summaryText}>
  {reminder.times.map(formatHealthTime).join(" • ")}
</Text>
  </View>
))}
</>
)}
{reminderCategory === "medicine" ? (
<TouchableOpacity
    onPress={async () => {
      if (!newMedicineName.trim()) {
        alert("Please enter medicine name");
        return;
      }

      if (!newMedicineTime) {
        alert("Please add reminder time");
        return;
      }

      setHealthReminders((prev) => [
        ...prev,
        {
          name: newMedicineName.trim(),
          type: healthReminderType,
          times: newMedicineTimes,
        },
      ]);
for (const time of newMedicineTimes) {
  const [medicineHour24, medicineMinute24] =
    time.split(":").map(Number);

  await scheduleMedicineNotification(
    newMedicineName.trim(),
    medicineHour24,
    medicineMinute24
  );
}
      setNewMedicineName("");
      setNewMedicineTime("");
      setNewMedicineTimes([]);
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
      💊 Add Medicine
    </Text>
  </TouchableOpacity>
  ) : null}

<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
  }}
>
  <View>
    <Text style={styles.label}>
      Reminder Mode
    </Text>

    <Text
      style={{
        fontSize: 14,
        marginTop: 2,
      }}
    >
      {reminderModeEnabled ? "Reminders ON" : "Reminders OFF"}
    </Text>
  </View>

<Switch
  value={reminderModeEnabled}
  onValueChange={async (value) => {
    setReminderModeEnabled(value);
    await AsyncStorage.setItem(
  "REMINDER_MODE_ENABLED",
  JSON.stringify(value)
);

    if (!value) {
      await cancelAllHydroMateReminders();
      alert("All reminders are turned OFF");
      return;
    }

    await restoreSavedReminders();
    alert("Saved reminders are turned ON");
  }}
/>
</View>
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
      ? "✅ Reminders ON"
      : "⛔ Reminders OFF"}
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
      ⭐ Smart Schedule
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
      ⏰ Fixed Interval
    </Text>
  </TouchableOpacity>
</View>
        <Text style={styles.label}>
          Daily Water Goal (ml)
        </Text>

        <TextInput
          style={styles.input}
          value={dailyGoal}
          onChangeText={setDailyGoal}
          keyboardType="numeric"
          placeholder="4000"
        />

        <Text style={styles.label}>
          Amount per Reminder (ml)
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
     Reminder Interval (minutes)
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
  Start Hour
</Text>

<TouchableOpacity
  style={[styles.input, styles.timeSelector]}
  onPress={() =>
    setShowStartPicker(!showStartPicker)
  }
>
  <Text style={styles.timeSelectorText}>
    {Number(startHour) < 12
      ? `${Number(startHour) || 12}:00 AM`
      : `${Number(startHour) === 12 ? 12 : Number(startHour) - 12}:00 PM`}
  </Text>

  <Text style={styles.timeArrow}>
    ▼
  </Text>
</TouchableOpacity>
{showStartPicker && (
  <ScrollView
  style={styles.pickerBox}
  nestedScrollEnabled={true}
>
    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(
      (hour) => (
        <TouchableOpacity
          key={hour}
          style={styles.pickerOption}
         onPress={() => {
  setStartHour(String(hour));

  if (Number(endHour) <= hour) {
    setEndHour(String(Math.min(hour + 1, 23)));
  }

  setShowStartPicker(false);
}}
        >
          <Text style={styles.pickerOptionText}>
  {hour < 12
    ? `${hour}:00 AM`
    : `${hour === 12 ? 12 : hour - 12}:00 PM`}
</Text>
        </TouchableOpacity>
      )
    )}
    </ScrollView>
)}
        

        <Text style={styles.label}>
  End Hour
</Text>

<TouchableOpacity
  style={[styles.input, styles.timeSelector]}
  onPress={() =>
    setShowEndPicker(!showEndPicker)
  }
>
  <Text style={styles.timeSelectorText}>
    {Number(endHour) < 12
      ? `${Number(endHour) || 12}:00 AM`
      : `${Number(endHour) === 12 ? 12 : Number(endHour) - 12}:00 PM`}
  </Text>

  <Text style={styles.timeArrow}>
    ▼
  </Text>
</TouchableOpacity>
{showEndPicker && (
  <ScrollView
    style={styles.pickerBox}
    nestedScrollEnabled={true}
  >
    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(
      (hour) => (
        <TouchableOpacity
  key={hour}
  style={[
    styles.pickerOption,
    hour <= Number(startHour) &&
      styles.pickerOptionDisabled,
  ]}
  disabled={hour <= Number(startHour)}
  onPress={() => {
    setEndHour(String(hour));
    setShowEndPicker(false);
  }}
>
          <Text style={styles.pickerOptionText}>
            {hour < 12
              ? `${hour}:00 AM`
              : `${hour === 12 ? 12 : hour - 12}:00 PM`}
          </Text>
        </TouchableOpacity>
      )
    )}
  </ScrollView>
)}
  {Number(endHour) <= Number(startHour) && (
  <Text style={styles.warningText}>
    ⚠️ End time must be later than start time.
  </Text>
)}
<View style={styles.summaryBox}>
  <Text style={styles.summaryTitle}>
    Reminder Summary
  </Text>

  <Text style={styles.summaryText}>
    Mode: {reminderMode === "smart"
      ? "Smart Schedule"
      : "Fixed Interval"}
  </Text>

  <Text style={styles.summaryText}>
    Daily Goal: {dailyGoal} ml
  </Text>

  <Text style={styles.summaryText}>
    Amount per Reminder: {amount} ml
  </Text>

  <Text style={styles.summaryText}>
  Time:{" "}
  {Number(startHour) < 12
    ? `${Number(startHour) || 12}:00 AM`
    : `${Number(startHour) === 12 ? 12 : Number(startHour) - 12}:00 PM`}
  {" - "}
  {Number(endHour) < 12
    ? `${Number(endHour) || 12}:00 AM`
    : `${Number(endHour) === 12 ? 12 : Number(endHour) - 12}:00 PM`}
</Text>
    {reminderMode === "smart" && (
    <Text style={styles.smartInfoText}>
    ⭐ HydroMate will automatically spread your reminders
    across this time window to help meet your daily goal.
    </Text>
)}
    {reminderMode === "smart" && (
  <Text style={styles.summaryText}>
    Planned Reminders: {
      Number(amount) > 0
        ? Math.ceil(
            Number(dailyGoal) / Number(amount)
          )
        : 0
    }
  </Text>
)}
{reminderMode === "smart" && (
  <Text style={styles.summaryText}>
    Schedule: {getSmartScheduleTimes().join(" • ")}
  </Text>
)}
{reminderMode === "smart" && (
  <Text style={styles.summaryText}>
    Next Reminder:{" "}
    {getNextSmartReminderMinutes() !== null
      ? formatMinutesOfDay(getNextSmartReminderMinutes()!)
      : "Not available"}
  </Text>

)}

  {reminderMode === "fixed" && (
  <>
    <Text style={styles.summaryText}>
      Interval: Every {interval} minute(s)
    </Text>
<Text style={styles.summaryText}>
  Planned Reminders: {
    Number(interval) > 0
      ? Math.floor(
         ((Number(endHour) - Number(startHour)) * 60) /
          Number(interval)
        ) + 1
      : 0
  }
</Text>
{reminderMode === "fixed" && (
  <Text style={[styles.summaryText, { fontWeight: "700" }]}>
    Next Reminder:{" "}
  {getNextFixedReminderMinutes() !== null
  ? formatMinutesOfDay(getNextFixedReminderMinutes()!)
  : "Not available"}
  </Text>
)}
{reminderMode === "fixed" && (
  <Text style={styles.summaryText}>
   Today's Schedule: {getFixedScheduleTimes().join(" • ")}
  </Text>
)}
{reminderMode === "fixed" && (
  <Text style={styles.summaryText}>
    Remaining Today: {getRemainingFixedReminders()} reminder(s)
  </Text>
)}
    <Text style={styles.summaryText}>
  Planned Water:{" "}
  {getFixedScheduleTimes().length * Number(amount)} ml
</Text>

  {getFixedScheduleTimes().length * Number(amount) === Number(dailyGoal) ? (
  <Text style={styles.summaryText}>
    🎯 Perfect Match! Your schedule gives you exactly{" "}
    {Number(dailyGoal)} ml — right on target.
  </Text>
) : getFixedScheduleTimes().length * Number(amount) > Number(dailyGoal) ? (
  <>
    <Text style={styles.summaryText}>
      🎉 Goal Covered! Your plan gives you{" "}
      {getFixedScheduleTimes().length * Number(amount)} ml, which meets your{" "}
      {Number(dailyGoal)} ml daily goal.
    </Text>

    <Text style={styles.summaryText}>
      💧 You’re{" "}
      {getFixedScheduleTimes().length * Number(amount) - Number(dailyGoal)} ml
      above your goal — you can keep this plan or slightly increase the interval.
    </Text>
  </>
) : (
  <Text style={styles.summaryText}>
    💧 Hydration Check! Only{" "}
    {getFixedScheduleTimes().length}{" "}
    reminder(s) are planned, but you need{" "}
    {Math.ceil(Number(dailyGoal) / Number(amount))}{" "}
    to hit your goal. ⭐ Try Smart Schedule or shorten the interval!
  </Text>
)}

    {Number(interval) > 0 &&
      (Math.floor(
        (Number(endHour) - Number(startHour)) /
          Number(interval)
      ) +
        1) *
        Number(amount) ===
        Number(dailyGoal) && (
        <Text style={styles.successText}>
          ✅ This schedule meets your daily goal.
        </Text>
      )}

    {Number(interval) > 0 &&
      (Math.floor(
        (Number(endHour) - Number(startHour)) /
          Number(interval)
      ) +
        1) *
        Number(amount) >
        Number(dailyGoal) && (
        <Text style={styles.warningText}>
          ⚠️ This schedule exceeds your daily goal by{" "}
          {(Math.floor(
            (Number(endHour) - Number(startHour)) /
              Number(interval)
          ) +
            1) *
            Number(amount) -
            Number(dailyGoal)}{" "}
          ml.
        </Text>
      )}
  </>
)}


</View>
        <TouchableOpacity
  style={[
  styles.button,
  !remindersEnabled &&
    !isFormValid &&
    styles.buttonDisabled,
]}
  onPress={
    remindersEnabled
      ? disableReminders
      : enableReminders
     }
      disabled={!remindersEnabled && !isFormValid} 
>
  <Text style={styles.buttonText}>
    {remindersEnabled
      ? "🔕 Turn Off Water Reminders"
      : "🔔 Enable Water Reminders"}
  </Text>
</TouchableOpacity>

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
pickerBox: {
  borderWidth: 1,
  borderColor: "#DDDDDD",
  borderRadius: 10,
  marginBottom: 12,
  maxHeight: 180,
  backgroundColor: "#FFFFFF",
},

pickerOption: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#EEEEEE",
},

pickerOptionText: {
  fontSize: 15,
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
pickerOptionDisabled: {
  opacity: 0.35,
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
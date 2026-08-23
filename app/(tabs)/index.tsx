import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
} from "@react-native-firebase/auth";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  requestNotificationPermission
} from "../../services/notificationService";

const STORAGE_KEY = "hydromate_water_data";
const WATER_HISTORY_KEY = "hydromate_water_history";

export default function HomeScreen() {
  const [nextReminder, setNextReminder] = useState("Not available");
  const [reminderAmount, setReminderAmount] = useState(250);
  const [reminderMode, setReminderMode] = useState("fixed");
  const [water, setWater] = useState(0);
  const [lastWaterAdded, setLastWaterAdded] = useState(0);
  const [showCustomWater, setShowCustomWater] = useState(false);
const [customWaterAmount, setCustomWaterAmount] = useState("");
  const [userName, setUserName] = useState("");
const [phoneNumber, setPhoneNumber] = useState("");
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
    ? "Good Morning"
    : currentHour < 17
    ? "Good Afternoon"
    : "Good Evening";

  // Get today's date
  const getToday = () => {
    return new Date().toISOString().split("T")[0];
  };
  const loadProfile = async () => {
  try {
    const savedProfile = await AsyncStorage.getItem("USER_PROFILE");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);

      setUserName(profile.userName || "");
      setPhoneNumber(profile.phoneNumber || "");
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

    alert("OTP sent successfully");
  } catch (error: any) {
    setSendingOtp(false);
  console.log("OTP send error:", error);
  console.log("OTP error code:", error?.code);
  console.log("OTP error message:", error?.message);

  alert(
    `OTP Error\n\nCode: ${error?.code || "unknown"}\n\n${error?.message || "Unknown error"}`
  );
}
};
const verifyOtp = async () => {
  try {
    if (!confirmation) {
      alert("Please send OTP first");
      return;
    }

    await confirmation.confirm(otpCode);

setPhoneVerified(true);
await AsyncStorage.setItem(
  "USER_PROFILE",
  JSON.stringify({
    userName,
    phoneNumber,
  })
);

setProfileSaved(true);

alert("Phone number verified successfully");
  } catch (error) {
    console.log("OTP verification error:", error);
    alert("Invalid OTP. Please try again.");
  }
};

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
  loadNextReminder();

  const timer = setInterval(() => {
    loadNextReminder();
  }, 60000);

  return () => clearInterval(timer);
}, []);
useFocusEffect(
  useCallback(() => {
    loadNextReminder();
  }, [])
);
const loadNextReminder = async () => {
  try {
    const savedSettings = await AsyncStorage.getItem(
      "hydromate-reminder-settings"
    );

    if (!savedSettings) {
      setNextReminder("Not available");
      return;
    }

    const settings = JSON.parse(savedSettings);

    setReminderAmount(Number(settings.amount) || 250);
    setDailyGoal(Number(settings.dailyGoal) || 4000);
    setReminderMode(settings.mode || "fixed");

    const now = new Date();
    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const formatTime = (totalMinutes: number) => {
      const hour24 = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;

      const period = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 || 12;

      return `${hour12}:${minute
        .toString()
        .padStart(2, "0")} ${period}`;
    };

    // SMART MODE
    if (settings.mode === "smart") {
      const goal = Number(settings.dailyGoal);
      const perReminder = Number(settings.amount);
      const startMinutes = Number(settings.startHour) * 60;
      const endMinutes = Number(settings.endHour) * 60;

      if (
        goal <= 0 ||
        perReminder <= 0 ||
        endMinutes < startMinutes
      ) {
        setNextReminder("Not available");
        return;
      }

      const totalReminders = Math.ceil(
        goal / perReminder
      );

      const intervalMinutes =
        totalReminders === 1
          ? 0
          : (endMinutes - startMinutes) /
            (totalReminders - 1);

      const scheduleMinutes: number[] = [];

      for (
        let i = 0;
        i < totalReminders;
        i++
      ) {
        scheduleMinutes.push(
          Math.round(
            startMinutes + i * intervalMinutes
          )
        );
      }

      const next = scheduleMinutes.find(
        (time) => time > currentMinutes
      );

      setNextReminder(
        next !== undefined
          ? formatTime(next)
          : "Not available"
      );

      return;
    }

    // FIXED MODE
    if (settings.mode === "fixed") {
      const startMinutes =
        Number(settings.startHour) * 60;

      const endMinutes =
        Number(settings.endHour) * 60;

      const stepMinutes =
        Number(settings.interval);

      if (
        stepMinutes <= 0 ||
        endMinutes < startMinutes
      ) {
        setNextReminder("Not available");
        return;
      }

      let next: number | null = null;

      for (
        let minutes = startMinutes;
        minutes <= endMinutes;
        minutes += stepMinutes
      ) {
        if (minutes > currentMinutes) {
          next = minutes;
          break;
        }
      }

      setNextReminder(
        next !== null
          ? formatTime(next)
          : "Not available"
      );

      return;
    }

    setNextReminder("Not available");
  } catch (error) {
    console.log(
      "Error loading reminder settings:",
      error
    );

    setNextReminder("Not available");
  }
};
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
  // Show loading screen while saved data is being loaded
if (loading) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text>
          Loading HydroMate...
        </Text>
      </View>
    </SafeAreaView>
  );
}
const saveNameProfile = async () => {
  try {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    await AsyncStorage.setItem(
      "USER_PROFILE",
      JSON.stringify({
        userName: userName.trim(),
        phoneNumber: "",
      })
    );

    setUserName(userName.trim());
    setPhoneNumber("");
    setProfileSaved(true);

    console.log("Name profile saved:", userName.trim());
  } catch (error) {
    console.log("Error saving name profile:", error);
  }
};
const saveProfile = async () => {
  try {
    if (!phoneVerified) {
  alert("Please verify your phone number first");
  return;
}
    if (phoneNumber.length !== 10) {
  alert("Please enter a valid 10-digit phone number");
  return;
}
    await AsyncStorage.setItem(
      "USER_PROFILE",
      JSON.stringify({
        userName,
        phoneNumber,
      })
    );
    
setProfileSaved(true);
    console.log("Profile saved:", userName, phoneNumber);
  } catch (error) {
    console.log("Error saving profile:", error);
  }
};
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
    <Text style={styles.loginTitle}>Welcome to HydroMate</Text>

    <Text style={styles.loginSubtitle}>
      Enter your name to continue
    </Text>

    <TextInput
      style={styles.profileInput}
      placeholder="Your Name"
      value={userName}
      onChangeText={setUserName}
    />

    <TouchableOpacity
      style={styles.saveProfileButton}
      onPress={saveNameProfile}
    >
      <Text style={styles.saveProfileButtonText}>
        Continue
      </Text>
    </TouchableOpacity>

    <Text style={styles.verificationStatus}>
      You can add and verify your phone later.
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
      Edit Profile
    </Text>
  </TouchableOpacity>
)}

        <Text style={styles.subtitle}>
          Stay hydrated, stay healthy.
        </Text>


        {/* Water Progress Card */}

        <View style={styles.waterCard}>

          <Text style={styles.cardTitle}>
            Today's Water
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
    Daily Water History
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
  7-Day Average: {sevenDayAverage} ml
</Text>

<Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  Goal Achieved: {goalDays} / {last7Days.length || 7} days
</Text>
<Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  Current Streak: {currentStreak} day{currentStreak === 1 ? "" : "s"} 🔥
</Text>
<Text
  style={{
    fontSize: 15,
    marginBottom: 12,
  }}
>
  Best Streak: {bestStreak} day{bestStreak === 1 ? "" : "s"} 🏆
</Text>
</View>
<Text
  style={{
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  }}
>
  Weekly Progress: {goalDays} goal day{goalDays === 1 ? "" : "s"} out of{" "}
  {last7Days.length || 7}
</Text>

  {waterHistory.length === 0 ? (
    <Text style={{ fontSize: 15 }}>
      No history yet
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
            {new Date(item.date).toLocaleDateString("en-GB", {
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
    {Math.round((item.water / dailyGoal) * 100)}% of goal
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
            {Math.round(percentage)}% of today's goal
          </Text>

        {/* Next Reminder */}

        <View style={styles.reminderCard}>

          <View>

            <Text style={styles.reminderTitle}>
              Next Reminder
            </Text>

            <Text style={styles.reminderTime}>
              {nextReminder}
            </Text>

          </View>

          <Text style={styles.reminderAmount}>
          {reminderAmount} ml 💧
          <Text style={styles.reminderTitle}>
  Mode: {reminderMode === "smart" ? "Smart" : "Fixed"}
</Text>
          </Text>

        </View>


        {/* Add Water */}

        <Text style={styles.sectionTitle}>
          Add Water
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
    Custom
  </Text>
</TouchableOpacity>
{showCustomWater && (
  <View style={{ marginTop: 12 }}>
    <TextInput
      style={styles.profileInput}
      placeholder="Enter water amount in ml"
      value={customWaterAmount}
      onChangeText={setCustomWaterAmount}
      keyboardType="number-pad"
    />

    <TouchableOpacity
      style={styles.saveProfileButton}
      onPress={() => {
        const amount = Number(customWaterAmount);

        if (!amount || amount <= 0) {
          alert("Please enter a valid water amount");
          return;
        }

        addWater(amount);
        setCustomWaterAmount("");
        setShowCustomWater(false);
      }}
    >
      <Text style={styles.saveProfileButtonText}>
        Add Water
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
      ↩ Undo last {lastWaterAdded} ml
    </Text>
  </TouchableOpacity>
)}
        {/* Today's Status */}

        <View style={styles.statusCard}>

          <Text style={styles.statusTitle}>
            Today's Status
          </Text>

          <Text style={styles.statusText}>
            {water >= dailyGoal
              ? "🎉 Daily goal completed!"
              : `${(
                  (dailyGoal - water) /
                  1000
                ).toFixed(2)} L remaining`}
          </Text>

        </View>


        <Text style={styles.footer}>
          Every sip counts 💙
        </Text>

            </View>
    </ScrollView>
  </SafeAreaView>
);
}


const styles = StyleSheet.create({
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

  reminderTitle: {
    fontSize: 13,
    color: "#666666",
  },

  reminderTime: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 4,
  },

  reminderAmount: {
    fontSize: 16,
    fontWeight: "600",
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
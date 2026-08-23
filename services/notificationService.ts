import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission() {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission was not granted.");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "water-reminders",
      {
        name: "Water Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      }
    );
  }

  return true;
}

export async function sendTestNotification() {
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💧 HydroMate Reminder",
      body: "Time to drink 250 ml of water!",
      sound: "default",
    },

    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
    },
  });
}
export async function scheduleMedicineNotification(
medicineName: string,
  hour: number,
  minute: number
) {

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💊 Medicine Reminder",
      body: `Time to take ${medicineName}`,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
export async function scheduleBirthdayNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🎂 Birthday Reminder",
      body: `Today is ${name}'s birthday!`,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: month - 1,
      day,
      hour,
      minute,
    },
  });
}
export async function scheduleAnniversaryNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💍 Anniversary Reminder",
      body: `Today is ${name}'s anniversary!`,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: month - 1,
      day,
      hour,
      minute,
    },
  });
}
export async function scheduleCustomNotification(
  name: string,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📝 Custom Reminder",
      body: name,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: month - 1,
      day,
      hour,
      minute,
    },
  });
}

export async function cancelAllHydroMateReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
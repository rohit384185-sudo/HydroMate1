import * as Notifications from "expo-notifications";

const WATER_REMINDER_PREFIX = "hydromate-water-";

export type ReminderSettings = {
  dailyGoal: number;
  amountPerReminder: number;
  startHour: number;
  endHour: number;
  intervalHours: number;
  mode: "smart" | "fixed";
};

export async function cancelWaterReminders() {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    if (
      notification.identifier.startsWith(
        WATER_REMINDER_PREFIX
      )
    ) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
    }
  }
}

export async function scheduleWaterReminders(
  settings: ReminderSettings
) {
  await cancelWaterReminders();

 const {
  dailyGoal,
  amountPerReminder,
  startHour,
  endHour,
  intervalHours,
  mode,
} = settings;

  if (
    dailyGoal <= 0 ||
    amountPerReminder <= 0
  ) {
    throw new Error(
      "Daily goal and reminder amount must be greater than 0."
    );
  }
if (
  mode === "fixed" &&
  intervalHours <= 0
) {
  throw new Error(
    "Interval must be greater than 0 for Fixed Interval mode."
  );
}
  if (
    startHour < 0 ||
    startHour > 23 ||
    endHour < 0 ||
    endHour > 23 ||
    startHour >= endHour
  ) {
    throw new Error(
      "Start hour must be earlier than end hour."
    );
  }
if (mode === "fixed") {
  let scheduledAmount = 0;
  let scheduledCount = 0;

  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  for (
    let totalMinutes = startMinutes;
    totalMinutes <= endMinutes;
    totalMinutes += intervalHours
  ) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    const remainingAmount =
      dailyGoal - scheduledAmount;

    if (remainingAmount <= 0) {
      break;
    }

    const amount = Math.min(
      amountPerReminder,
      remainingAmount
    );

    

    await Notifications.scheduleNotificationAsync({
      identifier:
        `${WATER_REMINDER_PREFIX}fixed-${hour}-${minute}`,
      content: {
        title: "💧 HydroMate Reminder",
        body: `Time to drink ${amount} ml of water!`,
        sound: "default",
      },
      trigger: {
        type:
          Notifications.SchedulableTriggerInputTypes
            .DAILY,
        hour,
        minute,
      },
    });

    

    scheduledAmount += amount;
    scheduledCount++;
  }



  return {
    scheduledCount,
    scheduledAmount,
  };
}
  const totalReminders = Math.ceil(
    dailyGoal / amountPerReminder
  );

  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  const availableMinutes =
    endMinutes - startMinutes;

  if (totalReminders > availableMinutes + 1) {
    throw new Error(
      "The selected time window is too short for the requested number of reminders."
    );
  }

  const intervalMinutes =
    totalReminders === 1
      ? 0
      : availableMinutes / (totalReminders - 1);

  let scheduledAmount = 0;
  let scheduledCount = 0;

  for (
    let i = 0;
    i < totalReminders;
    i++
  ) {
    const exactMinutes =
      startMinutes + i * intervalMinutes;

    const totalMinutes = Math.round(
      exactMinutes
    );

    const hour = Math.floor(
      totalMinutes / 60
    );

    const minute = totalMinutes % 60;

    const remainingAmount =
      dailyGoal - scheduledAmount;

    const amount = Math.min(
      amountPerReminder,
      remainingAmount
    );

    if (amount <= 0) {
      break;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `${WATER_REMINDER_PREFIX}${i}`,
      content: {
        title: "💧 HydroMate Reminder",
        body: `Time to drink ${amount} ml of water!`,
        sound: "default",
      },
      trigger: {
        type:
          Notifications.SchedulableTriggerInputTypes
            .DAILY,
        hour,
        minute,
      },
    });

    scheduledAmount += amount;
    scheduledCount++;
  }
const scheduledNotifications =
  await Notifications.getAllScheduledNotificationsAsync();

console.log(
  "SCHEDULED WATER NOTIFICATIONS:",
  scheduledNotifications
);
  return {
    scheduledCount,
    scheduledAmount,
  };
}
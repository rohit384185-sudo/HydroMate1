import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useLocalization } from "@/localization";
import {
  isDatedVoiceCompanionAvailable,
  isMedicineVoiceCompanionAvailable,
  isWaterVoiceCompanionAvailable,
} from "@/modules/hydromate-voice";
import {
  getVoiceRemindersEnabled,
  speakAnniversaryReminder,
  speakBirthdayReminder,
  speakCustomReminder,
  speakMedicineReminder,
  speakWaterReminder,
} from "@/services/voiceReminderService";
import {
  canDeliverReminderCategory,
  type ReminderCategory,
} from "@/services/reminderCategoryService";

const WATER_REMINDER_PREFIX = "hydromate-water-";
const DEDUPLICATION_WINDOW_MS = 5 * 60 * 1000;

export function VoiceReminderBridge() {
  const { language, t } = useLocalization();
  const processedEvents = useRef(new Map<string, number>());

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (AppState.currentState !== "active") {
          return;
        }

        const identifier = notification.request.identifier;
        const notificationData = notification.request.content.data;
        const reminderType = notificationData?.hydromateReminderType;
        const reminderText = notificationData?.hydromateReminderText;
        const isWaterReminder = identifier.startsWith(WATER_REMINDER_PREFIX);
        const isMedicineReminder = reminderType === "medicine";
        const isCustomReminder = reminderType === "custom";
        const isBirthdayReminder = reminderType === "birthday";
        const isAnniversaryReminder = reminderType === "anniversary";
        const category: ReminderCategory = isMedicineReminder
          ? "medicine"
          : isCustomReminder
            ? "custom"
            : isBirthdayReminder
              ? "birthday"
              : isAnniversaryReminder
                ? "anniversary"
                : "water";

        if (isWaterReminder && isWaterVoiceCompanionAvailable) {
          return;
        }

        if (isMedicineReminder && isMedicineVoiceCompanionAvailable) {
          return;
        }

        if (
          isDatedVoiceCompanionAvailable &&
          (isBirthdayReminder || isAnniversaryReminder || isCustomReminder)
        ) {
          return;
        }

        if (
          !isWaterReminder &&
          !isMedicineReminder &&
          !isCustomReminder &&
          !isBirthdayReminder &&
          !isAnniversaryReminder
        ) {
          return;
        }

        if (
          !isWaterReminder &&
          (typeof reminderText !== "string" || reminderText.length === 0)
        ) {
          return;
        }

        const now = Date.now();

        for (const [eventKey, recordedAt] of processedEvents.current) {
          if (now - recordedAt > DEDUPLICATION_WINDOW_MS) {
            processedEvents.current.delete(eventKey);
          }
        }

        const eventKey = `${identifier}:${notification.date}`;

        if (processedEvents.current.has(eventKey)) {
          return;
        }

        processedEvents.current.set(eventKey, now);

        const speakIfEnabled = async () => {
          if (!(await getVoiceRemindersEnabled())) {
            return;
          }

          if (!(await canDeliverReminderCategory(category))) {
            return;
          }

          let result;

          if (isMedicineReminder) {
            result = await speakMedicineReminder(
              language,
              t("voice.medicineSpeech", { name: reminderText as string })
            );
          } else if (isCustomReminder) {
            result = await speakCustomReminder(
              language,
              t("voice.customSpeech", { message: reminderText as string })
            );
          } else if (isBirthdayReminder) {
            result = await speakBirthdayReminder(
              language,
              t("voice.birthdaySpeech", { name: reminderText as string })
            );
          } else if (isAnniversaryReminder) {
            result = await speakAnniversaryReminder(
              language,
              t("voice.anniversarySpeech", { name: reminderText as string })
            );
          } else {
            result = await speakWaterReminder(
              language,
              t("voice.waterSpeech")
            );
          }

          if (result === "voice-unavailable" || result === "error") {
            console.log("Voice reminder skipped:", result);
          }
        };

        void speakIfEnabled();
      }
    );

    return () => subscription.remove();
  }, [language, t]);

  return null;
}

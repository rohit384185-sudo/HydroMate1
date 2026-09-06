import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocalization } from "../../localization";
import {
  loadTodayTimeline,
  partitionTodayTimeline,
  type TodayTimelineItem,
  type TodayTimelineSnapshot,
} from "../../services/todayTimelineService";
import {
  markMedicineOccurrence,
  snoozeMedicineOccurrence,
  undoMedicineOccurrenceAction,
  type MedicineOccurrenceIdentity,
} from "../../services/medicineOccurrenceActionService";

const SNOOZE_MINUTES = [5, 10, 15, 30] as const;

function getMedicineOccurrenceIdentity(
  item: TodayTimelineItem
): MedicineOccurrenceIdentity | null {
  const medicineName = item.metadata?.medicineName;
  const medicineType = item.metadata?.medicineType;
  const rootMedicineScheduleId = item.metadata?.rootMedicineScheduleId;
  const oneTimeNotificationIdentifier =
    item.metadata?.oneTimeNotificationIdentifier;

  if (
    item.type !== "medicine" ||
    typeof medicineName !== "string" ||
    typeof medicineType !== "string" ||
    typeof rootMedicineScheduleId !== "string"
  ) {
    return null;
  }

  return {
    medicineScheduleId: item.sourceId,
    rootMedicineScheduleId,
    medicineName,
    medicineType,
    scheduledAtMillis: item.scheduledAt.getTime(),
    oneTimeNotificationIdentifier:
      typeof oneTimeNotificationIdentifier === "string"
        ? oneTimeNotificationIdentifier
        : undefined,
  };
}

function formatRelativeTime(
  item: TodayTimelineItem,
  now: Date,
  t: ReturnType<typeof useLocalization>["t"]
) {
  const minutes = Math.max(
    0,
    Math.ceil((item.scheduledAt.getTime() - now.getTime()) / 60000)
  );

  if (minutes === 0) {
    return t("today.dueNow");
  }

  if (minutes === 1) {
    return t("today.inOneMinute");
  }

  return t("today.inMinutes", { count: minutes });
}

export default function TodayScreen() {
  const { locale, t } = useLocalization();
  const [snapshot, setSnapshot] = useState<TodayTimelineSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [snoozeItem, setSnoozeItem] = useState<TodayTimelineItem | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const loadedDateKey = useRef<string | null>(null);
  const actionInProgressRef = useRef(false);

  const refreshTimeline = useCallback(async () => {
    const currentTime = new Date();
    setNow(currentTime);
    const nextSnapshot = await loadTodayTimeline(currentTime, t);
    loadedDateKey.current = nextSnapshot.dateKey;
    setSnapshot(nextSnapshot);
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void refreshTimeline();

      const minuteTimer = setInterval(() => {
        const currentTime = new Date();
        setNow(currentTime);

        const currentDateKey = [
          currentTime.getFullYear(),
          String(currentTime.getMonth() + 1).padStart(2, "0"),
          String(currentTime.getDate()).padStart(2, "0"),
        ].join("-");

        if (loadedDateKey.current && currentDateKey !== loadedDateKey.current) {
          void refreshTimeline();
        }
      }, 60000);

      return () => clearInterval(minuteTimer);
    }, [refreshTimeline])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshTimeline();
      }
    });

    return () => subscription.remove();
  }, [refreshTimeline]);

  const timeline = useMemo(
    () => partitionTodayTimeline(snapshot?.items ?? [], now),
    [now, snapshot?.items]
  );
  const upcomingCount = timeline.items.length - timeline.pastItems.length;
  const formatTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [locale]
  );

  const runMedicineAction = useCallback(
    async (
      item: TodayTimelineItem,
      action: "taken" | "skipped" | "undo"
    ) => {
      if (actionInProgressRef.current) {
        return;
      }

      const occurrenceKey = item.metadata?.medicineOccurrenceKey;
      const identity = getMedicineOccurrenceIdentity(item);

      if (
        typeof occurrenceKey !== "string" ||
        (action !== "undo" && !identity)
      ) {
        return;
      }

      actionInProgressRef.current = true;
      setActionInProgress(item.id);

      try {
        if (action === "undo") {
          await undoMedicineOccurrenceAction(occurrenceKey);
        } else if (identity) {
          await markMedicineOccurrence(identity, action);
        }

        await refreshTimeline();
      } catch {
        Alert.alert(
          t("today.actionErrorTitle"),
          t("today.actionErrorMessage")
        );
      } finally {
        actionInProgressRef.current = false;
        setActionInProgress(null);
      }
    },
    [refreshTimeline, t]
  );

  const applySnooze = useCallback(
    async (durationMinutes: (typeof SNOOZE_MINUTES)[number]) => {
      if (!snoozeItem || actionInProgressRef.current) {
        return;
      }

      const identity = getMedicineOccurrenceIdentity(snoozeItem);

      if (!identity) {
        return;
      }

      actionInProgressRef.current = true;
      setActionInProgress(snoozeItem.id);

      try {
        await snoozeMedicineOccurrence(identity, durationMinutes);
        setSnoozeItem(null);
        await refreshTimeline();
      } catch {
        Alert.alert(
          t("today.actionErrorTitle"),
          t("today.snoozeErrorMessage")
        );
      } finally {
        actionInProgressRef.current = false;
        setActionInProgress(null);
      }
    },
    [refreshTimeline, snoozeItem, t]
  );

  const getStatusLabel = (item: TodayTimelineItem) => {
    if (item.status === "taken") {
      return t("today.taken");
    }

    if (item.status === "skipped") {
      return t("today.skipped");
    }

    if (item.status === "snoozed") {
      return t("today.snoozed");
    }

    return t(item.status === "past" ? "today.past" : "today.upcoming");
  };

  const renderTimelineItem = (item: TodayTimelineItem) => {
    const hasMedicineAction =
      item.status === "taken" ||
      item.status === "skipped" ||
      item.status === "snoozed";
    const isBusy = actionInProgress === item.id;

    return (
      <View key={item.id} style={styles.timelineItem}>
        <View style={styles.timelineRow}>
          <Text style={styles.timelineTime}>
            {formatTime.format(item.scheduledAt)}
          </Text>
          <View style={styles.timelineDetails}>
            <Text style={styles.timelineTitle} numberOfLines={2}>
              <Text style={styles.timelineIcon}>{item.icon} </Text>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.timelineSubtitle}>{item.subtitle}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.statusPill,
              item.status === "past" && styles.pastPill,
              item.status === "upcoming" && styles.upcomingPill,
              item.status === "taken" && styles.takenPill,
              item.status === "skipped" && styles.skippedPill,
              item.status === "snoozed" && styles.snoozedPill,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "past" && styles.pastText,
                item.status === "upcoming" && styles.upcomingText,
                item.status === "taken" && styles.takenText,
                item.status === "skipped" && styles.skippedText,
                item.status === "snoozed" && styles.snoozedText,
              ]}
            >
              {item.status === "taken" ? "✓ " : ""}
              {getStatusLabel(item)}
            </Text>
          </View>
        </View>

        {item.type === "medicine" ? (
          <View style={styles.medicineActions}>
            {hasMedicineAction ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => void runMedicineAction(item, "undo")}
                style={styles.undoButton}
              >
                <Text style={styles.undoButtonText}>{t("today.undo")}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void runMedicineAction(item, "taken")}
                  style={[styles.actionButton, styles.takeButton]}
                >
                  <Text style={[styles.actionButtonText, styles.takeButtonText]}>
                    {t("today.take")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setSnoozeItem(item)}
                  style={[styles.actionButton, styles.snoozeButton]}
                >
                  <Text
                    style={[styles.actionButtonText, styles.snoozeButtonText]}
                  >
                    {t("today.snooze")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void runMedicineAction(item, "skipped")}
                  style={[styles.actionButton, styles.skipButton]}
                >
                  <Text style={[styles.actionButtonText, styles.skipButtonText]}>
                    {t("today.skip")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredState}>
          <Text style={styles.emptyText}>{t("home.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>{t("tabs.today")}</Text>
            <Text style={styles.countText}>
              {t("today.reminderCount", { count: timeline.items.length })}
            </Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryText}>
              {t("today.summary", {
                past: timeline.pastItems.length,
                upcoming: upcomingCount,
              })}
            </Text>
          </View>
        </View>

        {!snapshot.masterEnabled ? (
          <View style={styles.pausedCard}>
            <Text style={styles.pausedIcon}>⏸️</Text>
            <Text style={styles.pausedTitle}>{t("today.paused")}</Text>
            <Text style={styles.pausedMessage}>{t("today.pausedMessage")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.nextCard}>
              <Text style={styles.nextLabel}>{t("today.nextReminder")}</Text>
              {timeline.nextItem ? (
                <>
                  <View style={styles.nextTitleRow}>
                    <Text style={styles.nextIcon}>{timeline.nextItem.icon}</Text>
                    <Text style={styles.nextTitle} numberOfLines={2}>
                      {timeline.nextItem.title}
                    </Text>
                  </View>
                  <Text style={styles.nextTime}>
                    {formatTime.format(timeline.nextItem.scheduledAt)}
                  </Text>
                  <Text style={styles.nextRelative}>
                    {formatRelativeTime(timeline.nextItem, now, t)}
                  </Text>
                </>
              ) : (
                <Text style={styles.noMoreText}>{t("today.noMore")}</Text>
              )}
            </View>

            {timeline.pastItems.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("today.earlier")}</Text>
                <View style={styles.sectionCard}>
                  {timeline.pastItems.map(renderTimelineItem)}
                </View>
              </View>
            ) : null}

            {timeline.laterItems.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("today.laterToday")}</Text>
                <View style={styles.sectionCard}>
                  {timeline.laterItems.map(renderTimelineItem)}
                </View>
              </View>
            ) : null}

            {!timeline.nextItem ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyText}>{t("today.allCaughtUp")}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => setSnoozeItem(null)}
        transparent
        visible={snoozeItem !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.snoozeModal}>
            <Text style={styles.snoozeModalTitle}>{t("today.snoozeFor")}</Text>
            <View style={styles.snoozeOptions}>
              {SNOOZE_MINUTES.map((minutes) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={actionInProgress !== null}
                  key={minutes}
                  onPress={() => void applySnooze(minutes)}
                  style={styles.snoozeOption}
                >
                  <Text style={styles.snoozeOptionText}>
                    {t("today.minutesOption", { count: minutes })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={actionInProgress !== null}
              onPress={() => setSnoozeItem(null)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FAFD",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    color: "#17324D",
    fontSize: 30,
    fontWeight: "800",
  },
  countText: {
    marginTop: 3,
    color: "#6B7D8D",
    fontSize: 14,
  },
  summaryPill: {
    marginTop: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E6F4FE",
  },
  summaryText: {
    color: "#2875A8",
    fontSize: 12,
    fontWeight: "700",
  },
  nextCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#DDF3FF",
    borderWidth: 1,
    borderColor: "#B9E4FA",
  },
  nextLabel: {
    color: "#2574A8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  nextTitleRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  nextIcon: {
    marginRight: 10,
    fontSize: 29,
  },
  nextTitle: {
    flex: 1,
    color: "#17324D",
    fontSize: 22,
    fontWeight: "800",
  },
  nextTime: {
    marginTop: 14,
    color: "#17324D",
    fontSize: 27,
    fontWeight: "800",
  },
  nextRelative: {
    marginTop: 2,
    color: "#2875A8",
    fontSize: 14,
    fontWeight: "700",
  },
  noMoreText: {
    marginTop: 15,
    color: "#456274",
    fontSize: 17,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 9,
    color: "#526C7C",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sectionCard: {
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EDF3",
  },
  timelineItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDE8EE",
  },
  timelineRow: {
    minHeight: 74,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  timelineTime: {
    width: 72,
    color: "#526C7C",
    fontSize: 13,
    fontWeight: "700",
  },
  timelineDetails: {
    flex: 1,
    paddingHorizontal: 7,
  },
  timelineIcon: {
    fontSize: 17,
  },
  timelineTitle: {
    color: "#203B50",
    fontSize: 15,
    fontWeight: "700",
  },
  timelineSubtitle: {
    marginTop: 3,
    color: "#758795",
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pastPill: {
    backgroundColor: "#EFF3F5",
  },
  upcomingPill: {
    backgroundColor: "#E8F7EE",
  },
  takenPill: {
    backgroundColor: "#DDF5E7",
  },
  skippedPill: {
    backgroundColor: "#F0F2F4",
  },
  snoozedPill: {
    backgroundColor: "#FFF2D8",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  pastText: {
    color: "#7A8993",
  },
  upcomingText: {
    color: "#2D8151",
  },
  takenText: {
    color: "#247348",
  },
  skippedText: {
    color: "#6F7B84",
  },
  snoozedText: {
    color: "#9A641D",
  },
  medicineActions: {
    paddingHorizontal: 13,
    paddingBottom: 12,
    paddingLeft: 92,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  actionButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  takeButton: {
    backgroundColor: "#E4F6EB",
    borderColor: "#B9E5CB",
  },
  takeButtonText: {
    color: "#26784B",
  },
  snoozeButton: {
    backgroundColor: "#FFF4DE",
    borderColor: "#F3D6A0",
  },
  snoozeButtonText: {
    color: "#94601B",
  },
  skipButton: {
    backgroundColor: "#F4F6F7",
    borderColor: "#DDE3E7",
  },
  skipButtonText: {
    color: "#63727C",
  },
  undoButton: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: "#2875A8",
    fontSize: 12,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 35, 50, 0.42)",
  },
  snoozeModal: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  snoozeModalTitle: {
    color: "#203B50",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  snoozeOptions: {
    marginTop: 17,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  snoozeOption: {
    width: "48%",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 13,
    backgroundColor: "#EAF5FC",
  },
  snoozeOptionText: {
    color: "#256F9F",
    fontSize: 14,
    fontWeight: "800",
  },
  modalCancelButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#657784",
    fontSize: 14,
    fontWeight: "700",
  },
  pausedCard: {
    marginTop: 24,
    padding: 24,
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EDF3",
  },
  pausedIcon: {
    fontSize: 28,
  },
  pausedTitle: {
    marginTop: 10,
    color: "#29475B",
    fontSize: 18,
    fontWeight: "800",
  },
  pausedMessage: {
    marginTop: 7,
    color: "#71828E",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyCard: {
    marginTop: 24,
    padding: 24,
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    color: "#FFFFFF",
    backgroundColor: "#68B88B",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 40,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    color: "#5B7180",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});

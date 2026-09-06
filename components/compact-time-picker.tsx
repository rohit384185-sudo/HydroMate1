import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocalization } from "@/localization";

const QUICK_MINUTES = [0, 10, 20, 30, 40, 50];
const ALL_MINUTES = Array.from({ length: 60 }, (_, minute) => minute);
const MINUTE_ROW_HEIGHT = 42;

type CompactTimePickerProps = {
  visible: boolean;
  value: string;
  onCancel: () => void;
  onDone: (time: string) => void;
};

function parseTime(value: string) {
  const [savedHour, savedMinute] = value.split(":").map(Number);
  const validHour = Number.isInteger(savedHour) && savedHour >= 0 && savedHour <= 23;
  const validMinute =
    Number.isInteger(savedMinute) && savedMinute >= 0 && savedMinute <= 59;
  const hour24 = validHour ? savedHour : 9;
  const minute = validMinute ? savedMinute : 0;

  return {
    hour: hour24 % 12 || 12,
    minute,
    period: (hour24 >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}

export function CompactTimePicker({
  visible,
  value,
  onCancel,
  onDone,
}: CompactTimePickerProps) {
  const { t } = useLocalization();
  const initialTime = parseTime(value);
  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initialTime.period);
  const [showCustomMinutes, setShowCustomMinutes] = useState(
    !QUICK_MINUTES.includes(initialTime.minute)
  );
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextTime = parseTime(value);
    setHour(nextTime.hour);
    setMinute(nextTime.minute);
    setPeriod(nextTime.period);
    setShowCustomMinutes(!QUICK_MINUTES.includes(nextTime.minute));
  }, [value, visible]);

  const confirmTime = () => {
    if (
      !Number.isInteger(hour) ||
      hour < 1 ||
      hour > 12 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59
    ) {
      Alert.alert(t("reminders.invalidTimeTitle"), t("reminders.invalidTime"));
      return;
    }

    let hour24 = hour;

    if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    onDone(
      `${hour24.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("reminders.selectTime")}</Text>
          <Text style={styles.selectedTime}>
            ⏰ {hour}:{minute.toString().padStart(2, "0")} {t(
              period === "AM" ? "common.am" : "common.pm"
            )}
          </Text>

          <View style={styles.compactSection}>
            <Text style={styles.sectionLabel}>{t("reminders.hour")}</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setHour((current) => (current === 1 ? 12 : current - 1))}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.hourValue}>{hour}</Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setHour((current) => (current === 12 ? 1 : current + 1))}
              >
                <Text style={styles.stepButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.compactSection}>
            <Text style={styles.sectionLabel}>{t("reminders.minutes")}</Text>
            <View style={styles.minuteGrid}>
              {QUICK_MINUTES.map((quickMinute) => (
                <TouchableOpacity
                  key={quickMinute}
                  style={[
                    styles.minuteButton,
                    minute === quickMinute &&
                      !showCustomMinutes &&
                      styles.selectedButton,
                  ]}
                  onPress={() => {
                    setMinute(quickMinute);
                    setShowCustomMinutes(false);
                  }}
                >
                  <Text style={styles.minuteButtonText}>
                    {quickMinute.toString().padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.customButton,
                  showCustomMinutes && styles.selectedButton,
                ]}
                onPress={() => setShowCustomMinutes(true)}
              >
                <Text style={styles.minuteButtonText}>
                  {t("reminders.customMinute")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showCustomMinutes && (
            <View style={styles.customMinuteCard}>
              <Text style={styles.customMinuteTitle}>
                {t("reminders.selectCustomTime")} · {t("reminders.minute")}
              </Text>
              <ScrollView
                ref={minuteScrollRef}
                style={styles.minuteScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  minuteScrollRef.current?.scrollTo({
                    y: Math.max(0, minute * MINUTE_ROW_HEIGHT - MINUTE_ROW_HEIGHT),
                    animated: false,
                  });
                }}
              >
                {ALL_MINUTES.map((customMinute) => (
                  <TouchableOpacity
                    key={customMinute}
                    style={[
                      styles.minuteRow,
                      minute === customMinute && styles.selectedButton,
                    ]}
                    onPress={() => setMinute(customMinute)}
                  >
                    <Text
                      style={[
                        styles.minuteRowText,
                        minute === customMinute && styles.selectedText,
                      ]}
                    >
                      {customMinute.toString().padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.periodRow}>
            {(["AM", "PM"] as const).map((nextPeriod) => (
              <TouchableOpacity
                key={nextPeriod}
                style={[
                  styles.periodButton,
                  period === nextPeriod && styles.selectedButton,
                ]}
                onPress={() => setPeriod(nextPeriod)}
              >
                <Text style={styles.periodText}>
                  {t(nextPeriod === "AM" ? "common.am" : "common.pm")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerButton} onPress={onCancel}>
              <Text style={styles.cancelText}>✕ {t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.doneButton]}
              onPress={confirmTime}
            >
              <Text style={styles.doneText}>✓ {t("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  selectedTime: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 27,
    fontWeight: "700",
    textAlign: "center",
    color: "#1677a8",
  },
  compactSection: {
    marginBottom: 10,
  },
  sectionLabel: {
    marginBottom: 5,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  stepButton: {
    width: 48,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#9db7c6",
  },
  stepButtonText: {
    fontSize: 26,
    fontWeight: "700",
  },
  hourValue: {
    minWidth: 46,
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  minuteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  minuteButton: {
    width: 43,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#9db7c6",
  },
  customButton: {
    minWidth: 78,
    height: 42,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#9db7c6",
  },
  minuteButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectedButton: {
    borderColor: "#65acd1",
    backgroundColor: "#dff3ff",
  },
  customMinuteCard: {
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#b9dff5",
    backgroundColor: "#f7fcff",
  },
  customMinuteTitle: {
    marginBottom: 4,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  minuteScroll: {
    height: 126,
  },
  minuteRow: {
    height: MINUTE_ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  minuteRowText: {
    fontSize: 18,
    fontWeight: "500",
  },
  selectedText: {
    fontWeight: "700",
    color: "#1677a8",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  periodButton: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#9db7c6",
  },
  periodText: {
    fontSize: 18,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 8,
  },
  footerButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#65acd1",
  },
  doneButton: {
    backgroundColor: "#1677a8",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1677a8",
  },
  doneText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});

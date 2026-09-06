export const ASSISTANT_SPEECH_GRACE_MILLIS = 1_250;
export const ASSISTANT_REMINDER_MIN_WAIT_MILLIS = 7_000;
export const ASSISTANT_CONFIRMATION_MIN_WAIT_MILLIS = 10_000;
export const ASSISTANT_SPEECH_END_FALLBACK_MILLIS = 2_500;
// Post-verified-save only; never a persistence deadline.
export const ASSISTANT_SUCCESS_SPEECH_FALLBACK_MILLIS = 4_000;

export function getAssistantTurnResponseWaitMillis(
  configuredWaitMillis: number,
  confirmationTurn: boolean,
  activeReminder = false
) {
  return confirmationTurn
    ? Math.max(configuredWaitMillis, ASSISTANT_CONFIRMATION_MIN_WAIT_MILLIS)
    : activeReminder
      ? Math.max(configuredWaitMillis, ASSISTANT_REMINDER_MIN_WAIT_MILLIS)
      : configuredWaitMillis;
}

export type SpeechTranscriptDeliveryState = {
  sessionId: number;
  deliveredSessionId?: number;
};

export type InitialSilenceTimeoutState = {
  assistantSessionId: number;
  speechSessionId: number;
  active: boolean;
  speechActivityDetected: boolean;
};

export const inactiveInitialSilenceTimeoutState: InitialSilenceTimeoutState = {
  assistantSessionId: 0,
  speechSessionId: 0,
  active: false,
  speechActivityDetected: false,
};

export function beginInitialSilenceTimeout(
  assistantSessionId: number,
  speechSessionId: number
): InitialSilenceTimeoutState {
  return {
    assistantSessionId,
    speechSessionId,
    active: true,
    speechActivityDetected: false,
  };
}

export function markInitialSilenceSpeechActivity(
  state: InitialSilenceTimeoutState,
  assistantSessionId: number,
  speechSessionId: number
): InitialSilenceTimeoutState {
  if (
    !state.active ||
    state.assistantSessionId !== assistantSessionId ||
    state.speechSessionId !== speechSessionId
  ) {
    return state;
  }

  return { ...state, active: false, speechActivityDetected: true };
}

export function claimInitialSilenceTimeout(
  state: InitialSilenceTimeoutState,
  assistantSessionId: number,
  speechSessionId: number
) {
  const claimed =
    state.active &&
    !state.speechActivityDetected &&
    state.assistantSessionId === assistantSessionId &&
    state.speechSessionId === speechSessionId;

  return {
    claimed,
    assistantSessionId: claimed ? state.assistantSessionId : undefined,
    state: claimed
      ? { ...state, active: false }
      : state,
  };
}

export function beginSpeechTranscriptSession(
  state: SpeechTranscriptDeliveryState
): SpeechTranscriptDeliveryState {
  return { sessionId: state.sessionId + 1 };
}

export function cancelSpeechTranscriptSession(
  state: SpeechTranscriptDeliveryState
): SpeechTranscriptDeliveryState {
  return { ...state, deliveredSessionId: state.sessionId };
}

export function claimSpeechTranscript(
  state: SpeechTranscriptDeliveryState,
  transcript: string
) {
  const normalizedTranscript = transcript.trim();

  if (
    !normalizedTranscript ||
    state.deliveredSessionId === state.sessionId
  ) {
    return { state, transcript: undefined, sessionId: state.sessionId };
  }

  return {
    state: { ...state, deliveredSessionId: state.sessionId },
    transcript: normalizedTranscript,
    sessionId: state.sessionId,
  };
}

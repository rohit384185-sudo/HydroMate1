export type AssistantRuntimeState = {
  active: boolean;
  assistantSessionId: number;
  latestSpeechSessionId: number;
  turnId: number;
};

export const inactiveAssistantRuntimeState: AssistantRuntimeState = {
  active: false,
  assistantSessionId: 0,
  latestSpeechSessionId: 0,
  turnId: 0,
};

export function beginAssistantRuntimeSession(
  assistantSessionId: number
): AssistantRuntimeState {
  return {
    active: assistantSessionId > 0,
    assistantSessionId,
    latestSpeechSessionId: 0,
    turnId: 0,
  };
}

export function claimAssistantSpeechTurn(
  state: AssistantRuntimeState,
  assistantSessionId: number,
  speechSessionId: number
) {
  const accepted =
    state.active &&
    state.assistantSessionId === assistantSessionId &&
    speechSessionId > state.latestSpeechSessionId;
  const nextState = accepted
    ? {
        ...state,
        latestSpeechSessionId: speechSessionId,
        turnId: state.turnId + 1,
      }
    : state;

  return { accepted, turnId: nextState.turnId, state: nextState };
}

export function beginAssistantManualTurn(state: AssistantRuntimeState) {
  const nextState = state.active
    ? { ...state, turnId: state.turnId + 1 }
    : state;
  return { accepted: state.active, turnId: nextState.turnId, state: nextState };
}

export function isCurrentAssistantTurn(
  state: AssistantRuntimeState,
  assistantSessionId: number,
  turnId: number
) {
  return (
    state.active &&
    state.assistantSessionId === assistantSessionId &&
    state.turnId === turnId
  );
}

export function clearAssistantRuntimeState(
  state: AssistantRuntimeState
): AssistantRuntimeState {
  return { ...state, active: false };
}

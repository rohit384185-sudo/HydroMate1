import { useCallback, useEffect, useRef, useState } from "react";

export function useHydroMateAssistant() {
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [assistantSessionId, setAssistantSessionId] = useState(0);
  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (wasVisibleRef.current && !assistantVisible && __DEV__) {
      console.log(`HydroMateAssistantConfirm assistantSession=${assistantSessionId} modal=hidden`);
    }
    wasVisibleRef.current = assistantVisible;
  }, [assistantVisible, assistantSessionId]);

  const startHydroMateAssistant = useCallback(() => {
    setAssistantSessionId((current) => current + 1);
    setAssistantVisible(true);
  }, []);

  const closeHydroMateAssistant = useCallback(() => {
    setAssistantVisible(false);
  }, []);

  return {
    assistantVisible,
    assistantSessionId,
    startHydroMateAssistant,
    closeHydroMateAssistant,
  };
}

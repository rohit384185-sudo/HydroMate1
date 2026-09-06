import { useSyncExternalStore } from "react";

import type {
  WakeWordDiagnosticEvent,
} from "../modules/hydromate-wake-word";
import type { WakeWordCandidateSummary } from "./wakeWordCandidateState";
import type { WakeWordStatus } from "./wakeWordState";
import type { SpeakerVerificationSensitivity } from "./speakerProfileStorageService";

export type WakeWordSettingsController = {
  available: boolean;
  enabled: boolean;
  status: WakeWordStatus;
  responseWaitSeconds: number;
  diagnostic: WakeWordDiagnosticEvent | null;
  candidateSummary: WakeWordCandidateSummary | null;
  debugAudioCaptureEnabled: boolean;
  voiceRemindersEnabled: boolean;
  speakerVerificationEnabled: boolean;
  speakerVerificationSensitivity: SpeakerVerificationSensitivity;
  setEnabled: (enabled: boolean) => void;
  setResponseWaitSeconds: (seconds: number) => Promise<number>;
  setDebugAudioCaptureEnabled: (enabled: boolean) => void;
  setSpeakerVerificationEnabled: (enabled: boolean) => Promise<void>;
  setSpeakerVerificationSensitivity: (
    sensitivity: SpeakerVerificationSensitivity
  ) => Promise<void>;
  openLanguageSettings: () => void;
  openVoiceReminderSettings: () => void;
  openFeedback: () => void;
  openProfileSettings: () => void;
  resetProfileSettings: () => void;
  pauseForSpeakerEnrollment: () => Promise<void>;
  resumeAfterSpeakerEnrollment: () => void;
};

type Listener = () => void;

let controller: WakeWordSettingsController | null = null;
let controllerOwner: object | null = null;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function publishWakeWordSettingsController(
  owner: object,
  nextController: WakeWordSettingsController
) {
  controllerOwner = owner;
  controller = nextController;
  emitChange();
}

export function clearWakeWordSettingsController(owner: object) {
  if (controllerOwner !== owner) return;
  controllerOwner = null;
  controller = null;
  emitChange();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return controller;
}

export function useWakeWordSettingsController() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

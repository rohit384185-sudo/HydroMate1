import {
  NativeModule,
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";
import { Platform } from "react-native";

export type WakeWordConfiguration = {
  threshold: number;
  releaseThreshold: number;
  consecutiveFrames: number;
  cooldownMillis: number;
  diagnosticIntervalMillis: number;
  diagnosticsEnabled: boolean;
  calibrationOnly: boolean;
  speakerVerificationEnabled: boolean;
  speakerVerificationSensitivity: "lenient" | "balanced" | "strict";
};

export type WakeWordDetectedEvent = {
  score: number;
  detectedAtMillis: number;
};

export type WakeWordDiagnosticEvent = {
  score: number;
  peakScore: number;
  consecutiveFrames: number;
  state: string;
  observedAtMillis: number;
};

export type SpeakerEnrollmentSample = {
  filename: string;
  path: string;
  durationMillis: number;
};

type WakeWordEvents = {
  onWakeWordDetected(event: WakeWordDetectedEvent): void;
  onWakeWordDiagnostic(event: WakeWordDiagnosticEvent): void;
  onWakeWordError(event: { message: string }): void;
};

declare class HydroMateWakeWordNativeModule extends NativeModule<WakeWordEvents> {
  startWakeWordListening(
    configuration: WakeWordConfiguration
  ): Promise<boolean>;
  stopWakeWordListening(): Promise<void>;
  isWakeWordListening(): boolean;
  setDebugCandidateAudioCaptureEnabled(enabled: boolean): boolean;
  listDebugWakeAudioFiles(): Promise<string[]>;
  clearDebugWakeAudioFiles(): Promise<number>;
  beginSpeakerEnrollment(): Promise<boolean>;
  recordSpeakerEnrollmentSample(
    sampleNumber: number
  ): Promise<SpeakerEnrollmentSample>;
  commitSpeakerEnrollment(): Promise<string[]>;
  ensureSpeakerProfile(): Promise<boolean>;
  cancelSpeakerEnrollment(): boolean;
}

const nativeModule =
  requireOptionalNativeModule<HydroMateWakeWordNativeModule>(
    "HydroMateWakeWord"
  );

export const isNativeWakeWordAvailable =
  Platform.OS === "android" && nativeModule !== null;

export async function startWakeWordListening(
  configuration: WakeWordConfiguration
) {
  if (!nativeModule) {
    return false;
  }

  return nativeModule.startWakeWordListening(configuration);
}

export async function stopWakeWordListening() {
  await nativeModule?.stopWakeWordListening();
}

export function isWakeWordListening() {
  return nativeModule?.isWakeWordListening() ?? false;
}

export function setDebugCandidateAudioCaptureEnabled(enabled: boolean) {
  return nativeModule?.setDebugCandidateAudioCaptureEnabled(enabled) ?? false;
}

export async function listDebugWakeAudioFiles() {
  return (await nativeModule?.listDebugWakeAudioFiles()) ?? [];
}

export async function clearDebugWakeAudioFiles() {
  return (await nativeModule?.clearDebugWakeAudioFiles()) ?? 0;
}

export async function beginSpeakerEnrollment() {
  if (!nativeModule) {
    throw new Error("Speaker enrollment recording is unavailable");
  }
  return nativeModule.beginSpeakerEnrollment();
}

export async function recordSpeakerEnrollmentSample(sampleNumber: number) {
  if (!nativeModule) {
    throw new Error("Speaker enrollment recording is unavailable");
  }
  return nativeModule.recordSpeakerEnrollmentSample(sampleNumber);
}

export async function commitSpeakerEnrollment() {
  if (!nativeModule) {
    throw new Error("Speaker enrollment recording is unavailable");
  }
  return nativeModule.commitSpeakerEnrollment();
}

export async function ensureSpeakerProfile() {
  if (!nativeModule) return false;
  return nativeModule.ensureSpeakerProfile();
}

export function cancelSpeakerEnrollment() {
  return nativeModule?.cancelSpeakerEnrollment() ?? false;
}

export function addWakeWordDetectedListener(
  listener: (event: WakeWordDetectedEvent) => void
): EventSubscription {
  if (!nativeModule) {
    return { remove() {} };
  }

  return nativeModule.addListener("onWakeWordDetected", listener);
}

export function addWakeWordDiagnosticListener(
  listener: (event: WakeWordDiagnosticEvent) => void
): EventSubscription {
  if (!nativeModule) {
    return { remove() {} };
  }

  return nativeModule.addListener("onWakeWordDiagnostic", listener);
}

export function addWakeWordErrorListener(
  listener: (event: { message: string }) => void
): EventSubscription {
  if (!nativeModule) {
    return { remove() {} };
  }

  return nativeModule.addListener("onWakeWordError", listener);
}

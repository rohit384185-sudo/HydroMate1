export {
  addWakeWordDetectedListener,
  addWakeWordDiagnosticListener,
  addWakeWordErrorListener,
  beginSpeakerEnrollment,
  cancelSpeakerEnrollment,
  clearDebugWakeAudioFiles,
  commitSpeakerEnrollment,
  ensureSpeakerProfile,
  isNativeWakeWordAvailable,
  isWakeWordListening,
  listDebugWakeAudioFiles,
  recordSpeakerEnrollmentSample,
  setDebugCandidateAudioCaptureEnabled,
  startWakeWordListening,
  stopWakeWordListening,
} from "./src/HydroMateWakeWordModule";

export type {
  WakeWordConfiguration,
  WakeWordDetectedEvent,
  WakeWordDiagnosticEvent,
  SpeakerEnrollmentSample,
} from "./src/HydroMateWakeWordModule";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-wake-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [
  compiler,
  "services/wakeWordState.ts",
  "--module", "commonjs",
  "--target", "es2022",
  "--outDir", output,
  "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const state = require(path.join(output, "wakeWordState.js"));
const base = {
  enabled: true,
  appActive: true,
  assistantVisible: false,
  nativeAvailable: true,
  permissionGranted: true,
};
assert.equal(state.shouldWakeWordListen(base), true);
assert.equal(state.shouldWakeWordListen({ ...base, enabled: false }), false);
assert.equal(state.shouldWakeWordListen({ ...base, appActive: false }), false);
assert.equal(state.shouldWakeWordListen({ ...base, assistantVisible: true }), false);
assert.equal(state.shouldWakeWordListen({ ...base, permissionGranted: false }), false);
assert.equal(state.getInactiveWakeWordStatus({ ...base, assistantVisible: true }), "paused");
assert.equal(state.getInactiveWakeWordStatus({ ...base, appActive: false }), "stopped");
assert.equal(state.getInactiveWakeWordStatus({ ...base, permissionGranted: false }), "permission-required");
assert.equal(state.getInactiveWakeWordStatus({ ...base, enabled: false, nativeAvailable: false }), "unavailable");

const first = state.claimWakeWordEvent(0, 10_000);
assert.equal(first.claimed, true);
assert.equal(state.claimWakeWordEvent(first.detectionAtMillis, 10_500).claimed, false);
assert.equal(state.claimWakeWordEvent(first.detectionAtMillis, 12_100).claimed, true);

const expectedModels = {
  "melspectrogram.onnx": "ba2b0e0f8b7b875369a2c89cb13360ff53bac436f2895cced9f479fa65eb176f",
  "embedding_model.onnx": "70d164290c1d095d1d4ee149bc5e00543250a7316b59f31d056cff7bd3075c1f",
  "hey_hydromate.onnx": "48e2783df5d9523450a1bd3d714b7b1d56a63898c42401043d9310a1dcb94945",
  "hey_hydromate_hardneg_v1.onnx": "4f8bbc959e7b4d5eb331adb863a69730f097cba379139d65845dc5d348d9dbd3",
  "hey_hydromate_hardneg_v2_2.onnx": "56a9674ee649e903d36d3c3872b1388fa7764bf61e40c8d7e2923ad9f9fca5d6",
  "hey_hydromate_hardneg_v3_1_single.onnx": "892158891d268caebfb31d2941d05ba374669b10d9bf69f49a6e484de86c584e",
  "3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx": "357a834f702b80161e5b981182c038e18553c1f2ca752ed6cec2052365d4129b",
};
for (const [filename, expectedHash] of Object.entries(expectedModels)) {
  const bytes = fs.readFileSync(path.join(root, "assets", "models", filename));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expectedHash, filename);
}

const engineSource = fs.readFileSync(path.join(
  root,
  "modules/hydromate-wake-word/android/src/main/java/expo/modules/hydromatewakeword/WakeWordEngine.kt"
), "utf8");
assert.match(engineSource, /SAMPLE_RATE = 16_000/);
assert.match(engineSource, /AUDIO_CHUNK_SAMPLES = 1_280/);
assert.match(engineSource, /frame\[index\] \/ 10f \+ 2f/);
assert.match(engineSource, /EMBEDDING_MEL_FRAMES = 76/);
assert.match(engineSource, /CLASSIFIER_EMBEDDINGS = 16/);
assert.match(engineSource, /CLASSIFIER_MODEL_FILE = "hey_hydromate_hardneg_v3_1_single\.onnx"/);
assert.match(engineSource, /CLASSIFIER_MODEL_SHA256 = "892158891d268caebfb31d2941d05ba374669b10d9bf69f49a6e484de86c584e"/);
assert.match(engineSource, /consecutiveStrongFrames >= requiredConsecutiveFrames/);
assert.match(engineSource, /armed = score <= releaseThreshold/);
assert.match(engineSource, /"candidate-rejected"/);
assert.match(engineSource, /"waiting-for-release"/);
assert.match(engineSource, /FLAG_DEBUGGABLE/);
assert.match(engineSource, /wake score=\$\{formatScore\(score\)\}/);
assert.match(engineSource, /debugCandidateAudioCaptureEnabled = false/);
assert.match(engineSource, /DEBUG_AUDIO_DIRECTORY = "wake_debug"/);
assert.match(engineSource, /DEBUG_ROLLING_BUFFER_SECONDS = 3/);
assert.match(engineSource, /MAX_DEBUG_AUDIO_FILES = 50/);
assert.match(engineSource, /appendDebugPcm\(chunk\)/);
assert.match(engineSource, /Thread\(runnable, "HydroMateWakeWordDebugFile"\)/);
assert.match(engineSource, /"RIFF"\.toByteArray\(Charsets\.US_ASCII\)/);
assert.match(engineSource, /"WAVE"\.toByteArray\(Charsets\.US_ASCII\)/);
const detectedDiagnosticIndex = engineSource.indexOf('"detected"');
const wakeConfirmedLogIndex = engineSource.indexOf('Log.d(TAG, "Wake confirmed;');
const confirmedCaptureIndex = engineSource.indexOf('"confirmed",', wakeConfirmedLogIndex);
const stopAfterDetectionIndex = engineSource.indexOf("stopAfterDetection(audioRecord)");
assert.ok(detectedDiagnosticIndex >= 0);
assert.ok(wakeConfirmedLogIndex > detectedDiagnosticIndex);
assert.ok(confirmedCaptureIndex > wakeConfirmedLogIndex);
assert.ok(stopAfterDetectionIndex > confirmedCaptureIndex);
assert.doesNotMatch(
  engineSource.slice(
    engineSource.indexOf("if (consecutiveStrongFrames >= requiredConsecutiveFrames)"),
    detectedDiagnosticIndex
  ),
  /"confirmed",/
);
assert.match(engineSource, /"cooldown"[\s\S]*queueDebugAudioCapture\([\s\S]*"rejected"/);
assert.match(engineSource, /else if \(armed && consecutiveStrongFrames > 0\)[\s\S]*queueDebugAudioCapture\([\s\S]*"rejected"/);
assert.equal((engineSource.match(/AudioRecord\(/g) ?? []).length, 1);
assert.doesNotMatch(engineSource, /Log\.[a-z]+\([^\n]*(audio|samples|transcript)/i);
assert.match(engineSource, /stopAfterDetection\(audioRecord\)[\s\S]*onDetected\(candidatePeak, now\)/);
assert.match(engineSource, /speakerVerifier\.verify\(snapshotDebugPcm\(\)\)/);
assert.match(engineSource, /SpeakerVerificationDecision\.REJECT[\s\S]*"speaker-rejected"[\s\S]*continue/);
assert.ok(engineSource.indexOf("SpeakerVerificationDecision.REJECT") < detectedDiagnosticIndex);
assert.doesNotMatch(engineSource, /SpeechRecognizer|startForegroundService|Service\(/);
const moduleSource = fs.readFileSync(path.join(
  root,
  "modules/hydromate-wake-word/android/src/main/java/expo/modules/hydromatewakeword/HydroMateWakeWordModule.kt"
), "utf8");
assert.match(moduleSource, /OnActivityEntersBackground\s*\{[\s\S]*engine\?\.stop\(\)/);
assert.match(moduleSource, /AsyncFunction\("startWakeWordListening"\) \{ configuration: WakeWordConfiguration ->/);
assert.match(moduleSource, /Events\("onWakeWordDetected", "onWakeWordDiagnostic", "onWakeWordError"\)/);
assert.match(moduleSource, /configuration\.consecutiveFrames/);
assert.match(moduleSource, /configuration\.calibrationOnly/);
assert.match(
  moduleSource,
  /wakeEngine\.setCalibrationOnly\(configuration\.calibrationOnly\)[\s\S]*wakeEngine\.start\(/
);
assert.match(moduleSource, /Function\("setDebugCandidateAudioCaptureEnabled"\)/);
assert.match(moduleSource, /AsyncFunction\("listDebugWakeAudioFiles"\)/);
assert.match(moduleSource, /AsyncFunction\("clearDebugWakeAudioFiles"\)/);
assert.doesNotMatch(moduleSource, /Service|BootReceiver|startForegroundService/);
const gradleSource = fs.readFileSync(path.join(root, "modules/hydromate-wake-word/android/build.gradle"), "utf8");
assert.match(gradleSource, /com\.microsoft\.onnxruntime:onnxruntime-android:1\.29\.0/);
assert.match(gradleSource, /assets\/models/);

const assistantHook = fs.readFileSync(path.join(root, "hooks/useHydroMateAssistant.ts"), "utf8");
const wakeHook = fs.readFileSync(path.join(root, "hooks/useHydroMateWakeWord.ts"), "utf8");
const wakeStateSource = fs.readFileSync(path.join(root, "services/wakeWordState.ts"), "utf8");
const homeSource = fs.readFileSync(path.join(root, "app/(tabs)/index.tsx"), "utf8");
const settingsSource = fs.readFileSync(path.join(root, "app/(tabs)/settings.tsx"), "utf8");
const modalSource = fs.readFileSync(path.join(root, "components/hydromate-assistant-modal.tsx"), "utf8");
assert.doesNotMatch(homeSource, /startHydroMateAssistant\(true\)/);
assert.match(homeSource, /handleWakeWordDetected = useCallback\(\(\) => \{[\s\S]*?startHydroMateAssistant\(\);[\s\S]*?\}, \[startHydroMateAssistant\]\)/);
assert.match(homeSource, /await wakeWord\.pauseForAssistant\(\);[\s\S]*startHydroMateAssistant\(\)/);
assert.match(assistantHook, /setAssistantSessionId\(\(current\) => current \+ 1\);[\s\S]*setAssistantVisible\(true\)/);
assert.match(homeSource, /assistantSessionId=\{assistantSessionId\}/);
assert.match(modalSource, /initializedAssistantSessionRef\.current === assistantSessionId/);
assert.match(modalSource, /await speakRef\.current\(greeting\);[\s\S]*activeAssistantSessionRef\.current === assistantSessionId[\s\S]*await beginListeningRef\.current\(false\)/);
assert.match(modalSource, /\}, \[assistantSessionId, commitPendingState, visible\]\);/);
assert.doesNotMatch(modalSource, /autoListenRequestId|processedAutoListenRequestRef/);
assert.match(modalSource, /useHydroMateSpeechRecognition/);
assert.match(modalSource, /abortListening\(\);[\s\S]*await stopAssistantResponse\(\);[\s\S]*requestAssistantClose\("manual"\)/);
assert.match(wakeStateSource, /threshold: 0\.5/);
assert.match(wakeStateSource, /releaseThreshold: 0\.35/);
assert.match(wakeStateSource, /consecutiveFrames: 3/);
assert.match(wakeHook, /setDebugCandidateAudioCaptureEnabled\(__DEV__ && debugAudioCaptureEnabled\)/);
assert.match(wakeHook, /setDebugCandidateAudioCaptureEnabled\(false\)/);
assert.match(wakeHook, /calibrationOnly: false/);
assert.doesNotMatch(wakeHook, /setDebugCandidateAudioCaptureEnabled\([^\n]*calibrationOnly/);
assert.match(settingsSource, /Debug WAV capture:/);
const detectedEligibility = engineSource.slice(
  engineSource.indexOf("if (consecutiveStrongFrames >= requiredConsecutiveFrames)"),
  detectedDiagnosticIndex
);
assert.match(detectedEligibility, /if \(calibrationOnly\) continue/);
assert.doesNotMatch(detectedEligibility, /debugCandidateAudioCaptureEnabled/);

const enrollmentSource = fs.readFileSync(path.join(
  root,
  "modules/hydromate-wake-word/android/src/main/java/expo/modules/hydromatewakeword/SpeakerEnrollmentRecorder.kt"
), "utf8");
assert.match(enrollmentSource, /SAMPLE_RATE = 16_000/);
assert.match(enrollmentSource, /READ_BUFFER_SAMPLES = 1_280/);
assert.match(enrollmentSource, /CHANNEL_IN_MONO/);
assert.match(enrollmentSource, /ENCODING_PCM_16BIT/);
assert.match(enrollmentSource, /AudioSource\.VOICE_RECOGNITION/);
assert.match(enrollmentSource, /RECORDING_SECONDS_NUMERATOR = 5/);
assert.match(enrollmentSource, /RECORDING_SECONDS_DENOMINATOR = 2/);
assert.match(enrollmentSource, /REQUIRED_SAMPLE_COUNT = 5/);
assert.match(enrollmentSource, /COMPLETED_DIRECTORY = "speaker_enrollment"/);
assert.match(enrollmentSource, /PENDING_DIRECTORY = "speaker_enrollment_pending"/);
assert.match(enrollmentSource, /"RIFF"\.toByteArray\(Charsets\.US_ASCII\)/);
assert.match(enrollmentSource, /"WAVE"\.toByteArray\(Charsets\.US_ASCII\)/);
assert.doesNotMatch(enrollmentSource, /https?:|upload|analytics/i);
assert.match(moduleSource, /AsyncFunction\("beginSpeakerEnrollment"\)/);
assert.match(moduleSource, /AsyncFunction\("recordSpeakerEnrollmentSample"\)/);
assert.match(moduleSource, /AsyncFunction\("commitSpeakerEnrollment"\)/);
assert.match(moduleSource, /stageProfileFromPendingSamples[\s\S]*commitEnrollment[\s\S]*activateStagedProfile/);
assert.match(moduleSource, /AsyncFunction\("ensureSpeakerProfile"\)/);
assert.match(moduleSource, /Function\("cancelSpeakerEnrollment"\)/);
assert.match(wakeHook, /await stopWakeWordListening\(\)/);
assert.match(wakeHook, /pauseForSpeakerEnrollment/);
assert.match(wakeHook, /resumeAfterSpeakerEnrollment/);
assert.match(
  wakeHook,
  /pauseForSpeakerEnrollment = useCallback\(async \(\) => \{[\s\S]*?\+\+reconcileSequenceRef\.current;[\s\S]*?await stopWakeWordListening\(\)/
);
assert.match(settingsSource, /await controller\.pauseForSpeakerEnrollment\(\)/);
assert.match(settingsSource, /await beginSpeakerEnrollment\(\)/);
assert.match(settingsSource, /await commitSpeakerEnrollment\(\)/);
assert.match(settingsSource, /SPEAKER_PROFILE_ENROLLED_KEY, "true"/);

const speakerVerifierSource = fs.readFileSync(path.join(
  root,
  "modules/hydromate-wake-word/android/src/main/java/expo/modules/hydromatewakeword/SpeakerVerifier.kt"
), "utf8");
assert.match(speakerVerifierSource, /MODEL_FILENAME = "3dspeaker_speech_campplus_sv_en_voxceleb_16k\.onnx"/);
assert.match(speakerVerifierSource, /MODEL_SHA256 = "357a834f702b80161e5b981182c038e18553c1f2ca752ed6cec2052365d4129b"/);
assert.match(speakerVerifierSource, /EMBEDDING_DIMENSION = 512/);
assert.match(speakerVerifierSource, /LENIENT_THRESHOLD = 0\.45f/);
assert.match(speakerVerifierSource, /BALANCED_THRESHOLD = 0\.55f/);
assert.match(speakerVerifierSource, /STRICT_THRESHOLD = 0\.65f/);
assert.match(speakerVerifierSource, /if \(!enabled\) return SpeakerVerificationResult\(SpeakerVerificationDecision\.DISABLED\)/);
assert.match(speakerVerifierSource, /SpeakerVerificationDecision\.NOT_READY/);
assert.match(speakerVerifierSource, /SpeakerVerificationDecision\.ERROR/);
assert.match(speakerVerifierSource, /cosineSimilarity\(profile, query\)/);
assert.doesNotMatch(speakerVerifierSource, /https?:|upload|analytics/i);

const preferenceSource = fs.readFileSync(path.join(root, "services/wakeWordService.ts"), "utf8");
assert.match(preferenceSource, /hydromate-wake-word-enabled/);
assert.match(preferenceSource, /hydromate-wake-word-consent-v1/);

const localeFiles = ["en", "hi", "bn", "mr", "ta", "te", "gu", "kn", "ml", "pa", "bho", "bgc"];
const wakeKeys = [
  "wakeWord.title", "wakeWord.consentTitle", "wakeWord.privacyExplanation",
  "wakeWord.batteryNotice", "wakeWord.enable", "wakeWord.foregroundExplanation",
  "wakeWord.listening", "wakeWord.paused", "wakeWord.permissionRequired",
  "wakeWord.unavailable", "wakeWord.foregroundOnly", "wakeWord.off",
  "wakeWord.responseWaitTitle", "wakeWord.responseWaitExplanation",
  "wakeWord.secondsShort", "wakeWord.custom", "wakeWord.customSecondsPlaceholder",
  "wakeWord.saveResponseWait", "wakeWord.responseWaitRange",
];
const speakerKeys = [
  "speakerVerification.title", "speakerVerification.off",
  "speakerVerification.setupRequired", "speakerVerification.ready",
  "speakerVerification.setup", "speakerVerification.rerecord",
  "speakerVerification.privacy", "speakerVerification.setupTitle",
  "speakerVerification.setupExplanation", "speakerVerification.continue",
  "speakerVerification.nextStep", "speakerVerification.enrollmentInstruction",
  "speakerVerification.sampleProgress", "speakerVerification.listening",
  "speakerVerification.sampleRecorded", "speakerVerification.readyToRecord",
  "speakerVerification.record", "speakerVerification.tryAgain",
  "speakerVerification.useSample", "speakerVerification.errorTitle",
  "speakerVerification.errorMessage", "speakerVerification.completeTitle",
  "speakerVerification.completeMessage",
  "speakerVerification.sensitivity", "speakerVerification.sensitivity.lenient",
  "speakerVerification.sensitivity.balanced", "speakerVerification.sensitivity.strict",
];
const settingsKeys = [
  "settings.reminderCategorySummary", "settings.stateOn", "settings.stateOff",
  "settings.profileName", "settings.profilePhone", "settings.profileAge",
  "settings.profileGender", "settings.profileWeight", "settings.notSet",
  "settings.kilograms", "settings.logout", "settings.logoutConfirmTitle",
  "settings.logoutConfirmMessage", "settings.logoutErrorTitle",
  "settings.logoutErrorMessage", "settings.resetProfile",
  "settings.resetProfileConfirmTitle", "settings.resetProfileConfirmMessage",
  "profile.phoneReadOnly", "profile.optionalFields", "profile.agePlaceholder",
  "profile.ageError", "profile.genderMale", "profile.genderFemale",
  "profile.genderPreferNotToSay", "profile.weightPlaceholder",
  "profile.weightError", "settings.dailyWaterGoal", "settings.milliliters",
  "settings.wakeWordPrivacyTitle",
  "settings.wakeWordPrivacyText", "settings.speakerProfileTitle",
  "settings.speakerProfileText", "settings.deleteVoiceProfile",
  "settings.deleteVoiceProfileConfirmTitle",
  "settings.deleteVoiceProfileConfirmMessage", "settings.voiceProfileDeleted",
  "settings.clearWakeDebugRecordings", "settings.debugRecordingsClearedTitle",
  "settings.debugRecordingsClearedMessage", "settings.appInformation",
  "settings.versionValue", "settings.buildValue", "settings.updateErrorTitle",
  "settings.updateErrorMessage",
];
const wakeSources = Object.fromEntries(localeFiles.map((language) => [
  language,
  fs.readFileSync(path.join(root, "localization", `${language}.ts`), "utf8"),
]));
const placeholderPattern = /\{([^}]+)\}/g;
const readTranslation = (source, key) =>
  source.match(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*"([^"]*)"`))?.[1] ?? "";
for (const language of localeFiles) {
  const source = wakeSources[language];
  for (const key of [...wakeKeys, ...speakerKeys, ...settingsKeys]) {
    assert.match(source, new RegExp(`"${key.replace(".", "\\.")}"\\s*:`), `${language}:${key}`);
    const expectedPlaceholders = [...readTranslation(wakeSources.en, key).matchAll(placeholderPattern)]
      .map((match) => match[1])
      .sort();
    const actualPlaceholders = [...readTranslation(source, key).matchAll(placeholderPattern)]
      .map((match) => match[1])
      .sort();
    assert.deepEqual(actualPlaceholders, expectedPlaceholders, `${language}:${key} placeholder parity`);
  }
}

console.log("Wake-word fixtures passed: lifecycle gating, microphone arbitration, duplicate-event debounce, model hashes, exact openWakeWord stages, three-frame confirmation, 0.35 release hysteresis, local speaker profile gating, speaker MATCH/REJECT routing, debug-only diagnostics, stop-before-trigger, one greeting per assistant session, TTS-before-STT, manual/wake entry reuse, no background service, and 12-language parity.");

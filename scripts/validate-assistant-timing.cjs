const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-assistant-timing-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/assistantTiming.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const timing = require(path.join(output, "assistantTiming.js"));
const hook = fs.readFileSync(path.join(root, "hooks", "useHydroMateSpeechRecognition.ts"), "utf8");
const modal = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
let assertions = 0;

assert.equal(timing.ASSISTANT_SPEECH_GRACE_MILLIS, 1250);
assert.equal(timing.getAssistantTurnResponseWaitMillis(2000, false), 2000, "normal turn preserves configured wait");
assert.equal(timing.getAssistantTurnResponseWaitMillis(5000, false), 5000, "normal five-second wait is unchanged");
assert.equal(timing.getAssistantTurnResponseWaitMillis(2000, true), 10000, "confirmation has ten-second minimum");
assert.equal(timing.getAssistantTurnResponseWaitMillis(15000, true), 15000, "longer configured confirmation wait is preserved");
assertions += 5;
assert.equal(timing.getAssistantTurnResponseWaitMillis(2000, false, true), 7000, "active reminder has seven-second minimum");
assert.equal(timing.getAssistantTurnResponseWaitMillis(10000, false, true), 10000, "longer reminder wait is preserved");
assertions += 2;

assert.match(modal, /await speak\(question\)[\s\S]*beginListeningRef\.current/, "normal STT starts after TTS resolves");
assert.match(modal, /await speak\(understood\)[\s\S]*beginListeningRef\.current\(false, getTurnResponseWaitMillis\("confirmation"\)\)/, "confirmation STT starts after TTS with confirmation wait");
assertions += 2;

const startEvent = hook.slice(hook.indexOf('useSpeechRecognitionEvent("start"'), hook.indexOf('useSpeechRecognitionEvent("speechstart"'));
assert.match(startEvent, /ASSISTANT_SPEECH_GRACE_MILLIS/, "grace begins only after recognizer start acknowledgement");
assert.ok(startEvent.indexOf("grace=end") < startEvent.lastIndexOf("setTimeout"), "configured silence timer is nested after grace");
assertions += 2;

const speechStart = hook.slice(hook.indexOf('useSpeechRecognitionEvent("speechstart"'), hook.indexOf('useSpeechRecognitionEvent("speechend"'));
assert.match(speechStart, /setUserSpeechActive\(true\)/);
assert.match(speechStart, /recordSpeechActivity\(\)/, "speech start cancels grace\/silence timer");
assertions += 2;

const speechEnd = hook.slice(hook.indexOf('useSpeechRecognitionEvent("speechend"'), hook.indexOf('useSpeechRecognitionEvent("result"'));
assert.match(speechEnd, /ASSISTANT_SPEECH_END_FALLBACK_MILLIS/, "speech end waits for a late final result");
assert.ok(speechEnd.indexOf("setTimeout") < speechEnd.indexOf("deliverTranscript"), "speech end never immediately submits or closes");
assertions += 2;

const resultEvent = hook.slice(hook.indexOf('useSpeechRecognitionEvent("result"'), hook.indexOf('useSpeechRecognitionEvent("error"'));
assert.match(resultEvent, /event\.isFinal/);
assert.match(resultEvent, /clearSpeechEndFallback\(\)[\s\S]*deliverTranscript\(transcript\)/, "late final wins over speech-end fallback");
assertions += 2;

assert.match(hook, /assistantSessionIdRef\.current !== timeoutAssistantSessionId[\s\S]*deliveryStateRef\.current\.sessionId !== speechSessionId/, "stale timeout cannot affect a newer session");
assert.match(hook, /userSpeechActiveRef\.current[\s\S]*timeoutRef\.current = setTimeout\(settleRecognition/, "long recognition timeout extends while speech is active");
assert.match(hook, /recognitionActiveRef\.current \|\| pendingInitialSilenceRef\.current[\s\S]*ignored=already-active/, "duplicate STT start is blocked");
assert.match(hook, /onInitialSilenceTimeoutRef\.current\(claim\.assistantSessionId, speechSessionId\)/, "real silence timeout still closes through the owning session");
assertions += 4;

assert.match(modal, /confirmationCommitInProgressRef\.current = true[\s\S]*cancelInitialSilenceTimeout\(\)[\s\S]*abortListening\(\)/, "confirmation commit still has close priority");
assertions += 1;

const languages = ["en", "hi", "bn", "mr", "ta", "te", "gu", "kn", "ml", "pa", "bho", "bgc"];
for (const locale of languages) {
  const source = fs.readFileSync(path.join(root, "localization", `${locale}.ts`), "utf8");
  for (const key of ["assistant.listeningWaiting", "assistant.listeningSpeech", "assistant.listeningConfirmation"]) {
    assert.match(source, new RegExp(`"${key.replaceAll(".", "\\.")}"\\s*:`), `${locale}:${key}`);
    assertions += 1;
  }
}

console.log(`Assistant timing fixtures passed: ${assertions} assertions for TTS ordering, STT acknowledgement, grace, speech-active extension, delayed speech-end fallback, final-result priority, confirmation patience, stale-session rejection, duplicate-start prevention, and 12-language waiting UI.`);

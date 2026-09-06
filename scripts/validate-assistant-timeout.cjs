const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-timeout-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [
  compiler,
  "services/speechTranscriptDelivery.ts",
  "--module", "commonjs",
  "--target", "es2022",
  "--outDir", output,
  "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const timeout = require(path.join(output, "speechTranscriptDelivery.js"));
const initial = timeout.beginInitialSilenceTimeout(10, 1);
assert.equal(timeout.claimInitialSilenceTimeout(initial, 10, 1).claimed, true);
const speaking = timeout.markInitialSilenceSpeechActivity(initial, 10, 1);
assert.equal(timeout.claimInitialSilenceTimeout(speaking, 10, 1).claimed, false);
assert.equal(timeout.claimInitialSilenceTimeout(initial, 11, 1).claimed, false);
assert.equal(timeout.claimInitialSilenceTimeout(initial, 10, 2).claimed, false);
const newer = timeout.beginInitialSilenceTimeout(11, 2);
assert.equal(timeout.claimInitialSilenceTimeout(newer, 10, 1).claimed, false);
assert.equal(timeout.claimInitialSilenceTimeout(newer, 11, 2).claimed, true);

const hookSource = fs.readFileSync(path.join(root, "hooks/useHydroMateSpeechRecognition.ts"), "utf8");
const modalSource = fs.readFileSync(path.join(root, "components/hydromate-assistant-modal.tsx"), "utf8");
const preferenceSource = fs.readFileSync(path.join(root, "services/wakeWordService.ts"), "utf8");
assert.match(hookSource, /useSpeechRecognitionEvent\("speechstart"[\s\S]*recordSpeechActivity\(\)/);
assert.match(hookSource, /assistantSessionIdRef\.current !== assistantSessionId[\s\S]*deliveryStateRef\.current\.sessionId !== speechSessionId/);
assert.match(hookSource, /claimInitialSilenceTimeout\([\s\S]*assistantSessionId,[\s\S]*speechSessionId/);
assert.match(hookSource, /onInitialSilenceTimeoutRef\.current\([\s\S]*claim\.assistantSessionId[\s\S]*speechSessionId/);
assert.match(modalSource, /currentCallback: activeAssistantSessionRef\.current === timedOutAssistantSessionId/);
assert.match(modalSource, /responseWaitSeconds \* 1_000/);
assert.match(preferenceSource, /hydromate-wake-word-response-wait-seconds/);
assert.match(preferenceSource, /DEFAULT_WAKE_WORD_RESPONSE_WAIT_SECONDS = 5/);
assert.match(preferenceSource, /MIN_WAKE_WORD_RESPONSE_WAIT_SECONDS = 2/);
assert.match(preferenceSource, /MAX_WAKE_WORD_RESPONSE_WAIT_SECONDS = 15/);

console.log("Assistant timeout fixtures passed: initial-silence claim, speech-activity cancellation, close/session cancellation wiring, stale assistant-session rejection, stale STT-session rejection, 5-second default, and 2-15 second persistence bounds.");

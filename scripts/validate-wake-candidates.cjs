const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-candidates-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [
  compiler,
  "services/wakeWordState.ts",
  "services/wakeWordCandidateState.ts",
  "--module", "commonjs",
  "--target", "es2022",
  "--outDir", output,
  "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const candidate = require(path.join(output, "wakeWordCandidateState.js"));
let state = candidate.emptyWakeWordCandidateState;
const scores = [0.51, 0.75, 0.95, 0.82, 0.6];
scores.forEach((score, index) => {
  const update = candidate.recordWakeWordCandidateFrame(state, {
    score,
    consecutiveFrames: index + 1,
    state: "candidate",
    observedAtMillis: 1_000 + index * 80,
  });
  assert.equal(update.summary, undefined);
  state = update.state;
});
const rejected = candidate.recordWakeWordCandidateFrame(state, {
  score: 0.3,
  consecutiveFrames: scores.length,
  state: "candidate-rejected",
  observedAtMillis: 1_400,
});
assert.deepEqual(rejected.summary.scores, scores);
assert.equal(rejected.summary.frames, 5);
assert.equal(rejected.summary.maximumConsecutiveFrames, 5);
assert.equal(rejected.summary.durationMillis, 400);
assert.equal(rejected.summary.maximumScore, 0.95);
assert.equal(rejected.summary.framesOver70, 3);
assert.equal(rejected.summary.framesOver90, 1);
assert.equal(rejected.summary.terminationReason, "candidate-rejected");
assert.ok(Math.abs(rejected.summary.meanScore - 0.726) < 0.000_001);
assert.match(candidate.formatWakeWordCandidateSummary(rejected.summary), /scores=\[0\.510,0\.750,0\.950,0\.820,0\.600\]/);

state = candidate.emptyWakeWordCandidateState;
for (let index = 0; index < 3; index += 1) {
  state = candidate.recordWakeWordCandidateFrame(state, {
    score: 0.98,
    consecutiveFrames: index + 1,
    state: "candidate",
    observedAtMillis: 2_000 + index * 80,
  }).state;
}
const detected = candidate.recordWakeWordCandidateFrame(state, {
  score: 0.98,
  consecutiveFrames: 3,
  state: "detected",
  observedAtMillis: 2_240,
});
assert.equal(detected.summary.frames, 3);
assert.equal(detected.summary.durationMillis, 240);
assert.equal(detected.summary.terminationReason, "detected");

const engineSource = fs.readFileSync(path.join(
  root,
  "modules/hydromate-wake-word/android/src/main/java/expo/modules/hydromatewakeword/WakeWordEngine.kt"
), "utf8");
assert.match(engineSource, /if \(calibrationOnly\) continue/);
assert.match(engineSource, /"listener-stopped"/);
assert.match(engineSource, /"inference-error"/);
assert.match(engineSource, /"candidate-rejected"/);
assert.doesNotMatch(engineSource, /SpeechRecognizer|string matching|transcript/i);

console.log("Wake candidate-state fixtures passed: complete score sequence, frame count, 80 ms duration accounting, max, mean, over-0.7/0.9 counts, consecutive-frame maximum, termination reason, and diagnostics-only suppression wiring.");

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-state-machine-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/hydromateAssistantParser.ts",
  "services/assistantLocaleNormalizer.ts",
  "services/waterAmountNormalizer.ts",
  "services/assistantRuntimeState.ts",
  "services/speechTranscriptDelivery.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const parser = require(path.join(output, "hydromateAssistantParser.js"));
const runtime = require(path.join(output, "assistantRuntimeState.js"));
const speech = require(path.join(output, "speechTranscriptDelivery.js"));
const now = new Date(2026, 0, 10, 10, 0);

const directHindi = parser.parseAssistantTurn("150 ml पानी पीने का रिमाइंडर लगाओ", { now, locale: "hi" });
assert.equal(directHindi.draft.amountMl, 150);
assert.equal(directHindi.question, "time");

const missingAmount = parser.parseAssistantTurn("पानी पीने का रिमाइंडर 1 मिनट बाद लगाओ", { now, locale: "hi" });
assert.equal(missingAmount.question, "waterAmount");
assert.equal(missingAmount.draft.relativeDurationMinutes, 1);
const latinAmount = parser.parseAssistantTurn("150 ml", { now, locale: "hi", draft: missingAmount.draft, pendingQuestion: missingAmount.question });
assert.equal(latinAmount.question, "timesPerDay");
assert.equal(latinAmount.draft.amountMl, 150);
const nativeAmount = parser.parseAssistantTurn("१५० एमएल", { now, locale: "hi", draft: missingAmount.draft, pendingQuestion: missingAmount.question });
assert.equal(nativeAmount.question, "timesPerDay");
const spokenAmount = parser.parseAssistantTurn("एक सौ पचास एमएल", { now, locale: "hi", draft: missingAmount.draft, pendingQuestion: missingAmount.question });
assert.equal(spokenAmount.question, "timesPerDay");

const hindiRelative = parser.parseAssistantTurn("1 मिनट बाद पानी पीने की याद दिलाओ", { now, locale: "hi" });
assert.equal(hindiRelative.draft.relativeDurationMinutes, 1);
assert.notEqual(hindiRelative.question, "timePeriod");
const hindiSpokenRelative = parser.parseAssistantTurn("एक मिनट बाद पानी पीने की याद दिलाओ", { now, locale: "hi" });
assert.equal(hindiSpokenRelative.draft.relativeDurationMinutes, 1);
assert.notEqual(hindiSpokenRelative.question, "timePeriod");
assert.equal(parser.parseAssistantTurn("एक घंटे बाद पानी १५० एमएल", { now, locale: "hi" }).draft.relativeDurationMinutes, 60);
assert.equal(parser.parseAssistantTurn("दो घंटे बाद पानी १५० एमएल", { now, locale: "hi" }).draft.relativeDurationMinutes, 120);
assert.equal(parser.parseAssistantTurn("तीस मिनट बाद पानी १५० एमएल", { now, locale: "hi" }).draft.relativeDurationMinutes, 30);
const englishRelative = parser.parseAssistantTurn("remind me to drink water in 1 minute", { now, locale: "en" });
assert.equal(englishRelative.draft.relativeDurationMinutes, 1);
assert.notEqual(englishRelative.question, "timePeriod");
const ambiguousClock = parser.parseAssistantTurn("water 150 ml at 1", { now, locale: "en" });
assert.equal(ambiguousClock.question, "timePeriod");
const relativeReplacement = parser.parseAssistantTurn("in 1 minute", { now, locale: "en", draft: ambiguousClock.draft, pendingQuestion: ambiguousClock.question });
assert.equal(relativeReplacement.question, "timesPerDay");
assert.equal(relativeReplacement.draft.relativeDurationMinutes, 1);
assert.equal(relativeReplacement.draft.ambiguousHour, undefined);
const ambiguousMedicine = parser.parseAssistantTurn("Remind me to take Crocin at 8", { now, locale: "en" });
assert.equal(ambiguousMedicine.question, "timePeriod");
assert.equal(ambiguousMedicine.draft.medicineName, "Crocin", "ambiguous clock does not discard medicine entity");
const resolvedMedicinePeriod = parser.parseAssistantTurn("PM", { now, locale: "en", draft: ambiguousMedicine.draft, pendingQuestion: ambiguousMedicine.question });
assert.equal(resolvedMedicinePeriod.question, "timesPerDay", "AM/PM follow-up resolves against entity-complete draft");

const relativeMatrix = [
  ["en", "water 150 ml in 5 minutes"],
  ["hi", "पानी १५० एमएल ५ मिनट बाद"],
  ["bn", "জল ১৫০ এমএল ৫ মিনিট পরে"],
  ["mr", "पाणी १५० मिलीलीटर ५ मिनिटांनी नंतर"],
  ["ta", "தண்ணீர் ௧௫௦ எம்எல் ௫ நிமிடங்கள் பிறகு"],
  ["te", "నీరు ౧౫౦ ఎంఎల్ ౫ నిమిషాలు తర్వాత"],
  ["gu", "પાણી ૧૫૦ એમએલ ૫ મિનિટ પછી"],
  ["kn", "ನೀರು ೧೫೦ ಎಂಎಲ್ ೫ ನಿಮಿಷ ನಂತರ"],
  ["ml", "വെള്ളം ൧൫൦ എംഎൽ ൫ മിനിറ്റ് ശേഷം"],
  ["pa", "ਪਾਣੀ ੧੫੦ ਐਮਐਲ ੫ ਮਿੰਟ ਬਾਅਦ"],
  ["bho", "पानी १५० मिली लीटर ५ मिनट बाद"],
  ["bgc", "पाणी १५० एमएल ५ मिनट बाद"],
];
for (const [locale, phrase] of relativeMatrix) {
  const result = parser.parseAssistantTurn(phrase, { now, locale });
  assert.equal(result.draft.relativeDurationMinutes, 5, `${locale} relative five minutes`);
  assert.notEqual(result.question, "timePeriod", `${locale} relative time never asks AM/PM`);
}

for (const [phrase, minutes] of [
  ["water 150 ml in 1 minute", 1], ["water 150 ml after 2 minutes", 2],
  ["water 150 ml in 5 minutes", 5], ["water 150 ml 10 minutes from now", 10],
  ["water 150 ml after 30 minutes", 30], ["water 150 ml in 1 hour", 60],
  ["water 150 ml after 2 hours", 120],
]) {
  assert.equal(parser.parseAssistantTurn(phrase, { now, locale: "en" }).draft.relativeDurationMinutes, minutes, phrase);
}

const firstInvalid = parser.parseAssistantTurn("5000 ml", { now, locale: "hi", draft: missingAmount.draft, pendingQuestion: missingAmount.question });
assert.equal(firstInvalid.question, "waterAmountInvalid");
const recovered = parser.parseAssistantTurn("१५०", { now, locale: "hi", draft: firstInvalid.draft, pendingQuestion: firstInvalid.question });
assert.equal(recovered.question, "timesPerDay");
const secondInvalid = parser.parseAssistantTurn("not an amount", { now, locale: "hi", draft: firstInvalid.draft, pendingQuestion: firstInvalid.question });
assert.equal(secondInvalid.state, "cancelled");

const slotFixtures = [
  parser.parseAssistantTurn("Allegra", { now, locale: "en", draft: { category: "medicine", hour: 20, minute: 0, dateSource: "none" }, pendingQuestion: "medicineName" }),
  parser.parseAssistantTurn("15 August", { now, locale: "en", draft: { category: "birthday", title: "Rahul", hour: 8, minute: 0, dateSource: "none" }, pendingQuestion: "date" }),
  parser.parseAssistantTurn("Riya", { now, locale: "en", draft: { category: "anniversary", day: 15, month: 8, hour: 20, minute: 0, dateSource: "explicit" }, pendingQuestion: "title" }),
  parser.parseAssistantTurn("Take a walk", { now, locale: "en", draft: { category: "custom", hour: 20, minute: 0, day: 10, month: 1, dateSource: "none", targetAtMillis: new Date(2026, 0, 10, 20).getTime() }, pendingQuestion: "title" }),
];
assert.equal(slotFixtures[0].question, "timesPerDay", "medicine slot continues to recurrence");
assert.equal(slotFixtures[1].state, "ready", "birthday slot remains date-based");
assert.equal(slotFixtures[2].state, "ready", "anniversary slot remains date-based");
assert.equal(slotFixtures[3].question, "timesPerDay", "routine slot continues to recurrence");

let state = runtime.beginAssistantRuntimeSession(20);
const firstTurn = runtime.claimAssistantSpeechTurn(state, 20, 1);
assert.equal(firstTurn.accepted, true);
state = firstTurn.state;
const secondTurn = runtime.claimAssistantSpeechTurn(state, 20, 2);
assert.equal(secondTurn.accepted, true);
state = secondTurn.state;
assert.equal(runtime.isCurrentAssistantTurn(state, 20, firstTurn.turnId), false, "old async response cannot affect newer turn");
assert.equal(runtime.claimAssistantSpeechTurn(state, 20, 1).accepted, false, "stale STT callback rejected");
assert.equal(runtime.claimAssistantSpeechTurn(state, 19, 3).accepted, false, "previous assistant-session callback rejected");
state = runtime.clearAssistantRuntimeState(state);
assert.equal(runtime.beginAssistantManualTurn(state).accepted, false, "closed assistant rejects callbacks");

const timeoutOne = speech.beginInitialSilenceTimeout(20, 1);
const timeoutTwo = speech.beginInitialSilenceTimeout(20, 2);
assert.equal(speech.claimInitialSilenceTimeout(timeoutOne, 20, 2).claimed, false, "stale timeout cannot claim newer speech turn");
assert.equal(speech.claimInitialSilenceTimeout(timeoutTwo, 20, 2).claimed, true);

const modalSource = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
const hookSource = fs.readFileSync(path.join(root, "hooks", "useHydroMateSpeechRecognition.ts"), "utf8");
assert.match(modalSource, /commitPendingState\(result\.draft, result\.question\)/, "draft and pending slot commit together");
assert.match(modalSource, /await speak\(question\)[\s\S]*beginListeningRef\.current\(false\)/, "follow-up TTS restarts STT");
assert.match(modalSource, /claimAssistantSpeechTurn/, "speech callbacks use monotonic runtime guard");
assert.match(modalSource, /if \(turnId === undefined\) \{[\s\S]*abortListeningRef\.current\(\)[\s\S]*beginAssistantManualTurn/, "manual input cancels its older STT session before changing state");
assert.match(modalSource, /clearAssistantRuntimeState/, "close/error/timeout clears runtime state");
assert.match(hookSource, /speechSessionId > state\.latestSpeechSessionId|deliveryStateRef\.current\.sessionId !== speechSessionId/, "speech/timeout callbacks are session-scoped");

console.log("Ask HydroMate state-machine fixtures passed: exact Hindi water failures, atomic slot commits, multilingual relative timers, bounded invalid recovery, follow-up STT restart, safe timeout clearing, and stale turn/session rejection.");

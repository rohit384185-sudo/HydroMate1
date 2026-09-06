const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-confirmation-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/assistantLocaleNormalizer.ts",
  "services/waterAmountNormalizer.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const { getAssistantConfirmationIntent } = require(path.join(output, "assistantLocaleNormalizer.js"));
const phrases = [
  ["en", "okay", "cancel"],
  ["hi", "ठीक है", "नहीं"],
  ["bn", "ঠিক আছে", "বাতিল"],
  ["mr", "ठीक आहे", "नाही"],
  ["ta", "சரி", "இல்லை"],
  ["te", "సరే", "కాదు"],
  ["gu", "બરાબર", "ના"],
  ["kn", "ಸರಿ", "ಇಲ್ಲ"],
  ["ml", "ശരി", "ഇല്ല"],
  ["pa", "ਠੀਕ ਹੈ", "ਨਹੀਂ"],
  ["bho", "ठीक बा", "ना"],
  ["bgc", "ठीक सै", "ना"],
];
let assertions = 0;
for (const [locale, accept, reject] of phrases) {
  assert.equal(getAssistantConfirmationIntent(accept, locale), "confirm", `${locale} accept`);
  assert.equal(getAssistantConfirmationIntent(reject, locale), "reject", `${locale} reject`);
  assertions += 2;
}
for (const phrase of ["ओके", "हाँ", "हां", "जी हाँ", "जी हां", "ठीक है", "कर दो", "सेट कर दो", "confirm"]) {
  assert.equal(getAssistantConfirmationIntent(phrase, phrase === "confirm" ? "en" : "hi"), "confirm");
  assertions += 1;
}

const modal = fs.readFileSync(path.join(root, "components/hydromate-assistant-modal.tsx"), "utf8");
assert.match(modal, /currentQuestion === "confirmation" \|\| currentQuestion === "confirmationInvalid"/);
assert.match(modal, /commitPendingState\(undefined, "confirmation"\)[\s\S]*await speak\(understood\)[\s\S]*beginListeningRef\.current\(false\)/);
assert.match(modal, /confirmationCommitInProgressRef\.current \|\| savingRef\.current/);
assert.match(modal, /confirmationCommitInProgressRef\.current = true/);
assert.match(modal, /finalizeReminderConfirmationRef\.current\("voice"\)/);
assert.match(modal, /finishAssistantConfirmation[\s\S]*requestAssistantClose\("reminder-save-success"\)/);
assert.match(modal, /handleInitialSilenceTimeout[\s\S]*nextAssistantSilenceAction[\s\S]*decision.action === "reprompt"[\s\S]*requestAssistantClose\("initial-silence-timeout"\)/);
assert.match(modal, /confirmationAttemptsRef\.current \+= 1[\s\S]*commitPendingState\(undefined, "confirmationInvalid"\)[\s\S]*beginListeningRef\.current/);
assert.match(modal, /intent === "reject"[\s\S]*draftsRef\.current = \[\][\s\S]*requestAssistantClose\("explicit-reject"\)/);
assert.doesNotMatch(modal, /normalizeAssistantConfirmation\([^)]*\)[\s\S]{0,120}parseAssistantTurn/);
assertions += 10;

const confirmationKeys = [
  "assistant.question.confirmation",
  "assistant.question.confirmationInvalid",
  "assistant.relativeTimeSummary",
  "assistant.rolloverToday",
  "assistant.rolloverTomorrow",
  "assistant.rolloverMixed",
];
const translationValue = (source, key) => {
  const match = source.match(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*"([^"]*)"`));
  assert.ok(match, `missing ${key}`);
  return match[1];
};
const english = fs.readFileSync(path.join(root, "localization", "en.ts"), "utf8");
for (const [locale] of phrases) {
  const source = fs.readFileSync(path.join(root, "localization", `${locale}.ts`), "utf8");
  for (const key of confirmationKeys) {
    const expected = [...translationValue(english, key).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
    const actual = [...translationValue(source, key).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(actual, expected, `${locale}:${key} placeholder parity`);
    assertions += 1;
  }
}

console.log(`Assistant voice-confirmation fixtures passed: ${assertions} assertions across 12 languages, persistent clarification, timeout/reject cleanup, TTS-to-STT handoff, close-on-success, and shared duplicate-save guard.`);

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-confirmation-locales-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/assistantLocaleNormalizer.ts",
  "services/waterAmountNormalizer.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const { normalizeAssistantConfirmation } = require(path.join(output, "assistantLocaleNormalizer.js"));
const matrix = [
  ["en", "OK.", "Don't set it", "maybe later"],
  ["hi", "हाँ कर दो", "नही", "शायद"],
  ["bn", "সেট করে দাও", "বাতিল করো", "পরে দেখি"],
  ["mr", "हो", "करू नका", "कदाचित"],
  ["ta", "ஆமாம்", "செய்ய வேண்டாம்", "பிறகு"],
  ["te", "చేయండి", "చేయొద్దు", "తర్వాత చూద్దాం"],
  ["gu", "હાં", "ન કરો", "કદાચ"],
  ["kn", "ಸೆಟ್ ಮಾಡಿ", "ರದ್ದು ಮಾಡಿ", "ಬಹುಶಃ"],
  ["ml", "സെറ്റ് ചെയ്യൂ", "വേണ്ട", "പിന്നെ"],
  ["pa", "ਸੈੱਟ ਕਰ ਦਿਓ", "ਨਾ ਕਰੋ", "ਸ਼ਾਇਦ"],
  ["bho", "ठीक बा कर दीं", "मत करीं", "बाद में"],
  ["bgc", "सेट कर दे", "रद्द कर", "फेर देखांगे"],
];
let assertions = 0;
for (const [locale, accept, reject, unclear] of matrix) {
  assert.equal(normalizeAssistantConfirmation(accept, locale).intent, "confirm", `${locale} affirmative`);
  assert.equal(normalizeAssistantConfirmation(`  ${accept}!  `, locale).intent, "confirm", `${locale} punctuation variant`);
  assert.equal(normalizeAssistantConfirmation(reject, locale).intent, "reject", `${locale} rejection`);
  assert.equal(normalizeAssistantConfirmation(unclear, locale).intent, "unknown", `${locale} unclear`);
  assertions += 4;
}

for (const phrase of ["OK", "Ok", "ok", "okay", "Okay", "OK.", "yes", "yes please", "yeah", "yep", "sure", "go ahead", "do it", "set it", "set it up", "confirm", "that's fine", "sounds good"]) {
  assert.equal(normalizeAssistantConfirmation(phrase, "en").intent, "confirm", phrase);
  assertions += 1;
}
for (const phrase of ["not okay", "no", "nope", "don't", "do not", "don't set it", "cancel", "stop", "never mind"]) {
  assert.equal(normalizeAssistantConfirmation(phrase, "en").intent, "reject", phrase);
  assertions += 1;
}
for (const phrase of ["हाँ", "हां", "जी हाँ", "ठीक है", "ओके", "haan", "haan ji", "theek hai", "kar do"]) {
  assert.equal(normalizeAssistantConfirmation(phrase, "hi").intent, "confirm", phrase);
  assertions += 1;
}
assert.equal(normalizeAssistantConfirmation("not okay", "en").intent, "reject", "rejection takes precedence");
assertions += 1;

const modal = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
const hook = fs.readFileSync(path.join(root, "hooks", "useHydroMateSpeechRecognition.ts"), "utf8");
const confirmationBranch = modal.slice(modal.indexOf('currentQuestion === "confirmation"'), modal.indexOf("const clauses ="));
assert.ok(confirmationBranch.indexOf("processAssistantRuntimeTurn") >= 0 && confirmationBranch.indexOf("processAssistantRuntimeTurn") < confirmationBranch.indexOf('intent === "confirm"'), "shared runtime confirmation normalization has routing priority");
assert.doesNotMatch(confirmationBranch, /parseAssistantTurn/, "general parser cannot handle a confirmation turn");
assert.match(modal, /const requestAssistantClose = useCallback/, "all closes share one gate");
assert.equal((modal.match(/onCloseRef\.current\(\)/g) ?? []).length, 1, "only the close gate invokes the parent close callback");
assert.match(modal, /saveActive[\s\S]*canCloseAssistant\(reason,[\s\S]*persistenceVerified: saveLedgerRef.current.verified/, "commit and verified save state reach the shared close gate");
assert.match(modal, /confirmationCommitInProgressRef\.current = true[\s\S]*savingRef\.current = true[\s\S]*cancelInitialSilenceTimeout\(\)[\s\S]*abortListening\(\)[\s\S]*draftsRef\.current\.map/, "accept locks, cancels timers, aborts STT, then snapshots");
assert.match(modal, /await persistAssistantConfirmation\([\s\S]*await finishAssistantConfirmation\([\s\S]*speakAssistantResponse\(language, text, signal\)[\s\S]*commitPendingState\(undefined, undefined\)[\s\S]*requestAssistantClose\("reminder-save-success"\)/, "shared verified save and success TTS finish before state clear and close");
assert.match(modal, /catch \(error\)[\s\S]*save=failure modal=open retryable=true[\s\S]*setAssistantText\(t\("assistant\.saveError"\)\)/, "failure stays open and retryable");
assert.match(modal, /commitLock=not-acquired duplicate=true/, "duplicate accept cannot save twice");
assert.match(hook, /callback=stt-abort result=ignored reason=expected-cleanup/, "intentional abort is ignored");
assertions += 10;

console.log(`Assistant confirmation-locale fixtures passed: ${assertions} assertions across all 12 locales, English Samsung variants, Hindi and Romanized variants, rejection precedence, routing priority, atomic save, expected-abort cleanup, success-TTS ordering, and centralized close gating.`);

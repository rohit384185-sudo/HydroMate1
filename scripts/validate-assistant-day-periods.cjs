const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-day-periods-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/hydromateAssistantParser.ts",
  "services/assistantLocaleNormalizer.ts",
  "services/assistantDayPeriod.ts",
  "services/waterAmountNormalizer.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const parser = require(path.join(output, "hydromateAssistantParser.js"));
const period = require(path.join(output, "assistantDayPeriod.js"));
const now = new Date(2026, 8, 5, 7, 0);
const languages = [
  { locale: "en", morning: "morning", night: "night", and: "and", eight: "8", bare: "at 7" },
  { locale: "hi", morning: "सुबह", night: "रात", and: "और", eight: "८", bare: "७ बजे" },
  { locale: "bn", morning: "সকাল", night: "রাত", and: "ও", eight: "৮", bare: "৭ বাজে" },
  { locale: "mr", morning: "सकाळी", night: "रात्री", and: "आणि", eight: "८", bare: "७ वाजता" },
  { locale: "ta", morning: "காலை", night: "இரவு", and: "மற்றும்", eight: "௮", bare: "௭ மணிக்கு" },
  { locale: "te", morning: "ఉదయం", night: "రాత్రి", and: "మరియు", eight: "౮", bare: "౭ గంటలకు" },
  { locale: "gu", morning: "સવારે", night: "રાત્રે", and: "અને", eight: "૮", bare: "૭ વાગ્યે" },
  { locale: "kn", morning: "ಬೆಳಿಗ್ಗೆ", night: "ರಾತ್ರಿ", and: "ಮತ್ತು", eight: "೮", bare: "೭ ಗಂಟೆಗೆ" },
  { locale: "ml", morning: "രാവിലെ", night: "രാത്രി", and: "കൂടാതെ", eight: "൮", bare: "൭ മണിക്ക്" },
  { locale: "pa", morning: "ਸਵੇਰੇ", night: "ਰਾਤ", and: "ਅਤੇ", eight: "੮", bare: "੭ ਵਜੇ" },
  { locale: "bho", morning: "सवेरे", night: "रात", and: "और", eight: "८", bare: "७ बजे" },
  { locale: "bgc", morning: "सवेरे", night: "रात", and: "और", eight: "८", bare: "७ बजे" },
];

const waterDraft = { category: "water", amountMl: 150, dateSource: "none" };
const recurringDraft = (category, count) => ({
  category,
  ...(category === "medicine" ? { medicineName: "Crocin", medicineType: "tablet" } : { title: "Walk" }),
  dateSource: "none",
  scheduleMode: "recurring",
  timesPerDay: count,
  durationDays: 7,
});

let assertions = 0;
for (const item of languages) {
  const bare = parser.parseAssistantTurn(item.bare, { now, locale: item.locale, draft: waterDraft, pendingQuestion: "time" });
  assert.equal(bare.question, "timePeriod", `${item.locale} bare clock asks only day period`);
  assert.deepEqual([bare.draft.ambiguousHour, bare.draft.ambiguousMinute], [7, 0], `${item.locale} bare clock is preserved`);
  const resolvedBare = parser.parseAssistantTurn(item.morning, { now, locale: item.locale, draft: bare.draft, pendingQuestion: bare.question });
  assert.deepEqual([resolvedBare.draft.hour, resolvedBare.draft.minute], [7, 0], `${item.locale} day-period follow-up resolves authoritative clock`);
  const morning = parser.parseAssistantTurn(`${item.morning} ${item.eight}`, { now, locale: item.locale, draft: waterDraft, pendingQuestion: "time" });
  assert.deepEqual([morning.draft.hour, morning.draft.minute], [8, 0], `${item.locale} morning 8`);
  assert.notEqual(morning.question, "timePeriod", `${item.locale} morning is explicit`);
  const night = parser.parseAssistantTurn(`${item.night} ${item.eight}`, { now, locale: item.locale, draft: waterDraft, pendingQuestion: "time" });
  assert.deepEqual([night.draft.hour, night.draft.minute], [20, 0], `${item.locale} night 8`);
  assert.notEqual(night.question, "timePeriod", `${item.locale} night is explicit`);
  const two = parser.parseAssistantTurn(`${item.morning} ${item.eight} ${item.and} ${item.night} ${item.eight}`, {
    now, locale: item.locale, draft: recurringDraft("medicine", 2), pendingQuestion: "recurrenceTimes",
  });
  assert.equal(two.state, "ready", `${item.locale} two-time Medicine follow-up`);
  assert.deepEqual(two.draft.times, [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }], `${item.locale} retains each period`);
  assertions += 9;
}

const englishOClock = parser.parseAssistantTurn("8 o'clock", { now, locale: "en", draft: waterDraft, pendingQuestion: "time" });
assert.equal(englishOClock.question, "timePeriod");
assert.deepEqual([englishOClock.draft.ambiguousHour, englishOClock.draft.ambiguousMinute], [8, 0]);
for (const [phrase, hour, minute] of [["7 बजे", 7, 0], ["8 बजे", 8, 0], ["७ बजे", 7, 0], ["7:30 बजे", 7, 30]]) {
  const result = parser.parseAssistantTurn(phrase, { now, locale: "hi", draft: waterDraft, pendingQuestion: "time" });
  assert.equal(result.question, "timePeriod", `${phrase} asks AM/PM only`);
  assert.deepEqual([result.draft.ambiguousHour, result.draft.ambiguousMinute], [hour, minute], `${phrase} preserves clock`);
  assertions += 2;
}
const hindiBareNight = parser.parseAssistantTurn("रात", {
  now,
  locale: "hi",
  draft: parser.parseAssistantTurn("7 बजे", { now, locale: "hi", draft: waterDraft, pendingQuestion: "time" }).draft,
  pendingQuestion: "timePeriod",
});
assert.deepEqual([hindiBareNight.draft.hour, hindiBareNight.draft.minute], [19, 0]);
assertions += 3;

const hindiThree = parser.parseAssistantTurn("सुबह 8 बजे, दोपहर 2 बजे और रात 8 बजे", {
  now, locale: "hi", draft: recurringDraft("medicine", 3), pendingQuestion: "recurrenceTimes",
});
assert.equal(hindiThree.state, "ready");
assert.deepEqual(hindiThree.draft.times, [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }]);
for (const [phrase, expectedHour] of [["सुबह 8 बजे", 8], ["दोपहर 2 बजे", 14], ["शाम 6 बजे", 18], ["रात 8 बजे", 20]]) {
  const result = parser.parseAssistantTurn(phrase, { now, locale: "hi", draft: waterDraft, pendingQuestion: "time" });
  assert.equal(result.draft.hour, expectedHour, phrase);
  assert.notEqual(result.question, "timePeriod", `${phrase} is unambiguous`);
  assertions += 2;
}
const hindiNative = parser.parseAssistantTurn("सुबह ८ बजे और रात ८ बजे", {
  now, locale: "hi", draft: recurringDraft("custom", 2), pendingQuestion: "recurrenceTimes",
});
assert.equal(hindiNative.state, "ready", "Routine exact-times follow-up completes");
assert.deepEqual(hindiNative.draft.times, [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }]);
for (const mixed of ["सुबह 8 बजे और 8 PM", "8 AM और रात 8 बजे"]) {
  const result = parser.parseAssistantTurn(mixed, { now, locale: "hi", draft: recurringDraft("medicine", 2), pendingQuestion: "recurrenceTimes" });
  assert.equal(result.state, "ready", mixed);
  assert.deepEqual(result.draft.times, [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }]);
}
const withMinutes = parser.parseAssistantTurn("सुबह 8:30 बजे और रात 9:15 बजे", {
  now, locale: "hi", draft: recurringDraft("custom", 2), pendingQuestion: "recurrenceTimes",
});
assert.deepEqual(withMinutes.draft.times, [{ hour: 8, minute: 30 }, { hour: 21, minute: 15 }]);
assert.equal(period.resolveAssistantDayPeriodHour(12, "morning"), 0);
assert.equal(period.resolveAssistantDayPeriodHour(12, "afternoon"), 12);
assert.equal(period.resolveAssistantDayPeriodHour(12, "night"), 0);
assert.equal(period.resolveAssistantDayPeriodHour(8, "noon"), undefined, "invalid noon time rejected");
assert.equal(period.resolveAssistantDayPeriodHour(0, "morning"), undefined, "invalid explicit clock rejected");
const noon = parser.parseAssistantTurn("noon", { now, locale: "en", draft: waterDraft, pendingQuestion: "time" });
const midnight = parser.parseAssistantTurn("आधी रात", { now, locale: "hi", draft: waterDraft, pendingQuestion: "time" });
assert.equal(noon.draft.hour, 12);
assert.equal(midnight.draft.hour, 0);
assertions += 17;

const source = fs.readFileSync(path.join(root, "services", "hydromateAssistantParser.ts"), "utf8");
assert.match(source, /HydroMateAssistantTime locale=/);
assert.match(source, /parseAllTimeSlots\(semanticInput, options\.locale\)/);
assertions += 2;

console.log(`Assistant day-period fixtures passed: ${assertions} assertions across 12 languages, native digits, per-time periods, mixed AM\/PM, minutes, Medicine\/Routine follow-ups, noon\/midnight conversion, ambiguity resolution, and DEV diagnostics.`);

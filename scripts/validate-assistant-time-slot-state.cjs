const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-time-slot-state-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/hydromateAssistantParser.ts",
  "services/assistantLocaleNormalizer.ts",
  "services/assistantDayPeriod.ts",
  "services/waterAmountNormalizer.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const parser = require(path.join(output, "hydromateAssistantParser.js"));
const now = new Date(2026, 8, 5, 6, 0);
const recurringDraft = (count = 2) => ({
  category: "medicine",
  medicineName: "Crocin",
  medicineType: "tablet",
  dateSource: "none",
  scheduleMode: "recurring",
  timesPerDay: count,
  durationDays: 7,
});
let assertions = 0;
const equal = (actual, expected, message) => {
  assert.equal(actual, expected, message);
  assertions += 1;
};
const deepEqual = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
};

const hindiBareMorning = parser.parseAssistantTurn("7 बजे", {
  now, locale: "hi", draft: recurringDraft(1), pendingQuestion: "recurrenceTimes",
});
equal(hindiBareMorning.question, "timePeriod", "Hindi bare clock is unresolved");
const hindiMorning = parser.parseAssistantTurn("सुबह", {
  now, locale: "hi", draft: hindiBareMorning.draft, pendingQuestion: hindiBareMorning.question,
});
deepEqual(hindiMorning.draft.times, [{ hour: 7, minute: 0 }], "Hindi morning resolves once");
assert.notEqual(hindiMorning.question, "timePeriod"); assertions += 1;

const hindiBareNight = parser.parseAssistantTurn("7 बजे", {
  now, locale: "hi", draft: recurringDraft(1), pendingQuestion: "recurrenceTimes",
});
const hindiNight = parser.parseAssistantTurn("रात", {
  now, locale: "hi", draft: hindiBareNight.draft, pendingQuestion: hindiBareNight.question,
});
deepEqual(hindiNight.draft.times, [{ hour: 19, minute: 0 }], "Hindi night resolves once");
assert.notEqual(hindiNight.question, "timePeriod"); assertions += 1;

let twoBare = parser.parseAssistantTurn("7 बजे और 8 बजे", {
  now, locale: "hi", draft: recurringDraft(2), pendingQuestion: "recurrenceTimes",
});
equal(twoBare.question, "timePeriod", "two bare times ask for first period");
deepEqual(twoBare.draft.timeSlots.map((slot) => slot.status), ["unresolved", "unresolved"]);
twoBare = parser.parseAssistantTurn("सुबह", {
  now, locale: "hi", draft: twoBare.draft, pendingQuestion: twoBare.question,
});
equal(twoBare.question, "timePeriod", "only second period remains");
deepEqual(twoBare.draft.times, [{ hour: 7, minute: 0 }]);
deepEqual(twoBare.draft.timeSlots.map((slot) => slot.status), ["resolved", "unresolved"]);
twoBare = parser.parseAssistantTurn("रात", {
  now, locale: "hi", draft: twoBare.draft, pendingQuestion: twoBare.question,
});
equal(twoBare.state, "ready", "final period completes recurrence times");
deepEqual(twoBare.draft.times, [{ hour: 7, minute: 0 }, { hour: 20, minute: 0 }]);
deepEqual(twoBare.draft.timeSlots.map((slot) => slot.status), ["resolved", "resolved"]);

for (const phrase of [
  "7 बजे सुबह और 8 बजे रात",
  "सुबह 7 बजे और रात 8 बजे",
  "७ बजे सुबह और ८ बजे रात",
]) {
  const result = parser.parseAssistantTurn(phrase, {
    now, locale: "hi", draft: recurringDraft(2), pendingQuestion: "recurrenceTimes",
  });
  equal(result.state, "ready", `${phrase} completes directly`);
  deepEqual(result.draft.times, [{ hour: 7, minute: 0 }, { hour: 20, minute: 0 }]);
  assert.notEqual(result.question, "timePeriod"); assertions += 1;
}

const explicitEnglishCases = [
  ["8 AM and 8 PM", [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }]],
  ["8 PM and 9 AM", [{ hour: 20, minute: 0 }, { hour: 9, minute: 0 }]],
];
for (const [phrase, times] of explicitEnglishCases) {
  const result = parser.parseAssistantTurn(phrase, {
    now, locale: "en", draft: recurringDraft(2), pendingQuestion: "recurrenceTimes",
  });
  equal(result.state, "ready", `${phrase} completes directly`);
  deepEqual(result.draft.times, times);
  assert.notEqual(result.question, "timePeriod"); assertions += 1;
}

let englishBare = parser.parseAssistantTurn("8 and 9", {
  now, locale: "en", draft: recurringDraft(2), pendingQuestion: "recurrenceTimes",
});
equal(englishBare.question, "timePeriod", "English bare pair clarifies");
deepEqual(englishBare.draft.timeSlots.map((slot) => slot.status), ["unresolved", "unresolved"]);

let mixedEnglish = parser.parseAssistantTurn("8 AM and 9", {
  now, locale: "en", draft: recurringDraft(2), pendingQuestion: "recurrenceTimes",
});
equal(mixedEnglish.question, "timePeriod", "mixed English asks only for 9");
deepEqual(mixedEnglish.draft.times, [{ hour: 8, minute: 0 }]);
deepEqual(mixedEnglish.draft.timeSlots.map((slot) => slot.status), ["resolved", "unresolved"]);
mixedEnglish = parser.parseAssistantTurn("PM", {
  now, locale: "en", draft: mixedEnglish.draft, pendingQuestion: mixedEnglish.question,
});
equal(mixedEnglish.state, "ready");
deepEqual(mixedEnglish.draft.times, [{ hour: 8, minute: 0 }, { hour: 21, minute: 0 }]);

const languages = [
  { locale: "en", morning: "morning", night: "night", and: "and", bare: "at 7" },
  { locale: "hi", morning: "सुबह", night: "रात", and: "और", bare: "७ बजे" },
  { locale: "bn", morning: "সকাল", night: "রাত", and: "ও", bare: "৭ বাজে" },
  { locale: "mr", morning: "सकाळी", night: "रात्री", and: "आणि", bare: "७ वाजता" },
  { locale: "ta", morning: "காலை", night: "இரவு", and: "மற்றும்", bare: "௭ மணிக்கு" },
  { locale: "te", morning: "ఉదయం", night: "రాత్రి", and: "మరియు", bare: "౭ గంటలకు" },
  { locale: "gu", morning: "સવારે", night: "રાત્રે", and: "અને", bare: "૭ વાગ્યે" },
  { locale: "kn", morning: "ಬೆಳಿಗ್ಗೆ", night: "ರಾತ್ರಿ", and: "ಮತ್ತು", bare: "೭ ಗಂಟೆಗೆ" },
  { locale: "ml", morning: "രാവിലെ", night: "രാത്രി", and: "കൂടാതെ", bare: "൭ മണിക്ക്" },
  { locale: "pa", morning: "ਸਵੇਰੇ", night: "ਰਾਤ", and: "ਅਤੇ", bare: "੭ ਵਜੇ" },
  { locale: "bho", morning: "सवेरे", night: "रात", and: "और", bare: "७ बजे" },
  { locale: "bgc", morning: "सवेरे", night: "रात", and: "और", bare: "७ बजे" },
];
for (const item of languages) {
  const explicit = parser.parseAssistantTurn(`${item.morning} 7 ${item.and} ${item.night} 8`, {
    now, locale: item.locale, draft: recurringDraft(2), pendingQuestion: "recurrenceTimes",
  });
  equal(explicit.state, "ready", `${item.locale} explicit periods do not clarify`);
  deepEqual(explicit.draft.times, [{ hour: 7, minute: 0 }, { hour: 20, minute: 0 }]);
  assert.notEqual(explicit.question, "timePeriod"); assertions += 1;

  const bare = parser.parseAssistantTurn(item.bare, {
    now, locale: item.locale, draft: recurringDraft(1), pendingQuestion: "recurrenceTimes",
  });
  equal(bare.question, "timePeriod", `${item.locale} bare time clarifies once`);
  const resolved = parser.parseAssistantTurn(item.morning, {
    now, locale: item.locale, draft: bare.draft, pendingQuestion: bare.question,
  });
  assert.notEqual(resolved.question, "timePeriod"); assertions += 1;
  const replay = parser.parseAssistantTurn(item.morning, {
    now, locale: item.locale, draft: resolved.draft, pendingQuestion: "timePeriod",
  });
  assert.notEqual(replay.question, "timePeriod", `${item.locale} resolved slot never re-enters clarification`); assertions += 1;
}

const source = fs.readFileSync(path.join(root, "services", "hydromateAssistantParser.ts"), "utf8");
assert.match(source, /HydroMateAssistantLoopGuard/); assertions += 1;
assert.match(source, /HydroMateAssistantTimeState/); assertions += 1;
assert.match(source, /status: "unresolved" \| "resolved"/); assertions += 1;
const modal = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
assert.match(modal, /draftRef\.current = nextDraft;[\s\S]*pendingQuestionRef\.current = nextQuestion;[\s\S]*setPendingQuestion\(nextQuestion\)/); assertions += 1;
assert.match(modal, /commitPendingState\(result\.draft, result\.question\)[\s\S]*await speak\(question\)/); assertions += 1;
assert.match(modal, /const clauses = currentDraft \|\| currentQuestion \? \[command\]/); assertions += 1;
assert.match(modal, /HydroMateAssistantTimeState transition=confirmation/); assertions += 1;

console.log(`Assistant time-slot state fixtures passed: ${assertions} assertions covering sequential and direct multi-time resolution, mixed explicit\/bare periods, native digits, all 12 locales, loop prevention, authoritative ref ordering, and immediate confirmation transition.`);

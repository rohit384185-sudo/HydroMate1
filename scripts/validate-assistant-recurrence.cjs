const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-recurrence-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/hydromateAssistantParser.ts",
  "services/assistantLocaleNormalizer.ts",
  "services/waterAmountNormalizer.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const parser = require(path.join(output, "hydromateAssistantParser.js"));
const now = new Date(2026, 8, 4, 10, 0);
const baseDraft = (category) => ({
  category,
  ...(category === "water" ? { amountMl: 150 } : {}),
  ...(category === "medicine" ? { medicineName: "Crocin", medicineType: "tablet" } : {}),
  ...(category === "custom" ? { title: "Walk" } : {}),
  hour: 20, minute: 0, times: [{ hour: 20, minute: 0 }],
  day: 4, month: 9, dateSource: "none",
  targetAtMillis: new Date(2026, 8, 4, 20).getTime(),
});

const languages = [
  { locale: "en", once: "only once", two: "twice a day", three: "3 times per day", seven: "seven days", thirty: "30 days", native: "3 times per day for 30 days" },
  { locale: "hi", once: "सिर्फ़ एक बार", two: "दिन में दो बार", three: "दिन में 3 बार", seven: "सात दिन", thirty: "30 दिनों के लिए", native: "दिन में ३ बार ३० दिनों के लिए" },
  { locale: "bn", once: "শুধু একবার", two: "দিনে দুইবার", three: "দিনে 3 বার", seven: "সাত দিন", thirty: "30 দিনের জন্য", native: "দিনে ৩ বার ৩০ দিনের জন্য" },
  { locale: "mr", once: "फक्त एकदा", two: "दिवसातून दोनदा", three: "दिवसातून 3 वेळा", seven: "सात दिवस", thirty: "30 दिवसांसाठी", native: "दिवसातून ३ वेळा ३० दिवसांसाठी" },
  { locale: "ta", once: "ஒரே ஒரு முறை", two: "ஒரு நாளில் இரண்டு முறை", three: "ஒரு நாளில் 3 முறை", seven: "ஏழு நாட்கள்", thirty: "30 நாட்களுக்கு", native: "ஒரு நாளில் ௩ முறை ௩௦ நாட்களுக்கு" },
  { locale: "te", once: "ఒక్కసారి మాత్రమే", two: "రోజుకు రెండుసార్లు", three: "రోజుకు 3 సార్లు", seven: "ఏడు రోజులు", thirty: "30 రోజుల కోసం", native: "రోజుకు ౩ సార్లు ౩౦ రోజుల కోసం" },
  { locale: "gu", once: "ફક્ત એક વાર", two: "દિવસમાં બે વાર", three: "દિવસમાં 3 વાર", seven: "સાત દિવસ", thirty: "30 દિવસ માટે", native: "દિવસમાં ૩ વાર ૩૦ દિવસ માટે" },
  { locale: "kn", once: "ಕೇವಲ ಒಂದು ಬಾರಿ", two: "ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ", three: "ದಿನಕ್ಕೆ 3 ಬಾರಿ", seven: "ಏಳು ದಿನಗಳು", thirty: "30 ದಿನಗಳವರೆಗೆ", native: "ದಿನಕ್ಕೆ ೩ ಬಾರಿ ೩೦ ದಿನಗಳವರೆಗೆ" },
  { locale: "ml", once: "ഒരിക്കൽ മാത്രം", two: "ദിവസത്തിൽ രണ്ട് തവണ", three: "ദിവസത്തിൽ 3 തവണ", seven: "ഏഴ് ദിവസം", thirty: "30 ദിവസത്തേക്ക്", native: "ദിവസത്തിൽ ൩ തവണ ൩൦ ദിവസത്തേക്ക്" },
  { locale: "pa", once: "ਸਿਰਫ਼ ਇੱਕ ਵਾਰ", two: "ਦਿਨ ਵਿੱਚ ਦੋ ਵਾਰ", three: "ਦਿਨ ਵਿੱਚ 3 ਵਾਰ", seven: "ਸੱਤ ਦਿਨ", thirty: "30 ਦਿਨਾਂ ਲਈ", native: "ਦਿਨ ਵਿੱਚ ੩ ਵਾਰ ੩੦ ਦਿਨਾਂ ਲਈ" },
  { locale: "bho", once: "बस एक बेर", two: "दिन में दू बेर", three: "दिन में 3 बेर", seven: "सात दिन", thirty: "30 दिन के लिए", native: "दिन में ३ बेर ३० दिन के लिए" },
  { locale: "bgc", once: "सिर्फ एक बार", two: "दिन में दो बार", three: "दिन में 3 बार", seven: "सात दिन", thirty: "30 दिनों के लिए", native: "दिन में ३ बार ३० दिनों के लिए" },
];

let assertions = 0;
for (const language of languages) {
  for (const category of ["water", "medicine", "custom"]) {
    const draft = baseDraft(category);
    const once = parser.parseAssistantTurn(language.once, { now, locale: language.locale, draft, pendingQuestion: "timesPerDay" });
    assert.equal(once.state, "ready", `${language.locale} ${category} once ready`);
    assert.equal(once.draft.scheduleMode, "once");
    assertions += 2;

    const twice = parser.parseAssistantTurn(language.two, { now, locale: language.locale, draft, pendingQuestion: "timesPerDay" });
    assert.equal(twice.draft.timesPerDay, 2, `${language.locale} twice`);
    assert.equal(twice.question, "durationDays");
    const seven = parser.parseAssistantTurn(language.seven, { now, locale: language.locale, draft: twice.draft, pendingQuestion: twice.question });
    assert.equal(seven.draft.durationDays, 7, `${language.locale} seven days`);
    assert.equal(category === "water" ? seven.state : seven.question, category === "water" ? "ready" : "recurrenceTimes");
    assertions += 4;

    const combined = parser.parseAssistantTurn(language.native, { now, locale: language.locale, draft, pendingQuestion: "timesPerDay" });
    assert.equal(combined.draft.timesPerDay, 3, `${language.locale} native/combined times`);
    assert.equal(combined.draft.durationDays, 30, `${language.locale} native/combined days`);
    assert.equal(category === "water" ? combined.state : combined.question, category === "water" ? "ready" : "recurrenceTimes");
    const completed = category === "water" ? combined : parser.parseAssistantTurn("8 AM, 2 PM, 8 PM", { now, locale: language.locale, draft: combined.draft, pendingQuestion: combined.question });
    assert.equal(completed.state, "ready", `${language.locale} explicit times complete`);
    assert.equal(category === "water" ? completed.draft.timesPerDay : completed.draft.times.length, 3);
    assertions += 5;

    const customCount = parser.parseAssistantTurn("4 times per day for 45 days", { now, locale: language.locale, draft, pendingQuestion: "timesPerDay" });
    assert.equal(customCount.draft.timesPerDay, 4, `${language.locale} custom times/day`);
    assert.equal(customCount.draft.durationDays, 45, `${language.locale} custom days`);
    assert.equal(category === "water" ? customCount.state : customCount.question, category === "water" ? "ready" : "recurrenceTimes");
    const customTimes = category === "water" ? customCount : parser.parseAssistantTurn("7 AM, 11 AM, 3 PM, 9 PM", { now, locale: language.locale, draft: customCount.draft, pendingQuestion: customCount.question });
    assert.equal(customTimes.state, "ready");
    assertions += 4;
  }
}

const hindiWater = parser.parseAssistantTurn("मुझे 150 ml पानी पीने की याद दिलाओ", { now, locale: "hi" });
assert.equal(hindiWater.draft.amountMl, 150);
assert.equal(hindiWater.question, "time");
const hindiTimed = parser.parseAssistantTurn("रात 8 बजे", { now, locale: "hi", draft: hindiWater.draft, pendingQuestion: hindiWater.question });
assert.equal(hindiTimed.question, "timesPerDay");
const hindiOnce = parser.parseAssistantTurn("सिर्फ़ एक बार", { now, locale: "hi", draft: hindiTimed.draft, pendingQuestion: hindiTimed.question });
assert.equal(hindiOnce.state, "ready");
assert.equal(hindiOnce.draft.durationDays, undefined);
const hindiCombined = parser.parseAssistantTurn("दिन में 3 बार 10 दिनों के लिए", { now, locale: "hi", draft: hindiTimed.draft, pendingQuestion: hindiTimed.question });
assert.equal(hindiCombined.draft.timesPerDay, 3);
assert.equal(hindiCombined.draft.durationDays, 10);
assert.equal(hindiCombined.state, "ready");
const thirty = parser.parseAssistantTurn("30 दिनों के लिए", { now, locale: "hi", draft: { ...hindiTimed.draft, scheduleMode: "recurring", timesPerDay: 1 }, pendingQuestion: "durationDays" });
assert.equal(thirty.draft.durationDays, 30);
assert.equal(thirty.state, "ready");
assertions += 10;

const completeWaterCommand = parser.parseAssistantTurn(
  "Remind me to drink 150 ml water 3 times a day for 10 days",
  { now, locale: "en" }
);
assert.equal(completeWaterCommand.state, "ready", "complete Water recurrence needs no redundant slot question");
assert.equal(completeWaterCommand.draft.timesPerDay, 3);
assert.equal(completeWaterCommand.draft.durationDays, 10);
assertions += 3;

let invalid = parser.parseAssistantTurn("13 times per day", { now, draft: baseDraft("medicine"), pendingQuestion: "timesPerDay" });
assert.equal(invalid.question, "timesPerDayInvalid");
invalid = parser.parseAssistantTurn("zero", { now, draft: invalid.draft, pendingQuestion: invalid.question });
assert.equal(invalid.state, "cancelled");
let invalidDuration = parser.parseAssistantTurn("366 days", { now, draft: { ...baseDraft("custom"), scheduleMode: "recurring", timesPerDay: 1 }, pendingQuestion: "durationDays" });
assert.equal(invalidDuration.question, "durationDaysInvalid");
invalidDuration = parser.parseAssistantTurn("0", { now, draft: invalidDuration.draft, pendingQuestion: invalidDuration.question });
assert.equal(invalidDuration.state, "cancelled");
assertions += 4;

const birthday = parser.parseAssistantTurn("Rahul birthday 15 August at 8 AM", { now });
const anniversary = parser.parseAssistantTurn("Riya anniversary 15 August at 8 PM", { now });
assert.equal(birthday.state, "ready");
assert.equal(anniversary.state, "ready");
assertions += 2;

const modal = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
assert.doesNotMatch(modal, /saveAssistantReminder\(result\.draft\)/, "never saves before confirmation");
assert.match(modal, /savingRef\.current/, "duplicate confirmation guard");
assert.match(modal, /cancelInitialSilenceTimeout\(\)/, "success cancels timeout");
assert.match(modal, /finishAssistantConfirmation[\s\S]*close: \(\) => \{[\s\S]*requestAssistantClose\("reminder-save-success"\)/, "success auto-closes through the verified persistence gate");
assert.match(modal, /commitPendingState\(undefined, undefined\)/, "success and close clear authoritative recurrence state");
assertions += 5;

const creation = fs.readFileSync(path.join(root, "services", "assistantReminderCreationService.ts"), "utf8");
const waterScheduler = fs.readFileSync(path.join(root, "services", "reminderService.ts"), "utf8");
assert.match(creation, /getFiniteDurationDays/);
assert.match(creation, /replaceMedicineNotifications/);
assert.match(creation, /replaceDatedReminderNotifications/);
assert.match(waterScheduler, /hasFiniteDuration\(settings\)/);
assert.match(waterScheduler, /getFiniteOccurrenceIdentifier/);
assert.match(waterScheduler, /voiceRemindersEnabled,[\s\S]*expectedAtMillis,[\s\S]*false/, "finite Water voice alarms do not repeat");
const waterReceiver = fs.readFileSync(path.join(root, "modules", "hydromate-voice", "android", "src", "main", "java", "expo", "modules", "hydromatevoice", "VoiceAlarmReceiver.kt"), "utf8");
assert.match(waterReceiver, /if \(VoiceAlarmScheduler\.repeats\(context, identifier\)\)[\s\S]*scheduleNextWaterOccurrence[\s\S]*else \{[\s\S]*cancelWater/, "native Water receiver honors finite repeat state");
assertions += 7;

const translationKeys = [
  "assistant.question.timesPerDay", "assistant.question.timesPerDayInvalid",
  "assistant.question.durationDays", "assistant.question.durationDaysInvalid",
  "assistant.question.recurrenceTimes", "assistant.question.recurrenceTimesInvalid",
  "assistant.onceChoice", "assistant.timesDailyChoice", "assistant.daysChoice",
  "assistant.onceSummary", "assistant.recurringSummary", "assistant.explicitTimesSummary",
];
const placeholderPattern = /\{([^}]+)\}/g;
const valueFor = (source, key) => source.match(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*"([^"]*)"`))?.[1] ?? "";
const english = fs.readFileSync(path.join(root, "localization", "en.ts"), "utf8");
for (const language of languages) {
  const source = fs.readFileSync(path.join(root, "localization", `${language.locale}.ts`), "utf8");
  for (const key of translationKeys) {
    const expected = [...valueFor(english, key).matchAll(placeholderPattern)].map((match) => match[1]).sort();
    const actualValue = valueFor(source, key);
    assert.ok(actualValue, `${language.locale}:${key} localized`);
    assert.deepEqual([...actualValue.matchAll(placeholderPattern)].map((match) => match[1]).sort(), expected, `${language.locale}:${key} placeholders`);
    assertions += 2;
  }
}

console.log(`Ask HydroMate recurrence fixtures passed: ${assertions} assertions across 12 languages, Water/Medicine/Routine, bounds, native digits, explicit times, confirmation gating, and success auto-close.`);

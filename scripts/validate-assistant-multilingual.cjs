const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-multilingual-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [
  compiler,
  "services/hydromateAssistantParser.ts",
  "services/assistantLocaleNormalizer.ts",
  "services/waterAmountNormalizer.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const parser = require(path.join(output, "hydromateAssistantParser.js"));
const now = new Date(2026, 0, 10, 10, 0);
const languages = [
  { locale: "en", water: "water", medicine: "medicine", birthday: "birthday", anniversary: "anniversary", routine: "routine", remind: "Remind me to", at: "at", am: "AM", pm: "PM", august: "August", d8: "8", d15: "15", d150: "150", unit: "ml", cancel: "cancel" },
  { locale: "hi", water: "पानी", medicine: "दवा", birthday: "जन्मदिन", anniversary: "सालगिरह", routine: "दिनचर्या", remind: "मुझे याद दिलाओ", at: "बजे", am: "सुबह", pm: "शाम", august: "अगस्त", d8: "८", d15: "१५", d150: "१५०", unit: "एमएल", cancel: "रद्द करो" },
  { locale: "bn", water: "জল", medicine: "ওষুধ", birthday: "জন্মদিন", anniversary: "বার্ষিকী", routine: "রুটিন", remind: "আমাকে মনে করিয়ে দাও", at: "টায়", am: "সকাল", pm: "সন্ধ্যা", august: "আগস্ট", d8: "৮", d15: "১৫", d150: "১৫০", unit: "এমএল", cancel: "বাতিল" },
  { locale: "mr", water: "पाणी", medicine: "औषध", birthday: "वाढदिवस", anniversary: "वर्धापनदिन", routine: "दिनक्रम", remind: "मला आठवण करून द्या", at: "वाजता", am: "सकाळी", pm: "संध्याकाळी", august: "ऑगस्ट", d8: "८", d15: "१५", d150: "१५०", unit: "मिलीलीटर", cancel: "रद्द करा" },
  { locale: "ta", water: "தண்ணீர்", medicine: "மருந்து", birthday: "பிறந்தநாள்", anniversary: "ஆண்டுவிழா", routine: "வழக்கம்", remind: "எனக்கு நினைவூட்டு", at: "மணிக்கு", am: "காலை", pm: "மாலை", august: "ஆகஸ்ட்", d8: "௮", d15: "௧௫", d150: "௧௫௦", unit: "எம்.எல்", cancel: "ரத்து" },
  { locale: "te", water: "నీరు", medicine: "మందు", birthday: "పుట్టినరోజు", anniversary: "వార్షికోత్సవం", routine: "దినచర్య", remind: "నాకు గుర్తు చేయి", at: "గంటలకు", am: "ఉదయం", pm: "సాయంత్రం", august: "ఆగస్టు", d8: "౮", d15: "౧౫", d150: "౧౫౦", unit: "ఎంఎల్", cancel: "రద్దు" },
  { locale: "gu", water: "પાણી", medicine: "દવા", birthday: "જન્મદિવસ", anniversary: "વર્ષગાંઠ", routine: "નિત્યક્રમ", remind: "મને યાદ કરાવો", at: "વાગ્યે", am: "સવારે", pm: "સાંજે", august: "ઑગસ્ટ", d8: "૮", d15: "૧૫", d150: "૧૫૦", unit: "એમએલ", cancel: "રદ" },
  { locale: "kn", water: "ನೀರು", medicine: "ಔಷಧ", birthday: "ಹುಟ್ಟುಹಬ್ಬ", anniversary: "ವಾರ್ಷಿಕೋತ್ಸವ", routine: "ದಿನಚರಿ", remind: "ನನಗೆ ನೆನಪಿಸಿ", at: "ಗಂಟೆಗೆ", am: "ಬೆಳಿಗ್ಗೆ", pm: "ಸಂಜೆ", august: "ಆಗಸ್ಟ್", d8: "೮", d15: "೧೫", d150: "೧೫೦", unit: "ಎಂಎಲ್", cancel: "ರದ್ದು" },
  { locale: "ml", water: "വെള്ളം", medicine: "മരുന്ന്", birthday: "ജന്മദിനം", anniversary: "വാർഷികം", routine: "ദിനചര്യ", remind: "എന്നെ ഓർമ്മിപ്പിക്കുക", at: "മണിക്ക്", am: "രാവിലെ", pm: "വൈകുന്നേരം", august: "ഓഗസ്റ്റ്", d8: "൮", d15: "൧൫", d150: "൧൫൦", unit: "എംഎൽ", cancel: "റദ്ദാക്കുക" },
  { locale: "pa", water: "ਪਾਣੀ", medicine: "ਦਵਾਈ", birthday: "ਜਨਮਦਿਨ", anniversary: "ਵਰ੍ਹੇਗੰਢ", routine: "ਰੁਟੀਨ", remind: "ਮੈਨੂੰ ਯਾਦ ਕਰਾਓ", at: "ਵਜੇ", am: "ਸਵੇਰੇ", pm: "ਸ਼ਾਮ", august: "ਅਗਸਤ", d8: "੮", d15: "੧੫", d150: "੧੫੦", unit: "ਐਮਐਲ", cancel: "ਰੱਦ" },
  { locale: "bho", water: "पानी", medicine: "दवाई", birthday: "जन्मदिन", anniversary: "सालगिरह", routine: "रूटीन", remind: "हमके याद दिलाईं", at: "बजे", am: "सुबह", pm: "शाम", august: "अगस्त", d8: "८", d15: "१५", d150: "१५०", unit: "मिली लीटर", cancel: "रद्द" },
  { locale: "bgc", water: "पाणी", medicine: "दवा", birthday: "जन्मदिन", anniversary: "सालगिरह", routine: "रूटीन", remind: "मन्ने याद दिला", at: "बजे", am: "सुबह", pm: "शाम", august: "अगस्त", d8: "८", d15: "१५", d150: "१५०", unit: "एमएल", cancel: "रद्द" },
];
const tomorrowByLocale = {
  en: "tomorrow", hi: "कल", bn: "আগামীকাল", mr: "उद्या", ta: "நாளை", te: "రేపు",
  gu: "આવતીકાલે", kn: "ನಾಳೆ", ml: "നാളെ", pa: "ਕੱਲ੍ਹ", bho: "कल", bgc: "कल",
};
const eightWordsByLocale = {
  en: "eight", hi: "आठ", bn: "আট", mr: "आठ", ta: "எட்டு", te: "ఎనిమిది",
  gu: "આઠ", kn: "ಎಂಟು", ml: "എട്ട്", pa: "ਅੱਠ", bho: "आठ", bgc: "आठ",
};

let directCount = 0;
let followUpCount = 0;
function expectReady(result, locale, category) {
  if (["water", "medicine", "custom"].includes(category)) {
    assert.equal(result.question, "timesPerDay", `${locale} ${category} continues to recurrence`);
  } else {
    assert.equal(result.state, "ready", `${locale} ${category} complete request`);
  }
  assert.equal(result.draft.category, category, `${locale} ${category} intent`);
  directCount += 1;
}

for (const item of languages) {
  const water = parser.parseAssistantTurn(`${item.water} ${item.d150} ${item.unit} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  expectReady(water, item.locale, "water");
  assert.equal(water.draft.amountMl, 150, `${item.locale} water amount`);
  const missingWater = parser.parseAssistantTurn(`${item.water} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  assert.equal(missingWater.question, "waterAmount", `${item.locale} missing water amount`);
  const waterReply = parser.parseAssistantTurn(item.d150, { now, locale: item.locale, draft: missingWater.draft, pendingQuestion: missingWater.question });
  assert.equal(waterReply.question, "timesPerDay", `${item.locale} water amount follow-up`);
  followUpCount += 1;

  const medicine = parser.parseAssistantTurn(`${item.remind} Crocin ${item.medicine} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  expectReady(medicine, item.locale, "medicine");
  assert.equal(medicine.draft.medicineName, "Crocin", `${item.locale} preserves medicine brand`);

  const birthday = parser.parseAssistantTurn(`Rahul ${item.birthday} ${item.d15} ${item.august} ${item.d8} ${item.at} ${item.am}`, { now, locale: item.locale });
  expectReady(birthday, item.locale, "birthday");
  assert.equal(birthday.draft.title, "Rahul", `${item.locale} preserves birthday name`);
  assert.deepEqual([birthday.draft.day, birthday.draft.month], [15, 8], `${item.locale} birthday date`);

  const anniversary = parser.parseAssistantTurn(`Riya ${item.anniversary} ${item.d15} ${item.august} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  expectReady(anniversary, item.locale, "anniversary");
  assert.equal(anniversary.draft.title, "Riya", `${item.locale} preserves anniversary label`);

  const custom = parser.parseAssistantTurn(`${item.remind} Walk ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  expectReady(custom, item.locale, "custom");
  assert.equal(custom.draft.title, "Walk", `${item.locale} preserves custom title`);

  const missingMedicineName = parser.parseAssistantTurn(`${item.medicine} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  assert.equal(missingMedicineName.question, "medicineName", `${item.locale} missing medicine name`);
  const medicineNameReply = parser.parseAssistantTurn("Allegra", { now, locale: item.locale, draft: missingMedicineName.draft, pendingQuestion: missingMedicineName.question });
  assert.equal(medicineNameReply.question, "timesPerDay", `${item.locale} medicine-name follow-up`);
  assert.equal(medicineNameReply.draft.medicineName, "Allegra", `${item.locale} medicine-name exactness`);
  followUpCount += 1;

  const missingMedicineTime = parser.parseAssistantTurn(`${item.remind} Crocin ${item.medicine}`, { now, locale: item.locale });
  assert.equal(missingMedicineTime.question, "time", `${item.locale} missing medicine time`);
  const medicineTimeReply = parser.parseAssistantTurn(`${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale, draft: missingMedicineTime.draft, pendingQuestion: missingMedicineTime.question });
  assert.equal(medicineTimeReply.question, "timesPerDay", `${item.locale} medicine-time follow-up`);
  followUpCount += 1;
  const wordTimeReply = parser.parseAssistantTurn(`${eightWordsByLocale[item.locale]} ${item.pm}`, { now, locale: item.locale, draft: missingMedicineTime.draft, pendingQuestion: missingMedicineTime.question });
  assert.equal(wordTimeReply.question, "timesPerDay", `${item.locale} localized number-word time`);
  const ambiguousTime = parser.parseAssistantTurn(`${item.d8} ${item.at}`, { now, locale: item.locale, draft: missingMedicineTime.draft, pendingQuestion: missingMedicineTime.question });
  assert.equal(ambiguousTime.question, "timePeriod", `${item.locale} localized time without period asks AM/PM`);
  const resolvedPeriod = parser.parseAssistantTurn(item.pm, { now, locale: item.locale, draft: ambiguousTime.draft, pendingQuestion: ambiguousTime.question });
  assert.equal(resolvedPeriod.question, "timesPerDay", `${item.locale} localized AM/PM follow-up`);

  const missingBirthdayDate = parser.parseAssistantTurn(`Rahul ${item.birthday} ${item.d8} ${item.at} ${item.am}`, { now, locale: item.locale });
  assert.equal(missingBirthdayDate.question, "date", `${item.locale} missing birthday date`);
  const birthdayDateReply = parser.parseAssistantTurn(`${item.d15} ${item.august}`, { now, locale: item.locale, draft: missingBirthdayDate.draft, pendingQuestion: missingBirthdayDate.question });
  assert.equal(birthdayDateReply.state, "ready", `${item.locale} birthday-date follow-up`);
  followUpCount += 1;
  const missingBirthdayTitle = parser.parseAssistantTurn(`${item.birthday} ${item.d15} ${item.august} ${item.d8} ${item.at} ${item.am}`, { now, locale: item.locale });
  assert.equal(missingBirthdayTitle.question, "title", `${item.locale} missing birthday name`);
  const birthdayTitleReply = parser.parseAssistantTurn("Aarav", { now, locale: item.locale, draft: missingBirthdayTitle.draft, pendingQuestion: missingBirthdayTitle.question });
  assert.equal(birthdayTitleReply.state, "ready", `${item.locale} birthday-name follow-up`);
  assert.equal(birthdayTitleReply.draft.title, "Aarav", `${item.locale} birthday-name exactness`);
  followUpCount += 1;

  const missingAnniversaryTitle = parser.parseAssistantTurn(`${item.anniversary} ${item.d15} ${item.august} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  assert.equal(missingAnniversaryTitle.question, "title", `${item.locale} missing anniversary label`);
  const anniversaryTitleReply = parser.parseAssistantTurn("Riya & Sam", { now, locale: item.locale, draft: missingAnniversaryTitle.draft, pendingQuestion: missingAnniversaryTitle.question });
  assert.equal(anniversaryTitleReply.state, "ready", `${item.locale} anniversary-label follow-up`);
  assert.equal(anniversaryTitleReply.draft.title, "Riya & Sam", `${item.locale} anniversary-label exactness`);
  followUpCount += 1;
  const missingAnniversaryDate = parser.parseAssistantTurn(`Riya ${item.anniversary} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  assert.equal(missingAnniversaryDate.question, "date", `${item.locale} missing anniversary date`);
  const anniversaryDateReply = parser.parseAssistantTurn(`${item.d15} ${item.august}`, { now, locale: item.locale, draft: missingAnniversaryDate.draft, pendingQuestion: missingAnniversaryDate.question });
  assert.equal(anniversaryDateReply.state, "ready", `${item.locale} anniversary-date follow-up`);
  followUpCount += 1;

  const missingCustomTitle = parser.parseAssistantTurn(`${item.routine} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  assert.equal(missingCustomTitle.question, "title", `${item.locale} missing custom title`);
  const customTitleReply = parser.parseAssistantTurn("Take a walk", { now, locale: item.locale, draft: missingCustomTitle.draft, pendingQuestion: missingCustomTitle.question });
  assert.equal(customTitleReply.question, "timesPerDay", `${item.locale} custom-title follow-up`);
  assert.equal(customTitleReply.draft.title, "Take a walk", `${item.locale} custom-title exactness`);
  followUpCount += 1;

  const missingCustomTime = parser.parseAssistantTurn(`${item.remind} Walk`, { now, locale: item.locale });
  assert.equal(missingCustomTime.question, "time", `${item.locale} missing custom time`);
  const customTimeReply = parser.parseAssistantTurn(`${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale, draft: missingCustomTime.draft, pendingQuestion: missingCustomTime.question });
  assert.equal(customTimeReply.question, "timesPerDay", `${item.locale} custom-time follow-up`);
  followUpCount += 1;

  const localizedTomorrow = parser.parseAssistantTurn(`${item.remind} Walk ${tomorrowByLocale[item.locale]} ${item.d8} ${item.at} ${item.pm}`, { now, locale: item.locale });
  assert.equal(localizedTomorrow.draft.dateSource, "tomorrow", `${item.locale} localized tomorrow`);
  const dailyRoutine = parser.parseAssistantTurn(`${item.remind} Walk ${item.d8} ${item.at} ${item.pm} ${item.locale === "en" ? "every day" : ({ hi: "हर दिन", bn: "প্রতিদিন", mr: "दररोज", ta: "தினமும்", te: "ప్రతిరోజూ", gu: "દરરોજ", kn: "ಪ್ರತಿದಿನ", ml: "എല്ലാ ദിവസവും", pa: "ਹਰ ਰੋਜ਼", bho: "रोज", bgc: "रोज" })[item.locale]}`, { now, locale: item.locale });
  assert.equal(dailyRoutine.draft.title, "Walk", `${item.locale} recurrence phrase does not pollute custom title`);
  const twentyFourHour = parser.parseAssistantTurn(`${item.routine} at 20:30`, { now, locale: item.locale });
  assert.deepEqual([twentyFourHour.draft.hour, twentyFourHour.draft.minute], [20, 30], `${item.locale} 24-hour time`);

  const invalidDrafts = [
    parser.parseAssistantTurn(`5000 ${item.unit}`, { now, locale: item.locale, draft: missingWater.draft, pendingQuestion: missingWater.question }),
    parser.parseAssistantTurn("29 PM", { now, locale: item.locale, draft: missingMedicineTime.draft, pendingQuestion: missingMedicineTime.question }),
    parser.parseAssistantTurn(`32 ${item.august}`, { now, locale: item.locale, draft: missingBirthdayDate.draft, pendingQuestion: missingBirthdayDate.question }),
    parser.parseAssistantTurn(`32 ${item.august}`, { now, locale: item.locale, draft: missingAnniversaryDate.draft, pendingQuestion: missingAnniversaryDate.question }),
    parser.parseAssistantTurn("29 PM", { now, locale: item.locale, draft: missingCustomTime.draft, pendingQuestion: missingCustomTime.question }),
  ];
  assert.ok(invalidDrafts.every((result) => result.state === "question"), `${item.locale} invalid values cannot become ready`);

  for (const pending of [missingWater, missingMedicineTime, missingBirthdayDate, missingAnniversaryDate, missingCustomTime]) {
    const categoryCancel = parser.parseAssistantTurn(item.cancel, { now, locale: item.locale, draft: pending.draft, pendingQuestion: pending.question });
    assert.equal(categoryCancel.state, "cancelled", `${item.locale} ${pending.draft.category} cancellation`);
  }

  const cancelled = parser.parseAssistantTurn(item.cancel, { now, locale: item.locale, draft: missingCustomTitle.draft, pendingQuestion: missingCustomTitle.question });
  assert.equal(cancelled.state, "cancelled", `${item.locale} cancellation`);
}

const multipleMedicineTimes = parser.parseAssistantTurn("दवा Crocin ८ बजे सुबह और ९ बजे शाम", { now, locale: "hi" });
assert.equal(multipleMedicineTimes.question, "timesPerDay", "localized multiple medicine times continues to recurrence");
assert.deepEqual(multipleMedicineTimes.draft.times, [{ hour: 8, minute: 0 }, { hour: 21, minute: 0 }]);

const tomorrow = parser.parseAssistantTurn("Walk tomorrow at 8 PM", { now, locale: "en" });
assert.equal(tomorrow.draft.dateSource, "tomorrow", "tomorrow normalization");
const dayAfterTomorrow = parser.parseAssistantTurn("Walk परसों ८ बजे शाम", { now, locale: "hi" });
assert.equal(dayAfterTomorrow.draft.dateSource, "relative", "day-after-tomorrow normalization");

const birthdayCollision = parser.classifyAssistantIntent("Crocin birthday", ["Crocin"]);
assert.deepEqual(birthdayCollision, { category: "birthday", ambiguous: false }, "dated event outranks a known medicine name used as a person label");
assert.equal(parser.classifyAssistantIntent("take medicine with water").ambiguous, true, "genuinely conflicting medicine/water intent asks for category");
assert.deepEqual(parser.classifyAssistantIntent("routine take medicine"), { category: "custom", ambiguous: false }, "explicit routine intent outranks a medicine word inside the task");
const localizedMedicineType = parser.parseAssistantTurn("Crocin गोली ८ बजे शाम", { now, locale: "hi" });
assert.equal(localizedMedicineType.draft.medicineType, "tablet", "localized medicine type uses existing stored type value");
assert.equal(localizedMedicineType.draft.medicineName, "Crocin", "localized medicine type is excluded from the brand name");
const numberNamedMedicine = parser.parseAssistantTurn("Remind me to take Seven at 8 PM", { now, locale: "en" });
assert.equal(numberNamedMedicine.draft.medicineName, "Seven", "number-like medicine brand is preserved exactly");

const modalSource = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
assert.match(modalSource, /result\.state === "cancelled"/);
assert.match(modalSource, /onPress=\{\(\) => void finalizeReminderConfirmation\("tap"\)\}/);
assert.match(modalSource, /await persistAssistantConfirmation\(saveLedgerRef.current, draftsToSave, saveAssistantReminder\)/);
assert.doesNotMatch(modalSource, /saveAssistantReminder\(result\.draft\)/, "parser-ready drafts are not saved before review confirmation");
const creationSource = fs.readFileSync(path.join(root, "services", "assistantReminderCreationService.ts"), "utf8");
assert.match(creationSource, /matchingIndex >= 0/, "medicine save merges matching deterministic records");
assert.match(creationSource, /existingIndex >= 0/, "dated reminder save reconciles deterministic duplicates");

const assistantTranslationKeys = [
  "assistant.question.category", "assistant.question.medicineName", "assistant.question.waterAmount",
  "assistant.question.waterAmountInvalid", "assistant.question.title", "assistant.question.date",
  "assistant.question.time", "assistant.question.timePeriod", "assistant.question.duration",
  "assistant.question.medicineDaily", "assistant.question.unsupportedMedicineDate",
  "assistant.question.pastTime", "assistant.question.unclear", "assistant.cancelled",
  "assistant.confirmAll", "assistant.savedAll", "assistant.savedMasterOff",
  "assistant.savedSomeCategoriesOff", "assistant.saveError",
];
const placeholderPattern = /\{([^}]+)\}/g;
function translationValue(source, key) {
  return source.match(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*"([^"]*)"`))?.[1] ?? "";
}
const englishSource = fs.readFileSync(path.join(root, "localization", "en.ts"), "utf8");
for (const { locale } of languages) {
  const source = fs.readFileSync(path.join(root, "localization", `${locale}.ts`), "utf8");
  for (const key of assistantTranslationKeys) {
    const value = translationValue(source, key);
    assert.ok(value, `${locale}:${key} localized`);
    const expectedPlaceholders = [...translationValue(englishSource, key).matchAll(placeholderPattern)].map((match) => match[1]).sort();
    const actualPlaceholders = [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort();
    assert.deepEqual(actualPlaceholders, expectedPlaceholders, `${locale}:${key} placeholder parity`);
  }
}

assert.equal(directCount, 60, "12 languages x 5 direct reminder types");
assert.equal(followUpCount, 108, "nine representative slot follow-ups per language");
console.log(`Ask HydroMate multilingual fixtures passed: ${directCount} direct intents + ${followUpCount} slot follow-ups across 12 languages, plus cancellation, native digits, localized dates/times, multiple medicine times, collisions, and confirmation gating.`);

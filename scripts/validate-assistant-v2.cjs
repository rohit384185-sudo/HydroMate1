const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-v2-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
const sources = [
  "services/hydromateAssistantParser.ts",
  "services/reminderPlanModel.ts",
  "services/reminderDurationService.ts",
  "services/speechPermissionState.ts",
  "services/speechTranscriptDelivery.ts",
  "services/assistantRecentReminderModel.ts",
];

execFileSync(process.execPath, [compiler, ...sources, "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck"], { cwd: root, stdio: "inherit" });
const parser = require(path.join(output, "hydromateAssistantParser.js"));
const planModel = require(path.join(output, "reminderPlanModel.js"));
const permission = require(path.join(output, "speechPermissionState.js"));
const speechDelivery = require(path.join(output, "speechTranscriptDelivery.js"));
const recentModel = require(path.join(output, "assistantRecentReminderModel.js"));

const now = new Date(2026, 7, 29, 10, 0);
const utterance = "Remind me to take Crocin at 8 in the morning and 8 in the evening for five days, and remind me to walk at 7 PM for thirty days.";
const clauses = parser.splitAssistantReminderClauses(utterance);
assert.equal(clauses.length, 2);
const medicine = parser.parseAssistantTurn(clauses[0], { now });
const routine = parser.parseAssistantTurn(clauses[1], { now });
assert.equal(medicine.question, "timesPerDay");
assert.equal(medicine.draft.medicineName, "Crocin");
assert.deepEqual(medicine.draft.times, [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }]);
assert.equal(medicine.draft.durationDays, 5);
assert.equal(routine.question, "timesPerDay");
assert.equal(routine.draft.durationDays, 30);

const ambiguous = parser.parseAssistantTurn("8", { now, draft: { category: "custom", title: "Walk", dateSource: "none" }, pendingQuestion: "time" });
assert.equal(ambiguous.question, "timePeriod");
const resolved = parser.parseAssistantTurn("PM", { now, draft: ambiguous.draft, pendingQuestion: ambiguous.question });
assert.equal(resolved.question, "timesPerDay");
assert.equal(resolved.draft.hour, 20);
assert.equal(resolved.draft.minute, 0);
const tomorrowMorning = parser.parseAssistantTurn("walk at 8 tomorrow morning for five days", { now });
assert.equal(tomorrowMorning.draft.hour, 8);
assert.equal(tomorrowMorning.draft.dateSource, "tomorrow");
const durationReply = parser.parseAssistantTurn("5", { now, draft: { category: "custom", title: "Walk", hour: 19, minute: 0, day: 30, month: 8, dateSource: "tomorrow" }, pendingQuestion: "duration" });
assert.equal(durationReply.draft.durationDays, 5);

let deliveryState = { sessionId: 0 };
deliveryState = speechDelivery.beginSpeechTranscriptSession(deliveryState);
const claimedFinal = speechDelivery.claimSpeechTranscript(deliveryState, "PM");
assert.equal(claimedFinal.transcript, "PM");
deliveryState = claimedFinal.state;
assert.equal(speechDelivery.claimSpeechTranscript(deliveryState, "PM").transcript, undefined);
assert.equal(speechDelivery.claimSpeechTranscript(deliveryState, "PM").transcript, undefined);
const autoFollowUp = parser.parseAssistantTurn(claimedFinal.transcript, { now, draft: ambiguous.draft, pendingQuestion: ambiguous.question });
assert.equal(autoFollowUp.draft.hour, 20);
deliveryState = speechDelivery.beginSpeechTranscriptSession(deliveryState);
assert.equal(speechDelivery.claimSpeechTranscript(deliveryState, "Five days").transcript, "Five days");
deliveryState = speechDelivery.beginSpeechTranscriptSession(deliveryState);
const claimedMulti = speechDelivery.claimSpeechTranscript(deliveryState, utterance);
assert.equal(parser.splitAssistantReminderClauses(claimedMulti.transcript).length, 2);

assert.equal(permission.getHydroMateSpeechPermissionState({ granted: true, canAskAgain: true }), "granted");
assert.equal(permission.getHydroMateSpeechPermissionState({ granted: false, canAskAgain: true }), "requestable");
assert.equal(permission.getHydroMateSpeechPermissionState({ granted: false, canAskAgain: false }), "blocked");

const references = [{ category: "medicine", recordId: "stable-id", label: "Crocin", createdByAssistant: true }];
const createdAt = "2026-01-01T00:00:00.000Z";
const plan = planModel.createReminderPlanRecord("30-Day Health Plan", references, 30, new Date(2026, 0, 1), createdAt);
assert.equal(plan.id, planModel.createReminderPlanRecord("30-Day Health Plan", references, 30, new Date(2026, 0, 1), createdAt).id);
assert.deepEqual(planModel.getReminderPlanProgress(plan, new Date(2026, 0, 12)), { day: 12, total: 30, finished: false });
assert.equal(planModel.getReminderPlanProgress(plan, new Date(2026, 0, 31)).finished, true);
assert.equal(planModel.continueReminderPlanRecord(plan, 7, new Date(2026, 0, 31)).status, "active");
assert.equal(planModel.updateReminderPlanReferenceRecord(plan, references).reminderReferences.length, 1);
assert.equal(planModel.archiveReminderPlanRecord(plan).status, "archived");

const recentInput = { authoritativeRecordId: "stable-id", category: "medicine", displayTitle: "Crocin", times: ["08:00", "20:00"], durationDays: 5, planId: plan.id };
const recent = recentModel.createAssistantRecentReminder(recentInput, new Date(2026, 0, 1, 9));
assert.equal(recentModel.getAssistantRecentReminderAgeDays(recent, new Date(2026, 0, 1, 20)), 0);
assert.equal(recentModel.isAssistantRecentReminderReadyForReview(recent, new Date(2026, 0, 7)), false);
assert.equal(recentModel.isAssistantRecentReminderReadyForReview(recent, new Date(2026, 0, 8)), true);
const kept = recentModel.keepAssistantRecentReminderRecord(recent, new Date(2026, 0, 8));
assert.equal(recentModel.isAssistantRecentReminderReadyForReview(kept, new Date(2026, 0, 14)), false);
assert.equal(recentModel.isAssistantRecentReminderReadyForReview(kept, new Date(2026, 0, 15)), true);
const removed = recentModel.removeAssistantRecentReminderRecord(kept, new Date(2026, 0, 15));
assert.equal(removed.reviewState, "removed");
assert.equal(removed.planId, plan.id);
assert.equal(recentModel.pruneAssistantRecentReminders([removed], new Date(2026, 2, 17)).length, 0);
const refreshed = recentModel.createAssistantRecentReminder(recentInput, new Date(2026, 0, 2));
assert.equal(refreshed.id, recent.id);
assert.equal(recentModel.mergeAssistantRecentReminders([recent], [refreshed]).length, 1);

const localeFiles = ["en", "hi", "bn", "mr", "ta", "te", "gu", "kn", "ml", "pa", "bho", "bgc"];
const keyPattern = /"([^"]+)"\s*:/g;
const placeholderPattern = /\{([^}]+)\}/g;
const dictionaries = Object.fromEntries(localeFiles.map((language) => {
  const source = fs.readFileSync(path.join(root, "localization", `${language}.ts`), "utf8");
  const entries = [...source.matchAll(keyPattern)].map((match) => match[1]);
  return [language, { source, entries }];
}));
const v2Keys = [
  "assistant.question.timePeriod", "assistant.question.waterAmountInvalid", "assistant.speechPermissionBlocked", "assistant.reviewTranscript",
  "assistant.understoodCount", "assistant.editItemPrompt", "assistant.addAnotherPrompt", "assistant.addAnother",
  "assistant.confirmAll", "assistant.savedAll", "assistant.savedSomeCategoriesOff", "assistant.saveAsPlan",
  "assistant.defaultPlanName", "assistant.planNamePlaceholder", "assistant.planProgress", "assistant.planFinished",
  "assistant.planFinishedQuestion", "assistant.continueDays", "assistant.updatePlan", "assistant.updatePlanPrompt",
  "assistant.archivePlan", "assistant.microphoneSettingsTitle", "assistant.microphoneSettingsMessage",
  "assistant.continueCustom", "assistant.customContinuePrompt", "assistant.planContinued",
  "assistant.recentReviewCount", "assistant.reviewRecent", "assistant.recentReminders",
  "assistant.hideRecent", "assistant.showRecent", "assistant.readyForReview", "assistant.addedToday",
  "assistant.addedDaysAgo", "assistant.recentSevenDayMessage", "assistant.keepRecent",
  "assistant.removeFromRecent", "assistant.reviewAgainSevenDays",
];
for (const language of localeFiles) {
  const available = new Set(dictionaries[language].entries);
  assert.deepEqual(v2Keys.filter((key) => !available.has(key)), [], `${language} V2 translation-key parity`);
  for (const key of v2Keys) {
    const readValue = (source) => source.match(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*"([^"]*)"`))?.[1] ?? "";
    const expected = [...readValue(dictionaries.en.source).matchAll(placeholderPattern)].map((match) => match[1]).sort();
    const actual = [...readValue(dictionaries[language].source).matchAll(placeholderPattern)].map((match) => match[1]).sort();
    assert.deepEqual(actual, expected, `${language}:${key} placeholder parity`);
  }
}

const creationSource = fs.readFileSync(path.join(root, "services", "assistantReminderCreationService.ts"), "utf8");
assert.match(creationSource, /replaceMedicineNotifications\(updatedReminders\)/);
assert.match(creationSource, /replaceDatedReminderNotifications/);
assert.match(creationSource, /scheduleWaterReminders/);
const recentServiceSource = fs.readFileSync(path.join(root, "services", "assistantRecentReminderService.ts"), "utf8");
assert.match(recentServiceSource, /hydromate-assistant-recent-reminders/);
assert.doesNotMatch(recentServiceSource, /cancel|schedule|deleteReminder|archiveReminderPlan/);
console.log("Ask HydroMate V2 fixtures passed: auto-submit, duplicate-final protection, conversational follow-up, multi-reminder speech, recent persistence model, seven-day review, Keep, Remove isolation, Plan isolation, localization, and engine reuse.");

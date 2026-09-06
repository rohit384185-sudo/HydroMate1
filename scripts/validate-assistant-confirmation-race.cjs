const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const modal = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
const hook = fs.readFileSync(path.join(root, "hooks", "useHydroMateSpeechRecognition.ts"), "utf8");
let assertions = 0;

const confirmBranch = modal.slice(
  modal.indexOf('if (intent === "confirm")'),
  modal.indexOf('if (intent === "reject")')
);
assert.doesNotMatch(confirmBranch, /commitPendingState\(undefined, undefined\)/, "confirmation cannot clear authoritative state before save");
assert.match(confirmBranch, /finalizeReminderConfirmationRef\.current\("voice"\)/, "voice confirmation enters the shared save path");
assertions += 2;

const finalizeReminderConfirmation = modal.slice(
  modal.indexOf("const finalizeReminderConfirmation = async"),
  modal.indexOf("finalizeReminderConfirmationRef.current = finalizeReminderConfirmation")
);
const lockIndex = finalizeReminderConfirmation.indexOf("confirmationCommitInProgressRef.current = true");
const cancelIndex = finalizeReminderConfirmation.indexOf("cancelInitialSilenceTimeout()");
const abortIndex = finalizeReminderConfirmation.indexOf("abortListening()");
const firstAwaitIndex = finalizeReminderConfirmation.indexOf("await ");
assert.ok(lockIndex >= 0 && lockIndex < cancelIndex && cancelIndex < firstAwaitIndex, "save lock and timeout cancellation are synchronous");
assert.ok(abortIndex > lockIndex && abortIndex < firstAwaitIndex, "STT stops before persistence awaits");
assert.match(finalizeReminderConfirmation, /draftsRef\.current\.map/, "authoritative drafts are snapshotted");
assert.match(finalizeReminderConfirmation, /confirmationCommitInProgressRef\.current \|\| savingRef\.current/, "duplicate final transcripts cannot double-save");
assert.match(finalizeReminderConfirmation, /catch \(error\)[\s\S]*setAssistantText\(t\("assistant\.saveError"\)\)/, "save failure remains in confirmation UI");
assert.doesNotMatch(finalizeReminderConfirmation.match(/catch \(error\)[\s\S]*?finally/)?.[0] ?? "", /commitPendingState\(undefined, undefined\)/, "save failure preserves confirmation state");
assert.ok(finalizeReminderConfirmation.indexOf("await persistAssistantConfirmation(") >= 0 && finalizeReminderConfirmation.indexOf('requestAssistantClose("reminder-save-success")') > finalizeReminderConfirmation.indexOf("await persistAssistantConfirmation("), "close follows verified persistence");
assertions += 7;

assert.match(modal, /handleInitialSilenceTimeout[\s\S]*confirmationCommitInProgressRef\.current[\s\S]*timeout=ignored reason=save-committed/, "stale timeout cannot close during save");
assert.match(modal, /handleSpeechError[\s\S]*confirmationCommitInProgressRef\.current[\s\S]*ignored=save-committed/, "STT error/end fallout cannot clear a committed save");
assert.match(modal, /handleClose[\s\S]*confirmationCommitInProgressRef\.current[\s\S]*close=ignored reason=save-committed/, "manual/system close cannot clear a committed save");
assertions += 3;

const startHandler = hook.slice(
  hook.indexOf('useSpeechRecognitionEvent("start"'),
  hook.indexOf('useSpeechRecognitionEvent("speechstart"')
);
assert.match(startHandler, /initialSilenceTimeoutRef\.current = setTimeout/, "initial-silence timeout arms only from recognizer start");
assert.match(hook, /speechstart[\s\S]*recordSpeechActivity\(\)/, "speech activity cancels the initial-silence timeout");
assert.match(hook, /claimInitialSilenceTimeout[\s\S]*speechSessionId/, "timeout remains speech-session scoped");
assertions += 3;

console.log(`Assistant confirmation-race fixtures passed: ${assertions} assertions for atomic save lock, timeout/STT cancellation, duplicate suppression, failure retention, and close-after-success ordering.`);

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-next-occurrence-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/assistantNextOccurrence.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const next = require(path.join(output, "assistantNextOccurrence.js"));
const times = [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }];
let assertions = 0;
const verify = (now, expected) => {
  const actual = next.getAssistantFirstDailyOccurrences(times, now);
  assert.deepEqual(actual.map((item) => item.rollover), expected);
  for (let index = 0; index < actual.length; index += 1) {
    const occurrence = new Date(actual[index].atMillis);
    assert.equal(occurrence.getHours(), times[index].hour);
    assert.equal(occurrence.getMinutes(), times[index].minute);
  }
  assertions += 5;
  return actual;
};

const atTen = verify(new Date(2026, 8, 5, 10, 0), ["tomorrow", "today"]);
verify(new Date(2026, 8, 5, 21, 0), ["tomorrow", "tomorrow"]);
verify(new Date(2026, 8, 5, 7, 0), ["today", "today"]);
const midnight = next.getAssistantFirstDailyOccurrence({ hour: 0, minute: 0 }, new Date(2026, 11, 31, 23, 59));
assert.equal(new Date(midnight.atMillis).getFullYear(), 2027);
assert.equal(new Date(midnight.atMillis).getDate(), 1);
assert.equal(midnight.rollover, "tomorrow");
assertions += 3;

assert.equal(next.isAssistantOccurrenceStartedForDate(atTen[0].atMillis, new Date(2026, 8, 5, 10, 0)), false, "passed 8 AM is absent from creation-day Today");
assert.equal(next.isAssistantOccurrenceStartedForDate(atTen[1].atMillis, new Date(2026, 8, 5, 10, 0)), true, "upcoming 8 PM appears today");
assert.equal(next.isAssistantOccurrenceStartedForDate(atTen[0].atMillis, new Date(2026, 8, 6, 7, 0)), true, "8 AM appears tomorrow");
assertions += 3;

const creation = fs.readFileSync(path.join(root, "services", "assistantReminderCreationService.ts"), "utf8");
const today = fs.readFileSync(path.join(root, "services", "todayTimelineService.ts"), "utf8");
const modal = fs.readFileSync(path.join(root, "components", "hydromate-assistant-modal.tsx"), "utf8");
assert.match(creation, /saveMedicineReminder[\s\S]*firstOccurrenceAtByTime/, "Medicine stores independent first occurrences");
assert.match(creation, /category === "custom"[\s\S]*firstOccurrenceAtMillis/, "Routine stores each independent first occurrence");
assert.match(creation, /type=water[\s\S]*firstOccurrenceAtByTime|firstOccurrenceAtByTime[\s\S]*type=water/, "Water stores independent first occurrences");
assert.match(today, /isAssistantOccurrenceStartedForDate/, "Today filters occurrences not yet started");
assert.match(modal, /assistant\.rolloverMixed/, "confirmation explains mixed today\/tomorrow rollover");
assertions += 5;

console.log(`Assistant next-occurrence fixtures passed: ${assertions} assertions for independent Water\/Medicine\/Routine rollover, midnight, confirmation summary, and Today consistency.`);

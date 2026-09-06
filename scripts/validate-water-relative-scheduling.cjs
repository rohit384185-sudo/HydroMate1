const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-relative-water-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [compiler,
  "services/assistantReminderScheduling.ts",
  "--module", "commonjs", "--target", "es2022", "--outDir", output, "--skipLibCheck",
], { cwd: root, stdio: "inherit" });

const { getAssistantOneTimeFireAt } = require(path.join(output, "assistantReminderScheduling.js"));
const confirmedAt = new Date(2026, 8, 5, 23, 59, 42, 321).getTime();
const fireAt = getAssistantOneTimeFireAt({
  scheduleMode: "once",
  relativeDurationMinutes: 1,
  targetAtMillis: confirmedAt - 60_000,
}, confirmedAt);
assert.equal(fireAt, confirmedAt + 60_000);
assert.equal(new Date(fireAt).getDate(), 6, "midnight rollover preserves date");
assert.equal(getAssistantOneTimeFireAt({ scheduleMode: "recurring", relativeDurationMinutes: 1 }, confirmedAt), undefined);

const creation = fs.readFileSync(path.join(root, "services/assistantReminderCreationService.ts"), "utf8");
const scheduler = fs.readFileSync(path.join(root, "services/reminderService.ts"), "utf8");
const restore = fs.readFileSync(path.join(root, "services/reminderControlService.ts"), "utf8");
const today = fs.readFileSync(path.join(root, "services/todayTimelineService.ts"), "utf8");
assert.match(creation, /getAssistantOneTimeFireAt\(draft, confirmationTimestamp\)/);
assert.match(creation, /fireAtMillis: settings\.fireAtMillis/);
assert.match(scheduler, /exactOneTimeFireAt[\s\S]*SchedulableTriggerInputTypes\.DATE[\s\S]*date: expectedAtMillis/);
assert.match(scheduler, /scheduleWaterVoiceCompanion\([\s\S]*expectedAtMillis,[\s\S]*false/);
assert.match(scheduler, /hydromateExpectedAtMillis: expectedAtMillis/);
assert.match(scheduler, /hydromateRepeats: false/);
assert.match(restore, /const fireAtMillis = Number\(settings\.fireAtMillis\)[\s\S]*\? \{ fireAtMillis \}/);
assert.match(today, /settings\.scheduleMode === "once"[\s\S]*item\.scheduledAt = new Date\(settings\.fireAtMillis!/);
assert.match(creation, /masterEnabled=.*categoryEnabled=.*scheduling=/);

console.log("Relative Water scheduling fixtures passed: 12 assertions covering confirmation-relative fireAt, midnight/date preservation, finite Expo DATE trigger, matching native non-repeat timestamp, restore/gating, and Today representation.");

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "hydromate-water-amount-"));
const compiler = path.join(root, "node_modules", "typescript", "bin", "tsc");
execFileSync(
  process.execPath,
  [
    compiler,
    "services/hydromateAssistantParser.ts",
    "services/waterAmountNormalizer.ts",
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--outDir",
    output,
    "--skipLibCheck",
  ],
  { cwd: root, stdio: "inherit" }
);

const parser = require(path.join(output, "hydromateAssistantParser.js"));
const normalizer = require(path.join(output, "waterAmountNormalizer.js"));
const now = new Date(2026, 8, 4, 10, 0);

const languages = [
  { locale: "en", water: "water", unit: "mL", digits: "150", words: "one hundred fifty" },
  { locale: "hi", water: "पानी", unit: "एमएल", digits: "१५०", words: "एक सौ पचास" },
  { locale: "bn", water: "জল", unit: "এমএল", digits: "১৫০", words: "একশ পঞ্চাশ" },
  { locale: "mr", water: "पाणी", unit: "मिलीलीटर", digits: "१५०", words: "एकशे पन्नास" },
  { locale: "ta", water: "தண்ணீர்", unit: "எம்.எல்", digits: "௧௫௦", words: "நூற்று ஐம்பது" },
  { locale: "te", water: "నీరు", unit: "ఎంఎల్", digits: "౧౫౦", words: "నూట యాభై" },
  { locale: "gu", water: "પાણી", unit: "એમએલ", digits: "૧૫૦", words: "એકસો પચાસ" },
  { locale: "kn", water: "ನೀರು", unit: "ಎಂಎಲ್", digits: "೧೫೦", words: "ನೂರ ಐವತ್ತು" },
  { locale: "ml", water: "വെള്ളം", unit: "എംഎൽ", digits: "൧൫൦", words: "നൂറ്റമ്പത്" },
  { locale: "pa", water: "ਪਾਣੀ", unit: "ਐਮਐਲ", digits: "੧੫੦", words: "ਇੱਕ ਸੌ ਪੰਜਾਹ" },
  { locale: "bho", water: "पानी", unit: "मिली लीटर", digits: "१५०", words: "डेढ़ सौ" },
  { locale: "bgc", water: "पाणी", unit: "एमएल", digits: "१५०", words: "डेढ़ सौ" },
];

function expectResolved(result, locale, scenario) {
  assert.equal(result.draft.amountMl, 150, `${locale} ${scenario}: amount`);
  assert.notEqual(result.question, "waterAmount", `${locale} ${scenario}: no repeated amount prompt`);
  assert.notEqual(result.question, "waterAmountInvalid", `${locale} ${scenario}: no invalid prompt`);
}

for (const language of languages) {
  const latin = parser.parseAssistantTurn(
    `${language.water} 150 ml at 8 PM`,
    { now, locale: language.locale }
  );
  expectResolved(latin, language.locale, "Latin digits");

  const native = parser.parseAssistantTurn(
    `${language.water} ${language.digits} ${language.unit} at 8 PM`,
    { now, locale: language.locale }
  );
  expectResolved(native, language.locale, "native digits/localized unit");

  const missing = parser.parseAssistantTurn(`${language.water} at 8 PM`, {
    now,
    locale: language.locale,
  });
  assert.equal(missing.question, "waterAmount", `${language.locale} asks for amount`);

  const followUp = parser.parseAssistantTurn(`${language.digits} ${language.unit}`, {
    now,
    locale: language.locale,
    draft: missing.draft,
    pendingQuestion: missing.question,
  });
  expectResolved(followUp, language.locale, "localized follow-up");

  const bare = parser.parseAssistantTurn(language.digits, {
    now,
    locale: language.locale,
    draft: missing.draft,
    pendingQuestion: missing.question,
  });
  expectResolved(bare, language.locale, "bare pending follow-up");

  const words = parser.parseAssistantTurn(`${language.words} ${language.unit}`, {
    now,
    locale: language.locale,
    draft: missing.draft,
    pendingQuestion: missing.question,
  });
  expectResolved(words, language.locale, "spoken-number follow-up");

  const invalid = parser.parseAssistantTurn(`5000 ${language.unit}`, {
    now,
    locale: language.locale,
    draft: missing.draft,
    pendingQuestion: missing.question,
  });
  assert.equal(invalid.question, "waterAmountInvalid", `${language.locale} rejects out-of-range amount`);
  assert.equal(invalid.draft.amountMl, undefined, `${language.locale} invalid amount does not corrupt draft`);

  const recovery = parser.parseAssistantTurn(language.digits, {
    now,
    locale: language.locale,
    draft: invalid.draft,
    pendingQuestion: invalid.question,
  });
  expectResolved(recovery, language.locale, "recovery after one malformed follow-up");
  const repeatedInvalid = parser.parseAssistantTurn("not an amount", {
    now,
    locale: language.locale,
    draft: invalid.draft,
    pendingQuestion: invalid.question,
  });
  assert.equal(repeatedInvalid.state, "cancelled", `${language.locale} second malformed amount exits safely`);
}

assert.equal(normalizer.extractWaterAmount("0.5 litres").amountMl, 500, "existing English litres remain supported");
assert.equal(normalizer.extractWaterAmount("-150 ml").invalid, true, "negative amount rejected");
assert.equal(normalizer.extractWaterAmount("0 ml").invalid, true, "zero amount rejected");
assert.equal(normalizer.extractWaterAmount("150").amountMl, undefined, "bare number is not globally treated as ml");
assert.equal(normalizer.extractWaterAmount("150", { allowBareNumber: true }).amountMl, 150, "bare number fills pending amount slot");

const hindiRegression = parser.parseAssistantTurn("150 ml पानी पीने का रिमाइंडर लगाओ", {
  now,
  locale: "hi",
});
assert.equal(hindiRegression.draft.amountMl, 150, "physical Hindi regression amount is extracted");
assert.notEqual(hindiRegression.question, "waterAmount", "physical Hindi regression does not ask amount again");

const localeFiles = languages.map(({ locale }) => locale);
for (const locale of localeFiles) {
  const source = fs.readFileSync(path.join(root, "localization", `${locale}.ts`), "utf8");
  assert.match(source, /"assistant\.question\.waterAmount"\s*:/, `${locale} amount prompt`);
  assert.match(source, /"assistant\.question\.waterAmountInvalid"\s*:/, `${locale} invalid amount prompt`);
}

console.log("Ask HydroMate multilingual water-amount fixtures passed for all 12 languages: Latin/native digits, localized units, pending and bare follow-ups, number words, bounds, loop prevention, English litres, and localization parity.");

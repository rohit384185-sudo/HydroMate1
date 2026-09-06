export const MIN_WATER_REMINDER_AMOUNT_ML = 10;
export const MAX_WATER_REMINDER_AMOUNT_ML = 2_000;

export type WaterAmountSource =
  | "digits"
  | "localized-digits"
  | "number-words";

export type WaterAmountExtraction = {
  amountMl?: number;
  source?: WaterAmountSource;
  normalizedTranscript: string;
  invalid: boolean;
};

const DECIMAL_ZERO_CODE_POINTS = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6,
  0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6, 0x1040, 0x1090,
  0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0,
  0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50,
  0xabf0, 0xff10,
] as const;

const ML_UNIT_FORMS = [
  "ml", "milliliter", "milliliters", "millilitre", "millilitres",
  "एमएल", "मिलीलीटर", "मिली लीटर", "मिलीलिटर", "मिली लिटर",
  "এমএল", "মিলিলিটার", "মিলিলিটার", "মিলি লিটার",
  "எம்எல்", "எம் எல்", "மில்லிலிட்டர்", "மில்லி லிட்டர்",
  "ఎంఎల్", "ఎం ఎల్", "మిల్లీలీటర్", "మిల్లీ లీటర్",
  "એમએલ", "એમ એલ", "મિલીલીટર", "મિલી લીટર",
  "ಎಂಎಲ್", "ಎಂ ಎಲ್", "ಮಿಲಿಲೀಟರ್", "ಮಿಲಿ ಲೀಟರ್",
  "എംഎൽ", "എം എൽ", "മില്ലിലിറ്റർ", "മില്ലി ലിറ്റർ",
  "ਐਮਐਲ", "ਐਮ ਐਲ", "ਮਿਲੀਲੀਟਰ", "ਮਿਲੀ ਲੀਟਰ",
] as const;

const NUMBER_WORD_GROUPS: ReadonlyArray<readonly [number, readonly string[]]> = [
  [1000, ["one thousand", "एक हजार", "এক হাজার", "ஆயிரம்", "వెయ్యి", "એક હજાર", "ಒಂದು ಸಾವಿರ", "ആയിരം", "ਇੱਕ ਹਜ਼ਾਰ"]],
  [750, ["seven hundred fifty", "seven hundred and fifty", "सात सौ पचास", "সাতশ পঞ্চাশ", "सातशे पन्नास", "எழுநூற்று ஐம்பது", "ఏడు వందల యాభై", "સાતસો પચાસ", "ಏಳು ನೂರ ಐವತ್ತು", "എഴുനൂറ്റമ്പത്", "ਸੱਤ ਸੌ ਪੰਜਾਹ"]],
  [500, ["five hundred", "पांच सौ", "पाँच सौ", "পাঁচশ", "पाचशे", "ஐந்நூறு", "ఐదు వందలు", "પાંચસો", "ಐದು ನೂರು", "അഞ്ഞൂറ്", "ਪੰਜ ਸੌ"]],
  [400, ["four hundred", "चार सौ", "চারশ", "चारशे", "நானூறு", "నాలుగు వందలు", "ચારસો", "ನಾಲ್ಕು ನೂರು", "നാനൂറ്", "ਚਾਰ ਸੌ"]],
  [300, ["three hundred", "तीन सौ", "তিনশ", "तीनशे", "முந்நூறு", "మూడు వందలు", "ત્રણસો", "ಮುನ್ನೂರು", "മുന്നൂറ്", "ਤਿੰਨ ਸੌ"]],
  [250, ["two hundred fifty", "two hundred and fifty", "ढाई सौ", "আড়াইশ", "আড়াইশো", "दोनशे पन्नास", "अडीचशे", "இருநூற்று ஐம்பது", "రెండు వందల యాభై", "અઢીસો", "ಇನ್ನೂರ ಐವತ್ತು", "ഇരുനൂറ്റമ്പത്", "ਢਾਈ ਸੌ"]],
  [200, ["two hundred", "दो सौ", "দুইশ", "दोनशे", "இருநூறு", "రెండు వందలు", "બસો", "ಇನ್ನೂರು", "ഇരുനൂറ്", "ਦੋ ਸੌ"]],
  [150, ["one hundred fifty", "one hundred and fifty", "डेढ़ सौ", "डेढ सौ", "एक सौ पचास", "দেড়শ", "একশ পঞ্চাশ", "दीडशे", "एकशे पन्नास", "நூற்று ஐம்பது", "నూట యాభై", "દોઢસો", "એકસો પચાસ", "ನೂರ ಐವತ್ತು", "നൂറ്റമ്പത്", "ਡੇਢ ਸੌ", "ਇੱਕ ਸੌ ਪੰਜਾਹ"]],
  [100, ["one hundred", "hundred", "एक सौ", "सौ", "একশ", "একশো", "शंभर", "நூறு", "ஒரு நூறு", "వంద", "నూరు", "સો", "એકસો", "ನೂರು", "ಒಂದು ನೂರು", "നൂറ്", "ഒരു നൂറ്", "ਸੌ", "ਇੱਕ ਸੌ"]],
  [50, ["fifty", "पचास", "পঞ্চাশ", "पन्नास", "ஐம்பது", "యాభై", "પચાસ", "ಐವತ್ತು", "അമ്പത്", "ਪੰਜਾਹ"]],
];

export function normalizeUnicodeDigits(input: string) {
  let localized = false;
  let output = "";
  for (const character of input) {
    const codePoint = character.codePointAt(0)!;
    const zero = DECIMAL_ZERO_CODE_POINTS.find(
      (candidate) => codePoint >= candidate && codePoint <= candidate + 9
    );
    if (zero === undefined) {
      output += character;
    } else {
      output += String(codePoint - zero);
      if (zero !== 0x0030) localized = true;
    }
  }
  return { output, localized };
}

function normalizePunctuation(input: string) {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[।॥،,;:!?"'’`()\[\]{}_-]+/gu, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnits(input: string) {
  let normalized = ` ${input} `;
  for (const form of [...ML_UNIT_FORMS].sort((a, b) => b.length - a.length)) {
    const candidate = normalizePunctuation(form).replace(/\s+/g, " ");
    normalized = normalized.split(candidate).join(" ml ");
  }
  return normalized.replace(/\s+/g, " ").trim();
}

function inRange(amountMl: number) {
  return (
    Number.isFinite(amountMl) &&
    amountMl >= MIN_WATER_REMINDER_AMOUNT_ML &&
    amountMl <= MAX_WATER_REMINDER_AMOUNT_ML
  );
}

function findNumberWords(input: string) {
  const padded = ` ${input} `;
  for (const [amountMl, forms] of NUMBER_WORD_GROUPS) {
    for (const form of [...forms].sort((a, b) => b.length - a.length)) {
      if (padded.includes(` ${normalizePunctuation(form)} `)) return amountMl;
    }
  }
  return undefined;
}

export function extractWaterAmount(
  transcript: string,
  options: { allowBareNumber?: boolean } = {}
): WaterAmountExtraction {
  const digits = normalizeUnicodeDigits(transcript);
  const containsNegativeNumber = /[-−﹣－]\s*\d/u.test(digits.output);
  const normalizedTranscript = normalizeUnits(normalizePunctuation(digits.output));
  const hasMlUnit = /(?:^|\s)ml(?:\s|$)/i.test(normalizedTranscript);
  const mentionsLitreUnit = /(?:^|\s)(?:l|liters?|litres?)(?:\s|$)/i.test(
    normalizedTranscript
  );
  if (
    containsNegativeNumber &&
    (hasMlUnit || mentionsLitreUnit || options.allowBareNumber)
  ) {
    return { normalizedTranscript, invalid: true };
  }
  const litreMatch = normalizedTranscript.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(?:l|liters?|litres?)(?:\s|$)/i
  );
  const digitMatch = normalizedTranscript.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*ml(?:\s|$)/i
  );
  const bareMatch = options.allowBareNumber
    ? normalizedTranscript.match(/^\s*(\d+(?:\.\d+)?)\s*$/)
    : null;
  const numericMatch = litreMatch ?? digitMatch ?? bareMatch;
  if (numericMatch) {
    const multiplier = numericMatch === litreMatch ? 1000 : 1;
    const amountMl = Math.round(Number(numericMatch[1]) * multiplier);
    return {
      amountMl: inRange(amountMl) ? amountMl : undefined,
      source: digits.localized ? "localized-digits" : "digits",
      normalizedTranscript,
      invalid: !inRange(amountMl),
    };
  }

  const wordAmount = findNumberWords(normalizedTranscript);
  if (wordAmount !== undefined && (hasMlUnit || options.allowBareNumber)) {
    return {
      amountMl: wordAmount,
      source: "number-words",
      normalizedTranscript,
      invalid: false,
    };
  }

  return {
    normalizedTranscript,
    invalid: hasMlUnit || mentionsLitreUnit,
  };
}

import { Filter } from "bad-words";

const EXTRA = ["kys", "tranny", "kike", "chink", "fck", "fuk", "fuq", "phuck", "stfu", "gtfo"];

const STRONG = ["nigger", "nigga", "faggot", "retard", "tranny", "hitler", "whore", "fuck"];
const UNMISTAKABLE = ["nigger", "faggot", "tranny", "hitler"];
const CORE = new Set([
  "fuck", "fucker", "fucking", "shit", "cunt", "bitch", "dick", "cock", "pussy", "slut", "whore",
  "nigger", "nigga", "faggot", "retard", "kys",
]);

const CONFUSABLES = {
  а: "a", б: "b", в: "b", г: "r", д: "d", е: "e", ё: "e", ж: "x", з: "3", и: "n", й: "n", к: "k", л: "n",
  м: "m", н: "h", о: "o", п: "n", р: "p", с: "c", т: "t", у: "y", ф: "f", х: "x", ц: "u", ч: "y", ш: "w",
  щ: "w", ъ: "b", ы: "bi", ь: "b", э: "e", ю: "io", я: "r", ѕ: "s", і: "i", ї: "i", ј: "j", ԁ: "d", ԛ: "q",
  ԝ: "w", ү: "y", һ: "h", ɡ: "g", ı: "i", ł: "l", ø: "o", đ: "d", ħ: "h", ŋ: "n", ß: "ss", æ: "ae", œ: "oe",
  þ: "p", ð: "d", α: "a", β: "b", γ: "y", δ: "d", ε: "e", ζ: "z", η: "n", θ: "o", ι: "i", κ: "k", λ: "l",
  μ: "u", ν: "v", ξ: "e", ο: "o", π: "n", ρ: "p", σ: "o", ς: "c", τ: "t", υ: "u", φ: "f", χ: "x", ψ: "w",
  ω: "w", "¢": "c", "€": "e", "£": "l", "¥": "y", "©": "c", "®": "r", "µ": "u", "∪": "u", "∩": "n",
  "√": "v", "×": "x", "∆": "a", "∑": "e", "∏": "n",
  Ꭺ: "a", Ᏼ: "b", Ꮯ: "c", Ꭰ: "d", Ꭼ: "e", Ꮐ: "g", Ꮋ: "h", Ꭵ: "i", Ꭻ: "j", Ꮶ: "k", Ꮮ: "l", Ꮇ: "m", Ꮑ: "n",
  Ꮎ: "o", Ꮲ: "p", Ꮢ: "r", Ꮪ: "s", Ꭲ: "t", Ꮜ: "u", Ꮩ: "v", Ꮃ: "w", Ꮍ: "y", Ꮓ: "z",
};

const LEET_MULTI = [
  [/\|_\|/g, "u"], [/\/\\/g, "a"], [/\\\//g, "v"], [/\|\\\|/g, "n"], [/\|<|\|\{/g, "k"],
  [/\(\)|\[\]|<>/g, "o"], [/></g, "x"], [/\|3/g, "b"], [/\|\)/g, "d"], [/ph/g, "f"],
];
const LEET = {
  0: "o", 2: "z", 3: "e", 4: "a", 5: "s", 6: "g", 7: "t", 8: "b", 9: "g",
  "@": "a", $: "s", "!": "i", "¡": "i", "+": "t", "(": "c", "<": "c", "{": "c", "&": "and",
};
const MASKS = /[*#%?_~^]/;

const letters = (text) => text.replace(/[^a-z]/g, "");
const collapse = (text) => text.replace(/(.)\1+/g, "$1");
const reversed = (text) => [...text].reverse().join("");

function lookalike(char) {
  const mapped = CONFUSABLES[char] ?? CONFUSABLES[char.toLowerCase()];
  if (mapped === undefined) return char;
  return char === char.toLowerCase() ? mapped : mapped.toUpperCase();
}

export function sanitize(text) {
  return String(text)
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, (char) => String.fromCharCode(char.codePointAt(0) - 0x1f1e6 + 97))
    .replace(/[\u{1F150}-\u{1F169}\u{1F170}-\u{1F189}]/gu, (char) => String.fromCharCode(((char.codePointAt(0) - 0x1f150) % 32) + 97))
    .normalize("NFKD")
    .replace(/[\p{M}\p{Cf}]/gu, "")
    .replace(/\s/g, " ")
    .replace(/[^\x20-\x7E]/g, "");
}

function unify(text) {
  return sanitize(String(text).normalize("NFKD").replace(/[^\x20-\x7E]/gu, lookalike)).toLowerCase();
}

function leetReadings(text) {
  let base = text;
  for (const [pattern, letter] of LEET_MULTI) base = base.replace(pattern, letter);
  base = base.replace(/[02-9@$!¡+(<{&]/g, (char) => LEET[char]);

  const readings = new Set([base.replace(/[1|]/g, "i"), base.replace(/[1|]/g, "l")]);
  for (const reading of [...readings]) if (reading.includes("v")) readings.add(reading.replace(/v/g, "u"));
  return [...readings];
}

const stretched = (plain) => /(.)\1\1/.test(plain);

const LIST = new Set();
for (const word of [...new Filter().list, ...EXTRA]) {
  for (const reading of leetReadings(unify(word))) {
    const plain = letters(reading);
    if (plain.length >= 3) LIST.add(plain);
  }
}
const BY_LENGTH = new Map();
for (const word of LIST) {
  if (!BY_LENGTH.has(word.length)) BY_LENGTH.set(word.length, []);
  BY_LENGTH.get(word.length).push(word);
}

const SUFFIXES = ["ings", "ing", "ers", "er", "ed", "es", "s", "y", "z"];

function listed(word) {
  if (LIST.has(word)) return true;
  return SUFFIXES.some((suffix) => {
    const stem = word.slice(0, -suffix.length);
    const shortest = suffix === "y" || suffix === "z" ? 5 : 4;
    return word.endsWith(suffix) && stem.length >= shortest && LIST.has(stem);
  });
}

function maskedMatch(reading) {
  const trimmed = reading.replace(/^[^a-z*#]+|[^a-z*#]+$/g, "").replace(/[^a-z*#%?_~^]/g, "");
  if (!MASKS.test(trimmed)) return false;

  const shown = letters(trimmed).length;
  const masks = trimmed.replace(/[a-z]/g, "").length;
  if (shown < 2 || masks > shown) return false;

  const pattern = new RegExp(`^${trimmed.replace(/[*#%?_~^]+/g, (run) => `[a-z]{${run.length},${run.length * 2}}`)}$`);
  for (let length = shown + masks; length <= shown + masks * 2; length++) {
    if (BY_LENGTH.get(length)?.some((word) => pattern.test(word))) return true;
  }
  return false;
}

function strongInside(text) {
  return STRONG.some((word) => text.includes(word)) || UNMISTAKABLE.some((word) => text.includes(reversed(word)));
}

function unmistakableInside(text) {
  return UNMISTAKABLE.some((word) => text.includes(word) || text.includes(reversed(word)));
}

function fragmentIsRude(fragment) {
  for (const reading of leetReadings(unify(fragment))) {
    if (maskedMatch(reading)) return true;
    const plain = letters(reading);
    if (!plain) continue;
    if (listed(plain) || strongInside(plain)) return true;

    const squeezed = collapse(plain);
    if (stretched(plain)) {
      const doubled = plain.replace(/(.)\1{2,}/g, "$1$1");
      if ([squeezed, doubled].some((shape) => listed(shape) || strongInside(shape))) return true;
    } else if (CORE.has(squeezed) || strongInside(squeezed)) {
      return true;
    }
  }
  return false;
}

function capitalParts(token) {
  const parts = token.split(/(?<=[a-z])(?=[A-Z])/);
  return parts.length > 1 ? parts : [];
}

function tokenIsRude(token) {
  return fragmentIsRude(token) || capitalParts(token).some(fragmentIsRude);
}

function plainLetters(text) {
  return letters(leetReadings(unify(text))[0]);
}

function rudeTokens(tokens) {
  const rude = new Set();
  const mark = (start, end) => {
    for (let index = start; index <= end; index++) rude.add(index);
  };

  tokens.forEach((token, index) => {
    if (tokenIsRude(token)) rude.add(index);
  });

  const pieces = tokens.map(plainLetters);

  for (let start = 0; start < pieces.length; start++) {
    let end = start;
    while (end < pieces.length && pieces[end].length === 1) end++;
    if (end - start >= 3 && fragmentIsRude(pieces.slice(start, end).join(""))) mark(start, end - 1);
    start = Math.max(start, end);
  }

  for (let start = 0; start < pieces.length; start++) {
    let joined = pieces[start];
    if (!joined || joined.length > 3) continue;
    for (let end = start + 1; end < pieces.length && end <= start + 2; end++) {
      if (!pieces[end] || pieces[end].length > 3) break;
      joined += pieces[end];
      if (CORE.has(joined) || CORE.has(collapse(joined))) mark(start, end);
    }
  }
  return rude;
}

function spreadOut(text) {
  return unmistakableInside(plainLetters(text.replace(/\s+/g, "")));
}

export function isRude(text) {
  const source = String(text);
  return rudeTokens(source.split(/\s+/).filter(Boolean)).size > 0 || spreadOut(source);
}

export function censor(text) {
  const source = String(text);
  const rude = rudeTokens(source.split(/\s+/).filter(Boolean));

  if (!rude.size && spreadOut(source)) return source.replace(/\S/g, "*");

  let index = -1;
  return source.replace(/\S+/g, (token) => {
    index++;
    return rude.has(index) ? "*".repeat([...token].length) : token;
  });
}

import { Filter } from "bad-words";

const LIVE_WORDS = [
  "jew", "black", "baby", "child", "white", "porn", "pedo", "trump", "clinton", "hitler", "nazi", "gay",
  "pride", "sex", "pleasure", "touch", "poo", "kids", "rape", "white power", "nigga", "nig nog", "doggy",
  "rapist", "boner", "nigger", "nigg", "finger", "nogger", "nagger", "nig", "fag", "gai", "pole", "stripper",
  "penis", "vagina", "pussy", "nazi", "hitler", "stalin", "burn", "chamber", "cock", "peen", "dick", "spick",
  "nieger", "die", "satan", "n|ig", "nlg", "cunt", "c0ck", "fag", "lick", "condom", "anal", "shit", "phile",
  "little", "kids", "free KR", "tiny", "sidney", "ass", "kill", ".io", "(dot)", "[dot]", "mini", "whiore",
  "whore", "faggot", "github", "1337", "666", "satan", "senpa", "discord", "d1scord", "mistik", ".io",
  "senpa.io", "sidney", "sid", "senpaio", "vries", "asa",
];

const blocked = [...new Filter().list, ...LIVE_WORDS];

export function liveNameBlocked(name: string): boolean {
  const flat = name.toLowerCase().replace(/\s/g, "").replace(/1/g, "i").replace(/0/g, "o").replace(/5/g, "s");
  return blocked.some((word) => flat.includes(word));
}

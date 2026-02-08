const { parseKeywords, unique, intersectionSize } = require("./utils/keywords");

const LOGIC_WORDS = [
  "because",
  "therefore",
  "however",
  "first",
  "second",
  "finally",
  "thus",
  "also",
  "because of",
  "in conclusion",
  "因为",
  "所以",
  "但是",
  "首先",
  "其次",
  "最后",
  "因此",
  "同时",
  "另外",
  "然后",
  "总结"
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreAnswer({ answer, coreKeywords }) {
  const a = String(answer || "").trim();
  const core = unique(parseKeywords(coreKeywords));

  // 1) keyword score (0-60)
  const tokens = unique(parseKeywords(a));
  const hitCount = core.length ? intersectionSize(tokens, core) : 0;
  const keywordRatio = core.length ? hitCount / core.length : 0;
  const keywordScore = clamp(keywordRatio * 60, 0, 60);

  // 2) expression score (0-40): length (0-20) + logic words (0-20)
  const len = a.length;
  const lengthScore = clamp((len / 400) * 20, 0, 20); // 400 chars ~= full points

  const lower = a.toLowerCase();
  let logicHits = 0;
  for (const w of LOGIC_WORDS) {
    if (lower.includes(w)) logicHits++;
  }
  const logicScore = clamp((logicHits / 6) * 20, 0, 20); // 6 distinct hits ~= full points

  const expressionScore = lengthScore + logicScore;
  const total = clamp(keywordScore + expressionScore, 0, 100);

  return {
    total,
    breakdown: {
      keywordScore,
      expressionScore,
      lengthScore,
      logicScore,
      hitCount,
      coreCount: core.length
    }
  };
}

module.exports = { scoreAnswer };


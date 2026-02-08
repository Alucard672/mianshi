function normalizeKeyword(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseKeywords(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(normalizeKeyword).filter(Boolean);
  // support comma/space/Chinese comma separated
  return String(input)
    .split(/[,，\n]/g)
    .flatMap((x) => x.split(/\s+/g))
    .map(normalizeKeyword)
    .filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr)];
}

function intersectionSize(a, b) {
  const bs = new Set(b);
  let n = 0;
  for (const x of a) if (bs.has(x)) n++;
  return n;
}

module.exports = { parseKeywords, unique, intersectionSize };


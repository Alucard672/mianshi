const { parseKeywords, unique, intersectionSize } = require("./utils/keywords");

function computeMatchRate(userKeywordsRaw, jobKeywordsRaw) {
  const user = unique(parseKeywords(userKeywordsRaw));
  const job = unique(parseKeywords(jobKeywordsRaw));
  if (job.length === 0) return { matchRate: 0, user, job, hits: [] };

  const jobSet = new Set(job);
  const hits = user.filter((k) => jobSet.has(k));
  const matchRate = (intersectionSize(user, job) / job.length) * 100;
  return { matchRate, user, job, hits };
}

module.exports = { computeMatchRate };


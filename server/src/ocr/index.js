const { glmOcrToText } = require("./glmOcr");

async function parseResumeToText({ filePath }) {
  // For now, just use GLM-OCR if configured.
  // Otherwise return empty string (still allows manual keywords).
  return glmOcrToText(filePath);
}

module.exports = { parseResumeToText };


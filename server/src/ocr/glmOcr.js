const fs = require("fs/promises");

// Placeholder integration for GLM-OCR.
// In production you would:
// 1) Convert PDF/DOC/DOCX to images (pages) or text
// 2) Call GLM-OCR API with proper auth
//
// For this MVP:
// - If GLM_OCR_URL and GLM_OCR_KEY are provided, we send the file as base64.
// - Otherwise we return empty text and rely on user keywords + simple heuristics.
async function glmOcrToText(filePath) {
  const url = process.env.GLM_OCR_URL;
  const key = process.env.GLM_OCR_KEY;
  if (!url || !key) return "";
  if (typeof fetch !== "function") throw new Error("当前 Node 版本不支持 fetch，请升级到 Node 18+");

  const buf = await fs.readFile(filePath);
  const base64 = buf.toString("base64");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      // Shape depends on your GLM-OCR provider; adjust when wiring real API.
      input_base64: base64
    })
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`GLM-OCR 调用失败：${resp.status} ${t}`.trim());
  }
  const data = await resp.json();

  // Best-effort extraction; adjust for real response schema.
  return String(data.text || data.result?.text || "");
}

module.exports = { glmOcrToText };

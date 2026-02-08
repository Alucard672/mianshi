const fs = require("fs");
const path = require("path");
const cloudbase = require("@cloudbase/node-sdk");

function env(name) {
  return String(process.env[name] || "").trim();
}

function hasCloudBaseConfig() {
  return Boolean(env("CLOUDBASE_ENV_ID") || env("TCB_ENV_ID"));
}

function initApp() {
  const envId = env("CLOUDBASE_ENV_ID") || env("TCB_ENV_ID");
  if (!envId) throw new Error("Missing CLOUDBASE_ENV_ID (or TCB_ENV_ID)");

  const secretId =
    env("CLOUDBASE_SECRET_ID") || env("TENCENTCLOUD_SECRETID") || env("SECRET_ID");
  const secretKey =
    env("CLOUDBASE_SECRET_KEY") || env("TENCENTCLOUD_SECRETKEY") || env("SECRET_KEY");

  // In CloudBase cloud hosting you typically inject credentials as env vars.
  if (!secretId || !secretKey) {
    throw new Error("Missing CloudBase credentials (SECRET_ID/SECRET_KEY or TENCENTCLOUD_SECRETID/SECRETKEY)");
  }

  return cloudbase.init({
    env: envId,
    secretId,
    secretKey
  });
}

function guessExt(localPath) {
  const ext = path.extname(localPath || "").slice(0, 16);
  return ext || "";
}

async function uploadLocalFileToCloudBase({ localPath, cloudPathPrefix }) {
  const app = initApp();
  const cloudPath = `${cloudPathPrefix}/${Date.now()}-${Math.random().toString(16).slice(2)}${guessExt(localPath)}`;
  const fileStream = fs.createReadStream(localPath);

  const up = await app.uploadFile({
    cloudPath,
    fileContent: fileStream
  });

  const fileID = up.fileID;
  if (!fileID) throw new Error("CloudBase uploadFile did not return fileID");

  const urlResp = await app.getTempFileURL({ fileList: [fileID] });
  const tempUrl = urlResp?.fileList?.[0]?.tempFileURL || "";

  return { fileID, tempUrl, cloudPath };
}

module.exports = { hasCloudBaseConfig, uploadLocalFileToCloudBase };


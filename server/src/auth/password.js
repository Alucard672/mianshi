const crypto = require("crypto");

// MVP only. For production use bcrypt/argon2 with per-user salt.
function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

module.exports = { sha256Hex };


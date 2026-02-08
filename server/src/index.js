const fs = require("fs");
const path = require("path");

const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");

const { getPool } = require("./db");
const jobsRoutes = require("./routes/jobs");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const inviteRoutes = require("./routes/invite");
const candidateRoutes = require("./routes/candidate");
const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");

dotenv.config();

const PORT = Number(process.env.PORT || 3001);

const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.disable("x-powered-by");

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir, { fallthrough: false }));

// DB health check on startup
getPool()
  .query("SELECT 1")
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[db] connection failed:", err.message);
  });

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/candidate", candidateRoutes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === "production") {
    return res.status(500).json({ error: "Internal Server Error" });
  }
  // Dev-friendly error detail to speed up setup/debugging.
  return res.status(500).json({ error: "Internal Server Error", detail: err?.message, code: err?.code });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`server listening on http://localhost:${PORT}`);
});

#!/usr/bin/env bash
set -euo pipefail

# One-server release deploy (HTTP/Nginx reverse proxy):
# - Accepts a tarball uploaded from your local machine (recommended, since some servers cannot reach GitHub).
# - Extracts into a timestamped release directory.
# - Builds web (web/dist) and installs server deps.
# - Symlinks shared env into server/.env.
# - Runs DB migrations.
# - (Re)starts pm2 app and reloads nginx.
#
# Usage (run on server):
#   sudo bash ops/deploy.sh /opt/mianshi.tgz
#
# Optional env:
#   APP_NAME=mianshi
#   BASE_DIR=/opt/mianshi

APP_NAME="${APP_NAME:-mianshi}"
BASE_DIR="${BASE_DIR:-/opt/${APP_NAME}}"
RELEASES_DIR="${RELEASES_DIR:-${BASE_DIR}/releases}"
SHARED_DIR="${SHARED_DIR:-${BASE_DIR}/shared}"
CURRENT_DIR="${CURRENT_DIR:-${BASE_DIR}/current}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

TARBALL="${1:-}"
if [[ -z "${TARBALL}" ]]; then
  echo "usage: $0 /path/to/${APP_NAME}.tgz" >&2
  exit 2
fi
if [[ ! -f "${TARBALL}" ]]; then
  echo "tarball not found: ${TARBALL}" >&2
  exit 2
fi

ts="$(date +%Y%m%d-%H%M%S)"
release_dir="${RELEASES_DIR}/${ts}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

echo "[deploy] app=${APP_NAME}"
echo "[deploy] base=${BASE_DIR}"
echo "[deploy] tarball=${TARBALL}"
echo "[deploy] release=${release_dir}"

mkdir -p "${RELEASES_DIR}" "${SHARED_DIR}"

echo "[deploy] extracting..."
tar -xzf "${TARBALL}" -C "${tmp_dir}"

# Handle tarball with a single top-level directory (common: mianshi/).
top_count="$(find "${tmp_dir}" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
if [[ "${top_count}" == "1" ]] && [[ -d "$(find "${tmp_dir}" -mindepth 1 -maxdepth 1 -type d | head -n 1)" ]]; then
  src_dir="$(find "${tmp_dir}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
else
  src_dir="${tmp_dir}"
fi

mkdir -p "${release_dir}"
cp -a "${src_dir}/." "${release_dir}/"

# Clean macOS AppleDouble files that can break builds.
find "${release_dir}" -name '._*' -delete || true

# Ensure required folders exist.
test -f "${release_dir}/server/package.json"
test -f "${release_dir}/web/package.json"

# Persist env file across releases.
shared_env="${SHARED_DIR}/server.env"
if [[ ! -f "${shared_env}" ]]; then
  if [[ -f "${BASE_DIR}/server/.env" ]]; then
    cp "${BASE_DIR}/server/.env" "${shared_env}"
    echo "[deploy] copied existing env: ${BASE_DIR}/server/.env -> ${shared_env}"
  else
    cat >"${shared_env}" <<'ENV'
# REQUIRED (MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=mianshi_app
DB_PASS=CHANGE_ME
DB_NAME=mianshi

# Server port
PORT=3001

# Optional
DB_MIGRATE_ON_START=0
APP_BASE_URL=http://127.0.0.1
CORS_ORIGINS=*
ENV
    echo "[deploy] created env template: ${shared_env} (please edit DB_PASS etc.)"
  fi
fi

ln -sf "${shared_env}" "${release_dir}/server/.env"

echo "[deploy] installing deps (web)..."
if npm --prefix "${release_dir}/web" ci; then
  :
else
  npm --prefix "${release_dir}/web" install
fi

echo "[deploy] building web..."
npm --prefix "${release_dir}/web" run build

echo "[deploy] installing deps (server)..."
if npm --prefix "${release_dir}/server" ci --omit=dev; then
  :
else
  npm --prefix "${release_dir}/server" install --omit=dev
fi

echo "[deploy] switching current -> ${release_dir}"
ln -sfn "${release_dir}" "${CURRENT_DIR}"

echo "[deploy] migrating DB..."
(cd "${CURRENT_DIR}/server" && node scripts/init-db.js)
(cd "${CURRENT_DIR}/server" && node scripts/migrate-db.js)

echo "[deploy] restarting pm2..."
if command -v pm2 >/dev/null 2>&1; then
  # Ensure the process always points at the current release.
  # If the app existed from a previous manual start, it might still be bound to an old path/cwd,
  # so restart alone is insufficient.
  pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
  pm2 start "${CURRENT_DIR}/server/scripts/start.js" --name "${APP_NAME}" --cwd "${CURRENT_DIR}/server"
  pm2 save
else
  echo "[deploy] pm2 not found; installing..."
  npm i -g pm2
  pm2 start "${CURRENT_DIR}/server/scripts/start.js" --name "${APP_NAME}" --cwd "${CURRENT_DIR}/server"
  pm2 save
fi

echo "[deploy] reloading nginx (if present)..."
if command -v nginx >/dev/null 2>&1; then
  nginx -t
  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx || systemctl restart nginx
  fi
fi

echo "[deploy] health check..."
# Give the server a moment to boot (npm install + pm2 start can race curl).
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${PORT:-3001}/api/health" >/dev/null; then
    echo "[deploy] OK: /api/health"
    break
  fi
  sleep 1
done

echo "[deploy] pruning old releases (keep ${KEEP_RELEASES})..."
ls -1dt "${RELEASES_DIR}"/* 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf

echo "[deploy] done."

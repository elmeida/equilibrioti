#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Variavel obrigatoria ausente: $name" >&2
    exit 1
  fi
}

require_env VPS_HOST
require_env VPS_USER
require_env VPS_APP_PATH

VPS_PORT="${VPS_PORT:-22}"
VPS_SERVICE_NAME="${VPS_SERVICE_NAME:-equilibrioti}"
VPS_NODE_BIN="${VPS_NODE_BIN:-/opt/atenza/equilibrio-bi/node-v22.23.2-linux-x64/bin}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/equilibrio_bi_deploy_key}"
source "$(dirname "${BASH_SOURCE[0]}")/validate-vps-target.sh" rollback

SSH_OPTS=(
  -i "$SSH_KEY_PATH"
  -p "$VPS_PORT"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o ConnectTimeout=15
)

ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" \
  "VPS_APP_PATH='$VPS_APP_PATH' ROLLBACK_RELEASE_ID='$ROLLBACK_RELEASE_ID' VPS_SERVICE_NAME='$VPS_SERVICE_NAME' VPS_NODE_BIN='$VPS_NODE_BIN' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

APP_PATH="$VPS_APP_PATH"
CURRENT_LINK="$APP_PATH/current"
SERVICE_NAME="$VPS_SERVICE_NAME"
TARGET_RELEASE_ID="${ROLLBACK_RELEASE_ID:-}"
export PATH="$VPS_NODE_BIN:$PATH"
test -x "$VPS_NODE_BIN/node"
node -e 'if (process.versions.node.split(".")[0] !== "22") process.exit(1)'

if [ ! -d "$APP_PATH/releases" ]; then
  echo "Diretorio de releases nao encontrado: $APP_PATH/releases" >&2
  exit 1
fi

TARGET="$APP_PATH/releases/$TARGET_RELEASE_ID"

if [ -z "${TARGET:-}" ] || [ ! -d "$TARGET" ]; then
  echo "Release de rollback nao encontrado." >&2
  exit 1
fi

test "$(readlink -f "$APP_PATH")" = "$APP_PATH"
test "$(readlink -f "$TARGET")" = "$APP_PATH/releases/$TARGET_RELEASE_ID"
test -f "$TARGET/server/db/check.js"
(cd "$TARGET" && npm run db:check)
ln -sfn "$TARGET" "$CURRENT_LINK"

if [ -n "${VPS_RESTART_COMMAND:-}" ]; then
  bash -lc "$VPS_RESTART_COMMAND"
elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" --no-legend 2>/dev/null | awk '{print $1}' | grep -Fxq "${SERVICE_NAME}.service"; then
  sudo -n systemctl restart "$SERVICE_NAME"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$SERVICE_NAME" --update-env
else
  echo "Nenhum metodo de restart encontrado. Defina VPS_RESTART_COMMAND ou configure systemd/PM2." >&2
  exit 1
fi

SHARED_PATH="$APP_PATH/shared"
SERVER_PORT="$(
  grep -E '^SERVER_PORT=' "$SHARED_PATH/.env" | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" || true
)"
SERVER_PORT="${SERVER_PORT:-3001}"
curl --connect-timeout 5 --max-time 10 -fsS "http://127.0.0.1:${SERVER_PORT}/api/health" >/dev/null

echo "Rollback concluido para: $(basename "$TARGET")"
REMOTE_SCRIPT

if [ -n "${APP_HEALTHCHECK_URL:-}" ]; then
  curl --connect-timeout 5 --max-time 20 -fsS "$APP_HEALTHCHECK_URL" >/dev/null
fi

echo "Rollback finalizado com sucesso."

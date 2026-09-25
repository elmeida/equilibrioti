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
VPS_SERVICE_NAME="${VPS_SERVICE_NAME:-equilibrio-bi-hml}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/equilibrio_bi_deploy_key}"

SSH_OPTS=(
  -i "$SSH_KEY_PATH"
  -p "$VPS_PORT"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
)

ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" \
  "VPS_APP_PATH='$VPS_APP_PATH' ROLLBACK_RELEASE_ID='${ROLLBACK_RELEASE_ID:-}' VPS_SERVICE_NAME='$VPS_SERVICE_NAME' VPS_RESTART_COMMAND='${VPS_RESTART_COMMAND:-}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

APP_PATH="$VPS_APP_PATH"
CURRENT_LINK="$APP_PATH/current"
SERVICE_NAME="${VPS_SERVICE_NAME:-equilibrio-bi-hml}"
TARGET_RELEASE_ID="${ROLLBACK_RELEASE_ID:-}"

if [ ! -d "$APP_PATH/releases" ]; then
  echo "Diretorio de releases nao encontrado: $APP_PATH/releases" >&2
  exit 1
fi

if [ -n "$TARGET_RELEASE_ID" ]; then
  TARGET="$APP_PATH/releases/$TARGET_RELEASE_ID"
else
  current=""
  if [ -L "$CURRENT_LINK" ]; then
    current="$(readlink -f "$CURRENT_LINK" || true)"
  fi
  TARGET="$(
    find "$APP_PATH/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' |
      sort -rn |
      cut -d ' ' -f 2- |
      while IFS= read -r release_dir; do
        if [ "$release_dir" != "$current" ]; then
          printf '%s\n' "$release_dir"
          break
        fi
      done
  )"
fi

if [ -z "${TARGET:-}" ] || [ ! -d "$TARGET" ]; then
  echo "Release de rollback nao encontrado." >&2
  exit 1
fi

ln -sfn "$TARGET" "$CURRENT_LINK"

if [ -n "${VPS_RESTART_COMMAND:-}" ]; then
  bash -lc "$VPS_RESTART_COMMAND"
elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" --no-legend 2>/dev/null | awk '{print $1}' | grep -Fxq "${SERVICE_NAME}.service"; then
  sudo systemctl restart "$SERVICE_NAME"
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
curl -fsS "http://127.0.0.1:${SERVER_PORT}/api/health" >/dev/null

echo "Rollback concluido para: $(basename "$TARGET")"
REMOTE_SCRIPT

if [ -n "${APP_HEALTHCHECK_URL:-}" ]; then
  curl -fsS "$APP_HEALTHCHECK_URL" >/dev/null
fi

echo "Rollback finalizado com sucesso."

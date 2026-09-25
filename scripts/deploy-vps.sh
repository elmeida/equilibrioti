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
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-false}"
KEEP_RELEASES="${KEEP_RELEASES:-0}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d%H%M%S)}"
source "$(dirname "${BASH_SOURCE[0]}")/validate-vps-target.sh" deploy
DEPLOY_TMP_DIR="${DEPLOY_TMP_DIR:-tmp/deploy}"
ARCHIVE_NAME="equilibrio-bi-${RELEASE_ID}.tar.gz"
ARCHIVE_PATH="${DEPLOY_TMP_DIR}/${ARCHIVE_NAME}"
REMOTE_ARCHIVE="/tmp/${ARCHIVE_NAME}"

mkdir -p "$DEPLOY_TMP_DIR"

for path in dist server package.json package-lock.json; do
  if [ ! -e "$path" ]; then
    echo "Artefato obrigatorio nao encontrado: $path" >&2
    exit 1
  fi
done

tar -czf "$ARCHIVE_PATH" \
  --exclude='server/uploads' \
  dist \
  server \
  package.json \
  package-lock.json \
  .env.example

SSH_COMMON_OPTS=(
  -i "$SSH_KEY_PATH"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o ConnectTimeout=15
)
SSH_OPTS=("${SSH_COMMON_OPTS[@]}" -p "$VPS_PORT")
SCP_OPTS=("${SSH_COMMON_OPTS[@]}" -P "$VPS_PORT")

scp "${SCP_OPTS[@]}" "$ARCHIVE_PATH" "${VPS_USER}@${VPS_HOST}:${REMOTE_ARCHIVE}"

ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" \
  "VPS_APP_PATH='$VPS_APP_PATH' RELEASE_ID='$RELEASE_ID' REMOTE_ARCHIVE='$REMOTE_ARCHIVE' VPS_SERVICE_NAME='$VPS_SERVICE_NAME' VPS_NODE_BIN='$VPS_NODE_BIN' RUN_DB_MIGRATIONS='$RUN_DB_MIGRATIONS' KEEP_RELEASES='$KEEP_RELEASES' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

APP_PATH="$VPS_APP_PATH"
RELEASE_PATH="$APP_PATH/releases/$RELEASE_ID"
SHARED_PATH="$APP_PATH/shared"
CURRENT_LINK="$APP_PATH/current"
SERVICE_NAME="$VPS_SERVICE_NAME"
KEEP_RELEASES="${KEEP_RELEASES:-0}"
export PATH="$VPS_NODE_BIN:$PATH"
test -x "$VPS_NODE_BIN/node"
node -e 'if (process.versions.node.split(".")[0] !== "22") process.exit(1)'
test "$(readlink -f "$APP_PATH")" = "$APP_PATH"
if [ -e "$RELEASE_PATH" ] || [ -L "$RELEASE_PATH" ]; then
  echo "Release ja existe; use um novo identificador." >&2
  exit 1
fi

mkdir -p "$APP_PATH/releases" "$SHARED_PATH/uploads/empresas" "$RELEASE_PATH"
tar -xzf "$REMOTE_ARCHIVE" -C "$RELEASE_PATH"
rm -f "$REMOTE_ARCHIVE"

if [ ! -f "$SHARED_PATH/.env" ]; then
  cp "$RELEASE_PATH/.env.example" "$SHARED_PATH/.env.example"
  echo "Arquivo $SHARED_PATH/.env nao encontrado. Crie o .env de homologacao na VPS e rode o deploy novamente." >&2
  exit 1
fi

ln -sfn "$SHARED_PATH/.env" "$RELEASE_PATH/.env"
mkdir -p "$RELEASE_PATH/server/uploads"
ln -sfn "$SHARED_PATH/uploads/empresas" "$RELEASE_PATH/server/uploads/empresas"

cd "$RELEASE_PATH"
npm ci --omit=dev

npm run db:check

previous_release=""
if [ -L "$CURRENT_LINK" ]; then
  previous_release="$(readlink -f "$CURRENT_LINK" || true)"
fi

ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"

restart_app() {
  if [ -n "${VPS_RESTART_COMMAND:-}" ]; then
    bash -lc "$VPS_RESTART_COMMAND"
    return $?
  elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" --no-legend 2>/dev/null | awk '{print $1}' | grep -Fxq "${SERVICE_NAME}.service"; then
    sudo -n systemctl restart "$SERVICE_NAME"
    return $?
  elif command -v pm2 >/dev/null 2>&1; then
    if pm2 describe "$SERVICE_NAME" >/dev/null 2>&1; then
      pm2 restart "$SERVICE_NAME" --update-env || return 1
    else
      pm2 start "$CURRENT_LINK/server/index.js" --name "$SERVICE_NAME" --cwd "$CURRENT_LINK" --update-env || return 1
    fi
    pm2 save
    return $?
  fi
  echo "Nenhum metodo de restart encontrado. Defina VPS_RESTART_COMMAND ou configure systemd/PM2." >&2
  return 1
}

restore_previous() {
  if [ -n "$previous_release" ]; then
    ln -sfn "$previous_release" "$CURRENT_LINK"
    if ! restart_app; then
      echo "Link anterior restaurado, mas o reinicio da versao anterior falhou. Intervencao necessaria." >&2
    fi
  else
    echo "Sem release anterior disponivel para recuperacao automatica." >&2
  fi
}

if ! restart_app; then
  echo "Reinicio falhou. Restaurando release anterior." >&2
  restore_previous
  exit 1
fi

SERVER_PORT="$(
  grep -E '^SERVER_PORT=' "$SHARED_PATH/.env" | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" || true
)"
SERVER_PORT="${SERVER_PORT:-3001}"

for attempt in 1 2 3 4 5; do
  if curl --connect-timeout 5 --max-time 10 -fsS "http://127.0.0.1:${SERVER_PORT}/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 5 ]; then
    echo "Healthcheck local falhou apos deploy. Iniciando rollback automatico." >&2
    restore_previous
    exit 1
  fi
  sleep 3
done

echo "Deploy concluido: $RELEASE_ID"
REMOTE_SCRIPT

if [ -n "${APP_HEALTHCHECK_URL:-}" ]; then
  curl --connect-timeout 5 --max-time 20 -fsS "$APP_HEALTHCHECK_URL" >/dev/null
fi

echo "Deploy finalizado com sucesso: $RELEASE_ID"

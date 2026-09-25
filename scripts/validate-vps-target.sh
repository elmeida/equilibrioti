#!/usr/bin/env bash
# Sourced before packaging or network access by both operational scripts.
invalid() { echo "Parametro de homologacao invalido: $1" >&2; exit 1; }

[[ "${VPS_HOST:-}" == 'atenza-hml-apps-01.atenza.cloud' ]] || invalid VPS_HOST
[[ "${VPS_APP_PATH:-}" == '/var/www/equilibrio-bi-hml' ]] || invalid VPS_APP_PATH
[[ "${VPS_SERVICE_NAME:-}" == 'equilibrioti' ]] || invalid VPS_SERVICE_NAME
[[ "${VPS_NODE_BIN:-}" =~ ^/opt/atenza/equilibrio-bi/node-v22\.[0-9]+\.[0-9]+-linux-x64/bin$ ]] || invalid VPS_NODE_BIN
[[ "${VPS_USER:-}" =~ ^[a-z_][a-z0-9_-]*$ && "$VPS_USER" != root ]] || invalid VPS_USER
[[ "${VPS_PORT:-}" =~ ^[0-9]{1,5}$ ]] || invalid VPS_PORT
(( 10#$VPS_PORT >= 1 && 10#$VPS_PORT <= 65535 )) || invalid VPS_PORT
[[ -z "${VPS_RESTART_COMMAND:-}" ]] || invalid VPS_RESTART_COMMAND
[[ "${RUN_DB_MIGRATIONS:-false}" == false ]] || invalid RUN_DB_MIGRATIONS
[[ "${KEEP_RELEASES:-0}" == 0 ]] || invalid KEEP_RELEASES
[[ "${APP_HEALTHCHECK_URL:-}" == 'https://equilibrio-bi-homologacao.atenza.digital/api/health' ]] || invalid APP_HEALTHCHECK_URL

if [[ "${1:-}" == deploy ]]; then
  [[ "${RELEASE_ID:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$ ]] || invalid RELEASE_ID
elif [[ "${1:-}" == rollback ]]; then
  [[ "${ROLLBACK_RELEASE_ID:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$ ]] || invalid ROLLBACK_RELEASE_ID
else
  invalid mode
fi

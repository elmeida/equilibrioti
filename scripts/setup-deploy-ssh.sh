#!/usr/bin/env bash
set -euo pipefail

for name in VPS_HOST VPS_USER VPS_SSH_KEY VPS_SSH_KNOWN_HOSTS VPS_APP_PATH; do
  if [ -z "${!name:-}" ]; then
    echo "Secret obrigatorio ausente: $name" >&2
    exit 1
  fi
done

umask 077
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
printf '%s\n' "$VPS_SSH_KEY" > "$HOME/.ssh/equilibrio_bi_deploy_key"
printf '%s\n' "$VPS_SSH_KNOWN_HOSTS" > "$HOME/.ssh/known_hosts"
chmod 600 "$HOME/.ssh/equilibrio_bi_deploy_key" "$HOME/.ssh/known_hosts"

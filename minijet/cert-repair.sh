#!/usr/bin/env bash
set -Eeuo pipefail

STATE_DIR="/etc/minijet-x-ui"
STATE_FILE="$STATE_DIR/install.env"
STATUS_FILE="$STATE_DIR/cert-status"
XUI_BIN="/usr/local/x-ui/x-ui"

log() { printf '[MiniJet cert] %s\n' "$*" >&2; }

[[ ${EUID:-$(id -u)} -eq 0 ]] || { log 'must run as root'; exit 1; }
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

HOST="${MINIJET_CERT_HOST:-${MINIJET_HOST:-}}"
MODE="${MINIJET_CERT_MODE:-${MINIJET_SSL_MODE:-}}"
EMAIL="${MINIJET_ACME_EMAIL:-}"

if [[ -z "$HOST" ]]; then
  log 'certificate host is empty'
  exit 1
fi

is_ip=0
if [[ "$HOST" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || "$HOST" == *:* ]]; then
  is_ip=1
  MODE="ip"
else
  MODE="domain"
fi

CERT_DIR="/root/cert/$HOST"
CERT_FILE="$CERT_DIR/fullchain.pem"
KEY_FILE="$CERT_DIR/privkey.pem"
mkdir -p "$CERT_DIR"
chmod 700 "$CERT_DIR"

current_public_ok() {
  [[ -s "$CERT_FILE" && -s "$KEY_FILE" ]] || return 1
  openssl x509 -in "$CERT_FILE" -noout -checkend 86400 >/dev/null 2>&1 || return 1
  openssl x509 -in "$CERT_FILE" -noout -issuer 2>/dev/null | grep -Eqi "Let's Encrypt|Google Trust Services|ZeroSSL" || return 1
}

apply_panel_cert() {
  [[ -x "$XUI_BIN" ]] || return 0
  "$XUI_BIN" cert -webCert "$CERT_FILE" -webCertKey "$KEY_FILE" >/dev/null 2>&1 || true
  systemctl restart x-ui >/dev/null 2>&1 || true
}

if current_public_ok; then
  printf '%s\n' "public-$MODE" > "$STATUS_FILE"
  apply_panel_cert
  exit 0
fi

install_acme() {
  if [[ -x /root/.acme.sh/acme.sh ]]; then
    return 0
  fi
  log 'installing acme.sh'
  if [[ -n "$EMAIL" ]]; then
    curl -fsSL https://get.acme.sh | sh -s email="$EMAIL" >/dev/null
  else
    curl -fsSL https://get.acme.sh | sh >/dev/null
  fi
}

issue_once() {
  local challenge="$1"
  local acme=/root/.acme.sh/acme.sh
  local args=(--issue --server letsencrypt -d "$HOST" -k ec-256)

  if [[ "$is_ip" -eq 1 ]]; then
    args+=(--certificate-profile shortlived --days 3)
  fi

  if [[ "$challenge" == 'http' ]]; then
    args+=(--standalone)
  else
    args+=(--alpn)
  fi

  "$acme" "${args[@]}" --force
}

install_public_cert() {
  local acme=/root/.acme.sh/acme.sh
  "$acme" --install-cert -d "$HOST" --ecc \
    --key-file "$KEY_FILE" \
    --fullchain-file "$CERT_FILE" \
    --reloadcmd "systemctl restart x-ui >/dev/null 2>&1 || true"
  chmod 600 "$KEY_FILE"
  chmod 644 "$CERT_FILE"
  printf '%s\n' "public-$MODE" > "$STATUS_FILE"
  apply_panel_cert
}

public_issue() {
  install_acme || return 1

  local attempt delay challenge
  for challenge in http alpn; do
    delay=3
    for attempt in 1 2 3; do
      log "public certificate attempt $attempt via $challenge for $HOST"
      if issue_once "$challenge"; then
        install_public_cert && return 0
      fi
      sleep "$delay"
      delay=$((delay * 3))
    done
  done
  return 1
}

self_signed_fallback() {
  log "public CA issuance unavailable; installing encrypted self-signed fallback for $HOST"
  local san
  if [[ "$is_ip" -eq 1 ]]; then
    san="IP:$HOST"
  else
    san="DNS:$HOST"
  fi

  openssl req -x509 -nodes -newkey ec \
    -pkeyopt ec_paramgen_curve:P-256 \
    -sha256 -days 30 \
    -subj "/CN=$HOST" \
    -addext "subjectAltName=$san" \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" >/dev/null 2>&1
  chmod 600 "$KEY_FILE"
  chmod 644 "$CERT_FILE"
  printf '%s\n' "self-signed-$MODE" > "$STATUS_FILE"
  apply_panel_cert
}

if public_issue; then
  log "public certificate ready: $HOST"
  exit 0
fi

self_signed_fallback
exit 0

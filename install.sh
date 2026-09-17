#!/usr/bin/env bash
set -Eeuo pipefail

REPO="imaicai/MiniJet-x-ui"
UPSTREAM_COMMIT="1c0ce80e8ea8a3e047d2ed8b2ea35e9292a89981"
UPSTREAM_INSTALL="https://raw.githubusercontent.com/MHSanaei/3x-ui/${UPSTREAM_COMMIT}/install.sh"
LOG="/var/log/minijet-x-ui-install.log"
STATE_DIR="/etc/minijet-x-ui"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
: > "$LOG"
chmod 600 "$LOG"

say_fail() {
  printf '\nMiniJet x-ui 安装失败。最近日志：\n' >&2
  tail -n 40 "$LOG" >&2 || true
}
trap say_fail ERR

[[ ${EUID:-$(id -u)} -eq 0 ]] || { echo '请使用 root 运行。' >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

install_packages() {
  if have apt-get; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update >>"$LOG" 2>&1
    apt-get install -y curl ca-certificates openssl jq tar xz-utils gzip build-essential git socat >>"$LOG" 2>&1
  elif have dnf; then
    dnf install -y curl ca-certificates openssl jq tar xz gzip gcc gcc-c++ make git socat >>"$LOG" 2>&1
  elif have yum; then
    yum install -y curl ca-certificates openssl jq tar xz gzip gcc gcc-c++ make git socat >>"$LOG" 2>&1
  elif have apk; then
    apk add --no-cache curl ca-certificates openssl jq tar xz gzip build-base git socat >>"$LOG" 2>&1
  else
    echo '不支持的包管理器。' >&2
    exit 1
  fi
}

fetch_repo_file() {
  local path="$1" dest="$2"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl -fsSL \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H 'Accept: application/vnd.github.raw+json' \
      "https://api.github.com/repos/${REPO}/contents/${path}?ref=main" \
      -o "$dest"
  else
    curl -fsSL "https://raw.githubusercontent.com/${REPO}/main/${path}" -o "$dest"
  fi
}

public_ipv4() {
  local u v
  for u in https://api.ipify.org https://ipv4.icanhazip.com https://ifconfig.me/ip; do
    v="$(curl -4 -fsS --max-time 5 "$u" 2>/dev/null | tr -d '[:space:]' || true)"
    if [[ "$v" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      echo "$v"; return 0
    fi
  done
  return 1
}

public_ipv6() {
  local u v
  for u in https://api64.ipify.org https://ipv6.icanhazip.com; do
    v="$(curl -6 -fsS --max-time 5 "$u" 2>/dev/null | tr -d '[:space:]' || true)"
    if [[ "$v" == *:* ]]; then
      echo "$v"; return 0
    fi
  done
  return 1
}

resolves_to_here() {
  local host="$1" ip4="$2" ip6="$3" resolved
  resolved="$(getent ahosts "$host" 2>/dev/null | awk '{print $1}' | sort -u || true)"
  [[ -n "$ip4" && "$resolved" == *"$ip4"* ]] && return 0
  [[ -n "$ip6" && "$resolved" == *"$ip6"* ]] && return 0
  return 1
}

random_port() {
  local p i
  for i in {1..50}; do
    p=$((20000 + RANDOM % 40000))
    if ! ss -lnt 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${p}$"; then
      echo "$p"; return 0
    fi
  done
  echo 28463
}

install_packages

IP4="$(public_ipv4 || true)"
IP6="$(public_ipv6 || true)"
[[ -n "$IP4" || -n "$IP6" ]] || { echo '无法检测公网 IP。' >&2; exit 1; }
PUBLIC_IP="${IP4:-$IP6}"

HOST="${MINIJET_HOST:-}"
SSL_MODE=""
if [[ -n "$HOST" ]]; then
  HOST="${HOST#http://}"; HOST="${HOST#https://}"; HOST="${HOST%%/*}"; HOST="${HOST%%:*}"
  if [[ "$HOST" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || "$HOST" == *:* ]]; then
    SSL_MODE="ip"
  else
    resolves_to_here "$HOST" "$IP4" "$IP6" || {
      echo "MINIJET_HOST=$HOST 没有解析到当前服务器公网地址。" >&2
      exit 1
    }
    SSL_MODE="domain"
  fi
else
  FQDN="$(hostname -f 2>/dev/null || true)"
  if [[ "$FQDN" == *.* ]] && resolves_to_here "$FQDN" "$IP4" "$IP6"; then
    HOST="$FQDN"
    SSL_MODE="domain"
  else
    HOST="$PUBLIC_IP"
    SSL_MODE="ip"
  fi
fi

USERNAME="${MINIJET_USERNAME:-minijet}"
PASSWORD="${MINIJET_PASSWORD:-$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9!@#%+=' | head -c 22)}"
PANEL_PORT="${MINIJET_PANEL_PORT:-$(random_port)}"
BASE_PATH="${MINIJET_WEB_BASE_PATH:-MiniJet-$(openssl rand -hex 4)}"
BASE_PATH="${BASE_PATH#/}"; BASE_PATH="${BASE_PATH%/}"
ACME_EMAIL="${MINIJET_ACME_EMAIL:-}"

[[ "$PANEL_PORT" =~ ^[0-9]+$ ]] && (( PANEL_PORT >= 1 && PANEL_PORT <= 65535 )) || {
  echo 'MINIJET_PANEL_PORT 必须是 1-65535。' >&2; exit 1;
}

(
  export XUI_NONINTERACTIVE=1
  export XUI_SSL_MODE=none
  export XUI_USERNAME="$USERNAME"
  export XUI_PASSWORD="$PASSWORD"
  export XUI_PANEL_PORT="$PANEL_PORT"
  export XUI_WEB_BASE_PATH="$BASE_PATH"
  export XUI_SERVER_IP="$PUBLIC_IP"
  curl -fsSL "$UPSTREAM_INSTALL" | bash
) >>"$LOG" 2>&1

fetch_repo_file minijet/tune-network.sh /usr/local/sbin/minijet-tune-network
chmod 755 /usr/local/sbin/minijet-tune-network
/usr/local/sbin/minijet-tune-network >>"$LOG" 2>&1 || true

cat > "$STATE_DIR/install.env" <<EOF
MINIJET_HOST=$(printf '%q' "$HOST")
MINIJET_CERT_HOST=$(printf '%q' "$HOST")
MINIJET_SSL_MODE=$(printf '%q' "$SSL_MODE")
MINIJET_CERT_MODE=$(printf '%q' "$SSL_MODE")
MINIJET_ACME_EMAIL=$(printf '%q' "$ACME_EMAIL")
MINIJET_PANEL_PORT=$(printf '%q' "$PANEL_PORT")
MINIJET_WEB_BASE_PATH=$(printf '%q' "$BASE_PATH")
MINIJET_USERNAME=$(printf '%q' "$USERNAME")
EOF
chmod 600 "$STATE_DIR/install.env"

fetch_repo_file minijet/cert-repair.sh /usr/local/sbin/minijet-cert-repair
chmod 755 /usr/local/sbin/minijet-cert-repair
/usr/local/sbin/minijet-cert-repair >>"$LOG" 2>&1 || true

if have systemctl; then
  cat > /etc/systemd/system/minijet-cert-repair.service <<'EOF'
[Unit]
Description=MiniJet x-ui certificate repair
After=network-online.target x-ui.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/minijet-cert-repair
EOF

  cat > /etc/systemd/system/minijet-cert-repair.timer <<'EOF'
[Unit]
Description=Retry/validate MiniJet x-ui public certificate

[Timer]
OnBootSec=10min
OnUnitActiveSec=6h
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
EOF
  systemctl daemon-reload >>"$LOG" 2>&1
  systemctl enable --now minijet-cert-repair.timer >>"$LOG" 2>&1 || true
elif [[ -d /etc/cron.d ]]; then
  echo '17 */6 * * * root /usr/local/sbin/minijet-cert-repair >/var/log/minijet-cert-repair.log 2>&1' > /etc/cron.d/minijet-cert-repair
fi

build_minijet_binary() {
  [[ "${MINIJET_SKIP_BUILD:-0}" != '1' ]] || return 0

  local work archive src go_ver go_arch node_arch node_ver node_dir go_dir
  work="$(mktemp -d)"
  archive="$work/src.tar.gz"

  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl -fsSL -L \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H 'Accept: application/vnd.github+json' \
      "https://api.github.com/repos/${REPO}/tarball/main" -o "$archive"
  else
    curl -fsSL -L "https://api.github.com/repos/${REPO}/tarball/main" -o "$archive"
  fi

  mkdir -p "$work/src"
  tar -xzf "$archive" -C "$work/src" --strip-components=1
  src="$work/src"

  case "$(uname -m)" in
    x86_64|amd64) go_arch=amd64; node_arch=x64 ;;
    aarch64|arm64) go_arch=arm64; node_arch=arm64 ;;
    *) echo "当前源码构建暂不支持架构 $(uname -m)" >&2; return 1 ;;
  esac

  go_ver="$(awk '/^go /{print $2; exit}' "$src/go.mod")"
  go_dir="$work/go"
  curl -fsSL "https://go.dev/dl/go${go_ver}.linux-${go_arch}.tar.gz" -o "$work/go.tgz"
  mkdir -p "$go_dir"
  tar -xzf "$work/go.tgz" -C "$go_dir" --strip-components=1

  node_ver="$(curl -fsSL https://nodejs.org/dist/index.json | jq -r '[.[] | select(.version | startswith("v24."))][0].version')"
  [[ "$node_ver" != null && -n "$node_ver" ]] || return 1
  node_dir="$work/node"
  curl -fsSL "https://nodejs.org/dist/${node_ver}/node-${node_ver}-linux-${node_arch}.tar.xz" -o "$work/node.tar.xz"
  mkdir -p "$node_dir"
  tar -xJf "$work/node.tar.xz" -C "$node_dir" --strip-components=1

  export PATH="$node_dir/bin:$go_dir/bin:$PATH"
  export CGO_ENABLED=1

  (
    cd "$src/frontend"
    npm ci
    npm run typecheck
    npm run build
  ) >>"$LOG" 2>&1

  (
    cd "$src"
    go build -ldflags '-w -s' -o "$work/x-ui" main.go
  ) >>"$LOG" 2>&1

  [[ -s "$work/x-ui" ]] || return 1
  systemctl stop x-ui >>"$LOG" 2>&1 || true
  cp -a /usr/local/x-ui/x-ui /usr/local/x-ui/x-ui.upstream.backup
  install -m 755 "$work/x-ui" /usr/local/x-ui/x-ui
  if ! systemctl restart x-ui >>"$LOG" 2>&1; then
    cp -a /usr/local/x-ui/x-ui.upstream.backup /usr/local/x-ui/x-ui
    systemctl restart x-ui >>"$LOG" 2>&1 || true
    return 1
  fi

  rm -rf "$work"
}

build_minijet_binary
/usr/local/sbin/minijet-cert-repair >>"$LOG" 2>&1 || true

CERT_STATUS="$(cat "$STATE_DIR/cert-status" 2>/dev/null || echo unknown)"
if [[ "$HOST" == *:* ]]; then
  URL_HOST="[$HOST]"
else
  URL_HOST="$HOST"
fi

printf '\n登录用户名: %s\n' "$USERNAME"
printf '登录密码: %s\n' "$PASSWORD"
printf '登录端口: %s\n' "$PANEL_PORT"
printf '登录根路径: /%s/\n' "$BASE_PATH"
printf '登录地址(HTTPS): https://%s:%s/%s/\n' "$URL_HOST" "$PANEL_PORT" "$BASE_PATH"
if [[ "$CERT_STATUS" == self-signed-* ]]; then
  printf '提示: 当前使用临时自签名证书，后台会自动重试公开证书。\n'
fi

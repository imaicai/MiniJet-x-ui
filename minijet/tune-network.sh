#!/usr/bin/env bash
set -Eeuo pipefail

CONF=/etc/sysctl.d/99-minijet-x-ui.conf

[[ ${EUID:-$(id -u)} -eq 0 ]] || exit 1

modprobe tcp_bbr >/dev/null 2>&1 || true
available="$(sysctl -n net.ipv4.tcp_available_congestion_control 2>/dev/null || true)"

{
  echo '# MiniJet x-ui: conservative, idempotent network tuning'
  echo 'net.ipv4.tcp_mtu_probing=1'
  if grep -qw bbr <<<"$available"; then
    echo 'net.core.default_qdisc=fq'
    echo 'net.ipv4.tcp_congestion_control=bbr'
  fi
} > "$CONF"

sysctl --system >/dev/null 2>&1 || true

if grep -qw bbr <<<"$available"; then
  echo 'bbr+fq'
else
  echo 'kernel-default'
fi

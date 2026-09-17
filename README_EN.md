# MiniJet x-ui

[中文（Default）](README.md) · [English](README_EN.md)

MiniJet x-ui is an x-ui derivative focused on **Mihomo-compatible clients**, unattended installation, and a radically simplified node-creation workflow.

> **Source baseline:** the public `yonggekkk/x-ui-yg` repository currently ships installation scripts, configuration files, prebuilt `x-ui` binaries and architecture packages, but not the complete editable frontend/backend source needed to directly rebuild its current panel. MiniJet therefore does not reverse-engineer that binary. It uses the GPL-3.0 licensed `MHSanaei/3x-ui` source as the auditable baseline and applies MiniJet changes to a pinned upstream commit; `x-ui-yg` is used as a reference for install flow and behavior.

## Goals

- One-command unattended installation: panel, service registration, network tuning, certificate setup, and secure random credentials.
- Adding a node requires only **node name + port**.
- Default node template: **VLESS + TCP + TLS + XTLS Vision**; UUID and supporting fields are generated automatically and the panel certificate is reused.
- Reality is not the default because current Mihomo documentation warns about Reality compatibility with newer Xray-core versions. MiniJet prioritizes a stable Mihomo path using TLS + Vision.
- Compact desktop-proxy UI: light work area, compact cards, consistent spacing/radius, advanced fields hidden from normal creation.
- No “Related Notes” menu.
- BBR + fq are enabled automatically when the host kernel supports BBR.

## One-command install

### After the repository is public

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/imaicai/MiniJet-x-ui/main/install.sh)
```

### While this repository remains private

Provide a read-only GitHub token on the VPS:

```bash
export GITHUB_TOKEN='YOUR_READ_ONLY_TOKEN'
bash <(curl -fsSL \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.raw+json" \
  https://api.github.com/repos/imaicai/MiniJet-x-ui/contents/install.sh)
```

The installer ends with a concise result such as:

```text
Username: maicai
Password: **************
Panel port: 5500
Base path: /MaiCai-xxxxxxxx/
HTTPS URL: https://198.35.45.175:5500/MaiCai-xxxxxxxx/
Certificate: Let's Encrypt IP / Domain / Self-signed fallback
```

## Domain / IP certificate policy

A remote shell cannot know whether the SSH client originally typed a hostname or an IP address; SSH hands the server an already-resolved connection. MiniJet therefore uses this order:

1. `MINIJET_HOST=panel.example.com`, if supplied and DNS resolves to this host.
2. Otherwise, the server FQDN if it resolves to this host's public address.
3. Otherwise, request a public certificate for the server IP.
4. ACME performs preflight checks, retries, and alternate challenge attempts.
5. A public CA can still fail because of unreachable challenge ports, rate limits, CA outages, NAT or firewall rules. If that happens, MiniJet installs a local self-signed certificate so HTTPS still comes up and installs a background retry timer. A self-signed certificate encrypts traffic but is not publicly trusted.

Let's Encrypt IP certificates are short-lived, so automatic renewal is mandatory. MiniJet keeps acme.sh renewal and adds certificate repair checks.

## Automatic node configuration

Normal “Add Node” mode exposes only node name and port. MiniJet automatically sets VLESS, TCP, TLS, Vision, UUID, client identity, unlimited traffic/expiry defaults, certificate paths, ALPN, and sniffing.

Legacy advanced fields such as ENC, decryption/encryption selection, fallbacks, Proxy Protocol, HTTP disguise, Reality keys/target/shortId, MLDSA65 and xver are not shown during normal creation. Existing nodes can still be opened in advanced edit mode for migration or troubleshooting.

## Optional environment variables

```bash
MINIJET_HOST=panel.example.com
MINIJET_USERNAME=maicai
MINIJET_PANEL_PORT=5500
MINIJET_WEB_BASE_PATH=MaiCai
MINIJET_ACME_EMAIL=you@example.com
MINIJET_SKIP_BUILD=0
```

## Upstream sync

The `minijet/` directory is the customization layer. `.github/workflows/sync-upstream.yml` imports the pinned 3x-ui source, applies the MiniJet UI and installer changes, runs frontend typecheck/build and a Go build, and only then writes the validated source back to `main`.

Upstream: <https://github.com/MHSanaei/3x-ui>  
Reference: <https://github.com/yonggekkk/x-ui-yg>

## License

MiniJet x-ui is a modified GPL-3.0 work based on 3x-ui. The complete derivative source remains GPL-3.0 and upstream notices are preserved.

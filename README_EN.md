# MiniJet x-ui

[中文（Default）](README.md) · [English](README_EN.md)

MiniJet x-ui is a minimalist x-ui derivative for **Mihomo-compatible clients**. Installation is designed to be nearly unattended, node configuration is automated, and the normal UI only exposes settings the user actually needs.

## One-command install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/imaicai/MiniJet-x-ui/main/install.sh)
```

The installer does not ask the user to choose protocols, BBR, certificate mode, or ordinary panel parameters. It configures the panel, network tuning, certificates, random secure credentials, and services automatically.

At the end it shows only the information needed to sign in, for example:

```text
Username: minijet
Password: **************
Panel port: 28463
Base path: /MiniJet-a1b2c3d4/
HTTPS URL: https://203.0.113.10:28463/MiniJet-a1b2c3d4/
```

> `203.0.113.10` is a documentation-only example address and does not identify a real server.

The default base-path format is `/MiniJet-xxxxxxxx/`, where `xxxxxxxx` is generated randomly for every installation.

## Nodes

Both “Add Node” and “Edit Node” expose only:

- Node name
- Port

Everything else is generated or preserved automatically. The current default template is **VLESS + TCP + TLS + XTLS Vision**. UUIDs, certificates, ALPN, sniffing, traffic defaults, expiry defaults, and other internal fields are handled automatically. The normal UI no longer exposes ENC, Reality, MLDSA65, fallbacks, Proxy Protocol, client groups, routing, outbounds, API documentation, or other nonessential configuration entry points.

## Automatic certificates

MiniJet automatically selects a usable hostname or public IP and requests the certificate. If a public certificate cannot be issued temporarily, MiniJet brings HTTPS up with an encrypted self-signed fallback and keeps retrying for a publicly trusted certificate in the background. No certificate-mode selection is required.

## Local UI inspection

The complete panel UI needs the local backend. Linux or Ubuntu under WSL2 on Windows 11 is recommended. The Vite frontend runs on port `5173` and proxies API calls to the Go backend on local port `2053`.

Requirements: Node.js 24+, npm 10+, and the Go version declared in `go.mod`.

```bash
git clone https://github.com/imaicai/MiniJet-x-ui.git
cd MiniJet-x-ui
```

Terminal 1:

```bash
go run main.go
```

Terminal 2:

```bash
cd frontend
npm ci
npm run dev
```

Open from the Windows browser:

```text
http://localhost:5173/
```

For existing Storybook components only:

```bash
cd frontend
npm run storybook
```

Then open `http://localhost:6006/`.

## Source and license

MiniJet uses the complete GPL-3.0 licensed `MHSanaei/3x-ui` source as its auditable baseline and applies MiniJet changes to a pinned upstream commit. `yonggekkk/x-ui-yg` is used only as a reference for installation flow and behavior. The complete derivative source remains GPL-3.0 and upstream notices are preserved.

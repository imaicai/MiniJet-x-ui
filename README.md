# MiniJet x-ui

[中文（默认）](README.md) · [English](README_EN.md)

MiniJet x-ui 是一个面向 **Mihomo 客户端**的极简 x-ui 衍生项目：安装尽量零交互，节点配置尽量自动化，普通用户只看到真正需要操作的内容。

## 一键安装

仓库公开后：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/imaicai/MiniJet-x-ui/main/install.sh)
```

当前仓库为 Private 时，需要提供一个只读 GitHub Token：

```bash
export GITHUB_TOKEN='YOUR_READ_ONLY_TOKEN'
bash <(curl -fsSL \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.raw+json" \
  https://api.github.com/repos/imaicai/MiniJet-x-ui/contents/install.sh)
```

安装过程中不要求用户选择协议、BBR、证书类型或常规面板参数。脚本自动完成安装、网络优化、证书、随机安全凭据和服务配置。

安装结束只显示登录所需结果，例如：

```text
登录用户名: minijet
登录密码: **************
登录端口: 28463
登录根路径: /MiniJet-a1b2c3d4/
登录地址(HTTPS): https://203.0.113.10:28463/MiniJet-a1b2c3d4/
```

> `203.0.113.10` 是文档示例地址，不对应真实服务器。

默认根路径格式为 `/MiniJet-xxxxxxxx/`，其中 `xxxxxxxx` 为每次安装自动生成的随机值。

## 节点

“添加节点”和“修改节点”只保留：

- 节点名称
- 端口

其余参数由 MiniJet 自动配置。当前默认模板为 **VLESS + TCP + TLS + XTLS Vision**，并自动处理 UUID、证书、ALPN、sniffing、流量与到期默认值等内部参数。普通界面不再展示 ENC、Reality、MLDSA65、fallback、Proxy Protocol、客户端组、路由、出站、API 文档等非必要配置入口。

## 自动证书

MiniJet 自动判断可用域名或公网 IP 并申请证书。公共证书暂时无法签发时，会先启用加密的自签名证书保证面板可访问，并在后台继续自动重试公开证书；无需人工选择证书模式。

## 本地检查 UI

前端使用 Vite，开发服务器端口为 `5173`，并把 API 转发到本地 `2053` 端口的 Go 后端。完整本地运行方式见下方“开发”说明。

## 开发

要求：Node.js 24+、npm 10+，完整后端联调还需要与 `go.mod` 匹配的 Go 版本。

```bash
git clone https://github.com/imaicai/MiniJet-x-ui.git
cd MiniJet-x-ui
```

终端 1：

```bash
go run main.go
```

终端 2：

```bash
cd frontend
npm ci
npm run dev
```

然后浏览器打开：

```text
http://localhost:5173/
```

## 源码与许可

本项目以 GPL-3.0 的 `MHSanaei/3x-ui` 完整源码为可审计基线，并在固定上游提交上应用 MiniJet 改造；`yonggekkk/x-ui-yg` 仅作为安装流程与功能行为参考。完整衍生源码继续以 GPL-3.0 发布，并保留上游版权与许可证声明。

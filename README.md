# MiniJet x-ui

[中文（默认）](README.md) · [English](README_EN.md)

MiniJet x-ui 是一个面向 **Mihomo 客户端**、强调极简安装与极简节点配置的 x-ui 衍生项目。

> **源码基线说明**：`yonggekkk/x-ui-yg` 的公开仓库当前主要提供安装脚本、配置文件、预编译 `x-ui` 二进制及架构包，并未提供足以直接重构当前面板前后端的完整可编辑源码。因此本项目不对其二进制做逆向修改，而是以 GPL-3.0 开源项目 `MHSanaei/3x-ui` 为可审计源码基线，在固定上游提交上应用 MiniJet 改造；`x-ui-yg` 仅作为安装流程与功能行为参考。

## 目标

- 一键安装，无交互完成面板、网络优化、证书、服务注册与随机安全凭据配置。
- 新增节点时，普通用户只填写 **节点名称 + 端口**。
- 默认节点模板为 **VLESS + TCP + TLS + XTLS Vision**，自动生成 UUID、客户端标识、订阅所需字段并复用面板有效证书。
- 不把 Reality 作为默认模板：当前 Mihomo 文档对较新 Xray-core 的 Reality 兼容性有明确警告；MiniJet 当前固定使用 TLS + Vision，优先保证 Mihomo 的稳定兼容。
- UI 使用更紧凑的 PC 小飞机风格：浅色工作区、紧凑卡片、统一圆角/间距、弱化高级配置。
- 不提供“相关说明”菜单。
- BBR + fq 在内核支持时自动启用，无需用户选择。

## 一键安装

### 仓库公开后（推荐）

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/imaicai/MiniJet-x-ui/main/install.sh)
```

### 当前仓库为 Private 时

先在 VPS 中提供一个只读此仓库的 GitHub Token：

```bash
export GITHUB_TOKEN='YOUR_READ_ONLY_TOKEN'
bash <(curl -fsSL \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.raw+json" \
  https://api.github.com/repos/imaicai/MiniJet-x-ui/contents/install.sh)
```

安装完成后只输出结果摘要，例如：

```text
登录用户名: maicai
登录密码: **************
登录端口: 5500
登录根路径: /MaiCai-xxxxxxxx/
登录地址(HTTPS): https://198.35.45.175:5500/MaiCai-xxxxxxxx/
证书状态: Let's Encrypt IP / Domain / Self-signed fallback
```

## 域名 / IP 证书策略

Shell 进程本身无法知道用户在 SSH 客户端里输入的是“域名还是 IP”（SSH 会把已解析后的地址交给服务器）。MiniJet 因此采用以下顺序：

1. 若设置 `MINIJET_HOST=panel.example.com`，优先使用该域名，并先校验 DNS 是否指向当前服务器。
2. 未指定时，检测服务器 FQDN；只有当它确实解析到本机公网地址时才使用域名证书。
3. 否则自动申请公网 IP 证书。
4. ACME 会进行预检、重试和备用挑战方式；公共 CA 仍可能因端口不可达、CA 限流/故障、NAT、防火墙等外部条件失败。
5. 为保证安装流程一定能结束在“可用 HTTPS”状态，公共证书失败时会生成本机自签证书，并安装后台重试定时器。**自签证书可加密，但不等于浏览器公开信任。**

Let's Encrypt 的 IP 证书属于短生命周期证书，必须自动续期，因此 MiniJet 保留 acme.sh 自动续期并增加证书修复定时检查。

## 节点自动配置

“添加节点”普通模式只展示两个字段：

| 用户填写 | 自动配置 |
|---|---|
| 节点名称 | VLESS、TCP、TLS、Vision、UUID、客户端 ID、流量/到期默认无限、监听地址、TLS 证书、ALPN、sniffing |
| 端口 | 自动校验 1–65535，并由服务端检查冲突 |

截图中原有的 `ENC`、`decryption`、`encryption`、`fallbacks`、`AcceptProxyProtocol`、HTTP 伪装、Reality target/key/shortId、MLDSA65、xver 等字段不再让普通用户配置。MiniJet 默认模板中：

- `decryption/encryption = none`
- `fallbacks = []`
- `AcceptProxyProtocol = false`
- HTTP 伪装关闭
- Reality / MLDSA65 关闭
- sniffing 开启（HTTP/TLS/QUIC 目标识别）
- TLS 1.2–1.3，复用面板证书
- `flow = xtls-rprx-vision`

已有节点仍可进入“高级编辑”进行兼容迁移；新增节点默认不暴露繁复参数。

## 可选环境变量

```bash
MINIJET_HOST=panel.example.com        # 指定域名；留空则自动判断域名/IP
MINIJET_USERNAME=maicai               # 默认 maicai
MINIJET_PANEL_PORT=5500               # 留空则随机高位端口
MINIJET_WEB_BASE_PATH=MaiCai          # 留空则自动生成 MaiCai-随机后缀
MINIJET_ACME_EMAIL=you@example.com    # 可选 ACME 邮箱
MINIJET_SKIP_BUILD=0                  # 1 = 仅安装上游服务，不替换为 MiniJet 源码构建
```

## 开发 / 上游同步

本仓库保留 `minijet/` 改造层。`.github/workflows/sync-upstream.yml` 会：

1. 固定拉取已审阅的 3x-ui 上游提交；
2. 导入完整 GPLv3 源码；
3. 应用 MiniJet UI、极简节点表单、中文文案和安装器改造；
4. 执行前端 typecheck/build 与 Go build；
5. 只有构建通过才回写到 `main`。

上游：<https://github.com/MHSanaei/3x-ui>  
参考项目：<https://github.com/yonggekkk/x-ui-yg>

## License

MiniJet x-ui 基于 GPL-3.0 的 3x-ui 源码继续修改，完整衍生源码同样以 GPL-3.0 发布；上游版权与许可证声明保持不变。

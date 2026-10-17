[English](README.md) | 简体中文

# 批量邮箱验证 API —— 面向 n8n、AI Agent 与 MCP

批量验证邮箱地址：RFC 5322 格式 → DNS/MX → 一次性邮箱 / 角色邮箱 / 免费邮箱名单 → 真实 SMTP 握手并强制探测全收域名（catch-all）。**全程不发送任何邮件** —— 只建立 SMTP 会话、读取响应码，然后断开。

[![n8n 模板](https://img.shields.io/badge/n8n-4%20个模板-EA4B71)](workflows/zh-CN)
[![MCP](https://img.shields.io/badge/MCP-可直接接入-7C3AED)](agents/mcp)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539)](openapi/email-verifier.openapi.yaml)
[![计费](https://img.shields.io/badge/计费-按验证地址数-0A66C2)](https://apify.com/sumitr_mardy/email-verifier/pricing)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

### ➜ [在 Apify 上试用](https://apify.com/sumitr_mardy/email-verifier)

```json
{
  "email": "john@example.com",
  "status": "deliverable",
  "sub_status": "valid_mailbox",
  "score": 100,
  "checks": {
    "syntax": true, "domain_exists": true, "mx_found": true,
    "smtp_connectable": true, "mailbox_exists": true, "catch_all": false,
    "disposable": false, "role_based": false, "free_provider": false,
    "a_record_fallback": false, "has_tag": false
  },
  "mx_record": "aspmx.l.google.com"
}
```

---

## 为什么适合放进自动化流程

多数验证工具是写给看仪表盘的人用的。这个的前提是：调用方是代码。

这个前提决定了输出必须保证什么：

**1. `status` 永远是四个值之一。** `deliverable`、`undeliverable`、`risky`、`unknown`。不会是 null，不会是空字符串，也不会冒出第五个值。枚举一次，永远有效。

**2. `checks` 的 11 个字段每条记录都在。** 没跑到的检查值为 `false`，原因写在 `sub_status` 里。没有字段会消失。

**3. 全收域名和 Gmail 这类服务商如实上报。** 返回 `risky` 并说明原因，而不是伪造一个 "valid"。

这三条加起来，你写的是：

```js
const mailable = results.filter(r => r.status === 'deliverable');
const neverSend = results.filter(r => r.status === 'undeliverable' || r.checks.disposable);
const retryLater = results.filter(r => r.status === 'unknown');
```

而不是：

```js
const mailable = results.filter(r => r?.status === 'valid' && (r.checks?.catch_all ?? false) === false);
```

第二行是所有"字段可能为 null"的 API 逼你写的。对 Agent 来说这件事比对人更要命：**Agent 不会替你写 `?? false`** —— 它直接按读到的内容行动。一个时有时无的字段，不是使用不便，而是一个被自信地给出的错误答案。

---

## 每种结果该怎么处理

| `status` | `sub_status` | 处置 |
|---|---|---|
| `deliverable` | `valid_mailbox` | 可以发 |
| `risky` | `role_based` | 能接受共享收件箱再发 |
| `risky` | `catch_all` | 无法确认邮箱 —— 小量发送，或换方式核实 |
| `risky` | `free_provider_unverifiable` | 按个人邮箱对待；SMTP 无法确认具体邮箱 |
| `risky` | `full_mailbox` | 搁置，几天后重试 |
| `risky` | `disposable` | 不要发；注册环节拦截 |
| `unknown` | `greylisted` | **30–60 分钟后重试 —— 这不是坏地址** |
| `unknown` | `smtp_timeout` | 稍后重试；持续如此则按未验证处理 |
| `unknown` | `internal_error` | 重试一次 |
| `undeliverable` | 任意 | 从名单中移除 |

带分数和详细说明的完整表格：**[docs/statuses.zh-CN.md](docs/statuses.zh-CN.md)**

关键区分：`undeliverable` 是**查清楚了它是死的**，`unknown` 是**没查出来**。把两者合并的工具，数字更好看，代价是悄悄从你的名单里删掉真实客户。

---

## 在 AI Agent 中使用

### Dify

把 [`openapi/email-verifier.openapi.yaml`](openapi/email-verifier.openapi.yaml) 作为自定义工具导入即可。详细步骤：[agents/dify/README.zh-CN.md](agents/dify/README.zh-CN.md)

### Coze / 扣子

同样导入上面那个 OpenAPI 文件。详细步骤：[agents/coze/README.zh-CN.md](agents/coze/README.zh-CN.md)

### MCP

Apify 的 MCP server，范围限定到这一个 Actor。Claude Desktop 与 Cursor 的配置：[`agents/mcp/`](agents/mcp)

### 工具定义

OpenAI function calling 与 Anthropic tool API 的现成 JSON：[`agents/tool-definitions/`](agents/tool-definitions)

### 给 Agent 自己读的

[`llms.txt`](llms.txt) 用一页讲完整个契约：接口、输入、输出、处置对照表、批量上限。

---

## 在 n8n 中使用

所有模板都用核心的 **HTTP Request** 节点调用 Actor —— 不需要安装社区节点，n8n Cloud 和自建都能用。认证使用名为 `Apify API` 的 **Header Auth** 凭证；本仓库任何文件中都不含 token。

| 模板 | 作用 | 导入 |
|---|---|---|
| **验证 Google Sheets 线索表** | 读取还没有结论的行，分批验证，把 `status`/`score` 写回。可重复运行，可挂定时。 | [`t1-google-sheets.json`](workflows/zh-CN/t1-google-sheets.json) |
| **注册时拦截一次性邮箱** | Webhook 进，`{allow\|review\|block}` 出，判定逻辑在一个可改的 Code 节点里。 | [`t2-signup-check.json`](workflows/zh-CN/t2-signup-check.json) |
| **群发前清洗 CSV** | 上传 Apollo/Instantly/HubSpot 导出文件，得到 `send_safe` / `review` / `drop` 三份 CSV。灰名单行会自动重试一次。 | [`t3-clean-csv.json`](workflows/zh-CN/t3-clean-csv.json) |
| **AI Agent 工具** | 一个只带邮箱验证工具的 Agent，system prompt 里写好了上面那张处置对照表。 | [`t4-ai-agent-tool.json`](workflows/zh-CN/t4-ai-agent-tool.json) |

英文版（sticky note 为英文）：[`workflows/en/`](workflows/en)

**导入方式：** 下载 JSON，在 n8n 中选择 *Workflows → Import from File*。每个工作流内部的 sticky note 写了配置步骤。

---

## 在代码中调用

```bash
curl -X POST "https://api.apify.com/v2/acts/sumitr_mardy~email-verifier/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emails":["john@example.com","someone@gmail.com"]}'
```

Python 和 Node 示例，各自不到 25 行，不需要 SDK：[`examples/`](examples)

---

## 大名单

地址是整批提交的，不是一个地址一次调用 —— 批量提交才是便宜和快的原因。

Apify 同步请求必须在 **300 秒**内完成。超过这个量就用异步方式：启动运行、等待完成、再取 dataset。完整示例：[`examples/batch-large-list/`](examples/batch-large-list)

实测吞吐和建议的批量大小：[`docs/pricing-and-batching.zh-CN.md`](docs/pricing-and-batching.zh-CN.md)

---

## 计费

按次计费：**每个得出结论的地址计费一次** —— 包括 `undeliverable` 和 `unknown`，因为这两类同样消耗了验证过程，而且一个被确认的坏地址，正是你付费想得到的结果。没有按运行次数的收费。

单价按你的 Apify 套餐分层，并会随市场调整，所以不在这里写死以免过期：**[查看当前价格](https://apify.com/sumitr_mardy/email-verifier/pricing)**。

调用 API 需要 Apify 账号，有免费额度。

---

## 已知限制

直说，反正你迟早会发现。

- **免费邮箱服务商无法验证到具体邮箱。** Gmail、Outlook、Yahoo、iCloud 对不存在的地址也返回 `250`，到投递阶段才退信。任何声称能用 SMTP 给出 Gmail 单个邮箱结论的厂商都是在猜。这里返回 `risky/free_provider_unverifiable`，`checks.mailbox_exists` 为 `false`。
- **全收域名无法验证到具体邮箱。** 这是定义决定的。探测会识别出来并如实上报，而不是给一个自信的猜测。
- **灰名单不是结论。** `421`/`450` 返回 `unknown/greylisted`，属于可重试。T3 模板已经帮你重试。

---

## 常见问题

**它会发邮件吗？**
不会。它建立 SMTP 会话，发送 `EHLO`、`MAIL FROM` 和 `RCPT TO`，读取响应码后断开。从不执行 `DATA`，整个过程里根本不存在邮件正文。

**能验证 Gmail 地址吗？**
能验证格式、域名有效性，以及是否为一次性邮箱。但无法确认某个 Gmail 邮箱是否存在 —— Google 对真实和虚假地址返回相同结果。任何基于 SMTP 的工具都做不到，声称做得到的是在猜。

**什么是全收域名（catch-all）？**
一个配置成接受所有地址邮件的域名，无论该地址是否存在。在询问你的地址之前，验证器会先对一个不可能存在的随机本地部分发 `RCPT TO`。如果被接受，说明是全收域名，该域名下所有地址一律返回 `risky/catch_all`。

**一次能验证多少个？**
在 300 秒同步上限内能跑完多少就是多少。用你自己的名单实测，见 [docs/pricing-and-batching.zh-CN.md](docs/pricing-and-batching.zh-CN.md)。超过就用异步方式。

**怎么处理 Apollo / Instantly / Lemlist 的导出文件？**
用 T3 模板 —— 上传 CSV，拿回三份清洗好的名单。它会自动识别邮箱列并先去重，所以同一个地址不会被收费两次。

**重复的地址怎么算？**
会计费。调用前请先去重，本仓库的模板都已经做了。

---

MIT 协议。欢迎提 issue 和 PR，尤其欢迎在不同 n8n 版本上发现模板行为差异的修正。

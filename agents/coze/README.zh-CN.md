# 在 Coze / 扣子中接入邮箱验证

和 Dify 一样，导入同一个 OpenAPI 文件即可。

## 1. 准备 Apify token

<https://console.apify.com/settings/integrations> 创建 API token。

## 2. 新建插件

扣子 → **资源库** → **插件** → **创建插件**

创建方式选 **基于已有服务创建**，导入方式选 **通过 OpenAPI 导入**。

贴入 [`openapi/email-verifier.openapi.yaml`](../../openapi/email-verifier.openapi.yaml)
的内容。扣子会解析出一个工具：`verifyEmails`。

## 3. 配置鉴权

授权方式选 **Service（服务）**，鉴权类型 **Bearer Token**：

| 字段 | 填 |
|---|---|
| Location | Header |
| Parameter name | `Authorization` |
| Token | `Bearer 你的_APIFY_TOKEN` |

若扣子会自动补 `Bearer ` 前缀，这里就只填 token 本身。保存后用调试页验证，
401 基本都是这个前缀加了两次。

## 4. 调试

在插件调试页直接试：

```json
{ "emails": ["test@mailinator.com", "someone@gmail.com"] }
```

应当返回两条记录：`risky/disposable` 和 `risky/free_provider_unverifiable`。

调试通过后记得**发布插件**，否则 Bot 里看不到。

## 5. 在 Bot 中使用

把插件加到 Bot，并在人设与回复逻辑里写上处置规则。这一步不能省 ——
只给结论不给策略，模型会自己编，而最常见的错误是把 `unknown` 当成"无效地址"。

```
使用 verify_emails 判断邮箱是否可以发送。一个问题里的所有地址合并成一次调用。

deliverable / valid_mailbox —— 可以发，邮箱已确认存在。
risky / role_based —— 角色邮箱（info@、support@），不是具体的人。
risky / catch_all —— 域名全收，无法确认这个邮箱。可小量发送并观察退信。
risky / free_provider_unverifiable —— Gmail/Outlook 这类无法确认具体邮箱，按个人邮箱对待。
risky / full_mailbox —— 邮箱存在但已满，几天后重试。
risky / disposable —— 一次性邮箱，不要发。
unknown / greylisted —— 不是坏地址，服务器要求稍后再来，30–60 分钟后重试。
unknown / smtp_timeout —— 服务器没响应，属于未验证，不是无效。
undeliverable / 任意 —— 从名单中移除。

绝对不要把 unknown 说成无效或已失效。
```

完整对照表：[docs/statuses.zh-CN.md](../../docs/statuses.zh-CN.md)

## 注意

**一次调用传入全部地址。** 批量更快，单价一样。

**先去重** —— 重复地址会重复计费。

**按 `email` 字段匹配结果**，不要按数组下标：返回顺序和提交顺序不同。

**同步 300 秒上限**。大名单用异步方式，见
[examples/batch-large-list](../../examples/batch-large-list)。

## 典型场景

**注册风控 Bot** —— 用户提交邮箱，`disposable` 或 `undeliverable` 直接拦，
`risky` 转人工，`deliverable` 放行。工作流版本见
[T2 模板](../../workflows/zh-CN/t2-signup-check.json)。

**名单清洗助手** —— 用户贴一批地址，Bot 返回"可发 / 需确认 / 删除"三组。

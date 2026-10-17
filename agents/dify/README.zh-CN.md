# 在 Dify 中接入邮箱验证

把本仓库的 OpenAPI 文件作为自定义工具导入，Agent 就能自己判断一个地址能不能发。

## 1. 准备 Apify token

到 <https://console.apify.com/settings/integrations> 创建 API token。
调用需要 Apify 账号，有免费额度。

## 2. 导入 OpenAPI

Dify → **工具** → **自定义** → **创建自定义工具**

把 [`openapi/email-verifier.openapi.yaml`](../../openapi/email-verifier.openapi.yaml)
的内容贴进 schema 输入框（或填该文件的 raw URL）。

Dify 会解析出一个工具：`verifyEmails`。

## 3. 配置鉴权

鉴权方式选 **API Key**：

| 字段 | 填 |
|---|---|
| 类型 | Bearer |
| Header 名 | `Authorization` |
| 值 | `Bearer 你的_APIFY_TOKEN` |

部分 Dify 版本会自动补上 `Bearer ` 前缀，重复加会 401。保存后用下一步验证。

## 4. 测试

在工具页面直接试调：

```json
{ "emails": ["test@mailinator.com", "someone@gmail.com"] }
```

应当返回两条记录，第一条 `risky/disposable`，第二条
`risky/free_provider_unverifiable`。

## 5. 在 Agent 中使用

把工具加到 Agent，并在提示词里放入处置规则。**这一步不能省** ——
只给结论不给策略，模型会自己编一套，而且最常犯的错就是把 `unknown`
说成"无效地址"。

可以直接粘贴这段：

```
使用 verify_emails 工具判断邮箱是否可以发送。一个问题里的所有地址合并成一次调用。

deliverable / valid_mailbox —— 可以发，邮箱已确认存在。
risky / role_based —— 角色邮箱（info@、support@），不是具体的人。
risky / catch_all —— 域名全收，无法确认这个邮箱。可小量发送并观察退信。
risky / free_provider_unverifiable —— Gmail/Outlook 这类无法确认具体邮箱，按个人邮箱对待。
risky / full_mailbox —— 邮箱存在但已满，几天后重试。
risky / disposable —— 一次性邮箱，不要发。
unknown / greylisted —— 不是坏地址，服务器要求稍后再来，30–60 分钟后重试。
unknown / smtp_timeout —— 服务器没响应，属于未验证，不是无效。
undeliverable / 任意 —— 从名单中移除。

绝对不要把 unknown 说成无效或已失效。要说明这次没查出结果，以及下一步该做什么。
```

完整对照表：[docs/statuses.zh-CN.md](../../docs/statuses.zh-CN.md)

## 注意

**一次调用传入全部地址。** 十个地址是一次调用，不是十次。批量提交更快，单价一样。

**先去重。** 重复的地址会重复计费。

**结果顺序和提交顺序不同。** Actor 按域名分组以复用连接，所以要按 `email`
字段匹配，不要按数组下标。

**同步调用上限 300 秒。** 名单很大时用异步方式，见
[examples/batch-large-list](../../examples/batch-large-list)。

## 排查

**401** —— token 不对，或 `Bearer ` 前缀加了两次。

**只返回了部分地址** —— 可能触发了 300 秒上限。减少单次数量。

**全部返回 `unknown/smtp_timeout`** —— 不是你的配置问题，是服务端的出口
IP 当时被目标邮件服务器拒绝。稍后重试；持续如此请在仓库提 issue。

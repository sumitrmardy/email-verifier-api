# 全部状态，以及该怎么处理

`status` 只有 4 个值，`sub_status` 只有 12 个，每条记录两个字段都一定存在。
表格就这么大，不会再冒出别的值。

真正有用的是最后一列。不知道怎么处置的结论，只是一条无用信息。

| `status` | `sub_status` | 含义 | 处置建议 |
|---|---|---|---|
| `deliverable` | `valid_mailbox` | SMTP 已确认该邮箱存在，且域名不是全收 | **可以发。** |
| `risky` | `role_based` | 角色邮箱 —— `info@`、`support@`、`admin@` —— 且确认存在 | 能接受共享收件箱就发。客服场景合适，个人触达效果差。 |
| `risky` | `catch_all` | 域名全收所有地址，因此无法确认这个具体邮箱 | 小量发送并观察退信，或换别的方式核实此人。不是坏地址，是**无法证明**的地址。 |
| `risky` | `free_provider_unverifiable` | Gmail、Outlook、Yahoo、iCloud 这类对任何地址返回相同结果 | 按个人邮箱对待。格式和域名没问题，但邮箱本身无法通过 SMTP 确认。 |
| `risky` | `full_mailbox` | 邮箱真实存在，当前超出配额 | 先搁置，几天后重试。人是存在的。 |
| `risky` | `disposable` | 一次性 / 临时邮箱域名 | 不要发。应在注册环节拦截 —— 那里成本最低。 |
| `unknown` | `greylisted` | 服务器要求稍后再来（`421`/`450`） | **30–60 分钟后重试。** 这不是坏地址；灰名单是一种反垃圾手段，本来就期待第二次投递。 |
| `unknown` | `smtp_timeout` | 邮件服务器没有响应，或基于策略拒绝了会话 | 稍后重试。若持续如此，按**未验证**处理，而不是无效。 |
| `unknown` | `internal_error` | 处理该地址时出错，`error` 字段说明原因 | 重试一次。反复出现请反馈。 |
| `undeliverable` | `invalid_syntax` | 不符合 RFC 5322 | 移除。 |
| `undeliverable` | `no_mx_record` | 该域名完全没有邮件路由 | 移除。 |
| `undeliverable` | `mailbox_not_found` | 服务器明确回复没有这个用户 | 移除。 |

## 整个产品立足的那个区分

`undeliverable` 的意思是 **查清楚了，它是死的**。
`unknown` 的意思是 **没查出来**。

多数验证工具把这两者合并。这样数字更好看 —— "95% 准确率，只有 1% unknown"
比诚实的结果好卖得多。但一个被错判为 undeliverable 的地址，就是一个你再也不会
联系的客户，而且你永远不会知道这件事发生过。

所以当 SMTP 层拿不到答案时 —— 对方主机不可达、会话因为**我们的 IP** 而不是
**对方的邮箱**被拒、DNS 解析器故障而非给出答案 —— 返回的是 `unknown`。
上表中有三行纯粹为此存在。

反方向同样适用。明确点名收件人的 `550`（`no such user`、`recipient address
rejected`）是真实退信，即使同一句话里还有 "access denied" 这类词 ——
Microsoft 365 的措辞正是如此。把它当成策略拦截，等于在全球最大的企业邮件平台上
丢掉一个真实的 `undeliverable`。

## 两件事谁也验证不了

**免费邮箱服务商。** Gmail、Outlook、Yahoo、iCloud 对存在和不存在的地址都返回
相同的 `250`，然后在投递阶段才退信。任何声称能通过 SMTP 给出 Gmail 单个邮箱
结论的工具都是在猜。这里返回 `risky/free_provider_unverifiable`，并且
`checks.mailbox_exists` 为 `false`。

**全收域名（catch-all）。** 一个接受所有地址的域名，无法告诉你任何单个地址的
情况。在询问你的地址之前，Actor 会先对一个**不可能存在**的随机本地部分发送
`RCPT TO`。如果服务器接受了，该域名下所有地址一律返回 `risky/catch_all`，
你的地址根本不会被探测 —— 因为那个答案没有意义。

这两条是 SMTP 本身的限制，不是这个实现的缺陷。我们选择说明，而不是掩盖。

## 评分

`score` 是结论的纯函数 —— 一张查找表，没有模型，没有随机性。同样的结论
今天和一年后都是同一个分数，这使得结果可以安全缓存、测试可以安全编写。

| 分数 | 结论 |
|---|---|
| 100 | `deliverable/valid_mailbox`（域名只有 A 记录、没有真正 MX 时为 90） |
| 60 | `risky/role_based` |
| 55 | `risky/free_provider_unverifiable` |
| 50 | `risky/catch_all` |
| 45 | `risky/full_mailbox` |
| 40 | `unknown/greylisted` |
| 30 | `unknown/smtp_timeout` |
| 20 | `risky/disposable` |
| 5 | `undeliverable/mailbox_not_found` |
| 0 | `undeliverable/invalid_syntax`、`undeliverable/no_mx_record`、`unknown/internal_error` |

**决策用 `status`，排序用 `score`。** 只按 `score` 卡一条阈值线，迟早会把
`greylisted`（40）和 `disposable`（20）分到同一侧，而这两者的处置方式完全相反。

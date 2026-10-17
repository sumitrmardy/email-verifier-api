# Posting kit — email-verifier-api

Repo: https://github.com/sumitrmardy/email-verifier-api

Hướng dẫn viết bằng tiếng Việt. Bài đăng viết sẵn bằng ngôn ngữ của từng nền tảng, copy dùng được ngay.

---

## 0. Phải xong trước khi đăng (một buổi tối)

### 0.1 Import thử 8 workflow vào n8n — bắt buộc

`VERIFY.md` của repo ghi rõ: các template chưa từng được import vào một n8n đang chạy. Tham số node và `typeVersion` của n8n đổi theo từng phiên bản. Đăng lên diễn đàn n8n một template import ra node trống là mất uy tín ngay trước đúng nhóm khách cần thu hút.

Tối thiểu phải test **T1 (Google Sheets)** và **T3 (CSV)**, vì đây là hai template đem đi đăng. T4 (AI agent) rủi ro cao nhất, vì các node LangChain thay đổi nhanh nhất.

Windows PowerShell, máy anh (cần Docker Desktop):

```powershell
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Mở http://localhost:5678, sau đó:

1. Credentials → New → Header Auth, tên `Apify API`, header `Authorization`, value `Bearer <APIFY_TOKEN>`.
2. Workflows → Import from File → lần lượt `workflows/en/t1…t4.json`, rồi tới bản `zh-CN`.
3. Mở **từng node**. Node nào hiện trống tham số thì đó là chỗ phải sửa.
4. Chạy T1 và T3 với `test/fixtures/emails.txt`. Riêng T3, test thêm trường hợp **không có địa chỉ nào bị greylisted**: node Merge phải chạy xong với một nhánh rỗng, không được treo.

Sửa được gì thì sửa trong `workflows/src/` rồi `npm run build`. Đừng sửa trực tiếp file trong `en/` hay `zh-CN/`.

### 0.2 Cập nhật giá trong sticky note

`config/links.json` vẫn ghi `"priceFromPer1k": "$2.00"`, nên cả 8 sticky note đang hiện "From $2.00 per 1,000". Đổi thành `"$0.55"` (giá thấp nhất sau khi anh chỉnh theo bậc), rồi chạy:

Windows PowerShell, trong thư mục repo:

```powershell
npm run check
git add -A
git commit -m 'chore: update starting price to $0.55 per 1k'
git push
```

(Dùng nháy đơn ở commit message, vì PowerShell biến `$0` trong nháy kép thành biến.)

### 0.3 Description và topics của repo

GitHub đang trả về repo **không có description và không có topics**, tức là gần như vô hình với GitHub search. Vào trang repo → bấm ⚙ cạnh "About" → điền:

**Description**
```
Bulk email verification API for n8n, AI agents & MCP — SMTP, MX, catch-all, disposable. Schema-stable JSON, never null. EN / 中文
```

**Topics**
```
email-verification email-validation email-verifier smtp catch-all disposable-email n8n n8n-workflow n8n-template mcp mcp-server ai-agents dify openapi lead-generation cold-email apify automation
```

### 0.4 Ảnh social preview

File `social-preview.png` (1280×640) gửi kèm. Làm hai việc:

- Settings → General → Social preview → Upload.
- Chép vào `assets/social-preview.png` rồi commit.

Mỗi lần dán link repo lên diễn đàn, ảnh này sẽ hiện thay cho avatar mặc định.

### Affiliate chưa được duyệt — không chặn việc đăng

Mọi bài viết dưới đây đều **link về GitHub, không link thẳng tới Apify**. Khi affiliate được duyệt, anh điền tham số vào `config/links.json` → `npm run build` → push, và mọi link trong repo tự cập nhật. Traffic từ các bài đã đăng chảy qua repo nên vẫn được tính.

---

## 1. Cách đo xem kênh nào có tác dụng

Chuỗi đo gồm hai bước:

1. **Bài viết → GitHub:** repo → Insights → Traffic → *Referring sites*. Ở đây sẽ thấy `community.n8n.io`, `v2ex.com`, `juejin.cn`.
2. **GitHub → Apify:** Insights → Acquisition → dòng `github.com` trong Referrers.

GitHub chỉ giữ dữ liệu traffic 14 ngày, nên **mỗi tuần chụp màn hình một lần**. Mỗi bài đăng xong thì ghi URL và ngày vào bảng trong `LAUNCH.md`.

---

## 2. Lịch đăng

| Ngày | Kênh | Giờ VN | Ghi chú |
|---|---|---|---|
| 0 | Làm xong mục 0 | — | Không đăng gì trước khi mục 0 xong |
| 1 | Diễn đàn n8n, *Built with n8n* (bài A) | 20:00–22:00 | Chiều châu Âu, sáng Mỹ |
| 1 | Nộp T1 + T3 lên n8n.io/workflows (mục 4) | — | Đọc guideline nộp template bản mới nhất trước khi nộp |
| 3 | V2EX, node 分享创造 (bài B) | 08:00–10:00 thứ 3–5 | Đầu giờ làm việc ở Trung Quốc |
| 5–7 | 掘金 juejin.cn (bài C) | 08:00–10:00 hoặc 19:00–21:00 | Bài kỹ thuật dài, cũng là bài có giá trị SEO lâu dài nhất |
| Sau khi T1/T3 được duyệt | Nộp T2, T4 | — | |

Mỗi nền tảng chỉ đăng một bài. Trong 24 giờ đầu, trả lời mọi bình luận trong vòng vài giờ. Đó là lợi thế của người tự làm một mình.

---

## 3. Bài A — n8n Community, mục "Built with n8n" (EN)

Mục này ghi rõ: bài về **một workflow đơn lẻ** nên nộp lên trang workflows. Vì vậy bài này đóng khung như **một dự án**: bộ 4 template + agent kit. Đính kèm 1–2 ảnh chụp canvas T3 và T1 (chụp lúc test ở mục 0.1, không để lộ token).

**Title**
```
Open-source n8n templates for bulk email verification — Sheets, CSV cleanup, signup webhook, AI agent tool (EN/中文)
```

**Body**
```markdown
I built a set of four n8n templates around one job: checking whether email addresses are worth sending to, before they go into a sequence, a CRM, or an agent's hands.

**The templates**
- **Google Sheets lead list** — reads rows with no verdict, verifies in batches, writes `status` / `score` back. Re-runs only pick up new rows, so it's safe on a schedule.
- **Clean a CSV before cold email** — upload an Apollo / Instantly / HubSpot export, get back three lists: `send_safe`, `review`, `drop`. Greylisted addresses wait and get retried once instead of being thrown away.
- **Signup webhook** — returns `allow | review | block`, with the policy in a single Code node so you can make it stricter or looser.
- **AI agent tool** — an AI Agent with the verifier as its only tool, and a system prompt that tells it what each result means and what to do with it.

**A few details that took longer than expected**
- Results are matched back **by address, not row order**. The verifier groups addresses by domain, so they come back reordered; matching by position silently writes the wrong verdict on the wrong row.
- `unknown` and `undeliverable` are kept apart. "We couldn't find out" (greylisting, timeouts) is not "this mailbox is dead", and merging them deletes real contacts.
- Gmail / Outlook / Yahoo / iCloud accept any address at SMTP time, so those come back as `risky / free_provider_unverifiable` rather than a fake "valid". Same for catch-all domains.
- Every record has the same shape: `status` is always one of four values and all 11 `checks` keys are always present. No `?? false` scattered through your Code nodes.

Everything uses the core HTTP Request node (no community node) and a Header Auth credential, so nothing secret lives in the JSON. Chinese versions of all four are included.

Also in the repo: an OpenAPI file (imports into Dify, Coze, GPT Actions), MCP config, and `llms.txt`.

**Disclosure:** the templates are MIT, but they call an email-verification Actor I built and run on Apify, which is pay-per-verified-address (there's a free tier).

Repo: https://github.com/sumitrmardy/email-verifier-api

Feedback welcome — especially from anyone on a different n8n version where a node imports differently. That's the part I'd most like to hear about.
```

---

## 4. Nộp template lên n8n.io/workflows — tiêu đề và mô tả

Đây là kênh có ý định tìm kiếm cao nhất: người tìm "verify emails google sheets n8n" sẽ thấy trang template. Nộp T1 và T3 trước.

**T1 — Title**
```
Verify a Google Sheets lead list and write results back (SMTP, catch-all, disposable)
```

**T1 — Description**
```markdown
Checks every email in a Google Sheet that hasn't been verified yet and writes the verdict next to it: status, sub-status, score, catch-all and disposable flags.

**Who it's for:** anyone keeping leads in a sheet before importing them into a cold-email tool or CRM.

**How it works**
1. Reads only rows whose `status` column is empty — safe to re-run or schedule.
2. Sends addresses in batches to an email-verification API (syntax → MX → disposable/role lists → live SMTP handshake with a catch-all probe; no email is ever sent).
3. Matches results back by address, not row order, and updates each row.

**Setup**
- Sheet columns: `email`, `status`, `sub_status`, `score`, `catch_all`, `disposable`, `verified_at` (only `email` needs values).
- An Apify account and a Header Auth credential named `Apify API` (`Authorization: Bearer <token>`).
- Connect Google Sheets on both Sheets nodes.

**Note:** uses a pay-per-address Apify Actor (free tier available). Docs and more templates: github.com/sumitrmardy/email-verifier-api
```

**T3 — Title**
```
Clean a CSV lead list before cold email — split into send / review / drop
```

**T3 — Description**
```markdown
Upload a CSV export (Apollo, Instantly, Lemlist, HubSpot — anything with an email column) and get three cleaned lists back.

- **send_safe** — SMTP confirmed the mailbox exists
- **review** — catch-all domains, role accounts (info@, sales@), free providers, full mailboxes
- **drop** — bad syntax, dead domains, mailboxes that don't exist

**How it works**
1. Finds the email column automatically and deduplicates (case-insensitive) so you're never charged twice for one address.
2. Verifies in batches.
3. Greylisted addresses are not treated as bad: they wait and are re-verified once, then merged back.

**Setup:** an Apify account and a Header Auth credential named `Apify API` (`Authorization: Bearer <token>`).

**Note:** uses a pay-per-address Apify Actor (free tier available). Docs: github.com/sumitrmardy/email-verifier-api
```

---

## 5. Bài B — V2EX, node 分享创造 (ZH)

V2EX dị ứng giọng quảng cáo. Viết như một dev kể lại việc mình vừa làm, nói thật chỗ thu phí. **Không đăng vào node 推广** (đó là chỗ trả phí). Tài khoản mới có thể bị giới hạn đăng bài một thời gian, nên tạo tài khoản sớm.

**标题**
```
做了个给 n8n / AI Agent 用的批量邮箱验证，模板开源了，顺便聊几个 SMTP 的坑
```

**正文**
```markdown
最近在做外贸线索清洗，顺手把「邮箱验证」做成了一个 API，配套的 n8n 模板和 Agent 接入文件开源在 GitHub 上，中英双语。

**开源的部分**
- 4 个 n8n 模板：Google Sheets 线索表批量验证、群发前清洗 CSV（拆成 可发 / 待定 / 删除 三份）、注册表单实时拦截一次性邮箱、AI Agent 工具
- OpenAPI 文件，可以直接在 Dify / 扣子 导入成自定义工具
- MCP 配置、llms.txt

**做的过程中踩的几个坑**

1. **云服务器出站 25 端口基本是封的。** 一开始直接在云上跑 SMTP 握手，连接全部被静默丢弃，结果全是超时。最后自己搭了一个 relay，HELO 用的域名能正常解析，PTR 也和 HELO 对上（正反向解析一致），被拒的情况少了很多。

2. **Gmail / Outlook / Yahoo / iCloud 对不存在的地址也回 250。** 所以任何声称能通过 SMTP 确认某个 Gmail 邮箱存在的工具，其实都是在猜。我这边对这类地址老老实实返回 `risky / free_provider_unverifiable`，不编一个「有效」出来。

3. **catch-all（全收域名）要先探测。** 验证真实地址之前，先发一个随机的、不可能存在的地址；如果也被接受，说明这个域名照单全收，单个邮箱是否存在根本无从判断。

4. **「查不出来」和「不存在」是两回事。** 灰名单（421/450）、DNS 解析失败（SERVFAIL）都只能算 unknown，不能当成坏地址删掉。很多工具把两者混在一起，数据看着漂亮，实际上把真实客户删了。

输出是给程序用的：`status` 永远是四个值之一，11 个 checks 字段每条记录都在，不会出现 null。166 条人工标注的测试集上，sub_status 全部匹配，unknown 占 1.8%。

**说明一下收费：** 模板是 MIT 的，底层调用的是我自己在 Apify 上做的一个按次计费的 Actor（有免费额度）。

GitHub（中文 README）：https://github.com/sumitrmardy/email-verifier-api/blob/main/README.zh-CN.md

欢迎拍砖，尤其是用 n8n 不同版本导入时遇到问题的。
```

---

## 6. Bài C — 掘金 juejin.cn (ZH, bài kỹ thuật)

Bài dài nhất, và là bài sống lâu nhất: bài kỹ thuật trên 掘金 lên được kết quả tìm kiếm. Trọng tâm là **kiến thức**, link sản phẩm để cuối bài. Gợi ý tag: `后端` `Node.js` `n8n` `AI Agent`.

**标题**
```
写了一个邮箱验证 API 之后，我才知道的几个 SMTP 冷知识
```

**正文**
```markdown
最近做了一个批量邮箱验证的服务，给 n8n 工作流和 AI Agent 用。原以为就是查个 MX、连一下 SMTP 的事，实际做下来，坑比代码多。把几个最反直觉的点记下来。

## 1. 验证邮箱，一封邮件都不用发

流程是：语法校验（RFC 5322）→ 查 MX（没有 MX 就退回 A 记录）→ 一次性邮箱 / 角色邮箱 / 免费邮箱服务商名单 → SMTP 握手。

关键在最后一步：连上对方的 MX，依次发 `EHLO`、`MAIL FROM`、`RCPT TO`，读返回码，然后断开。**全程不发 `DATA`**，所以不存在任何邮件正文。`RCPT TO` 返回 250 说明收件地址被接受，550 说明邮箱不存在。

## 2. Gmail 对不存在的地址也说「好」

Gmail、Outlook、Yahoo、iCloud 这类免费邮箱服务商，在 `RCPT TO` 阶段对任何地址都回 250，真正的退信要等投递时才发生。

结论很直接：**通过 SMTP 无法确认某个 Gmail 邮箱是否存在。** 声称能做到的，都是在猜。正确的做法是如实返回「无法确认」，只保留语法、域名、是否一次性邮箱这些确定的结论。

## 3. catch-all：先问一个不存在的人

有些域名配置成「照单全收」，不管地址存不存在都返回 250。如果不先识别出来，你会把一堆死地址标成有效。

做法是在验证真实地址之前，先对一个随机生成、不可能存在的地址发 `RCPT TO`（例如 `zzq-nonexist-<随机串>@domain`）。如果它也被接受，这个域名就是 catch-all，上面的任何单个地址都只能标记为「有风险」。

## 4. 「查不出来」≠「不存在」

这是最容易做错、代价也最大的一点：

- **灰名单**：421 / 450 是对方服务器的反垃圾手段——第一次拒绝、稍后重试就接受。它是「稍后再试」，不是坏地址。
- **DNS**：权威的 NXDOMAIN 才说明域名不存在；解析器返回 SERVFAIL 或超时，只说明这次没查到。
- **5xx 也要看内容**：如果拒绝理由里提到 blocklist、reputation、policy，那是在拒绝**发件方**，和收件邮箱存不存在没有关系，不能据此判定地址无效。
- **反过来的情况**：Microsoft 365 对不存在的收件人常回 `550 5.4.1 ... Access denied`（目录边缘阻止，DBEB）。字面看像是策略拒绝，实际多半是收件人不存在。如果只按「denied」这类关键词归类，就会把一批死地址错标成「未知」。

把「未知」和「不存在」混在一起的工具，报表会好看很多，代价是悄悄删掉了真实客户。

## 5. 云上出站 25 端口基本被封

主流云厂商默认封禁出站 25 端口（防止被拿去发垃圾邮件）。在云函数 / 容器里直接做 SMTP 握手，连接会被静默丢弃，表现为全部超时，而且不会给你任何报错提示。

解决办法是在允许 25 端口的机器上跑一个 relay。另外两个细节对成功率影响很大：

- `HELO` 用的主机名必须能解析，最好就是指向当前出口 IP 的域名；
- 给出口 IP 设置 PTR，并与 HELO 名一致（正反向解析一致，FCrDNS）。不少邮件服务器会据此给连接打分。

## 6. 一个 Node.js 小坑：autoSelectFamily

Node.js 20 起，`net.connect` 默认开启 `autoSelectFamily`（Happy Eyeballs），每个地址的连接尝试超时 `autoSelectFamilyAttemptTimeout` 默认只有 250ms。对同时有 AAAA 和 A 记录、响应又慢的 MX，握手还没建立就被判失败，最终表现成超时——你自己设置的 8 秒超时根本轮不到生效。

连接 25 端口时显式关闭（`autoSelectFamily: false`），或者调大 attempt timeout，就好了。

## 7. 给机器用的 API，不该有 null

最后是输出设计。人看 dashboard 时，字段缺了能自己脑补；代码和 AI Agent 不行，Agent 拿到什么就按什么行动。

所以输出做了两个硬约束：`status` 永远是 `deliverable / undeliverable / risky / unknown` 四个值之一；11 个 `checks` 字段每条记录都在，没执行的检查就是 `false`，原因写在 `sub_status` 里。调用方可以直接写：

```js
const mailable = results.filter(r => r.status === 'deliverable');
const retryLater = results.filter(r => r.status === 'unknown');
```

不需要满屏的可选链和 `?? false`。

在 166 条人工标注的测试数据上，sub_status 全部匹配，unknown 占 1.8%。

---

配套的 n8n 模板（Google Sheets、CSV 清洗、注册拦截、AI Agent 工具）、可直接导入 Dify / 扣子 的 OpenAPI 文件、MCP 配置都开源在这里，中英双语：

https://github.com/sumitrmardy/email-verifier-api/blob/main/README.zh-CN.md

说明：模板是 MIT 协议；底层调用的是我在 Apify 上维护的一个按次计费的 Actor，有免费额度。
```

---

## 7. Trả lời bình luận — mẫu sẵn

**"Can it verify Gmail?" / "能验证 Gmail 吗？"**
> Syntax, domain and disposable checks, yes. Whether a specific Gmail mailbox exists, no — Google answers `250` for real and fake addresses alike, so nothing SMTP-based can know. It comes back as `risky / free_provider_unverifiable` instead of a guess.
>
> 语法、域名、是否一次性邮箱可以确认；某个具体 Gmail 邮箱是否存在，SMTP 层面无法确认——Google 对真假地址都回 250。这类地址会如实返回 `risky / free_provider_unverifiable`，不会瞎猜。

**"Why not ZeroBounce / NeverBounce?"**
> If you're already happy with them, no reason to switch. This one is aimed at pipelines: pay per address with no subscription, a fixed output shape for code and agents, and it reports catch-all and free providers as "can't confirm" instead of "valid".

**"How much?" / "多少钱？"**
> Pay per verified address, tiered by Apify plan, with a free tier. Current pricing is on the Actor's Pricing tab (linked from the README) — I keep it there rather than in posts so it never goes stale.
>
> 按验证地址计费，按 Apify 套餐分层，有免费额度。具体价格看 README 里链接的 Pricing 页，那里永远是最新的。

**"Is this spam / is it allowed?" / "这算不算骚扰？"**
> No email is ever sent — it reads SMTP reply codes and disconnects before `DATA`. The point is the opposite of spam: cleaning a list so you don't mail dead addresses and burn your sender reputation.

**"Can I self-host?"**
> The templates, yes. The verification itself needs outbound port 25 plus an IP with matching PTR/HELO, which is the hard part on most clouds. That's what the hosted Actor handles.

---

## 8. Những việc không làm

- Không đăng cùng một nội dung lên nhiều nền tảng. Mỗi bài trên đã được viết riêng. V2EX coi giới thiệu dự án lặp lại là spam.
- Không xin star, không dùng tài khoản phụ để upvote.
- Không link thẳng tới Apify trong tiêu đề. Link về GitHub, để chuỗi đo còn nguyên.
- Không đăng Reddit từ tài khoản mới. Phần lớn subreddit kỹ thuật xóa link tự quảng bá từ tài khoản chưa có lịch sử đóng góp. Để sau, khi đã có tài khoản hoạt động thật.
- Không hứa con số chính xác về độ chính xác ngoài kết quả đã đo (166 dòng, 100% sub_status, 1.8% unknown).

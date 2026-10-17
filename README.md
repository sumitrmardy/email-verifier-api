English | [简体中文](README.zh-CN.md)

# Bulk Email Verification API — for n8n, AI Agents & MCP

Verify email addresses in bulk: RFC 5322 syntax → DNS/MX → disposable, role and free-provider lists → a live SMTP handshake with a mandatory catch-all probe. **No email is ever sent** — the check opens an SMTP session, reads the reply codes and hangs up.

[![n8n templates](https://img.shields.io/badge/n8n-4%20templates-EA4B71)](workflows/en)
[![MCP ready](https://img.shields.io/badge/MCP-ready-7C3AED)](agents/mcp)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539)](openapi/email-verifier.openapi.yaml)
[![Pricing](https://img.shields.io/badge/pricing-pay%20per%20verified%20address-0A66C2)](https://apify.com/sumitr_mardy/email-verifier/pricing)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

### ➜ [Try it on Apify](https://apify.com/sumitr_mardy/email-verifier)

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

## Why pipelines like it

Most verifiers are written for a human reading a dashboard. This one assumes the caller is code.

That changes what the output has to guarantee:

**1. `status` is always one of four values.** `deliverable`, `undeliverable`, `risky`, `unknown`. Never null, never empty, never a fifth value. Enumerate them once and stay correct.

**2. All eleven `checks` keys are present on every record.** A check that never ran is `false`, and the reason lives in `sub_status`. Nothing disappears.

**3. Catch-all domains and Gmail-type providers are reported honestly.** They come back `risky` with a reason, not a fabricated "valid".

Those three together mean you write this:

```js
const mailable = results.filter(r => r.status === 'deliverable');
const neverSend = results.filter(r => r.status === 'undeliverable' || r.checks.disposable);
const retryLater = results.filter(r => r.status === 'unknown');
```

and not this:

```js
const mailable = results.filter(r => r?.status === 'valid' && (r.checks?.catch_all ?? false) === false);
```

The second line is what every nullable-by-default API forces on you. It matters more for an agent than for a person: **an agent cannot write `?? false`** — it acts on what it reads. A field that sometimes vanishes is not an inconvenience, it is a wrong answer delivered with confidence.

---

## What to do with each result

| `status` | `sub_status` | What to do |
|---|---|---|
| `deliverable` | `valid_mailbox` | Send |
| `risky` | `role_based` | Send only if a shared inbox is acceptable |
| `risky` | `catch_all` | Mailbox unconfirmable — send at low volume, or enrich another way |
| `risky` | `free_provider_unverifiable` | Treat as a consumer address; mailbox unknowable over SMTP |
| `risky` | `full_mailbox` | Hold, retry in a few days |
| `risky` | `disposable` | Do not send; block at signup |
| `unknown` | `greylisted` | **Retry in 30–60 min — not a bad address** |
| `unknown` | `smtp_timeout` | Retry later; if it persists, treat as unverified |
| `unknown` | `internal_error` | Retry once |
| `undeliverable` | any | Remove from the list |

Full table with scores and reasoning: **[docs/statuses.md](docs/statuses.md)**

The distinction that matters: `undeliverable` means *we found out it is dead*; `unknown` means *we could not find out*. Tools that merge the two report better-looking numbers and quietly delete real customers from your list.

---

## Use it in n8n

Every template calls the Actor with the core **HTTP Request** node — no community node to install, works on n8n Cloud and self-hosted. Authentication is an n8n **Header Auth** credential named `Apify API`; no token is stored in any file here.

| Template | What it does | Import |
|---|---|---|
| **Verify a Google Sheets lead list** | Reads rows with no verdict, verifies in batches, writes `status`/`score` back. Safe to re-run and to schedule. | [`t1-google-sheets.json`](workflows/en/t1-google-sheets.json) |
| **Block disposable emails at signup** | Webhook in, `{allow\|review\|block}` out, with the policy in one editable Code node. | [`t2-signup-check.json`](workflows/en/t2-signup-check.json) |
| **Clean a CSV before cold email** | Upload an Apollo/Instantly/HubSpot export, get back `send_safe` / `review` / `drop` as three CSVs. Greylisted rows are retried once. | [`t3-clean-csv.json`](workflows/en/t3-clean-csv.json) |
| **AI agent tool** | An AI Agent with the verifier as its only tool, and a system prompt that teaches it the action table above. | [`t4-ai-agent-tool.json`](workflows/en/t4-ai-agent-tool.json) |

Chinese versions of all four, with localized sticky notes: [`workflows/zh-CN/`](workflows/zh-CN)

**To import:** download the JSON, then in n8n use *Workflows → Import from File*. Setup steps are on a sticky note inside each workflow.

---

## Use it from an AI agent

**MCP** — the Apify MCP server, scoped to this one Actor. Config for Claude Desktop and Cursor: [`agents/mcp/`](agents/mcp)

**OpenAPI** — one file that Dify, Coze, GPT Actions and LangChain's OpenAPI toolkit can all import: [`openapi/email-verifier.openapi.yaml`](openapi/email-verifier.openapi.yaml)

**Tool definitions** — ready-made JSON for OpenAI function calling and the Anthropic tool API: [`agents/tool-definitions/`](agents/tool-definitions)

**For the agent itself** — [`llms.txt`](llms.txt) is the whole contract in one pass: endpoint, input, output, the action table, batching limits.

Chinese-first setup guides: [Dify](agents/dify/README.zh-CN.md) · [Coze / 扣子](agents/coze/README.zh-CN.md)

---

## Use it from code

```bash
curl -X POST "https://api.apify.com/v2/acts/sumitr_mardy~email-verifier/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emails":["john@example.com","someone@gmail.com"]}'
```

Python and Node examples, each under 25 lines and with no SDK required: [`examples/`](examples)

---

## Large lists

Addresses go in one batch per call, never one call per address — batching is what makes this cheap and fast.

A synchronous Apify run must finish inside **300 seconds**. Past that, use the async pattern: start the run, wait for it, then fetch the dataset. Working example: [`examples/batch-large-list/`](examples/batch-large-list)

Measured throughput and the batch size to use: [`docs/pricing-and-batching.md`](docs/pricing-and-batching.md)

---

## Pricing

Pay per event: **one charge per address that gets a verdict** — including `undeliverable` and `unknown`, because the work was done either way, and a confirmed bad address is exactly the result you were paying for. No per-run charge.

The rate is tiered by your Apify plan and is adjusted to track the market, so it is not reprinted here where it would go stale: **[see current pricing](https://apify.com/sumitr_mardy/email-verifier/pricing)**.

You need an Apify account to call the API; there is a free tier.

---

## Known limits

Stated plainly, because you would find them anyway.

- **Free providers cannot be mailbox-verified.** Gmail, Outlook, Yahoo and iCloud answer `250` for addresses that do not exist, then bounce at delivery. Any vendor claiming a per-mailbox Gmail verdict from SMTP is guessing. You get `risky/free_provider_unverifiable` and `checks.mailbox_exists: false`.
- **Catch-all domains cannot be mailbox-verified.** By definition. The probe detects them and says so rather than returning a confident guess.
- **Greylisting is not a verdict.** `421`/`450` come back as `unknown/greylisted`, which is retryable. Template T3 does the retry for you.

---

## FAQ

**Does it send an email?**
No. It opens an SMTP session, sends `EHLO`, `MAIL FROM` and `RCPT TO`, reads the reply codes and disconnects. It never issues `DATA`, so no message body exists anywhere in the process.

**Can it verify Gmail addresses?**
It verifies that the syntax and domain are valid and that the address is not disposable. It cannot confirm that a specific Gmail mailbox exists — Google answers identically for real and fake addresses. Nothing that uses SMTP can do better; tools that claim otherwise are guessing.

**What is a catch-all domain?**
A domain configured to accept mail for every address, existing or not. Before asking about your address, the verifier sends a `RCPT TO` for a random local part that cannot exist. If that is accepted, the domain is catch-all and every address on it is reported `risky/catch_all`.

**How many emails per call?**
As many as finish inside the 300-second sync limit. Measure with your own list; see [docs/pricing-and-batching.md](docs/pricing-and-batching.md). Beyond that, use the async pattern.

**How do I use it with an Apollo / Instantly / Lemlist export?**
Template T3 — upload the CSV, get three cleaned lists back. It picks the email column automatically and deduplicates first, so you are not charged twice for the same address.

**What happens to duplicates?**
They are charged. Deduplicate before you call; every template here already does.

---

MIT licensed. Issues and pull requests welcome — particularly corrections to the n8n templates from anyone running a version where something behaves differently.

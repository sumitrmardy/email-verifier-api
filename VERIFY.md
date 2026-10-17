# What is verified, and what is not

This repo was built with no web access. Everything below is split by how it was
established, because the difference matters: a wrong n8n parameter name costs
someone ten minutes, and a wrong claim in the README costs the trust the Actor
is sold on.

Nothing here is a reason not to publish. It is the list to walk before you do.

---

## Verified — checked against something, not recalled

| What | How |
|---|---|
| Input field names, types, ranges, defaults | Read directly from the Actor's own `.actor/input_schema.json` |
| Output contract: field names, enums, which fields are optional | Read from the Actor's `src/types.ts`, the file that defines it |
| `output.schema.json` is correct | Four real recorded responses validate against it under `additionalProperties: false` with closed enums — `npm run validate` |
| Status → score mapping | Read from `SCORES` in the Actor's `src/verify.ts` |
| Status → action advice | Written from the Actor's own measured behaviour and its CLAUDE.md |
| Workflows are structurally valid, uniquely named, fully connected, placeholder-free | `npm run build` parses every built file; `npm run validate` walks nodes and connections |
| No secrets committed | `npm run validate` scans every text file |
| Links and the price exist in exactly one place | `npm run validate` fails on a hardcoded Actor URL or price outside `config/links.json` |

---

## Not verified — confirm before publishing

### 1. n8n node types and `typeVersion` — highest risk

The four templates were written from knowledge of n8n's workflow format, and
**no n8n instance was available to import them into.** Node parameter names and
`typeVersion` numbers change between releases. A wrong one usually shows up as a
node that imports but has empty settings.

Risk is not even across the four:

| Template | Nodes used | Confidence |
|---|---|---|
| T2 signup check | Webhook, HTTP Request, Code, Respond to Webhook | Highest — these barely change |
| T1 Google Sheets | adds Google Sheets (read + update) | Medium — the resource-locator and column-mapping shapes move |
| T3 clean CSV | adds Form Trigger, Extract from File, Wait, Merge | Medium |
| T4 AI agent | LangChain Agent, Chat Trigger, Chat model, HTTP Request Tool | **Lowest** — the `@n8n/n8n-nodes-langchain.*` nodes change fastest, and `toolHttpRequest`'s placeholder syntax in particular |

**Do:** run n8n locally, import all eight files (`en` and `zh-CN`), open every
node, and run each end to end against the fixture list. That is gate §10.4 and
it is the only thing that settles this.

**One specific case to test in T3:** the greylist retry branch when *no* rows
are greylisted. The Merge node has to complete with one empty input. It should,
but an empty branch stalling a merge is a classic n8n surprise and it would hang
the common case.

### 2. Apify MCP server URL and client config format

`https://mcp.apify.com?tools=sumitr_mardy/email-verifier`, the Claude Desktop
and Cursor config shapes, and whether `apify mcp install <client>` still exists.
All from knowledge. `agents/mcp/README.md` says so in the file itself.

### 3. The sync endpoint's 300-second limit

The path `POST /v2/acts/<actor>/run-sync-get-dataset-items` and the 300s ceiling
are long-standing and the spec states them too, but neither was fetched from the
docs here. `npm run smoke` proves the endpoint works and measures real
throughput; the 300s number should be confirmed in Apify's API reference.

### 4. Throughput and the safe batch size

`docs/pricing-and-batching.md` carries a measurement taken on the Actor's own
labelled set, not on a customer-shaped list. Throughput depends almost entirely
on the number of distinct domains, because DNS and catch-all results are cached
per domain — a 1,000-address list across 900 domains is far slower than one
across 50. Re-measure with a representative list and update the doc.

### 5. OpenAPI 3.1 linting

`openapi/email-verifier.openapi.yaml` was written to spec but no linter was
available. Run one (`npx @redocly/cli lint`) before importing it into Dify or
Coze — those importers are less forgiving than a browser.

---

## Observations that are not this repo's to fix

Noted because they were found while building, and the spec forbids touching the
Actor.

**The published input schema exposes `heloName`, `mailFrom`, `relayUrl` and
`relayToken`.** The templates and docs here deliberately never mention them, as
the spec requires. But a customer browsing the Actor's input form on Apify can
see all four. Two consequences worth a decision later:

- `heloName` / `mailFrom` now default to a domain with clean SPF, DKIM and
  DMARC, and the published accuracy numbers were measured with those defaults.
  A customer who overrides them with a domain they do not control gets *worse*
  results than advertised, and no warning.
- `relayUrl` / `relayToken` describe owner-side infrastructure. Harmless to
  leave, but it invites the question "do I need a relay?", whose answer is no.

Hiding them behind an `editor: hidden` field or removing them from the public
schema is a one-line change in the Actor — for a later session, not this repo.

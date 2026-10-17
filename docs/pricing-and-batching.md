[English](pricing-and-batching.md) | [简体中文](pricing-and-batching.zh-CN.md)

# Pricing and batching

## What you are charged for

One event per address that receives a verdict — including `undeliverable` and
`unknown`. The work was done either way, and a confirmed bad address is exactly
the result you were paying to get.

There is no per-run charge, so a run that verifies one address costs one
address.

The rate is tiered by your Apify plan and is adjusted over time, so it is not
reprinted here where it would quietly go stale:
**[current pricing](https://apify.com/sumitr_mardy/email-verifier/pricing)**.

### Two things that cost money and should not

**Duplicates are charged.** Deduplicate before you call. Every template in this
repo already does — case-insensitively, since `John@x.com` and `john@x.com` are
the same mailbox.

**Re-verifying unchanged rows is charged.** Template T1 only reads rows whose
`status` column is empty, so a scheduled run picks up new leads instead of
re-billing the whole sheet.

A verdict is worth caching. `score` is a pure function of the verdict, so a
stored result stays meaningful. Addresses do go stale — people leave companies —
so re-verify on a schedule that suits your list rather than on every send.

## Batching

**One call, many addresses.** Never one call per address: it is slower and costs
exactly the same per address.

A synchronous run must finish within **300 seconds**. Past that the connection
is cut — and the run keeps going on Apify's side and is still charged. So the
batch size is not a performance tweak, it is the line between getting your
results and paying for results you never see.

### What actually decides throughput

Not the number of addresses. The number of **distinct domains**.

DNS lookups and catch-all probes are cached per domain for 24 hours, and
addresses are grouped by domain so one SMTP session serves many `RCPT TO`
commands. So:

- 1,000 addresses across 50 domains — fast. Most of the work is 50 probes.
- 1,000 addresses across 900 domains — far slower. Nearly every address needs
  its own DNS resolution and its own SMTP session.

A B2B list exported from a CRM sits near the first case. A consumer signup list
sits near the second. **Measure with a list shaped like yours**; a number
measured on someone else's list tells you very little.

### Measuring your own

`npm run smoke` times the fixture list and prints the batch size that would fit
inside half the limit. Or with your own list:

```bash
APIFY_TOKEN=... node examples/node/verify.mjs $(head -50 your-list.txt | tr '\n' ' ')
```

Take milliseconds per address, and aim for a batch that finishes in **150
seconds** — half the limit, which leaves room for a slow domain without losing
the whole batch.

```
batch size ≈ 150,000 / (ms per address)
```

**Start at 100.** It is comfortable for most lists and the templates here use
it. Raise it once you have measured, not before.

### Reference point

On the Actor's own 166-address labelled set, through the relay: roughly 40
seconds total, about 240 ms per address, across 69 distinct domains. That ratio
of addresses to domains (2.4:1) is unusually domain-heavy — a real customer list
will almost always do better.

### Beyond one batch

For lists too large for any single sync call, do not raise the batch size until
it breaks. Start an asynchronous run, wait for it, then fetch the dataset.
Working example: [`examples/batch-large-list/`](../examples/batch-large-list)

The async path has no 300-second ceiling and the run survives your connection
dropping.

## Concurrency

`concurrency` (1–50, default 15) is parallel SMTP sessions, and since addresses
are grouped by domain it is really "domains in flight".

Raising it helps a list with many distinct domains and does nothing for a list
concentrated on a few — you cannot parallelise past the number of domains you
have. Very high values also make mail servers throttle you, which turns into
`unknown/greylisted` and costs a second verification.

15 is a reasonable default. 25–30 is fine for a domain-heavy list. Above that,
measure rather than assume.

# Launch log

Written so that a month from now the Apify Acquisition view can be read against
what was actually done. Right now the referrer breakdown is 79% blank, 9%
apify.com, 7% console, 5% google, 1% github — which is the shape of a product
nobody has told anyone about. The point of every line below is to put something
in a row that is currently empty.

Fill in the date and the URL as each one happens. A submission you cannot
attribute later is a submission you cannot learn from.

---

## Before anything is posted

- [x] Walk [VERIFY.md](VERIFY.md). The n8n templates have been imported into
      a running n8n (v1.79.3) and verified.
- [ ] `APIFY_TOKEN=... npm run smoke -- --record`, then review the diff and
      commit the recorded responses.
- [x] `npm run check` passes.
- [x] Repo made public; description and topics set.
- [x] `assets/social-preview.png` (1280×640) created and committed.
- [x] Tag `v1.0.0`.

## Affiliate

- [ ] Register for the Apify Affiliate Program.
- [ ] Put the exact parameter the dashboard gives into `config/links.json` →
      `affiliateParam`, then `npm run build` and commit.

Shipping without it is deliberate — the owner had not registered when the repo
was built, and a guessed parameter format is worse than none. Every link already
goes through that one constant, so this is a one-line change followed by a
rebuild. **Do it before posting anywhere**, or the traffic that arrives first is
the traffic that is never attributed.

| | |
|---|---|
| Registered | |
| Parameter added and rebuilt | |

## n8n.io templates

T1 and T3 first: cleaning a list and cleaning a CSV are what people search for.
T2 and T4 after, once the first two have been through review.

Read the current template submission guidelines before submitting — they change,
and a rejection costs a review cycle.

| Template | Submitted | URL | Status |
|---|---|---|---|
| T1 Google Sheets | | | |
| T3 Clean CSV | | | |
| T2 Signup check | | | |
| T4 AI agent tool | | | |

## Posts

Drafts, not posts. Reddit removes promotion fast and a new account posting a
link is removed on sight — most technical subreddits want roughly nine
contributions for every one mention of your own work.

The material that earns a post is the findings, not the product: the port-25
discovery, Node 22's `autoSelectFamily` silently capping connect timeouts at
250 ms, Microsoft 365 answering `550 5.4.1 Access denied` for a mailbox that
does not exist. Those are genuinely useful to other people and the repo link
belongs at the bottom, not in the title.

| Where | Angle | Drafted | Posted | URL |
|---|---|---|---|---|
| n8n community forum | one post per template, in the "show your workflow" style | | | |
| r/n8n | T1 and T3 as workflows, not as a product | | | |
| dev.to | the `autoSelectFamily` finding — widest audience, zero promotional smell | | | |
| dev.to | M365 `Access denied` — narrower, but exactly the buyer | | | |
| 掘金 / V2EX / 知乎 | Chinese post linking README.zh-CN.md | | | |
| Hacker News | only with a full write-up of the port-25 story | | | |

Chinese-language channels are worth real effort rather than an afterthought:
China, Singapore and Hong Kong were 37% of viewers in September, which is why
the repo is bilingual at all.

## Thirty days later

Open Apify → Insights → Acquisition and read the referrer rows:

- `github.com` — did the repo bring anyone?
- `n8n.io` — did the templates?
- `google.com` — did any of it rank?

And the number that actually matters: **runs per user**. A pipeline user calls
the Actor repeatedly; someone who clicked once from a dashboard does not. This
whole repo is aimed at the first kind, and that ratio is how you find out
whether it worked.

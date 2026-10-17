# Every status, and what to do about it

There are four `status` values and twelve `sub_status` values. Both are always
present on every record. That is the whole table — nothing else can come back.

The useful column is the last one. A verdict you do not know how to act on is
just trivia.

| `status` | `sub_status` | What it means | What to do |
|---|---|---|---|
| `deliverable` | `valid_mailbox` | SMTP confirmed this mailbox exists, and the domain is not catch-all | **Send.** |
| `risky` | `role_based` | A shared inbox — `info@`, `support@`, `admin@` — that was confirmed to exist | Send only if a shared inbox suits you. Fine for support, poor for personal outreach. |
| `risky` | `catch_all` | The domain accepts every address, so this particular mailbox could not be confirmed | Send at low volume and watch bounces, or confirm the person another way. Not a bad address — an unprovable one. |
| `risky` | `free_provider_unverifiable` | Gmail, Outlook, Yahoo, iCloud and similar answer identically for every address | Treat as a consumer address. Syntax and domain are fine; the mailbox is unknowable over SMTP. |
| `risky` | `full_mailbox` | A real mailbox that is over quota right now | Hold and retry in a few days. The person exists. |
| `risky` | `disposable` | A throwaway/temp-mail domain | Do not send. Block it at signup — that is where it costs you least. |
| `unknown` | `greylisted` | The server asked us to come back later (`421`/`450`) | **Retry in 30–60 minutes.** This is not a bad address; greylisting is an anti-spam technique that expects a second attempt. |
| `unknown` | `smtp_timeout` | The mail host never answered, or refused the session on policy grounds | Retry later. If it persists, treat as unverified — not as invalid. |
| `unknown` | `internal_error` | Something failed while processing this address; `error` explains | Retry once. Report it if it repeats. |
| `undeliverable` | `invalid_syntax` | Fails RFC 5322 | Remove. |
| `undeliverable` | `no_mx_record` | The domain publishes no mail route at all | Remove. |
| `undeliverable` | `mailbox_not_found` | The server said there is no such user | Remove. |

## The distinction the whole product rests on

`undeliverable` means *we found out it is dead.*
`unknown` means *we could not find out.*

Most verifiers collapse these. It makes their numbers look better: a
"95% accuracy, only 1% unknown" result is easier to sell than an honest one.
But an address wrongly marked undeliverable is a customer you will never
contact again, and you will never learn that it happened.

So when the SMTP layer cannot get an answer — the host is unreachable, the
session is refused because of *our* IP rather than *their* mailbox, the DNS
resolver fails rather than answering — this returns `unknown`. Three rows in
the table above exist for that reason alone.

The same rule runs in the other direction. A `550` that names the recipient
(`no such user`, `recipient address rejected`) is a real bounce even when the
message also contains words like "access denied" — Microsoft 365 phrases it
exactly that way. Treating that as a policy block would have thrown away a true
`undeliverable` on the largest business mail platform there is.

## Two things that cannot be verified, by anyone

**Free providers.** Gmail, Outlook, Yahoo and iCloud return the same `250` for
an address that exists and one that does not, then bounce at delivery time. Any
tool claiming a per-mailbox Gmail verdict from SMTP is guessing. You get
`risky/free_provider_unverifiable` and `checks.mailbox_exists: false`.

**Catch-all domains.** A domain configured to accept every address cannot tell
you anything about one address. Before asking about yours, the Actor sends a
`RCPT TO` for a random local part that cannot exist. If the server accepts it,
every address on that domain is reported `risky/catch_all` and yours is never
even probed — the answer would have meant nothing.

Both are limits of SMTP, not of this implementation. They are reported rather
than hidden.

## Scoring

`score` is a pure function of the verdict — a lookup table, no model, no
randomness. The same verdict scores the same today and in a year, which is what
makes a result safe to cache and a test safe to write.

| score | verdict |
|---|---|
| 100 | `deliverable/valid_mailbox` (90 when the domain has no real MX, only an A record) |
| 60 | `risky/role_based` |
| 55 | `risky/free_provider_unverifiable` |
| 50 | `risky/catch_all` |
| 45 | `risky/full_mailbox` |
| 40 | `unknown/greylisted` |
| 30 | `unknown/smtp_timeout` |
| 20 | `risky/disposable` |
| 5 | `undeliverable/mailbox_not_found` |
| 0 | `undeliverable/invalid_syntax`, `undeliverable/no_mx_record`, `unknown/internal_error` |

Use `status` for decisions and `score` for sorting. A single threshold on
`score` will eventually put `greylisted` (40) and `disposable` (20) on the same
side of a line, and those need opposite handling.

# Lists too big for one sync call

A synchronous Apify run must finish inside 300 seconds. Past that the connection
is cut — and the run keeps going on Apify's side and is still charged. So the
answer to a large list is not a bigger batch, it is a different call pattern.

```bash
APIFY_TOKEN=... node verify-large-list.mjs emails.txt results.json
```

Three steps:

1. `POST /v2/acts/<actor>/runs` starts the run and returns immediately.
2. `GET /v2/actor-runs/<id>?waitForFinish=60` long-polls. The call blocks
   server-side, so looping it is not a busy wait.
3. `GET /v2/datasets/<id>/items` pages through the records.

No 300-second ceiling, and the run survives your connection dropping.

The input file is one address per line; blank lines and `#` comments are
ignored, and addresses are deduplicated before anything is sent — every
duplicate is a charged event.

The script warns when the number of records it collected does not match the
number submitted. A partial list quietly treated as complete is how addresses go
missing without anyone noticing.

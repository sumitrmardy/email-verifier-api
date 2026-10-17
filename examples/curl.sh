#!/usr/bin/env bash
# Smallest possible call.
#
#   APIFY_TOKEN=... ./curl.sh
#
# Token: https://console.apify.com/settings/integrations

set -euo pipefail

: "${APIFY_TOKEN:?Set APIFY_TOKEN first}"

ACTOR="sumitr_mardy~email-verifier"
ENDPOINT="https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items"

# One call, all the addresses. Not one call per address — batching is what
# makes this fast, and duplicates are charged, so deduplicate before you send.
curl -sS -X POST "$ENDPOINT" \
  -H "Authorization: Bearer ${APIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  --max-time 310 \
  -d '{
        "emails": [
          "john@example.com",
          "someone@gmail.com",
          "test@mailinator.com"
        ]
      }'

# Returns a JSON array, one object per address, in a different order than you
# sent them — results are grouped by domain so SMTP connections can be reused.
# Match on the "email" field, never on array position.
#
# Pipe through jq to see just the verdicts:
#
#   ./curl.sh | jq -r '.[] | "\(.email)\t\(.status)/\(.sub_status)\t\(.score)"'
#
# Or keep only what is safe to send:
#
#   ./curl.sh | jq '[.[] | select(.status == "deliverable")]'

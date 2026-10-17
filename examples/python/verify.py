"""
Verify a list of addresses. Only `requests` — no SDK needed.

    pip install requests
    APIFY_TOKEN=... python verify.py john@example.com someone@gmail.com

Get a token at https://console.apify.com/settings/integrations
"""

import os
import sys

import requests

ENDPOINT = "https://api.apify.com/v2/acts/sumitr_mardy~email-verifier/run-sync-get-dataset-items"

# A sync run has 300 seconds. Stay well inside it; measure before raising.
BATCH_SIZE = 100

TOKEN = os.environ.get("APIFY_TOKEN")


def verify(emails):
    """Return one record per address. Order is not preserved — match on `email`."""
    results = []

    for start in range(0, len(emails), BATCH_SIZE):
        batch = emails[start : start + BATCH_SIZE]
        response = requests.post(
            ENDPOINT,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json",
            },
            json={"emails": batch},
            # The server's own limit is 300s; allow a little more so a slow run
            # surfaces as the server's error rather than ours.
            timeout=310,
        )
        response.raise_for_status()
        results.extend(response.json())

    return results


def main():
    if not TOKEN:
        sys.exit("Set APIFY_TOKEN first.")

    argv = [a.strip() for a in sys.argv[1:] if a.strip()]
    if not argv:
        sys.exit("Pass one or more addresses as arguments.")

    # Duplicates are charged, so collapse them before spending anything.
    unique = list(dict.fromkeys(argv))
    records = verify(unique)

    for r in records:
        print(f"{r['email']:<36} {r['status']}/{r['sub_status']}  score={r['score']}")

    # Every field is guaranteed present, so none of these need a .get() guard.
    mailable = [r for r in records if r["status"] == "deliverable"]
    remove = [r for r in records if r["status"] == "undeliverable" or r["checks"]["disposable"]]
    retry = [r for r in records if r["status"] == "unknown"]

    print(f"\n{len(mailable)} mailable · {len(remove)} remove · {len(retry)} retry later")

    # `unknown` is not `undeliverable`. Dropping these loses real recipients —
    # greylisting in particular is a server asking to be retried.
    if retry:
        print("Retry in 30-60 minutes:", ", ".join(r["email"] for r in retry))


if __name__ == "__main__":
    main()

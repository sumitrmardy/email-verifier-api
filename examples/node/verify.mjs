/**
 * Verify a list of addresses. No SDK, no dependencies — fetch is built in.
 *
 *   APIFY_TOKEN=... node verify.mjs john@example.com someone@gmail.com
 *
 * Get a token at https://console.apify.com/settings/integrations
 */

const TOKEN = process.env.APIFY_TOKEN;
const ENDPOINT =
    'https://api.apify.com/v2/acts/sumitr_mardy~email-verifier/run-sync-get-dataset-items';

/** A sync run has 300 seconds. Stay well inside it; measure before raising. */
const BATCH_SIZE = 100;

if (!TOKEN) {
    console.error('Set APIFY_TOKEN first.');
    process.exit(1);
}

export async function verify(emails) {
    const results = [];

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${TOKEN}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ emails: batch }),
            // The server's own limit is 300s; give the socket a little more
            // so a slow run surfaces as the server's error, not ours.
            signal: AbortSignal.timeout(310_000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
        }
        results.push(...(await res.json()));
    }

    return results;
}

const input = process.argv.slice(2);
if (input.length === 0) {
    console.error('Pass one or more addresses as arguments.');
    process.exit(1);
}

// Duplicates are charged, so collapse them before spending anything.
const unique = [...new Set(input.map((e) => e.trim()).filter(Boolean))];
const records = await verify(unique);

for (const r of records) {
    console.log(`${r.email.padEnd(36)} ${r.status}/${r.sub_status}  score=${r.score}`);
}

// Every field is guaranteed present, so none of these need a guard.
const mailable = records.filter((r) => r.status === 'deliverable');
const neverSend = records.filter((r) => r.status === 'undeliverable' || r.checks.disposable);
const retryLater = records.filter((r) => r.status === 'unknown');

console.log(`\n${mailable.length} mailable · ${neverSend.length} remove · ${retryLater.length} retry later`);

// `unknown` is not `undeliverable`. Dropping these loses real recipients —
// greylisting in particular is a server asking to be retried, not a rejection.
if (retryLater.length > 0) {
    console.log('Retry in 30-60 minutes:', retryLater.map((r) => r.email).join(', '));
}

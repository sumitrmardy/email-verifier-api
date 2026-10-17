/**
 * The one script here that spends money.
 *
 *   APIFY_TOKEN=... npm run smoke
 *   APIFY_TOKEN=... npm run smoke -- --record
 *
 * Runs test/fixtures/emails.txt against the live Actor and checks that what
 * comes back still matches the published schema. `--record` writes each
 * response into test/fixtures/expected/, which is what `npm run validate`
 * checks against afterwards without needing the network.
 *
 * Those recorded files are the evidence behind the repo's central claim. A
 * schema that only matches a response somebody imagined is marketing; one that
 * matches responses the Actor actually produced is a contract. So they are
 * committed, and they are regenerated rather than edited.
 *
 * Deliberately never run in CI. A check that charges money on every push is a
 * check people turn off.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RECORD = process.argv.includes('--record');
const TOKEN = process.env.APIFY_TOKEN;

const links = JSON.parse(readFileSync(join(ROOT, 'config/links.json'), 'utf8'));
const ENDPOINT = `https://api.apify.com/v2/acts/${links.actorId}/run-sync-get-dataset-items`;

if (!TOKEN) {
    console.error('Set APIFY_TOKEN. Get one at https://console.apify.com/settings/integrations');
    process.exit(1);
}

const emails = readFileSync(join(ROOT, 'test/fixtures/emails.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

if (emails.length === 0) {
    console.error('test/fixtures/emails.txt has no addresses');
    process.exit(1);
}
if (emails.length > 25) {
    // The fixture list is meant to stay cheap enough to run on a whim.
    console.error(`${emails.length} addresses — the fixture list is meant to stay under 25.`);
    process.exit(1);
}

console.log(`verifying ${emails.length} address(es) against the live Actor…`);

const startedAt = Date.now();
const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ emails }),
    signal: AbortSignal.timeout(310_000),
});

if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 400)}`);
    process.exit(1);
}

const records = await res.json();
const elapsed = (Date.now() - startedAt) / 1000;

// --- does the live response still match what we publish? --------------------

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(join(ROOT, 'schema/output.schema.json'), 'utf8')));

let bad = 0;
const seen = new Set();

for (const record of records) {
    seen.add(`${record.status}/${record.sub_status}`);
    if (!validate(record)) {
        bad++;
        console.error(`  MISMATCH ${record.email}: ${ajv.errorsText(validate.errors)}`);
    }
}

console.log(`\n${records.length} record(s) in ${elapsed.toFixed(1)}s  (${((elapsed * 1000) / records.length).toFixed(0)} ms/address)`);
for (const verdict of [...seen].sort()) {
    console.log(`  ${verdict.padEnd(40)} ${records.filter((r) => `${r.status}/${r.sub_status}` === verdict).length}`);
}

// Submitting N and getting back fewer than N would break the join every
// template here relies on, so it is a failure rather than a note.
if (records.length !== emails.length) {
    console.error(`\nFAIL: submitted ${emails.length}, received ${records.length}`);
    bad++;
}

// --- throughput, for docs/pricing-and-batching.md ---------------------------

const perAddress = (elapsed * 1000) / records.length;
const safeBatch = Math.max(10, Math.floor((150 * 1000) / perAddress / 10) * 10);
console.log(
    `\nAt this rate a batch finishing inside 150s (half the 300s sync limit)\n` +
        `is roughly ${safeBatch} addresses. Measure again with a list that looks\n` +
        `like your own — a list of many distinct domains behaves very differently\n` +
        `from one concentrated on a few, because results are cached per domain.`,
);

// --- record ----------------------------------------------------------------

if (RECORD) {
    const dir = join(ROOT, 'test/fixtures/expected');
    mkdirSync(dir, { recursive: true });
    for (const record of records) {
        const name = `${record.email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.json`;
        writeFileSync(join(dir, name), `${JSON.stringify(record, null, 4)}\n`, 'utf8');
    }
    console.log(`\nrecorded ${records.length} response(s) into test/fixtures/expected/`);
    console.log('Review the diff before committing — a changed verdict is either a');
    console.log('real change in the Actor or a third-party domain that reconfigured.');
}

if (bad > 0) {
    console.error(`\nsmoke: FAIL (${bad} problem(s))`);
    process.exit(1);
}
console.log('\nsmoke: PASS');

/**
 * Lists too big for a synchronous call.
 *
 *   APIFY_TOKEN=... node verify-large-list.mjs emails.txt results.json
 *
 * A sync run must finish inside 300 seconds. Past that the connection is cut
 * and you lose the work — but the run itself keeps going and you are still
 * charged for it. So beyond one batch, do not retry the sync endpoint harder:
 * start the run, wait for it, then collect the dataset.
 *
 *   1. POST /acts/<actor>/runs            -> run id, returns immediately
 *   2. GET  /actor-runs/<id>?waitForFinish -> long-poll until it is done
 *   3. GET  /datasets/<id>/items          -> the records, paginated
 */

import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.APIFY_TOKEN;
const ACTOR = 'sumitr_mardy~email-verifier';
const API = 'https://api.apify.com/v2';

/** Server-side cap per poll. Loop until the run leaves RUNNING. */
const WAIT_SECONDS = 60;
/** Dataset page size. */
const PAGE = 1000;

if (!TOKEN) {
    console.error('Set APIFY_TOKEN first.');
    process.exit(1);
}

const auth = { authorization: `Bearer ${TOKEN}` };

async function api(path, init = {}) {
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { ...auth, 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} on ${path}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.json();
}

const [listFile, outFile = 'results.json'] = process.argv.slice(2);
if (!listFile) {
    console.error('Usage: node verify-large-list.mjs <emails.txt> [results.json]');
    process.exit(1);
}

// One address per line, blanks and # comments ignored. Deduplicated, because
// every duplicate is a charged event.
const emails = [
    ...new Set(
        readFileSync(listFile, 'utf8')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#')),
    ),
];
console.log(`${emails.length} unique address(es)`);

// 1 — start the run and get out of the way.
const started = await api(`/acts/${ACTOR}/runs`, {
    method: 'POST',
    body: JSON.stringify({ emails, concurrency: 20 }),
});
const runId = started.data.id;
const datasetId = started.data.defaultDatasetId;
console.log(`run ${runId} started`);

// 2 — long-poll. Each call blocks server-side, so this is not a busy loop.
let status = started.data.status;
while (status === 'RUNNING' || status === 'READY') {
    const polled = await api(`/actor-runs/${runId}?waitForFinish=${WAIT_SECONDS}`);
    status = polled.data.status;
    process.stdout.write(`  ${status} …\n`);
}

if (status !== 'SUCCEEDED') {
    // A failed run still produced whatever it got through, so collect anyway —
    // but say so, because a partial list quietly treated as complete is how
    // addresses silently go missing.
    console.error(`run finished as ${status}; collecting whatever it produced`);
}

// 3 — page through the dataset.
const records = [];
for (let offset = 0; ; offset += PAGE) {
    const page = await api(`/datasets/${datasetId}/items?offset=${offset}&limit=${PAGE}&clean=true`);
    if (!Array.isArray(page) || page.length === 0) break;
    records.push(...page);
    console.log(`  fetched ${records.length}/${emails.length}`);
    if (page.length < PAGE) break;
}

writeFileSync(outFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

const by = (s) => records.filter((r) => r.status === s).length;
console.log(
    `\n${records.length} records -> ${outFile}\n` +
        `  deliverable ${by('deliverable')} · risky ${by('risky')} · ` +
        `undeliverable ${by('undeliverable')} · unknown ${by('unknown')}`,
);

if (records.length !== emails.length) {
    console.error(`WARNING: submitted ${emails.length} but got ${records.length} records back.`);
}

/**
 * Everything that can be checked without spending money or touching the network.
 *
 *   npm run validate
 *
 * Four gates, in order of how badly they would embarrass us if they failed in
 * public:
 *
 *   1. The schemas are valid JSON Schema, and every recorded real response
 *      validates against output.schema.json. The repo's whole claim is that the
 *      shape never varies — so the shape is asserted against responses the
 *      Actor actually produced, not against a shape we wish it produced.
 *   2. No secret-shaped string is committed anywhere.
 *   3. No Apify URL or price is hardcoded outside config/links.json. One edit
 *      has to update every link, or the affiliate parameter will land in some
 *      files and not others the day it is finally added.
 *   4. Every built workflow is structurally sound n8n JSON with no inline token.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
const notes = [];

function fail(gate, message) {
    failures.push(`${gate}: ${message}`);
}

function walk(dir, skip = new Set(['.git', 'node_modules', 'docs/images', 'assets'])) {
    const out = [];
    const rel = relative(ROOT, dir).replace(/\\/g, '/');
    if (skip.has(rel)) return out;
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walk(full, skip));
        else out.push(full);
    }
    return out;
}

// --- 1. schemas and recorded responses -------------------------------------

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let validateOutput;
try {
    const outputSchema = JSON.parse(readFileSync(join(ROOT, 'schema/output.schema.json'), 'utf8'));
    validateOutput = ajv.compile(outputSchema);
    ajv.compile(JSON.parse(readFileSync(join(ROOT, 'schema/input.schema.json'), 'utf8')));
} catch (err) {
    fail('schema', `could not compile: ${err.message}`);
}

const expectedDir = join(ROOT, 'test/fixtures/expected');
let recorded = 0;
const seenSubStatuses = new Set();

if (validateOutput && existsSync(expectedDir)) {
    for (const file of readdirSync(expectedDir).filter((f) => f.endsWith('.json'))) {
        const record = JSON.parse(readFileSync(join(expectedDir, file), 'utf8'));
        recorded++;
        seenSubStatuses.add(record.sub_status);
        if (!validateOutput(record)) {
            // A real response failing this schema means the published contract
            // is wrong somewhere — worth stopping for, not warning about.
            fail('contract', `${file} does not match output.schema.json — ${ajv.errorsText(validateOutput.errors)}`);
        }
    }
}

if (recorded === 0) fail('contract', 'no recorded responses in test/fixtures/expected — run npm run smoke first');
else notes.push(`${recorded} recorded response(s) match the schema, covering: ${[...seenSubStatuses].sort().join(', ')}`);

// --- 2. secrets -------------------------------------------------------------

const SECRET_PATTERNS = [
    [/apify_api_[A-Za-z0-9]{10,}/, 'an Apify API token'],
    [/\bBearer\s+[A-Za-z0-9_-]{24,}/, 'a bearer token'],
    [/"(token|apiKey|password|secret)"\s*:\s*"(?!REPLACE|YOUR_|<)[^"]{12,}"/i, 'a credential value'],
];

for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (!['.json', '.md', '.yaml', '.yml', '.mjs', '.js', '.py', '.sh', '.txt'].includes(extname(file))) continue;
    const text = readFileSync(file, 'utf8');
    for (const [pattern, what] of SECRET_PATTERNS) {
        if (pattern.test(text)) fail('secrets', `${rel} looks like it contains ${what}`);
    }
}

// --- 3. single source for links and price -----------------------------------

const links = JSON.parse(readFileSync(join(ROOT, 'config/links.json'), 'utf8'));
const expectedParam = links.affiliateParam ?? '';
const LINK_EXEMPT = new Set(['config/links.json', 'scripts/validate.mjs', 'scripts/build-workflows.mjs', 'VERIFY.md']);

/**
 * Markdown cannot be templated — GitHub needs a real README.md — so the Actor
 * links live inline and `npm run build` rewrites them from config. The job here
 * is to prove that rewrite actually reached everywhere: every Actor link in the
 * repo must carry exactly the configured affiliate parameter.
 *
 * Without this, the day the parameter is added it lands in some files and not
 * others, and the referral traffic that goes missing is invisible by
 * definition — nothing errors, the links just quietly earn nothing.
 */
// Backslash is excluded from the query class alongside whitespace: inside a
// built workflow the sticky notes are JSON strings where newlines are a literal
// `\n`, and a class that allows backslash runs past them and reports the rest
// of the note as part of the URL.
const anyActorLink = /https:\/\/apify\.com\/sumitr_mardy\/email-verifier(\/[a-z-]+)?(\?[^\s)"'`\\]*)?/g;

for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (LINK_EXEMPT.has(rel)) continue;
    if (!['.md', '.yaml', '.yml', '.json', '.txt', '.mjs', '.py', '.sh'].includes(extname(file))) continue;
    if (rel.startsWith('workflows/src/') || rel.startsWith('config/i18n/')) continue;

    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(anyActorLink)) {
        // Group 1 is the optional path segment (/pricing, /api); group 2 is the
        // query string, which is the part that has to match config.
        const query = match[2] ?? '';
        if (query !== expectedParam) {
            fail(
                'links',
                `${rel} links to the Actor with "${query || 'no parameter'}" but config says "${expectedParam || 'no parameter'}" — run npm run build`,
            );
        }
    }

    if (/\$\d+(\.\d+)?\s*(\/|per\s*)\s*1,?000/i.test(text)) {
        notes.push(`price: ${rel} prints a rate — it will go stale; prefer linking the Pricing tab`);
    }
}

if (links.affiliateParam === '') {
    notes.push('affiliateParam is empty — links ship without a referral code until the owner registers');
} else if (/REPLACE_ME/.test(links.affiliateParam)) {
    fail('links', 'affiliateParam still says REPLACE_ME');
}

// --- 4. built workflows -----------------------------------------------------

for (const locale of ['en', 'zh-CN']) {
    const dir = join(ROOT, 'workflows', locale);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
        fail('workflows', `workflows/${locale} is empty — run npm run build`);
        continue;
    }
    for (const file of files) {
        const wf = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        const where = `workflows/${locale}/${file}`;
        if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) fail('workflows', `${where} has no nodes`);
        if (typeof wf.connections !== 'object') fail('workflows', `${where} has no connections object`);

        const names = new Set();
        for (const node of wf.nodes ?? []) {
            if (!node.name || !node.type) fail('workflows', `${where} has a node missing name or type`);
            if (names.has(node.name)) fail('workflows', `${where} has two nodes named "${node.name}"`);
            names.add(node.name);
            // n8n refuses to import a workflow whose connections reference a
            // node that is not there, and the error it gives is unhelpful.
            if (/^(HTTP Request|Code|Set|Switch|IF)\d*$/.test(node.name)) {
                notes.push(`naming: ${where} still has a default node name "${node.name}"`);
            }
        }
        for (const from of Object.keys(wf.connections ?? {})) {
            if (!names.has(from)) fail('workflows', `${where} connects from unknown node "${from}"`);
            for (const outputs of Object.values(wf.connections[from])) {
                for (const output of outputs ?? []) {
                    for (const target of output ?? []) {
                        if (!names.has(target.node)) {
                            fail('workflows', `${where} connects to unknown node "${target.node}"`);
                        }
                    }
                }
            }
        }
        if (/\$\{\{?\s*\w+\s*\}?\}/.test(JSON.stringify(wf).replace(/\{\{[^}]*\}\}/g, ''))) {
            notes.push(`build: ${where} may contain an unsubstituted placeholder`);
        }
    }
}

// --- report -----------------------------------------------------------------

for (const note of notes) console.log(`  note  ${note}`);
if (failures.length === 0) {
    console.log(`\nvalidate: PASS`);
    process.exit(0);
}
console.error(`\n${failures.length} failure(s):`);
for (const f of failures) console.error(`  FAIL  ${f}`);
process.exit(1);

/**
 * One workflow source -> one importable file per language.
 *
 *   npm run build              # writes workflows/en and workflows/zh-CN
 *   npm run release            # same, but refuses to finish on an unresolved placeholder
 *
 * Two hand-maintained copies of the same workflow drift — someone fixes a node
 * in the English one, nobody touches the Chinese one, and six months later they
 * are different products. So `workflows/src/*.json` is the only place a
 * workflow is edited, and the translated strings live in `config/i18n/`.
 *
 * Placeholders are `__i18n.some.key__` and `__link.actorUrl__`, deliberately
 * NOT `{{ }}`: n8n uses that for its own expressions, and a build step that
 * rewrote them would quietly corrupt every workflow it touched.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RELEASE = process.argv.includes('--release');
const LOCALES = ['en', 'zh-CN'];

const links = JSON.parse(readFileSync(join(ROOT, 'config/links.json'), 'utf8'));

/** Every outbound Actor link carries the affiliate parameter, or none do. */
function actorLink(base) {
    const param = links.affiliateParam ?? '';
    if (!param) return base;
    return base.includes('?') ? `${base}&${param.replace(/^[?&]/, '')}` : `${base}${param.startsWith('?') ? param : `?${param}`}`;
}

const linkValues = {
    actorUrl: actorLink(links.actorUrl),
    actorPricingUrl: actorLink(links.actorPricingUrl),
    actorApiUrl: actorLink(links.actorApiUrl),
    actorId: links.actorId,
    repoUrl: links.repoUrl,
    apifyConsoleUrl: links.apifyConsoleUrl,
    apifyTokenUrl: links.apifyTokenUrl,
    priceFromPer1k: links.priceFromPer1k,
};

/**
 * Substituted text lands inside a JSON string literal, so it has to be escaped
 * the way JSON escapes it. Sticky notes are markdown full of newlines and
 * quotes; dropping them in raw produces a file that looks right in a diff and
 * will not parse. `JSON.stringify` minus its outer quotes is exactly the
 * escaping needed, and it stays correct for characters nobody thought about.
 */
function jsonEscape(value) {
    return JSON.stringify(value).slice(1, -1);
}

/**
 * One pass is not enough: strings reference other strings (`t1.sticky` pulls in
 * `common.credentialNote`), and a replacement's own placeholders are not
 * rescanned by the same `.replace()`. So resolve until it stops changing, with
 * a ceiling so a key that refers to itself fails loudly instead of hanging.
 */
function resolve(text, strings, missing, unresolved) {
    const MAX_PASSES = 6;
    let current = text;

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        const next = current
            .replace(/__i18n\.([a-zA-Z0-9_.]+)__/g, (whole, key) => {
                const value = key.split('.').reduce((acc, part) => acc?.[part], strings);
                if (typeof value !== 'string') {
                    missing.add(key);
                    return whole;
                }
                return jsonEscape(value);
            })
            .replace(/__link\.([a-zA-Z0-9_]+)__/g, (whole, key) => {
                if (!(key in linkValues)) {
                    unresolved.add(`link.${key}`);
                    return whole;
                }
                return jsonEscape(String(linkValues[key]));
            });

        if (next === current) return current;
        current = next;
    }

    unresolved.add('substitution did not settle — check for a string that references itself');
    return current;
}

const srcDir = join(ROOT, 'workflows/src');
const sources = readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort();
if (sources.length === 0) {
    console.error('no workflow sources in workflows/src');
    process.exit(1);
}

let problems = 0;

for (const locale of LOCALES) {
    const strings = JSON.parse(readFileSync(join(ROOT, `config/i18n/${locale}.json`), 'utf8'));
    const outDir = join(ROOT, 'workflows', locale);
    mkdirSync(outDir, { recursive: true });

    for (const file of sources) {
        const missing = new Set();
        const unresolved = new Set();
        const raw = readFileSync(join(srcDir, file), 'utf8');
        const built = resolve(raw, strings, missing, unresolved);

        // Parse before writing: a bad substitution should fail here, not inside
        // n8n's importer with an error nobody can act on.
        let parsed;
        try {
            parsed = JSON.parse(built);
        } catch (err) {
            console.error(`  FAIL  ${locale}/${file}: not valid JSON after substitution — ${err.message}`);
            problems++;
            continue;
        }

        writeFileSync(join(outDir, file), `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

        for (const key of missing) {
            console.error(`  ${RELEASE ? 'FAIL' : 'warn'}  ${locale}/${file}: no string for i18n key "${key}"`);
            if (RELEASE) problems++;
        }
        for (const key of unresolved) {
            console.error(`  FAIL  ${locale}/${file}: unknown placeholder "${key}"`);
            problems++;
        }
        if (RELEASE && /REPLACE_ME/.test(built)) {
            console.error(`  FAIL  ${locale}/${file}: still contains REPLACE_ME`);
            problems++;
        }

        console.log(`  built workflows/${locale}/${file}  (${parsed.nodes.length} nodes)`);
    }
}

// --- prose: rewrite Actor links in place --------------------------------------
//
// Markdown cannot be templated the way workflows are — GitHub has to find a
// real README.md. But the affiliate parameter still has to be a single edit,
// and "remember to also update six markdown files" is not a mechanism, it is a
// thing someone forgets exactly once.
//
// So the links are rewritten in place from config, idempotently: whatever
// parameter a link currently carries is replaced by the configured one. Adding
// `affiliateParam` later and running `npm run build` updates every document.

const PROSE = [
    'README.md',
    'README.zh-CN.md',
    'llms.txt',
    'LAUNCH.md',
    'docs/statuses.md',
    'docs/statuses.zh-CN.md',
    'docs/pricing-and-batching.md',
    'docs/pricing-and-batching.zh-CN.md',
    'agents/mcp/README.md',
    'agents/mcp/README.zh-CN.md',
    'agents/dify/README.zh-CN.md',
    'agents/coze/README.zh-CN.md',
];

/**
 * Matches the Actor URL plus an optional path segment and an optional query
 * string, so a stale parameter is replaced rather than appended to.
 *
 * The query class excludes backslash as well as whitespace. Without that it
 * runs straight through the literal `\n` sequences inside a JSON string and
 * swallows everything after the link — which is exactly what happened the
 * first time, corrupting llms.txt in a way that still looked like a URL.
 */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const actorLinkPattern = new RegExp(`${escapeRe(links.actorUrl)}(/[a-z-]+)?(\\?[^\\s)"'\\\\]*)?`, 'g');

let rewritten = 0;
for (const file of PROSE) {
    const path = join(ROOT, file);
    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch {
        continue;
    }
    const next = text.replace(actorLinkPattern, (_, suffix = '') => actorLink(`${links.actorUrl}${suffix ?? ''}`));
    if (next !== text) {
        writeFileSync(path, next, 'utf8');
        rewritten++;
    }
}
if (rewritten > 0) console.log(`  rewrote Actor links in ${rewritten} document(s)`);

if (!linkValues.actorUrl.includes('fpr=') && RELEASE) {
    // A warning, not a failure: the owner explicitly chose to ship without a
    // referral code until they have registered for the programme.
    console.log('  note  building without an affiliate parameter (config/links.json -> affiliateParam is empty)');
}

if (problems > 0) {
    console.error(`\nbuild: ${problems} problem(s)`);
    process.exit(1);
}
console.log('\nbuild: OK');

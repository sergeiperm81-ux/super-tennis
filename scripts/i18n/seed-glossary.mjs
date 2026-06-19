#!/usr/bin/env node
/**
 * seed-glossary.mjs — засев translation_glossary из scripts/i18n/glossary/<lang>.json.
 * Идемпотентно (upsert по lang,source_term,kind). Источник = service key (RLS service-key-only).
 *
 *   node scripts/i18n/seed-glossary.mjs --lang es
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANGS = ['es', 'fr', 'zh'];

function fail(m) { console.error(`[glossary] ERROR: ${m}`); process.exit(1); }

const argv = process.argv.slice(2);
let lang;
for (let i = 0; i < argv.length; i++) if (argv[i] === '--lang') lang = argv[++i];
if (!LANGS.includes(lang)) fail(`--lang must be one of ${LANGS.join('|')}`);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) fail('missing SUPABASE_URL / SUPABASE_SERVICE_KEY');

const sb = createClient(url, key);
const file = join(__dirname, 'glossary', `${lang}.json`);
const terms = JSON.parse(await readFile(file, 'utf8'));
const rows = terms.map((t) => ({
  lang,
  source_term: t.source,
  target_term: t.target,
  kind: t.kind || 'term',
}));

// Full-sync per lang: the JSON file is the source of truth. Delete this lang's rows, then
// insert from file — so removing a term from the file actually removes it from the table.
const { error: delErr } = await sb.from('translation_glossary').delete().eq('lang', lang);
if (delErr) fail(`delete failed: ${delErr.message}`);
const { error } = await sb.from('translation_glossary').insert(rows);
if (error) fail(`insert failed: ${error.message}`);

const { data } = await sb
  .from('translation_glossary')
  .select('source_term,target_term,kind')
  .eq('lang', lang)
  .order('source_term');
console.log(`[glossary] seeded ${rows.length} ${lang} terms. Table now has ${data?.length ?? '?'} for ${lang}:`);
for (const d of data || []) console.log(`  ${d.source_term} → ${d.target_term}  (${d.kind})`);

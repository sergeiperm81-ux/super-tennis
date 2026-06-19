#!/usr/bin/env node
/**
 * translate-content.mjs — перевод контента на es/fr/zh (GPT-4o-mini + глоссарий).
 * Дизайн: docs/I18N_PHASE1_DESIGN.md §4. Guardrails: dry-run по умолчанию, идемпотентность,
 * источник read-only, санитизация на write [P1], cost-guard.
 *
 *   node scripts/i18n/translate-content.mjs --type <page|article|news|player> --lang <es|fr|zh>
 *        [--limit N] [--ids a,b] [--model gpt-4o-mini] [--confirm] [--max-cost 25] [--force]
 *
 * Без --confirm = DRY-RUN: считает кандидатов и стоимость, НЕ зовёт API, НЕ пишет в БД.
 * --force: перепереводит УЖЕ переведённые строки (overwrite через upsert). Использовать
 *          вместе с --ids для точечного переперевода плохой страницы (иначе — все строки типа).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeArticleHtml } from '../../src/lib/sanitize-core.mjs';
import { validatePageFields } from '../../src/lib/i18n-schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TYPES = ['page', 'article', 'news', 'player'];
const LANGS = ['es', 'fr', 'zh'];
// Allowlist — guards the cost estimate (prices below are gpt-4o-mini-specific). Extend
// deliberately together with PRICE_* if another model is ever needed.
const MODELS = ['gpt-4o-mini'];
const PAGE_KEY_RE = /^[a-z0-9][a-z0-9\-\/]*$/; // slug-like page_key for static pages
// GPT-4o-mini: $0.15/M in, $0.60/M out. out≈in×1.1 (es/fr), ×0.7 (zh).
const PRICE_IN = 0.15 / 1e6;
const PRICE_OUT = 0.6 / 1e6;
const OUT_RATIO = { es: 1.1, fr: 1.1, zh: 0.7 };

function parseArgs(argv) {
  const a = { limit: null, ids: null, model: 'gpt-4o-mini', confirm: false, maxCost: 25, force: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--confirm') a.confirm = true;
    else if (k === '--force') a.force = true;
    else if (k === '--type') a.type = argv[++i];
    else if (k === '--lang') a.lang = argv[++i];
    else if (k === '--limit') a.limit = parseInt(argv[++i], 10);
    else if (k === '--ids') a.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--model') a.model = argv[++i];
    else if (k === '--max-cost') a.maxCost = parseFloat(argv[++i]);
  }
  return a;
}

function fail(msg) {
  console.error(`[translate] ERROR: ${msg}`);
  process.exit(1);
}

function requireEnv(key) {
  const v = process.env[key];
  if (!v) fail(`missing env ${key}`);
  return v;
}

/** Грубая оценка токенов (~4 символа/токен). */
const estTokens = (chars) => Math.ceil(chars / 4);
// tag-parity = COUNT of opening tags (не identity). Достаточно по дизайну §2 для флага review.
const countTags = (html) => (html.match(/<[a-z][^>]*>/gi) || []).length;

/** Постранично выбирает ВСЕ строки источника (Supabase лимит 1000/запрос) — защищает
 *  от OOM на больших таблицах (players ~136K). makeQuery() возвращает свежий builder. */
async function fetchAllRows(makeQuery, pageSize = 1000) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await makeQuery().range(offset, offset + pageSize - 1);
    if (error) fail(`source select failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

// ── Поля, переводимые для каждого типа (источник read-only) ───────────────────
const FIELD_MAP = {
  article: ['title', 'excerpt', 'body', 'meta_title', 'meta_description', 'image_alt'],
  news: ['title', 'summary', 'body'],
  player: ['bio_short', 'meta_title', 'meta_description'],
};
const HTML_FIELDS = new Set(['body']); // поля, которые санитизируются и проверяются на tag-parity

async function loadGlossary(sb, lang) {
  const { data, error } = await sb
    .from('translation_glossary')
    .select('source_term,target_term,kind')
    .eq('lang', lang);
  if (error) {
    console.warn(`[translate] glossary load failed: ${error.message}`);
    return [];
  }
  return data || [];
}

/** Возвращает кандидатов: [{ key, sourceFields }] без существующего перевода для (type,lang).
 *  force=true → НЕ пропускает уже переведённые (для точечного переперевода, обычно с ids). */
async function getCandidates(sb, type, lang, ids, force = false) {
  if (type === 'page') {
    // Источник статических страниц — реестр scripts/i18n/page-sources/*.json (Phase 2 наполнит).
    const dir = join(__dirname, 'page-sources');
    let files = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    } catch {
      return []; // реестра ещё нет
    }
    const translated = new Set(
      ((await sb.from('page_translations').select('page_key').eq('lang', lang)).data || []).map((r) => r.page_key),
    );
    const out = [];
    for (const f of files) {
      const obj = JSON.parse(await readFile(join(dir, f), 'utf8'));
      const key = obj.page_key;
      if (!key || !PAGE_KEY_RE.test(key)) {
        console.warn(`[translate] skipping invalid page_key in ${f}: ${JSON.stringify(key)}`);
        continue;
      }
      if (!force && translated.has(key)) continue;
      if (ids && !ids.includes(key)) continue;
      out.push({ key, sourceFields: obj.fields, isPage: true });
    }
    return out;
  }

  const table = type === 'article' ? 'articles' : type === 'news' ? 'news' : 'players';
  const transTable = `${type === 'player' ? 'player' : type}_translations`;
  const fkCol = type === 'article' ? 'article_id' : type === 'news' ? 'news_id' : 'player_id';
  const srcKey = type === 'player' ? 'player_id' : 'id';
  const fields = FIELD_MAP[type];

  const baseFilter = (q) => {
    if (type === 'article') return q.eq('status', 'published');
    if (type === 'news') return q.eq('is_active', true);
    return q; // players
  };

  // источник — постранично (защита от больших таблиц, напр. players)
  const cols = [srcKey, ...fields].join(',');
  const src = await fetchAllRows(() => baseFilter(sb.from(table).select(cols)));

  // уже переведённые ключи
  const translated = new Set(
    ((await sb.from(transTable).select(fkCol).eq('lang', lang)).data || []).map((r) => String(r[fkCol])),
  );

  const out = [];
  for (const row of src || []) {
    const key = String(row[srcKey]);
    if (!force && translated.has(key)) continue;
    if (ids && !ids.includes(key)) continue;
    const sourceFields = {};
    for (const f of fields) if (row[f] != null && row[f] !== '') sourceFields[f] = row[f];
    if (Object.keys(sourceFields).length === 0) continue;
    out.push({ key, sourceFields, srcKey, fkCol, transTable });
  }
  return out;
}

function sumChars(candidates) {
  let n = 0;
  for (const c of candidates) for (const v of Object.values(c.sourceFields)) n += String(v).length;
  return n;
}

function estimateCost(chars, lang) {
  const inTok = estTokens(chars);
  const outTok = Math.ceil(inTok * (OUT_RATIO[lang] ?? 1.1));
  return { inTok, outTok, usd: inTok * PRICE_IN + outTok * PRICE_OUT };
}

function glossaryPrompt(glossary) {
  if (!glossary.length) return '';
  const lines = glossary.map((g) => `- "${g.source_term}" → "${g.target_term}"`).join('\n');
  return `\nGlossary (use these exact target terms; do not translate other proper names):\n${lines}\n`;
}

async function translateItem(openai, model, lang, item, glossary) {
  const langName = { es: 'Spanish', fr: 'French', zh: 'Simplified Chinese' }[lang];
  const system =
    `You are a professional sports translator. Translate the JSON values into ${langName}. ` +
    `Rules: keep ALL HTML tags and attributes byte-identical (translate only human-readable text ` +
    `between tags); keep the same JSON keys; do not translate proper names except via the glossary; ` +
    `warm, fan-facing tone. Return ONLY a JSON object with the same keys.` +
    glossaryPrompt(glossary);
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(item.sourceFields) },
    ],
  });
  const usage = resp.usage || {};
  const translated = JSON.parse(resp.choices[0].message.content);
  return { translated, usage };
}

/** Санитизация [P1] + проверка целостности. Возвращает { fields, status }. */
function finalizeFields(type, sourceFields, translated) {
  const out = {};
  let status = 'published';
  const flagReview = () => { status = 'review'; };
  const keys = type === 'page' ? Object.keys(sourceFields) : FIELD_MAP[type];
  for (const f of keys) {
    if (sourceFields[f] == null) continue;
    let val = translated[f];
    if (val == null) { flagReview(); continue; }

    if (f === 'bodyBlocks' && Array.isArray(sourceFields[f])) {
      // [P1] каждый HTML-блок санитизируется; длина и tag-parity по блокам = источнику (§2)
      const srcArr = sourceFields[f];
      const arr = Array.isArray(val) ? val : (flagReview(), []);
      if (arr.length !== srcArr.length) flagReview();
      val = arr.map((b) => sanitizeArticleHtml(String(b)));
      for (let i = 0; i < Math.min(val.length, srcArr.length); i++) {
        if (countTags(sanitizeArticleHtml(String(srcArr[i]))) !== countTags(val[i])) flagReview();
      }
    } else if (f === 'faqs' && Array.isArray(sourceFields[f])) {
      // [P1] ответ FAQ может содержать HTML → санитизируем; длина = источнику (§2)
      const srcArr = sourceFields[f];
      const arr = Array.isArray(val) ? val : (flagReview(), []);
      if (arr.length !== srcArr.length) flagReview();
      val = arr.map((faq) => ({ q: String(faq?.q ?? ''), a: sanitizeArticleHtml(String(faq?.a ?? '')) }));
    } else if (HTML_FIELDS.has(f)) {
      const srcSan = sanitizeArticleHtml(String(sourceFields[f]));
      val = sanitizeArticleHtml(String(val)); // [P1] sanitize on write
      if (countTags(srcSan) !== countTags(val)) flagReview(); // tag-parity на санитизированных
    }
    out[f] = val;
  }
  return { fields: out, status };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!TYPES.includes(args.type)) fail(`--type must be one of ${TYPES.join('|')}`);
  if (!LANGS.includes(args.lang)) fail(`--lang must be one of ${LANGS.join('|')}`);
  if (!MODELS.includes(args.model)) fail(`--model must be one of ${MODELS.join('|')} (cost guard is model-specific)`);

  const sb = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_KEY'));

  if (args.force && !args.ids) {
    console.warn('[translate] --force WITHOUT --ids: will re-translate ALL already-translated ' +
      `${args.type}/${args.lang} rows (cost guard still applies). Add --ids to target specific rows.`);
  }

  let candidates = await getCandidates(sb, args.type, args.lang, args.ids, args.force);
  if (args.limit != null) candidates = candidates.slice(0, args.limit);
  const glossary = await loadGlossary(sb, args.lang);
  const chars = sumChars(candidates);
  const est = estimateCost(chars, args.lang);

  console.log(`[translate] type=${args.type} lang=${args.lang} model=${args.model} ` +
    `MODE=${args.confirm ? 'EXECUTE' : 'DRY-RUN (no API calls, no writes)'}`);
  console.log(`  candidates (no ${args.lang} translation yet): ${candidates.length}`);
  console.log(`  source chars: ~${chars.toLocaleString()}  →  est tokens in/out: ` +
    `~${est.inTok.toLocaleString()} / ~${est.outTok.toLocaleString()}`);
  console.log(`  est cost: ~$${est.usd.toFixed(3)}  (gpt-4o-mini)`);
  console.log(`  glossary terms loaded for ${args.lang}: ${glossary.length}`);

  if (!args.confirm) {
    console.log('  → run again with --confirm to execute. (--limit N to batch, --ids a,b to target)');
    return;
  }
  if (est.usd > args.maxCost) {
    fail(`estimated cost $${est.usd.toFixed(2)} exceeds --max-cost $${args.maxCost}. Lower --limit or raise --max-cost.`);
  }
  if (candidates.length === 0) {
    console.log('  nothing to translate.');
    return;
  }

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });

  let ok = 0, review = 0, failed = 0, spentIn = 0, spentOut = 0;
  for (const item of candidates) {
    try {
      const { translated, usage } = await translateItem(openai, args.model, args.lang, item, glossary);
      spentIn += usage.prompt_tokens || 0;
      spentOut += usage.completion_tokens || 0;
      const { fields, status } = finalizeFields(args.type, item.sourceFields, translated);

      let row;
      if (args.type === 'page') {
        const v = validatePageFields(fields);
        if (!v.ok) { console.warn(`  [review] page ${item.key}: ${v.error}`); review++; }
        row = { page_key: item.key, lang: args.lang, fields_json: fields, status: v.ok ? status : 'review', updated_at: new Date().toISOString() };
      } else {
        row = { [item.fkCol]: castKey(args.type, item.key), lang: args.lang, ...fields, status, updated_at: new Date().toISOString() };
      }
      const transTable = args.type === 'page' ? 'page_translations' : item.transTable;
      const { error } = await sb.from(transTable).upsert(row, {
        onConflict: args.type === 'page' ? 'page_key,lang' : `${item.fkCol},lang`,
      });
      if (error) { console.warn(`  [fail] ${item.key}: ${error.message}`); failed++; continue; }
      if (row.status === 'review') review++; else ok++;
    } catch (e) {
      console.warn(`  [fail] ${item.key}: ${e.message}`);
      failed++;
    }
  }

  const realCost = spentIn * PRICE_IN + spentOut * PRICE_OUT;
  console.log(`\n[translate] done. published=${ok} review=${review} failed=${failed}`);
  console.log(`  tokens in/out: ${spentIn.toLocaleString()}/${spentOut.toLocaleString()} ` +
    `→ actual cost ~$${realCost.toFixed(3)}`);
}

/** article→integer, news→bigint(number), player→text. */
function castKey(type, key) {
  if (type === 'article' || type === 'news') return Number(key);
  return key;
}

main().catch((e) => fail(e.message));

#!/usr/bin/env node
/**
 * diff-dist.mjs — сравнение двух снимков сборки (golden-safety-тест).
 * См. docs/I18N_IMPLEMENTATION_PLAN.md → «Golden safety test».
 *
 * Классифицирует файлы как ADDED / REMOVED / CHANGED между двумя манифестами.
 * Цель — поймать НЕПРЕДНАМЕРЕННЫЕ изменения английского вывода от i18n-кода.
 *
 * Использование:
 *   node scripts/i18n/diff-dist.mjs <baseManifest> <newManifest> [опции]
 * Опции:
 *   --ignore <path>   файл volatile-patterns (по умолчанию scripts/i18n/volatile-paths.json)
 *   --no-ignore       не применять volatile-фильтр (показать всё, включая data-drift)
 *   --locales a,b,c   префиксы локалей (по умолчанию es,fr,zh) — для отчёта ADDED по локалям
 *
 * Главный режим (OFF-vs-ON одной сессии): base=сборка с пустым I18N_LOCALES,
 * new=сборка с I18N_LOCALES=es. Данные идентичны → дельта = только наш код.
 * Ожидание: ADDED только под локалями + (на фазах с hreflang) CHANGED только из allowlist.
 *
 * Exit code: 1 если есть REMOVED или не-игнорируемые CHANGED (потенциальная регрессия), иначе 0.
 */
import { readFile } from 'node:fs/promises';

function parseArgs(argv) {
  const args = { positional: [], ignore: 'scripts/i18n/volatile-paths.json', useIgnore: true, locales: ['es', 'fr', 'zh'] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-ignore') args.useIgnore = false;
    else if (a === '--ignore') args.ignore = argv[++i];
    else if (a === '--locales') args.locales = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else args.positional.push(a);
  }
  return args;
}

/** Превращает паттерн ('news/**', 'sitemap*.xml') в якорный RegExp. */
function patternToRegExp(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') { re += '.*'; i++; }
      else re += '[^/]*';
    } else if ('.+?^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

async function loadManifest(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    console.error(`[diff] cannot read manifest ${path}: ${err.message}`);
    process.exit(2);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.positional.length < 2) {
    console.error('Usage: node scripts/i18n/diff-dist.mjs <baseManifest> <newManifest> [--ignore p] [--no-ignore] [--locales es,fr,zh]');
    process.exit(2);
  }
  const [basePath, newPath] = args.positional;
  const base = await loadManifest(basePath);
  const next = await loadManifest(newPath);

  let volatile = [];
  if (args.useIgnore) {
    try {
      const cfg = JSON.parse(await readFile(args.ignore, 'utf8'));
      volatile = (cfg.patterns || []).map(patternToRegExp);
    } catch (err) {
      console.warn(`[diff] no volatile-ignore applied (${err.message})`);
    }
  }
  const isVolatile = (p) => volatile.some((re) => re.test(p));
  const isLocale = (p) => args.locales.some((l) => p === l || p.startsWith(l + '/'));

  const added = [];
  const removed = [];
  const changed = [];
  for (const p of Object.keys(next)) if (!(p in base)) added.push(p);
  for (const p of Object.keys(base)) if (!(p in next)) removed.push(p);
  for (const p of Object.keys(next)) if (p in base && base[p] !== next[p]) changed.push(p);

  // Разбиваем CHANGED: волатильные (ожидаемый data-drift) vs значимые (English-регрессия).
  const changedVolatile = changed.filter(isVolatile);
  const changedSignificant = changed.filter((p) => !isVolatile(p));
  // ADDED под локалями — ожидаемо; ADDED вне локалей — подозрительно.
  const addedLocale = added.filter(isLocale);
  const addedNonLocale = added.filter((p) => !isLocale(p));

  console.log(`\n=== diff-dist: ${basePath} -> ${newPath} ===`);
  console.log(`ADDED   : ${added.length}  (locale: ${addedLocale.length}, non-locale: ${addedNonLocale.length})`);
  console.log(`REMOVED : ${removed.length}`);
  console.log(`CHANGED : ${changed.length}  (volatile/ignored: ${changedVolatile.length}, significant: ${changedSignificant.length})`);

  const list = (label, arr, cap = 50) => {
    if (!arr.length) return;
    console.log(`\n-- ${label} (${arr.length}) --`);
    arr.slice(0, cap).forEach((p) => console.log('   ' + p));
    if (arr.length > cap) console.log(`   …(+${arr.length - cap} more)`);
  };

  list('CHANGED — significant (English regression? проверить!)', changedSignificant);
  list('REMOVED (English regression? проверить!)', removed);
  list('ADDED — non-locale (подозрительно)', addedNonLocale);
  list('ADDED — locale (ожидаемо)', addedLocale, 20);

  const clean = removed.length === 0 && changedSignificant.length === 0 && addedNonLocale.length === 0;
  console.log(`\nRESULT: ${clean ? 'CLEAN ✅ (no English regression)' : 'DIRTY ❌ — разобрать значимые изменения / сверить с allowed-english-diff.json'}\n`);
  process.exit(clean ? 0 : 1);
}

main().catch((err) => {
  console.error('[diff] FAILED:', err.message);
  process.exit(2);
});

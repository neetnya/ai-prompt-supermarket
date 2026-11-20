// 模板 + 拆分源码 + tag.sqlite → ai-prompt-supermarket.html。仅用 Node 标准库，终端用户不需要运行。
//
//   node tools/build.mjs            构建 ai-prompt-supermarket.html
//   node tools/build.mjs --check    只读校验：产物是否等于「模板 + 源码 + 源数据」，内联 JS 能否编译
//   node tools/build.mjs --stats    只打印源数据统计
//
//   import {analyze, render, ...}   给其它脚本 / 单元测试复用
//
// 兼容性：读取 tag.sqlite 依赖内置 node:sqlite（Node 22.13+ / 23.4+ 起无需
// --experimental-sqlite 标志），因此构建需 Node 22.13+；页面产物本身仍兼容旧浏览器。
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import vm from 'vm';

// node:sqlite 在旧 Node 上不存在；延迟到构建时再报错，至少 --help/usage/单元测试还能跑
let DatabaseSync = null, sqliteLoadError = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch (e) { sqliteLoadError = e; }

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = 'tag.sqlite';
// 表结构：tags(name TEXT PRIMARY KEY, category INTEGER, cn_name TEXT, post_count INTEGER)
// 显式按 post_count DESC, rowid ASC 排序，保证前端专名分类可直接复用行顺序，无需 28 万条运行时排序。
export const SOURCE_QUERY = 'SELECT name, cn_name, category, post_count FROM tags ORDER BY post_count DESC, rowid ASC';
export const TEMPLATE = 'src/template.html';
export const OUTPUT = 'ai-prompt-supermarket.html';

export const ASSETS = {
  style: { file: 'src/style.css', marker: /^\/\*__STYLE_CSS__\*\/$/m },
  rules: { file: 'src/rules.mjs', marker: /^\/\*__RULES_JS__\*\/$/m },
  parser: { file: 'src/parser.mjs', marker: /^\/\*__PARSER_JS__\*\/$/m },
  app: { file: 'src/app.js', marker: /^\/\*__APP_JS__\*\/$/m }
};

// 模板里的全量数据占位行，构建时整行替换成 JSON.parse("...")（V8 解析超大 JSON 字符串比 JS 数组字面量更快）
const DATA_MARKER = /^const FULL_TAGS = \/\*__FULL_TAGS__\*\/\[\];$/m;

export const paths = {
  source: resolve(ROOT, SOURCE),
  template: resolve(ROOT, TEMPLATE),
  output: resolve(ROOT, OUTPUT),
  style: resolve(ROOT, ASSETS.style.file),
  rules: resolve(ROOT, ASSETS.rules.file),
  parser: resolve(ROOT, ASSETS.parser.file),
  app: resolve(ROOT, ASSETS.app.file)
};
const key = s => s.trim().toLowerCase().replace(/[_\s]+/g, ' ');

function assert(ok, msg) { if (!ok) throw new Error('构建失败：' + msg); }

// 校验模板中某个单行占位符恰好出现一次（必须带 g 标志，否则 match() 长度永远为 1）
function assertUniqueMarker(text, marker, desc) {
  const globalRe = new RegExp(marker.source, marker.flags.includes('g') ? marker.flags : marker.flags + 'g');
  const matches = text.match(globalRe);
  assert(matches && matches.length > 0, TEMPLATE + ' 缺少占位行：' + desc);
  assert(matches.length === 1, TEMPLATE + ' 有多个重复占位行：' + desc);
}

// 将 ESM 模块源码转换为可内联至经典 <script> 的脚本（剥离 import/export 关键字）
export function stripModuleSyntax(code) {
  return code
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\r?\n?/gm, '')
    .replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, '');
}

// 编码内联数据：JSON.parse("...")，同时安全转义 </script 与 <!-- 避免 HTML 解析提前截断
export function encodeInlineTags(rows) {
  const jsonText = JSON.stringify(rows);
  const jsStringLiteral = JSON.stringify(jsonText)
    .replace(/<\/script/gi, '\\u003c/script')
    .replace(/<!--/g, '\\u003c!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return 'const FULL_TAGS = JSON.parse(' + jsStringLiteral + ');';
}

// 当前 Node 能否解析可选链（Node 14+）。不能解析就无法对页面脚本做语法检查。
const CAN_COMPILE = (function () {
  try { new vm.Script('var o={};void o?.a;'); return true; }
  catch (e) { return false; }
})();

function sameData(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameData(a[i], b[i])) return false;
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !sameData(a[k], b[k])) return false;
    return true;
  }
  return false;
}

/* 从 tag.sqlite 读出全量行，转换成页面用的 [en,zh,category,count] 结构 */
export function readSource() {
  assert(existsSync(paths.source), '找不到数据源 ' + SOURCE + '（应放在项目根目录）');
  assert(DatabaseSync, '当前 Node ' + process.version + ' 无法加载 node:sqlite，构建需要 Node 22.13+（23.4+ 亦可）'
    + (sqliteLoadError && sqliteLoadError.message ? '：' + sqliteLoadError.message : ''));
  let db;
  try {
    db = new DatabaseSync(paths.source, { readOnly: true });
    return db.prepare(SOURCE_QUERY).all().map(r => [r.name, r.cn_name, r.category, r.post_count]);
  } catch (e) {
    throw new Error('读取 ' + SOURCE + ' 失败（' + SOURCE_QUERY + '）：' + e.message);
  } finally {
    if (db) db.close();
  }
}

/* 校验源数据并算出统计：行结构、分类号、count、tagKey 唯一、中文重名 / 标点 */
export function analyze(rows) {
  const keys = new Set(), names = new Map(), categories = {};
  let punctuation = 0, commas = 0, semicolons = 0;
  for (const row of rows) {
    assert(Array.isArray(row) && row.length === 4, '数据行必须是 [en,zh,category,count]');
    const en = row[0], zh = row[1], cat = row[2], count = row[3];
    assert(typeof en === 'string' && en.trim() && typeof zh === 'string', '英文名不能为空，中文名必须是字符串');
    assert([0, 1, 3, 4, 5].indexOf(cat) >= 0 && Number.isFinite(count) && count >= 0, '分类号只能是 0/1/3/4/5，count 必须是非负数');
    assert(!keys.has(key(en)), '重复的 tagKey: ' + en);
    keys.add(key(en));
    categories[cat] = (categories[cat] || 0) + 1;
    if (zh.trim()) names.set(zh, (names.get(zh) || 0) + 1);
    if (/[,，;；]/.test(zh)) punctuation++;
    if (/[,，]/.test(zh)) commas++;
    if (/[;；]/.test(zh)) semicolons++;
  }
  const counts = [...names.values()];
  return {
    schemaVersion: 1,
    source: SOURCE,
    rows: rows.length,
    categories,
    sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    chineseNames: {
      duplicateNames: counts.filter(n => n > 1).length,
      tagsWithDuplicateNames: counts.filter(n => n > 1).reduce((a, b) => a + b, 0),
      maxCandidates: counts.reduce((a, b) => Math.max(a, b), 0)
    },
    chineseNamesWithCommaOrSemicolon: punctuation,
    chineseNamesWithComma: commas,
    chineseNamesWithSemicolon: semicolons
  };
}

/* 模板 + 拆分源码 + 数据 → 完整单文件 HTML 文本 */
export function render(rows) {
  let html = readFileSync(paths.template, 'utf8');
  assertUniqueMarker(html, DATA_MARKER, 'const FULL_TAGS = /*__FULL_TAGS__*/[];');
  for (const [name, cfg] of Object.entries(ASSETS)) {
    assertUniqueMarker(html, cfg.marker, cfg.file);
    let content = readFileSync(paths[name], 'utf8').trimEnd();
    if (name !== 'style') content = stripModuleSyntax(content);
    html = html.replace(cfg.marker, () => content);
  }
  html = html.replace(DATA_MARKER, () => encodeInlineTags(rows));
  assert(!DATA_MARKER.test(html), '占位行未被替换');
  return html;
}

export function build() {
  const rows = readSource();
  const stats = analyze(rows);   // 先校验源数据，校验不过就不落盘
  const html = render(rows);
  writeFileSync(paths.output, html);
  return { html, stats };
}

/* 只读：产物必须与「模板 + 源码 + 源数据」逐字符一致，且内联数据可解析、每个 script 可编译 */
export function check() {
  const rows = readSource();
  const expected = render(rows);
  assert(existsSync(paths.output), '找不到产物 ' + OUTPUT + '，先运行 node tools/build.mjs');
  assert(readFileSync(paths.output, 'utf8') === expected, OUTPUT + ' 与模板 / 源数据不一致，先运行 node tools/build.mjs');
  const inline = expected.match(/^const FULL_TAGS = JSON\.parse\((".*")\);$/m);
  assert(inline, '产物里找不到内联数据行');
  const parsed = JSON.parse(JSON.parse(inline[1]));
  assert(sameData(parsed, rows), '内联数据与源数据不同');
  if (CAN_COMPILE) {
    const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(expected))) new vm.Script(m[1]);
  }
  return { stats: analyze(rows), syntax: CAN_COMPILE };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const flag = (process.argv[2] || '').replace(/^--?/, '') || 'build';
  assert(['build', 'check', 'stats'].indexOf(flag) >= 0, 'Usage: node tools/build.mjs [--check|--stats]');
  if (flag === 'stats') {
    console.log(JSON.stringify(analyze(readSource()), null, 2));
  } else if (flag === 'check') {
    const result = check();
    console.log(JSON.stringify(result.stats, null, 2));
    console.log(result.syntax
      ? 'PASS: ' + OUTPUT + ' 与模板 + 源数据一致，内联数据可解析，JavaScript 语法通过'
      : 'PASS: ' + OUTPUT + ' 与模板 + 源数据一致，内联数据可解析（当前 Node 版本过旧，跳过 JS 语法检查，用 Node 14+ 可完整校验）');
  } else {
    const built = build();
    console.log(JSON.stringify(built.stats, null, 2));
    console.log('BUILD: ' + TEMPLATE + ' + ' + SOURCE + ' → ' + OUTPUT + ' (' + (built.html.length / 1048576).toFixed(1) + 'MB, ' + built.stats.rows + ' rows)');
  }
}

// 模板 + 源 JSON → ai-prompt-supermarket.html。仅用 Node 标准库，终端用户不需要运行。
//
//   node tools/build.mjs            构建 ai-prompt-supermarket.html
//   node tools/build.mjs --check    只读校验：产物是否等于「模板 + 源数据」，内联 JS 能否编译
//   node tools/build.mjs --stats    只打印源数据统计
//
//   import {analyze, render, ...}   给其它脚本复用
//
// 兼容性：Node 12 起可用（不用 node: 前缀、不用 assert/strict、不用 ?. 与 ??）。
import {readFileSync, writeFileSync} from 'fs';
import {createHash} from 'crypto';
import {fileURLToPath, pathToFileURL} from 'url';
import {resolve, dirname} from 'path';
import vm from 'vm';

export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCE='supermarket_full_tags_317423.json';
export const TEMPLATE='src/template.html';
export const OUTPUT='ai-prompt-supermarket.html';
// 模板里的占位行，构建时整行替换成内联数据（保持产物仍是单行巨行）
const MARKER=/^const FULL_TAGS = \/\*__FULL_TAGS__\*\/\[\];$/m;

export const paths={
  source:resolve(ROOT,SOURCE),
  template:resolve(ROOT,TEMPLATE),
  output:resolve(ROOT,OUTPUT)
};
const key=s=>s.trim().toLowerCase().replace(/[_\s]+/g,' ');

function assert(ok,msg){ if(!ok) throw new Error('构建失败：'+msg); }

// 当前 Node 能否解析可选链（Node 14+）。不能解析就无法对页面脚本做语法检查。
const CAN_COMPILE=(function(){
  try{ new vm.Script('var o={};void o?.a;'); return true; }
  catch(e){ return false; }
})();

function sameData(a,b){
  if(a===b) return true;
  if(Array.isArray(a)||Array.isArray(b)){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length) return false;
    for(let i=0;i<a.length;i++) if(!sameData(a[i],b[i])) return false;
    return true;
  }
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    const ka=Object.keys(a), kb=Object.keys(b);
    if(ka.length!==kb.length) return false;
    for(const k of ka) if(!Object.prototype.hasOwnProperty.call(b,k)||!sameData(a[k],b[k])) return false;
    return true;
  }
  return false;
}

export function readSource(){ return JSON.parse(readFileSync(paths.source,'utf8')); }

/* 校验源数据并算出统计：行结构、分类号、count、tagKey 唯一、中文重名 / 标点 */
export function analyze(rows){
  const keys=new Set(), names=new Map(), categories={};
  let punctuation=0, commas=0, semicolons=0;
  for(const row of rows){
    assert(Array.isArray(row)&&row.length===4, '数据行必须是 [en,zh,category,count]');
    const en=row[0], zh=row[1], cat=row[2], count=row[3];
    assert(typeof en==='string'&&en.trim()&&typeof zh==='string', '英文名不能为空，中文名必须是字符串');
    assert([0,1,3,4,5].indexOf(cat)>=0&&Number.isFinite(count)&&count>=0, '分类号只能是 0/1/3/4/5，count 必须是非负数');
    assert(!keys.has(key(en)), '重复的 tagKey: '+en);
    keys.add(key(en));
    categories[cat]=(categories[cat]||0)+1;
    if(zh.trim()) names.set(zh,(names.get(zh)||0)+1);
    if(/[,，;；]/.test(zh)) punctuation++;
    if(/[,，]/.test(zh)) commas++;
    if(/[;；]/.test(zh)) semicolons++;
  }
  const counts=[...names.values()];
  return {schemaVersion:1,source:SOURCE,rows:rows.length,categories,
    sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    chineseNames:{duplicateNames:counts.filter(n=>n>1).length,
      tagsWithDuplicateNames:counts.filter(n=>n>1).reduce((a,b)=>a+b,0),
      maxCandidates:counts.reduce((a,b)=>Math.max(a,b),0)},
    chineseNamesWithCommaOrSemicolon:punctuation,
    chineseNamesWithComma:commas,
    chineseNamesWithSemicolon:semicolons};
}

/* 模板 + 数据 → 完整 HTML 文本。数据里的 </script 必须转义，否则会提前闭合标签 */
export function render(rows){
  const template=readFileSync(paths.template,'utf8');
  assert(MARKER.test(template), TEMPLATE+' 缺少占位行：const FULL_TAGS = /*__FULL_TAGS__*/[];');
  assert(template.match(MARKER).length===1, TEMPLATE+' 有多个 FULL_TAGS 占位行');
  const inline=JSON.stringify(rows).replace(/<\/script/gi,'<\\/script');
  const html=template.replace(MARKER, ()=>'const FULL_TAGS = '+inline+';');
  assert(!MARKER.test(html), '占位行未被替换');
  return html;
}

export function build(){
  const rows=readSource();
  const stats=analyze(rows);   // 先校验源数据，校验不过就不落盘
  const html=render(rows);
  writeFileSync(paths.output,html);
  return {html,stats};
}

/* 只读：产物必须与「模板 + 源数据」逐字符一致，且内联数据可解析、每个 script 可编译 */
export function check(){
  const rows=readSource();
  const expected=render(rows);
  assert(readFileSync(paths.output,'utf8')===expected, OUTPUT+' 与模板 / 源数据不一致，先运行 node tools/build.mjs');
  const inline=expected.match(/^const FULL_TAGS = (\[.*\]);$/m);
  assert(inline, '产物里找不到内联数据行');
  assert(sameData(JSON.parse(inline[1]),rows), '内联数据与源数据不同');
  // 页面 JS 用了可选链，Node 12 的 V8 解析不了，此时跳过语法检查（浏览器不受影响）
  if(CAN_COMPILE){
    const re=/<script>([\s\S]*?)<\/script>/g;
    let m;
    while((m=re.exec(expected))) new vm.Script(m[1]);
  }
  return {stats:analyze(rows), syntax:CAN_COMPILE};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const flag=(process.argv[2]||'').replace(/^--?/,'')||'build';
  assert(['build','check','stats'].indexOf(flag)>=0, 'Usage: node tools/build.mjs [--check|--stats]');
  if(flag==='stats'){
    console.log(JSON.stringify(analyze(readSource()),null,2));
  }else if(flag==='check'){
    const result=check();
    console.log(JSON.stringify(result.stats,null,2));
    console.log(result.syntax
      ? 'PASS: '+OUTPUT+' 与模板 + 源数据一致，内联数据可解析，JavaScript 语法通过'
      : 'PASS: '+OUTPUT+' 与模板 + 源数据一致，内联数据可解析（当前 Node 版本过旧，跳过 JS 语法检查，用 Node 14+ 可完整校验）');
  }else{
    const built=build();
    console.log(JSON.stringify(built.stats,null,2));
    console.log('BUILD: '+TEMPLATE+' + '+SOURCE+' → '+OUTPUT+' ('+(built.html.length/1048576).toFixed(1)+'MB, '+built.stats.rows+' rows)');
  }
}

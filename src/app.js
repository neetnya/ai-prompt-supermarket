/* ============ 构建分类与惰性索引 ============ */
const catMap = {};
const fullCat = {};
const isNeg = en => NEG_WORDS.has(tagKey(en));
const itemEn = t => Array.isArray(t) ? t[0] : t.en;
const itemZh = t => Array.isArray(t) ? t[1] : t.zh;

let ALL_TAGS = [];
let matchMap = new Map();        // 统一标签表（惰性构建）：tagKey -> {en, zh, zhRaw, cat, pc}
let zhMatchMap = new Map();      // 中文反查表（惰性构建）
let punctuationAliases = new Map();
let searchIndex = [];
let tagIndexReady = false, zhIndexReady = false, searchIndexReady = false;

function zhFallback(en) {
  const k = tagKey(en);
  return CURATED_ZH[en] || CURATED_ZH[k] || (tagIndexReady ? matchMap.get(k)?.zh : null) || en;
}

function buildCats() {
  const GEN = {};
  const SPEC = { '角色': [], '画师': [], '版权/作品': [] };
  const SPEC_FORCED = { '角色': [], '画师': [], '版权/作品': [] };
  const autoCats = Object.keys(AUTO);
  const curatedKeys = new Set();
  const curatedRows = new Map();

  Object.keys(CURATED).forEach(c => {
    catMap[c] = [];
    CURATED[c].forEach(en => curatedKeys.add(tagKey(en)));
  });
  autoCats.forEach(c => { GEN[c] = []; });

  // 单次遍历全库：不提前构造 33.7 万条全量 Map，也不对 28.3 万条专名做排序或对象拷贝
  for (let i = 0; i < FULL_TAGS.length; i++) {
    const row = FULL_TAGS[i];
    const name = row[0], cn = row[1], cat = row[2], pc = row[3];
    const k = tagKey(name);
    if (curatedKeys.has(k) && !curatedRows.has(k)) curatedRows.set(k, row);

    const forceCat = FORCE_CAT[name];
    if (forceCat) {
      if (SPEC_FORCED[forceCat]) SPEC_FORCED[forceCat].push(row);
      continue;
    }
    if (cat === 0) {
      if (/[(!]/.test(name) || AUTO_SKIP.has(name)) continue;
      const sp = name.replace(/_/g, ' ');
      for (let j = 0; j < autoCats.length; j++) {
        const c = autoCats[j];
        const ex = AUTO_EXCLUDE[c];
        if (ex && ex.test(name)) continue;
        if (AUTO_RE[c].test(sp)) GEN[c].push(row);
      }
    } else if (cat === 4) {
      SPEC['角色'].push(row);
    } else if (cat === 1) {
      SPEC['画师'].push(row);
    } else if (cat === 3) {
      SPEC['版权/作品'].push(row);
    }
  }

  // 1) 精选（翻译优先：人工补丁 > 数据库 > 英文原文）
  Object.entries(CURATED).forEach(([c, list]) => {
    list.forEach(en => {
      const k = tagKey(en);
      const row = curatedRows.get(k);
      catMap[c].push({
        en: row ? row[0] : en,
        zh: CURATED_ZH[en] || (row ? row[1] : null) || en,
        pc: row ? row[3] : 0
      });
    });
  });

  // 2) General 自动归类：按热度排序、去重、每类上限（完整版存 fullCat）
  const CAP = 2500;
  Object.entries(GEN).forEach(([c, pool]) => {
    const have = new Set(catMap[c].map(x => tagKey(x.en)));
    pool.sort((a, b) => b[3] - a[3]);
    for (let i = 0; i < pool.length; i++) {
      const row = pool[i];
      const k = tagKey(row[0]);
      if (!have.has(k)) {
        catMap[c].push({ en: row[0], zh: row[1], pc: row[3] });
        have.add(k);
      }
    }
    fullCat[c] = catMap[c].slice();
    if (catMap[c].length > CAP) catMap[c] = catMap[c].slice(0, CAP);
  });

  // 3) 角色/画师/版权：源数据已在构建期按 post_count DESC 排序，直接复用行引用，零拷贝零排序
  const SPECCAP = { '角色': 5000, '画师': 3000, '版权/作品': 3000 };
  Object.entries(SPEC).forEach(([c, pool]) => {
    const combined = SPEC_FORCED[c].length ? SPEC_FORCED[c].concat(pool) : pool;
    fullCat[c] = combined;
    catMap[c] = combined.slice(0, SPECCAP[c]);
  });

  // cat=5（meta）不整类展示，仅保留 CURATED 精选中的「来源 / 画质」「媒材 / 手绘」
  Object.keys(catMap).forEach(c => {
    if (!(c in fullCat)) fullCat[c] = catMap[c].slice();
  });

  // 4) 全部：所有分类合并去重，按热度取前 1000 条最常用
  ALL_TAGS = [];
  const seen = new Set();
  Object.keys(catMap).forEach(c => {
    const list = catMap[c];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const en = itemEn(t);
      if (!seen.has(en)) {
        seen.add(en);
        const pc = Array.isArray(t) ? t[3] : (t.pc || 0);
        ALL_TAGS.push({ en, zh: itemZh(t), pc });
      }
    }
  });
  ALL_TAGS.sort((a, b) => b.pc - a.pc);
  ALL_TAGS = ALL_TAGS.slice(0, 1000);
}

/* ============ 标签索引（惰性构建，统一替代 fullMap + matchMap）============ */
function buildTagIndex() {
  if (tagIndexReady) return matchMap;
  tagIndexReady = true;
  matchMap = new Map();
  const patches = new Map(Object.entries(CURATED_ZH).map(([en, zh]) => [tagKey(en), zh]));
  const add = (en, zh, cat = 0, pc = 0, zhRaw = null) => {
    const k = tagKey(en);
    if (matchMap.has(k)) return;
    matchMap.set(k, { en, zh: patches.get(k) || zh || en, cat, pc, zhRaw });
  };
  for (let i = 0; i < FULL_TAGS.length; i++) {
    const row = FULL_TAGS[i];
    add(row[0], row[1], row[2], row[3], row[1]);
  }
  Object.entries(CURATED_ZH).forEach(([en, zh]) => add(en, zh));
  Object.values(CURATED).flat().forEach(en => add(en, CURATED_ZH[en] || en));
  return matchMap;
}
function ensureTagIndex() { return tagIndexReady ? matchMap : buildTagIndex(); }

function addZhAlias(label, item) {
  const k = textKey(label);
  if (!k) return;
  let list = zhMatchMap.get(k);
  if (!list) { list = []; zhMatchMap.set(k, list); }
  if (!list.includes(item)) list.push(item);
}
function buildZhIndex() {
  if (zhIndexReady) return zhMatchMap;
  ensureTagIndex();
  zhIndexReady = true;
  zhMatchMap = new Map();
  punctuationAliases = new Map();
  matchMap.forEach(item => {
    addZhAlias(item.zhRaw ? item.zhRaw : item.zh, item);
    if (item.zhRaw && item.zh !== item.zhRaw) addZhAlias(item.zh, item);
  });
  const rank = (a, b) => b.pc - a.pc || (tagKey(a.en) < tagKey(b.en) ? -1 : tagKey(a.en) > tagKey(b.en) ? 1 : 0);
  zhMatchMap.forEach(list => { if (list.length > 1) list.sort(rank); });
  const addPunctuation = label => {
    if (!/[,，;；\n]/.test(label)) return;
    const k = textKey(label), first = k[0];
    if (!punctuationAliases.has(first)) punctuationAliases.set(first, new Set());
    punctuationAliases.get(first).add(k);
  };
  zhMatchMap.forEach((_, label) => addPunctuation(label));
  matchMap.forEach(item => addPunctuation(item.en.replace(/_/g, ' ')));
  punctuationAliases.forEach((labels, first) => {
    punctuationAliases.set(first, [...labels].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)));
  });
  return zhMatchMap;
}
function ensureZhIndex() { return zhIndexReady ? zhMatchMap : buildZhIndex(); }

function buildSearchIndex() {
  if (searchIndexReady) return searchIndex;
  ensureTagIndex();
  searchIndexReady = true;
  searchIndex = new Array(matchMap.size);
  let i = 0;
  matchMap.forEach(item => {
    if (!item.search) {
      item.enKey = tagKey(item.en);
      item.zhKey = textKey(item.zh);
      item.zhRawKey = textKey(item.zhRaw || '');
      item.search = item.enKey + '\0' + item.zhKey + '\0' + item.zhRawKey;
    }
    searchIndex[i++] = item;
  });
  return searchIndex;
}

/* ============ 渲染 ============ */
const allPillEl = document.getElementById('allPill');
const pillsEl = document.getElementById('pills');
const panelEl = document.getElementById('tagpanel');
const posOut = document.getElementById('posOut'), negOut = document.getElementById('negOut');
const posChips = document.getElementById('posChips'), negChips = document.getElementById('negChips');
const toastEl = document.getElementById('toast');

let selected = new Map();  // tagKey (or raw:literal) -> {en,zh,neg,w,raw?}; insertion order is prompt order.
let outputLanguage = 'en'; // 默认英文输出，不做持久化
let lastFormatted = { pos: '', neg: '' };
let activeCat = '__全部__';
let activeSub = '全部';
let catFull = false;
let libRendered = false;   // 惰性渲染标签库弹窗：首次打开时才创建 DOM
const CHUNK = 4000;
const subsEl = document.getElementById('subsRow');

function pillEl(label, count, active, onclick) {
  const p = document.createElement('button');
  p.className = 'pill' + (active ? ' active' : '');
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = label;
  p.appendChild(nm);
  if (count != null) {
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = count.toLocaleString();
    p.appendChild(n);
  }
  p.onclick = onclick;
  return p;
}
function renderPills() {
  allPillEl.innerHTML = '';
  pillsEl.innerHTML = '';
  allPillEl.appendChild(pillEl('全部', ALL_TAGS.length, activeCat === '__全部__',
    () => { activeCat = '__全部__'; activeSub = '全部'; catFull = false; renderPills(); renderSubs(); renderPanel(); }));
  const frag = document.createDocumentFragment();
  Object.keys(catMap).forEach(c => {
    const count = (fullCat[c] || catMap[c] || []).length;
    frag.appendChild(pillEl(c, count, c === activeCat,
      () => { activeCat = c; activeSub = '全部'; catFull = false; renderPills(); renderSubs(); renderPanel(); }));
  });
  pillsEl.appendChild(frag);
}
function renderSubs() {
  subsEl.innerHTML = '';
  const subs = SUBS[activeCat];
  if (!subs) return;
  const frag = document.createDocumentFragment();
  Object.keys(subs).forEach(s => {
    const b = document.createElement('button');
    b.className = 'sub-pill' + (s === activeSub ? ' active' : '');
    b.textContent = s;
    b.onclick = () => { activeSub = s; catFull = false; renderSubs(); renderPanel(); };
    frag.appendChild(b);
  });
  subsEl.appendChild(frag);
}

const SPEC_CATS = new Set(['角色', '画师', '版权/作品']);
function loadBar(...children) {
  const bar = document.createElement('div');
  bar.className = 'load-more-bar';
  children.forEach(c => bar.appendChild(c));
  return bar;
}
function loadBtn(text, onclick) {
  const b = document.createElement('button');
  b.className = 'load-more';
  b.textContent = text;
  b.onclick = onclick;
  return b;
}

function makeTag(t) {
  const en = itemEn(t), zh = itemZh(t);
  const kk = tagKey(en);
  const b = document.createElement('span');
  b.className = 'tag' + tagStateClassByKey(kk);
  b.dataset.en = en;
  b.dataset.zh = zh;
  b.dataset.key = kk;
  const zhSpan = document.createElement('span');
  zhSpan.className = 'zh';
  zhSpan.textContent = labelFor(en, zh);
  const enSpan = document.createElement('span');
  enSpan.className = 'en';
  enSpan.textContent = en.replace(/_/g, ' ');
  b.append(zhSpan, enSpan);
  return b;
}

// 事件委托：避免给数千/数万个 .tag 逐一绑定 onclick 闭包
panelEl.addEventListener('click', e => {
  const el = e.target.closest('.tag');
  if (!el || !panelEl.contains(el)) return;
  e.stopPropagation();
  const en = el.dataset.en, zh = el.dataset.zh, kk = el.dataset.key || tagKey(en);
  if (selected.has(kk)) selected.delete(kk);
  else selected.set(kk, { en, zh: labelFor(en, zh), neg: isNeg(en) });
  refresh();
});

function renderPanel() {
  panelEl.innerHTML = '';
  const isAll = activeCat === '__全部__';
  const subRe = SUBS_RE[activeCat]?.[activeSub] || null;
  const filterFn = subRe
    ? t => subRe.test(itemEn(t).replace(/_/g, ' '))
    : null;
  const isSpec = SPEC_CATS.has(activeCat);
  const rawFull = isAll ? ALL_TAGS : (fullCat[activeCat] || []);
  const fullItems = filterFn ? rawFull.filter(filterFn) : rawFull;
  const rawBase = isSpec ? (catMap[activeCat] || []) : rawFull;
  const items = isSpec ? (filterFn ? rawBase.filter(filterFn) : rawBase) : fullItems;

  if (!fullItems.length) {
    panelEl.innerHTML = '<div class="empty">这个分类下暂无标签，换个分类看看</div>';
    return;
  }
  if (isAll) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = '「全部」= 最常用的 1000 条；完整 ' + FULL_TAGS.length.toLocaleString() + ' 条请用页面上的搜索框查找';
    panelEl.appendChild(note);
  }
  const box = document.createElement('div');
  box.className = 'tags';
  panelEl.appendChild(box);

  if (isSpec && catFull) {
    let idx = 0;
    const step = () => {
      const frag = document.createDocumentFragment();
      const end = Math.min(idx + CHUNK, fullItems.length);
      for (let i = idx; i < end; i++) frag.appendChild(makeTag(fullItems[i]));
      box.appendChild(frag);
      idx = end;
      if (idx < fullItems.length) {
        const bar = loadBar();
        bar.appendChild(loadBtn('继续加载…（' + idx.toLocaleString() + ' / ' + fullItems.length.toLocaleString() + '）', () => { bar.remove(); step(); }));
        panelEl.appendChild(bar);
      } else {
        const close = loadBtn('收起至精选', () => { catFull = false; renderPanel(); });
        panelEl.appendChild(loadBar(document.createTextNode('已显示全部 ' + fullItems.length.toLocaleString() + ' 条'), close));
      }
    };
    step();
  } else {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < items.length; i++) frag.appendChild(makeTag(items[i]));
    box.appendChild(frag);
    if (isSpec && fullItems.length > items.length) {
      panelEl.appendChild(loadBar(loadBtn('加载全部 ' + fullItems.length.toLocaleString() + ' 条', () => { catFull = true; renderPanel(); })));
    }
  }
}

function entryKey(s) { return s.raw || !s.zh ? 'raw:' + s.en : tagKey(s.en); }
function labelFor(en, fallback) {
  if (tagIndexReady) {
    const item = matchMap.get(tagKey(en));
    if (item) return item.zh;
  }
  if (fallback) return fallback;
  return ensureTagIndex().get(tagKey(en))?.zh || zhFallback(en);
}
function tagStateClassByKey(kk) {
  const state = selected.get(kk);
  return state ? (state.neg ? ' neg-sel' : ' sel') : '';
}
function tagStateClass(en) { return tagStateClassByKey(tagKey(en)); }

function promptEntryText(s) {
  const label = s.raw || !s.zh ? s.en : (outputLanguage === 'zh' ? labelFor(s.en, s.zh) : s.en.replace(/_/g, ' '));
  const text = !s.raw && !!s.zh ? escapePromptLabel(label) : label;
  return s.w != null && s.w !== 1 ? `(${text}:${s.w})` : text;
}
function formatOutputs() {
  const entries = [...selected.values()], pos = entries.filter(s => !s.neg), neg = entries.filter(s => s.neg);
  lastFormatted = { pos: pos.map(promptEntryText).join(', '), neg: neg.map(promptEntryText).join(', ') };
  posOut.value = lastFormatted.pos;
  negOut.value = lastFormatted.neg;
  document.getElementById('posCnt').textContent = pos.length;
  document.getElementById('negCnt').textContent = neg.length;
  document.getElementById('posChipCnt').textContent = pos.length;
  document.getElementById('negChipCnt').textContent = neg.length;
  document.documentElement.dataset.outputLang = outputLanguage;
  const b = document.getElementById('outputLangBtn');
  b.textContent = '输出语言：' + (outputLanguage === 'zh' ? '中文' : 'English');
  b.setAttribute('aria-label', b.textContent + '，点击切换');
}
function toggleOutputLanguage() {
  outputLanguage = outputLanguage === 'zh' ? 'en' : 'zh';
  formatOutputs();
}

// 双击右侧胶囊：在左侧同一侧文本框里选中它对应的那一段，方便定位/微调。
function selectChipInPrompt(s) {
  const ta = s.neg ? negOut : posOut;
  const list = [...selected.values()].filter(x => !!x.neg === !!s.neg);
  const idx = list.findIndex(x => entryKey(x) === entryKey(s));
  if (idx < 0) return;
  const tokens = list.map(promptEntryText);
  let start = 0;
  for (let i = 0; i < idx; i++) start += tokens[i].length + 2;
  const token = tokens[idx];
  if (ta.value.slice(start, start + token.length) !== token) {
    const alt = ta.value.indexOf(token);
    if (alt < 0) return;
    start = alt;
  }
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(start, start + token.length);
  const ratio = start / Math.max(1, ta.value.length);
  ta.scrollTop = Math.max(0, ratio * (ta.scrollHeight - ta.clientHeight));
}

function syncTagStates(root) {
  root.querySelectorAll('.tag, .r-tag').forEach(el => {
    el.classList.remove('sel', 'neg-sel');
    const state = selected.get(el.dataset.key || tagKey(el.dataset.en));
    if (state) el.classList.add(state.neg ? 'neg-sel' : 'sel');
  });
}

function refresh() {
  if (libMask.classList.contains('open')) syncTagStates(panelEl);
  if (searchRes.classList.contains('show')) syncTagStates(searchRes);
  formatOutputs();
  renderChips(posChips, [...selected.values()].filter(s => !s.neg), false);
  renderChips(negChips, [...selected.values()].filter(s => s.neg), true);
  updateLibCount();
}

/* ===== 标签库弹窗 ===== */
const libMask = document.getElementById('libMask');
const openLibBtn = document.getElementById('openLibBtn'), libCount = document.getElementById('libCount');
function updateLibCount() {
  const n = selected.size;
  libCount.textContent = n ? '已选 ' + n + ' 个' : '';
  openLibBtn.textContent = n ? '选择标签 · ' + n : '选择标签';
}
function openLibrary() {
  if (!libRendered) {
    libRendered = true;
    renderPills();
    renderSubs();
    renderPanel();
  } else {
    syncTagStates(panelEl);
  }
  libMask.classList.add('open');
  updateLibCount();
  const cur = panelEl.querySelector('.tag.sel, .tag.neg-sel');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function closeLibrary() { libMask.classList.remove('open'); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (weightEditor) { closeWeightEditor(); return; }
  if (sorterMask.classList.contains('open')) { closeSorter(); return; }
  if (libMask.classList.contains('open')) closeLibrary();
});

/* ===== 批量 FLIP 动画（消除强制同步重排）===== */
function runFlipAnimation(elements, rects, container, duration) {
  const moves = [];
  for (let i = 0; i < elements.length; i++) {
    const x = elements[i];
    const o = rects.get(x);
    if (!o) continue;
    const n = x.getBoundingClientRect();
    const dx = o.left - n.left, dy = o.top - n.top;
    if (dx || dy) moves.push([x, dx, dy]);
  }
  if (!moves.length) return;
  for (let i = 0; i < moves.length; i++) {
    const [x, dx, dy] = moves[i];
    x.style.transition = 'none';
    x.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  void container.offsetWidth; // 全局只触发一次重排
  for (let i = 0; i < moves.length; i++) {
    const x = moves[i][0];
    x.style.transition = 'transform ' + duration + ' ease';
    x.style.transform = '';
  }
}

/* 拖动排序：主界面胶囊 */
let dragChip = null;
function moveChipPreview(container, target, before) {
  const chip = dragChip;
  if (!chip || chip.parentElement !== container || target === chip) return;
  const unchanged = target
    ? (before ? target.previousElementSibling === chip : target.nextElementSibling === chip)
    : container.lastElementChild === chip;
  if (unchanged) return;
  const siblings = [...container.querySelectorAll('.chip')].filter(x => x !== chip);
  const rects = new Map();
  siblings.forEach(x => rects.set(x, x.getBoundingClientRect()));
  if (target) before ? target.before(chip) : target.after(chip);
  else container.appendChild(chip);
  runFlipAnimation(siblings, rects, container, '.16s');
}
function commitChipOrder() {
  const posKeys = [...posChips.querySelectorAll('.chip')].map(c => c.dataset.key).filter(k => k && selected.has(k));
  const negKeys = [...negChips.querySelectorAll('.chip')].map(c => c.dataset.key).filter(k => k && selected.has(k));
  if (!posKeys.length && !negKeys.length) return;
  const seen = new Set(posKeys.concat(negKeys));
  selected.forEach((s, k) => { if (!seen.has(k)) (s.neg ? negKeys : posKeys).push(k); });
  const next = new Map();
  posKeys.forEach(k => next.set(k, selected.get(k)));
  negKeys.forEach(k => next.set(k, selected.get(k)));
  selected = next;
  refresh();
}
[posChips, negChips].forEach(container => {
  container.addEventListener('dragover', e => {
    if (!dragChip || dragChip.parentElement !== container) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const over = e.target instanceof Element ? e.target.closest('.chip') : null;
    if (over && over !== dragChip) {
      const r = over.getBoundingClientRect();
      const before = e.clientY > r.bottom ? false : e.clientY < r.top ? true : e.clientX <= r.left + r.width / 2;
      moveChipPreview(container, over, before);
    } else if (!over) {
      const chips = [...container.querySelectorAll('.chip')].filter(x => x !== dragChip);
      const last = chips[chips.length - 1];
      if (last) {
        const r = last.getBoundingClientRect();
        if (e.clientY > r.bottom || (e.clientY >= r.top && e.clientX > r.right)) moveChipPreview(container, null, false);
      }
    }
  });
  container.addEventListener('drop', e => { if (dragChip) e.preventDefault(); });
});

function renderChips(el, list, isNegSide) {
  el.innerHTML = '';
  if (!list.length) {
    const tip = document.createElement('div');
    tip.className = 'chips-empty';
    tip.textContent = isNegSide ? '暂无负面标签 · 负面词分类或点 ± 翻过来的标签会出现在这里' : '暂无标签 · 点右上角「选择标签」或在上方搜索框里挑';
    el.appendChild(tip);
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(s => {
    const raw = s.raw || !s.zh;
    const c = document.createElement('span');
    c.className = 'chip' + (isNegSide ? ' neg' : ' pos') + (raw ? ' raw' : '');
    const wBadge = s.w != null && s.w !== 1 ? `<span class="w" title="权重 ${s.w}">${s.w}</span>` : '';
    c.innerHTML = raw
      ? `<span class="x" title="点击切换正负">±</span><span class="en">${escHtml(s.en)}</span>${wBadge}<span class="raw-badge" title="未匹配到数据库，保留原文">?</span><span class="x del" title="删除该提示词">×</span>`
      : `<span class="x" title="点击切换正负">±</span><span class="zh">${escHtml(labelFor(s.en, s.zh))}</span><span class="en">${escHtml(s.en.replace(/_/g, ' '))}</span>${wBadge}<span class="x del" title="删除该提示词">×</span>`;
    c.draggable = true;
    c.dataset.key = entryKey(s);
    if (s.zh) c.oncontextmenu = e => { e.preventDefault(); showWeightEditor(c, s); };
    c.addEventListener('dblclick', e => { if (e.target.closest('.x')) return; selectChipInPrompt(s); });
    c.querySelector('.x:not(.del)').onclick = e => { e.stopPropagation(); const s2 = selected.get(entryKey(s)); if (s2) { s2.neg = !s2.neg; refresh(); } };
    c.querySelector('.x.del').onclick = e => { e.stopPropagation(); selected.delete(entryKey(s)); refresh(); };
    c.addEventListener('dragstart', e => { dragChip = c; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.en); c.classList.add('dragging'); });
    c.addEventListener('dragend', () => { c.classList.remove('dragging'); if (dragChip === c) dragChip = null; commitChipOrder(); });
    frag.appendChild(c);
  });
  el.appendChild(frag);
}

let weightEditor = null;
function closeWeightEditor() {
  if (weightEditor) { weightEditor.remove(); weightEditor = null; }
}
function showWeightEditor(chip, s, opts) {
  const options = typeof opts === 'function' ? { onDone: opts } : (opts || {});
  closeWeightEditor();
  const ed = document.createElement('div');
  ed.className = 'w-edit';
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'w-input'; input.value = String(s.w ?? 1); input.title = '只认阿拉伯数字，Enter 确认';
  const dec = document.createElement('button'); dec.className = 'w-step'; dec.textContent = '−';
  const inc = document.createElement('button'); inc.className = 'w-step'; inc.textContent = '+';
  const rst = document.createElement('button'); rst.className = 'w-reset'; rst.textContent = '重置';
  input.oninput = () => { input.value = input.value.replace(/[^\d.]/g, ''); };
  const step = d => {
    const n = parseFloat(input.value), v = Number.isFinite(n) ? n : 1;
    input.value = String(Math.max(0, Math.round((v + d) * 100) / 100));
  };
  dec.onclick = () => step(-0.1);
  inc.onclick = () => step(0.1);
  rst.onclick = () => { input.value = '1'; apply(); };
  const apply = () => {
    const v = input.value.trim();
    if (!/^\d+(\.\d+)?$/.test(v) || !Number.isFinite(Number(v))) { flash('✗ 权重只认阿拉伯数字', true); return; }
    const n = parseFloat(v);
    const nextW = (n === 1) ? null : Math.round(n * 100) / 100;
    if (nextW !== (s.w ?? null)) {
      if (options.beforeApply) options.beforeApply();
      s.w = nextW;
      if (!options.skipMainRefresh) refresh();
      if (options.onDone) options.onDone();
    }
    closeWeightEditor();
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); apply(); }
    else if (e.key === 'Escape') { e.stopPropagation(); closeWeightEditor(); }
  };
  ed.append(dec, input, inc, rst);
  document.body.appendChild(ed);
  const r = chip.getBoundingClientRect();
  const edW = ed.offsetWidth || 168, edH = ed.offsetHeight || 34;
  ed.style.left = Math.max(4, Math.min(r.left, innerWidth - edW - 4)) + 'px';
  const top = r.bottom + 4 + edH > innerHeight ? Math.max(4, r.top - edH - 4) : r.bottom + 4;
  ed.style.top = top + 'px';
  input.focus(); input.select();
  weightEditor = ed;
  ed.__apply = apply;
}
document.addEventListener('click', e => {
  if (weightEditor && !e.target.closest('.w-edit')) {
    const f = weightEditor.__apply;
    if (f) f();
  }
});

/* ============ 提示词回填识别：粘贴/输入 → 自动识别成胶囊 ============ */
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function resolveTag(text) {
  ensureZhIndex();
  const plain = unescapePromptLabel(text);
  const en = matchMap.get(tagKey(plain));
  if (en) return en;
  const candidates = zhMatchMap.get(textKey(plain));
  if (!candidates) return null;
  return candidates.find(item => selected.has(tagKey(item.en))) || candidates[0];
}
function syncFromText(text, isNegBox) {
  if (text === lastFormatted[isNegBox ? 'neg' : 'pos']) return;
  ensureZhIndex();
  const entries = parsePromptEntries(text, isNegBox, resolveTag, punctuationAliases);
  const editedKeys = new Set(entries.map(entryKey));
  const newMap = new Map();
  let inserted = false;
  const insert = () => { entries.forEach(item => newMap.set(entryKey(item), item)); inserted = true; };
  selected.forEach((item, key) => {
    if (item.neg === isNegBox) { if (!inserted) insert(); }
    else if (!editedKeys.has(key)) newMap.set(key, item);
  });
  if (!inserted) insert();
  selected = newMap;
  refresh();
}
[posOut, negOut].forEach((el, i) => {
  let timer = null;
  const sync = () => { clearTimeout(timer); syncFromText(el.value, i === 1); };
  el.addEventListener('blur', sync);
  el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(sync, 600); });
});

/* ============ 排序整理：按分类自动分组，或手动建组归类，应用时只改顺序 ============ */
const sorterMask = document.getElementById('sorterMask');
const sorterBody = document.getElementById('sorterBody');
const sorterPreview = document.getElementById('sorterPreview');
const sorterStat = document.getElementById('sorterStat');
const sorterUndoBtn = document.getElementById('sorterUndo');
const sorterSideEl = document.getElementById('sorterSide');
const SORTER_CATS = Object.keys(CURATED).concat(['角色', '画师', '版权/作品']);
const SORTER_CURATED_CAT = new Map();
Object.entries(CURATED).forEach(([c, list]) => list.forEach(en => {
  const k = tagKey(en);
  if (!SORTER_CURATED_CAT.has(k)) SORTER_CURATED_CAT.set(k, c);
}));
let sorter = null, sorterSeq = 0;

function sorterCategoryOf(en) {
  const k = tagKey(en);
  const curated = SORTER_CURATED_CAT.get(k);
  if (curated) return curated;
  const sp = String(en).replace(/_/g, ' ');
  for (const c of Object.keys(AUTO)) {
    const ex = AUTO_EXCLUDE[c];
    if (ex && ex.test(en)) continue;
    if (AUTO_RE[c].test(sp)) return c;
  }
  const item = ensureTagIndex().get(k);
  if (item) {
    if (item.cat === 4) return '角色';
    if (item.cat === 1) return '画师';
    if (item.cat === 3) return '版权/作品';
  }
  return '其他';
}
function sorterNextId() { return 'g' + (++sorterSeq); }
function sorterFixedGroup() { return sorter ? sorter.groups.find(g => g.fixed) : null; }
function sorterPushHistory() {
  if (!sorter) return;
  sorter.history.push({
    groups: sorter.groups.map(g => ({ id: g.id, name: g.name, fixed: !!g.fixed, keys: g.keys.slice() })),
    items: new Map([...sorter.items].map(([k, s]) => [k, { ...s }]))
  });
  if (sorter.history.length > 30) sorter.history.shift();
}
function sorterFlatKeys() { return sorter ? sorter.groups.flatMap(g => g.keys) : []; }
function sorterCurrentKeys() {
  if (!sorter) return [];
  if (sorter.drag && sorter.drag.isConnected) {
    const out = [];
    sorterBody.querySelectorAll('.s-lane-chips').forEach(lane => lane.querySelectorAll('.s-chip').forEach(c => {
      if (c.dataset.key) out.push(c.dataset.key);
    }));
    return out;
  }
  return sorterFlatKeys();
}
function sorterTextOf(key) {
  const s = sorter && sorter.items.get(key);
  if (!s) return String(key).replace(/^raw:/, '');
  return promptEntryText(s);
}
function sorterUpdateMeta() {
  if (!sorter) return;
  const keys = sorterCurrentKeys();
  sorterSideEl.textContent = (sorter.side === 'pos' ? '正面' : '负面') + ' · ' + keys.length + ' 个';
  sorterPreview.textContent = keys.length ? keys.map(sorterTextOf).join(', ') : '（当前没有标签）';
  const groups = sorter.groups.filter(g => !g.fixed).length;
  sorterStat.textContent = keys.length + ' 个标签 · ' + (groups ? groups + ' 个分组 + 未分组' : '未分组');
  sorterUndoBtn.disabled = !sorter.history.length;
}
function renderSorter() {
  if (!sorter) return;
  const scroll = sorterBody.scrollTop || 0;
  sorterBody.innerHTML = sorter.groups.map((g, gi) => {
    const chips = g.keys.map(k => {
      const s = sorter.items.get(k);
      if (!s) return '';
      const raw = s.raw || !s.zh;
      const zh = raw ? s.en : labelFor(s.en, s.zh);
      const en = s.en.replace(/_/g, ' ');
      const showEn = !raw && en.toLowerCase() !== String(zh).toLowerCase();
      const wBadge = s.w != null && s.w !== 1 ? `<span class="w" title="权重 ${s.w}">${s.w}</span>` : '';
      return `<span class="s-chip ${s.neg ? 'neg' : 'pos'}${raw ? ' raw' : ''}" draggable="true" data-key="${escHtml(k)}"${raw ? ' title="未识别，保留原文；双击可改文本"' : ' title="双击改文本，右键设权重"'}>
        <span class="s-zh">${escHtml(zh)}</span>${showEn ? `<span class="s-en">${escHtml(en)}</span>` : ''}${wBadge}
        <span class="s-ops"><button class="s-chip-btn" data-act="edit" title="编辑标签文本（双击）">✎</button><button class="s-chip-btn danger" data-act="del" title="删除该标签（应用后生效）">×</button></span>
      </span>`;
    }).join('');
    const head = g.fixed
      ? `<span class="s-fixed">${escHtml(g.name)}</span>`
      : `<input class="s-lane-name" value="${escHtml(g.name)}" maxlength="24" spellcheck="false" aria-label="分组名称">`;
    const acts = g.fixed ? '' : `<span class="s-acts">
        <button class="s-lane-btn" data-act="up" title="上移分组"${gi === 0 ? ' disabled' : ''}>↑</button>
        <button class="s-lane-btn" data-act="down" title="下移分组"${gi === sorter.groups.length - 2 ? ' disabled' : ''}>↓</button>
        <button class="s-lane-btn danger" data-act="del" title="删除分组，标签回到未分组">×</button>
      </span>`;
    return `<div class="s-lane" data-gid="${escHtml(g.id)}">
      <div class="s-lane-head">${head}<span class="s-count">${g.keys.length}</span>${acts}</div>
      <div class="s-lane-chips">${chips || '<span class="s-empty">拖标签到这里</span>'}</div>
    </div>`;
  }).join('');
  sorterBody.scrollTop = scroll;
  sorterUpdateMeta();
}
function openSorter(side) {
  const items = new Map();
  selected.forEach((s, k) => { if ((s.neg ? 'neg' : 'pos') === side) items.set(k, { ...s }); });
  sorter = { side, items, groups: [{ id: 'unassigned', name: '未分组', fixed: true, keys: [...items.keys()] }], history: [], drag: null };
  sorterMask.classList.add('open');
  sorterBody.scrollTop = 0;
  renderSorter();
}
function closeSorter() {
  closeWeightEditor();
  sorterMask.classList.remove('open');
  sorter = null;
}
function sorterAutoGroup() {
  if (!sorter) return;
  if (!sorter.items.size) { flash('当前这一侧还没有标签'); return; }
  sorterPushHistory();
  const buckets = new Map();
  sorterFlatKeys().forEach(k => {
    const s = sorter.items.get(k);
    if (!s) return;
    const cat = (s.raw || !s.zh) ? '其他' : sorterCategoryOf(s.en);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat).push(k);
  });
  const other = (buckets.get('其他') || []).slice();
  const lanes = [];
  SORTER_CATS.forEach(c => {
    const keys = buckets.get(c);
    if (keys && keys.length) lanes.push({ id: sorterNextId(), name: c, keys: keys.slice() });
  });
  buckets.forEach((keys, c) => { if (c !== '其他' && !SORTER_CATS.includes(c)) other.push(...keys); });
  lanes.push({ id: 'unassigned', name: '未分组', fixed: true, keys: other });
  sorter.groups = lanes;
  renderSorter();
}
function sorterAddGroup() {
  if (!sorter) return;
  sorterPushHistory();
  const g = { id: sorterNextId(), name: '分组 ' + (sorter.groups.length), keys: [] };
  sorter.groups.splice(Math.max(0, sorter.groups.length - 1), 0, g);
  renderSorter();
  const inp = sorterBody.querySelector('.s-lane[data-gid="' + g.id + '"] .s-lane-name');
  if (inp) { inp.focus(); inp.select(); inp.scrollIntoView({ block: 'nearest' }); }
}
function sorterDeleteGroup(gid) {
  if (!sorter) return;
  const g = sorter.groups.find(x => x.id === gid);
  if (!g || g.fixed) return;
  sorterPushHistory();
  const fixed = sorterFixedGroup();
  if (fixed) fixed.keys.push(...g.keys);
  sorter.groups = sorter.groups.filter(x => x !== g);
  renderSorter();
}
function sorterMoveGroup(gid, dir) {
  if (!sorter) return;
  const i = sorter.groups.findIndex(g => g.id === gid);
  const g = sorter.groups[i];
  if (!g || g.fixed) return;
  const j = i + dir;
  if (j < 0 || j >= sorter.groups.length - 1) return;
  sorterPushHistory();
  sorter.groups.splice(i, 1);
  sorter.groups.splice(j, 0, g);
  renderSorter();
}
function sorterMergeGroups() {
  if (!sorter) return;
  sorterPushHistory();
  sorter.groups = [{ id: 'unassigned', name: '未分组', fixed: true, keys: sorterFlatKeys() }];
  renderSorter();
}
function sorterResetWeights() {
  if (!sorter) return;
  let count = 0;
  sorter.items.forEach(s => { if (s.w != null && s.w !== 1) count++; });
  if (!count) { flash('✓ 当前窗口没有自定义权重'); return; }
  sorterPushHistory();
  sorter.items.forEach(s => { if (s.w != null && s.w !== 1) s.w = null; });
  renderSorter();
  flash('✓ 已重置 ' + count + ' 个标签的权重（应用后生效）');
}
function sorterUndo() {
  if (!sorter || !sorter.history.length) return;
  const prev = sorter.history.pop();
  sorter.groups = prev.groups;
  sorter.items = prev.items;
  renderSorter();
}
function sorterSyncFromDom() {
  if (!sorter) return;
  const seen = new Set();
  sorter.groups.forEach(g => {
    const lane = sorterBody.querySelector('.s-lane[data-gid="' + g.id + '"] .s-lane-chips');
    const keys = [];
    if (lane) lane.querySelectorAll('.s-chip').forEach(c => {
      const k = c.dataset.key;
      if (!k || seen.has(k) || !sorter.items.has(k)) return;
      seen.add(k); keys.push(k);
    });
    g.keys = keys;
  });
  sorter.items.forEach((s, k) => { if (!seen.has(k)) { const f = sorterFixedGroup(); if (f) f.keys.push(k); } });
}
function sorterMoveChip(chip, container, target, before) {
  if (!sorter || !chip) return;
  if (container === chip.parentElement) {
    const unchanged = target
      ? (before ? target.previousElementSibling === chip : target.nextElementSibling === chip)
      : container.lastElementChild === chip;
    if (unchanged) return;
  }
  const allChips = [...sorterBody.querySelectorAll('.s-chip')].filter(x => x !== chip);
  const rects = new Map();
  allChips.forEach(x => rects.set(x, x.getBoundingClientRect()));
  container.querySelectorAll('.s-empty').forEach(x => x.remove());
  if (target) before ? target.before(chip) : target.after(chip);
  else container.appendChild(chip);
  runFlipAnimation(allChips, rects, sorterBody, '.15s');
  sorterUpdateMeta();
}
function applySorter() {
  if (!sorter) return;
  const side = sorter.side, items = sorter.items;
  sorterSyncFromDom();
  const keys = sorterFlatKeys().filter(k => items.has(k));
  const next = new Map();
  keys.forEach(k => next.set(k, items.get(k)));
  selected.forEach((s, k) => { if ((s.neg ? 'neg' : 'pos') !== side) next.set(k, s); });
  selected = next;
  closeSorter();
  refresh();
  flash('✓ 已写回 ' + keys.length + ' 个' + (side === 'pos' ? '正面' : '负面') + '标签');
}
function sorterEditChip(key) {
  if (!sorter) return;
  const s = sorter.items.get(key);
  const chip = [...sorterBody.querySelectorAll('.s-chip')].find(c => c.dataset.key === key);
  if (!s || !chip || chip.classList.contains('editing')) return;
  const old = s.en;
  chip.classList.add('editing');
  chip.draggable = false;
  chip.innerHTML = '';
  const inp = document.createElement('input');
  inp.className = 's-edit-input'; inp.value = old; inp.spellcheck = false;
  chip.appendChild(inp);
  inp.focus(); inp.select();
  let done = false;
  const finish = commit => {
    if (done) return;
    done = true;
    const val = inp.value.trim();
    if (commit && val && val !== old) sorterRenameChip(key, val);
    else renderSorter();
  };
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
  inp.addEventListener('click', e => e.stopPropagation());
}
function sorterRenameChip(oldKey, text) {
  if (!sorter) return;
  const old = sorter.items.get(oldKey);
  if (!old) return;
  const hit = resolveTag(text);
  const entry = hit
    ? { en: hit.en, zh: hit.zh, neg: old.neg, w: old.w }
    : { en: text, zh: null, raw: true, neg: old.neg, w: old.w };
  const newKey = entryKey(entry);
  if (newKey === oldKey) { renderSorter(); return; }
  if (sorter.items.has(newKey)) { flash('✗ 已有同名标签', true); renderSorter(); return; }
  sorterPushHistory();
  sorter.items.delete(oldKey);
  sorter.items.set(newKey, entry);
  sorter.groups.forEach(g => { g.keys = g.keys.map(k => k === oldKey ? newKey : k); });
  renderSorter();
}
function sorterDeleteChip(key) {
  if (!sorter || !sorter.items.has(key)) return;
  sorterPushHistory();
  sorter.items.delete(key);
  sorter.groups.forEach(g => {
    const i = g.keys.indexOf(key);
    if (i >= 0) g.keys.splice(i, 1);
  });
  renderSorter();
}
sorterBody.addEventListener('click', e => {
  if (!sorter) return;
  const op = e.target.closest('.s-chip-btn');
  if (op) {
    e.preventDefault(); e.stopPropagation();
    const chip = op.closest('.s-chip');
    const key = chip && chip.dataset.key;
    if (op.dataset.act === 'edit') sorterEditChip(key);
    else if (op.dataset.act === 'del') sorterDeleteChip(key);
    return;
  }
  const btn = e.target.closest('.s-lane-btn');
  if (!btn) return;
  const lane = btn.closest('.s-lane');
  if (!lane) return;
  const gid = lane.dataset.gid;
  if (btn.dataset.act === 'up') sorterMoveGroup(gid, -1);
  else if (btn.dataset.act === 'down') sorterMoveGroup(gid, 1);
  else if (btn.dataset.act === 'del') sorterDeleteGroup(gid);
});
sorterBody.addEventListener('dblclick', e => {
  if (!sorter || e.target.closest('.s-chip-btn')) return;
  const chip = e.target.closest('.s-chip');
  if (chip) sorterEditChip(chip.dataset.key);
});
sorterBody.addEventListener('contextmenu', e => {
  if (!sorter) return;
  const chip = e.target.closest('.s-chip');
  if (!chip) return;
  const s = sorter.items.get(chip.dataset.key);
  if (!s || s.raw || !s.zh) return;
  e.preventDefault();
  showWeightEditor(chip, s, {
    beforeApply: sorterPushHistory,
    onDone: () => { if (sorter) renderSorter(); },
    skipMainRefresh: true
  });
});
sorterBody.addEventListener('input', e => {
  const inp = e.target.closest('.s-lane-name');
  if (!inp || !sorter) return;
  const lane = inp.closest('.s-lane');
  const g = lane && sorter.groups.find(x => x.id === lane.dataset.gid);
  if (g) g.name = inp.value;
});
sorterBody.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('s-lane-name')) { e.preventDefault(); e.target.blur(); }
});
sorterBody.addEventListener('dragstart', e => {
  if (e.target.closest('.s-chip-btn,.s-edit-input')) { e.preventDefault(); return; }
  const chip = e.target.closest('.s-chip');
  if (!sorter || !chip) return;
  sorter.drag = chip;
  chip.classList.add('dragging');
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', chip.dataset.key || ''); }
});
sorterBody.addEventListener('dragend', e => {
  if (!sorter) return;
  const chip = e.target.closest('.s-chip');
  if (chip) chip.classList.remove('dragging');
  sorterSyncFromDom();
  sorter.drag = null;
  renderSorter();
});
sorterBody.addEventListener('dragover', e => {
  if (!sorter || !sorter.drag) return;
  const laneChips = e.target.closest('.s-lane-chips');
  if (!laneChips) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  const over = e.target.closest('.s-chip');
  if (over && over !== sorter.drag) {
    const r = over.getBoundingClientRect();
    const sameRow = e.clientY >= r.top && e.clientY <= r.bottom;
    const before = sameRow ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    sorterMoveChip(sorter.drag, over.parentElement, over, before);
  } else if (!over) {
    const chips = [...laneChips.querySelectorAll('.s-chip')].filter(x => x !== sorter.drag);
    const last = chips[chips.length - 1];
    if (!last) { sorterMoveChip(sorter.drag, laneChips, null, false); return; }
    const r = last.getBoundingClientRect();
    if (e.clientY > r.bottom || (e.clientY >= r.top && e.clientX > r.right)) sorterMoveChip(sorter.drag, laneChips, null, false);
  }
});
sorterBody.addEventListener('drop', e => {
  if (sorter && sorter.drag) e.preventDefault();
});

/* ============ 全局搜索（防抖 + IME 合成保护 + 相关性分桶 + 键盘导航）============ */
const searchIn = document.getElementById('search'), searchRes = document.getElementById('searchRes');
let searchResults = [];
let searchActiveIdx = -1;
let searchComposing = false;
let searchTimer = null;

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderSearch, 90);
}
searchIn.addEventListener('compositionstart', () => { searchComposing = true; });
searchIn.addEventListener('compositionend', () => { searchComposing = false; scheduleSearch(); });
searchIn.addEventListener('input', () => { if (!searchComposing) scheduleSearch(); });
searchIn.addEventListener('focus', () => { if (searchIn.value.trim()) renderSearch(); });

function setSearchActive(idx) {
  const rows = searchRes.querySelectorAll('.r-tag');
  if (!rows.length) { searchActiveIdx = -1; return; }
  searchActiveIdx = ((idx % rows.length) + rows.length) % rows.length;
  rows.forEach((el, i) => el.classList.toggle('active', i === searchActiveIdx));
  rows[searchActiveIdx].scrollIntoView({ block: 'nearest' });
}
function pickSearchItem(el) {
  if (!el) return;
  const en = el.dataset.en, k = el.dataset.key || tagKey(en);
  if (selected.has(k)) selected.delete(k);
  else selected.set(k, { en, zh: labelFor(en), neg: isNeg(en) });
  refresh();
  searchIn.value = '';
  searchRes.classList.remove('show');
  searchActiveIdx = -1;
}

searchIn.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    searchRes.classList.remove('show');
    searchActiveIdx = -1;
    searchIn.blur();
    return;
  }
  if (!searchRes.classList.contains('show') || !searchResults.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setSearchActive(searchActiveIdx < 0 ? 0 : searchActiveIdx + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setSearchActive(searchActiveIdx <= 0 ? searchResults.length - 1 : searchActiveIdx - 1);
  } else if (e.key === 'Enter' && !searchComposing) {
    e.preventDefault();
    const rows = searchRes.querySelectorAll('.r-tag');
    pickSearchItem(rows[searchActiveIdx >= 0 ? searchActiveIdx : 0]);
  }
});

function renderSearch() {
  const q = tagKey(searchIn.value);
  if (!q) { searchRes.classList.remove('show'); searchResults = []; searchActiveIdx = -1; return; }
  const idx = buildSearchIndex();
  const exact = [], prefix = [], sub = [];
  const LIMIT = 60;
  for (let i = 0; i < idx.length; i++) {
    const item = idx[i];
    if (!item.search.includes(q)) continue;
    if (item.enKey === q || item.zhKey === q || item.zhRawKey === q) {
      exact.push(item);
    } else if (item.enKey.startsWith(q) || item.zhKey.startsWith(q) || item.zhRawKey.startsWith(q)) {
      if (exact.length + prefix.length < LIMIT) prefix.push(item);
    } else if (sub.length < LIMIT) {
      sub.push(item);
    }
    if (exact.length >= LIMIT) break;
  }
  searchResults = exact.concat(prefix, sub).slice(0, LIMIT);
  searchActiveIdx = -1;
  searchRes.innerHTML = searchResults.map(({ en, zh, enKey }) =>
    `<div class="r-tag${tagStateClassByKey(enKey)}" role="option" data-en="${escHtml(en)}" data-key="${escHtml(enKey)}"><span class="zh">${escHtml(zh)}</span><span class="en">${escHtml(en.replace(/_/g, ' '))}</span></div>`
  ).join('') || '<div class="empty">无匹配</div>';
  searchRes.classList.add('show');
  layoutSearchResults();
}

function layoutSearchResults() {
  const r = searchIn.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.bottom > innerHeight) { searchRes.classList.remove('show'); return; }
  const w = Math.min(r.width, 520);
  searchRes.style.width = w + 'px';
  searchRes.style.left = Math.max(6, Math.min(r.left, innerWidth - w - 6)) + 'px';
  searchRes.style.top = Math.round(r.bottom + 4) + 'px';
  searchRes.style.maxHeight = Math.max(140, Math.min(480, innerHeight * 0.58, innerHeight - r.bottom - 16)) + 'px';
}
const topbarEl = document.querySelector('.topbar');
if (topbarEl) topbarEl.addEventListener('scroll', () => { if (searchRes.classList.contains('show')) layoutSearchResults(); }, { passive: true });
window.addEventListener('resize', () => { if (searchRes.classList.contains('show')) layoutSearchResults(); });

searchRes.addEventListener('click', e => {
  pickSearchItem(e.target.closest('.r-tag'));
});
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.search')) searchRes.classList.remove('show');
});

/* ============ 复制（含 file:// 降级兜底） / 悬浮提示 / 清未识别 ============ */
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}
function copyText(text, okMsg) {
  if (!text) return;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text)
      .then(() => flash(okMsg))
      .catch(() => { const ok = fallbackCopy(text); flash(ok ? okMsg : '✗ 复制失败，请手动 Ctrl+C', !ok); });
  } else {
    const ok = fallbackCopy(text);
    flash(ok ? okMsg : '✗ 复制失败，请手动 Ctrl+C', !ok);
  }
}
function copyPos() { copyText(posOut.value, '✓ 正面已复制'); }
function copyNeg() { copyText(negOut.value, '✓ 负面已复制'); }

let flashTimer = null;
function flash(msg, isErr = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('err', isErr || msg.startsWith('✗'));
  toastEl.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function clearUnmatched(isNegSide) {
  const keys = [];
  selected.forEach((s, k) => { if (s.neg === isNegSide && (s.raw || !s.zh)) keys.push(k); });
  keys.forEach(k => selected.delete(k));
  refresh();
  flash(keys.length ? `✓ 已清理${isNegSide ? '负面' : '正面'}区 ${keys.length} 个未识别标签` : `✓ ${isNegSide ? '负面' : '正面'}区没有未识别标签`);
}
function resetWeights(isNegSide) {
  let count = 0;
  selected.forEach(s => {
    if (!!s.neg === isNegSide && s.w != null && s.w !== 1) {
      s.w = null;
      count++;
    }
  });
  if (!count) {
    flash(`✓ ${isNegSide ? '负面' : '正面'}区没有自定义权重`);
    return;
  }
  refresh();
  flash(`✓ 已重置${isNegSide ? '负面' : '正面'}区 ${count} 个标签的权重`);
}

/* ============ 启动 ============ */
buildCats();
refresh();
const META_TEXT = '全量 ' + FULL_TAGS.length.toLocaleString() + ' 标签';
document.getElementById('meta').textContent = META_TEXT;

/* 首帧出来后在空闲时段预热匹配索引：点第一个标签或回填时不用等 33.7 万条建表。 */
const warmTagIndex = () => { if (!tagIndexReady) buildTagIndex(); };
if (typeof requestIdleCallback === 'function') requestIdleCallback(warmTagIndex, { timeout: 1500 });
else setTimeout(warmTagIndex, 120);

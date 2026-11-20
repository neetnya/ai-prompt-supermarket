/* ============ 标识符归一化、括号转义与提示词回填解析（纯函数，可独立单测）============ */

// tagKey 是标签唯一身份：忽略大小写，连续下划线与空白折叠为单个空格；保留连字符、括号等字符。
export const tagKey = s => String(s).trim().toLowerCase().replace(/[_\s]+/g, ' ');
export const textKey = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
export const separator = ch => /[,，;；\n]/.test(ch);

// Danbooru/WebUI 把裸括号当成权重语法，所以标签名里的括号输出时写成 \( \)，
// 回填时再把 \( \) \\ 还原成真实字符。
export function escapePromptLabel(label) {
  return String(label).replace(/[\\()]/g, '\\$&');
}
export function unescapePromptLabel(label) {
  return String(label).replace(/\\([\\()])/g, '$1');
}

/**
 * 扫描提示词文本并切分为 token 数组：
 * - 正确处理反斜杠转义 \( \) 与括号权重嵌套深度
 * - 优先消费 punctuationAliases 中含分隔符的最长已知标签名
 */
export function parsePromptTokens(text, punctuationAliases) {
  const out = [];
  let start = 0, depth = 0, escaped = false, atStart = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // 反斜杠转义：\( 和 \) 是标签名里的字面括号，不参与括号深度/权重判定。
    if (escaped) { escaped = false; atStart = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    // 把分隔符切分前，先尝试消费含标点的最长已知名称。
    if (atStart && !/\s/.test(ch) && punctuationAliases) {
      atStart = false;
      const aliases = punctuationAliases.get(ch.toLowerCase()) || [];
      const alias = aliases.find(
        name => text.slice(i, i + name.length).toLowerCase() === name &&
          (i + name.length === text.length || separator(text[i + name.length]))
      );
      if (alias) { i += alias.length - 1; continue; }
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (separator(ch) && depth === 0) {
      const token = text.slice(start, i).trim();
      if (token) out.push(token);
      start = i + 1;
      atStart = true;
    }
  }
  const token = text.slice(start).trim();
  if (token) out.push(token);
  return out;
}

/**
 * 解析 WebUI / NAI 权重语法：
 * - (tag:1.2) -> { base: 'tag', w: 1.2 }
 * - (tag)     -> { base: 'tag', w: 1.1 }
 * - 忽略转义括号 \(tag\)，避免误判为权重包裹
 */
export function parseWeight(tok) {
  const m = tok.match(/^\(([\s\S]+):(\d+(?:\.\d+)?)\)$/);
  if (m && Number.isFinite(Number(m[2]))) return { base: m[1].trim(), w: Number(m[2]) };
  // 兼容 WebUI/NAI 纯括号加权写法 (tag) → 1.1 倍
  const bare = tok.match(/^\(([\s\S]+)\)$/);
  if (bare) {
    let d = 0, paired = true, esc = false;
    for (let i = 0; i < tok.length - 1; i++) {
      if (esc) { esc = false; continue; }
      if (tok[i] === '\\') { esc = true; continue; }
      if (tok[i] === '(') d++;
      else if (tok[i] === ')' && --d <= 0) { paired = false; break; }
    }
    if (paired && d === 1) return { base: bare[1].trim(), w: 1.1 };
  }
  return null;
}

export function parsePromptEntries(text, isNegBox, resolveTagFn, punctuationAliases) {
  const out = [];
  const add = (label, w) => {
    const item = resolveTagFn(label);
    const weight = w === 1 ? null : w;
    out.push(
      item
        ? { en: item.en, zh: item.zh, neg: isNegBox, w: weight }
        : { en: unescapePromptLabel(label), zh: null, raw: true, neg: isNegBox, w: weight }
    );
  };
  const parse = (token, weight = null) => {
    const exact = resolveTagFn(token);
    if (exact) { add(token, weight); return; }
    const pw = parseWeight(token);
    if (pw) {
      const w = Math.round(((weight ?? 1) * pw.w) * 100) / 100;
      parsePromptTokens(pw.base, punctuationAliases).forEach(part => parse(part, w));
    } else {
      add(token, weight);
    }
  };
  parsePromptTokens(text, punctuationAliases).forEach(token => parse(token));
  return out;
}

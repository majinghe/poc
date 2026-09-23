/**
 * PDF 模板：把用户填写的数据渲染为打印版式 HTML（交由 headless Chrome 转 PDF）。
 * 版式贴近原《RustFS 对象存储 PoC 调研表》：标题页眉信息 + 分节表格 + 勾选清单。
 */
'use strict';
const S = require('../public/js/schema.js');
const { SCHEMA, getPath, rowPath, prefixed } = S;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const EMPTY = '<span class="empty">—</span>';

function txt(v) {
  if (v === undefined || v === null || String(v).trim() === '') return EMPTY;
  return esc(String(v)).replace(/\n/g, '<br/>');
}

/* 字段标签：去掉占位符尾部的冒号，统一渲染成「标签：值」 */
function labelOf(ph) {
  return String(ph || '').replace(/[：:]\s*$/, '');
}

/* 标签+值 换行时保持整段不拆开 */
function nb(s) {
  return '<span class="nb">' + s + '</span>';
}

/* 行内复合字段：把「路数：2　核数：12」这类带标签的小控件拼出来，空值不显示 */
function joinFields(items, rowP, data) {
  const parts = [];
  (items || []).forEach((f) => {
    if (f.t === 'static') { parts.push(esc(f.v)); return; }
    const p = rowP + '.' + f.k;
    if (f.t === 'text' || f.t === 'textarea') {
      const v = getPath(data, p);
      if (v === undefined || v === null || String(v).trim() === '') return;
      const lb = labelOf(f.ph);
      parts.push(nb(lb ? esc(lb) + '：' + txt(v) : txt(v)));
      return;
    }
    parts.push(nb(renderControlPdf(f, p, data)));
  });
  return parts.join('　');
}

/* 控件取值展示 */
function renderControlPdf(def, basePath, data) {
  switch (def.t) {
    case 'static':
      return esc(def.v);
    case 'index':
      return ''; // 由行渲染时填入序号
    case 'text':
    case 'textarea':
      return txt(getPath(data, basePath));
    case 'check':
      return (getPath(data, basePath) === true ? '☑' : '☐') + (def.label ? ' ' + esc(def.label) : '');
    case 'radio': {
      const cur = getPath(data, basePath);
      const parts = (def.opts || []).map((o) => {
        let s = (cur === o.v ? '☑' : '☐') + esc(o.v);
        (o.fields || []).forEach((f) => {
          const fv = getPath(data, basePath + '__' + f.k);
          if (fv !== undefined && String(fv).trim() !== '') s += '：' + txt(fv);
        });
        return s;
      });
      return parts.join('　') || EMPTY;
    }
    case 'checks': {
      const cur = getPath(data, basePath);
      const sel = Array.isArray(cur) ? cur : [];
      const parts = (def.opts || []).map((o) => {
        let s = (sel.indexOf(o.v) >= 0 ? '☑' : '☐') + esc(o.v);
        (o.fields || []).forEach((f) => {
          const fv = getPath(data, basePath + '__' + f.k);
          if (fv !== undefined && String(fv).trim() !== '') s += '：' + txt(fv);
        });
        return s;
      });
      return parts.join('　');
    }
    case 'fields': {
      const parent = basePath.split('.').slice(0, -1).join('.');
      return joinFields(def.items, parent, data);
    }
    default:
      return '';
  }
}

/* ---------------- 各类型块 ---------------- */
function renderTablePdf(block, prefix, data) {
  const blockId = prefixed(prefix, block.id);
  let h = '<div class="block">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  if (block.note) h += '<p class="note">' + esc(block.note) + '</p>';
  h += '<table><thead><tr>';
  block.columns.forEach((c) => {
    h += '<th' + (c.w ? ' style="width:' + esc(c.w) + '"' : '') + '>' + esc(c.label) + '</th>';
  });
  h += '</tr></thead><tbody>';

  let rows;
  if (block.addable) {
    const arr = getPath(data, blockId);
    const n = Math.max(Array.isArray(arr) ? arr.length : 0, block.minRows || 1);
    rows = [];
    for (let i = 0; i < n; i++) rows.push({ cells: block.rowTemplate, idx: i });
  } else {
    rows = (block.rows || []).map((r, i) => ({ cells: r.cells, key: r.key, idx: i }));
  }

  rows.forEach((row) => {
    const rp = rowPath(blockId, row.key ? { key: row.key } : null, row.idx);
    h += '<tr>';
    row.cells.forEach((cell) => {
      h += '<td>';
      if (cell.t === 'index') {
        h += String(row.idx + 1);
      } else if (cell.t === 'fields') {
        h += joinFields(cell.items, rp, data) || EMPTY;
      } else {
        h += renderControlPdf(cell, cell.k ? rp + '.' + cell.k : '', data);
      }
      h += '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

function renderChecksPdf(block, prefix, data) {
  const blockId = prefixed(prefix, block.id);
  let h = '<div class="block">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  if (block.note) h += '<p class="note">' + esc(block.note) + '</p>';
  h += '<ul class="checks' + (block.cols === 2 ? ' cols-2' : '') + '">';
  (block.items || []).forEach((item) => {
    const on = getPath(data, blockId + '.' + item.key) === true;
    let line = (on ? '☑' : '☐') + ' ' + esc(item.label);
    const fparts = [];
    (item.fields || []).forEach((f) => {
      const fv = getPath(data, blockId + '.' + item.key + '__' + f.k);
      if (fv === undefined || fv === null || String(fv).trim() === '') return;
      const lb = labelOf(f.ph);
      fparts.push(nb(lb ? esc(lb) + '：' + txt(fv) : txt(fv)));
    });
    if (fparts.length) line += '　' + fparts.join('；');
    h += '<li>' + line + '</li>';
  });
  h += '</ul>';
  if (block.tail && block.tail.length) {
    h += '<p class="tail">';
    h += block.tail.map((f) => {
      if (f.t === 'static') return esc(f.v);
      if (f.t === 'fields') return renderControlPdf(f, blockId + '.placeholder', data);
      const fv = getPath(data, blockId + '.' + f.k);
      const lb = labelOf(f.ph || f.k);
      return lb ? esc(lb) + '：' + txt(fv) : txt(fv);
    }).join('　');
    h += '</p>';
  }
  h += '</div>';
  return h;
}

function renderRadiosPdf(block, prefix, data) {
  const blockId = prefixed(prefix, block.id);
  let h = '<div class="block">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  h += '<p class="qline">';
  if (block.label) h += '<b>' + esc(block.label) + '</b> ';
  const cur = getPath(data, blockId + '.value');
  h += (block.items || []).map((o) => {
    let s = (cur === o.v ? '☑' : '☐') + esc(o.v);
    (o.fields || []).forEach((f) => {
      const fv = getPath(data, blockId + '.value__' + f.k);
      if (fv !== undefined && String(fv).trim() !== '') s += '：' + txt(fv);
    });
    return s;
  }).join('　');
  h += '</p>';
  if (block.tail && block.tail.length) {
    h += '<p class="tail">' + block.tail.map((f) => {
      if (f.t === 'fields') return renderControlPdf(f, blockId + '.placeholder', data);
      const lb = labelOf(f.ph || f.k);
      const fv = txt(getPath(data, blockId + '.' + f.k));
      return lb ? esc(lb) + '：' + fv : fv;
    }).join('　') + '</p>';
  }
  h += '</div>';
  return h;
}

function renderListTextPdf(block, prefix, data) {
  const blockId = prefixed(prefix, block.id);
  let h = '<div class="block">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  if (block.note) h += '<p class="note">' + esc(block.note) + '</p>';
  h += '<ol class="listtext">';
  for (let i = 0; i < (block.count || 3); i++) {
    h += '<li>' + txt(getPath(data, blockId + '.' + i)) + '</li>';
  }
  h += '</ol></div>';
  return h;
}

function renderFieldsPdf(block, prefix, data) {
  const blockId = prefixed(prefix, block.id);
  let h = '<div class="block">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  h += '<table class="kv"><tbody>';
  (block.items || []).forEach((f) => {
    h += '<tr><th>' + esc(f.label || '') + '</th><td>' +
      renderControlPdf(Object.assign({}, f, { label: '' }), blockId + '.' + f.k, data) + '</td></tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

function renderParaPdf(block) {
  let h = '<div class="block para">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  (block.lines || []).forEach((l) => { h += '<p>' + esc(l) + '</p>'; });
  h += '</div>';
  return h;
}

function renderGroupPdf(block, prefix, data) {
  const groupPath = prefixed(prefix, block.id);
  const insts = getPath(data, groupPath);
  const n = Math.max(Array.isArray(insts) ? insts.length : 0, block.min || 1);
  let h = '<div class="block">';
  if (block.title) h += '<h3>' + esc(block.title) + '</h3>';
  for (let i = 0; i < n; i++) {
    h += '<div class="group"><div class="group-h">节点类型 #' + (i + 1) + '</div>';
    block.blocks.forEach((b) => { h += renderBlockPdf(b, groupPath + '.' + i, data); });
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function renderBlockPdf(block, prefix, data) {
  switch (block.type) {
    case 'table': return renderTablePdf(block, prefix, data);
    case 'checks': return renderChecksPdf(block, prefix, data);
    case 'radios': return renderRadiosPdf(block, prefix, data);
    case 'listtext': return renderListTextPdf(block, prefix, data);
    case 'fields': return renderFieldsPdf(block, prefix, data);
    case 'para': return renderParaPdf(block);
    case 'group': return renderGroupPdf(block, prefix, data);
    default: return '';
  }
}

/* ---------------- 整页 ---------------- */
function buildHtml(data) {
  const meta = getPath(data, 'docmeta') || {};
  const gv = (row, k) => {
    const v = meta[row] && meta[row][k];
    return v === undefined || v === null ? '' : String(v);
  };

  let body = '';
  body += '<div class="cover">';
  body += '<h1 class="doc-title">' + esc(SCHEMA.docTitle) + '</h1>';
  body += '<p class="doc-sub">' + esc(SCHEMA.docSubtitle) + '</p>';
  body += '<table class="kv meta"><tbody>';
  body += '<tr><th>文档版本</th><td>' + txt(gv('version', 'v')) + '</td><th>填写日期</th><td>' + txt(gv('date', 'v')) + '</td></tr>';
  body += '<tr><th>客户名称</th><td>' + txt(gv('customer', 'v')) + '</td><th>项目编号</th><td>' + txt(gv('project_no', 'v')) + '</td></tr>';
  body += '<tr><th>销售负责人</th><td>' + txt(gv('sales', 'v')) + '</td><th>售前负责人</th><td>' + txt(gv('presale', 'v')) + '</td></tr>';
  body += '<tr><th>文档状态</th><td colspan="3">' +
    renderControlPdf({ t: 'radio', k: 'v', opts: ['草稿', '客户初填', '售前复核', '已确认'].map((v) => ({ v })) },
      'docmeta.status.v', data) + '</td></tr>';
  body += '</tbody></table>';
  body += '<div class="toc-pdf"><b>目录</b><ul>' +
    SCHEMA.toc.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></div>';
  body += '</div>';

  SCHEMA.sections.forEach((sec) => {
    if (sec.id === 'meta') return; // 文档属性已在封面展示
    body += '<div class="sec">';
    body += '<h2>' + esc((/^\d+$/.test(sec.num) ? sec.num + '. ' : sec.num === '填写说明' ? '' : sec.num + '：') + sec.title) +
      (sec.required ? '<span class="req">【必填】</span>' : '') + '</h2>';
    if (sec.note) body += '<p class="note">' + esc(sec.note) + '</p>';
    sec.blocks.forEach((b) => { body += renderBlockPdf(b, '', data); });
    body += '</div>';
  });

  body += '<p class="doc-end">' + esc(SCHEMA.docEnd) + '</p>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${esc(SCHEMA.docTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Songti SC", serif;
    color: #1a1f29; font-size: 10.5pt; line-height: 1.5; margin: 0;
  }
  h1.doc-title { font-size: 20pt; text-align: center; margin: 8pt 0 4pt; letter-spacing: 1px; }
  p.doc-sub { text-align: center; color: #55627a; margin: 0 0 14pt; font-size: 10.5pt; }
  h2 {
    font-size: 13pt; border-left: 4px solid #c8552b; padding-left: 8px;
    margin: 12pt 0 6pt; page-break-after: avoid;
  }
  h2 .req { font-size: 8.5pt; color: #a0421f; font-weight: normal; margin-left: 6px; }
  h3 { font-size: 11pt; margin: 8pt 0 4pt; page-break-after: avoid; }
  .block { margin-bottom: 8pt; }
  .note { color: #55627a; font-size: 9.5pt; margin: 2pt 0 4pt; }
  table { width: 100%; border-collapse: collapse; margin: 3pt 0 6pt; page-break-inside: auto; }
  th, td { border: .6pt solid #9aa5b5; padding: 3.5pt 5pt; vertical-align: top; text-align: left; }
  thead th { background: #eef2f7; font-weight: 600; }
  tbody th { background: #f6f8fb; width: 30%; font-weight: 600; }
  tr { page-break-inside: avoid; }
  table.kv th { width: 26%; }
  table.meta th { width: 16%; }
  table.meta td { width: 34%; }
  ul.checks { list-style: none; margin: 4pt 0; padding: 0 2pt; }
  ul.checks li { margin: 2.5pt 0; }
  ul.checks.cols-2 { column-count: 2; column-gap: 18pt; }
  p.tail { background: #f6f8fb; border: .6pt dashed #b7c0cd; padding: 4pt 8pt; margin: 5pt 0; }
  p.qline { margin: 5pt 0; }
  ol.listtext { margin: 4pt 0; padding-left: 18pt; }
  ol.listtext li { margin: 3pt 0; min-height: 14pt; }
  .para p { margin: 3pt 0; color: #3c465a; font-size: 9.8pt; }
  .group { border: .8pt solid #9aa5b5; border-radius: 4pt; padding: 6pt 8pt; margin: 6pt 0; page-break-inside: avoid; }
  .group-h { font-weight: 600; color: #a0421f; margin-bottom: 4pt; }
  .cover { page-break-after: always; }
  .toc-pdf { margin-top: 14pt; font-size: 9.5pt; }
  .toc-pdf ul { columns: 2; column-gap: 20pt; padding-left: 14pt; list-style: none; margin: 4pt 0 0; }
  .toc-pdf li { margin: 1.5pt 0; color: #3c465a; }
  .empty { color: #b7c0cd; }
  .nb { white-space: nowrap; }
  .doc-end { text-align: center; color: #8a93a5; font-size: 9pt; margin-top: 10pt; page-break-inside: avoid; }
  .sec { page-break-inside: auto; }
</style>
</head>
<body>${body}</body>
</html>`;
}

module.exports = { buildHtml };

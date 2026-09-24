/**
 * PDF 模板：把用户填写的数据渲染为打印版式 HTML（浏览器与 Node 共用）。
 *   buildParts(data) → { css, body }   浏览器端离屏排版（html2pdf）
 *   buildHtml(data)  → 完整 HTML 文档  Node 端 headless Chrome 转 PDF / 打印
 * 版式：封面（Logo + 元信息 + 目录）+ 分节表格 + 勾选清单；配色与 RustFS 品牌一致。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./schema.js'));
  } else {
    root.RustFSPdfTemplate = factory(root.RustFSSchema);
  }
}(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';
  const { SCHEMA, getPath, rowPath, prefixed } = S;

  /* RustFS Logo（官网素材，蓝 #0062FF），以 data URI 内嵌便于双端渲染 */
  const LOGO_SVG = '<svg width="360" height="61" viewBox="0 0 360 61" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M297.728 26.0884H267.978V13.5036H291.604L293.453 0H248.164V60.077H267.978V37.663H299.68L297.728 26.0884Z" fill="#0062FF"></path><path d="M244.61 13.5036V0H182.311V13.5036H203.599V60.077H223.414V13.5036H244.61Z" fill="#0062FF"></path><path d="M120.385 41.3843V0L105.128 3.46598V37.2015C105.128 41.8515 104.461 44.6294 102.477 46.6752C100.494 48.8142 96.8898 49.5635 92.5416 49.5635C88.0409 49.5635 84.7418 48.7211 82.6058 46.6752C80.6223 44.7223 80.0311 40.6031 80.0311 36.0462V0L64.6982 3.46598V40.5474C64.6982 48.0801 67.063 53.0092 71.5637 55.7991C76.0644 58.589 82.93 60.077 92.5416 60.077C101.772 60.077 108.637 58.589 113.291 55.7991C118.02 53.0092 120.385 48.1732 120.385 41.3843Z" fill="#0062FF"></path><path d="M39.9374 19.4745C39.9374 22.5978 38.8765 24.8943 36.6031 26.1804C34.6328 27.3746 31.6772 28.0176 27.888 28.2013V37.663C30.0099 37.8467 31.9046 38.3978 33.3444 40.7863L42.6655 60.077H61.2323L52.0627 41.7048C49.2588 35.8258 46.5306 34.5397 41.3016 33.1618C49.0314 31.9677 55.776 27.3746 55.776 16.9024C55.776 12.3094 54.033 6.98144 50.547 4.13374C47.1369 1.28605 42.514 0 36.8304 0H27.888V11.207H29.4793C32.8644 11.207 35.4917 11.8807 37.3607 13.228C39.1039 14.514 39.9374 16.535 39.9374 19.4745ZM27.888 28.2013C27.5345 28.2013 27.2059 28.2013 26.903 28.2013H15.8385V11.207H27.888V0H0V60.077H16.2933V37.663H25.5387C26.2966 37.663 27.2059 37.663 27.888 37.663V28.2013Z" fill="#0062FF"></path><path d="M178.845 41.4293C178.845 37.162 177.152 33.428 173.765 30.4942C170.556 27.6493 164.525 25.4563 155.671 23.9153C152.997 23.3817 150.591 23.0262 148.63 22.4928C135.528 19.5589 137.399 12.1799 150.323 12.1799C157.275 12.1799 163.96 14.3136 170.556 15.4693C171.537 15.6472 171.893 15.736 171.982 15.736L173.408 2.93384C166.456 0.800138 158.256 0 151.126 0C142.48 0 135.795 1.51137 131.071 4.44521C126.347 7.37905 123.852 13.3356 123.852 19.0255C123.852 23.9153 125.634 27.6493 129.378 30.4942C133.032 33.1614 139.628 35.295 149.165 36.9841C152.106 37.5176 154.513 37.8732 156.384 38.4065C158.286 38.9401 159.682 39.4438 160.573 39.9179C162.267 40.8071 163.158 42.1406 163.158 43.563C163.158 45.43 162.089 46.8525 159.95 47.8306C153.621 50.8531 135.795 48.9861 128.665 45.7856L125.634 57.2543C126.436 57.3433 127.773 57.6099 129.378 57.8766C142.48 59.9215 159.593 62.5885 171.269 55.2096C176.26 52.0979 178.845 47.6526 178.845 41.4293Z" fill="#0062FF"></path><path d="M360 41.492C360 37.059 358.249 33.3354 354.841 30.4983C351.525 27.7205 345.291 25.563 336.14 24.0264C333.285 23.4945 330.888 22.9625 328.769 22.6078C328.677 22.6078 328.585 22.6078 328.585 22.5192V25.9768L314.49 17.377L328.585 8.8658V12.2348C329.199 12.2348 329.844 12.2348 330.519 12.2348C337.705 12.2348 344.616 14.4513 351.525 15.6038C352.447 15.6925 352.814 15.6925 352.907 15.6925L354.381 2.92573C347.287 0.88658 338.719 0 331.348 0C322.413 0 315.504 1.50719 310.804 4.52156C305.737 7.53595 303.158 13.3874 303.158 19.1502C303.158 24.0264 305.092 27.75 308.87 30.4098C312.738 33.2469 319.557 35.3745 329.322 37.059C331.348 37.3252 333.007 37.5911 334.481 37.9456L334.666 34.8426L348.299 43.9745L334.022 51.9537L334.112 49.2052C325.729 49.8258 313.66 48.3186 308.133 45.7475L305.092 57.1845C305.829 57.3618 307.211 57.4505 308.87 57.8937C322.413 59.9328 340.101 62.5926 352.169 55.1454C357.422 52.1309 360 47.5207 360 41.492Z" fill="#0062FF"></path></svg>';
  const LOGO_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(LOGO_SVG);

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

  /* ---------------- 正文（封面 + 各章节） ---------------- */
  function buildBody(data) {
    const meta = getPath(data, 'docmeta') || {};
    const gv = (row, k) => {
      const v = meta[row] && meta[row][k];
      return v === undefined || v === null ? '' : String(v);
    };

    let body = '';
    body += '<div class="cover">';
    body += '<img class="doc-logo" src="' + LOGO_URI + '" alt="RustFS" />';
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
    return body;
  }

  /* ---------------- 打印样式 ---------------- */
  const PRINT_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Songti SC", serif;
    color: #1a1f29; font-size: 10.5pt; line-height: 1.5; margin: 0;
  }
  .doc-logo { display: block; margin: 0 auto 6pt; height: 30pt; }
  h1.doc-title { font-size: 20pt; text-align: center; margin: 8pt 0 4pt; letter-spacing: 1px; }
  p.doc-sub { text-align: center; color: #55627a; margin: 0 0 14pt; font-size: 10.5pt; }
  h2 {
    font-size: 13pt; border-left: 4px solid #0062ff; padding-left: 8px;
    margin: 12pt 0 6pt; page-break-after: avoid;
  }
  h2 .req { font-size: 8.5pt; color: #0052d6; font-weight: normal; margin-left: 6px; }
  h3 { font-size: 11pt; margin: 8pt 0 4pt; page-break-after: avoid; }
  .block { margin-bottom: 8pt; }
  .note { color: #55627a; font-size: 9.5pt; margin: 2pt 0 4pt; }
  table { width: 100%; border-collapse: collapse; margin: 3pt 0 6pt; page-break-inside: auto; }
  th, td { border: .6pt solid #9aa5b5; padding: 3.5pt 5pt; vertical-align: top; text-align: left; }
  thead th { background: #e8f0ff; font-weight: 600; }
  tbody th { background: #f5f8ff; width: 30%; font-weight: 600; }
  tr { page-break-inside: avoid; }
  table.kv th { width: 26%; }
  table.meta th { width: 16%; }
  table.meta td { width: 34%; }
  ul.checks { list-style: none; margin: 4pt 0; padding: 0 2pt; }
  ul.checks li { margin: 2.5pt 0; }
  ul.checks.cols-2 { column-count: 2; column-gap: 18pt; }
  p.tail { background: #f5f8ff; border: .6pt dashed #b7c0cd; padding: 4pt 8pt; margin: 5pt 0; }
  p.qline { margin: 5pt 0; }
  ol.listtext { margin: 4pt 0; padding-left: 18pt; }
  ol.listtext li { margin: 3pt 0; min-height: 14pt; }
  .para p { margin: 3pt 0; color: #3c465a; font-size: 9.8pt; }
  .group { border: .8pt solid #9aa5b5; border-radius: 4pt; padding: 6pt 8pt; margin: 6pt 0; page-break-inside: avoid; }
  .group-h { font-weight: 600; color: #0052d6; margin-bottom: 4pt; }
  .cover { page-break-after: always; }
  .toc-pdf { margin-top: 14pt; font-size: 9.5pt; }
  .toc-pdf ul { columns: 2; column-gap: 20pt; padding-left: 14pt; list-style: none; margin: 4pt 0 0; }
  .toc-pdf li { margin: 1.5pt 0; color: #3c465a; }
  .empty { color: #b7c0cd; }
  .nb { white-space: nowrap; }
  .doc-end { text-align: center; color: #8a93a5; font-size: 9pt; margin-top: 10pt; page-break-inside: avoid; }
  .sec { page-break-inside: auto; }
`;

  function buildParts(data) {
    return { css: PRINT_CSS, body: buildBody(data) };
  }

  function buildHtml(data) {
    const parts = buildParts(data);
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${esc(SCHEMA.docTitle)}</title>
<style>${parts.css}</style>
</head>
<body>${parts.body}</body>
</html>`;
  }

  return { buildHtml, buildParts };
}));

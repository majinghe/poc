/**
 * 表单渲染器：将 schema 渲染为可填写 DOM。
 * 所有控件携带 data-path（点分路径，动态行为数组下标），提交时按路径收集为嵌套对象。
 */
(function () {
  'use strict';
  const S = RustFSSchema;
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------------- 控件 ---------------- */
  // 渲染单个控件 def，basePath 为其值所在路径
  function renderControl(def, basePath) {
    switch (def.t) {
      case 'static':
        return el('span', 'cell-static', esc(def.v));
      case 'index':
        return el('span', 'cell-idx', '#');
      case 'text': {
        const i = el('input', 'inp');
        i.type = 'text';
        i.placeholder = def.ph || '';
        i.dataset.path = basePath;
        if (def.def) i.value = def.def;
        return i;
      }
      case 'textarea': {
        const i = el('textarea', 'inp inp-area');
        i.placeholder = def.ph || '';
        i.rows = 2;
        i.dataset.path = basePath;
        if (def.def) i.value = def.def;
        return i;
      }
      case 'check': {
        const wrap = el('label', 'ck');
        const i = el('input');
        i.type = 'checkbox';
        i.dataset.path = basePath;
        i.dataset.kind = 'one';
        wrap.appendChild(i);
        if (def.label) wrap.appendChild(el('span', '', esc(def.label)));
        return wrap;
      }
      case 'radio': {
        const wrap = el('span', 'radio-group');
        (def.opts || []).forEach((o) => {
          const lab = el('label', 'rd');
          const i = el('input');
          i.type = 'radio';
          i.name = 'r_' + basePath;
          i.value = o.v;
          i.dataset.path = basePath;
          lab.appendChild(i);
          lab.appendChild(el('span', '', esc(o.v)));
          wrap.appendChild(lab);
          (o.fields || []).forEach((f) => {
            const fw = el('span', 'opt-field');
            fw.appendChild(renderControl(f, basePath + '__' + f.k));
            wrap.appendChild(fw);
          });
        });
        return wrap;
      }
      case 'checks': {
        const wrap = el('span', 'radio-group');
        (def.opts || []).forEach((o) => {
          const lab = el('label', 'ck');
          const i = el('input');
          i.type = 'checkbox';
          i.value = o.v;
          i.dataset.path = basePath;
          i.dataset.kind = 'many';
          lab.appendChild(i);
          lab.appendChild(el('span', '', esc(o.v)));
          wrap.appendChild(lab);
          (o.fields || []).forEach((f) => {
            const fw = el('span', 'opt-field');
            fw.appendChild(renderControl(f, basePath + '__' + f.k));
            wrap.appendChild(fw);
          });
        });
        return wrap;
      }
      case 'fields': {
        const wrap = el('span', 'inline-fields');
        (def.items || []).forEach((f) => {
          const w = el('span', 'inline-field');
          if (f.ph) w.appendChild(el('span', 'inline-ph', esc(f.ph)));
          // fields 内子项与所在行平级命名：basePath 即行路径，取 f.k 作为键
          const parent = basePath.split('.').slice(0, -1).join('.');
          w.appendChild(renderControl(f, (parent ? parent + '.' : '') + f.k));
          wrap.appendChild(w);
        });
        return wrap;
      }
      default:
        return el('span', '', '');
    }
  }

  /* ---------------- 表格 ---------------- */
  function renderTable(block, prefix) {
    const wrap = el('div', 'block block-table');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    if (block.note) wrap.appendChild(el('p', 'block-note', esc(block.note)));
    const scroll = el('div', 'table-scroll');
    const table = el('table', 'tbl');
    const thead = el('thead');
    const trh = el('tr');
    block.columns.forEach((c) => {
      const th = el('th', '', esc(c.label));
      if (c.w) th.style.width = c.w;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el('tbody');
    table.appendChild(tbody);
    scroll.appendChild(table);
    wrap.appendChild(scroll);

    const blockId = S.prefixed(prefix, block.id);

    function rowEl(row, idx) {
      const tr = el('tr');
      tr.dataset.row = String(idx);
      const rowP = S.rowPath(blockId, row, idx);
      const cells = row ? row.cells : block.rowTemplate;
      const seed = (block.seed && block.seed[idx]) || {};
      cells.forEach((cell) => {
        const td = el('td', 'cell');
        if (cell.t === 'fields') {
          const inner = el('span', 'inline-fields');
          (cell.items || []).forEach((f) => {
            const w = el('span', 'inline-field');
            if (f.t === 'static') {
              w.appendChild(renderControl(f, ''));
            } else {
              const def = (seed[f.k] !== undefined && (f.t === 'text' || f.t === 'textarea'))
                ? Object.assign({}, f, { def: seed[f.k] }) : f;
              w.appendChild(renderControl(def, rowP + '.' + f.k));
            }
            inner.appendChild(w);
          });
          td.appendChild(inner);
        } else if (cell.t === 'static') {
          td.appendChild(renderControl(cell, ''));
        } else {
          let def = cell;
          if (seed[cell.k] !== undefined && (cell.t === 'text' || cell.t === 'textarea')) {
            def = Object.assign({}, cell, { def: seed[cell.k] });
          }
          td.appendChild(renderControl(def, rowP + '.' + cell.k));
        }
        tr.appendChild(td);
      });
      return tr;
    }

    function renumber() {
      const rows = Array.from(tbody.children);
      rows.forEach((tr, i) => {
        tr.dataset.row = String(i);
        tr.querySelectorAll('.cell-idx').forEach((n) => { n.textContent = String(i + 1); });
        tr.querySelectorAll('[data-path]').forEach((n) => {
          n.dataset.path = n.dataset.path.replace(/^(.+?\.)(\d+)(\.|$)/, (m, a, _b, c) => a + i + c);
        });
      });
    }

    // 初始行：具名行 或 minRows 行
    if (block.addable) {
      const n = block.minRows || 5;
      for (let i = 0; i < n; i++) tbody.appendChild(rowEl(null, i));
    } else {
      (block.rows || []).forEach((row, i) => tbody.appendChild(rowEl(row, i)));
    }
    renumber();

    if (block.addable) {
      const bar = el('div', 'row-actions');
      const addBtn = el('button', 'btn btn-ghost btn-sm', esc(block.addLabel || '＋ 添加行'));
      addBtn.type = 'button';
      addBtn.addEventListener('click', () => {
        const idx = tbody.children.length;
        tbody.appendChild(rowEl(null, idx));
        renumber();
      });
      const delBtn = el('button', 'btn btn-ghost btn-sm', '－ 删除末行');
      delBtn.type = 'button';
      delBtn.addEventListener('click', () => {
        if (tbody.children.length <= 1) return;
        tbody.removeChild(tbody.lastElementChild);
        renumber();
      });
      bar.appendChild(addBtn);
      bar.appendChild(delBtn);
      wrap.appendChild(bar);
    }
    return wrap;
  }

  /* ---------------- checks 清单 ---------------- */
  function renderChecks(block, prefix) {
    const wrap = el('div', 'block block-checks');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    if (block.note) wrap.appendChild(el('p', 'block-note', esc(block.note)));
    const list = el('div', 'check-list' + (block.cols === 2 ? ' cols-2' : ''));
    const blockId = S.prefixed(prefix, block.id);
    (block.items || []).forEach((item) => {
      const row = el('label', 'check-row');
      const i = el('input');
      i.type = 'checkbox';
      i.dataset.path = blockId + '.' + item.key;
      i.dataset.kind = 'one';
      row.appendChild(i);
      row.appendChild(el('span', 'check-label', esc(item.label)));
      (item.fields || []).forEach((f) => {
        row.appendChild(renderControl(f, blockId + '.' + item.key + '__' + f.k));
      });
      list.appendChild(row);
    });
    wrap.appendChild(list);
    if (block.tail && block.tail.length) {
      const tail = el('div', 'block-tail');
      block.tail.forEach((f) => {
        const w = el('span', 'inline-field');
        if (f.t === 'static') {
          w.appendChild(el('span', 'tail-static', esc(f.v)));
        } else if (f.t === 'fields') {
          tail.appendChild(renderControl(f, blockId + '.placeholder'));
        } else {
          w.appendChild(el('span', 'inline-ph', esc(f.ph || '')));
          w.appendChild(renderControl(f, blockId + '.' + f.k));
        }
        if (w.childNodes.length) tail.appendChild(w);
      });
      wrap.appendChild(tail);
    }
    return wrap;
  }

  /* ---------------- radios 单选 ---------------- */
  function renderRadios(block, prefix) {
    const wrap = el('div', 'block block-radios');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    const row = el('div', 'radio-row');
    if (block.label) row.appendChild(el('span', 'radio-label', esc(block.label)));
    const blockId = S.prefixed(prefix, block.id);
    const group = el('span', 'radio-group');
    (block.items || []).forEach((o) => {
      const lab = el('label', 'rd');
      const i = el('input');
      i.type = 'radio';
      i.name = 'r_' + blockId;
      i.value = o.v;
      i.dataset.path = blockId + '.value';
      lab.appendChild(i);
      lab.appendChild(el('span', '', esc(o.v)));
      group.appendChild(lab);
      (o.fields || []).forEach((f) => {
        const fw = el('span', 'opt-field');
        fw.appendChild(renderControl(f, blockId + '.value__' + f.k));
        group.appendChild(fw);
      });
    });
    row.appendChild(group);
    wrap.appendChild(row);
    if (block.tail && block.tail.length) {
      const tail = el('div', 'block-tail');
      block.tail.forEach((f) => {
        if (f.t === 'fields') {
          tail.appendChild(renderControl(f, blockId + '.placeholder'));
          return;
        }
        const w = el('span', 'inline-field');
        if (f.t === 'static') {
          w.appendChild(el('span', 'tail-static', esc(f.v)));
        } else {
          w.appendChild(el('span', 'inline-ph', esc(f.ph || '')));
          w.appendChild(renderControl(f, blockId + '.' + f.k));
        }
        tail.appendChild(w);
      });
      wrap.appendChild(tail);
    }
    return wrap;
  }

  /* ---------------- 编号填写行 ---------------- */
  function renderListText(block, prefix) {
    const wrap = el('div', 'block block-list');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    if (block.note) wrap.appendChild(el('p', 'block-note', esc(block.note)));
    const blockId = S.prefixed(prefix, block.id);
    for (let i = 0; i < (block.count || 3); i++) {
      const row = el('div', 'list-row');
      row.appendChild(el('span', 'list-no', (i + 1) + '.'));
      const inp = el('input', 'inp');
      inp.type = 'text';
      inp.dataset.path = blockId + '.' + i;
      row.appendChild(inp);
      wrap.appendChild(row);
    }
    return wrap;
  }

  /* ---------------- 标签 + 控件 ---------------- */
  function renderFields(block, prefix) {
    const wrap = el('div', 'block block-fields');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    const blockId = S.prefixed(prefix, block.id);
    (block.items || []).forEach((f) => {
      const row = el('div', 'field-row');
      row.appendChild(el('label', 'field-label', esc(f.label || '')));
      const ctl = el('div', 'field-ctl');
      ctl.appendChild(renderControl(Object.assign({}, f, { label: '' }), blockId + '.' + f.k));
      row.appendChild(ctl);
      wrap.appendChild(row);
    });
    return wrap;
  }

  /* ---------------- 静态段落 ---------------- */
  function renderPara(block) {
    const wrap = el('div', 'block block-para');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    (block.lines || []).forEach((l) => wrap.appendChild(el('p', 'para-line', esc(l))));
    return wrap;
  }

  /* ---------------- 可重复组 ---------------- */
  function renderGroup(block, prefix) {
    const wrap = el('div', 'block block-group');
    if (block.title) wrap.appendChild(el('h3', 'block-title', esc(block.title)));
    const body = el('div', 'group-body');
    wrap.appendChild(body);
    const groupPath = S.prefixed(prefix, block.id);

    function instanceEl(idx) {
      const inst = el('div', 'group-instance');
      inst.dataset.inst = String(idx);
      const head = el('div', 'group-inst-head');
      head.appendChild(el('span', 'group-inst-title', '节点类型 #' + (idx + 1)));
      const rm = el('button', 'btn btn-ghost btn-sm', '删除');
      rm.type = 'button';
      rm.addEventListener('click', () => {
        if (body.children.length <= (block.min || 1)) return;
        body.removeChild(inst);
        renumber();
      });
      head.appendChild(rm);
      inst.appendChild(head);
      const inner = el('div', 'group-inst-body');
      block.blocks.forEach((b) => inner.appendChild(renderBlock(b, groupPath + '.' + idx)));
      inst.appendChild(inner);
      return inst;
    }

    function renumber() {
      Array.from(body.children).forEach((inst, i) => {
        inst.dataset.inst = String(i);
        const t = inst.querySelector('.group-inst-title');
        if (t) t.textContent = '节点类型 #' + (i + 1);
        inst.querySelectorAll('[data-path]').forEach((n) => {
          n.dataset.path = n.dataset.path.replace(/^(.+?\.)(\d+)(\.|$)/, (m, a, _b, c) => a + i + c);
        });
      });
    }

    const n = block.min || 1;
    for (let i = 0; i < n; i++) body.appendChild(instanceEl(i));
    const addBtn = el('button', 'btn btn-ghost btn-sm', esc(block.addLabel || '＋ 添加'));
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => {
      body.appendChild(instanceEl(body.children.length));
      renumber();
    });
    wrap.appendChild(addBtn);
    return wrap;
  }

  function renderBlock(block, prefix) {
    switch (block.type) {
      case 'table': return renderTable(block, prefix);
      case 'checks': return renderChecks(block, prefix);
      case 'radios': return renderRadios(block, prefix);
      case 'listtext': return renderListText(block, prefix);
      case 'fields': return renderFields(block, prefix);
      case 'para': return renderPara(block);
      case 'group': return renderGroup(block, prefix);
      default: return el('div');
    }
  }

  /* ---------------- 章节与整表 ---------------- */
  function renderForm(schema, root) {
    schema.sections.forEach((sec) => {
      const s = el('section', 'sec');
      s.id = 'sec-' + sec.id;
      const head = el('div', 'sec-head');
      const h = el('h2', 'sec-title');
      h.innerHTML = esc((sec.num && sec.num.match(/^\d+$/) ? sec.num + '. ' : '') + sec.title) +
        (sec.required ? ' <span class="badge-req">【必填】</span>' : '');
      head.appendChild(h);
      s.appendChild(head);
      if (sec.note) s.appendChild(el('p', 'sec-note', esc(sec.note)));
      sec.blocks.forEach((b) => s.appendChild(renderBlock(b, '')));
      root.appendChild(s);
    });
  }

  /* ---------------- 收集 / 回填 ---------------- */
  function collect(root) {
    const data = {};
    root.querySelectorAll('[data-path]').forEach((n) => {
      const p = n.dataset.path;
      if (!p || p.indexOf('placeholder') >= 0) return;
      if (n.dataset.kind === 'many') {
        const arr = S.getPath(data, p) || [];
        if (n.checked && arr.indexOf(n.value) < 0) arr.push(n.value);
        S.setPath(data, p, arr);
      } else if (n.type === 'radio') {
        if (n.checked) S.setPath(data, p, n.value);
      } else if (n.type === 'checkbox') {
        S.setPath(data, p, !!n.checked);
      } else if (n.value !== '') {
        S.setPath(data, p, n.value);
      }
    });
    return data;
  }

  function fill(root, data) {
    if (!data) return;
    root.querySelectorAll('[data-path]').forEach((n) => {
      const p = n.dataset.path;
      if (!p || p.indexOf('placeholder') >= 0) return;
      const v = S.getPath(data, p);
      if (n.dataset.kind === 'many') {
        n.checked = Array.isArray(v) && v.indexOf(n.value) >= 0;
      } else if (n.type === 'radio') {
        n.checked = v === n.value;
      } else if (n.type === 'checkbox') {
        n.checked = v === true;
      } else if (v !== undefined && v !== null) {
        n.value = String(v);
      }
    });
  }

  window.RustFSForm = { renderForm, collect, fill };
})();

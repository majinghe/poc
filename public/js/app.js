/**
 * 应用逻辑：渲染表单、目录、草稿保存、提交生成 PDF。
 */
(function () {
  'use strict';
  const { SCHEMA } = RustFSSchema;
  const DRAFT_KEY = 'rustfs-poc-survey-draft-v1';

  // §4–§12 九项客户关键必填（对应「必填项速查」）
  const REQUIRED_SECS = ['s4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];

  const $ = (sel) => document.querySelector(sel);
  const form = $('#survey');

  /* ---------- 渲染 ---------- */
  RustFSForm.renderForm(SCHEMA, form);

  const toc = $('#toc');
  SCHEMA.sections.forEach((sec, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#sec-' + sec.id;
    a.textContent = (sec.num && /^\d+$/.test(sec.num) ? sec.num + '. ' : '') + sec.title;
    a.dataset.sec = sec.id;
    li.appendChild(a);
    toc.appendChild(li);
  });

  /* ---------- 草稿：自动保存 / 恢复 / 清空 ---------- */
  const hint = $('#save-hint');
  let saveTimer = null;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(RustFSForm.collect(form)));
        const t = new Date();
        hint.textContent = '草稿已保存 ' +
          String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      } catch (e) { /* localStorage 不可用时忽略 */ }
    }, 800);
  }

  form.addEventListener('input', () => { scheduleSave(); updateProgress(); });
  form.addEventListener('change', () => { scheduleSave(); updateProgress(); });

  $('#btn-restore').addEventListener('click', () => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) { alert('没有找到已保存的草稿。'); return; }
    try {
      RustFSForm.fill(form, JSON.parse(raw));
      hint.textContent = '草稿已恢复';
      updateProgress();
    } catch (e) { alert('草稿解析失败：' + e.message); }
  });

  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('确定清空当前填写内容吗？')) return;
    form.reset();
    form.querySelectorAll('input[type=checkbox], input[type=radio]').forEach((n) => { n.checked = false; });
    form.querySelectorAll('input[type=text], textarea').forEach((n) => {
      n.value = n.dataset.def || '';
    });
    localStorage.removeItem(DRAFT_KEY);
    hint.textContent = '已清空';
    updateProgress();
  });

  // 页面加载时若有草稿则静默恢复
  (function autoRestore() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      RustFSForm.fill(form, JSON.parse(raw));
      hint.textContent = '已载入本地草稿';
      updateProgress();
    } catch (e) { /* 忽略 */ }
  })();

  /* ---------- 必填进度 ---------- */
  function updateProgress() {
    const data = RustFSForm.collect(form);
    let done = 0;
    REQUIRED_SECS.forEach((id) => {
      const sec = SCHEMA.sections.find((s) => s.id === id);
      if (!sec) return;
      const filled = sec.blocks.some((b) => blockHasValue(b, data));
      if (filled) done++;
    });
    $('#progress').textContent = '必填完成 ' + done + ' / ' + REQUIRED_SECS.length;
  }

  function blockHasValue(block, data) {
    switch (block.type) {
      case 'table': {
        const rows = block.addable ? (RustFSSchema.getPath(data, block.id) || [])
          : (block.rows || []).map((r, i) => RustFSSchema.getPath(data, block.id + '.' + (r.key || i)));
        return rows.some((row) => row && Object.values(row).some((v) =>
          (Array.isArray(v) && v.length) || (typeof v === 'string' && v.trim()) ||
          (typeof v === 'object' && v && !Array.isArray(v) && Object.values(v).some((x) => typeof x === 'string' && x.trim()))));
      }
      case 'checks':
        return (block.items || []).some((it) => {
          const v = RustFSSchema.getPath(data, block.id + '.' + it.key);
          return v === true || (it.fields || []).some((f) => {
            const fv = RustFSSchema.getPath(data, block.id + '.' + it.key + '__' + f.k);
            return typeof fv === 'string' && fv.trim();
          });
        });
      case 'radios': {
        const v = RustFSSchema.getPath(data, block.id + '.value');
        return typeof v === 'string' && v.trim() !== '';
      }
      case 'listtext': {
        const arr = RustFSSchema.getPath(data, block.id) || [];
        return arr.some((x) => typeof x === 'string' && x.trim());
      }
      case 'fields':
        return (block.items || []).some((f) => {
          const v = RustFSSchema.getPath(data, block.id + '.' + f.k);
          return typeof v === 'string' && v.trim();
        });
      case 'group':
        return (RustFSSchema.getPath(data, block.id) || []).some((inst) => inst && JSON.stringify(inst).replace(/[{}\[\]",:]/g, '').trim());
      default:
        return false;
    }
  }

  /* ---------- 提交生成 PDF ---------- */
  const resultBox = $('#result');

  $('#btn-submit').addEventListener('click', async () => {
    const data = RustFSForm.collect(form);
    let done = 0;
    REQUIRED_SECS.forEach((id) => {
      const sec = SCHEMA.sections.find((s) => s.id === id);
      if (sec && sec.blocks.some((b) => blockHasValue(b, data))) done++;
    });
    if (done < REQUIRED_SECS.length) {
      if (!confirm('尚有必填章节（§4–§12 共 9 项）未填写，当前完成 ' + done + ' / ' +
        REQUIRED_SECS.length + '。\n仍要生成 PDF 吗？')) return;
    }

    const btn = $('#btn-submit');
    btn.disabled = true;
    btn.textContent = '生成中…';
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || ('HTTP ' + res.status));
      $('#pdf-frame').src = json.url;
      const dl = $('#btn-download');
      dl.href = json.url;
      dl.setAttribute('download', json.filename);
      resultBox.classList.remove('hidden');
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      alert('PDF 生成失败：' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '提交并生成 PDF';
    }
  });

  $('#btn-back').addEventListener('click', () => {
    resultBox.classList.add('hidden');
    $('#pdf-frame').src = '';
  });

  /* ---------- 目录高亮 ---------- */
  const links = Array.from(toc.querySelectorAll('a'));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id.replace('sec-', '');
      links.forEach((a) => a.classList.toggle('active', a.dataset.sec === id));
    });
  }, { rootMargin: '-80px 0px -70% 0px' });
  form.querySelectorAll('.sec').forEach((s) => obs.observe(s));

  updateProgress();
})();

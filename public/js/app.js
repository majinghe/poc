/**
 * 应用逻辑：登录门禁、渲染表单、目录、草稿保存、提交生成 PDF。
 *
 * PDF 生成双通道：
 *   1. 本地起服务（npm start）→ POST api/generate，服务端 Chrome 渲染矢量 PDF；
 *   2. 静态托管（如 GitHub Pages）→ 浏览器端 html2pdf 离屏排版后生成 PDF。
 * 自动探测：接口不可用即回退浏览器端，两种通道的预览/下载体验一致。
 */
(function () {
  'use strict';
  const { SCHEMA } = RustFSSchema;
  const DRAFT_KEY = 'customer-poc-survey-draft-v1';

  // §4–§12 九项客户关键必填（对应「必填项速查」）
  const REQUIRED_SECS = ['s4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];

  const $ = (sel) => document.querySelector(sel);
  const form = $('#survey');

  let pdfObjectUrl = null;
  let inited = false;

  /* ---------- 启动：先过登录 ---------- */
  POCAuth.requireLogin(initApp);
  $('#btn-logout').addEventListener('click', () => POCAuth.logout());

  function initApp(user) {
    if (user && user.u) $('#whoami').textContent = user.u;
    if (inited) return;
    inited = true;

    /* ---------- 渲染 ---------- */
    RustFSForm.renderForm(SCHEMA, form);

    const toc = $('#toc');
    SCHEMA.sections.forEach((sec) => {
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

    /* ---------- 提交生成 PDF ---------- */
    const resultBox = $('#result');

    $('#btn-submit').addEventListener('click', async () => {
      if (!POCAuth.isLoggedIn()) { POCAuth.requireLogin(initApp); return; } // 会话过期，重新登录
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
        let out;
        try {
          out = await generateViaServer(data);
          $('#pdf-note').textContent = '（本地服务渲染）';
        } catch (e) {
          out = await generateViaBrowser(data);
          $('#pdf-note').textContent = '（浏览器端渲染 · ' + out.pages + ' 页）';
        }
        if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
        pdfObjectUrl = out.objectUrl || null;
        $('#pdf-frame').src = out.url;
        const dl = $('#btn-download');
        dl.href = out.url;
        dl.setAttribute('download', out.filename);
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
  }

  /* ---------- 工具 ---------- */
  function safeName(s) {
    return String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || '未命名';
  }

  function fileMeta(data) {
    const meta = data.docmeta || {};
    const customer = (meta.customer && meta.customer.v) || '未命名';
    const date = (meta.date && meta.date.v) || new Date().toISOString().slice(0, 10);
    return '客户PoC调研表-' + safeName(customer) + '-' + safeName(date);
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

  /* ---------- PDF：服务端矢量渲染（本地 npm start 时可用） ---------- */
  async function generateViaServer(data) {
    const res = await fetch('api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('no api');
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || ('HTTP ' + res.status));
    return { url: json.url, filename: json.filename };
  }

  /* ---------- PDF：浏览器端渲染（GitHub Pages 等静态托管） ---------- */
  /* html2pdf 负责克隆排版与分页留白；随后按「页」逐张截取画布拼装 PDF。
   * 不用其一次性整卷画布：整卷高度可达数万像素，会触顶部分内嵌浏览器 / iOS 的
   * 画布高度上限，产出空白 PDF。 */
  async function generateViaBrowser(data) {
    const parts = RustFSPdfTemplate.buildParts(data);
    const el = $('#pdf-src');
    el.innerHTML = '<style>' + parts.css + '</style>' + parts.body;

    const worker = html2pdf().set({
      margin: 12,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2, useCORS: true, letterRendering: true, windowWidth: 794,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(el);

    await worker.toContainer(); // 克隆排版源并按分页规则插入留白
    const ps = worker.prop.pageSize;
    const pageH = ps.inner.px.height;
    const pageW = ps.inner.px.width;
    const box = worker.prop.container.getBoundingClientRect();
    const totalH = Math.max(1, Math.round(box.height || worker.prop.container.offsetHeight));
    const n = Math.max(1, Math.ceil(totalH / pageH));

    for (let i = 0; i < n; i++) {
      worker.opt.html2canvas = Object.assign({}, worker.opt.html2canvas, {
        x: 0, y: i * pageH, width: pageW,
        height: Math.min(pageH, totalH - i * pageH),
      });
      await worker.toCanvas(); // 每页窗口单独截取，避免超高画布
      await worker.toPdf();    // 逐页追加进同一个 jsPDF 文档
    }
    el.innerHTML = '';

    const pdf = worker.prop.pdf;
    stampFooter(pdf);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    return { url, filename: fileMeta(data) + '.pdf', objectUrl: url, pages: pdf.getNumberOfPages() };
  }

  /* 页脚：jsPDF 内置字体不含中文，用 canvas 贴图盖每一页底部 */
  function stampFooter(doc) {
    try {
      const n = doc.getNumberOfPages();
      if (!n) return;
      const cv = document.createElement('canvas');
      cv.width = 1488;
      cv.height = 56;
      const g = cv.getContext('2d');
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        g.clearRect(0, 0, cv.width, cv.height);
        g.font = '22px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
        g.fillStyle = '#8a93a5';
        g.textBaseline = 'middle';
        g.textAlign = 'left';
        g.fillText(SCHEMA.docTitle, 8, 28);
        g.textAlign = 'right';
        g.fillText('第 ' + i + ' / ' + n + ' 页', cv.width - 8, 28);
        doc.addImage(cv.toDataURL('image/png'), 'PNG', 12, 287, 186, 7);
      }
    } catch (e) { /* 页脚失败不影响正文 */ }
  }
})();

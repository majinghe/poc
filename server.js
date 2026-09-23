/**
 * RustFS PoC 调研表 Web 服务
 *   GET  /            → 表单页面
 *   POST /api/generate → 接收填写数据，生成 PDF，返回下载/预览地址
 *   GET  /pdf/:file   → 提供 PDF 在线预览与下载
 */
'use strict';
const path = require('path');
const fs = require('fs');
const express = require('express');
const { buildHtml } = require('./src/pdf-template');
const { renderPdf, closeBrowser } = require('./src/browser');

const PORT = process.env.PORT || 3000;
const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function safeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || '未命名';
}

app.post('/api/generate', async (req, res) => {
  try {
    const data = (req.body && req.body.data) || {};
    const meta = data.docmeta || {};
    const customer = (meta.customer && meta.customer.v) || '';
    const date = (meta.date && meta.date.v) || new Date().toISOString().slice(0, 10);
    const html = buildHtml(data);
    const pdf = await renderPdf(html);
    const filename = `RustFS-PoC调研表-${safeName(customer)}-${safeName(date)}-${Date.now()}.pdf`;
    fs.writeFileSync(path.join(OUT_DIR, filename), pdf);
    res.json({ ok: true, url: '/pdf/' + encodeURIComponent(filename), filename });
  } catch (e) {
    console.error('[generate]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/pdf/:file', (req, res) => {
  const file = path.basename(req.params.file); // 防路径穿越
  const full = path.join(OUT_DIR, file);
  if (!full.startsWith(OUT_DIR) || !fs.existsSync(full)) {
    return res.status(404).send('PDF 不存在');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file)}`);
  fs.createReadStream(full).pipe(res);
});

app.get('/health', (req, res) => res.json({ ok: true }));

const server = app.listen(PORT, () => {
  console.log(`RustFS PoC 调研表已启动: http://127.0.0.1:${PORT}`);
});

function shutdown() {
  server.close(() => closeBrowser().then(() => process.exit(0)));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

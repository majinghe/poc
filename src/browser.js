/**
 * headless Chrome 启动：优先使用系统已安装的 Chrome/Edge/Chromium（无需下载浏览器）。
 * 可用环境变量 PUPPETEER_EXECUTABLE_PATH 指定浏览器路径。
 */
'use strict';
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
};

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const list = CANDIDATES[process.platform] || CANDIDATES.linux;
  for (const p of list) {
    try { if (fs.existsSync(p)) return p; } catch (e) { /* ignore */ }
  }
  throw new Error('未找到 Chrome/Edge/Chromium，可设置环境变量 PUPPETEER_EXECUTABLE_PATH 指定浏览器可执行文件');
}

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: findChrome(),
      headless: 'new',
      args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
    }).catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}

/** HTML → PDF Buffer */
async function renderPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="width:100%;font-size:8px;color:#8a93a5;text-align:center;"></div>',
      footerTemplate: '<div style="width:100%;font-size:8px;color:#8a93a5;display:flex;justify-content:center;gap:8px;">' +
        '<span>RustFS 对象存储 PoC 调研表</span><span>第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</span></div>',
    });
  } finally {
    await page.close().catch(() => {});
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b) await b.close().catch(() => {});
    browserPromise = null;
  }
}

module.exports = { renderPdf, closeBrowser, findChrome };

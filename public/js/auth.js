/**
 * 登录门禁 —— 用户名 + 密码（纯前端轻量鉴权）。
 *
 * 说明：GitHub Pages 等静态托管没有服务端，这里是浏览器端校验，用于挡住随意访问；
 * 站点源码仍可通过开发者工具查看，不构成服务端安全边界。如需强访问控制，
 * 请在托管层增加防护（如 Cloudflare Access / Nginx Basic Auth）。
 *
 * 账号配置在下方 USERS；口令不存明文：
 *   sha256 —— SHA-256(hex)，HTTPS / localhost（有 crypto.subtle）时使用
 *   fnv   —— 非加密回退哈希，http 局域网等无 crypto.subtle 环境使用
 * 口令的哈希生成方法见 README「修改登录账号」。
 */
(function (root) {
  'use strict';

  const SESSION_KEY = 'customer-poc-auth-v1';
  const SESSION_TTL = 7 * 24 * 3600 * 1000; // 登录有效期 7 天

  const USERS = [
    { username: 'admin', sha256: 'ca3d440e4ae61fe7824e03c8d0572401bb5a86eb892718127d76a3839f435adf', fnv: 'b11ec2e229600c53' },
    // 追加账号：{ username: 'xxx', sha256: '<sha256hex>', fnv: '<fnvhex>' },
  ];

  function fnvHash(str) {
    let h1 = 0x811c9dc5 | 0;
    let h2 = 0xcbf29ce4 | 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = Math.imul(h2 ^ (c + 13), 0x01000193);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }

  async function sha256Hex(str) {
    const buf = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyUser(username, password) {
    const u = USERS.find((x) => x.username === String(username || '').trim());
    if (!u) return null;
    if (root.crypto && root.crypto.subtle) {
      if ((await sha256Hex(password)) === u.sha256) return u;
    } else if (fnvHash(password) === u.fnv) {
      return u;
    }
    return null;
  }

  function session() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.exp > Date.now() && USERS.some((x) => x.username === s.u)) return s;
    } catch (e) { /* 解析失败视为未登录 */ }
    return null;
  }

  function saveSession(username) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL }));
  }

  function isLoggedIn() { return !!session(); }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  /**
   * 要求已登录：已登录立即回调 onOk(user)；否则展示登录卡片，
   * 校验通过后保存会话并回调。
   */
  function requireLogin(onOk) {
    const screen = document.getElementById('login-screen');
    const form = document.getElementById('login-form');
    const userInput = document.getElementById('login-user');
    const passInput = document.getElementById('login-pass');
    const err = document.getElementById('login-error');

    const done = (s) => {
      screen.classList.add('hidden');
      if (onOk) onOk(s);
    };

    const cur = session();
    if (cur) { done(cur); return; }

    screen.classList.remove('hidden');
    userInput.focus();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.add('hidden');
      const u = await verifyUser(userInput.value, passInput.value);
      if (!u) {
        err.classList.remove('hidden');
        passInput.value = '';
        passInput.focus();
        return;
      }
      saveSession(u.username);
      done({ u: u.username, exp: Date.now() + SESSION_TTL });
    });
  }

  root.POCAuth = { requireLogin, isLoggedIn, logout, session };
})(typeof self !== 'undefined' ? self : this);

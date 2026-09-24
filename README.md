# 客户 PoC 调研表 · Web 填报系统（RustFS）

将《RustFS 对象存储 PoC 调研表》（Word 版）搬上网页：登录后在浏览器中分章节填写 / 勾选 / 动态增删行，点击「提交并生成 PDF」后把填写结果排版成一份带 Logo 封面、目录、页眉页脚的 A4 PDF，页面内直接预览并可下载。界面配色与 RustFS 品牌一致（蓝 `#0062FF`，Logo 取自 [rustfs.com](https://rustfs.com)）。

**在线访问（GitHub Pages）**：https://majinghe.github.io/poc/

> 登录账号默认 `admin` / `rustfs2026`（可在 `public/js/auth.js` 中修改，见下文）。

## 功能特性

- **登录门禁**：用户名 + 密码登录，7 天内免重复登录（含退出按钮）
- **完整还原调研表全部 30 个章节**：文档信息、客户背景、PoC 目标、使用场景 / 容量 / 增长 / 带宽、专线、备份加密、S3 Tables、文件分布、特殊需求、容量规划、对象特征、性能目标、多站点、安全合规、容灾、S3 兼容性、功能清单、部署形态、硬件调研、运维可观测、集成用例、时间计划、能力验证维度，以及 3 个附录与签署页
- **多种控件类型**：单行文本、多行文本、单选、多选（含子项补充字段）、清单列表、复合字段行、静态说明、可增删行表格、可重复分组（如「节点类型」多组硬件配置）
- **9 个必填章节进度提示**：左侧目录实时显示「必填完成 X / 9」，提交未完成时弹窗确认
- **草稿自动保存**：填写内容自动存入浏览器 localStorage，下次打开自动恢复；支持手动「恢复草稿 / 清空」
- **PDF 生成双通道**（自动探测，体验一致）：
  - 本地起服务 → 服务端 headless Chrome 渲染矢量 PDF（文字可选可搜）；
  - GitHub Pages 等静态托管 → 浏览器端排版生成 PDF（自动附页脚「客户 PoC 调研表 · 第 X / Y 页」）
- **在线预览 + 下载**：提交后页面内嵌 PDF 预览，一键下载（文件名含客户名称与日期）

## 快速开始

### 直接使用（GitHub Pages）

打开 https://majinghe.github.io/poc/ ，登录后填写即可，无需安装任何东西。

### 本地运行

环境要求：Node.js ≥ 18；若要使用服务端矢量 PDF，本机需安装 Google Chrome。

```bash
npm install
npm start          # 启动服务，默认 http://127.0.0.1:3000
```

前端本就是纯静态的，也可以任意静态服务器托管 `public/` 目录：

```bash
python3 -m http.server 8080 --directory public   # 此时 PDF 由浏览器端生成
```

```bash
npm run dev        # 开发模式（文件变更自动重启）
npm run sample     # 生成一份填好的示例 PDF 到 output/sample.pdf（约 20 页，矢量）
```

## 登录账号

账号配置在 [public/js/auth.js](public/js/auth.js) 的 `USERS` 数组中，口令以哈希存放（不存明文）：

```js
const USERS = [
  { username: 'admin', sha256: '<sha256hex>', fnv: '<fnvhex>' },
];
```

生成新口令的两个哈希（把 `新口令` 替换掉）：

```bash
node -e "
const pw='新口令';
const sha=require('crypto').createHash('sha256').update(pw).digest('hex');
function fnv(s){let h1=0x811c9dc5|0,h2=0xcbf29ce4|0;
for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,0x01000193);h2=Math.imul(h2^(c+13),0x01000193);}
return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');}
console.log({ sha256: sha, fnv: fnv(pw) });"
```

> **安全说明**：GitHub Pages 是纯静态托管，登录为浏览器端校验，作用是「挡住随意访问」；
> 页面源码与题目内容仍可通过开发者工具查看，它不是服务端安全边界。
> 填写数据只保存在填写者本机浏览器（localStorage），不会上传到任何服务器。
> 如需真正的访问控制，请在托管层加防护（如 Cloudflare Access、Nginx Basic Auth）。

## 目录结构

```
├── public/                     # ★ 纯静态站点（GitHub Pages 直接发布此目录）
│   ├── index.html              # 页面骨架：登录 / 顶栏 / 目录 / 表单 / 结果面板
│   ├── css/app.css             # 表单样式（RustFS 品牌配色）
│   ├── assets/                 # RustFS Logo 与 favicon（取自 rustfs.com）
│   ├── vendor/                 # html2pdf.js（浏览器端 PDF 生成，已内置，无外网依赖）
│   └── js/
│       ├── schema.js           # ★ 调研表结构化 schema（表单与 PDF 共用）
│       ├── pdf-template.js     # ★ schema + 数据 → 打印版式 HTML（双端共用）
│       ├── form-render.js      # schema → 可交互表单 / 收集填写数据
│       ├── auth.js             # 登录门禁与会话
│       └── app.js              # 草稿、进度、提交与 PDF 双通道调度
├── server.js                   # 本地 Express：静态托管 + 矢量 PDF API（可选）
├── src/                        # 服务端工具（Chrome 渲染，本地 / 示例脚本使用）
└── scripts/generate-sample.js  # 示例数据 + 批量生成矢量 PDF
```

## 技术方案

核心是 `public/js/schema.js`：把调研表抽象为带类型与数据路径（`data-path`）的声明式 schema（UMD 模块，前后端共用）。

- 浏览器端 `form-render.js` 据此渲染表单，按同一路径约定收集数据（文本→字符串、多选→数组、可增删行→对象数组、可重复分组→实例数组）；
- `pdf-template.js` 用同一 schema 把数据渲染成打印 HTML —— 本地由 Chrome 转矢量 PDF，静态托管由 html2pdf 排版成 PDF。

表单与 PDF 天然一致，新增 / 修改字段只需改 schema 一处。

## HTTP API（本地服务）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `api/generate` | 入参 `{ data }`（collect 格式），生成矢量 PDF 并返回 `{ ok, url, filename }` |
| `GET` | `pdf/:file` | 内联预览 / 下载已生成的 PDF（`output/` 目录） |
| `GET` | `health` | 健康检查 |

页面提交时自动探测：接口可用走服务端矢量渲染；不可用（如 Pages）自动回退浏览器端渲染。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 本地服务端口 |
| `PUPPETEER_EXECUTABLE_PATH` | 自动探测 | Chrome 可执行文件路径；macOS 默认用 `/Applications/Google Chrome.app/...` |

## GitHub Pages 部署

站点由 GitHub Actions 工作流（[.github/workflows/pages.yml](.github/workflows/pages.yml)）把 `public/`
发布到 Pages（Settings → Pages → Source 为 **GitHub Actions**）。
每次 `git push` 到 `main` 约半分钟后自动生效，访问：https://majinghe.github.io/poc/

> 说明：GitHub Pages 免费套餐要求仓库为公开（public）；私有仓库需 GitHub Pro 才能启用 Pages，
> 且私有仓库的 Pages 站点仅协作者可见，不适合发给客户填写。

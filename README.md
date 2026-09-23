# RustFS 对象存储 PoC 调研表 · Web 填报系统

将《RustFS 对象存储 PoC 调研表》（Word 版）搬上网页：用户在浏览器中分章节填写 / 勾选 / 动态增删行，点击「提交并生成 PDF」后，服务端把填写结果排版成一份带封面、目录、页眉页脚的 A4 PDF，直接在页面内预览并可下载。

## 功能特性

- **完整还原调研表全部 30 个章节**：文档信息、客户背景、PoC 目标、使用场景 / 容量 / 增长 / 带宽、专线、备份加密、S3 Tables、文件分布、特殊需求、容量规划、对象特征、性能目标、多站点、安全合规、容灾、S3 兼容性、功能清单、部署形态、硬件调研、运维可观测、集成用例、时间计划、能力验证维度，以及 3 个附录与签署页
- **多种控件类型**：单行文本、多行文本、单选、多选（含子项补充字段）、清单列表、复合字段行、静态说明、可增删行表格、可重复分组（如「节点类型」多组硬件配置）
- **9 个必填章节进度提示**：左侧目录实时显示「必填完成 X / 9」，提交未完成时弹窗确认
- **草稿自动保存**：填写内容自动存入浏览器 localStorage，下次打开自动恢复；支持手动「恢复草稿 / 清空」
- **PDF 生成**：封面 + 33 项目录 + 全部填写内容（含 ☑/☐ 选项标记、编号列表、硬件分组），页脚显示「RustFS 对象存储 PoC 调研表 · 第 X / Y 页」，支持中文字体
- **在线预览 + 下载**：提交后页面内嵌 PDF 预览，一键下载（文件名含客户名称与日期）

## 快速开始

环境要求：Node.js ≥ 18，本机安装 Google Chrome（用于 PDF 渲染，无需下载 Chromium）。

```bash
npm install
npm start          # 启动服务，默认 http://127.0.0.1:3000
```

浏览器打开 [http://127.0.0.1:3000](http://127.0.0.1:3000) 填写，点击右上角「提交并生成 PDF」即可预览与下载。

```bash
npm run dev        # 开发模式（文件变更自动重启）
npm run sample     # 生成一份填好的示例 PDF 到 output/sample.pdf（约 20 页）
```

## 目录结构

```
├── server.js               # Express 服务：静态资源 + PDF 生成 API
├── public/                 # 前端（无构建，直接浏览器加载）
│   ├── index.html          # 页面骨架：顶栏 / 目录 / 表单 / 结果面板
│   ├── css/app.css         # 表单样式
│   └── js/
│       ├── schema.js       # ★ 调研表结构化 schema（表单与 PDF 共用）
│       ├── form-render.js  # schema → 可交互表单 / 收集填写数据
│       └── app.js          # 草稿保存、必填进度、提交与结果展示
├── src/
│   ├── pdf-template.js     # schema + 数据 → 打印用 HTML
│   └── browser.js          # puppeteer-core 调用本机 Chrome 渲染 PDF
└── scripts/generate-sample.js  # 示例数据 + 批量生成 PDF
```

## 技术方案

核心是 `public/js/schema.js`：把调研表抽象为带类型与数据路径（`data-path`）的声明式 schema（UMD 模块，前后端共用）。

- 浏览器端 `form-render.js` 据此渲染表单，按同一路径约定收集数据（文本→字符串、多选→数组、可增删行→对象数组、可重复分组→实例数组）
- 服务端 `pdf-template.js` 用同一 schema 把数据渲染成打印 HTML，再由 `puppeteer-core` 驱动本机 Chrome 转成 A4 PDF

表单与 PDF 天然一致，新增 / 修改字段只需改 schema 一处。

## HTTP API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/generate` | 入参 `{ data }`（collect 格式），生成 PDF 并返回 `{ ok, url, filename }` |
| `GET` | `/pdf/:file` | 内联预览 / 下载已生成的 PDF（`output/` 目录） |
| `GET` | `/health` | 健康检查 |

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务端口 |
| `PUPPETEER_EXECUTABLE_PATH` | 自动探测 | Chrome 可执行文件路径；macOS 默认用 `/Applications/Google Chrome.app/...` |

生成的 PDF 保存在 `output/`（已加入 `.gitignore`）。

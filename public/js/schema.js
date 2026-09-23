/**
 * RustFS PoC 调研表 — 表单/数据 Schema（浏览器与 Node 共用）
 *
 * Block 类型:
 *   table    — 表格（columns + rows/cells，可 addable 动态增行）
 *   checks   — 复选清单（可带内联补充字段 tail）
 *   radios   — 单选一组（可带选项内联字段、tail）
 *   listtext — 编号自由填写行
 *   fields   — 标签 + 控件 的纵向行
 *   para     — 静态说明文字
 *   group    — 可重复块（如按节点类型复制填写）
 *
 * Cell/控件 类型 t: text | textarea | radio | check | checks | static | fields | index
 * 路径约定: 普通字段 `${blockId}.${rowKey}.${cellK}`；选项内联字段用 `__` 后缀。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.RustFSSchema = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- 控件构造助手 ---------- */
  const normOpts = (opts) => opts.map((o) => (typeof o === 'string' ? { v: o } : o));
  const T = (k, ph, def) => ({ t: 'text', k, ph: ph || '', def: def || '' });
  const A = (k, ph, def) => ({ t: 'textarea', k, ph: ph || '', def: def || '' });
  const R = (k, opts) => ({ t: 'radio', k, opts: normOpts(opts) });
  const C = (k, label) => ({ t: 'check', k, label: label || '' });
  const CK = (k, opts) => ({ t: 'checks', k, opts: normOpts(opts) });
  const S = (v) => ({ t: 'static', v });
  const Fd = (items) => ({ t: 'fields', items });
  const IX = () => ({ t: 'index' });

  /* checks/radios 清单项：可附带内联字段 */
  const it = (label, key, fields) => ({ label, key, fields: fields || [] });

  const SCHEMA = {
    docTitle: 'RustFS 对象存储 PoC 调研表',
    docSubtitle: '客户环境与需求收集（售前 / PoC）',
    docEnd: '文档结束 —— 《RustFS 对象存储 PoC 调研表》｜客户环境与需求收集（售前 / PoC）',

    toc: [
      '文档属性', '填写说明', '1. 文档信息与联系人', '2. 客户与业务背景', '3. PoC 目标与成功标准',
      '4. 使用场景', '5. 使用容量', '6. 预计数据增长', '7. 带宽', '8. 跨地区专线需求',
      '9. 数据备份与加密需求', '10. S3 Tables 需求', '11. 预计文件大小分布', '12. 特殊需求',
      '13. 容量规划细化', '14. 对象与文件特征细化', '15. 性能目标细化', '16. 网络与多站点',
      '17. 安全、合规与访问控制', '18. 备份、版本与容灾', '19. S3 兼容性与集成', '20. 功能需求清单',
      '21. 部署形态与软件环境', '22. 硬件调研表', '23. 运维与可观测性', '24. 集成系统与测试用例',
      '25. 时间计划与里程碑', '26. 能力验证维度', '附录 A：建议 PoC 流程 Checklist',
      '附录 B：硬件与网络自检命令提示', '附录 C：安装与配置检查清单', '必填项速查（客户自检）', '签署确认',
    ],

    sections: [
      /* ============ 文档属性 ============ */
      {
        id: 'meta', num: '文档属性', title: '文档属性', blocks: [
          {
            type: 'table', id: 'docmeta',
            columns: [{ label: '文档属性', w: '26%' }, { label: '填写', w: '74%' }],
            rows: [
              { key: 'version', cells: [S('文档版本'), T('v', '如 v1.0')] },
              { key: 'date', cells: [S('填写日期'), T('v', 'YYYY-MM-DD')] },
              { key: 'customer', cells: [S('客户名称'), T('v')] },
              { key: 'sales', cells: [S('销售负责人'), T('v')] },
              { key: 'presale', cells: [S('售前负责人'), T('v')] },
              { key: 'project_no', cells: [S('项目编号'), T('v')] },
              { key: 'status', cells: [S('文档状态'), R('v', ['草稿', '客户初填', '售前复核', '已确认'])] },
            ],
          },
        ],
      },

      /* ============ 填写说明 ============ */
      {
        id: 'howto', num: '填写说明', title: '填写说明', blocks: [
          {
            type: 'para', id: 'howto_p', lines: [
              '1. 目的：本表用于 RustFS 对象存储概念验证（PoC）前的需求与环境收集，作为方案设计、容量规划、硬件建议与 PoC 成功标准的依据。',
              '2. 填写方：客户技术/业务接口人为主填写；销售/售前协助澄清；涉及合规与安全条款请法务或安全团队确认。',
              '3. 标注约定 —— 【必填】影响 PoC 能否启动或能否出具方案的关键项；【PoC】仅针对 PoC 环境填写；【生产】针对预期生产环境填写（可与 PoC 不同，请分别标注）；【可选】有则填，无则勾选「不适用」。',
              '4. 勾选与填写：数值请注明单位（TB、GB/s、ms 等）。',
              '5. 保密：本表可能含客户架构与容量信息，按双方保密约定处理。',
              '6. 品牌与范围：本调研仅针对 RustFS 对象存储；客户端工具可使用与 S3 兼容的通用工具（含 mc 兼容客户端、rclone、AWS CLI/SDK 等）。',
            ],
          },
        ],
      },

      /* ============ 1. 文档信息与联系人 ============ */
      {
        id: 's1', num: '1', title: '文档信息与联系人', blocks: [
          {
            type: 'table', id: 'b11', title: '1.1 项目基本信息',
            columns: [{ label: '项', w: '24%' }, { label: '【PoC】', w: '38%' }, { label: '【生产】（如已知）', w: '38%' }],
            rows: [
              { key: 'proj', cells: [S('项目名称'), T('poc'), T('prod')] },
              { key: 'start', cells: [S('计划开始日期'), T('poc', 'YYYY-MM-DD'), T('prod', 'YYYY-MM-DD')] },
              { key: 'end', cells: [S('计划结束日期'), T('poc', 'YYYY-MM-DD'), T('prod', 'YYYY-MM-DD')] },
              { key: 'site', cells: [S('部署区域/机房'), T('poc'), T('prod')] },
              { key: 'tz', cells: [S('时区'), T('poc', '如 Asia/Shanghai'), T('prod')] },
            ],
          },
          {
            type: 'table', id: 'b12', title: '1.2 关键联系人',
            columns: [
              { label: '角色', w: '18%' }, { label: '姓名', w: '14%' }, { label: '部门', w: '16%' },
              { label: '邮箱', w: '20%' }, { label: '电话/微信', w: '16%' }, { label: '备注', w: '16%' },
            ],
            rows: [
              { key: 'cust_pm', cells: [S('客户项目负责人'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
              { key: 'cust_tech', cells: [S('客户技术负责人'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
              { key: 'cust_ops', cells: [S('客户运维负责人'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
              { key: 'cust_sec', cells: [S('客户安全/合规接口'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
              { key: 'sales', cells: [S('RustFS 销售'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
              { key: 'presale', cells: [S('RustFS 售前/解决方案'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
              { key: 'impl', cells: [S('RustFS 实施支持'), T('name'), T('dept'), T('mail'), T('tel'), T('note')] },
            ],
          },
          {
            type: 'checks', id: 'b13', title: '1.3 沟通机制',
            items: [
              it('周例会（建议）', 'weekly', [T('day', '每周'), T('min', '时长（分钟）')]),
              it('即时沟通群', 'im', [T('v', '群名称 / 链接')]),
              it('工单/邮件', 'ticket', [T('v', '入口 / 邮箱')]),
              it('其他', 'other', [T('v', '说明')]),
            ],
          },
        ],
      },

      /* ============ 2. 客户与业务背景 ============ */
      {
        id: 's2', num: '2', title: '客户与业务背景', blocks: [
          {
            type: 'table', id: 'b21', title: '2.1 行业与组织',
            columns: [{ label: '项', w: '26%' }, { label: '填写', w: '74%' }],
            rows: [
              { key: 'industry', cells: [S('所属行业'), T('v', '如：金融 / 制造 / 医疗 / 互联网 / 政务 / 教育 / 传媒 / 科研 等')] },
              { key: 'scale', cells: [S('组织规模（约）'), Fd([T('emp', '员工数'), T('it', 'IT 团队')])] },
              { key: 'storage_now', cells: [S('现有存储现状简述'), A('v')] },
              { key: 'why', cells: [S('为何评估对象存储 / RustFS'), A('v')] },
            ],
          },
          {
            type: 'table', id: 'b22', title: '2.2 合规与监管要求【必填相关项】', note: '请勾选适用项，并说明等级/范围：',
            columns: [{ label: '合规项', w: '30%' }, { label: '适用', w: '18%' }, { label: '等级/说明', w: '26%' }, { label: '备注', w: '26%' }],
            rows: [
              { key: 'dengbao', cells: [S('等保（网络安全等级保护）'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'miping', cells: [S('密评（商用密码应用安全性评估）'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'gdpr', cells: [S('GDPR'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'hipaa', cells: [S('HIPAA'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'finance', cells: [S('金融监管（如人行/银保监相关）'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'dataclass', cells: [S('数据分类分级 / 数据出境'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'industry_std', cells: [S('行业专有标准（请注明）'), R('ap', ['是', '否']), T('lvl'), T('note')] },
              { key: 'other', cells: [S('其他'), R('ap', ['是', '否']), T('lvl'), T('note')] },
            ],
          },
          {
            type: 'checks', id: 'b23', title: '数据驻留要求',
            items: [
              it('必须境内', 'domestic'),
              it('可跨境', 'crossborder'),
              it('指定区域', 'region', [T('v', '区域')]),
              it('其他说明', 'other', [T('v', '说明')]),
            ],
          },
        ],
      },

      /* ============ 3. PoC 目标与成功标准 ============ */
      {
        id: 's3', num: '3', title: 'PoC 目标与成功标准', required: true, blocks: [
          { type: 'listtext', id: 'b31', title: '3.1 PoC 总体目标【必填】', note: '请用 3–5 条描述 PoC 要验证什么：', count: 5 },
          {
            type: 'table', id: 'b32', title: '3.2 可量化成功标准模板【必填】',
            columns: [
              { label: '维度', w: '20%' }, { label: '目标值（客户填写）', w: '22%' }, { label: '测量方法', w: '22%' },
              { label: '是否必须达成', w: '16%' }, { label: '备注', w: '20%' },
            ],
            rows: [
              { key: 'avail', cells: [S('可用性（如 >= 99.9%）'), T('goal'), T('method', '', '可用性探测 / SLA 报告'), R('must', ['是', '否']), T('note')] },
              { key: 'tpr', cells: [S('聚合吞吐（读）'), T('goal', 'GB/s 或 MB/s'), T('method', '', '对象存储基准测试工具 / 业务压测'), R('must', ['是', '否']), T('note')] },
              { key: 'tpw', cells: [S('聚合吞吐（写）'), T('goal', 'GB/s 或 MB/s'), T('method', '', '同上'), R('must', ['是', '否']), T('note')] },
              { key: 'p50', cells: [S('延迟 P50'), T('goal', 'ms'), T('method', '', '客户端采样'), R('must', ['是', '否']), T('note')] },
              { key: 'p99', cells: [S('延迟 P99'), T('goal', 'ms'), T('method', '', '客户端采样'), R('must', ['是', '否']), T('note')] },
              { key: 'drill', cells: [S('故障演练（节点/磁盘/网络）'), T('goal', '通过标准'), T('method', '', '演练记录'), R('must', ['是', '否']), T('note')] },
              { key: 's3api', cells: [S('S3 API 兼容性清单通过率'), T('goal', '%'), T('method', '', '用例清单（见第 19/24 节）'), R('must', ['是', '否']), T('note')] },
              { key: 'app', cells: [S('业务应用联调通过'), T('goal', '应用列表'), T('method', '', '联调报告'), R('must', ['是', '否']), T('note')] },
              { key: 'obs', cells: [S('运维可观测达标'), T('goal', '指标/告警可用'), T('method', '', 'Prometheus/Grafana 等'), R('must', ['是', '否']), T('note')] },
              { key: 'other', cells: [S('其他'), T('goal'), T('method'), R('must', ['是', '否']), T('note')] },
            ],
          },
          {
            type: 'fields', id: 'b33', title: '3.3 PoC 范围边界',
            items: [
              { label: '范围内', ...A('scope_in') },
              { label: '范围外', ...A('scope_out') },
              { label: '已知风险/依赖', ...A('risk') },
            ],
          },
          {
            type: 'checks', id: 'b34', title: '3.4 高层 PoC 过程（建议，双方确认）',
            items: [
              it('确认基础设施与网络可达', 'env'), it('安装部署协助（RustFS 集群）', 'install'),
              it('TLS / 审计 / 通知 / 监控等基础配置', 'config'), it('基准性能测试与调优', 'bench'),
              it('业务应用联调', 'app'), it('故障与恢复演练', 'drill'),
              it('周里程碑评审（建议每周一次）', 'weekly'), it('PoC 总结报告与生产建议', 'report'),
            ],
          },
        ],
      },

      /* ============ 4. 使用场景 ============ */
      {
        id: 's4', num: '4', title: '使用场景', required: true, blocks: [
          {
            type: 'checks', id: 'b41', title: '4.1 主场景勾选（可多选）【必填】', cols: 2,
            items: [
              it('备份与归档', 'backup'), it('大数据 / 数据湖', 'bigdata'), it('AI / ML 训练与推理数据', 'ai'),
              it('影像 / 视频媒资', 'media'), it('日志与可观测数据', 'log'), it('静态资源 / CDN 源站', 'cdn'),
              it('替换公有云 S3 / 兼容对象存储', 'replace'), it('多租户 SaaS 平台存储', 'saas'),
              it('边缘站点对象存储', 'edge'), it('医疗影像（PACS 等）', 'pacs'), it('安防 / 监控录像', 'cctv'),
              it('基因 / 生命科学数据', 'gene'), it('车联网 / 物联网时序落盘', 'iot'),
              it('软件制品 / 镜像仓库后端', 'registry'), it('其他', 'other', [T('v', '请注明')]),
            ],
          },
          {
            type: 'table', id: 'b42', title: '4.2 场景优先级与说明',
            columns: [
              { label: '优先级', w: '10%' }, { label: '场景名称', w: '20%' }, { label: '业务简述', w: '26%' },
              { label: '读写比例(读:写)', w: '14%' }, { label: '是否热点对象', w: '14%' }, { label: '生命周期需求', w: '16%' },
            ],
            rows: [
              { key: 'p0', cells: [S('P0'), T('name'), T('desc'), T('rw'), R('hot', ['是', '否']), T('lifecycle')] },
              { key: 'p1', cells: [S('P1'), T('name'), T('desc'), T('rw'), R('hot', ['是', '否']), T('lifecycle')] },
              { key: 'p2', cells: [S('P2'), T('name'), T('desc'), T('rw'), R('hot', ['是', '否']), T('lifecycle')] },
            ],
          },
          {
            type: 'checks', id: 'b43', title: '4.3 访问模式', cols: 2,
            items: [
              it('顺序写为主', 'seq_write'), it('随机读为主', 'rand_read'), it('混合', 'mixed'),
              it('追加写风格（多次覆盖/版本）', 'append'), it('一次写入多次读取（WORM 倾向）', 'worm'),
              it('短生命周期临时数据', 'ephemeral'), it('长期冷存', 'cold'),
            ],
            tail: [A('note', '说明')],
          },
        ],
      },

      /* ============ 5. 使用容量 ============ */
      {
        id: 's5', num: '5', title: '使用容量', required: true, blocks: [
          {
            type: 'table', id: 'b5', title: '5. 使用容量【必填】',
            columns: [
              { label: '指标', w: '26%' }, { label: '【PoC】', w: '18%' }, { label: '【生产】（目标）', w: '18%' },
              { label: '单位', w: '14%' }, { label: '备注', w: '24%' },
            ],
            rows: [
              { key: 'current', cells: [S('当前已有数据量（若迁移）'), T('poc'), T('prod'), S('TB / PB'), T('note')] },
              { key: 'import', cells: [S('PoC 计划导入数据量'), T('poc'), S('—'), S('TB'), T('note')] },
              { key: 'logical', cells: [S('目标总容量（逻辑/有效）'), T('poc'), T('prod'), S('TB / PB'), T('note')] },
              { key: 'raw', cells: [S('目标原始容量（含冗余）'), T('poc'), T('prod'), S('TB / PB'), T('note')] },
              { key: 'buckets', cells: [S('预计桶（Bucket）数量'), T('poc'), T('prod'), S('个'), T('note')] },
              { key: 'objects', cells: [S('预计对象数量'), T('poc'), T('prod'), S('个 / 亿'), T('note')] },
              { key: 'max_bucket', cells: [S('单桶最大对象数（若已知）'), T('poc'), T('prod'), S('个'), T('note')] },
            ],
          },
          { type: 'fields', id: 'b5note', items: [{ label: '容量说明（自由填写）', ...A('v') }] },
        ],
      },

      /* ============ 6. 预计数据增长 ============ */
      {
        id: 's6', num: '6', title: '预计数据增长', required: true, blocks: [
          {
            type: 'table', id: 'b6', title: '6. 预计数据增长【必填】',
            columns: [{ label: '指标', w: '26%' }, { label: '数值', w: '30%' }, { label: '单位', w: '18%' }, { label: '备注', w: '26%' }],
            rows: [
              { key: 'month', cells: [S('月增长率（容量）'), T('v'), S('%/月 或 TB/月'), T('note')] },
              { key: 'year', cells: [S('年增长率（容量）'), T('v'), S('%/年 或 PB/年'), T('note')] },
              { key: 'obj_month', cells: [S('对象数量月增长率'), T('v'), S('%/月 或 个/月'), T('note')] },
              { key: 'peak', cells: [S('是否存在业务旺季峰值'), R('v', ['是', '否']), S('---'), T('note', '峰值说明：')] },
              { key: 'peak_ratio', cells: [S('峰值相对日常放大倍数'), T('v'), S('倍'), T('note')] },
              { key: 'smallfile', cells: [S('小文件是否主导增长'), R('v', ['是', '否', '不确定']), S('---'), T('note')] },
              { key: 'future', cells: [S('未来 1 / 3 / 5 年目标容量'), Fd([T('y1', '1 年'), T('y3', '3 年'), T('y5', '5 年')]), S('TB/PB'), T('note')] },
            ],
          },
          { type: 'fields', id: 'b6note', items: [{ label: '增长曲线说明', ...A('v') }] },
        ],
      },

      /* ============ 7. 带宽 ============ */
      {
        id: 's7', num: '7', title: '带宽', required: true, blocks: [
          {
            type: 'table', id: 'b71', title: '7.1 链路带宽一览',
            columns: [{ label: '链路', w: '30%' }, { label: '带宽', w: '22%' }, { label: '时延（约）', w: '22%' }, { label: '备注', w: '26%' }],
            rows: [
              { key: 'ns', cells: [S('客户端 → RustFS 集群（南北向）'), T('bw', 'Gbps'), T('lat', 'ms'), T('note')] },
              { key: 'ew', cells: [S('集群节点间（东西向）'), T('bw', 'Gbps'), T('lat', 'us/ms'), T('note')] },
              { key: 'az', cells: [S('跨机房 / 跨 AZ'), T('bw', 'Gbps'), T('lat', 'ms'), T('note')] },
              { key: 'region', cells: [S('跨地区（若有）'), T('bw', 'Gbps'), T('lat', 'ms'), T('note')] },
              { key: 'uplink', cells: [S('上联核心 / 出口'), T('bw', 'Gbps'), T('lat'), T('note')] },
            ],
          },
          {
            type: 'table', id: 'b72', title: '7.2 目标吞吐与并发',
            columns: [{ label: '项', w: '28%' }, { label: '【PoC】目标', w: '36%' }, { label: '【生产】目标', w: '36%' }],
            rows: [
              { key: 'wtp', cells: [S('写吞吐'), T('poc', 'GB/s 或 MB/s'), T('prod', 'GB/s 或 MB/s')] },
              { key: 'rtp', cells: [S('读吞吐'), T('poc', 'GB/s 或 MB/s'), T('prod', 'GB/s 或 MB/s')] },
              { key: 'iops', cells: [S('目标 IOPS（若关注）'), T('poc'), T('prod')] },
              { key: 'clients', cells: [S('并发客户端数'), T('poc'), T('prod')] },
              { key: 'peak', cells: [S('高峰时段'), T('poc'), T('prod')] },
            ],
          },
          {
            type: 'checks', id: 'b73',
            items: [
              it('带宽为共享链路（需说明争用情况）', 'shared', [T('v', '争用情况')]),
              it('带宽为独享', 'dedicated'),
            ],
            tail: [Fd([R('iperf', ['iperf3 基线已完成', 'iperf3 基线未完成']), T('iperf_note', 'iperf3 结果摘要')])],
          },
        ],
      },

      /* ============ 8. 跨地区专线需求 ============ */
      {
        id: 's8', num: '8', title: '跨地区专线需求', required: true, blocks: [
          {
            type: 'radios', id: 'b8q', label: '是否有跨地区专线需求？【必填】',
            items: [
              { v: '是（请继续填写下表）' }, { v: '否' },
              { v: '待定', fields: [T('decide_time', '预计决策时间')] },
            ],
          },
          {
            type: 'table', id: 'b8',
            columns: [{ label: '项', w: '28%' }, { label: '填写', w: '72%' }],
            rows: [
              { key: 'regions', cells: [S('涉及地区 / 机房列表'), A('v')] },
              {
                key: 'line_type', cells: [S('专线类型'),
                  CK('v', ['运营商专线', 'MPLS', 'SD-WAN', 'VPN', { v: '其他', fields: [T('other', '其他')] }])],
              },
              { key: 'line_bw', cells: [S('专线带宽'), T('v')] },
              { key: 'line_lat', cells: [S('专线时延 / 抖动要求'), T('v')] },
              { key: 'built', cells: [S('是否已建成'), R('v', ['已建成', '建设中', '未建设'])] },
              {
                key: 'usage', cells: [S('用途'),
                  CK('v', ['站点复制', '容灾切换', '就近读写', '备份传输', { v: '其他', fields: [T('other', '其他')] }])],
              },
              { key: 'rpo_rto', cells: [S('对 RPO/RTO 的影响说明'), A('v')] },
            ],
          },
        ],
      },

      /* ============ 9. 数据备份与加密需求 ============ */
      {
        id: 's9', num: '9', title: '数据备份与加密需求', required: true, blocks: [
          {
            type: 'radios', id: 'b9q', label: '是否有数据备份加密需求？【必填】',
            items: [{ v: '是' }, { v: '否' }, { v: '部分数据需要', fields: [T('scope', '范围')] }],
          },
          {
            type: 'table', id: 'b91', title: '9.1 备份加密',
            columns: [{ label: '加密环节', w: '26%' }, { label: '需求', w: '38%' }, { label: '说明', w: '36%' }],
            rows: [
              { key: 'tls', cells: [S('传输加密（TLS）'), R('v', ['必须', '建议', '不需要']), T('note', '最低 TLS 版本：')] },
              { key: 'sse', cells: [S('静态加密（服务端）'), R('v', ['SSE-S3', 'SSE-KMS', '不需要']), T('note')] },
              { key: 'byok', cells: [S('客户自管密钥'), R('v', ['是', '否']), T('note', 'KMS/HSM：')] },
              { key: 'client', cells: [S('客户端加密'), R('v', ['是', '否']), T('note', '工具/库：')] },
              { key: 'backup_enc', cells: [S('备份介质/副本加密'), R('v', ['是', '否']), T('note')] },
              { key: 'rotation', cells: [S('密钥轮换周期'), T('v'), T('note')] },
            ],
          },
          {
            type: 'checks', id: 'b92', title: '9.2 备份策略概要（详见第 18 节）', cols: 2,
            items: [
              it('需要异地备份', 'offsite'), it('同城双活/双活倾向', 'dual'), it('仅本地冗余', 'local'),
            ],
            tail: [Fd([T('retain', '保留期限'), T('window', '备份窗口')])],
          },
        ],
      },

      /* ============ 10. S3 Tables 需求 ============ */
      {
        id: 's10', num: '10', title: 'S3 Tables 需求', required: true, blocks: [
          {
            type: 'radios', id: 'b10q', label: '是否有 S3 Tables 相关需求？【必填】',
            items: [{ v: '是（请说明用途与工作负载）' }, { v: '否' }, { v: '调研中 / 不确定' }],
          },
          {
            type: 'table', id: 'b10',
            columns: [{ label: '项', w: '28%' }, { label: '填写', w: '72%' }],
            rows: [
              { key: 'usage', cells: [S('用途说明'), A('v')] },
              { key: 'format', cells: [S('表格式/引擎倾向'), CK('v', ['Apache Iceberg', { v: '其他', fields: [T('other', '其他')] }, '不确定'])] },
              { key: 'engine', cells: [S('查询引擎'), CK('v', ['Spark', 'Trino', 'Flink', { v: '其他', fields: [T('other', '其他')] }])] },
              { key: 'tables', cells: [S('预估表数量 / 分区规模'), T('v')] },
              { key: 'integration', cells: [S('与对象存储的集成期望'), A('v')] },
              { key: 'in_poc', cells: [S('是否必须纳入本次 PoC'), R('v', ['是', '否', '可延后'])] },
            ],
          },
        ],
      },

      /* ============ 11. 预计文件大小分布 ============ */
      {
        id: 's11', num: '11', title: '预计文件大小分布', required: true, blocks: [
          {
            type: 'table', id: 'b11a', title: '11. 预计文件大小分布【必填】', note: '请填写各区间对象数量或容量占比（合计约 100%）：',
            columns: [{ label: '对象大小区间', w: '26%' }, { label: '数量占比 %', w: '22%' }, { label: '容量占比 %', w: '22%' }, { label: '备注', w: '30%' }],
            rows: [
              { key: 'lt64k', cells: [S('< 64 KB'), T('cnt'), T('cap'), T('note')] },
              { key: 'k64_1m', cells: [S('64 KB – 1 MB'), T('cnt'), T('cap'), T('note')] },
              { key: 'm1_16m', cells: [S('1 MB – 16 MB'), T('cnt'), T('cap'), T('note')] },
              { key: 'm16_128m', cells: [S('16 MB – 128 MB'), T('cnt'), T('cap'), T('note')] },
              { key: 'm128_1g', cells: [S('128 MB – 1 GB'), T('cnt'), T('cap'), T('note')] },
              { key: 'gt1g', cells: [S('> 1 GB'), T('cnt'), T('cap'), T('note')] },
              { key: 'total', cells: [S('合计'), S('~100%'), S('~100%'), T('note')] },
            ],
          },
          {
            type: 'table', id: 'b11b',
            columns: [{ label: '统计量', w: '30%' }, { label: '数值', w: '36%' }, { label: '单位', w: '34%' }],
            rows: [
              { key: 'avg', cells: [S('平均对象大小'), T('v'), T('unit', 'KB/MB/GB')] },
              { key: 'p50', cells: [S('P50 对象大小'), T('v'), T('unit', 'KB/MB/GB')] },
              { key: 'p99', cells: [S('P99 对象大小'), T('v'), T('unit', 'KB/MB/GB')] },
              { key: 'max', cells: [S('最大对象大小'), T('v'), T('unit', 'KB/MB/GB')] },
              {
                key: 'multipart', cells: [S('是否普遍使用 multipart'),
                  Fd([R('v', ['是', '否', '部分']), T('part', 'part 大小习惯：')]), S('---')],
              },
            ],
          },
        ],
      },

      /* ============ 12. 特殊需求 ============ */
      {
        id: 's12', num: '12', title: '特殊需求', required: true, blocks: [
          { type: 'listtext', id: 'b12a', title: '12. 特殊需求【必填】', note: '请列出所有特殊或非标准需求（无则写「无」）：', count: 5 },
          { type: 'fields', id: 'b12b', items: [{ label: '补充说明（开放栏）', ...A('v') }] },
        ],
      },

      /* ============ 13. 容量规划细化 ============ */
      {
        id: 's13', num: '13', title: '容量规划细化', blocks: [
          {
            type: 'table', id: 'b131', title: '13.1 有效容量 vs 原始容量',
            columns: [{ label: '项', w: '30%' }, { label: '【PoC】', w: '35%' }, { label: '【生产】', w: '35%' }],
            rows: [
              { key: 'raw', cells: [S('原始磁盘总容量'), T('poc'), T('prod')] },
              { key: 'usable', cells: [S('期望有效可用容量'), T('poc'), T('prod')] },
              { key: 'util', cells: [S('利用率目标（如 < 80%）'), T('poc'), T('prod')] },
              { key: 'reserve', cells: [S('预留空间说明'), T('poc'), T('prod')] },
            ],
          },
          {
            type: 'checks', id: 'b132', title: '13.2 数据保护偏好',
            items: [
              it('纠删码（Erasure Coding）偏好：期望配置示例 EC', 'ec', [T('v', '如 4+2、8+4 等，以实际产品支持为准')]),
              it('多副本偏好', 'replica', [T('v', '副本数')]),
              it('混合（请说明）', 'mixed', [T('v', '说明')]),
              it('尚未确定，需售前建议', 'tbd'),
            ],
          },
          {
            type: 'table', id: 'b133',
            columns: [{ label: '项', w: '50%' }, { label: '填写', w: '50%' }],
            rows: [
              { key: 'overhead', cells: [S('可接受的容量开销（冗余比）'), T('v')] },
              { key: 'disk_fail', cells: [S('可同时容忍的磁盘故障数'), T('v')] },
              { key: 'node_fail', cells: [S('可同时容忍的节点故障数'), T('v')] },
            ],
          },
        ],
      },

      /* ============ 14. 对象与文件特征细化 ============ */
      {
        id: 's14', num: '14', title: '对象与文件特征细化', blocks: [
          {
            type: 'table', id: 'b14',
            columns: [{ label: '特征', w: '34%' }, { label: '填写', w: '66%' }],
            rows: [
              { key: 'prefix', cells: [S('典型前缀/目录深度'), T('v')] },
              { key: 'keyname', cells: [S('键（Key）命名规范'), T('v')] },
              { key: 'smallfile_prefix', cells: [S('是否大量小文件同一前缀'), R('v', ['是', '否'])] },
              { key: 'meta', cells: [S('元数据 / 用户标签需求'), Fd([R('v', ['需要', '不需要']), T('example', '标签示例：')])] },
              { key: 'meta_size', cells: [S('自定义元数据大小估计'), T('v')] },
              { key: 'list_perf', cells: [S('是否需要目录列举高性能'), R('v', ['是', '否'])] },
              { key: 'overwrite', cells: [S('覆盖写频率'), T('v')] },
              { key: 'del_ratio', cells: [S('删除/覆盖比例（相对写入）'), T('v')] },
            ],
          },
        ],
      },

      /* ============ 15. 性能目标细化 ============ */
      {
        id: 's15', num: '15', title: '性能目标细化', blocks: [
          {
            type: 'table', id: 'b151', title: '15.1 延迟与吞吐细节',
            columns: [
              { label: '场景', w: '18%' }, { label: '对象大小', w: '15%' }, { label: '并发', w: '13%' },
              { label: '目标吞吐', w: '16%' }, { label: '目标 P99 延迟', w: '16%' }, { label: '备注', w: '22%' },
            ],
            rows: [
              { key: 'big_w', cells: [S('大对象顺序写'), T('size'), T('conc'), T('tp'), T('p99'), T('note')] },
              { key: 'big_r', cells: [S('大对象顺序读'), T('size'), T('conc'), T('tp'), T('p99'), T('note')] },
              { key: 'small_w', cells: [S('小对象高并发写'), T('size'), T('conc'), T('tp'), T('p99'), T('note')] },
              { key: 'small_r', cells: [S('小对象高并发读'), T('size'), T('conc'), T('tp'), T('p99'), T('note')] },
              { key: 'replay', cells: [S('混合业务回放'), S('---'), T('conc'), T('tp'), T('p99'), T('note', '流量模型：')] },
            ],
          },
          {
            type: 'checks', id: 'b152', title: '15.2 基准测试约定',
            note: '建议使用通用对象存储基准工具（如 warp 类、或自研压测、业务压测）；客户端：RustFS / mc 兼容客户端、AWS CLI、SDK、rclone 等。',
            items: [
              it('客户提供业务压测脚本', 'custom'), it('使用标准基准工具', 'standard'), it('两者都要', 'both'),
            ],
            tail: [T('window', '压测窗口与隔离要求：')],
          },
        ],
      },

      /* ============ 16. 网络与多站点 ============ */
      {
        id: 's16', num: '16', title: '网络与多站点', blocks: [
          {
            type: 'checks', id: 'b161', title: '16.1 拓扑', cols: 2,
            items: [
              it('单站点单机房', 'single'), it('单站点多 AZ / 多可用区', 'multiaz'),
              it('双活 / 双中心', 'dual'), it('跨地区多站点', 'multisite'), it('边缘 + 中心', 'edge'),
            ],
            tail: [A('topo', '拓扑草图/说明')],
          },
          {
            type: 'checks', id: 'b162', title: '16.2 连接方式', cols: 2,
            items: [it('专线', 'mpls'), it('VPN', 'vpn'), it('公网 TLS', 'public'), it('混合', 'mixed')],
            tail: [S('详情见第 7、8 节。')],
          },
          {
            type: 'table', id: 'b163', title: '16.3 复制与一致性',
            columns: [{ label: '项', w: '40%' }, { label: '需求', w: '60%' }],
            rows: [
              { key: 'site_repl', cells: [S('站点复制'), R('v', ['需要', '不需要', '待定'])] },
              { key: 'bucket_repl', cells: [S('桶级复制'), R('v', ['需要', '不需要'])] },
              { key: 'async_ok', cells: [S('异步复制可接受'), R('v', ['是', '否'])] },
              { key: 'rpo', cells: [S('目标 RPO'), T('v')] },
              { key: 'rto', cells: [S('目标 RTO'), T('v')] },
              { key: 'conflict', cells: [S('冲突处理期望'), T('v')] },
            ],
          },
        ],
      },

      /* ============ 17. 安全、合规与访问控制 ============ */
      {
        id: 's17', num: '17', title: '安全、合规与访问控制', blocks: [
          {
            type: 'checks', id: 'b171', title: '17.1 传输与静态加密（与第 9 节呼应）', cols: 2,
            items: [
              it('全站强制 HTTPS/TLS', 'https'),
              it('内网明文可接受（不推荐，需书面确认）', 'plain', [T('v', '书面确认说明')]),
              it('SSE-S3', 'sse_s3'), it('SSE-KMS', 'sse_kms'),
              it('客户提供密钥材料', 'byok'), it('客户端加密', 'client'),
            ],
          },
          {
            type: 'table', id: 'b172', title: '17.2 密钥托管',
            columns: [{ label: '项', w: '30%' }, { label: '填写', w: '70%' }],
            rows: [
              { key: 'kms_type', cells: [S('KMS 类型'), CK('v', ['云 KMS', '自建 KMS', 'HSM', { v: '其他', fields: [T('other', '其他')] }])] },
              { key: 'kms_product', cells: [S('现有 KMS 产品'), T('v')] },
              { key: 'approval', cells: [S('密钥权限审批流程'), T('v')] },
            ],
          },
          {
            type: 'checks', id: 'b173', title: '17.3 身份与访问', cols: 2,
            items: [
              it('长期 Access Key', 'ak'), it('STS 临时凭证', 'sts'),
              it('与企业 IdP 集成（OIDC/LDAP/AD 等）', 'idp', [T('v', 'IdP')]),
              it('细粒度 IAM / 桶策略', 'iam'), it('多用户隔离 / 多租户', 'tenant'),
              it('预签名 URL', 'presign'), it('CORS 配置需求', 'cors', [T('v', '说明')]),
            ],
          },
          {
            type: 'checks', id: 'b174', title: '17.4 审计与防勒索', cols: 2,
            items: [
              it('审计日志（操作审计）必须', 'audit'),
              it('日志外发到 SIEM', 'siem', [T('v', 'SIEM')]),
              it('Object Lock / WORM', 'worm'), it('合规保留（Compliance Retention）', 'compliance'),
              it('版本控制防误删', 'versioning'), it('其他', 'other', [T('v', '说明')]),
            ],
          },
        ],
      },

      /* ============ 18. 备份、版本与容灾 ============ */
      {
        id: 's18', num: '18', title: '备份、版本与容灾', blocks: [
          {
            type: 'table', id: 'b18',
            columns: [{ label: '策略项', w: '30%' }, { label: '【PoC】', w: '35%' }, { label: '【生产】', w: '35%' }],
            rows: [
              { key: 'versioning', cells: [S('版本控制 Versioning'), R('poc', ['开', '关']), R('prod', ['开', '关'])] },
              { key: 'mfa_delete', cells: [S('删除保护 / MFA Delete 类需求'), R('poc', ['是', '否']), R('prod', ['是', '否'])] },
              { key: 'lifecycle', cells: [S('生命周期（转冷/过期）'), T('poc'), T('prod')] },
              { key: 'offsite', cells: [S('异地备份'), R('poc', ['是', '否']), R('prod', ['是', '否'])] },
              { key: 'retain', cells: [S('备份保留年限'), T('poc'), T('prod')] },
              { key: 'drill', cells: [S('定期恢复演练'), R('poc', ['需要', '不需要']), R('prod', ['需要', '不需要'])] },
              { key: 'tool', cells: [S('备份工具'), T('poc'), T('prod')] },
            ],
          },
          { type: 'fields', id: 'b18note', items: [{ label: '容灾说明', ...A('v') }] },
        ],
      },

      /* ============ 19. S3 兼容性与集成 ============ */
      {
        id: 's19', num: '19', title: 'S3 兼容性与集成', blocks: [
          {
            type: 'checks', id: 'b191', title: '19.1 必需 API / 能力（勾选）', cols: 2,
            items: [
              it('基础对象 CRUD（Put/Get/Delete/Head）', 'crud'), it('列举（List / ListObjectsV2）', 'list'),
              it('Multipart Upload', 'multipart'), it('预签名 URL', 'presign'),
              it('桶策略 / IAM 策略', 'policy'), it('Versioning', 'versioning'), it('Lifecycle', 'lifecycle'),
              it('通知 / Event Notification', 'notify'), it('对象标签 / 元数据', 'tagging'),
              it('选择性查询（Select，如需要）', 'select'), it('复制相关 API', 'replication'),
              it('其他', 'other', [T('v', '请注明')]),
            ],
          },
          {
            type: 'checks', id: 'b192', title: '19.2 SDK 与语言', cols: 2,
            items: [
              it('Java', 'java'), it('Python', 'python'), it('Go', 'go'), it('JavaScript/Node', 'node'),
              it('C/C++', 'cpp'), it('.NET', 'dotnet'), it('Rust', 'rust'),
              it('其他', 'other', [T('v', '请注明')]),
            ],
          },
          {
            type: 'table', id: 'b193', title: '19.3 现有工具与平台',
            columns: [{ label: '工具/平台', w: '24%' }, { label: '使用', w: '10%' }, { label: '版本', w: '24%' }, { label: '备注', w: '42%' }],
            rows: [
              { key: 'rclone', cells: [S('rclone'), C('use'), T('ver'), T('note')] },
              { key: 's3fs', cells: [S('s3fs / goofys 等'), C('use'), T('ver'), T('note')] },
              { key: 'awscli', cells: [S('AWS CLI'), C('use'), T('ver'), T('note')] },
              { key: 'spark', cells: [S('Spark'), C('use'), T('ver'), T('note')] },
              { key: 'flink', cells: [S('Flink'), C('use'), T('ver'), T('note')] },
              { key: 'trino', cells: [S('Trino / Presto'), C('use'), T('ver'), T('note')] },
              { key: 'backup_sw', cells: [S('备份软件（Veeam 等）'), C('use'), T('ver'), T('note', '名称：')] },
              { key: 'nas', cells: [S('NAS 网关'), C('use'), T('ver'), T('note')] },
              { key: 'cicd', cells: [S('CI/CD / 制品库'), C('use'), T('ver'), T('note')] },
              { key: 'other', cells: [S('其他'), C('use'), T('ver'), T('note')] },
            ],
          },
          {
            type: 'radios', id: 'b194', label: '19.4 S3 Tables（再次确认，与第 10 节一致）',
            items: [{ v: '需要' }, { v: '不需要' }, { v: '不确定' }],
            tail: [T('usage', '用途：')],
          },
        ],
      },

      /* ============ 20. 功能需求清单 ============ */
      {
        id: 's20', num: '20', title: '功能需求清单', blocks: [
          {
            type: 'table', id: 'b20',
            columns: [
              { label: '功能', w: '24%' }, { label: 'PoC 必须', w: '12%' }, { label: '生产需要', w: '12%' },
              { label: '优先级', w: '14%' }, { label: '备注', w: '38%' },
            ],
            rows: [
              { key: 'versioning', cells: [S('Versioning'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'lifecycle', cells: [S('Lifecycle'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'notify', cells: [S('事件通知'), C('poc'), C('prod'), T('prio', 'P__'), T('note', '目标系统：')] },
              { key: 'quota', cells: [S('配额 Quota'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'tenant', cells: [S('多租户'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'sts', cells: [S('STS'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'select', cells: [S('选择查询 Select'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'compress', cells: [S('压缩'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'dedup', cells: [S('去重（如有需求）'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'presign', cells: [S('预签名 URL'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'cors', cells: [S('CORS'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'website', cells: [S('静态网站托管'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'policy', cells: [S('桶策略'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'worm', cells: [S('Object Lock / WORM'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'encrypt', cells: [S('加密 SSE/KMS'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'audit', cells: [S('审计日志'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'prom', cells: [S('Prometheus 指标'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
              { key: 'other', cells: [S('其他'), C('poc'), C('prod'), T('prio', 'P__'), T('note')] },
            ],
          },
        ],
      },

      /* ============ 21. 部署形态与软件环境 ============ */
      {
        id: 's21', num: '21', title: '部署形态与软件环境', blocks: [
          {
            type: 'checks', id: 'b211', title: '21.1 部署形态', cols: 2,
            items: [
              it('裸金属', 'baremetal'),
              it('虚拟机（VMware / KVM / Hyper-V / 其他）', 'vm', [T('v', '虚拟化类型')]),
              it('Kubernetes', 'k8s'),
              it('混合', 'mixed', [T('v', '说明')]),
            ],
          },
          {
            type: 'table', id: 'b212', title: '21.2 节点规划',
            columns: [{ label: '项', w: '34%' }, { label: '【PoC】', w: '33%' }, { label: '【生产】（规划）', w: '33%' }],
            rows: [
              { key: 'nodes', cells: [S('计划节点数'), T('poc'), T('prod')] },
              { key: 'min_nodes', cells: [S('最低节点数说明（售前填写建议）'), T('poc'), T('prod')] },
              { key: 'colocated', cells: [S('是否混部其他业务'), R('poc', ['是', '否']), R('prod', ['是', '否'])] },
              { key: 'os', cells: [S('操作系统及版本'), T('poc'), T('prod')] },
              { key: 'kernel', cells: [S('内核版本'), T('poc'), T('prod')] },
              { key: 'runtime', cells: [S('容器运行时（若 K8s）'), T('poc'), T('prod')] },
              {
                key: 'disk_mode', cells: [S('磁盘模式'),
                  CK('poc', ['JBOD 直通', '硬件 RAID（对象存储一般不推荐）', { v: '其他', fields: [T('other', '其他')] }]),
                  T('prod', '同左或说明')],
              },
            ],
          },
          {
            type: 'fields', id: 'b212note',
            items: [{ label: '若必须使用硬件 RAID，请说明原因与级别', ...T('raid_reason') }],
          },
          {
            type: 'checks', id: 'b213', title: '21.3 时间同步与基础服务', cols: 2,
            items: [
              it('NTP/Chrony 已配置', 'ntp'), it('DNS 解析可用', 'dns'),
              it('防火墙规则已规划', 'fw'), it('证书（公有/私有 CA）计划', 'cert', [T('v', '计划')]),
            ],
          },
        ],
      },

      /* ============ 22. 硬件调研表 ============ */
      {
        id: 's22', num: '22', title: '硬件调研表', blocks: [
          {
            type: 'group', id: 'g221', title: '22.1 节点硬件明细（按节点类型复制填写）',
            addLabel: '＋ 添加节点类型', min: 1,
            blocks: [
              {
                type: 'fields', id: 'nt',
                items: [{ label: '节点类型名称', ...T('v', '如：存储节点 / 接入节点') }],
              },
              {
                type: 'table', id: 'hw',
                columns: [
                  { label: '组件', w: '14%' }, { label: '型号 / 规格', w: '24%' }, { label: '数量/节点', w: '24%' },
                  { label: '全集群数量', w: '16%' }, { label: '备注', w: '22%' },
                ],
                rows: [
                  { key: 'server', cells: [S('服务器型号'), T('model'), T('qty'), T('total'), T('note')] },
                  { key: 'cpu', cells: [S('CPU'), T('model'), Fd([T('sockets', '路数'), T('cores', '核数')]), T('total'), S('建议记录主频')] },
                  { key: 'mem', cells: [S('内存'), T('model'), Fd([T('qty'), S('GB')]), T('total'), T('note')] },
                  { key: 'sysdisk', cells: [S('系统盘'), T('model'), T('qty'), T('total'), T('note')] },
                  { key: 'datadisk', cells: [S('数据盘'), T('model'), Fd([T('blocks', '块数'), T('tb', '单盘 TB')]), T('total'), S('HDD/SSD/NVMe')] },
                  { key: 'nic', cells: [S('网卡'), T('model'), Fd([T('qty', '数量'), T('speed', '速率 GbE')]), T('total'), T('note', '是否双口绑定')] },
                  { key: 'hba', cells: [S('HBA/控制器'), T('model'), T('qty'), T('total'), Fd([S('非 RAID 模式？'), R('nonraid', ['是', '否'])])] },
                  { key: 'gpu', cells: [S('GPU（若相关）'), T('model'), T('qty'), T('total'), S('一般对象存储不需要')] },
                ],
              },
            ],
          },
          {
            type: 'checks', id: 'b222', title: '22.2 磁盘与控制器健康关注点',
            items: [
              it('已确认数据盘为 JBOD/直通，非硬件 RAID 阵列承载对象数据', 'jbod'),
              it('已记录磁盘固件版本', 'fw', [T('v', '固件版本')]),
              it('已做通电/smart 初检', 'smart', [T('v', '结果')]),
              it('控制器缓存/写回策略说明', 'cache', [T('v', '说明')]),
            ],
          },
          {
            type: 'table', id: 'b223', title: '22.3 网络设备',
            columns: [{ label: '项', w: '34%' }, { label: '填写', w: '66%' }],
            rows: [
              { key: 'switch', cells: [S('接入交换机型号'), T('v')] },
              { key: 'uplink', cells: [S('上联带宽'), T('v')] },
              { key: 'mtu', cells: [S('MTU 规划'), CK('v', ['1500', '9000(Jumbo)', { v: '其他', fields: [T('other', '其他')] }])] },
              { key: 'rdma', cells: [S('是否 RDMA / RoCE'), R('v', ['是', '否', '规划中'])] },
              { key: 'cable', cells: [S('是否已做错线/环路检查'), R('v', ['是', '否'])] },
            ],
          },
          {
            type: 'fields', id: 'b224', title: '22.4 环境与供电【可选】',
            items: [{ label: '机柜 U 位、供电、散热是否满足', ...T('v') }],
          },
        ],
      },

      /* ============ 23. 运维与可观测性 ============ */
      {
        id: 's23', num: '23', title: '运维与可观测性', blocks: [
          {
            type: 'checks', id: 'b231', title: '23.1 监控', cols: 2,
            items: [
              it('Prometheus', 'prom'), it('Grafana', 'grafana'),
              it('既有监控平台对接', 'existing', [T('v', '平台')]),
              it('自定义指标需求', 'custom', [T('v', '说明')]),
            ],
          },
          {
            type: 'table', id: 'b232', title: '23.2 日志与告警',
            columns: [{ label: '项', w: '26%' }, { label: '填写', w: '74%' }],
            rows: [
              { key: 'collect', cells: [S('日志采集'), CK('v', ['文件', 'syslog', { v: '其他', fields: [T('other', '其他')] }])] },
              { key: 'alert', cells: [S('告警通道'), CK('v', ['邮件', '短信', '企微/钉钉/飞书', 'Pager', { v: '其他', fields: [T('other', '其他')] }])] },
              { key: 'owner', cells: [S('告警负责人'), T('v')] },
              { key: 'audit_keep', cells: [S('审计日志保留'), T('v')] },
            ],
          },
          {
            type: 'table', id: 'b233', title: '23.3 运维期望',
            columns: [{ label: '项', w: '34%' }, { label: '期望', w: '66%' }],
            rows: [
              { key: 'upgrade', cells: [S('升级是否要求业务无中断'), Fd([R('v', ['是', '否', '可接受短暂中断']), T('note', '说明')])] },
              { key: 'support', cells: [S('支持窗口'), Fd([R('v', ['5×8', '7×24', '其他']), T('note', '说明')])] },
              { key: 'change', cells: [S('变更窗口'), T('v')] },
              { key: 'backup_cfg', cells: [S('备份监控配置本身'), R('v', ['需要', '不需要'])] },
            ],
          },
        ],
      },

      /* ============ 24. 集成系统与测试用例 ============ */
      {
        id: 's24', num: '24', title: '集成系统与测试用例', blocks: [
          {
            type: 'table', id: 'b241', title: '24.1 集成系统清单（客户填写）', addable: true, addLabel: '＋ 添加系统', minRows: 5,
            columns: [
              { label: '序号', w: '7%' }, { label: '系统名称', w: '20%' }, { label: '负责人', w: '14%' },
              { label: '协议/SDK', w: '18%' }, { label: '关键用例摘要', w: '26%' }, { label: 'PoC 是否覆盖', w: '15%' },
            ],
            rowTemplate: [IX(), T('name'), T('owner'), T('sdk'), T('case'), C('covered')],
          },
          {
            type: 'table', id: 'b242', title: '24.2 测试用例表（可增行）', addable: true, addLabel: '＋ 添加用例', minRows: 5,
            columns: [
              { label: '用例 ID', w: '10%' }, { label: '描述', w: '18%' }, { label: '前置条件', w: '15%' },
              { label: '步骤摘要', w: '20%' }, { label: '期望结果', w: '18%' }, { label: '优先级', w: '8%' }, { label: '结果', w: '11%' },
            ],
            rowTemplate: [T('case_id'), T('desc'), T('pre'), T('steps'), T('expect'), T('prio', 'P__'), R('result', ['通过', '失败', '阻塞'])],
            seed: [{ case_id: 'TC-001' }, { case_id: 'TC-002' }, { case_id: 'TC-003' }, { case_id: 'TC-004' }, { case_id: 'TC-005' }],
          },
        ],
      },

      /* ============ 25. 时间计划与里程碑 ============ */
      {
        id: 's25', num: '25', title: '时间计划与里程碑', blocks: [
          {
            type: 'table', id: 'b25',
            columns: [
              { label: '里程碑', w: '26%' }, { label: '计划日期', w: '18%' }, { label: '负责人', w: '16%' },
              { label: '交付物', w: '24%' }, { label: '状态', w: '16%' },
            ],
            rows: [
              { key: 'm1', cells: [S('调研表回收确认'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '本表签字版'), C('done')] },
              { key: 'm2', cells: [S('环境就绪（网络/机器）'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '环境检查报告'), C('done')] },
              { key: 'm3', cells: [S('完成安装与基础配置'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '集群可用'), C('done')] },
              { key: 'm4', cells: [S('完成基准测试'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '性能报告'), C('done')] },
              { key: 'm5', cells: [S('完成业务联调'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '联调记录'), C('done')] },
              { key: 'm6', cells: [S('故障演练'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '演练报告'), C('done')] },
              { key: 'm7', cells: [S('PoC 总结评审'), T('date', 'YYYY-MM-DD'), T('owner'), T('deliver', '', '总结与生产建议'), C('done')] },
            ],
          },
          { type: 'para', id: 'b25note', lines: ['周节奏建议：每周输出 —— 进展、风险、下步计划、需决策项。'] },
        ],
      },

      /* ============ 26. 能力验证维度 ============ */
      {
        id: 's26', num: '26', title: '能力验证维度（Reliability / Resiliency / Performance / Control / Monitoring）',
        note: '以下维度用于 PoC 过程中系统性验证（请在 PoC 结束时勾选完成情况）。',
        blocks: [
          {
            type: 'checks', id: 'b261', title: '26.1 Reliability（可靠性）',
            items: [
              it('长时间稳定写入/读取无异常中断', 'stable'),
              it('磁盘只读/损坏场景下数据可访问（在冗余能力内）', 'disk_bad'),
              it('电源/重启后服务自动恢复', 'reboot'),
            ],
            tail: [T('record', '记录：')],
          },
          {
            type: 'checks', id: 'b262', title: '26.2 Resiliency（韧性）',
            items: [
              it('单节点故障演练通过', 'node'), it('单磁盘故障演练通过', 'disk'),
              it('网络分区/丢包演练（如适用）', 'net'), it('重建/修复期间业务影响可接受', 'rebuild'),
            ],
            tail: [T('record', '记录：')],
          },
          {
            type: 'checks', id: 'b263', title: '26.3 Performance（性能）',
            items: [
              it('达成约定吞吐/延迟目标（见第 3、7、15 节）', 'goal'),
              it('小文件与大文件场景均有基线数据', 'baseline'),
              it('资源利用率（CPU/内存/网/盘）在合理区间', 'util'),
            ],
            tail: [T('record', '记录：')],
          },
          {
            type: 'checks', id: 'b264', title: '26.4 Control（管控）',
            items: [
              it('IAM / 策略 / 多用户验证', 'iam'), it('TLS 与加密策略验证', 'tls'),
              it('配额 / 租户隔离（如需要）', 'quota'), it('Lifecycle / Versioning 行为符合预期', 'lifecycle'),
            ],
            tail: [T('record', '记录：')],
          },
          {
            type: 'checks', id: 'b265', title: '26.5 Monitoring（监控）',
            items: [
              it('Prometheus 指标可刮取', 'prom'), it('Grafana（或等价）看板可用', 'grafana'),
              it('关键告警可触发并触达', 'alert'), it('审计日志可查询', 'audit'),
            ],
            tail: [T('record', '记录：')],
          },
        ],
      },

      /* ============ 附录 A ============ */
      {
        id: 'sa', num: '附录 A', title: '建议 PoC 流程 Checklist', blocks: [
          {
            type: 'checks', id: 'ba1', title: 'A.1 准备阶段',
            items: [
              it('回收并评审本调研表（必填项完整）', 'review'), it('确认成功标准与范围边界', 'scope'),
              it('确认硬件到货/资源就绪', 'hw'), it('确认网络互通与防火墙策略', 'net'),
              it('确认时间计划与联系人', 'plan'), it('准备测试数据与脱敏策略', 'data'),
            ],
          },
          {
            type: 'checks', id: 'ba2', title: 'A.2 安装部署',
            items: [
              it('操作系统与时间同步检查', 'os'), it('磁盘 JBOD/直通确认', 'disk'),
              it('安装 RustFS 集群（节点数按方案）', 'install'), it('配置 TLS 证书', 'tls'),
              it('创建测试桶与用户/策略', 'user'), it('配置审计 / 日志 / 事件通知（按需）', 'audit'),
              it('配置 Prometheus 抓取与 Grafana 看板', 'prom'), it('配置 KMS/加密（按需）', 'kms'),
              it('配置 STS（按需）', 'sts'), it('多用户与策略验证', 'policy'),
            ],
          },
          {
            type: 'checks', id: 'ba3', title: 'A.3 验证与基准',
            items: [
              it('功能冒烟（上传/下载/列举/删除/multipart）', 'smoke'),
              it('兼容性用例执行（第 19/24 节）', 'compat'), it('性能基准（读/写/混合；记录参数与结果）', 'bench'),
              it('业务应用联调', 'app'), it('故障演练（节点/磁盘）', 'drill'), it('监控与告警验证', 'monitor'),
            ],
          },
          {
            type: 'checks', id: 'ba4', title: 'A.4 收尾',
            items: [
              it('PoC 报告（含成功标准对照表）', 'report'), it('问题清单与风险', 'risk'),
              it('生产架构与容量建议', 'arch'), it('商务与下一步（如适用）', 'biz'),
            ],
          },
        ],
      },

      /* ============ 附录 B ============ */
      {
        id: 'sb', num: '附录 B', title: '硬件与网络自检命令提示', blocks: [
          {
            type: 'para', id: 'bb_p', lines: [
              '以下为通用 Linux 自检提示，供客户运维在 PoC 前自行采集信息；请按实际发行版调整。命令输出可附在本表附录或单独文档。',
              'B.1 CPU / 内存 / 机器：lscpu；cat /proc/cpuinfo | head -n 50；free -h；cat /proc/meminfo | head；uname -a；hostnamectl',
              'B.2 磁盘与块设备：lsblk -o NAME,SIZE,TYPE,ROTA,MODEL,SERIAL,TRAN,MOUNTPOINT；nvme list；lsscsi；df -hT；（可选）dd 单盘顺序写粗测',
              '注意：对数据盘做破坏性测试前务必确认设备名；生产数据盘禁止误操作。',
              'B.3 网络：ip -br a；ip route；ethtool <iface>；节点间带宽 iperf3 -s / iperf3 -c <server_ip> -P 4 -t 30',
              'B.4 时间与基础：timedatectl；chronyc tracking 或 ntpq -p',
              'B.5 对象存储客户端冒烟：使用 RustFS 文档推荐的客户端或 S3 兼容客户端（如 mc 兼容工具、AWS CLI）配置 endpoint、Access Key；完成建桶 → 上传 → 下载 → 列举 → 删除 → multipart 大对象；基准测试记录并发、对象大小、时长、带宽与错误率。',
            ],
          },
          { type: 'fields', id: 'bb_out', items: [{ label: '自检命令输出 / 附件说明', ...A('v') }] },
        ],
      },

      /* ============ 附录 C ============ */
      {
        id: 'sc', num: '附录 C', title: '安装与配置检查清单', blocks: [
          {
            type: 'table', id: 'bc',
            columns: [{ label: '配置项', w: '26%' }, { label: '需要', w: '10%' }, { label: '已完成', w: '10%' }, { label: '备注', w: '54%' }],
            rows: [
              { key: 'tls', cells: [S('TLS'), C('need'), C('done'), T('note', '证书来源：')] },
              { key: 'audit', cells: [S('审计日志'), C('need'), C('done'), T('note', '外发：')] },
              { key: 'logger', cells: [S('Logger / 应用日志'), C('need'), C('done'), T('note')] },
              { key: 'notify', cells: [S('事件通知'), C('need'), C('done'), T('note', '目标：Webhook/队列等')] },
              { key: 'prom', cells: [S('Prometheus'), C('need'), C('done'), T('note', '地址：')] },
              { key: 'grafana', cells: [S('Grafana'), C('need'), C('done'), T('note', '看板：')] },
              { key: 'sts', cells: [S('STS'), C('need'), C('done'), T('note')] },
              { key: 'kms', cells: [S('KMS / 加密'), C('need'), C('done'), T('note')] },
              { key: 'select', cells: [S('选择性查询 Select（如相关）'), C('need'), C('done'), T('note')] },
              { key: 'policy', cells: [S('多用户与策略'), C('need'), C('done'), T('note')] },
              { key: 'worm', cells: [S('Versioning / Object Lock'), C('need'), C('done'), T('note')] },
              { key: 'replication', cells: [S('站点/桶复制'), C('need'), C('done'), T('note')] },
            ],
          },
        ],
      },

      /* ============ 必填项速查 ============ */
      {
        id: 'sreq', num: '必填项速查', title: '必填项速查（客户自检）',
        note: '请确认以下 9 项用户关键必填均已填写：',
        blocks: [
          {
            type: 'table', id: 'breq',
            columns: [{ label: '#', w: '8%' }, { label: '主题', w: '38%' }, { label: '所在章节', w: '24%' }, { label: '已填', w: '30%' }],
            rows: [
              { key: 'r1', cells: [S('1'), S('使用场景'), S('§4'), C('done')] },
              { key: 'r2', cells: [S('2'), S('使用容量'), S('§5'), C('done')] },
              { key: 'r3', cells: [S('3'), S('预计数据增长'), S('§6'), C('done')] },
              { key: 'r4', cells: [S('4'), S('带宽'), S('§7'), C('done')] },
              { key: 'r5', cells: [S('5'), S('是否跨地区有专线需求'), S('§8'), C('done')] },
              { key: 'r6', cells: [S('6'), S('是否有数据备份加密需求'), S('§9'), C('done')] },
              { key: 'r7', cells: [S('7'), S('是否有 S3 Tables 的需求'), S('§10'), C('done')] },
              { key: 'r8', cells: [S('8'), S('预计的文件大小分布'), S('§11'), C('done')] },
              { key: 'r9', cells: [S('9'), S('有没有特殊需求'), S('§12'), C('done')] },
            ],
          },
        ],
      },

      /* ============ 签署确认 ============ */
      {
        id: 'ssign', num: '签署确认', title: '签署确认', blocks: [
          {
            type: 'table', id: 'bsign',
            columns: [{ label: '方', w: '25%' }, { label: '姓名', w: '25%' }, { label: '签字', w: '25%' }, { label: '日期', w: '25%' }],
            rows: [
              { key: 'customer', cells: [S('客户确认'), T('name'), T('sign'), T('date', 'YYYY-MM-DD')] },
              { key: 'sales', cells: [S('RustFS 销售'), T('name'), T('sign'), T('date', 'YYYY-MM-DD')] },
              { key: 'presale', cells: [S('RustFS 售前'), T('name'), T('sign'), T('date', 'YYYY-MM-DD')] },
            ],
          },
        ],
      },
    ],
  };

  /* ---------- 路径 / 取值工具（表单与 PDF 渲染共用） ---------- */
  function setPath(obj, path, value) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const nextIsIndex = /^\d+$/.test(parts[i + 1]);
      if (cur[p] === undefined || cur[p] === null || typeof cur[p] !== 'object') {
        cur[p] = nextIsIndex ? [] : {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
    return obj;
  }

  function getPath(obj, path) {
    if (!path) return undefined;
    const parts = String(path).split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur === undefined || cur === null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  /** 表格行的路径前缀：具名行用 row.key，动态行用序号 */
  function rowPath(blockId, row, idx) {
    return blockId + '.' + (row && row.key ? row.key : String(idx));
  }

  /** 命名块（group 内部）加前缀 */
  function prefixed(prefix, path) {
    return prefix ? prefix + '.' + path : path;
  }

  return { SCHEMA, setPath, getPath, rowPath, prefixed, T, A, R, C, CK, S, Fd, IX, it };
}));

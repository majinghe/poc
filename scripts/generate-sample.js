/**
 * 生成示例填写数据的 PDF，用于验证 PDF 渲染效果。
 * 数据格式与前端收集器（RustFSForm.collect）输出一致：
 *   text/textarea → 字符串；radio → 选中的字符串；check → 布尔；checks → 数组；编号行/动态行/可重复组 → 数组。
 * 用法：npm run sample   （输出 output/sample.pdf）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { buildHtml } = require('../src/pdf-template');
const { renderPdf, closeBrowser, findChrome } = require('../src/browser');

const data = {
  docmeta: {
    version: { v: 'v1.0' },
    date: { v: '2026-09-23' },
    customer: { v: '示例科技有限公司' },
    sales: { v: '张销售' },
    presale: { v: '李售前' },
    project_no: { v: 'POC-2026-001' },
    status: { v: '客户初填' },
  },
  b11: {
    proj: { poc: 'RustFS 对象存储 PoC', prod: '生产对象存储平台' },
    start: { poc: '2026-10-08', prod: '2026-12-01' },
    end: { poc: '2026-11-15', prod: '2027-01-31' },
    site: { poc: '北京机房 A 区', prod: '北京 / 上海双中心' },
    tz: { poc: 'Asia/Shanghai', prod: 'Asia/Shanghai' },
  },
  b12: {
    cust_tech: { name: '王工', dept: '基础架构部', mail: 'wang@example.com', tel: '138****0001', note: '' },
    sales: { name: '张销售', dept: 'RustFS', mail: 'sales@rustfs.com', tel: '', note: '' },
  },
  b13: {
    weekly: true,
    weekly__day: '周二',
    weekly__min: '30',
    im: true,
    im__v: 'RustFS PoC 对接群',
  },
  b21: {
    industry: { v: '金融' },
    scale: { emp: '3000', it: '200' },
    storage_now: { v: '现有 NAS + 公有云 S3 混合使用' },
    why: { v: '降本增效，替换公有云 S3，满足数据驻留合规' },
  },
  b22: {
    dengbao: { ap: '是', lvl: '三级', note: '' },
    finance: { ap: '是', lvl: '人行相关指引', note: '' },
    dataclass: { ap: '是', lvl: '核心业务数据', note: '' },
  },
  b23: { domestic: true, region: true, region__v: '华北 / 华东' },
  b31: ['验证 RustFS 与 S3 兼容性满足业务接入', '达成 2 GB/s 聚合读吞吐目标', '节点/磁盘故障演练数据不丢失', '与备份软件联调通过', ''],
  b32: {
    avail: { goal: '≥ 99.9%', method: '可用性探测 / SLA 报告', must: '是', note: '' },
    tpr: { goal: '2 GB/s', method: '对象存储基准测试工具 / 业务压测', must: '是', note: 'warp 基准' },
    tpw: { goal: '1 GB/s', method: '同上', must: '是', note: '' },
    p50: { goal: '20 ms', method: '客户端采样', must: '否', note: '' },
    p99: { goal: '50 ms', method: '客户端采样', must: '是', note: '' },
  },
  b33: { scope_in: '单集群 4 节点部署、基准测试、业务联调、故障演练', scope_out: '生产迁移与割接', risk: '测试数据需脱敏；网络策略开通依赖客户网络组' },
  b34: { env: true, install: true, config: true, bench: true, app: true, drill: true, weekly: true, report: true },
  b41: { backup: true, bigdata: true, replace: true, log: true },
  b42: {
    p0: { name: '备份归档', desc: '每日备份集落盘', rw: '2:8', hot: '否', lifecycle: '90 天转冷' },
    p1: { name: '大数据分析', desc: '数据湖原始层', rw: '7:3', hot: '是', lifecycle: '长期保留' },
  },
  b43: { seq_write: true, rand_read: true, mixed: true, worm: true, cold: true, note: '读多写少，日终批量写入' },
  b5: {
    current: { poc: '20', prod: '800', note: '' },
    import: { poc: '20', note: '' },
    logical: { poc: '30', prod: '1.2', note: '生产单位 PB' },
    raw: { poc: '45', prod: '2', note: 'EC 4+2 估算' },
    buckets: { poc: '10', prod: '200', note: '' },
    objects: { poc: '500 万', prod: '20 亿', note: '' },
    max_bucket: { poc: '200 万', prod: '5 亿', note: '' },
  },
  b5note: { v: '生产容量按 3 年规划，含 20% 预留。' },
  b6: {
    month: { v: '3', note: '%/月' },
    year: { v: '40', note: '%/年' },
    obj_month: { v: '5', note: '%/月' },
    peak: { v: '是', note: '月末/季末备份高峰' },
    peak_ratio: { v: '3' },
    smallfile: { v: '否' },
    future: { y1: '1', y3: '3', y5: '5', note: '单位 PB' },
  },
  b71: {
    ns: { bw: '25', lat: '1' },
    ew: { bw: '25', lat: '0.2' },
    az: { bw: '10', lat: '2' },
  },
  b72: {
    wtp: { poc: '1 GB/s', prod: '2 GB/s' },
    rtp: { poc: '2 GB/s', prod: '5 GB/s' },
    clients: { poc: '50', prod: '500' },
    peak: { poc: '20:00-23:00', prod: '20:00-23:00' },
  },
  b73: { dedicated: true, iperf: 'iperf3 基线已完成', iperf_note: '节点间 23.5 Gbps' },
  b8q: { value: '否' },
  b8: { regions: { v: '北京、上海' }, line_type: { v: ['运营商专线'] }, built: '已建成', usage: { v: ['容灾切换', '备份传输'] } },
  b9q: { value: '是' },
  b91: {
    tls: { v: '必须', note: '最低 TLS 1.2' },
    sse: { v: 'SSE-KMS', note: '' },
    byok: { v: '是', note: '自建 KMS' },
    client: { v: '否' },
    backup_enc: { v: '是' },
  },
  b92: { offsite: true, dual: true, retain: '3 年', window: '每日 22:00-02:00' },
  b10q: { value: '调研中 / 不确定' },
  b10: { format: { v: ['Apache Iceberg'] }, engine: { v: ['Spark', 'Trino'] }, in_poc: '可延后' },
  b11a: {
    lt64k: { cnt: '30', cap: '2', note: '日志类' },
    k64_1m: { cnt: '40', cap: '8' },
    m1_16m: { cnt: '20', cap: '15' },
    m16_128m: { cnt: '7', cap: '25' },
    m128_1g: { cnt: '2', cap: '30' },
    gt1g: { cnt: '1', cap: '20', note: '备份集' },
  },
  b11b: {
    avg: { v: '12', unit: 'MB' },
    p50: { v: '1', unit: 'MB' },
    p99: { v: '512', unit: 'MB' },
    max: { v: '20', unit: 'GB' },
    multipart: { v: '是', part: '32 MB' },
  },
  b12a: ['需支持 S3 Select', '需要与 Veeam 备份软件联调', '无', '', ''],
  b131: {
    raw: { poc: '48 TB', prod: '2 PB' },
    usable: { poc: '30 TB', prod: '1.2 PB' },
    util: { poc: '< 75%', prod: '< 80%' },
  },
  b132: { ec: true, ec__v: '4+2' },
  b133: { overhead: { v: '1.5x' }, disk_fail: { v: '2' }, node_fail: { v: '1' } },
  b14: {
    prefix: { v: 'bucket/yyyy/mm/dd/' },
    keyname: { v: '{业务线}/{日期}/{文件名}' },
    smallfile_prefix: '否',
    meta: { v: '需要', example: 'retention=7y' },
    list_perf: '是',
  },
  b151: {
    big_w: { size: '1 GB', conc: '32', tp: '1 GB/s', p99: '2 s' },
    big_r: { size: '1 GB', conc: '64', tp: '2 GB/s', p99: '1 s' },
    small_w: { size: '64 KB', conc: '256', tp: '20k IOPS', p99: '20 ms' },
  },
  b152: { both: true, window: '每月第二个周六 09:00-18:00' },
  b161: { dual: true, multisite: true, topo: '北京 + 上海双中心，专线互联' },
  b162: { mpls: true, vpn: true },
  b163: {
    site_repl: { v: '需要' },
    bucket_repl: { v: '需要' },
    async_ok: { v: '是' },
    rpo: { v: '≤ 5 分钟' },
    rto: { v: '≤ 30 分钟' },
  },
  b171: { https: true, sse_kms: true, byok: true, client: true },
  b172: { kms_type: { v: ['自建 KMS', 'HSM'] }, kms_product: { v: '某国产 KMS' }, approval: { v: '双人审批 + 工单' } },
  b173: { ak: true, sts: true, idp: true, idp__v: 'LDAP', iam: true, tenant: true, presign: true },
  b174: { audit: true, siem: true, siem__v: '某 SIEM 平台', worm: true, versioning: true },
  b18: {
    versioning: { poc: '开', prod: '开' },
    mfa_delete: { poc: '否', prod: '是' },
    lifecycle: { poc: '180 天转冷', prod: '90 天转冷 / 7 年过期' },
    offsite: { poc: '否', prod: '是' },
    retain: { poc: '3 个月', prod: '7 年' },
    drill: { poc: '需要', prod: '需要' },
  },
  b18note: { v: '异地备份走专线异步复制，季度恢复演练。' },
  b191: { crud: true, list: true, multipart: true, presign: true, policy: true, versioning: true, lifecycle: true, notify: true, tagging: true, select: true },
  b192: { java: true, python: true, go: true, node: true },
  b193: {
    rclone: { use: true, ver: '1.67' },
    awscli: { use: true, ver: '2.15' },
    backup_sw: { use: true, ver: '12', note: '名称：Veeam' },
    spark: { use: true, ver: '3.5' },
    trino: { use: true, ver: '443' },
  },
  b194: { value: '不确定', usage: '评估中' },
  b20: {
    versioning: { poc: true, prod: true, prio: 'P0' },
    lifecycle: { poc: true, prod: true, prio: 'P0' },
    notify: { poc: true, prod: true, prio: 'P1', note: '目标系统：Kafka' },
    quota: { prod: true, prio: 'P1' },
    tenant: { prod: true, prio: 'P1' },
    sts: { poc: true, prod: true, prio: 'P1' },
    presign: { poc: true, prod: true, prio: 'P1' },
    worm: { prod: true, prio: 'P1' },
    encrypt: { poc: true, prod: true, prio: 'P0' },
    audit: { poc: true, prod: true, prio: 'P0' },
    prom: { poc: true, prod: true, prio: 'P0' },
    policy: { poc: true, prod: true, prio: 'P0' },
  },
  b211: { baremetal: true, vm: true, vm__v: 'VMware' },
  b212: {
    nodes: { poc: '4', prod: '12' },
    os: { poc: 'openEuler 22.03', prod: 'openEuler 22.03' },
    kernel: { poc: '5.10', prod: '5.10' },
    disk_mode: { poc: ['JBOD 直通'], prod: '同左' },
  },
  b212note: { raid_reason: '无' },
  b213: { ntp: true, dns: true, fw: true, cert: true, cert__v: '私有 CA 签发' },
  g221: [
    {
      nt: { v: '存储节点' },
      hw: {
        server: { model: '某品牌 2U 服务器', qty: '1 台', total: '4 台', note: '' },
        cpu: { model: 'Intel Xeon 4310', sockets: '2', cores: '12', total: '8 颗' },
        mem: { model: 'DDR4 ECC', qty: '256', total: '1 TB' },
        sysdisk: { model: 'SSD 480GB RAID1', qty: '2 块', total: '8 块' },
        datadisk: { model: 'HDD 16TB SATA', blocks: '12', tb: '16', total: '48 块' },
        nic: { model: '25GbE 双口', qty: '2', speed: '25', total: '8 口', note: '是' },
        hba: { model: 'HBA 9500-16i', qty: '1', total: '4', nonraid: '是' },
      },
    },
    {
      nt: { v: '接入节点' },
      hw: {
        server: { model: '某品牌 1U 服务器', qty: '1 台', total: '2 台' },
        cpu: { model: 'Intel Xeon 5318Y', sockets: '2', cores: '8', total: '4 颗' },
        mem: { model: 'DDR4 ECC', qty: '128', total: '256 GB' },
      },
    },
  ],
  b222: { jbod: true, fw: true, fw__v: 'SN123', smart: true, smart__v: '全部通过' },
  b223: { switch: { v: '某品牌 25G 接入交换机' }, uplink: { v: '100 Gbps' }, mtu: { v: ['9000(Jumbo)'] }, rdma: '规划中', cable: '是' },
  b224: { v: '满足' },
  b231: { prom: true, grafana: true, existing: true, existing__v: '客户 Zabbix' },
  b232: {
    collect: { v: ['syslog'] },
    alert: { v: ['邮件', '企微/钉钉/飞书'] },
    owner: { v: '王工' },
    audit_keep: { v: '3 年' },
  },
  b233: {
    upgrade: { v: '可接受短暂中断', note: '≤ 5 分钟' },
    support: { v: '7×24' },
    backup_cfg: { v: '需要' },
  },
  b241: [
    { name: '备份系统 Veeam', owner: '赵工', sdk: 'S3 API', case: '全量/增量备份写入', covered: true },
    { name: '大数据平台 Spark', owner: '钱工', sdk: 'Hadoop S3A', case: '数据湖读写', covered: true },
  ],
  b242: [
    { case_id: 'TC-001', desc: '基础 CRUD', pre: '集群可用', steps: '上传/下载/删除', expect: '一致', prio: 'P0', result: '通过' },
    { case_id: 'TC-002', desc: 'Multipart 大对象', pre: '测试桶', steps: '分片上传 10GB', expect: 'MD5 一致', prio: 'P0' },
  ],
  b25: {
    m1: { date: '2026-09-30', owner: '张销售', deliver: '本表签字版', done: true },
    m2: { date: '2026-10-10', owner: '王工', deliver: '环境检查报告' },
  },
  b261: { stable: true, disk_bad: true, record: '72h 压测无中断' },
  b262: { node: true, disk: true, net: true },
  b263: { goal: true, baseline: true },
  b264: { iam: true, tls: true, lifecycle: true },
  b265: { prom: true, grafana: true, alert: true },
  ba1: { review: true, scope: true, hw: true, net: true, plan: true },
  ba2: { os: true, disk: true, install: true, tls: true, user: true },
  ba3: { smoke: true, compat: true },
  bb_out: { v: '采集输出见附件 selfcheck-2026-09-23.log' },
  bc: {
    tls: { need: true, done: true, note: '证书来源：私有 CA' },
    audit: { need: true, done: true, note: '外发：SIEM' },
    prom: { need: true, done: true, note: '地址：http://prom:9090' },
    grafana: { need: true, done: false, note: '看板：待导入' },
  },
  breq: {
    r1: { done: true }, r2: { done: true }, r3: { done: true }, r4: { done: true }, r5: { done: true },
    r6: { done: true }, r7: { done: true }, r8: { done: true }, r9: { done: true },
  },
  bsign: {
    customer: { name: '王工', sign: '王工', date: '2026-09-23' },
    sales: { name: '张销售', sign: '张销售', date: '2026-09-23' },
    presale: { name: '李售前', sign: '李售前', date: '2026-09-23' },
  },
};

(async () => {
  console.log('浏览器:', findChrome());
  const html = buildHtml(data);
  const pdf = await renderPdf(html);
  const out = path.join(__dirname, '..', 'output', 'sample.pdf');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, pdf);
  console.log('已生成:', out, `(${(pdf.length / 1024).toFixed(1)} KB)`);
  await closeBrowser();
})().catch((e) => { console.error(e); process.exit(1); });

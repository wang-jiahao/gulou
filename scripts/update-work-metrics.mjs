// Local inventory only. Raw references and session transcripts never enter the report.
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { homedir } from 'node:os';
import { collectUsage, discoverProjectLogs, astraPricing } from './work-usage.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
async function walk(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []))).flat();
  } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
async function size(files, lines = false) {
  let bytes = 0, lineCount = 0;
  for (const file of files) {
    bytes += (await stat(file)).size;
    if (lines) { const s = await readFile(file, 'utf8'); lineCount += s ? s.split('\n').length - Number(s.endsWith('\n')) : 0; }
  }
  return { files: files.length, bytes, lines: lineCount };
}
const sourceFiles = [...await walk('src'), 'index.html'].filter(f => /\.(?:ts|css|html)$/.test(f));
const scripts = (await walk('scripts')).filter(f => /\.(?:mjs|js|py|sh)$/.test(f) && !/promotion-/.test(f));
const data = (await walk('src')).filter(f => /\.json$/.test(f));
const refs = await walk('references');
const images = refs.filter(f => /\.(?:png|jpe?g|webp|avif)$/i.test(f));
const videos = [...refs, ...(await readdir('.'))].filter(f => /\.(?:mp4|mov|mkv|webm)$/i.test(f));
const sources = await readFile('docs/asset_sources.md', 'utf8');
const urls = new Set([...sources.matchAll(/https?:\/\/[^\s<>"）]+/g)].map(m => m[0].replace(/[),.;`]+$/, '')));
const versions = new Set([version]);
for (const hash of git('log', '--format=%H', '--', 'package.json').split('\n').filter(Boolean)) {
  try { versions.add(JSON.parse(git('show', `${hash}:package.json`)).version); } catch { /* Before package creation. */ }
}
const localDir = 'docs/validation/work-metrics';
await mkdir(localDir, { recursive: true });
let usage;
try { usage = JSON.parse(await readFile(`${localDir}/usage.json`, 'utf8')); } catch { /* Optional private inventory. */ }
const args = process.argv.slice(2);
const codexHome = process.env.CODEX_HOME ?? path.join(homedir(), '.codex');
const logs = args.length === 0 || args.includes('--refresh-usage')
  ? await discoverProjectLogs([...await walk(path.join(codexHome, 'sessions')), ...await walk(path.join(codexHome, 'archived_sessions'))], process.cwd())
  : args;
if (logs.length) {
  usage = await collectUsage(logs);
  await writeFile(`${localDir}/usage.json`, JSON.stringify(usage, null, 2));
}
const [code, tooling, generated, assets, build] = await Promise.all([size(sourceFiles, true), size(scripts, true), size(data), size(await walk('public')), size(await walk('dist'))]);
const n = x => x.toLocaleString('en-US');
const mb = x => `${(x / 1048576).toFixed(2)} MiB`;
const dollars = x => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const measured = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
const rows = [
  ['版本迭代', `${versions.size} 个版本号 · 当前 v${version}`],
  ['Git 提交', `${n(Number(git('rev-list', '--count', 'HEAD')))} 次`],
  ['游戏源代码', `${n(code.lines)} 行 · ${code.files} 个文件 · ${mb(code.bytes)}`],
  ['开发与验证工具', `${n(tooling.lines)} 行 · ${tooling.files} 个文件`],
  ['场景与轮廓数据', `${generated.files} 个 JSON · ${mb(generated.bytes)}`],
  ['游戏静态资源', `${assets.files} 个文件 · ${mb(assets.bytes)}`],
  ['参考图片', `${n(images.length)} 个本地文件`],
  ['参考视频', `${videos.length} 个本地文件`],
  ['资料来源', `${urls.size} 个不同链接`],
];
let bill = '';
if (usage?.schema === 2) {
  rows.push(['需求交流', `${n(usage.userMessages)} 条人工需求消息 · ${usage.sessions - usage.agentSessions} 个主任务`],
    ['AI 协作', `${usage.agentSessions} 个子任务 · ${n(usage.requests)} 次有用量记录的模型调用`],
    ['累计 token', `${n(usage.total)}（输入 ${n(usage.input)} / 输出 ${n(usage.output)}）`]);
  const chargeRows = [['普通输入', 'uncachedInput'], ['缓存读取', 'cachedInput'], ['缓存写入', 'cacheWriteInput'], ['输出（含推理）', 'output']];
  bill = `\n### Token 费用\n\n按 [GPT 6 Astra 官方 Standard 价格](${astraPricing.source})折算，合计 **${dollars(usage.estimatedUsd)}**。\n\n| 类别 | Token 数 | 折算费用（美元） |\n| --- | ---: | ---: |\n${chargeRows.map(([label, key]) => `| ${label} | ${n(usage[key])} | ${dollars(usage.costs.short[key] + usage.costs.long[key])} |`).join('\n')}\n\n用量覆盖 ${usage.from.slice(0, 10)} 至 ${usage.measuredAt.slice(0, 10)} 的本项目本地日志。上表为官方标准价折算，不包含中转折扣、税费或外部工具费用。\n`;
}
const block = `<!-- work-metrics:start -->\n## 开发工作量\n\n更新于 ${measured}（北京时间）。\n\n| 指标 | 数量 |\n| --- | --- |\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}\n${bill}\n图片数包含全景切面、裁切及视频帧，不等于独立照片或逐张阅览数；代码行数包含空行与注释。完整口径、单价与去重方法见[工作量与费用明细](docs/work-metrics.md)。\n\n<!-- work-metrics:end -->`;
let readme = await readFile('README.md', 'utf8');
if (!readme.includes('<!-- work-metrics:start -->')) throw new Error('README metrics marker missing.');
readme = readme.replace(/<!-- work-metrics:start -->[\s\S]*?<!-- work-metrics:end -->/, block);
await writeFile('README.md', readme);
if (usage?.schema === 2) {
  const rateRows = Object.entries(astraPricing.short).map(([key, price]) => `| ${{uncachedInput:'普通输入',cachedInput:'缓存读取',cacheWriteInput:'缓存写入',output:'输出（含推理）'}[key]} | ${dollars(price)} | ${dollars(astraPricing.long[key])} |`);
  const detail = `# 工作量与费用明细\n\n更新于 ${measured}（北京时间），游戏版本 v${version}，Git 截至 ${git('rev-parse', '--short', 'HEAD')}。返回[项目介绍](../README.md)。\n\n## 统计口径\n\n- 游戏代码：src 内 TS／CSS／HTML 加根目录 index.html，共 ${code.files} 个文件、${n(code.lines)} 行，含空行和注释；不计依赖、JSON、素材、测试。\n- 工具单列：scripts 内脚本共 ${tooling.files} 个、${n(tooling.lines)} 行，不计本地宣传片录制工具。\n- 静态资源：public 共 ${assets.files} 个文件、${mb(assets.bytes)}；构建目录 ${mb(build.bytes)}。均为磁盘大小，不等于网络下载流量。\n- 参考图像 ${n(images.length)} 个、视频 ${videos.length} 个：仅本地文件计数，图像包括全景各面、裁切、重复图和视频帧；没有把它们说成独立照片或全部阅览数。原参考不分发。\n- 来源 ${urls.size} 个不同 URL，来自资产来源记录；不代表每项均已用于建模。\n- 版本号 ${versions.size} 个，按 package.json 的历史和当前工作树去重；Git ${n(Number(git('rev-list', '--count', 'HEAD')))} 次提交截至上述修订。\n- 需求交流 ${n(usage.userMessages)} 条：主任务日志中的人工需求消息，不含子任务分派、环境注入、心跳、接续摘要；同任务、时间和内容重复的记录只计一次。这不是模型调用次数。\n\n## 用量范围与去重\n\n扫描 ${usage.logFiles} 份本地日志，包含 ${usage.sessions} 个有用量记录的独立任务（${usage.sessions - usage.agentSessions} 个主任务、${usage.agentSessions} 个子任务），覆盖 ${usage.from} 至 ${usage.measuredAt}。日志模型：${usage.models.join('、')}。统计 ${n(usage.requests)} 次调用，排除 ${n(usage.duplicateEvents)} 条重复累计报告；跨文件相同任务与累计计数不会重复相加。\n\n每次调用的用量与累计增量核对；不是把每一行累计总数相加。若首条记录继承了旧累计值，仅计该条实际调用。本次发现 ${usage.inheritedInputEvents} 条此类首记录。没有日志的调用及未报告费用不在统计内。\n\n## Astra 标准价折算\n\n[官方定价页](${astraPricing.source})，核对日期 ${astraPricing.verifiedOn}，币种美元，以下均为**每百万 token**。采用 Standard 费率；如果中转实际采用 Fast、Ultrafast 或自有价格，实际扣款会不同。\n\n| 类别 | 单次输入 ≤272,000 | 单次输入 >272,000 |\n| --- | ---: | ---: |\n${rateRows.join('\n')}\n\n按每次请求的输入长度选择费率，再汇总：短上下文 ${n(usage.tiers.short.requests)} 次、长上下文 ${n(usage.tiers.long.requests)} 次，最大单次输入 ${n(usage.maxRequestInput)} token。\n\n普通输入 = 总输入 − 缓存读取 − 缓存写入。三类输入互斥；缓存写入不是额外叠加在普通输入之上的附加费。输出已经包含推理 token，不能再把推理用量加一遍。\n\n费用 = Σ（普通输入 × 对应输入单价 + 缓存读取 × 对应读取单价 + 缓存写入 × 对应写入单价 + 输出 × 对应输出单价）÷ 1,000,000。使用原始数值计算，最后显示到美分。\n\n**合计 ${dollars(usage.estimatedUsd)}**：短上下文 ${dollars(usage.costs.short.total)}，长上下文 ${dollars(usage.costs.long.total)}。这是按官方 Standard 单价折算的模型费用，不含中转折扣、税费与外部工具费用。\n\n## 更新方式\n\n运行 \`npm run metrics -- --refresh-usage\`，只扫描本机与当前项目目录匹配的任务日志，重新统计用量并刷新 README 和本页；也可显式传入日志路径。运行 \`npm run metrics\` 也会自动刷新匹配项目的本地日志；本机没有匹配日志时才沿用最近一次用量快照。原始日志、消息内容和本机路径不写入本页或 README。\n`;
  await writeFile('docs/work-metrics.md', detail);
}
await writeFile(`${localDir}/latest.json`, JSON.stringify({ version, code, tooling, generated, assets, build, referenceImages: images.length, referenceVideos: videos.length, sourceUrls: urls.size, usage }, null, 2));
console.log(`Updated v${version}: ${code.lines} source lines, ${images.length} reference files, ${usage?.total ?? 'unknown'} tokens, ${usage?.estimatedUsd === undefined ? 'unpriced' : dollars(usage.estimatedUsd)}.`);

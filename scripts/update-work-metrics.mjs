// Local inventory only. Raw references and session transcripts never enter the report.
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

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
const logs = process.argv.slice(2);
if (logs.length) {
  usage = { measuredAt: new Date().toISOString(), sessions: 0, userMessages: 0, input: 0, cachedInput: 0, output: 0, total: 0 };
  for (const log of new Set(logs)) {
    let total;
    for await (const line of createInterface({ input: createReadStream(log), crlfDelay: Infinity })) {
      let item; try { item = JSON.parse(line); } catch { continue; }
      const p = item.payload;
      if (item.type === 'event_msg' && p?.type === 'token_count' && p.info?.total_token_usage) total = p.info.total_token_usage;
      if (item.type === 'response_item' && p?.type === 'message' && p.role === 'user') {
        const message = (p.content ?? []).map(c => c.text ?? '').join('\n').trim();
        if (message && !/^(?:# AGENTS\.md|<environment_context>|<heartbeat>|Another language model started)/.test(message)) usage.userMessages++;
      }
    }
    if (total) {
      usage.sessions++;
      usage.input += total.input_tokens ?? 0;
      usage.cachedInput += total.cached_input_tokens ?? 0;
      usage.output += total.output_tokens ?? 0;
      usage.total += total.total_tokens ?? 0;
    }
  }
  await writeFile(`${localDir}/usage.json`, JSON.stringify(usage, null, 2));
}
const [code, tooling, generated, assets, build] = await Promise.all([size(sourceFiles, true), size(scripts, true), size(data), size(await walk('public')), size(await walk('dist'))]);
const n = x => x.toLocaleString('en-US');
const mb = x => `${(x / 1048576).toFixed(2)} MiB`;
const rows = [
  ['当前版本', `v${version}；Git 已提交 ${n(Number(git('rev-list', '--count', 'HEAD')))} 次（截至 ${git('rev-parse', '--short', 'HEAD')}）；历史及当前工作树共 ${versions.size} 个不同版本号`],
  ['游戏源代码', `${n(code.lines)} 行 / ${code.files} 个 TS、CSS、HTML 文件 / ${mb(code.bytes)}（含空行与注释，不含 JSON、素材、依赖与测试）`],
  ['工具与验证脚本', `${n(tooling.lines)} 行 / ${tooling.files} 个文件 / ${mb(tooling.bytes)}（单列，不计入游戏代码；本地录制工具不计）`],
  ['场景与轮廓数据', `${generated.files} 个源 JSON / ${mb(generated.bytes)}（程序生成数据单列）`],
  ['游戏静态资源', `${assets.files} 个文件 / ${mb(assets.bytes)}；当前构建目录 ${mb(build.bytes)}（未压缩磁盘字节，不代表网络传输量）`],
  ['已收集本地参考图像', `${n(images.length)} 个文件（含全景各面、裁切、重复图和视频帧，未去重；不是独立照片数或逐张阅览数）`],
  ['本地参考视频', `${videos.length} 个文件；包含两段校园漫游及局部补充视频（不随游戏分发）`],
  ['来源记录', `${urls.size} 个不同 URL，见资料来源文档（不代表全部已用于建模；同站不同页面分别计）`],
];
if (usage) rows.push(
  ['已扫描对话范围', `${usage.sessions} 份任务日志 / ${n(usage.userMessages)} 条用户角色消息（过滤环境注入、心跳和接续摘要；不等于全项目对话轮数）`],
  ['模型报告 token 用量', `${n(usage.total)} total；输入 ${n(usage.input)}（含缓存读取 ${n(usage.cachedInput)}），输出 ${n(usage.output)}；上述日志截至 ${usage.measuredAt} 的末次累计计数`],
);
rows.push(['实际花费', '未知；缺少中转账单和可核实的模型单价，不能由 token 数可靠推算金额']);
const block = `<!-- work-metrics:start -->\n## 开发工作量\n\n统计于 ${new Date().toISOString()}，代码和资源对应当前 v${version} 工作树，Git 截至表内修订。每版运行 \`npm run metrics\` 刷新；对话用量只在提供本地日志时重采样。token 包含反复发送的上下文，不能视为新增文字量或账单；数据规模也不代表还原准确度。\n\n| 项目 | 数量与统计口径 |\n| --- | --- |\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}\n\n<!-- work-metrics:end -->`;
let readme = await readFile('README.md', 'utf8');
readme = readme.includes('<!-- work-metrics:start -->') ? readme.replace(/<!-- work-metrics:start -->[\s\S]*?<!-- work-metrics:end -->/, block) : readme.replace('## 建筑精修进度', `${block}\n\n## 建筑精修进度`);
await writeFile('README.md', readme);
await writeFile(`${localDir}/latest.json`, JSON.stringify({ version, code, tooling, generated, assets, build, referenceImages: images.length, referenceVideos: videos.length, sourceUrls: urls.size, usage }, null, 2));
console.log(`Updated v${version}: ${code.lines} source lines, ${images.length} local reference images, ${videos.length} videos.`);

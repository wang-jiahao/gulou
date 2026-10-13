# 鼓楼访问人次

这个服务只提供全站累计访问人次和当天访问人次，不采集玩家姓名、IP、设备指纹、来源页面或游戏行为。它是访问量估计，不是独立玩家人数。

- 打开正式网页即请求计次，不要求进入校园。
- 每次打开或刷新网页创建新的随机标记并计一次，不再合并30分钟内的访问。
- 同一人今天和明天各打开一次，累计为2次；当天统计以北京时间划分。
- 服务端以日历日期和随机会话标记去重，网络重试不会重复加一；并发请求通过SQLite Durable Object事务更新。
- 随机标记短期保存并清理，只永久保留每日汇总和总数；无cookie或长期跨日身份标记。
- 清理浏览器存储、禁用存储、不同设备等会影响去重；公开计数也不是防刷或经过审计的独立人数。
- 从正式启用开始累积。过去没有部署计数服务的访问无法准确补计。

## 本地验证

在此目录安装依赖并运行：

```sh
pnpm install
pnpm test
pnpm exec wrangler deploy --dry-run
```

测试使用本地workerd和SQLite，覆盖跨日会话、并发去重、不同会话累加、只读查询、无效请求、来源限制和服务重启后的持久化，不向线上添加测试人次。

## 发布

需要部署者自己的Cloudflare账户。此仓库不包含凭据。

```sh
pnpm exec wrangler login
pnpm deploy
```

`wrangler.toml`创建一个名为`gulou-visit-counter`的Worker和一个SQLite Durable Object，允许的网页来源为`https://wang-jiahao.github.io`。按Wrangler输出的实际地址，把游戏`public/data/visits.json`的`endpoint`填为该Worker的`/api/visits`地址，然后按游戏部署文档发布到GitHub Pages。

可选历史基数通过Cloudflare Secret `VISIT_DISPLAY_BASELINE`配置，不写入仓库、前端配置或构建元数据。使用 `pnpm exec wrangler secret put VISIT_DISPLAY_BASELINE` 在交互输入中设置部署者自己的值。未设置或无效时不使用基数。服务端计算`displayTotal`供页面直接展示，`total`和`today`仍为独立实测值，SQLite中不写入估算。页面提示保留合计包含历史估算的说明；历史基数未经访问日志验证，不能用帖子浏览量证明。

空endpoint表示尚未启用，网页不会请求外部计数服务，也不会显示虚构数字。调试/验证页面和localhost不计数。网络故障时不显示错误数字且不会阻止游戏加载。

`GET /api/visits`只读返回`{total,today,day,displayTotal,includesHistoricalEstimate}`，可查看真实累计量而不增加计数。`POST /api/visits`接收`{"session":"32位随机十六进制标记"}`。不要在生产环境反复POST做测试。

源代码与配置已准备好；实际启用状态以游戏data/visits.json的endpoint和正式部署记录为准。

# 构建与部署

鼓楼是静态网页项目，构建输出为 `dist/`。在线地址为 [wang-jiahao.github.io/gulou/](https://wang-jiahao.github.io/gulou/)。

目前由作者主页仓库 `wang-jiahao/wang-jiahao.github.io` 的 `master` 分支发布，游戏文件放在其 `gulou/` 目录，GitHub Pages 与主页一起构建。游戏源码仓库与网站发布分开，单独推送本仓库不会自动更新线上游戏。

## 构建

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm check:assets
pnpm build
pnpm preview
```

`pnpm build`适合域名根路径；部署到 `/gulou/` 这样的子路径时使用 `pnpm build:pages`，它将Vite资源基路径设为 `/gulou/`。其他路径可运行 `pnpm exec vite build --base=/你的路径/`。这些命令只生成文件。

## 更新线上版本

1. 在游戏仓库运行 `pnpm build:pages`，确认 `dist/index.html` 的脚本和样式路径以 `/gulou/` 开头。
2. 将 `dist/` 内容同步到主页仓库的 `gulou/`，一并保留 `LICENSE`、`THIRD_PARTY.md`；记录 `release.json` 中的版本和源码提交。不要覆盖主页其它目录。
3. 提交并推送主页仓库的 `master`，等待 `pages build and deployment` 成功，再核对线上 `gulou/release.json`、入口和关键模型。

首次发布版本为 v0.132.0；宣传片保存在独立文件中，不是游戏首屏的加载依赖。

## 部署内容

仅将 `dist/` 内容交给静态托管服务。不要上传整个工作目录、参考照片和长视频、个人音频、验证报告、工具缓存或本地开发配置。原始参考资料保存在忽略目录中，不是游戏运行依赖。

游戏资源位于 `public/`，由Vite复制到构建目录；GLB、纹理、字体、地图与许可信息需要完整保留。源码仓库中的宣传片是游戏画面的派生作品，不包含参考视频片段。

个人音乐通过浏览器本地导入播放，不上传；开发机可选的本地音乐接口只对回环请求提供文件，线上构建不依赖它。

## 发布验证

确认构建路径、模型与贴图请求成功，测试欢迎页、地图、移动、设置和手机触控，再检查在线站点。修改域名或子路径后重新构建。源码仓库与作者主页仓库各自维护，部署时只更新对应网站目录。

代码与素材许可见[THIRD_PARTY.md](../THIRD_PARTY.md)和[LICENSE](../LICENSE)。

## 可选访问统计

访问人次由独立Cloudflare Worker与SQLite Durable Object保存，部署方法见[计数服务说明](../workers/visit-counter/README.md)。正式启用前需要部署者的Cloudflare登录授权，并把实际接口地址写入`public/data/visits.json`；默认空地址不启用统计。每次打开或刷新网页计一次，同一页面的网络重试仍去重。统计独立于地图提前加载。这是访问人次，不是独立玩家人数；页面另含作者指定的历史估算基数，服务端实测数保持独立，口径见数字提示及README。

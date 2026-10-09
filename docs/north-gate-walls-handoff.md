# 南园北门内橱窗墙 — 2026-10-09

接续 `9bcf376`，本轮仅修改 `src/world/campus-directory.ts`、新增 `scripts/north-gate-noticeboards-check.mjs` 和自有交接；不改README、progress、迭代/审计共享文档。仍仅本地。所有before保持，原视频/帧不提交。

## 实证与取舍

实际查看用户17秒视频关键帧 `references/phase110-user/north-gate-{02,06,10,14}s.jpg`，尤其06秒的西侧墙及紧贴其后的灰砖老楼；同时实看官方VR `references/official-vr/phase10/scene_gl-1-02-{f,r,b,l}.jpg` 四面。确认两侧灰砖石基、浅色整段顶檐、玻璃框橱窗；西侧在喷泉环路方向收头，东侧墙前有窄人行道，步道与车道之间有草带。北端与校门连接被遮，不能据此做封闭转角。

原短栏在(-106,426.2)，长9米、横向朝南；已替换为沿北门进入大道的两侧纵向墙，共19组玻璃导览窗，灰砖台基、浅石窗间柱/窗套、浅檐、金属边框/分扇和小锁扣。保留三种可读原创地图/路线/常用地点指南，复用三张材质，不复制真实时效海报。地图标记改“北门入口”，避免让同一导览纹理在不同墙段冒称准确“当前位置”。

坐标与长度均按现有道路/楼体拟合，非测绘数据：

- 西北墙 z392—414.5，西南短段 z421—424.8；朝东。plan85默认东门保留6.5米开口，不因墙后楼体用途/真实门位尚未核实而封堵；西侧z430路口完全保留。
- 东北墙 z392—419.4，东南墙 z422.2—436.6；朝西。松林既有横向步道 z420.125—421.475保留2.8米开口。东侧每段补1.72米窄步道、低缘石和草带，草带不跨开口。
- 北端起于z392，校门约z383.62，不硬接遮挡区；东南末端z436.6，在喷泉16.2米外半径北缘z440.543之前收头。
- 不移动校门/喷泉/plan85楼/松林桌路，不改变公共道路。未补无证据的门北侧回折墙。

## API与验收

保留 `group / solids / board / nearby / arrival` API、原“南园导览栏”地图条目和靠近后打开地图功能。`nearby`现覆盖四个面向道路的墙段，背面/屋顶不激活；抵达点改西北长墙前约(-94.48,403.19)，面向墙。`group.userData.boards/openings`保存可核对的墙段与开口。

新专项直接构建实际 `createCampusDirectory`、普通plan85东入口和松林桌椅/路径碰撞，不用手抄墙碰撞替代实现。检查通过：2128三角有限索引/坐标/法线、19窗、32条Rapier角色控制器路线（墙体阻挡、东西侧全长步行、plan85门前双向、西430路口、喷泉北沿、松林三条轨迹双向），12条墙面射线，14次松林完整横向通路及两侧车道形状扫描。导览前/后/顶部触发及新抵达API均通过。

测试地面为小块平面，未覆盖全场树木/其他设施/GPU；完整游戏视觉与正常UI验收由root继续代验4181。TypeScript、ESLint src、Vite build、git diff --check通过。构建存在既有大chunk提示。报告/日志保存 `docs/validation/life-facilities/north-walls-*` 独占时间戳，没有重跑或写入旧before。

```sh
cd '/Users/zackaria/.codex/worktrees/gulou-life-facilities/gulou campus'
GULOU_NODE='/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
"$GULOU_NODE" scripts/north-gate-noticeboards-check.mjs
"$GULOU_NODE" node_modules/typescript/bin/tsc --noEmit
"$GULOU_NODE" node_modules/eslint/bin/eslint.js src
"$GULOU_NODE" node_modules/vite/bin/vite.js build
```

4181仍使用本子任务session18071，待root看完这轮墙后停止；主4173未动。旧 `scripts/directory-check.mjs` 的固定9米横栏坐标属于历史基线，不用于这次布局重做；本轮使用新专项和正常UI。

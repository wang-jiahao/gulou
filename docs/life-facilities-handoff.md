# 生活设施交接 — 2026-10-09

基线 `b17d5e2593e9c3ed88ef062fc8eff00449e86b4a`。独立托管工作树 `/Users/zackaria/.codex/worktrees/gulou-life-facilities/gulou campus`。只本地；不推送、不发布、不启用 Pages，不上传原照片。四份主目录未跟踪旧脚本未碰，所有 before 基线未写入。主目录 README、progress、next-local-iteration、审计表未修改。

## 对应审计项与来源

- **19 教育超市109**：实看用户 `references/phase96-user/education-store.png`（附件 `1b8422b0-91f7-48d8-8850-29dcfb38ab2a`），以及带编号的 `references/plan-components-south.png`。沿地图109东侧校园道路布置店面，保留L形轮廓；二层浅色墙与细长白框窗，一层深蓝通长门楣、白色“南大教超 / 鼓楼店 / 南大后勤 商贸中心”、两组玻璃入口与中间屏、商品橱窗、两级低台阶。屏幕用原创静态文字，不复制已过期促销价。尺度、隐蔽立面和字体近似。**实现与CPU检查已完成；整场美术实看待root回填。**
- **35 独立快递楼**：实看用户 `references/phase96-user/nanyuan-parcel.png`（附件 `c8056029-9941-4239-9c6c-1bfc9337aec4`）及 `references/phase33/parcel-building-game-user.png`，核实旧截图东向入口。plan100改一层白墙黑线山墙、灰坡顶、茶壶形剪影、两侧蓝色菜鸟驿站牌、玻璃双门、石基及三级台阶；从普通两层餐饮楼分派到独立模型，并修正运行时楼层字段。不与中国邮政混用。保留地图长轮廓；未见背面、绝对尺度与字体近似，室内仍不开放。**实现与CPU检查已完成；整场美术实看待root回填。**
- **69 邮政左侧外卖棚、70 美团柜**：实看 `references/phase96-user/post-shelter-game.png`（附件 `0447c2c2-138c-43c5-a8d2-43ef70bad881`，游戏定位图）和 `meituan-lockers.png`（附件 `a806ee07-acc2-40e8-8aa3-8fbb581beef9`，两张局部实景）。建在邮政东侧、原校界折段公共侧：灰柜门、黄色美团眉板、石墙立柱、斜撑金属雨棚。两组柜、每组20门和两片顶棚为有限地图空段的近似布置，并非实测排数；需要中国邮政门面与左侧整排棚柜同框远景来精确定位/定长。保留原围墙碰撞，无校园漏洞；不挡店前道路。柜号用共享512px透明图集；文字画布随显示尺寸缩放。**可关闭“完全未建模”，精确定位与整场美术验收仍待补。**
- **29 南大记忆地址**：2026-10-09再次读取官方后勤2016-05-19原页 [开业公告](https://hqjt.nju.edu.cn/1e/3c/c1243a138812/page.htm)，明确“店铺地址：南京市汉口路9号 南大鼓楼校区南苑邮政旁”。实看已有用户店面图 `references/phase33/nju-memory-user.png`；沿用前版店面与公共入口，不旋转、不迁移。校友会页 [南大记忆](https://alumni.nju.edu.cn/aa/0a/c21691a502282/page.htm) 的汉口路22号为校区地址，不能改作店铺地址。本站查询页返回不存在、外部检索未取得可核实迁址资料；检索失败不证明未迁址。**29仍部分完成**：需用户提供广州路店地址/搬迁公告或同框路牌的门店远景。

原媒体均在主目录忽略 references；本工作树不提交复制素材。临时800px参考与检索HTML留 `/tmp/gulou-life-refs`。官方VR gl-1-21/22/23若干视角已看但不提供这几处最新门面的直接证明，未当作精确形态证据。

## 验证

- `scripts/life-facilities-check.mjs`：15414三角的索引/坐标/法线有限性；17条Rapier角色控制器路线，含超市双门和快递楼上下台阶/闭门阻挡、店前横向通行、邮政柜前行走与抵达；5条门/柜正面射线；6条既有公共路包络（小粉桥、金银街、汉口路店前，双向）。新增几何全在南园，不能延伸至北侧南秀村。夹具包含原围墙，地面为各设施附近的小平面，**不能代替全场角色/GPU验收**。
- `scripts/memory-layout-check.mjs`：12条纪念品店进出步行/骑行包络，332处校界阻挡采样通过；原路线与边界保留。
- TypeScript、ESLint src、Vite build、`git diff --check`通过。构建有既有大chunk提示。
- 每次CPU报告独占时间戳，日志在 `docs/validation/life-facilities/`，原before未触碰。旧 `parcel-check.mjs`为历史前后差分，固定断言旧7.2米两层模型，不用于这次重做验收；使用新的设施检查。
- 浏览器：主任务安排统一代验4181，尚待结果。未宣称移动端、全校天气/步骑飞、GPU性能或美术完成。

## 根任务正常UI代验补充

2026-10-09，root在4181正常UI查看教育超市蓝牌、双门、中央展板和上层窗，横移后走上两阶，闭门不能穿；快递楼的一层白山墙、黑边、灰顶和三级台阶正常，走上阶到闭门；从纪念品店沿人行道向东走到邮政左侧，两组美团柜与银棚正常、公共路未堵。console error[]。19与35本轮照片精修可关闭，尺度和隐蔽面近似仍保留；69/70已建模并通过正常UI局部检查，精确排数和位置仍需同框全景。29不变。

截图 `/tmp/gulou-life-{supermarket,steps,parcel,parcel-door,postal-arrival,postal-left,lockers}.png` 和对应 `-800.png` 均由root实际查看，不提交。原始文件可能为JPEG编码。此补充覆盖上文“待root回填”的状态；不代表移动端、全校路线、天气或GPU验收。新17秒视频是北门内侧，未提供邮政棚柜精确定位的新证据。

## 改动文件与恢复

`src/world/education-store.ts`、`nanyuan-parcel.ts`、`postal-takeaway.ts`为专用模型；`life-facility-geometry.ts`提供正反朝向、文字、碰撞一致的几何帮助函数；`ordinary-buildings.ts`接实际分派；`parcel-entrance.ts`更新最新入口；`nju-memory.ts`接左侧棚柜；`world.ts`更新快递楼来源/一层字段；新增 `scripts/life-facilities-check.mjs`。

```sh
cd '/Users/zackaria/.codex/worktrees/gulou-life-facilities/gulou campus'
GULOU_NODE='/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
"$GULOU_NODE" scripts/life-facilities-check.mjs
"$GULOU_NODE" scripts/memory-layout-check.mjs
"$GULOU_NODE" node_modules/typescript/bin/tsc --noEmit
"$GULOU_NODE" node_modules/eslint/bin/eslint.js src
"$GULOU_NODE" node_modules/vite/bin/vite.js build
```

4181本工作树服务 session18071；只在浏览器实际验收时启动，结束由本子任务停止；主目录4173未动。`node_modules`是只读使用主目录依赖的本地符号链接，不提交。

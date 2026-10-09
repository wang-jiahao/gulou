# 最新短交接：v0.117 导航与入口地名修正；持续操作、性能与分镜接续

主树 `/Users/zackaria/Desktop/gulou campus`，main；版本0.117.0，HEAD以Git为准（上版a4b7e24）。用户睡眠中，要求重要TODO收尾后再录；缺资料/确实次要可明确暂缓。现有**私有仓库同步已获授权**，仍不公开/部署/Pages；作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。4173/PID5451复用。仅CUA浏览器；不要shell Playwright/CDP。

## 当前改动与已过
- 西南楼目录落点从上层台阶移到楼梯脚外（frontage15.2），未改楼体/台阶/碰撞。主Game原生到达→W上阶→闭门停住→S返回9项及抵达7项通过。
- 148有效目录id0..147全部原生到达检查通过：旧前93+新尾55（含修复后第94项），1036到达Boolean。不能把空占位或纪念品别名另加为149。合并审计`/tmp/gulou-v117-directory-audit.md`。
- 11处E入口与HUD邻楼冲突已修正：地面且真实DoorRecord附近优先入口名；明确道路/区域、楼内与高空保持。11冲突+5保护共16处主UI过；nearby-place既有测试15→17过。
- 原有地图键盘、两类座椅、男女三套换装79Boolean过；人物v116最终GLB/28动作、屋顶完整25项、65篇主要故事、三公共路与核心27点步行不再重做。A01人物本轮自检关闭，非用户最终审美认可。
- 持续飞行30.02游戏秒/30.88真实秒，高1920×1080：原生F/Space爬55m、W南飞、松键空中暂停，通过。单张末帧不代表树冠全动态/性能过。
- v117 types、项目eslint src、build、57资产与nearby17过；build既有大chunk提示。误用`eslint .`扫本地验证目录失败日志仅代表命令范围错误，正式`eslint src`已过。

证据已稳定复制到`/tmp/gulou-v117-evidence/`：southwest-stairs、directory-tail、entrance-hud、mobility-with-flight-pass（含旧失败，只采用最后flight passed）、canopy-rejected、north-timer-rejected。原始Downloads与全部before仍保留。

## 正在做/未过
- 持续骑行已过：原车位出口→x32.4道路内直骑/原生Space刹车+A掉头/下车，ride30.033游戏秒、实际移动25.239s/111.789m，12checks；全报告1625帧/30.898真实秒，p50/p9516.7/33.4ms。证据`/tmp/gulou-v117-evidence/bicycle-passed.json`，根已实看正常道路内骑行；旧抄草坪撞树fixture失败保留，不删树。A03剩触控设备和树冠动态观察，不重跑全部操作。
- A02仍开放。树冠FrontSide主RGBA/双shadow像素零差，但两轮ABBA收益反向，未采用；南/北关闭GPU计时同样无稳定收益，未采用。固定北向同一主绘制量从38降12FPS，timer全关仍发生。OS历史powerd确认测试期间displayOff，锁屏事实不等于已证明慢化由宿主造成；不唤亮屏幕打扰用户。
- 40s无新增GPUquery/截图的被动资源/分shadow/LOD诊断已跑：`/Users/zackaria/Downloads/gulou-passive-drift-v117-1791580440519.json`，OS只读伴随`/tmp/gulou-v117-drift-diagnostic/os-samples.jsonl`。分析已完成：慢化时无shader编译/新纹理/LOD/主及双shadow大变化；19次/帧骨骼纹理子上传稳定，59冠双buffer一次更新晚于首慢帧。没有可归因生产修复，结束盲优化、保留正常亮屏环境复测。`/tmp/gulou-v117-drift-diagnostic/PASSIVE-RESULT.md`。不可记性能已解决。
- 独立浏览器全屏与真实触控仍受锁屏/设备限制；IAB极简页也退出全屏，不能当游戏失败或通过。

## 分镜/音乐
第二版**仍未录制**。当前CUA browser id1/tab46、inspectTab/directTab复用，URL`http://localhost:4173/docs/validation/promotion-20261010/index.html`。已生成首版接触表并保存在`/tmp/gulou-cut2-review/`，餐厅原镜头被近枝遮挡，已改低机位[-40,3.3,592]看[-62,5,580]待当前60帧实看。新增批量动态预览按钮只复用逐镜60帧、不自动approve/record；逐镜实筛再做最终录制；26×2s=52s，北大楼仅I❤️NJU一次，飞先骑后，无人物/球类/球场展示。原树冠稳定助手仅用于录制，保留风/CSM/距离fade。质量前置未关闭，不冒称成片。
52s原创128BPM结尾候选`/tmp/gulou-cut2-music-endings/gulou-cut2-52s-ending.wav`：50.625秒最终D，51–52淡出。完整解码/零削波/真峰/响度过；原音轨未变。脚本`/tmp/gulou-cut2-music-ending.py`支持48–56s默认plan-only。**模型无音频输入，未试听**，不能声称音乐听感已确认。旧`docs/media/gulou-preview.mp4`保持首版。

## 恢复与保护
先git status/list_agents，不重复正在运行的页面。验证时冻结被服务模块防Vite重载；JSON只输出必要字段，图每批1–2张约800px。临时viewport800×600，完毕reset/关闭验证页。源图视频/个人音乐/全部before不提交；六本地scripts继续未跟踪（astronomy、dormitory-family、nanyuan-dormitory-entrance、nanyuan-reference-refresh、promotion-capture、promotion-shots）。README赞赏绝对末尾；v117文档/metrics已整合；待最后git提交/私有同步，不能擅加原始媒体。
Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`；直接调用node_modules/{typescript/bin/tsc,eslint/bin/eslint.js,vite/bin/vite.js}，环境无npm。ffmpeg `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`。240000压缩阈值不能保证消除413/接口中断。

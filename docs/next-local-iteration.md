# 最新短交接：v0.120 与第四版宣传片（2026-10-10）

主树 `/Users/zackaria/Desktop/gulou campus`，main；生产v0.120.0，提交以Git为准。复用4173/PID5451，不启动第二服务，不操作或关闭用户Chrome。作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。私有源码/必要资产同步已授权；未授权公开、部署或Pages。README赞赏绝对末尾。

## 当前成片与本版结果

- 第四版已输出 `.local-media/promotion/v120-cut4-motion/gulou-cut4-51s.mp4`：24镜51秒、1920×1080、30fps、1530帧、130324922bytes。原始 `~/Downloads/gulou-cut4-51s.ivf`；三旧版均保留。简单地名、去赛珍珠、无首尾卡；保留原认可机位，改逸夫馆/教超/拉贝，费楼留顶，追加仅飞行/夜晚/雨天。
- 修改9镜630帧1080p连续预览，飞行90帧联系表实看；夜景曝光2.2另90帧、中山平台修正后60帧复验。正式录制24镜cameraDelta全0，0error/2旧弃用warn。完整1530帧视音频解码通过；根已看15保留镜的45编码后首中末图，promo_review正对9重点做最后成片检查。
- 权威证据 `/tmp/gulou-cut4-20261010/`：encoding-report.json、recording-manifest.json、review-final/、encoded-frames/（72张800×450关键帧）、encoded-preserved-0..4.jpg、promo-review-agent.md。忽略的计划/录制器在 `docs/validation/promotion-cut4-20261010/`。此轮用户明确允许先录；不能恢复旧A02禁录门禁。不要重跑全片；需调整时先改单镜。
- 拍摄near1提高主深度精度；夜景曝光×2.2、开场植被朝向保持均仅录制页策略。不是普通游戏性能修复。新音乐仍为128BPM，51秒结尾保留主和弦攻击，仅拉长尾音并淡出；无削波、末采样归零，模型听感未验。`finish.py`已执行成功，默认不覆盖现有成片，重编码要另存路径。
- 逸夫馆题字已按官方VR金字重建“逸夫館”轮廓、孔洞、字距和比例；根与子agent均看实际题字crop和生产原生图。照片轮廓及3.55m宽为近似。`src/world/yifu-hall-facade.ts`、building-lettering.json；原图/提取工具不提交。
- 中山楼平台底座和盖板原顶面同为1.22m，引起58→59帧灰白斑块。现仅底座可视顶止于1.11m盖板底；原31碰撞mesh/门/建筑记录逐字节一致，652box仅1可视尺寸变化。实际同frame59前后和子agent复核均确认斑块消失：review-final/zhongshan-fix-before-after.jpg。工厂几何对照zhongshan-geometry.json，恢复测试runtime Node --experimental-strip-types .tools/v120/zhongshan-check.mjs。types/lint/build/58资产通过，日志/tmp/gulou-v120-final-*。
- README表按最新要求合并为版本与提交、代码与工具、参考资料，删除场景与轮廓行；生成脚本已改，版本统计已刷新。建筑状态文档同步逸夫馆实际范围。字体与平台生产修正不代表全校字体审计完成。

## 继续优先项

1. A02普通游戏飞行闪烁与性能仍最优先。v119的100m细部组0.4游戏秒淡变已过，不重做。剩余远立面毫米级深度干涉已证实（不代表所有根因）：`/tmp/gulou-flight-depth-v119/README.md`。普通北向326帧冻结对照：受检远立面关接收阴影零像素差；near变化改变斑纹；费玻璃/衬层4.9mm，唐楼2.8mm，24bit主深度。
2. 旧双renderer logdepth试验无效：候选没有独立等价PMREM且场景漂移。若继续须独立PMREM和冻结原生场景；雨ShaderMaterial缺logdepth chunks。reverse depth受CSMFrustum[-1,1]假设约束，不能盲开。普通窗polygonOffset没解决特殊费/唐，未采用。FOV收敛324次CSM刷新126.4ms不是已证主瓶颈。性能改动需同条件稳定收益，不降体验，不循环已拒方案。
3. 亮屏IAB旧36.5→16.2FPS仍复现卡顿；Chrome约29.5但少1draw/126664tris，不是严格同负载对照。不要归咎锁屏。用户现明确允许强制不熄屏，`caffeinate -di` PID75604有效；不重复启动，明确停工/恢复时kill此PID即可，没有修改持久设置。
4. 南园一/二/三门口同朝向与侧牌；plan90/94/101原nearest-road导致朝向不一致，1/3牌已有可能在错面，不能重复添。
5. 只做汉口新外卖柜；旧棚已拆，删棚体与碰撞。苏浙门左浅墙捐建牌：南京大学苏浙运动场 / 2002.5.20 / 香港苏浙同乡会捐建。已有 `references/user-review-20261010/`，不重复索要，实际看图/VR/地图，不猜坐标尺寸、不封公共路。
6. 其它照片字体审计待；教超/南大记忆v118、逸夫馆v120已做本轮修正。费彝民、田家炳、校医院等按现有资料审；范围见docs/building-status.md。独立浏览器全屏未验；手机明确留后续用户网页自验，不阻塞、不假称通过。

## 已完成，不重复

- v118教超/南大記憶字形排布、教学楼四迎新条幅/2026框、戴安邦新肖像、主页人像图标、设置顶部返回开始页及原位继续已过。肖像保留水印/许可未确认，来源文档如实记录。
- 人物本轮、65故事、屋顶落地、三公共路、148到达/HUD、主要UI及持续步骑飞验收范围已过。旧详证在progress.md历史和/tmp/gulou-v117-evidence/。不会用本片替代普通游戏验收。
- 贡献者历史已获明确批准并执行，142个原tree/消息/日期保持，正确noreply统一；备份`.tools/contributor-identity-20261010/`。之后9bce67e已私有同步；不再问授权、不强推旧候选、不把旧agent分支旧根合并回来。GitHub Contributors待缓存刷新，不保证已刷新。
- 工作量原话在/tmp/gulou-work-metrics-user-matches.json，10-04两次要求已回复。官方Astra Standard价格实读：短上下文每百万输入10/读1/写12.5/输出50USD；请求输入>272000为20/2/25/75，三输入分区互斥、推理包含输出。scripts/work-usage.mjs去重同项目任务日志，metrics默认自动刷新；费用是官方等价估算，不冒充中转账单。当前数值以README为准；明细docs/work-metrics.md。
- README/建筑清单已作者口吻，方法独立docs/building-process.md，状态docs/building-status.md由共建引用。地图 https://zcc.nju.edu.cn/cssy/dzdt/glxqdt/index.html 。GitHub附件可嵌视频（ViMax证据），但私有附件可见性未核，未上传；README仍旧截图，不宣称已完成嵌入。

## 操作

最新明确授权只开一个promo_review独立审片；旧三agent已完成，先查/复用，不新增重复agent。CUA IAB3；tab65完成后已关闭，用户Chrome未动。仅CUA操作浏览器，不用shell Playwright/CDP。

Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`；Python同dependencies/python/bin/python3（有PIL），系统python无PIL；OpenCV在.tools/python。ffmpeg `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`。无npm onPATH，直接Node调tsc/eslint/vite/metrics。PNG媒体downloadMedia偶超时，保留已存图不无故重跑；DOM canvas.toDataURL不可用，录制页已加原生末帧下载按钮。

原参考、个人音乐、Codex缓存、before、本地验证/录制脚本不提交；只显式暂存生产与必要文档。六旧未跟踪scripts（astronomy、dormitory-family、nanyuan-dormitory-entrance、nanyuan-reference-refresh、promotion-capture、promotion-shots）保持不动。每批1–2张约800px，JSON取字段，长日志落盘，重要变化/失败写本短交接。

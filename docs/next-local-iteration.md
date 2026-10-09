# 最新短交接：v0.117已同步；26镜1080p预览审完，等正常亮屏性能复验

主树 `/Users/zackaria/Desktop/gulou campus`，main，0.117.0；代码/旧文档HEAD `5eadc0f`已同步origin/main，本次仅文档会后续提交，以Git为准。用户睡眠中；先完成重要TODO或明确合理暂缓，再录第二版。**已授权私有源码/必要资产同步，禁止公开、部署、Pages**。作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。复用4173/PID5451，只用CUA操作浏览器，不用shell Playwright/CDP，不唤亮屏幕。

## 已过，不重做
- 人物v116本轮美术/28动作；65篇主要故事；屋顶18m实飞落地→走下→一次重生25项；三条公共路可见贯通；27点206.5秒核心步行。
- v117西南楼落点改到长阶梯脚外：真实到达7项、上下阶9项；148目录（旧93+新55）1036到达布尔通过。HUD真实入口优先，11冲突+5保护16点通过；nearby17。
- 地图键盘/座椅/男女三套换装79 Boolean。持续飞行30.02秒/55m、持续骑行30.033秒/111.789m/12项通过，根看正常画面。不要重跑草坪错误骑行fixture；旧失败保留。
- 生产types/eslint src/build/57资产已过（既有大chunk提示）；本次只改忽略的录制工具与交接，无新游戏版本，无需重复全套。
- 稳定证据 `/tmp/gulou-v117-evidence/`：southwest-stairs、directory-tail、entrance-hud、mobility-with-flight-pass（仅最后flight passed）、bicycle-passed、canopy-rejected、north-timer-rejected、passive-drift。

## 真正剩余
1. **A02正常亮屏/独立浏览器性能**。锁屏同负载40秒从约38降12FPS，无同期shader/纹理/主及shadow绘制量/LOD大变；OS历史powerd确认displayOff。不能断言全是锁屏，也不能算游戏已优化。树冠FrontSide两轮零像素差但收益反向，南北timer关闭亦无稳定收益，均未采用。停止无归因候选，等正常环境再测，不唤醒用户。`/tmp/gulou-v117-drift-diagnostic/PASSIVE-RESULT.md`。
2. **A03真实触控、A05独立全屏**设备条件待验。IAB极简原生页也约50ms退出全屏，非游戏失败/通过。无设备可明确暂挂，不虚报完成。
3. **A07正式第二版**仍未录，旧`docs/media/gulou-preview.mp4`保持首版。下文预览已过，不能再从头重复审片；先处理A02正常环境，再正式录制/合片/最终解码。
4. 9类资料不足/次要项已在remaining-todo列为暂缓。准备审计`/tmp/gulou-v117-recording-readiness.md`；不再索要已有南三/电子屏照片。README赞赏保持末尾。

## 宣传片预览本次完成
- 主准备页 `/docs/validation/promotion-20261010/index.html`：26镜×2秒=52秒，北大楼仅I❤️NJU一次，飞先骑后，第一人称隐藏人物，无球类场景。所有26镜已由根实看后在shotlist标approved；**录制仍禁用**，plan.recordingGate.status为waiting-for-normal-display-performance-check，recorder同时检查该字段。
- 26镜×60帧完整1920×1080渲染（1560帧），全部逐帧相机/风/尺寸状态与160×90RGB相邻变化记录；批量console无新消息，初始化有既有依赖弃用警告。根查看28组最大变化前后原图的800px版本；没有自动阈值或自动视觉通过。22静景最大RGB均值0.277/255仅作诊断，不能保证细枝零闪烁。
- 另跑飞/骑60+60帧，根看8张798×850联系表覆盖全部120帧并对照大幅变化对，未见明显远楼/树冠硬切或人物；重放相机差0。**只覆盖本片路线与录制专用冠层策略，不代表普通游戏全场性能/动态通过。**
- 图书馆新机位`[-77.2088,3.5,285.2827]`看`[-64.4,5.2,286.15]`、FOV59已采用，灯柱在镜后，牌/门/台阶清楚，另60帧过。餐厅已采用旧轮低机位`[-40,3.3,592]`看`[-62,5,580]`、FOV78，不删树。
- 田家炳17:40候选实看后不采用：只是间接稍亮并变暖天空，保留14时统一白昼。当前太阳路径不能让北立面被正面直射，不改光照模型。
- 核心证据 `/tmp/gulou-cut2-1080p-review/`：report.json（全26）、refine-report.json（新library/试tian/飞/骑4镜）、summary.json、REVIEW.md、peaks/、inspect/、shotlist-reviewed.json。所有before保留。早期960×540/78关键帧资料仍在`/tmp/gulou-cut2-review/`。
- 忽略的局部检查页 `/docs/validation/promotion-refine-20261010/index.html`只4镜且含未采用田家炳候选，**不可当正式计划**。正式计划是promotion-20261010/shotlist.json。
- 下一步达到A02关闭条件后，把正式plan.recordingGate.status改ready，移除HTML的等待说明，再勾选人工实筛并录制。不要重跑全部分镜；最终编码后仍需抽帧/解码核对。

## 配乐、工具和恢复
52秒原创128BPM结尾候选`/tmp/gulou-cut2-music-endings/gulou-cut2-52s-ending.wav`，50.625秒最终D，51–52淡出。解码/响度/真峰/零削波过；**模型不能试听，听感未验**。源音轨保持；脚本`/tmp/gulou-cut2-music-ending.py`支持48–56秒默认plan-only。最终用WAV合片，不重复AAC编码。

本轮CUA导出15链接时在骑行max图处30秒超时，REPL重置；网页数据保持，重新getTab49后分2链接全部导出，没重跑Game。工具问题非游戏故障。IAB id2；tab48/49均关闭，未设置viewport。不要重新选浏览器来恢复空tab；用已知id2新建所需页即可。

六本地脚本保持未跟踪：astronomy、dormitory-family、nanyuan-dormitory-entrance、nanyuan-reference-refresh、promotion-capture、promotion-shots。源照片视频/个人音乐/Codex缓存/before/本地验证录制脚本不提交。无新版本，无需伪增README工作量。Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`；Python同dependencies/python/bin/python3；ffmpeg `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`。240000阈值不能保证避免413；只输出相关短段。

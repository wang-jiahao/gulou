# 最新短交接：52秒第二版已交审看；优先性能与普通飞行建筑闪烁

主树 `/Users/zackaria/Desktop/gulou campus`，main，0.117.0；本轮前HEAD `ee23d21`已同步origin/main，后续以Git为准。用户最新要求先录第二版看整体效果，已执行；性能仍最优先，普通飞行建筑闪烁待修。**已授权私有源码/必要资产同步；用户提出后续网页部署供手机自验，当前不提前部署，不公开源码仓库**。作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。复用4173/PID5451，只用CUA操作浏览器，不用shell Playwright/CDP，不唤亮屏幕。

## 已过，不重做
- 人物v116本轮美术/28动作；65篇主要故事；屋顶18m实飞落地→走下→一次重生25项；三条公共路可见贯通；27点206.5秒核心步行。
- v117西南楼落点改到长阶梯脚外：真实到达7项、上下阶9项；148目录（旧93+新55）1036到达布尔通过。HUD真实入口优先，11冲突+5保护16点通过；nearby17。
- 地图键盘/座椅/男女三套换装79 Boolean。持续飞行30.02秒/55m、持续骑行30.033秒/111.789m/12项通过，根看正常画面。不要重跑草坪错误骑行fixture；旧失败保留。
- 生产types/eslint src/build/57资产已过（既有大chunk提示）；本次只改忽略的录制工具与交接，无新游戏版本，无需重复全套。
- 稳定证据 `/tmp/gulou-v117-evidence/`：southwest-stairs、directory-tail、entrance-hud、mobility-with-flight-pass（仅最后flight passed）、bicycle-passed、canopy-rejected、north-timer-rejected、passive-drift。

## 最新用户指示与交付
- 用户明确：手机触控先不管，后续部署网页后自己手机验收；此项本轮不阻塞，不记通过。性能最重要，普通飞行时建筑仍闪烁，可采用减轻不良体验的合理办法。
- 随后明确“现在可以先录制宣传片，我先看看整体效果”，覆盖原A02关闭才能录的前置。正式计划gate已记recorded-for-user-review/recorded:true；A02没有关闭。
- 本地审看片：`.local-media/promotion/v117-cut2-review/gulou-cut2-52s.mp4`，1920×1080/30fps/52秒/1560帧，39,534,397bytes。已合128BPM原创结尾WAV，H.264/AAC；完整视音频解码1560帧通过，峰值-0.9dBFS；根看编码后26镜中帧联系表，无黑帧/缺镜/损坏。听感仍未验，等待用户看整体效果。
- 旧`docs/media/gulou-preview.mp4`哈希未变，README仍首版；审看片本地不提交，不擅自替换旧片。证据`/tmp/gulou-cut2-recording-20261010/encoding-report.json`、recording-manifest.json、encoded-sheet-1/2.jpg；原片Downloads/gulou-cut2-52s.ivf。录制tab51已关闭，0页错误、2条既有弃用警告、全部镜头cameraDelta0。

## 当前优先顺序
1. **A02性能与普通飞行建筑闪烁**。用户亲测仍闪，尚未复现/定位到唯一原因。只读发现`ordinary-buildings.ts:421–427`立面细节以玩家到cell中心的3D距离直接开关：飞行high125m/其它85m，步行high200/medium115/low85，无滞回/淡变；飞行还直接关这些细节的投影。相机near.07/far1200、浅墙叠层、飞行FOV与CSM变化也是待区分假设，不能凭代码当根因。先捕获普通飞行，分清整组跳变、深度条纹、阴影爬动再修；不重复盲试已拒候选。`/tmp/gulou-v117-flight-flicker-handoff.md`。
2. 亮屏IAB40秒仍36.50→16.15FPS（前/末10秒），全25.48FPS/p9566.7ms。Chrome报告已恢复导出，12:22:11开始40秒/1180帧，29.51FPS/p9534.4ms，四段30.00/29.30/29.50/29.25；本轮无持续衰减。主绘制IAB1625/5463922与Chrome1624/5337258差1draw/126664三角形，原因未清，非严格同负载A/B，不据此关闭A02或断言宿主原因。原始Chrome`/Users/zackaria/Downloads/gulou-passive-drift-v117-1791606958455.json`；IAB`1791606003640.json`；派生`/tmp/gulou-v117-daylight-20261010/`。OS逐秒脚本只覆盖部分窗口，powerd已保存，不把缺lock字段作亮屏证明。
3. **A05独立全屏**仍未完成。Chrome已恢复到正式主页，但用户接手试玩，从金大路走到中大路上空16m，工具也提示用户操作了应用；没有继续抢操作、没有关闭用户正在用的页。待适当时机再从HUD/设置实测持续进入/退出/继续。IAB极简页50ms退出旧证据不作普通浏览器失败。
4. 9类资料不足细节按remaining-todo暂缓，清单已逐项告知用户；不是9个完全没建的场景。A03手机明确交给用户后续自验。README赞赏保留末尾，无新游戏源码版本，不虚增统计。

## 宣传片预览本次完成
- 主准备页 `/docs/validation/promotion-20261010/index.html`：26镜×2秒=52秒，北大楼仅I❤️NJU一次，飞先骑后，第一人称隐藏人物，无球类场景。所有26镜由根实看后标approved；用户提前录制指示已执行，gate现为recorded-for-user-review。
- 26镜×60帧完整1920×1080渲染（1560帧），全部逐帧相机/风/尺寸状态与160×90RGB相邻变化记录；批量console无新消息，初始化有既有依赖弃用警告。根查看28组最大变化前后原图的800px版本；没有自动阈值或自动视觉通过。22静景最大RGB均值0.277/255仅作诊断，不能保证细枝零闪烁。
- 另跑飞/骑60+60帧，根看8张798×850联系表覆盖全部120帧并对照大幅变化对，未见明显远楼/树冠硬切或人物；重放相机差0。**只覆盖本片路线与录制专用冠层策略，不代表普通游戏全场性能/动态通过。**
- 图书馆新机位`[-77.2088,3.5,285.2827]`看`[-64.4,5.2,286.15]`、FOV59已采用，灯柱在镜后，牌/门/台阶清楚，另60帧过。餐厅已采用旧轮低机位`[-40,3.3,592]`看`[-62,5,580]`、FOV78，不删树。
- 田家炳17:40候选实看后不采用：只是间接稍亮并变暖天空，保留14时统一白昼。当前太阳路径不能让北立面被正面直射，不改光照模型。
- 核心证据 `/tmp/gulou-cut2-1080p-review/`：report.json（全26）、refine-report.json（新library/试tian/飞/骑4镜）、summary.json、REVIEW.md、peaks/、inspect/、shotlist-reviewed.json。所有before保留。早期960×540/78关键帧资料仍在`/tmp/gulou-cut2-review/`。
- 忽略的局部检查页 `/docs/validation/promotion-refine-20261010/index.html`只4镜且含未采用田家炳候选，**不可当正式计划**。正式计划是promotion-20261010/shotlist.json。
- 已按用户新指示录制并完成最终编码抽帧/解码。不要重跑全部分镜或重复录制；先让用户看当前审看片，再按反馈调整。

## 配乐、工具和恢复
52秒原创128BPM结尾候选`/tmp/gulou-cut2-music-endings/gulou-cut2-52s-ending.wav`，50.625秒最终D，51–52淡出。解码/响度/真峰/零削波过；**模型不能试听，听感未验**。源音轨保持；脚本`/tmp/gulou-cut2-music-ending.py`支持48–56秒默认plan-only。最终用WAV合片，不重复AAC编码。

本轮CUA导出15链接时在骑行max图处30秒超时，REPL重置；网页数据保持，重新getTab49后分2链接全部导出，没重跑Game。工具问题非游戏故障。IAB id2；tab48/49均关闭，未设置viewport。不要重新选浏览器来恢复空tab；用已知id2新建所需页即可。

六本地脚本保持未跟踪：astronomy、dormitory-family、nanyuan-dormitory-entrance、nanyuan-reference-refresh、promotion-capture、promotion-shots。源照片视频/个人音乐/Codex缓存/before/本地验证录制脚本不提交。无新版本，无需伪增README工作量。Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`；Python同dependencies/python/bin/python3；ffmpeg `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`。240000阈值不能保证避免413；只输出相关短段。

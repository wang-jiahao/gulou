# 最新短交接：建筑状态文档、作者口吻；贡献者身份方案准备中

主树 `/Users/zackaria/Desktop/gulou campus`，main，生产版本0.119.0；提交以Git为准。不要另开agent；3旧agent均完成。复用4173/PID5451，不动用户Chrome页。私有源码/必要资产同步已授权；不部署、不公开、不启用Pages。作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。

## 最新接续，优先读本段（2026-10-10）
- README已按要求调整结构与作者口吻，删“感受它正在以多快的速度发展”，新增`docs/building-status.md`并在“一起共建”引用；建筑方法拆`docs/building-process.md`。状态清单区分局部精修、已有资料待改、缺资料/基础外观。对外文档移除“用户提供”等第三人称描述；地图改为 https://zcc.nju.edu.cn/cssy/dzdt/glxqdt/index.html 。赞赏仍绝对末尾。
- 贡献者历史已经用户明确批准并执行：远程/main与本地/main均1ea70c8；142次统一noreply，142个tree/消息/日期保持，未提交diff/索引/6未跟踪文件哈希均一致。结果`.tools/contributor-identity-20261010/execution-result.json`，备份bundle保留；GitHub统计待缓存刷新，不再重复请求授权或强推旧候选。旧子agent分支只作旧快照，未来工作应从新main接续，不能将旧根合并回来。
- 工作量原话已找到：当前任务JSONL5948行（10-04T11:24:02Z）要求照片/视频/资料、对话轮数、token/费用及每版更新，6272行补代码行数/规模/版本数。摘录在`/tmp/gulou-work-metrics-user-matches.json`。
- 费用已实读官方https://developers.openai.com/api/docs/pricing：Astra Standard每百万短上下文输入10/读1/写12.5/输出50USD；>272000输入则20/2/25/75。输出含推理，读/写/普通输入互斥。14独立任务（11主+3子）15日志去重，最新快照1457666927token、5197.9725895USD（以metrics最后结果为准）。旧4439万快照已替换，README简化、明细拆docs/work-metrics.md。新work-usage.mjs和metrics默认自动重扫同项目日志，原始内容不提交；合成去重/长短阈值/分区/继承计数与独立Decimal核算通过。
- 用户催进度并明确允许强制不熄屏：已运行`/usr/bin/caffeinate -di` PID75604，防熄屏/防闲置睡眠assertion都为1；只维持当前开发，结束或要求恢复时kill该PID。没有修改系统持久设置。
- README视频嵌入仍待：ViMax实际使用GitHub user-attachments/assets URL（裸URL/HTML video），不是仓库blob MP4。不要再说GitHub全不支持视频。附件可见性与私有范围待核，尚未上传。README暂放旧截图，旧影片均保留。
- 新片cut4仍未完成：`docs/validation/promotion-cut4-20261010/`，24镜51秒1530帧；删赛珍珠，简化地名，保留服务大厅/东西楼/博物馆好机位；改逸夫馆/教超/拉贝，加仅飞行/夜/雨。Yifu候选[-303,6,19]→[-305,6.4,22]被树严重遮挡，不可采用；需换另一侧。教超/拉贝/夜雨新机位未审。雨天museum目标要对照原好机位，不能沿用未经核对的手写值。
- cut4四点分类图在`/tmp/gulou-cut4-20261010/`，suzhe-aerial/fei/yifu-hall/zhongshan，near.07/1与收阴影开关。near1可减细窗干涉，仅诊断，未采用；还须全帧检查裁剪/时序，不能把静图当无闪烁证据。录制页59无运行任务，关闭后重开既有URL即可。
- 逸夫馆题字候选未验证/未提交：`src/world/yifu-hall-facade.ts`使用addBuildingLettering，`building-lettering.json`增加yifuHall。实看官方gl-4-13高清crop，4contours/heightRatio.21954，宽3.55m。`.tools/v120/trace-yifu.py`，`/tmp/gulou-cut4-20261010/yifu-contours.png`。待清晰正式画面、types/lint/build与来源记录，不得记为完成。
- A02新增定位已完成，生产渲染未改：`/tmp/gulou-flight-depth-v119/README.md`为权威。普通北向飞行326帧，远立面带关闭接收阴影零像素差，近裁剪改变斑纹；Fei玻璃/衬层仅4.9mm，唐楼2.8mm深度差，24bit深度干涉已证实。非所有闪烁根因，非性能收益。
- logdepth双renderer试验无效：候选未重建独立PMREM，环境变暗；期间还发生原生滑翔移动。没跑有效性能A/B，未采用。若重启须独立PMREM和固定暂停场景；雨自定义shader缺logdepth片段；reverse depth还受CSMFrustum[-1,1]假设约束，不能盲开。
- 每帧FOV趋近造成326帧324次CSM刷新合计126.4ms，最后差约1e-12度；不能据此称主瓶颈。普通窗polygonOffset候选未解决Fei/Tang且近景遮挡未验，未采用。
- CUA重置后IAB是3。截图data URL超200000字符会截断；read-only DOM href按150000分块返回、Node拼接后base64写盘。已恢复所有24诊断图，不重飞。

后续仍先A02和本次新片反馈；南园同朝向/侧牌、汉口新柜与拆棚/碰撞、苏浙捐建牌、其它字体审计都已有资料待改。独立全屏未验，手机明确留给后续用户自验。旧验收范围和具体证据见下方历史段；与上文冲突以上文为准。

## v119最新结果，先读本段
- 确认一种普通飞行闪烁来源：100m细部组在阈值处硬切，多栋窗框/空调同时出现，根看基线第6/7对。原版597帧11事件/8图对，`/tmp/gulou-flight-flicker-v118/baseline.json`。非所有闪烁根因、非整楼消失。
- 生产`facade-visibility.ts`将切换改为0.4游戏秒淡变，结束还原原不透明材质；原距离/几何/阴影规则保持，Game原生dt经world传入。静帧或旧调用没dt则直接设置状态，既有录制器不变。材质hook/基础opacity均保留；过渡反向与终点微小余量恢复已专项检查。
- 生产普通Game638帧＋10过渡图实看通过，0page error；`production-v119/report.json`及contact-0/1.jpg。只关闭“立面组瞬间跳变”这一缓解，不说全校零闪烁。
- 本地同页/同路线预热+A/B/B/A、无捕图读回：A55.29/B54.25/B60.00/A53.67FPS，加权tris约1.480m、差<0.1%。B第二轮提速不能稳定归因，不宣称FPS收益；该路线不是此前北向5.4m tris压力画面。透明变体多2program，首次编译成本未独立量化。A02继续开放，优先剩余深度/阴影闪烁、真实卡顿。
- Node `.tools/v119/facade-check.mjs`专项、types/lint/build/58资产过，既有chunk提示。README刷新至119，赞赏末尾。所有tab54–57均关闭；IAB在工具重置后ID变成3（2变mcpapps），需要恢复时看真实inventory/已知URL，不硬套旧2。
- 本轮采集、候选和对照均为忽略的本地工具：`docs/validation/flight-flicker-v118/`与`flight-flicker-candidate-v118/`、`flight-fade-benchmark-v118/`要求旧118基线，当前生产已改，不可直接重跑得到有效A/B。生产复验页`/docs/validation/flight-flicker-production-v119/index.html`使用当前代码、无渲染覆盖；先看已有证据不要无故重跑。
- 初次ABBA在预热第1帧因fixture连续pause/resume中断，已修为不间断批次并完成5run；失败保存benchmark-first-interrupted.json，不作为游戏失败。图片data URL的downloadMedia曾超时；使用read-only DOM href→base64保存已恢复全部图片，无重飞。

## v118已完成与实际验证
- 教育超市倾斜主字形及居中、副标、左右入口/出口；南大記憶繁体书法轮廓，移除小印章残影。实际看照片与正式场景，尺寸/轮廓仍近似。
- 教学楼四条幅及开放2026框/数字；三门与楼梯保持，中央净宽2.96m。真实Rapier10进出路径、26碰撞体和有限几何过。
- 戴安邦用户新图已进展板，留边/完整水印，7头像28版式过；公开许可未确认，展板页脚与许可文档均如实说明。
- 作者主页人像图标；设置返回开始页移到顶部醒目房屋按钮。tab53正式UI金大路→设置→返回开始页（位置已保留）→继续（金大路）实测通过，errors=[]，验收图`/tmp/gulou-v118-settings-return.png`；tab53已关闭，不动用户Chrome页。
- types/build/eslint/58资产通过；最新字形与按钮之后types/build/eslint又过。生产构建有既有大chunk提示。life设施17通行/5射线/6公共路扫掠、教学楼10路径、头像28版式报告均在`/tmp/gulou-v118-*`。README统计已更新，赞赏在绝对末尾。

## 新宣传片已完成，勿重复全套录制
- `.local-media/promotion/v118-cut3-motion/gulou-cut3-44s.mp4`，44s/22镜/1920×1080/30fps/1320frames，104456136bytes，SHA256 `22a57f5550884589213025ff0bcfa72e2baa20d5f01a932fdd4f8e020ad82c49`。
- 用户指定22项：北大楼/I❤️NJU一次、汉口门2s、教学楼、图书馆、南园餐厅东廊、苏浙俯瞰、大纛坪、游泳馆、新教学楼、南教学楼、东大楼、西大楼、校史博物馆、逸夫馆、费彝民楼、教育超市、鼓楼服务大厅、中山楼、逸夫管理科学楼、赛珍珠纪念馆、拉贝故居、小蓝鲸迎新。每镜2s，真实三维相机移动2.5–14.59m，无片头尾卡，无球类片段或人物近景。
- 全22镜1080p60帧预览实看66首中尾图；西大楼/新教学楼重选路径后另60帧低分辨率预览；正式最终全部1080p。22编码中帧与首尾看过，无黑帧/缺镜/损坏。完整视音频解码1320帧、cameraDelta0全22、无page error，2旧弃用警告。配乐128BPM原创44秒结尾，客观音频过，模型听感未验。
- 计划`docs/validation/promotion-cut3-20261010/shotlist.json`已标recorded-for-user-review/recorded:true。源工具及成片保持忽略/本地，不提交；旧docs/media/gulou-preview.mp4和v117-cut2-review/gulou-cut2-52s.mp4均保持；README仍首版，等用户整体审看反馈。
- 权威证据`/tmp/gulou-cut3-20261010/{encoding-report.json,recording-manifest.json,batch-preview.json,review-approved.json,encoded-sheet-0.jpg,encoded-sheet-1.jpg}`。Raw Downloads/gulou-cut3-44s.ivf；导出gulou-cut3-review (4).json。tab52已关闭。

## 下一步顺序与未完成
1. **A02普通游戏飞行闪烁/性能继续最优先**。v119已缓解整组细部硬切（上段证据）；继续区分远楼表面深度条纹与阴影爬动。near.07/far1200、浅墙叠层、飞行FOV渐变每帧触发CSM更新仍是未证实假设。显示范围仍飞行high125m/其它85m，飞行细部投影原规则未改。旧`/tmp/gulou-v117-flight-flicker-handoff.md`已注明被本轮结果更新，不再重复调查已证实硬切。性能候选需同条件稳定收益，不降画质掩盖。
2. 亮屏IAB40s36.50→16.15FPS，整体25.48/p9566.7ms，draw固定；Chrome40s29.51FPS，四段30/29.3/29.5/29.25，少1draw/126664tris，非严格同负载A/B。原始Chrome Downloads/gulou-passive-drift-v117-1791606958455.json，IAB1791606003640.json；`/tmp/gulou-v117-daylight-20261010/`。不要归咎锁屏；同负载38→12旧漂移也保留。树冠更新/南北timer等已拒无稳定收益候选不重复。
3. **南园一二三舍门口同朝向+侧牌对齐**。旧plan90一北、94二南、101三北，nearest-road决定front导致不一致；1/3牌已生成但可能在错误面，不盲目再添。
4. **只做汉口路外卖柜**：新图已明确位置/外观；外卖棚已拆，删除棚体与碰撞，不再索要相同资料。**苏浙牌**：南京大学苏浙运动场 / 2002.5.20 / 香港苏浙同乡会捐建；深红瓷砖牌位于铁丝门左浅墙、后方玻璃低楼，核对西门看台位置后实现，不能猜坐标。
5. **其他既有照片建筑字体审计**仍待，教超/记忆已修；可核费彝民、田家炳、校医院等。资料原图`references/user-review-20261010/`九图，原始参考不提交。
6. **独立浏览器全屏A05**未完成，Chrome主页面由用户试玩，不抢操作/不关闭。IAB极简页50ms被宿主退出证据不当普通浏览器失败。**手机已明确交用户未来网页自验**，不是本轮阻塞或已过；不提前部署。

## 已通过的旧范围，不重做
人物v116本轮美术/28动作；65主要故事；18m屋顶落地走下/一次重生25项；三公共街道可见贯通；148目录1036到达布尔；HUD16点/nearby17；UI79Boolean；持续飞行30.02s/55m、骑行30.033s/111.789m/12项。旧证据`/tmp/gulou-v117-evidence/`及progress/remaining-todo。宣传片专用稳定植被不代表普通游戏A02通过。

## 操作与恢复
- 只用CUA操作UI，不用shell Playwright/CDP。IAB browser2绑定可复用；tab52/53已关闭，用已有browser2新建所需验证页。用完关代理验证页，勿动用户原生Chrome。
- Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`。当前shell无npm，直接Node运行node_modules/typescript/bin/tsc --noEmit、node_modules/eslint/bin/eslint.js src、node_modules/vite/bin/vite.js build。最新构建日志`/tmp/gulou-v118-final-build.log`，lint同前缀；npm找不到的初次调用已改直调并成功，不是代码失败。
- Python同runtime dependencies/python/bin/python3；系统python3无PIL；OpenCV在.tools/python。ffmpeg `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`。小专项.tools/v118/，原图/个人音乐/缓存/before/验证录制工具不提交。
- 六未跟踪本地script保持：astronomy、dormitory-family、nanyuan-dormitory-entrance、nanyuan-reference-refresh、promotion-capture、promotion-shots。只显式暂存生产代码/必要资产/文档。
- 只读短相关段；JSON取字段；1–2张约800px；长日志落盘。重要变化/失败写准确短交接。240000压缩阈值不能承诺根治413。

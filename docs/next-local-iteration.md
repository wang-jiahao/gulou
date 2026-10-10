# 最新短交接：v0.118已完成；继续优先普通飞行闪烁/性能

主树 `/Users/zackaria/Desktop/gulou campus`，main，0.118.0；提交以Git为准，本轮前HEAD09c0b10。用户持续开发指令有效。私有源码/必要资产同步已授权；不部署/不启用Pages/不公开仓库。作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。复用4173/PID5451。三旧子agent已完成，无重复委派；不要另开agent。

## 本轮完成与实际验证
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
1. **A02普通游戏飞行建筑闪烁/性能最优先**，本轮没有生产修复。用户允许合理减轻不良体验；先捕获分清整组硬切、深度条纹、阴影爬动，再验证同条件稳定收益，不降画质掩盖。`/tmp/gulou-v117-flight-flicker-handoff.md`。ordinary-buildings.ts细节3D距离硬开关飞行high125m/其它85m，无淡变或滞回；飞行关细节阴影，near.07/far1200。均为待验证假设，不能凭代码认定根因。
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

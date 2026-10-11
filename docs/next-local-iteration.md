# v134 已正式上线（2026-10-11）

源码132e5f9、主页发布c74ba51均已推送。线上release.json确认v0.134.0／medium／鼓楼漫步，6个变化文件HTTP200及SHA全部匹配。正式网页点击进入后，设置显示“鼓楼漫步 · 原创轻音乐”和“暂停”；暂停→播放→暂停切换通过。首次加载曾在纹理阶段报Event，重新加载后成功进入，未复现持续失败；不据此判断根因。系统静音，主观听感留用户试听。

README已替换为61秒宣传片，用户确认GitHub播放成功；匿名仓库HTML也包含GitHub生成的视频播放器（附件裸地址404不能据此判断播放器失败）。压缩副本完整1830帧/61秒解码通过，原片保持。README“可交互的”已删除，个人主页Sponsor已移除并上线。证据/tmp/gulou-release-20261011/live-assets-v134.json及/tmp/gulou-default-music-v133/online-music-v134.png。不要重复上传音乐文件：默认配乐是约1.2KB增量代码合成，无额外音频资源。

---

# v134 内置轻音乐与 README 宣传片（2026-10-11）

- 按用户要求新增原创钢琴配乐“鼓楼漫步”，以舒缓、留白的游戏音乐氛围创作，未使用Minecraft录音或旋律。Web Audio现场合成，无音频下载，全部JS gzip较v133增加1158字节。空/失败歌单自动回退；本地导入、暂停恢复、音量和切曲保持。
- 实际浏览器AudioContext播放/暂停/恢复及本地导入切换通过；32秒离线合成有限、无削波，peak .04568；只请求歌单，无音频资源请求。系统静音，未做主观听感验收。类型/lint/音频shuffle/58资产/build:pages通过，证据/tmp/gulou-default-music-v133。
- README移除“可交互的”，预览图改用用户已确认上传成功的61秒cut7视频附件。原片和压缩副本均留本地，不加入Git。个人主页Sponsor导航与正文已由dd3feb6删除并线上核实。
- 用户已明确授权公开与部署，正在同步v134；最终线上状态以release.json及后续发布记录为准。手机默认medium保持，普通A02仍开放。GitHub附件匿名可见性在提交后复核。

---

# 正式发布完成：v133与音乐问题定位（2026-10-11）

- GitHub仓库已公开，用户完成Chrome二次验证后设置显示currently public，匿名HTTP200。游戏https://wang-jiahao.github.io/gulou/与主页已发布；无需再次索要发布授权，也不得按旧交接撤站／私有。
- 当前线上v0.133.0，源码f9a4cf5，主页发布d9541ba。release.json确认medium；首发70文件SHA全部对齐，此次变化5文件再次逐一线上核对通过。手机粗指针不再默认low，保留已有手动画质选择。实际手机可玩是用户报告；本轮未冒称另测真机。
- 用户问其它电脑／手机没音乐：线上data/music.json确为tracks[]。本机五首Minecraft个人曲目由Vite localhost接口供应，按此前要求不随公开站点分发；导入文件也不跨设备同步。已说明根因，未擅自上传个人音乐或换配乐。若用户要求全站默认音乐，按其后续选择处理；不要把空歌单误判自动播放故障。
- 发布证据/tmp/gulou-release-20261011/release-report.json、live-assets.json、live-assets-v133.json和游戏／主页截图。cut7已获用户认可保持，普通A02仍开放。旧待二次验证／准备v133的条目均已完成。

---

# v133 手机默认中等画质与正式公开（2026-10-11）

用户手机实测可玩，要求默认中等：移除触屏设备自动选择low的分支，首次初始化统一medium；已有合法画质偏好仍在建场景前恢复，用户手动选择保持。更新旧手机验收脚本的预期值；类型构建／lint／58资产检查通过，未重跑旧全套手机验收。准备发布v0.133.0，最终线上状态以release.json为准。

仓库公开已通过用户Chrome二次验证，设置明确显示currently public，匿名仓库HTTP200。v132游戏及主页已上线，70文件线上SHA一致，Sponsor／Gulou入口／简介／News可见。旧“等待身份验证”已完成，不重复索要；用户明确授权公开与部署，勿按旧限制回退。cut7不改，A02其余问题仍开放。

---

# 2026-10-11 发布：游戏与主页已上线，仓库公开待二次验证

用户明确授权现在公开GitHub、部署游戏并更新主页，覆盖此前私有／禁止部署限制。游戏v0.132.0随个人主页仓库master c461039发布到https://wang-jiahao.github.io/gulou/；主页Sponsor、游戏入口、Education后项目简介和News均已上线。线上release.json核对d089ff6源码快照／d50f1ed生产实现；70个发布文件HTTP200且SHA256全部与本地构建相同。实际进入校园、看到完整场景与HUD；只出现既有弃用警告，无控制台error。手机留用户网页自验，普通A02继续开放。

GitHub公开已在用户指定的已登录Chrome进入Confirm access，需用户完成GitHub Mobile／验证器／密码验证。未完成前不能声称仓库公开；不要跳过二次验证。发布证据`/tmp/gulou-release-20261011`，现有登录页保持，用户其它标签不动。网站已经发布，不得按旧交接撤回。cut7已获用户“完美”认可，影片不改。

---

# 最新补充：v132顶视预检与cut7来源（2026-10-11）

- 生产仍d50f1ed/v132、最新影片cut7不变。`.tools/top-basis-v132/check.mjs`为数学预检；25机位复现当前矩阵max4.443e-7。16°带内四元数slerp在仰角67.5/方位-.1→0时跳179.962°；up向量lerp在方位0/仰角65.465→65.466时翻180°。两种简单朝向插值都不采用，不用再做GPU计时；未图像验证、不称性能结论。`/tmp/gulou-canopy-basis-v132/{README.md,basis-sweep.json}`；下步需分开侧/顶取样坐标及正确混合，不能把旧up硬切简单改成插值。
- cut7本地timeline来源字段原继承cut6初稿，已修为实际assemblySegment＋22镜cut6c来源帧位；26镜连续1830帧、1410复用帧依据已保存MD5逐项对齐。旧字段存timeline-before-provenance-fix.json，仅历史。成片没有重编码/改动，master仍26approved/本片reuse。独立报告仍未出现，不反复催；优先接用户反馈。

---

# 最新：v132 / cut7已完成，待用户看新版（2026-10-11）

- 源码d50f1ed私有同步，礼堂按四新照提高山墙/取消正面假窗，三门三窗/禮堂字和团花轮廓/屋顶/阶边/侧藤重建；两指定树post-filter移除，其余随机序列不变。健忠台面剔除内层共面顶、七阶外表并集，33物理/相机不变；西南49保持。柜恢复灰黑40格美团标，但新址[-36.91375,376.30525]保持，无棚，6物理/相机和600公共道路点通过。礼堂23solid六阶，东西大楼碰撞保持。类型lintbuild58资产metrics过。
- 最新影片 `.local-media/promotion/v132-cut7-motion/gulou-cut7-61s.mp4`，26镜61s1080p30。去中山/拉贝，柜只叫外卖柜，补hall/dadaoping/lockers各60帧和flight240共420；22旧镜1410解码帧同cut6c。全1830帧AV解码，root看全420联系表、60白阶原生crop、flight21/22原生crop及选定全景。音轨雨58–61s、音乐压低、尾60–61淡出，峰-1.2dB，听感未验。
- Flight起点是教学楼左侧，实际[-105.0597,23.2224,162.7482]到[-25.5664,22.9698,10.0559]，全240gliding、高度22.9467–23.2224，第三人称。原生起飞+预备Control降高，拍摄W/Shift且每11帧Space一次维持高度；不是camera伪造。录制near4/4K缩1080仅影片，不搬普通游戏。不能用原旧preRoll带W流程还原。
- 恢复 `docs/validation/promotion-cut7-20261011/?validation=1`，master26approved且每镜reuse指本片正确时间。别直接重录全套或覆盖旧片。原片Downloads/gulou-cut7-14s.ivf和review(1).json；证据/tmp/gulou-cut7-20261011/{README.md,final-review.json,encoding-report.json}。首次assembly后验证旧timeline缺duration报错，已改frames，verify-resume重用现有片完成验证，不重编码。
- promo_review_fresh旧任务被新cut7小范围复用；正看6张全图+60阶裁图，报告/tmp/gulou-cut7-20261011/independent-review.md尚待。按实际文件取结论，勿假称独立全片通过。旧cut6报告不用再催。
- 0亮度静音保持，caffeinate75604/4173复用，tab32关。用户准备下午发布但还未授权公开/部署，只有私有源码及必要资产同步授权。先接用户对cut7意见；普通A02与待办仍开放，勿盲重复旧试验。6个既有untracked脚本不动，原图音乐验证/录制脚本不提交；README赞赏绝对末尾。

---

# 最新用户优先：v132/cut7正在制作（2026-10-11）

- 下午发布前优先完成这版宣传片。当前worktree不是已验收成品，package仍v131。礼堂按四新照重建山墙、红门、窗、禮堂轮廓题字/团花、侧藤；指定两树通过post-filter删除；健忠楼踏步渲染并集/覆盖顶面剔除，33物理/相机不变；外卖柜恢复灰黑美团标40格、保留正确新址，无棚。
- fixtures `.tools/v132/check-fixes.mjs`已过：健忠/西南物理/入口/metadata同旧、另一楼渲染属性相同；新柜6物理/相机与600公共路点无阻、旧新frontage同；礼堂23solid、6阶，东西大楼solids同旧。类型lintbuild58资产过。礼堂GLB已更新，最终机位待完整实看。原相机31已不存在。
- 新录制页`docs/validation/promotion-cut7-20261011/?validation=1`，IAB6 tab32已markHandoff。选4镜hall/dadaoping/lockers/flight-high共375帧12.5s待补，去中山/拉贝后26镜59.5s；其它22镜从cut6c保留。旧master不改。flight首次/第二首帧已看，第二仍偏高，最新已改原生起飞后Control下降预备，start[-113,.05,178],yaw-.48,pitch.18,75–98preRoll按Control，总114后开始W/Shift，最新尚未看/未录。不得把未验设置当最终。用户截图左侧存在`references/user-review-20261011/flight-start-left.png`，两树及四礼堂照也在此目录。
- 备份`.tools/v132/*.before.ts`与landmarks-collision.before.json；礼堂glyph轮廓来自新照，不提交原图。根目录README用户去在线体验粗体改动保留。不能运行update-hall/prepare-cut7覆盖后续调整。新片另存cut7、保留旧片，rain仍56.5–59.5s要重做结尾音轨淡出。0亮度/静音/caffeinate75604/4173继续。私有同步允许，禁止公开/部署。

---

# v131 后续：67.5°顶视新证据（2026-10-11）

- 生产仍7b1afca/v131，无新源码／影片修改。当前合批版本641升降采样(20–100m/.125m)、45°俯视相机发现2次屏内4..7→8；最大事件instance214在39.5→39.625m发生4→8，同时upY→upZ导致同相机平面roll125.6571°。同after相机仅旧图集改变40099RGB像素，仅旧朝向61198，二者56547，恢复0差/0GLerror。计数重叠不相加，部分冠位于画面下缘，不称全冠完整可见。
- before/after800全图与native after/atlas-only/orientation-only/both裁图已看，冠形明显突变。`/tmp/gulou-canopy-top-v131/{README.md,events.json,isolation.json}`为新证据；恢复`docs/validation/canopy-top-v131/?validation=1`，门禁v131。不是旧22.5°平滑候选重复计时，也不是键盘飞行验收。
- 下一步候选须同时处理顶视图集与朝向连续性；不能简单删upZ（会变顶视对齐且接近垂直有奇点），不能仅混图忽略125°roll。先数学／原生连续帧，再同条件配对性能；未实现、未采用、无性能结论。tab28已关，0亮度静音/caffeinate75604/4173保持；独立编码报告仍未出现，cut6c保持。

---

# v0.131 最新：树冠合批（2026-10-11）

- 已采用 `canopy-batch.ts`：73组244实例合成一批，原树近模/LOD/碰撞/裁剪/阴影/分辨率保持，原分区fade/可见性与图集数据逐实例传递。root-relative变换在expand结束后固定；buffer version脏检查保持静止缓存，初始batch隐藏避免未同步平面。此前20m密集树拆批是相反方案，不混淆。
- 最终证据 `/tmp/gulou-crown-batch-final-v130/corrected/{visual,paced,summary,fixture}.json`。18环境/范围/LOD组合A/C/A全还原0，近景0差、flight4/edge16叶缘像素、移动16帧max5；北楼实际fade.47456。是运行时植被LOD，不冒称低画质启动/手机通过。原生微差prototype已看，修正后的天空跟随及4生产视图已看。
- 8ABBA/256GPU/0disjoint，逐帧读完GPU query再下帧；场景更新+渲染CPU比.94871388（8周期均较低），提交.94323529，GPU.987383双向，保守称CPU约5%改善，不称全游戏FPS/GPU提升。计时update含pose/CSM，不是纯植被耗时。主draw少56，正式配对1409→1353/3999236→3999316tris；生产因原LOD历史不同为1354/4110147，不跨场景比较。
- root目录初版图天空未随大范围移机，黑缺口为fixture错误；`corrected`才是最终。初版连续计时baseline约7→24ms，夸大.3903收益不用、不猜因。第二次追加paced页面回到初始且未保存，原因未知，不计又一轮通过。原prototype8ABBA total.92189仅辅助。无需重试已完成方案。
- 正式4机位73/244及静止缓存/无重复可见源/0GLerror过， `/tmp/gulou-crown-batch-production-v131`；恢复 `docs/validation/crown-batch-production-v131/?validation=1`。旧final页有v130本地world/game副本和门禁；prototype会叠加第二batch，勿直接重跑。types/lint/build/58资产通过，README统计随提交刷新。tabs25/26/27关闭。
- cut6c仍最新，未重录；本轮补看苏浙38–40s(1140–1199)全部60场地裁片、首末全景和native39/40，无大片场地消失，细线仍有像素变化，证据 `/tmp/gulou-cut6-suzhe-review`。不称完全无闪。promo_review_fresh仍运行/曾断线，最终encoded-agent-review.md未出现，只等实际范围，不反复催收。
- 苏浙捐建牌已复看原照、4官方VR面与体育地图。牌在西侧门外左/北、后方是看台玻璃，当前地图门标约[-242.005,9.617]与看台西缘x-255/南端z5关系尚不能确定精确落点；不照门标盲放。`/tmp/gulou-suzhe-plaque-v130`。原字体/柜花纹及A02余项仍待。
- 0亮度/静音/caffeinate75604/4173保持，不动Chrome。仅私有同步，未公开/部署。生产提交以Git为准，v130白边及旧已验项不重做。

---

# v0.130 最新：画布透明通道白边修正（2026-10-11）

- 生产game.ts增加scene.onAfterRender：默认buffer且getClearAlpha()==1时，仅清alpha通道并恢复colorMask。Three r180即使alpha:false仍创建alpha上下文，叶缘alphaToCoverage留下半透明目标像素被网页/PNG再次合成。只清alpha前后RGB零差、132491半透明像素归零；不是改树形/纹理/雾/深度/分辨率。A02仍未全关。
- 24候选同帧对照（8日/暮/夜/雨+16移动）、6正式日雨机位RGB零差及A/C/A恢复；正式雨飞/博物馆/大纛坪实看。候选low机位在冠层内部，不冒称步行近景；正式museum/dadaoping无遮挡。离屏9216与透明画布2073600部分alpha像素RGBA完全保持，0GL/页面error。/tmp/gulou-alpha-production-v130/{production,final-review}.json。
- 8ABBA/256GPU/0disjoint，主draw1409/3999236tris相同，GPU中位比1.00739、CPU1.01122，约1%成本，不称提速或全游戏FPS结论。另直接opaque context方案同RGB但GPU1.16372/CPU1.19652，已拒绝，不再重复。证据/tmp/gulou-alpha-resolve-v129/README.md及/tmp/gulou-opaque-canvas-v129。
- 首次生产guard假设scene.background是Color，实际Atmosphere改null，验证失败已修为getClearAlpha检查。旧图/JSON在invalid-background-guard，不是通过证据。类型/lint/build/58资产过。恢复docs/validation/alpha-production-v130/?validation=1；旧v129实验页门禁/源已过期，勿直接重跑作新证据。
- cut6c仍最新未重录；promo_review_fresh最终编码报告仍未出现，不冒称独立通过。其它A02、苏浙牌/字体/柜花纹待办按下方。0亮度/静音/caffeinate75604/4173保持；代理tab21/22/23/24已关。私有同步以Git为准。

---

# v0.129 最新：南园一至三舍朝向／侧牌（2026-10-11）

- 已完成同朝向要求：plan-90/94/101统一选择与二舍一致的南侧长立面，各自原墙角／轮廓／层数保持；一、三舍门厅及碰撞从北侧移到南侧，侧牌移到二舍同一西侧墙。不是把楼体旋转到完全相同角度。原侧牌并非缺模型，而是此前选到了另一面。三舍入口原照与gl-1-06/24已实看；精确安装高度／尺寸仍近似。
- 发现入口记录会连带重算三舍车棚，已在dormitory-amenities保留原北侧定位依据，避免自动搬移。最初迁棚图留在`/tmp/gulou-nanyuan-v129/initial-with-relocated-shelter`，不是最终验收。最终三舍车棚[-13.3159344,489.4805298]，与原北侧依据一致；离线4车棚／20车的布局、几何、实体逐项相同。
- 3栋各18物理／18相机代理不增减；新门洞／旧侧封闭射线、45台阶坡道支持、1,311映射道路无占用采样、18双向步行及6对照(二舍、南5/6/4、陶3、南8)过。全Game额外同尺寸胶囊再走18条阶／两侧坡道往返全过，三栋最终入口／侧牌6机位已看，0页面error；此项是全场碰撞验证，不重做键盘步骑飞验收。
- `.tools/v129-nanyuan/{fixture,check,amenities-check}.mjs`及`/tmp/gulou-nanyuan-v129/{before,after,check,amenities-check,production}.json`为准确证据；类型/lint/build/58资产通过，README统计随版本刷新。恢复`docs/validation/nanyuan-fronts-v129/?validation=1`，只读当前源定点验证；勿运行旧全套宿舍before对照脚本覆盖旧基线。
- 生产v129仅ordinary-buildings.ts、dormitory-amenities.ts与版本／文档／统计；此前.tools/v129仰角试验仍未采用，不混淆为此版本内容。cut6c仍最新且不重录。A02、苏浙捐建牌和其它字体审计待办保持；独立代理最终编码范围未回不冒称通过。0亮度/静音/caffeinate75604/4173保持，tab20已关闭。

---

# 最新：仰角换排候选未采用（2026-10-11）

- 生产仍2857410/v128，未改源码、未重录cut6c。普通渲染机位固定朝向升降641采样，90次屏内0°→45°图集换排；c9/i5相机高22.020m、升高.125m触发2→6。同after相机／矩阵／光照只还原该树两个水平图集索引，44,489像素变化，还原零差；原生图确认下冠突然扩展。`/tmp/gulou-canopy-elevation-v128/{atlas-isolation.json,README.md}`。
- 局部16°仰角混合候选保留水平过渡，交叉处最多4采样，5视图／带外原索引／67.5°顶视不变。73组A/C/A零差，9宽+17窄步长每分支实看、candidate原生7/8及日夜雨图，冠形跳换缓解；细叶时间变化仍有，不能称全部解决。5040工厂机位矩阵相同、缓存保持。
- **未采用**：首8ABBA GPU.99010／CPU1.01819且波动大；第二轮无截图下载／本地分析干扰，GPU.99573／CPU1.49261，5/8周期C更慢、3更快。无稳定无退化证据，不能称提速或直接声称生产FPS降49%。局部对照通过同一proxy切换未入场景的两工厂缓冲，基线是原v128属性／循环；后续若重开须有新的计时归因，勿盲扫参数。`paired-repeat.json`和`summary-repeat.json`为第二轮。
- 恢复页`docs/validation/canopy-elevation-blend-v128/?validation=1`；原诊断`canopy-elevation-v128/?validation=1`，v128限定。`.tools/v129/prepare-elevation.py`为旧v128源准备，未来源变化勿重跑；实际未发布v129。PNG最初200k字符串截断已分150k段重存，最终3原图完整解码；以最终文件为准。tab17/18/19已关，0亮度/静音保持。
- promo_review_fresh连接中断，已复用只要求保存已看范围，不新增审片工作；encoded-agent-review.md仍待真实回报，不冒称独立通过。继续其它有新证据的A02诊断或已有照片建筑待办，cut6c同下。

---

# 最新：雨镜补正 cut6c（2026-10-11）

- 最新成片`.local-media/promotion/v128-cut6-rain/gulou-cut6c-63.5s.mp4`，28镜63.5秒1080p30，旧cut6b及各版保留。只将雨镜1695–1784共90帧用当前2857410/v128场景补录，同from[4,4,231]→[8,4.5,233]、look[-1.5,7,257]、FOV58/near1/hour14；左上旧灰白大片叶面已消失。
- root实看全部90帧编码左上树叶裁片、编码0/45/89全景及原生最大变化10/11、70/71；预览0/45/89只是低分辨率缩图，不冒称原生。完整1905帧视音频解码通过，1815非雨镜解码帧MD5逐项相同、音频编码包SHA256相同，雨声/音乐保持，听感未验。证据`/tmp/gulou-cut6-rain-refresh/{README.md,final-review.json,encoding-report.json}`；成片SHA256 `5deb72cc743a7ef6b7918d9ec20e5f023f154074ced7898b71c52759f486fb1a`。
- master `docs/validation/promotion-cut6-20261011/shotlist.json`保留28selected/approved及所有机位，更新输出来源，雨镜改为reuseFromMovie指向cut6c56.5秒，避免再次复用旧灰叶素材。local recorder过滤两种reuse、补录按钮清除两种字段；语法检查过。临时单镜选择未覆盖master。这些录制文件不提交。
- 原片`/Users/zackaria/Downloads/gulou-cut6-3s.ivf`，manifest `gulou-cut6-review (4).json`。恢复脚本`/tmp/gulou-cut6-rain-refresh/assemble-rain.py RAW MANIFEST`拒绝覆盖现有片，已完成不要直接重跑；后续明确单镜修改另存输出，保留旧片及音轨。IAB6 tab16已关，0亮度/静音/caffeinate75604/4173保持。
- promo_review_fresh仍无encoded-agent-review.md，仅发送本次结果请保存已看范围，未再中断或新开代理。独立最终审片不冒称通过。生产未变，A02继续水平过渡以外的22.5°仰角换排、67.5°顶视切换、其余远楼闪烁与整体卡顿；高空浓雨雾远树白轮廓另待定位。下方“优先补雨镜”已完成，不重录全片。

---

# v0.128 树冠相邻视图平滑（2026-10-11）

- 已采用水平图集切换16°平滑，先按alpha加权混色再走既有多采样覆盖/深度写入；只在过渡带双采样，带外原视图。没有锁植被或改几何/碰撞/LOD/裁剪/分辨率。22.5°仰角换排和67.5°顶视方向切换仍待，不称全部闪烁修复。
- 73组同页A/C/A还原零差。最终计时修正了A分支额外属性上传，恢复原更新循环/属性；8ABBA/256GPU/0disjoint，GPU周期比.99908、CPU1.0069，更新约.1ms精度不足，无稳定提速结论。初轮53组与首轮完整但冗余属性baseline只留作历史，主证据`/tmp/gulou-canopy-blend-v127/corrected-*.json`。
- 9宽步长+17窄步长每分支实看；旧单步冠形跳换变为连续变化，局部相邻RGB均差峰值21.57→13.76，仅辅助该缺陷定位。生产73材质/17帧实看，与候选树裁片零差；5/9帧图集2880机位矩阵全同、静止缓存不变、候选/生产属性相同。types/lint/build/58资产过，README统计已刷；详情README在上述tmp目录。IAB6 tabs13/14/15关。
- **下一步优先补雨镜检查**：cut6b58秒左上仍有灰色大片叶面，`/tmp/gulou-canopy-blend-v127/film-rain-58.jpg`已看；雨镜复用cut4/5旧素材，未包含v127树修复。用当前源先预览同镜，必要时仅补3秒，其他27镜，不重录全片。现cut6b仍最新，未产生新片/未改计划，音轨保持，听感未验。
- 另新实看发现普通游戏高空浓雨雾远树白轮廓在A/C两者都有，属于既有问题，未归因/未修复；与影片近处灰叶不同。A02继续。promo_review_fresh仍未交最终encoded报告，本轮只发送定点新证据未中断。
- `.tools/v128/prepare-canopy-blend.py`勿直接重跑，会从已改源码再次制作候选；本地候选页已保留v127快照，门禁package0.128。生产恢复`docs/validation/canopy-blend-production-v128/?validation=1`。普通源码仅canopy-cover.ts+版本；私有提交/同步以Git为准。0亮度、静音、caffeinate75604/4173保持。

---

# v127 最新：独立全屏与树冠图集定位（2026-10-11）

- Safari独立浏览器已实测网页全屏：HUD进入、恢复W行走、浏览器退出后暂停提示、设置内全屏进入/退出及继续均过，截图/AX在`/tmp/gulou-safari-fullscreen-v127/README.md`。不是绿钮窗口全屏。Escape合成按键受指针锁影响，单独Esc退出尚未验；不要据此前无效AX点击称全屏失败。Safari游戏标签与测试窗口已关；后出现空起始窗未再动，用户Chrome未动，0亮度/静音保持。
- A02新增可归因证据：普通飞行渲染机位40m横移/161采样发现33次屏内树冠图集跳换。最大事件7→4，固定after相机/矩阵/光照只改一个实例图集，30,928像素变化，还原零差；原生同裁片看清冠形突变。`/tmp/gulou-canopy-atlas-v127/README.md`。只定位树冠切换，不是楼体深度/全场卡顿结论，未改生产。诊断用相机作植被观察点，不冒称真实完整飞行测试。
- 下一步可针对相邻图集连续过渡验证；67.5°顶视up向量切换另查。不得把影片锁植被搬到普通游戏；需过渡图与同条件CPU/GPU证据再采用。IAB6 tab12已关；JSON正常下载，PNG downloadMedia超时后直接保存DOM data链接，未重复场景。guarded恢复页`docs/validation/canopy-atlas-v127/?validation=1`，v127限定。
- 生产仍7174186/v127，cut6b未重录。promo_review_fresh本轮仅催收已有编码结论未再中断，仍无encoded-agent-review.md；独立最终审片不记通过。旧静态矩阵等拒绝候选见下，不重试。

---

# 最新追加：v127 静态矩阵候选不采用（2026-10-11）

- 1869个spatialCell网格在摆放完成后复用local matrix，保留父组/world更新。A/C/A零像素差；8ABBA/0disjoint，CPU周期比中位.9892但.9485–1.0597双向变化，GPU.9972，没有稳定收益，未改生产、不继续扫参。`/tmp/gulou-static-matrix-v127/README.md`。
- 初次identity断言查出19个已变换网格（东大楼15、喷泉小蓝鲸4）；不能在Builder.finish创建时直接冻结，否则会漏后续摆放。只是本候选范围诊断，不是新生产缺陷。IAB6 tab11已关，0亮度和静音保持。cut6b与A02状态同下，独立代理回报仍待。

---

# 第六版泳馆单镜修正 cut6b（2026-10-11）

- 最新成片 `.local-media/promotion/v127-cut6-motion/gulou-cut6b-63.5s.mp4`；原cut6及旧五版均保留。仍28镜63.5s1080p30，只补泳馆2秒60帧；生产源码仍7174186/v127。
- 泳馆前树不动，相机改from[-143,5,-56]、to[-141.5,5.2,-55]、target[-110,6,-73]/FOV59，利用视差露出题字，主体仍为正立面。candidate1/2仍遮字未采用；candidate3原生首末与36/37、44/45最大变化已看，编码0/30/59全景和全部60题字裁片已看，末字不再藏在冠后。
- 完整1905帧视音频解码过；除了1200–1259，其余1845解码帧MD5逐帧相同，音频编码包SHA256相同，保留原雨声及音乐，听感未验。证据 `/tmp/gulou-cut6-pool-reframe/{README.md,final-review.json,encoding-report.json}`。
- 原生补片Downloads/gulou-cut6-2s.ivf；assemble-pool.py拒覆盖已有输出，改单镜时另目录组合，不重录全套。master shotlist已同步pool机位，仍28镜approved；临时录制时取消7镜选择未写回。
- promo_review_fresh长期未交编码报告，已中断并复用原代理要求基于已看内容收束；先取encoded-agent-review.md实际结论，不假称独立通过。A02和其它待办同下。IAB6 tab10已关，0亮度/静音及caffeinate75604保持。

---

# v127 与第六版（2026-10-11）

- **保持0亮度和静音**。已按明确授权将0.0625设0，6秒1080p30导出／解码180帧及首末图通过。第六版后续645原始帧及1905帧合成解码也在0亮度完成；不要唤屏。caffeinate -di PID75604继续；不重复启动、不操作用户Chrome。零亮度证据 `/tmp/gulou-zero-brightness-20261011/README.md`；只有失败才恢复0.0625。
- v127源码 **7174186 已私有同步**：树冠alphaToCoverage/depthWrite替代半透明重影，alphaTest.28/color1.1；far-only树近处仍保留覆盖冠，near模型原35–52m渐变保持。礼堂门前、西南长阶误种树按实景清除，其他随机序列不变；餐厅蓝墙重叠面修复（核心26.6→26.44、删2包裹石边）。
- **礼堂右路已实证几何问题并修复**：西南坡角不同三角化使草地在116/2782采样点穿道路、最深5.4cm；局部.4m细分后交叉0，名义高度场不改，最大误差.249m→.0033m。76地表只2处细分，坡角外三角形／边界保持；跨坡长直路缘改贴原高度场。并未关屋檐阴影，锯齿投影与真实地表缺口已区分。`/tmp/gulou-foliage-v126/README-v127.md`。
- 验证：有效树冠A/C/A恢复0差、8ABBA/0disjoint，GPU比.998355、CPU1.05915双向波动；**无稳定提速结论，A02不关闭**。先前pair-invalid-cold仅历史名字，不能认定原因是冷shader。近树日／夜／真实推进雨天图片已看（JSON weather字段为空不作证明）；餐厅72地面／10射线／16步骑路线／2上下车过。types/lint/build/58assets及地形对照过。未降画质/裁剪/分辨率。
- **第六版已编码待最终独立细节复核**：`.local-media/promotion/v127-cut6-motion/gulou-cut6-63.5s.mp4`，28镜63.5s1080p30／1905帧完整解码。仅补8镜645帧、复用20镜；旧五版留存。3教学后图书馆、删除东南楼／西南楼镜头；黄昏→夜晚→第三人称飞行→雨，中山／拉贝最后。飞行人物约29.9→25.4m，从教学楼斜向北大楼，maxCameraDelta2.24e-5m。柜题名“汉口路外卖柜（南教学楼对面）”。泳馆正面向右微移、陶园入口和屋顶更完整。
- 8镜review2、礼堂坡面/陶园/泳馆review3连续预览与编码首中末已看；飞行0–89根、90–194fresh agent连续联系表已看；不能据小联系表保证细叶/窗线完全无闪。`/tmp/gulou-cut6-20261011/{recording-manifest,encoding-report,timeline}.json`。原片Downloads/gulou-cut6-21.5s.ivf，录制计划已同步28approved。`assemble.py`拒覆盖现有片；若仅替换一镜先保留现有成片再另目录组装，勿重跑prepare-cut6.py覆写机位。
- 音轨已按63.5s适配128BPM，56.5–59.5秒混入现有公共领域rain-field.wav，最终音乐雨段平滑压到.55、雨增益1.8，峰值27578/32767、无削波；**听感未验**。较详细发布用小红书草稿 `.local-media/promotion/v127-cut6-motion/xhs-draft.md`（公开措辞用于未来发布，目前仓库仍私有、未部署）。
- 只复用 `/root/promo_review_fresh`，已完成两轮静态反馈，编码后复核进行中；旧promo_review已中断，不新开重复代理。新证据/结论以encoded-agent-review.md为准。
- 本地4173/PID5451复用。CUA IAB6 tab9代理录制页已关闭；current browser inventory为准，不动Chrome。README统计已刷新，作者指定noreply；版本提交与私有同步以Git为准（生产7174186已推；匿名API404且认证Git可达）。禁止公开/部署/Pages，原参考、音乐、录制验证脚本及缓存不提交。A02其它远楼/整体卡顿、南1/2/3门朝向侧牌、苏浙捐建牌、其它字体审计与独立全屏仍待；手机留用户后续自验。已拒logdepth/排序/20m拆批不重复。

---

# v126 后续诊断：树模型拆批不采用（2026-10-11）

- 60m树模型批次细分20m裁剪格：相同实例/材质/几何与A/C/A像素不变，主画面三角形4154145→3826963，但draw1393→1673。8ABBA GPU周期比.99015仅约1%收益，CPU1.09676且8周期均更慢，因此未采用。两分支含隐藏对方mesh，CPU比例不是生产成本预测；新拆批整体还会多721节点，无足够收益，不继续扫参。证据/tmp/gulou-tree-cells-v126/README.md，tab5已关闭；生产仍a7283ba/v126。
- 苏浙门左捐建牌两实景已复看，文字/双徽与靠门关系明确，现有西门围栏线与看台后墙位置仍需官方VR/地图核准，未猜落点、未改场景。原待办继续，promo_review无新回报。下方v126已验方案不重做。

---

# 最新短交接：v0.126 树冠冗余背面绘制消除（2026-10-11）

- 生产仅canopy-cover.ts的相机朝向平面树冠加forceSinglePass:true，保留DoubleSide、渐隐/透明度、几何、LOD、阴影和裁剪。主画面1451→1393draw（少58次无可见表面的背面提交），提交三角形4154569→4154145，未删模型面。
- 同renderer冻结1080p/.07..1200，两轮各8ABBA/256GPU/0disjoint，CPU周期比中位.8762/.8889，第二轮约7.6–8ms→6.75–7.3ms，16周期均改善。GPU1.0016/1.0014，无明显GPU收益；只称渲染提交CPU下降约11%，不称全游戏FPS提高，A02仍开放。首轮取图有重叠，第二轮无浏览器操作为主证据。
- A/C/A及修正后的21机位RGB差全0；16小位移飞行与两处无遮挡近地树冠实看。第3近地43机位有廊遮挡，雨状态未推进不算雨天视觉验收。旧比较画布未clearRect造成叠色的multi-view-invalid-compositing.json作废；以multi-view.json为准。生产73树冠材质断言及A/C/A零差、实际生产图已看，types/lint/build/58assets过。证据/tmp/gulou-canopy-pass-v125/README.md和v126；恢复docs/validation/canopy-pass-v126/?validation=1。tab4已关，用户Chrome未动。
- 新阶段诊断/tmp/gulou-render-passes-v125：Three renderer.info在阴影后重置，旧1451/4154569是主画面而非全pass；物理全pass2423draw/7413844tris。透明DoubleSide两遍解释回调差94draw/2104tris，已精确对账。4周期总GPU17.72–17.89ms，阴影4.32–4.40ms约24.4%，仅冻结本视角归因，不解释40→14FPS漂移。树叶/屋脊几何量大不是其GPU成本已证。
- 第五片61秒已交不重录，promo_review仍未回报，已再要求保存已有实看范围；南园1/2/3朝向侧牌、苏浙捐建牌、其它字体审计及独立全屏仍待。手机后续用户自验。README/主页/隐私/作者/排除项保持，下方旧待办以最新已完成项覆盖。4173/PID5451、caffeinate75604复用。Git提交/私有同步以实际Git为准。

---

# 最新短交接：v0.125 普通远窗深度杂斑缓解（2026-10-11）

- 生产v125，仅ordinary-buildings.ts的窗衬-1/三玻璃-2固定depth units，factor0。不动几何碰撞/近裁剪/清晰度。候选原同名匹配13（含门/透明地标），现按factory父组和材质特性精确选四不透明材质，避免误伤。v124未跑成的generic probe已由本轮完成，不再从旧失败开始。
- 相同冻结1080p/.07..1200视角A/C/A恢复零差；16同横移帧/分支实看远窗更规整、杂斑减少。三实际玻璃面8m/.65m在近景细节开启后实看，共12原生图；以/tmp/gulou-window-bias-v124/near-visible为准。首轮圆整像素未命中已改真实三角中心；旧未切近细节图不作最终近景验收。
- 8ABBA周期256GPU/0disjoint、1451draw/4154569tris一致；GPU C/A中位.9973897，CPU中位.996667双向波动，无稳定提速，限定局部无回归。普通性能A02及其它层面闪烁仍开放。
- 生产图四材质字段断言过、A/C/A零差，生产C与已验candidate远窗crop零差；types/lint/build/58assets通过。证据/tmp/gulou-window-bias-v124/README.md及/tmp/gulou-window-bias-v125，恢复页面docs/validation/window-bias-v125/index.html?validation=1，只用代理页；tab2/3均关，用户Chrome未动。主树提交/私有同步以Git为准。
- 第五版61秒已交且不重录，主页17c219a仅本地，原片/听感/后续待办同下。复用4173/PID5451与caffeinate75604。禁止公开/部署/Pages，作者/排除项/赞赏末尾同下。

---

# 最新短交接：v0.124 与第五版宣传片完成（2026-10-11）

主树main，生产v0.124.0，提交/私有同步以Git为准。复用4173/PID5451；caffeinate -di PID75604仍有效。不得操作用户Chrome、公开/部署游戏或启用Pages。作者仍指定noreply；赞赏末尾。

- 第五版已交：`.local-media/promotion/v124-cut5-motion/gulou-cut5-61s.mp4`，29镜61s/1830帧1080p30。只补录11镜690帧，复用18已审cut4片段。旧四版保留。顺序熟悉地标→教学文化→宿舍/餐厅/生活→体育→小蓝鲸→夜晚→高空第三人称飞行→雨天。删除逸夫馆/管理科学楼/赛珍珠，加入大礼堂、东西南楼、南8/陶3、南大记忆、新址柜；泳馆机位右移。飞行人物/滑翔翼可见，角色约175–178m俯瞰大半校园；near4仅影片策略。普通A02未关，听感未验。
- 实看11新镜首轮690帧输出联系表，6镜迭代390帧与大礼堂最后60帧；飞90帧全联系表及最大变化58/59已看。编码后11新镜首/中/尾33张已看，完整1830帧视音频解码通过。maxCameraDelta=0.0000225m，无error/2既有warn。证据`/tmp/gulou-cut5-20261010/{encoding-report,recording-manifest,final-review,timeline}.json`，review1/2/3与encoded-new-0..5.jpg。独立promo_review本轮尚未回报，不冒称独立cut5审完，勿新开重复agent。
- 录制页曾无原片恢复成初始状态，原因未定；从Downloads/gulou-cut5-review.json恢复29/29已审计划，成功只补录11镜，raw为Downloads/gulou-cut5-23s.ivf，最终记录Downloads/gulou-cut5-review (1).json。tab72已关。新CUA inventory IAB6，主页验证tab1已关；不要硬套旧IAB3。已成片不重录整套。
- 重编码恢复：runtime Python `/tmp/gulou-cut5-20261010/assemble.py RAW`；目前segments及成片已存在，脚本会拒绝覆盖，先基于timeline修改单段或新输出目录。初始`.tools/v124/prepare-cut5.py`勿再跑，会覆盖人工机位。最终本地计划`docs/validation/promotion-cut5-20261010/shotlist.json`已29/29approved。
- v124生产：教学楼4条幅按近照收窄/改字距，白幅徽/中文轮廓、黄幅/紫色新提取重建，Latin与Hi位置校正；泳馆竖排金字按官方VR轮廓替代系统字（斜拍小图仍近似、小署名未读）；删除教育超市下方自拟广告。photo-signs.{ts,json}为派生轮廓必要资产，不含原照。3建筑物理/相机/门逐字节相等（26/12/6碰撞），教学10通行、生活18通行/5射线/6公共路过；types/lint/build/58资产通过。`/tmp/gulou-lettering-v124/`与`.tools/v124/geometry-check.mjs`。不要跑旧sports-halls-check（使用shell Playwright）。
- README按发布快照两处写11天（Astra段和开发投入时间与迭代行），删单独起止日期段及标题·Gulou，加未来游戏链接。metrics脚本已同步不恢复旧自动天数。宣传词已给，包含网站/仓库、千余图像资料、11天与GPT6Astra。
- 个人主页另仓库`/Users/zackaria/Desktop/github io/wang-jiahao.github.io`：原已含Sponsor，此轮加Gulou外链导航、Education后简短介绍、2026.10 News。桌面1280与窄屏390无横溢出，图全加载；桌面新段实看。本地Liquid真实模板预览，完整Jekyll插件构建未跑。证据/tmp/gulou-homepage-v124/{top,project}.png。独立本地提交；尚未推送/发布，随用户发布时同步。预览恢复：GEM_HOME=/tmp/gulou-homepage-preview-gems GEM_PATH=同路径 ruby .tools/v124/homepage-preview.rb；复用4173的docs/validation/homepage-v124/。原有Sponsor不重复添加。
- v123汉口新址[-36.91375,376.30525]朝北；南教学楼对面、中山东/南18/19前，2白柜166格已验；连续花纹/小标仍待。v122棚/碰撞已删，别恢复旧门口位置。错误实验面板已从用户Chrome撤下，验证页默认门禁。
- A02继续普通飞行闪烁/性能：v119细部淡变、v120中山共面、v121费/唐5材质偏移已验不重做。logdepth2.235倍GPU、depth-first排序CPU2.175倍、program-firstGPU1.0144/CPU.9967均拒绝，不重复。generic window候选baseline假设不符未比较。下步要新证据，同条件稳定收益才采用，不降体验、不归咎锁屏。
- 仍待南园1/2/3共同门朝向/侧牌、苏浙门左捐建牌、其它已传照片字形审计、独立浏览器全屏；手机留用户未来网页自验。旧人物/65故事/148目录/道路/屋顶/主要UI/持续步骑飞验收不重复。参考已有，不猜坐标尺度，不封公共路。

---

# 最新短交接：v0.123 柜体与文档完成，cut5继续（2026-10-10）

主树main，v0.123.0；提交／私有同步以Git为准。复用4173/PID5451、caffeinate -di PID75604；不打断用户Chrome。作者与隐私授权同下，赞赏末尾。

- 柜体新址中心[-36.91375,376.30525]朝北，南教学楼对面、中山楼东侧、南18/19前；2白柜12×7共166格，屏幕跳号。小字与连续花纹未还原。源postal-takeaway.ts，原始图references/user-review-20261010/hankou-lockers-location-game.png。旧址/新址8射线、18通行/5射线/6路扫掠过；新址图/tmp/gulou-hankou-v123/street-correct.png，detail.png；错误机位street.png勿用。测试页docs/validation/hankou-lockers-v123/?validation=1；tab71已关。
- README改为开发投入、展开置于参考前，4行工作量+分项费用；开头自动从usage.from按北京时间计算开发天数（当前10天）。更新脚本同步。
- 用户Chrome曾误留program-sort-v122实验页，现已正常根入口。近期4实验页和新柜页默认重定向/，需?validation=1才能进入测试；不要把用户页当作验证页。
- A02 program-first排序候选已拒：8周期GPU比1.0144，CPU .9967无稳定收益，/tmp/gulou-program-sort-v122/README.md。generic window bias局部准备失败baseline假设不符，未采用。
- 最新cut5要求：删逸夫馆换大礼堂；删逸夫管理科学楼换南园八舍/陶园三舍，宿舍与餐厅顺序对调；加入东南楼、西南楼、南大记忆、外卖柜；泳馆机位右移并对齐吕志和游泳馆字形；教学楼4横幅特别白色第2幅按新照对齐；教超下方南大教超广告删除。夜晚→高空第三人称飞行→雨天结尾，人物可见、熟悉校园大范围俯瞰，实看连续帧再称无明显闪烁。用户接受熟悉地标→教学文化→校园生活→环境体验的顺序。第四版保留，第五版未完成。
- 新照已存references/user-review-20261010/teaching-banners-{close,front}-20261010.png。promo_review已复用接新机位建议，不新开agent。src/world/education-store.ts有去广告改动，未并入柜体版本，下一轮需视觉验证。

---

# 最新短交接：v0.122 汉口拆棚与A02续查（2026-10-10）

主树 `/Users/zackaria/Desktop/gulou campus`，main；生产v0.122.0；本轮提交/私有同步状态以Git为准，v120底座47854eb已同步。复用4173/PID5451，不启动第二服务，不操作或关闭用户Chrome。作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。私有源码/必要资产同步已授权；未授权公开、部署或Pages。README赞赏绝对末尾。

## v122新增，接续先看

- 汉口两处旧外卖棚屋面/钢梁/斜撑已删除，连同2个碰撞及2个相机代理；柜体与围墙其余7材质几何、6保留代理完全一致。只完成拆棚，白色新柜外观/编号/花纹及位置仍待；南园餐厅蓝棚不动。
- 真实工厂几何/物理/相机对照和两处屋面射线过，生活设施17通行/5射线/6公共路过，types/lint/build/58资产过。主Game高1920×1080before/after实看，0error；`/tmp/gulou-canopy-removal-v122/{geometry.json,before.png,after.png,before-after.jpg}`。局部工具`.tools/v122/canopy-check.mjs`（需原before副本）与`docs/validation/canopy-removal-v122/index.html`；CUA tab68已关。downloadMedia超时后已用DOM生成的data链接分150k读取保存，未重跑场景。
- 不透明近到远排序新试验已拒绝：相同冻结飞行场景8周期ABBA/256帧，GPU17.46→17.17ms、周期比中位.984；CPU7.5→13.9ms、周期比中位2.175，program切换432→996。透明排序未变，A/B/A回A零差；A/B仍有微小未分类图差。小GPU收益不能抵消CPU开销，不采用，也不再跑地面计时。`/tmp/gulou-opaque-sort-v121/README.md`。
- 实景待办探索未算完成：南1/3现north、南2south，二舍西侧牌实景已看，但最终共同朝向尚未确认；勿凭多数朝向猜。照片/VR缩图在/tmp/gulou-nanyuan-alignment-v121。汉口新图上半部为12列7行白柜，第二列第2格屏幕，编号/线画未实现；下两处不是本次任务，不能照搬。/tmp/hankou-locker-top.jpg。
- 苏浙牌照片已看，浅框红石/金字/双徽，确切三行已记录。`.tools/v122/trace-suzhe.py`及`/tmp/gulou-suzhe-plaque-v121/lettering.json`仅未采用提取实验，校徽细线遗漏，不能合入。rectified.jpg可参考；仍需核准门/台与左右墙关系再落位，不猜绝对尺寸。无苏浙生产改动。

## v121新增，接续先看

- 费楼窗衬-1/玻璃-2；唐楼石材表层-1/窗衬-1/玻璃-2的固定polygonOffsetUnits，factor0，共5材质。只改材质字段，不改几何/碰撞/裁剪或分辨率。16相同横移帧/分支实看减少远景杂斑；并非全楼、全校园闪烁已清除。
- 候选/tmp/gulou-depth-bias-v120：A/C/A还原零像素差；near-correct/才是有效的8m/.65m实际玻璃/石材面近墙对照，旧根目录near图曾误选混合mesh中的普通面，不引用旧图。配对8周期256GPU样本0disjoint，C/A中位0.995（0.959..1.074）；相同1451draw/4154569tris。未证明提速，限定冻结渲染回归。
- 生产验证/tmp/gulou-depth-bias-v121：实看生产16帧联系表和费楼原生前后，两处远立面crop与已验候选逐像素相同；页面docs/validation/depth-bias-v121/index.html断言真实5材质字段，以局部还原v120为A、实际生产为C。局部v120候选页已门禁，勿对当前源码重复套候选。types/lint/build/58资产通过，日志/tmp/gulou-v121-*。
- 对数深度新试验已修独立等价PMREM和冻结场景，A/B/A回归及shader原样对照全0像素差。8配对周期GPU耗时2.08..2.36倍，中位2.235，明确拒绝生产采用。证据/tmp/gulou-depth-equal-v120/README.md；不重试旧无效logdepth，不忽略新成本证据。首次自定义sky缺common chunk已在本地probe修正，无生产shader改动。
- A02仍首要：其它普通窗/远楼纹理或叠层、全场卡顿未关。长块40→14FPS漂移在冻结render-only同负载也出现；单次swap3.52GB观察不足以归因。下一轮应基于新的分层证据推进，避免再跑同样长块漂移A/B。

## 当前成片与本版结果

- 第四版已输出 `.local-media/promotion/v120-cut4-motion/gulou-cut4-51s.mp4`：24镜51秒、1920×1080、30fps、1530帧、130324922bytes。原始 `~/Downloads/gulou-cut4-51s.ivf`；三旧版均保留。简单地名、去赛珍珠、无首尾卡；保留原认可机位，改逸夫馆/教超/拉贝，费楼留顶，追加仅飞行/夜晚/雨天。
- 修改9镜630帧1080p连续预览，飞行90帧联系表实看；夜景曝光2.2另90帧、中山平台修正后60帧复验。正式录制24镜cameraDelta全0，0error/2旧弃用warn。完整1530帧视音频解码通过；根已看全部24编码中帧及15保留镜的首尾，另核原生费楼裁片及夜景编码亮度，final-review.json已记为可交审看。promo_review已完成9镜原生构图/闪烁重点与飞90帧审片，9重点编码后补看仍可继续，但不阻塞本片交付。
- 权威证据 `/tmp/gulou-cut4-20261010/`：encoding-report.json、recording-manifest.json、review-final/、encoded-frames/（72张800×450关键帧）、encoded-preserved-0..4.jpg、promo-review-agent.md。忽略的计划/录制器在 `docs/validation/promotion-cut4-20261010/`。此轮用户明确允许先录；不能恢复旧A02禁录门禁。不要重跑全片；需调整时先改单镜。
- 拍摄near1提高主深度精度；夜景曝光×2.2、开场植被朝向保持均仅录制页策略。不是普通游戏性能修复。新音乐仍为128BPM，51秒结尾保留主和弦攻击，仅拉长尾音并淡出；无削波、末采样归零，模型听感未验。`finish.py`已执行成功，默认不覆盖现有成片，重编码要另存路径。
- 逸夫馆题字已按官方VR金字重建“逸夫館”轮廓、孔洞、字距和比例；根与子agent均看实际题字crop和生产原生图。照片轮廓及3.55m宽为近似。`src/world/yifu-hall-facade.ts`、building-lettering.json；原图/提取工具不提交。
- 中山楼平台底座和盖板原顶面同为1.22m，引起58→59帧灰白斑块。现仅底座可视顶止于1.11m盖板底；原31碰撞mesh/门/建筑记录逐字节一致，652box仅1可视尺寸变化。实际同frame59前后和子agent复核均确认斑块消失：review-final/zhongshan-fix-before-after.jpg。工厂几何对照zhongshan-geometry.json，恢复测试runtime Node --experimental-strip-types .tools/v120/zhongshan-check.mjs。types/lint/build/58资产通过，日志/tmp/gulou-v120-final-*。
- README表按最新要求合并为版本与提交、代码与工具、参考资料，删除场景与轮廓行；生成脚本已改，版本统计已刷新。建筑状态文档同步逸夫馆实际范围。字体与平台生产修正不代表全校字体审计完成。

## 继续优先项

1. A02普通游戏飞行闪烁与性能仍最优先。v119的100m细部组0.4游戏秒淡变已过，不重做。剩余远立面毫米级深度干涉已证实（不代表所有根因）：`/tmp/gulou-flight-depth-v119/README.md`。普通北向326帧冻结对照：受检远立面关接收阴影零像素差；near变化改变斑纹；费玻璃/衬层4.9mm，唐楼2.8mm，24bit主深度。
2. 旧双renderer logdepth试验无效：候选没有独立等价PMREM且场景漂移。后续v121接续试验已修独立PMREM/冻结，并因稳定约2.235倍GPU代价拒绝采用，详见顶部；不重跑。reverse depth受CSMFrustum[-1,1]假设约束，不能盲开。普通窗polygonOffset没解决特殊费/唐，未采用。FOV收敛324次CSM刷新126.4ms不是已证主瓶颈。性能改动需同条件稳定收益，不降体验，不循环已拒方案。
3. 亮屏IAB旧36.5→16.2FPS仍复现卡顿；Chrome约29.5但少1draw/126664tris，不是严格同负载对照。不要归咎锁屏。用户现明确允许强制不熄屏，`caffeinate -di` PID75604有效；不重复启动，明确停工/恢复时kill此PID即可，没有修改持久设置。
4. 南园一/二/三门口同朝向与侧牌；plan90/94/101原nearest-road导致朝向不一致，1/3牌已有可能在错面，不能重复添。
5. 只做汉口新外卖柜；旧棚及碰撞已于v122删除；新柜外观/位置仍待。苏浙门左浅墙捐建牌：南京大学苏浙运动场 / 2002.5.20 / 香港苏浙同乡会捐建。已有 `references/user-review-20261010/`，不重复索要，实际看图/VR/地图，不猜坐标尺寸、不封公共路。
6. 其它照片字体审计待；教超/南大记忆v118、逸夫馆v120已做本轮修正。费彝民、田家炳、校医院等按现有资料审；范围见docs/building-status.md。独立浏览器全屏未验；手机明确留后续用户网页自验，不阻塞、不假称通过。

## 已完成，不重复

- v118教超/南大記憶字形排布、教学楼四迎新条幅/2026框、戴安邦新肖像、主页人像图标、设置顶部返回开始页及原位继续已过。肖像保留水印/许可未确认，来源文档如实记录。
- 人物本轮、65故事、屋顶落地、三公共路、148到达/HUD、主要UI及持续步骑飞验收范围已过。旧详证在progress.md历史和/tmp/gulou-v117-evidence/。不会用本片替代普通游戏验收。
- 贡献者历史已获明确批准并执行，142个原tree/消息/日期保持，正确noreply统一；备份`.tools/contributor-identity-20261010/`。之后9bce67e已私有同步；不再问授权、不强推旧候选、不把旧agent分支旧根合并回来。GitHub Contributors待缓存刷新，不保证已刷新。
- 工作量原话在/tmp/gulou-work-metrics-user-matches.json，10-04两次要求已回复。官方Astra Standard价格实读：短上下文每百万输入10/读1/写12.5/输出50USD；请求输入>272000为20/2/25/75，三输入分区互斥、推理包含输出。scripts/work-usage.mjs去重同项目任务日志，metrics默认自动刷新；费用是官方等价估算，不冒充中转账单。当前数值以README为准；明细docs/work-metrics.md。
- README/建筑清单已作者口吻，方法独立docs/building-process.md，状态docs/building-status.md由共建引用。地图 https://zcc.nju.edu.cn/cssy/dzdt/glxqdt/index.html 。GitHub附件可嵌视频（ViMax证据），但私有附件可见性未核，未上传；README仍旧截图，不宣称已完成嵌入。

## 操作

最新明确授权只开一个promo_review独立审片；旧三agent已完成，先查/复用，不新增重复agent。CUA IAB3；tab65完成后已关闭，v121验证tab66已关闭，用户Chrome未动。仅CUA操作浏览器，不用shell Playwright/CDP。

Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`；Python同dependencies/python/bin/python3（有PIL），系统python无PIL；OpenCV在.tools/python。ffmpeg `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`。无npm onPATH，直接Node调tsc/eslint/vite/metrics。PNG媒体downloadMedia偶超时，保留已存图不无故重跑；DOM canvas.toDataURL不可用，录制页已加原生末帧下载按钮。

原参考、个人音乐、Codex缓存、before、本地验证/录制脚本不提交；只显式暂存生产与必要文档。六旧未跟踪scripts（astronomy、dormitory-family、nanyuan-dormitory-entrance、nanyuan-reference-refresh、promotion-capture、promotion-shots）保持不动。每批1–2张约800px，JSON取字段，长日志落盘，重要变化/失败写本短交接。

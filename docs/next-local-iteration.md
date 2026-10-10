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

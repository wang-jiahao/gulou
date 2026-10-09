# 当前断点 2026-10-10：v113整合验收，重要TODO后再录第二版

工作树/提交以git status和git log -1为准。当前准备v0.114六故事/屋顶验收提交。main已提交ed7d9e6，package0.113.0，git push origin main成功（f212af3..ed7d9e6），已同步现有私有仓库；禁止公开/部署/Pages。SSH fetch已过，origin/main f212af3是祖先。About无网页/API凭证，文案在docs/repository-about.md，尚未更新GitHub元数据。

已过：南园17普通门厅专项（255支撑/17门厅/南3往返）、吉祥物前植岛移除与屏幕16海报专项；主游戏南3、吉祥物、电子屏实看console[]，图/tmp/gulou-{nanyuan3-entrance,mascots,screen}113.png。59篇故事，化学楼/南大记忆/一卡通三新增已主UI正文和来源核对，/tmp/gulou-stories113.png。正式男女GLB参考第五轮、袖内衬尖角修复，真实avatar-reference 28扩展动作通过；美术仍未达用户标准。篮球mass0恢复缺陷已修且持球60帧回归过。HTML直接引用CSS修复首帧无样式条件，正常启动页已看，未证实外部URL跳转。局内⛶和返回页已有UI检查。type/lint/build/assets57过（/tmp/gulou-v113-*.log）；仅pnpm-lock，README安装命令已改pnpm frozen lock。

性能：30m树子合批已A/B/B/A后完整撤回，src/world/model-trees.ts无改动、新候选模块已删除。基线140帧/10s，候选145/137，回退163，p95皆83.4ms；不能采用。分类已完成，完整/tmp/gulou-v113-categories.json：原136帧GPU59.7/CPU72.7ms；单遍140/GPU59.7/CPU70.8；恢复原136/GPU59.6/CPU72.8，p95均83.4。禁影与删叶只作诊断，不上线。实际GPU为Apple M4 ANGLE Metal，非软件渲染。屋顶实操已完整通过25检查，报告/tmp/gulou-roof113-result.json；18m屋顶降落安全、走下17.805m只重生1次并恢复镜头/输入/HUD。museum两秒AB实录已通过：opening-frame helper before图集2次切换→stable0，跳变像素MAE35.57→最高4.90；同相机/风/LOD/窗饰/cover和fade无下降，实看起镜完整树冠保留。完整成片/60帧json/PNG在.local-media/promotion/v113-cut2/stability-opening；midpoint旧版本仅对照，不能拿来替代opening。正式录制器尚未接此helper。当前tab46在/docs/validation/shadow-batch-v113/index.html：同姿态主RGB与两shadow packed图A/B/A全部逐像素0差异；A/B/B/A已完：A150frames CPU66.08/GPU59.44，B139 CPU71.06/GPU60.21，B158 CPU62.67/GPU57.53，A134 CPU73.67/GPU59.63，p95皆83.4。无稳定收益，未采用；/tmp/gulou-shadow-batch113.json。activity_dining正准备不透明物体绘制排序候选，仍只/tmp，不降画质。候选714Mesh→38proxy，shadowdraw预估919→581，但tri+9%，必须看GPU再采纳；仅/tmp/gulou-v113-shadow-batch，正式源未改。tab47原生全屏对照表明request resolved且进入true，50ms后宿主自动exit；完全无Game亦复现，日志/tmp/gulou-fullscreen-native113.txt，tab47已关。勿重复当游戏bug。单遍候选/tmp/gulou-v113-tree-audit/canopy-single-pass.patch未应用，画面/GPU待验；不降低体验。

重要未完：人物整体美术、全场流畅度/连续步骑飞、屋顶项已完成；life_facilities已补6篇官方故事到65（只改place-stories.ts）；实际Game六门厅→原生了解/正文来源6/6过，报告/tmp/gulou-six-stories114.json、console[]。signs_stories正在/tmp/gulou-v114-art做整体头脸候选，不动正式public；其余缺资料低优先按remaining-todo可暂缓。第二版未录：1–2秒建筑快剪、北大楼仅I❤️NJU、避免人物/删篮球足球、飞先骑后，新128BPM音轨已生成未试听。30机位候选在.local-media/promotion/v113-cut2，录制稳定候选/tmp/gulou-v113-stability/recorder-stability.patch未应用/未A/B。首版60秒已交但要求返工；docs/media/gulou-preview.mp4仍首版20MB派生片，第二版后替换。

4173 PID5451复用，验证只能CUA浏览器，旧shell Playwright录制器不运行。四旧local scripts保持未跟踪：astronomy-check、dormitory-family-check、promotion-capture、promotion-shots；两新nanyuan-{dormitory-entrance,reference-refresh}-check亦仅本地，依赖外部Canvas与before，恢复命令见/tmp/gulou-v113-private-sync-audit.md。原照片/视频/个人音乐/Codex缓存和before基线均不提交。Node：/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node。恢复先git status、list_agents、浏览器listTabs，勿重复已过项。240000阈值不保证根治413/连接错误。

--- 以下为上次稳定版历史断点 ---

# 最新断点：v0.112功能整合，参考图人物候选未正式替换

主树 /Users/zackaria/Desktop/gulou campus，main，正式版本0.112.0，提交以git log -1为准。仅本地，不推送/发布；目标10月10日下午发布尚有关键欠账。主4173 PID5451复用，验证tab36—39均已关闭、viewport reset。四旧本地scripts仍未跟踪。

## 已过，不重复

- README缩至约216行，70条逐版文字移development-history，参考图/视频独立reference-guide；66链接、赞赏原文/绝对末尾检查过，Star后有赞赏锚点、操作提前。首页/弹窗“请我喝杯下午茶”与指定两段文案正常UI已验。
- 返回开始页→继续，汉口(-91,365)原地保留；桌面/短窗/手机图标间距24/20/24px，均无溢出。全屏API标准/WebKit/拒绝/不支持11组过；内置浏览器未稳定保持全屏，不能说普通浏览器已验。UI图docs/validation/v0.112/ui。
- 北门19格每块一人左像右传，七官方传记/六许可图，戴肖像待补；排列/数量近似不当实测。主场景两面墙、物业连墙和“欢迎2026级新生”屏昼夜实看，console[]。28 Canvas、19面朝向/7材质/碰撞一致/失败回退、原32/12/14与新528/21/44/16检查过。海报文字仍待清晰图。
- 坠落10m：controller11组+game/main清持球/镜头/触屏事件6组过；主校园屋顶飞行落地后走下实操尚未做。
- 汉口固定1280×720 medium晴14点(-91,365)：原稳定125帧GPU p50/95 64.7/65.8、CPU78.4；候选136/138帧GPU p50 59.4/59.5、CPU72.5/70.5；回退127帧GPU64.1/65、CPU77.5。帧p95都约83.6ms，不能称解决卡顿。最终已重新采用零强度灯不可见+0/当前夜灯数双compileAsync预热，5失败/18恢复/环境24模拟日/帧6/类型lint过，正常主加载与夜间已验。精确报告 /tmp/gulou-campus-112/hankou-stages-*.txt，before不覆盖。canopy-single-pass候选尚未测/未采用。

## 下一步：人物与发布前关键欠账

- 最新用户图要求两人：男蓬松中分/深蓝敞开翻领夹克/白T/灰工装/黑包；女薄刘海长卷发/鼠尾草V领/白内搭/浅蓝直筒/米白包。已按图生成独立第四轮候选，正式public GLB仍v111，src/player/avatar.ts正式配色也仍v111，不要误报正式接入。
- 未提交候选源码：scripts/build-student.mjs、character-{skin,eyes,hair,hair-texture}.mjs、新character-reference-outfit.mjs。node scripts/build-student.mjs --preview [--female]写docs/validation/v0.112/reference；默认会写public，验收前勿跑默认。baseline保存v111生成器/GLB，round2-hair也保护。
- 预览 /docs/validation/v0.112/reference/preview.html（独立avatar-reference.ts配色已对图）。第三轮28扩展姿态通过，第四轮隐藏领口露肤并缩短/减细女刘海，已实看女正面、双人持球/背面行走，console[]。背面女左袖有尖褶观感仍需近景确认，整体美术不能只靠技术通过。最终候选六姿态日志/tmp/gulou-reference-poses4.log；生成/tmp/gulou-reference-{male,female}4.log。
- 原104中27项历史未闭合，新增请见remaining-todo-2026-10-09.md；缺图：南三原图被清理，南八备份/官方gl106四面不能代替；请用户补含楼号/完整台阶门厅近景。官方后勤确认鼓楼民族食堂存在，但四楼未证实；20/21活动中心宽度/南青格庐入口仍缺图，来源结论在life-facilities/dining-source-audit。
- signs_stories正补3条官方地点介绍，若尚在运行勿重复启动，先list_agents；其他本批子任务已交付。全校卡顿/持续步骑飞/导航天气与最新人物美术未达标，不录宣传片。录好后才把README顶部图换视频，原媒体不提交。

Node /Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node。开始先git status与list_agents。240000压缩阈值不能保证消除413或连接中断；接口错误准确记断点。

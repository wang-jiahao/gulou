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

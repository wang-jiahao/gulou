# 最新断点：v0.108 已验证，继续渲染性能与生活设施

分支main；v0.107=8240731、v0.106=ca29c14；v0.108本地提交见git log -1。必要准备移到入场前：完整expand/碰撞/相机边界、雨天高度、全场compile和起点实际首帧。没有固定延迟/降低画质。保留10秒FrameSample调试按钮和loading阶段记录，按反引号显示；采样从开放入场时自动开始，手动按钮可重采样。正式性能对照在docs/loading-validation-2026-10-09.md，不重测已过加载案例。原新页最长333ms，候选新页3次68/67/34ms，开放入场约+0.8–1.5秒。连续热更新页383ms异常保留；持续FPS、全校路线仍未通过，不能宣称卡顿全解决。

已过：真实Game.init顺序及expand/rain/shader/首帧4失败路径（脚本替身GPU）、types、src ESLint、Vite build。正常CUA步行z68→66.2/南园店前传送/阵雨实看，恢复随机天气，console[]，tab7已关闭。所有本轮QA页已关。日志/tmp/gulou-v108/{readiness-final,types-final,lint-final,vite-final}.log。build-final.log是npm命令不存在，非有效构建；直接Node的vite-final才是通过。package-lock不存在的编辑尝试仅工具错误，实际package.json版本已更新。shader既有大chunk提示保留。

纪念品方向已正常UI核对：plan76面向北侧汉口路，前往店前转身可见对面偏东汉口门，未复现反向，不盲翻。已看phase33/nju-memory-user和plan-hankou-crop。证据docs/validation/v0.108/memory-{north-front,facing-gate}.png；memory-drag-overlay不是方向证据。楼体/门面模型本轮没改，配套棚与柜仍待补。

接续优先：持续帧率（中画质起点约2577880tri/475draw/79textures；CPU6–10ms，GPU常18–36ms波动，先测具体瓶颈，不降体验），再邮政左外卖棚/美团柜、独立快递楼/教育超市109、活动中心宽度/一层南青格庐、食堂层标及四层民族食堂来源、喷泉对面屏幕海报、苏浙牌/教学楼后碑正式名/导览、有来源介绍、人物发梢/皮肤/手部/坐姿及真实交互全场验收。五日29组audit已整理，不再翻历史。宿舍家族v106、院系97–105及人物第一轮v107不要重复。用户允许全部待办和质量验收后直接录约60秒本地片，尚未录，能力仍未确认；不得用旧capture脚本绕过浏览器。

恢复：cd '/Users/zackaria/Desktop/gulou campus' && git status --short。Node=/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node。4173 Vite PID5451/session14121确认后复用；browser2，无待关页。保护所有before基线，禁止--before/覆盖；v108原始txt已存忽略的validation目录，旧逻辑与候选备份在/tmp/gulou-v108，勿把旧逻辑覆盖回成品。四旧未跟踪脚本astronomy、dormitory-family、promotion-capture、promotion-shots不提交；原图/个人音乐不分发。仅本地，作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。README赞赏绝对末尾。压缩阈值240000，不能保证规避413。

# 最新断点：v0.109已验证；人物按最新要求整体重做

main，v0.108=789c47a；v0.109=158a40e。四吉祥物（不是商店）朝北汉口门，北侧地图抵达；欢迎/设置导航仓库→作者→赞赏，三个图标。五日47条真实原文已取回本机忽略docs/validation/v0.109/user-requests-extracted.json；详细104项+16延续项见request-audit-2026-10-09.md。不要重复抓全历史。

人物重做仍在独立原型，正式v0.109模型/生成器未替换。最新输出docs/validation/v0.110/student-{male,female}-prototype.glb，由同目录build-student-prototype.mjs生成；末次日志build-{male,female}11.log（两者通过）。新增裁边/实体领口工具，形变后统一UV接缝法线，连续发型取代悬空发束。正常UI定位并修正原型手掌低于骨盆误绑腿、外套衣摆误随大腿；最终全身/跑步/坐姿实看，但不代表完整动作验收。脸部材质/眉眼、发缘/男性太阳穴凸起、服装造型仍不达标，人物需求未完成。详见character-redesign-2026-10-09.md，不重做旧导航喷泉检查。

已过surface-check、tailoring-check（男女UV裁切/闭合内外壁/边界环/朝向及形变法线），Node语法；正式游戏资产/生成器与158a40e一致，未重复无关构建。未过整体美术/完整动作/校园/GPU。最新截图run-eleven、sit-eleven；console error[]，tab14关闭。原baseline与第六轮副本保留，不运行--before。恢复检查：Node scripts/character-surface-check.mjs及scripts/character-tailoring-check.mjs；恢复生成：Node docs/validation/v0.110/build-student-prototype.mjs（女生加--female）；预览同目录preview.html。

最新用户：人物不是修复而是重做，太丑；参考大型游戏建模。v107旧人物技术检查不等于造型达标，人物美术标为未完成。优先重设脸型、头身比例、发型与服装轮廓，做好近景/实际游玩距离再验动作；不要只补发梢。生成脚本scripts/build-student.mjs，游戏src/player/avatar.ts，预览scripts/character-preview.html。旧before必须保护。

v109已过：fountain-mascots-check（原57碰撞/铺装/绿化，13步行/14相机、8正反面射线）、types、src ESLint、Vite构建。日志/tmp/gulou-v109/{mascots,types,lint,build,metrics}.log；正常CUA北侧喷泉正面及步行、欢迎图标、两处导航顺序/链接、赞赏弹窗，console error[]，tab10关闭。图docs/validation/v0.109。设置截图停在上部，导航顺序由AX核对；未做移动端/全场GPU，不伪称已验。

README工作量已刷新，赞赏保持绝对末尾。v108商店朝向核对仅历史观察，已纠正审计中对象误解。持续FPS仍未通过；未证实收益的零强度灯实验已全部撤回，备份仅/tmp/gulou-v109/unlit-lamps-unvalidated.patch等，不误提交。

其后：邮政左棚/美团柜、教育超市109与独立快递楼、活动中心宽度/南青格庐、食堂层标/四楼用途、屏幕海报、苏浙牌/碑名/导览、缺项介绍与井盖等待核实项，全校步骑飞/公共道路/天气/性能验收后按已有授权直接录本地1分钟片。宣传片未录，不能用旧capture脚本绕过浏览器。

恢复：cd '/Users/zackaria/Desktop/gulou campus' && git status --short。Node=/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node。复用4173 PID5451/session14121；browser2，QA页均关闭。仅本地不推送；Git作者wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。四旧未跟踪scripts/{astronomy-check.mjs,dormitory-family-check.mjs,promotion-capture.mjs,promotion-shots.json}保持未跟踪。原媒体不提交；保护所有before，不运行--before。压缩配置240000不保证规避413。

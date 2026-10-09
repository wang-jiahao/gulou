# 最新短交接：v0.116 人物本轮收尾，性能/最后操作验收继续

工作树 `/Users/zackaria/Desktop/gulou campus`，main；package0.116.0；Git以`git status`/`git log -1`为准。用户已允许同步**现有私有仓库**源码/必要资产，仍禁止公开/部署/Pages。Git作者 wang-jiahao <144306077+wang-jiahao@users.noreply.github.com>。4173/PID5451复用，未重启。

## 已过，不重复
- v114六篇官方新故事（总65）及物理楼完整飞上→落屋顶→走下→坠落重生25实操已过，见progress；v113南园宿舍、吉祥物前植被、屏幕海报已过。
- 北大楼→汉口门→南园北门→喷泉→宿舍→广州门：27点206.5游戏秒，203样本high/1610×1524完整Game正常步行，无额外传送/飞行/重生。`/tmp/gulou-continuous-v114-passed.json`。两条早期路线失误before保留，未改建筑隐藏碰撞。
- 原生main UI五类35检查：自行车上下/移动/刹车，篮球持球60帧与出手抛物线，足球轻踢/加力/重置，晴雨昼夜，开始页原位继续。`/tmp/gulou-a03-main-ui114.json`。不含篮球命中得分，touch为needs-touch-device。
- 西北门地图符号是公共街道口，7处设备静态碰撞曾占道；`access-controls.ts`仅该入口设备/碰撞/感应器向东退7m，地图标记与其他八入口不变。已看官方平面图与VR航拍；7m是模型净空适配，非实测。源图/修复证据 `/tmp/gulou-northwest-gate/`。
- 实际Game800×600 high：金银街西北门双向连接5点12.684s、街道转入门禁再出9点12.501s过；`/tmp/gulou-jinyin-connector-v115.json`、`/tmp/gulou-northwest-gate-walk-v115.json`。离线真实工厂660通行+490行为0失败/0重叠（含公共街道净空/不误开回归）`/tmp/gulou-access-v115-regression.json`。
- v115 types/lint/build/资源检查已跑（以/tmp/gulou-v115-*.log与退出码为准）；build既有大chunk提示。环境无npm，可直接node调用node_modules/typescript/bin/tsc、eslint/bin/eslint.js、vite/bin/vite.js。

## 正在接续
- 公共街道页 `/docs/validation/public-streets-v114/index.html` 完整金银街10点78.699秒已过（`/tmp/gulou-jinyin-whole-v115.json`）；南秀村16点69.872s与小粉桥15点81.316s可见800×600/high已过；新报告`/tmp/gulou-nanxiu-visible-v116.json`和`/tmp/gulou-xiaofenqiao-visible-v116.json`，不重复。；DOM `#route-status` / `#route-result`，完成即保存JSON。报告也缓存`gulou-public-street-last`。三旧报告画布0×0只作历史物理证据；新的三路可见检查均已过，不代表全局性能；稳定副本`/tmp/gulou-{jinyin-south,nanxiu,xiaofenqiao}-v114.json`。
- 人物最终E已正式合入三GLB/五脚本，男D保留、女E六簇刘海。PBR男女正/侧后/全身走骑持物已看、主游戏女生切换恢复正常，console[]；正式28动作/62,348,896采样全过。manifest `/tmp/gulou-v114-integration/asset-manifest.json`，报告`/tmp/gulou-v116-final-poses/final-result.json`；before`/tmp/gulou-v116-before`。不采用中采样。A01本轮实现与美术自检已关闭，后续审美反馈可继续调整。
- 当前浏览器在 `/docs/validation/a03-extra-v116/index.html` “主要四项串测”中9地点导航已过，mapKeyboard出现map-point-check-failed；尚未到座椅/换装。保存报告因fixture的failureDetail自引用而JSON序列化失败，浏览器console有准确错误；未判定游戏故障。life_facilities正在/tmp修安全序列化/DOM详细检查，下一步投补丁仅复跑mapKeyboard，勿重复9导航；harness来自`/tmp/gulou-a03-navigation-seat-outfit`。两表已更新三街非零画布。
- 新原生high/1920×1080七点与27点路线共8有效组，7696连续帧，frame p50/p95=16.7/66.7ms；北大楼/广州门60FPS，汉口南/喷泉/宿舍24–34FPS。全报告`/tmp/gulou-native-high-v116.json`。运行GPU瓶颈仍未完成，延长加载无助，不降画质。
- 实际GPU分类三点每秒分析一帧10/10：`/Users/zackaria/Downloads/gulou-render-cost-v115-1791577818698.json`；activity_dining正读数据准备唯一最有收益候选，勿重复。页面`/docs/validation/render-cost-v115/`已跑。测量保持全部draw/sort/shadows。深度预通道经审计无法严格保证不同shader深度一致，严格筛选0对象，放弃（`/tmp/gulou-v116-depth-audit/FINDINGS.md`）。
- 缓存排序像素主RGB/双shadow0差，但固定ABBA性能随宿主时间漂移，GPU14.92→15.46→16.27→17.47ms；无稳定收益，**不采用**。`/tmp/gulou-opaque-cache-fixed-v115.json`。原safe每帧CPU9.6ms退化、直接center1008像素变化、旧shadow/子批次候选均不采用，不反复测试。
- 相同源码工具重连前后曾14→60FPS，不能当代码优化。记录focus/visibility/renderSize；画布0×0与后台调度须和游戏瓶颈区分。用户锁屏，IAB可用；原生应用/独立浏览器不可用，A05暂待解锁。IAB极简fullscreen也约50ms退出，未冒充独立浏览器通过。

## 宣传片
第二版未录。用户最新要求重要TODO结束/明确暂缓后再录。`/docs/validation/promotion-20261010/index.html`：默认26×2s=52s，先生成接触表逐镜实看；北大楼仅I❤️NJU一次、飞先骑后、无人物/球类/球场。起镜稳定树冠保持风/CSM/原fade；museum2s切换2→0、图差35.57→4.90已验。新128BPM原创配乐`.local-media/promotion/v113-cut2/soundtrack.wav`当前模型不支持音频输入，不能声称试听；原片段尝试返回audio omitted。客观响度/解码已过，后续配乐需说明听感尚待用户。旧docs/media/gulou-preview.mp4仍旧版。

## 恢复与保护
先git status/list_agents。CUA当前IAB id1，tab46；browser/inspectTab/directTab复用。临时viewport800×600，完工reset。只通过CUA操纵浏览器，不能shell Playwright/CDP。保存报告直接读取**当前页面实际存在**的DOM；下载按钮若仅新增链接，勿等不存在的download。Vite可因改模块触发reload，跑路线冻结服务模块；若中断如实记录。长日志落盘、图每批1–2张约800px。全部before基线/原图视频/个人音乐不提交。

Node `/Users/zackaria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`。六个本地scripts保持未跟踪：astronomy-check、dormitory-family-check、nanyuan-dormitory-entrance-check、nanyuan-reference-refresh-check、promotion-capture、promotion-shots.json。README赞赏绝对末尾；每版刷新metrics并本地提交/私有同步。240000阈值不能保证根治413或连接中断。

本机媒体转码可用 `/tmp/gulou-media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`（imageio-ffmpeg临时安装，项目依赖未改）。v116类型/lint/build/57资产检查已过，正常剩余UI串测正在跑；已完成v115提交2f7caaf并私有push成功，v116提交以Git为准。

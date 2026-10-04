# 资产来源与使用范围

当前本地版本 v0.26.0。游戏资产、空间基准和建模参考分别列出，第三方资料保留各自权利。

| 资产 / 资料 | 来源与许可 | 使用方式 |
| --- | --- | --- |
| 校园多角度实景 | [南京大学官方 VR](https://vr.nju.edu.cn/newUI/#/) | 主要建模参考，包括北大楼、大礼堂、教学楼、中大路、汉口路门和南园；原始全景图片不随仓库或网站分发 |
| 鼓楼校区平面图 | 用户提供的南京大学校园平面图 | 描绘建筑、道路与草地轮廓；原图保留在本地，不分发 |
| 地理基准与核心建筑占地 | [OpenStreetMap](https://www.openstreetmap.org/way/88778620)，ODbL 1.0 | 提供核心建筑占地与部分配准基准；游戏保留 OSM 署名，相关 OSM 数据遵循 ODbL |
| 北大楼、东大楼、西大楼、大礼堂 | 本项目人工建模，源文件见 src/world/ | 依据参考重建，包含屋顶、门窗、台阶与碰撞；非实测建筑模型 |
| 教学楼、汉口路门、普通建筑 | 本项目人工与程序化重建 | 轮廓参照校园图，重点立面结合官方 VR；楼高与部分细节为估计值 |
| 紫峰大厦 | [公开坐标与高度](https://en.wikipedia.org/wiki/Zifeng_Tower) | 使用 32.06247 N、118.77806 E、450 m；建筑立面和收分为本项目简化模型 |
| 阔叶树模型 | [Poly Haven Tree Small 02](https://polyhaven.com/a/tree_small_02)，CC0 | 几何与纹理简化、Meshopt 压缩、实例化；补充叶片，修复远景树干形状 |
| 天空 | [Kloppenheim 06 Pure Sky](https://polyhaven.com/a/kloppenheim_06_puresky)，CC0 | HDR 背景与环境照明；不是南京实地天空 |
| 针叶树纹理 | [Pine Tree 01](https://polyhaven.com/a/pine_tree_01)，CC0 | 树皮与针叶图集；树形由本项目制作 |
| 砖、树皮、草地 | [Castle Brick 01](https://polyhaven.com/a/castle_brick_01)、[Bark Platanus](https://polyhaven.com/a/bark_platanus)、[Grass Ground](https://polyhaven.com/a/grass_ground)，CC0 | 调色、法线与派生纹理 |
| 人物基础 | [MakeHuman 图形资产](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md)，CC0 | 基础网格与辅助关节数据；服装、骨骼、动作和脚部 IK 在本项目制作，不使用 MakeHuman 应用源码 |
| 公开建筑照片 | Wikimedia Commons：Yumeto、zhanyoun、Soufate 等作者 | 仅作建模参考，原图不随仓库和网站分发 |
| 合成环境声、道具等 | 本项目生成制作 | 脚步、鸟鸣、长椅、路灯、足球、球门、部分纹理与几何；雨声实录另列 |
| C418 / Minecraft 音乐 | Minecraft Java 官方资源索引与资源服务器 | 五首曲目仅保存为本机个人播放文件，未包含在公开仓库与网站中 |

[配准记录](sources/plan-registration.json)保留控制点与拟合方法；拟合残差不等于真实测绘精度。普通建筑位置、尺寸、楼层和植物仍有近似值。

[MakeHuman 许可原文](sources/makehuman-license.md)区分程序源码与 CC0 图形资产。更多分发说明见 [THIRD_PARTY.md](../THIRD_PARTY.md)。


## 本地 v0.4 补充

- 男女学生共用 CC0 MakeHuman 图形基础与服装代理网格，分别制作服装配色、比例、头发、配饰和绑定；模型在 public/assets/characters/student-male.glb 与 student-female.glb。
- 消防大厦占地来自 [OSM 100949347](https://www.openstreetmap.org/way/100949347)，按附近西侧高楼参考制作，立面与约 78 m 总高度属于估计，不声称是实测立面。
- I ❤️ NJU 立体字为本项目几何，依据用户提供的合影照片设置近似场景位置。新增参考图仅在本地 references/ 保存，不纳入仓库。
- 爬山虎改为疏密分层的叶片和藤茎，庭院常绿树形按参考作近似重建；物种、每棵树的位置与枝条不属于测绘数据。


## 雨声与叶片清晰度

- 雨声采用 [Rain (1).ogg](https://commons.wikimedia.org/wiki/File:Rain_(1).ogg)，作者 ezwa，PDSounds 记录 682，Wikimedia Commons 标明 Public domain、Copyrighted=False。转换为单声道 22050 Hz WAV，调整电平并对循环接缝交叉淡化；运行时移除低频轰鸣并保留雨点细节。文件为 public/assets/audio/rain-field.wav，不是 Minecraft 音乐。
- 新爬山虎颜色/透明轮廓/叶脉法线图由 scripts/ivy-texture.py 程序生成，为原创素材。未使用参考照片像素。

## 苏浙运动场与足球

- 场地中心与朝向取自校园平面图中运动场内圈；90×60 米场线属于适配现有粗模的近似练习布局，不是实测。球门口使用 7.32×2.44 米尺寸。
- 足球的黑白 32 面拼片、球门、球网与场线均由项目程序生成，没有新增第三方模型或图片。足球运动使用 Rapier 刚体，球网以简化碰撞面近似处理。

## 本地 v0.7 校门与人物

- 汉口路门按本次用户照片和官方 VR 重新校正近似比例：加深挑檐、石材分缝、门卫窗框、折叠围栏、灯笼与校门后树荫，省略迎新横幅。照片仅留在本机 `references/hankou-gate-user-target.png`，未用于纹理或字体描摹。灯笼是照片中的装饰状态，不宣称常年摆设。
- 门楣和柱面凸字使用 [LXGW WenKai](https://github.com/lxgw/LxgwWenKai)（SIL OFL 1.1）的 12 个字形，经 `scripts/build-gate-lettering.py` 转换为轮廓子集并更名为 **Gulou Gate Lettering**。分发文件仅约 29 KB，许可保存在 `public/assets/fonts/OFL.txt`；完整字体留在忽略的源素材目录。生成器需要 Python fontTools。
- 人物沿用 MakeHuman CC0 图形基础，重新调整脸型、鼻唇轮廓、肤色、眉眼和发型；头部与手部采用平滑细分，自制开衫／外套与内搭。三套穿搭仅在本地更改材质并保存偏好，不涉及联网皮肤服务。
- 门柱细颗粒石材由固定种子的程序噪声生成；没有使用参考照片的像素。

## 本地 v0.8 参考核对与树木细节

- 当前十二个校门字已替换为 `scripts/trace-gate-lettering.py` 从用户照片分离后重建的笔画轮廓，按官方 VR 核对排列。不是文楷，也不是原书法矢量稿。仅包含几何轮廓，不打包原照片；不为原书法另行声明许可。上一节 v0.7 的字体说明保留为历史记录。
- 北大楼塔顶单窗、窗下石台、山墙瓦饰、屋檐瓦端、庭院常绿树、三头灯和沥青道路以本地照片与官方 VR 为参考。草坪高差确认存在，0.20 m 草坪标高、0.22 m 石缘顶面为近似值。
- `cypress-spray.png` 与 `courtyard-asphalt.webp` 由 `scripts/courtyard-textures.py` 生成，未使用参考照片像素。常绿树为程序化近似树形，不宣称准确树种。
- `tree-distant.glb` 是同一 Poly Haven CC0 Tree Small 02 的进一步简化版本；近、中、远三级按距离和画质切换，几何及材质按世界实例共享。
- 全量 130 个地图轮廓、36 片道路和 39 片草地检查记录留在本机 `docs/map-audit.md`；描图一致性不等于校园测绘精度。

## 本地 v0.9 建筑、宿舍、通行设施与植被

- 官方 VR 室外／鸟瞰参考扩展到 92 个视点、368 个方向，图像只在 `references/official-vr/phase10/`。`scripts/collect-vr-exteriors.py` 保存来源索引，`scripts/audit-vr-buildings.mjs` 输出本机逐栋核对文档。79 个外观参数并非 79 个完全独立的精确模型；估计层高、被遮挡立面和示意图映射仍为近似。
- 普通建筑的窗框、窗台、入口、空调、阳台和屋顶细节由项目生成，近景细节按距离启用。南园宿舍增加逐栋门牌和地图目的地；不可见部位按相应建筑类型补全，不声称每个门窗和空调位置均与现实一致。
- 9 组通行设施的位置依据校园图出入口符号和开放地图 gate 节点；包含汉口路、广州路、南园北门、北京西路两处、西北、西、天津路和南园东侧出入口。闸机和道闸为本项目制作的模拟设备，布局和开合逻辑用于本地游玩，没有读取摄像头或采集人脸。南园东侧位置按 OSM 与当前地图近似对齐，北侧无专名入口使用描述性名称。
- `campus-leaf-spray.png` 与 `campus-canopy-alpha.webp` 由 `scripts/campus-foliage-textures.py` 从已使用的 Poly Haven Tree Small 02 CC0 图集清理、裁切和生成蒙版。`cypress-spray.png` 仍由原创程序生成，调整色彩及微纹理，与阔叶树保持接近的明度和叶片尺度。

## 本地 v0.10 宿舍配套与门禁屏幕

- 绿色自行车棚、浅色棚底、停放的自行车及灯具由项目几何生成；形态参考官方 VR `gl-1-06` 的后、左、右方向。四处位置根据当前平面图空地和宿舍入口拟合，尺寸、车位数量与灯具为游玩中的近似布置，不代表实测设施清单。保留原始参考图在本机忽略目录，未作为纹理使用。
- 门禁“校园通行／请靠近／请通行”画面用 Canvas 和系统字体生成，两种状态材质共享；仍为按角色距离切换的模拟反馈，不接入摄像头。

## 本地 v0.11 南园立面与路缘

- 南园二舍底层灰色分区依据官方 VR `gl-1-17` 可辨认的外墙分色；部分首层窗格参考 `gl-1-17` 和 `gl-1-06` 的宿舍窗格形式，中央入口留空。楼层高度、色值与遮挡立面仍为近似，未用照片作纹理。
- 南园北门—喷泉—二舍一带的低路缘与黄色边线参考上述视点，沿当前道路和草地相邻的描图边界拟合；通过三点内外侧判断避开道路内部接缝和路口。0.14米路缘、0.10米线宽均为模型近似值，示意图描边空隙没有被当成实测人行道宽度。
- 新增几何与对照截图来自本项目，原始参考图仍留在本机忽略目录。

## 本地 v0.12 南园路旁树木

- 根据官方 VR `gl-1-06`、`gl-1-17` 中的路旁树干维护涂层，为当前南园草地边靠近道路的四棵既有树增加下部涂白；约1.2米涂层高度为视觉估计。使用原CC0树木材质和纹理的明暗细节，在世界坐标中着色，未复制照片像素、未新增树种认定或改变树木位置。
- 根部草簇沿用项目原创 `grass-tuft.png`。修正了纹理透明区域的黑色RGB，避免纹理缩小时出现暗边；19157个可见像素及全部alpha保持不变。当前纹理由 `scripts/prepare-grass-texture.mjs` 处理，主生成器 `scripts/generate-textures.py` 同步该处理。
- 候选树木在当前地图草地内，因此添加草簇而非假定其为硬铺地树池。四棵树的空间筛选与覆盖范围保存在 `src/world/south-tree-details.ts`，位置依然属于当前地图尺度下的近似。

## 本地 v0.13 南园导览栏

- 形态参考官方 VR `gl-1-02` 的低灰砖基座、浅色挑檐、金属框和玻璃公告栏。当前短段布置在经济管理学院中心模型南侧，避开其东侧入口；约9米长度与约2.3米总高为模型估计，不是该设施的测绘复刻。
- 三块面板用Canvas与系统字体生成，示意图采用项目现有校园轮廓，文字为原创地点与路线说明。没有复制参考照片中的海报、活动文字、人物或图像像素。
- 在游戏中靠近正面可打开校园地图；该交互为游戏功能，并不描述现实公告栏具备电子交互能力。

## 本地 v0.14 松林楼临园立面

- 依据官方VR `gl-1-03` 的蓝灰色立面、成片底层蓝色玻璃和浅色边框，调整当前plan-86模型西、南侧临园立面。玻璃宽度、分格与不可见部分属于现有轮廓内的近似布置，未改楼高、北侧入口或上层窗位。
- 玻璃、窗框均为原生几何和材质，无新增照片纹理。该视点的经纬度视作位置参考，未当成精确摄影机坐标或测绘数据。

## 本地 v0.15 松林休憩点与坐姿

- 石桌、矮石凳和步行小径的形式参考官方 VR `gl-1-03`。在当前松林楼西侧约(-70,420)的已核对空地放置一张石桌、四凳、圆形小铺地和连接道路的小径；桌凳数量、约5.1米铺地直径及其他尺寸都是适配模型的近似，未把POI经纬度当成测绘点。
- 家具由原生几何生成，使用项目已有石材与铺地图案，不使用原照片像素。人物沿用已有MakeHuman CC0基础与本项目服装骨骼，坐姿根据座面高度和足下支撑调整。

## 本地 v0.16 庭院地形、图书馆、大纛坪与自行车

- 用户本地下载的校园漫游视频来自 https://www.youtube.com/watch?v=aGgqEV3syjw ，实际文件为854×480、43:06。已解码查看分段画面，重点17:00–17:30的北大楼南端台阶、28:42–29:00的大纛坪旗杆，结合官方VR gl-3-05、gl-2-08、gl-2-07/47。七级0.18米台阶、1.26米庭院高差、侧/后坡面和旗杆尺寸都是近似参数，未声称实测。
- 现代图书馆西侧连续竖框、细窗格和入口雨棚参考南京大学档案馆 https://dawww.nju.edu.cn/info/1201/10631.htm 的现代馆入口照片；传统馆舍保留红窗与叠层屋顶。两个内院不填平，不能把整个连体轮廓都当成老馆。建筑门牌为游戏导览文字，非原题字复刻。
- 新地形、石阶、旗杆、拉索、自行车及建筑细部由原生几何生成；人物沿用已有MakeHuman基础与原创服装，调整骑姿及衣服权重，不引入新的人物素材。车棚原20辆自行车拆为独立可交互对象，可骑行、停放并重新上车。
- 原始视频及图像均留本机忽略目录，不作为纹理、不进public/dist、不提交或上传。实机截图为本项目生成。更完整的参考索引和不确定项保存在本机docs/reference-review-2026-10-03.md。

## 本地 v0.17 参考与新增模型

- 读取用户本地43:06视频，并从用户指定BV1iL411h7G2的公开播放接口下载54分钟版本到本机references/phase18，仅用于解码查看。官方VR额外取回32张多分辨率立方体面，重点gl-4-13/3-01逸夫馆、gl-3费彝民楼周边、gl-2-23/39蒙民伟楼、gl-2-10教学楼、gl-1-12/16广州路门及gl-1-22/24南园综合楼。图像与视频未进分发包。
- 新教学楼与南教学楼的位置依据教务处2023-02-08的公开示意图：https://jw.nju.edu.cn/33/b6/c24683a603062/page.htm 。将原plan-36南段单独标为新教学楼，plan-73核名为南教学楼；南园教学楼plan-105是另一栋。两个新公共教学楼的未见立面与楼高仍有估计成分，不能称精确重建。
- 费彝民楼分离十九层主楼与低层翼部；楼高按3.6米估计层高，裙楼分段仍按地图/VR拟合。逸夫馆增加低入口连接部，蒙民伟楼增加塔楼/裙房与冠部，教学楼三拱窗改为砖砌顶部内的构件。原有轮廓不被改成无依据的整块长方形。
- 现代图书馆重新制作浅色百叶、玻璃门厅与入口台阶，依据档案馆现存正面照片；照片可确认入口上方金色题字，用户提到的“左上角”位置尚无独立清晰照片确认。2024—2025确有外窗/屋面改造，因此保留年代不确定性。
- 广州路门参考gl-1-12的石柱、侧墙、值班亭与开放车道，不捏造跨路大门梁；未复制疫情时期的帐篷与围挡。汉口路/广州路路面、人行道、标线及低速车辆均为原创几何，宽度与标线间距为地图尺度下的估计。
- 门框、玻璃门、可见门禁与“室内暂未开放”提示是用户要求的游戏导览设计，不宣称现实每栋楼都有相同门禁。已有历史木门保留建筑参考形态。
- 南京大学校徽直接来自官方网站页眉 https://www.nju.edu.cn/images/logo.png 的独立盾徽部分，裁切保留原图颜色和透明度；校徽权利归南京大学，不纳入本项目原创素材许可。游戏用作校园识别，不表示官方出品。
- 升旗动画沿用程序生成的五星红旗；街道车辆、远景树冠补全、手指骨骼和骑行动作由项目代码制作，不使用参考图像像素。

- 广州路门牌另有直接实拍证据：[广州路门口实拍，BV1HT4y1U7TE](https://www.bilibili.com/video/BV1HT4y1U7TE/)，2022-03-16，67秒，已实际解码查看00:00–00:03与00:23。浅色分缝石材、金色“南京大学 / NANJING UNIVERSITY / 广州路门 / GUANG ZHOU GATE”和球形石墩可确认；门牌使用系统字体重新排版，未复制视频像素，尺寸和未见侧布局仍是近似。
- 中大路一带9根既有灯杆新增双侧竖幅，形态参考BV1iL411h7G2的00:55与02:00。文字“南京大学／鼓楼校园”为原创导览内容，并非复刻画面中的临时活动标语；具体布点和尺寸为近似。
- 远景树冠由同一Poly Haven Tree Small 02 CC0模型及原有CC0叶片烘焙9方向图集（四侧、四个45度方向及俯视）。scripts/bake-tree-canopies.mjs和scripts/canopy-bake.html可重新生成，分发的是许可明确的游戏资产，不是校园参考照片。
- 教务处楼栋教室PDF可确认新教学楼有501—503教室、南教学楼有101/102/201/202，因此分别采用五层与两层；室内教室资料不被当作完整外立面依据。

## 本地 v0.18 校园故事与玩法

- 大纛坪、教学楼、图书馆、校史博物馆等20则介绍为南京大学官方VR公开文字的压缩转述（https://vr.nju.edu.cn/newUI/#/；大纛坪note110，礼堂111，教学楼113，校史馆124，图书馆125等），不是模型生成的虚构故事。原始响应与既有缓存只留本机。新/南教学楼另引教务处2023-02-08位置说明。
- 路灯竖幅按用户记忆改为紫色，四组标语经南京大学2023-02-14官网公告确认：https://www.nju.edu.cn/info/3181/98441.htm 。具体灯杆分布和布幅尺寸仍为近似。
- 新发现的资产管理处2024校园图、用户新增的题字/俯瞰照片用于后续几何修正，原PDF和照片留references/phase19；尚未实施的高差、建筑及运动场变更不能写成已完成。

- 北大楼介绍依据南京大学校友网2020-11-20文章https://alumni.nju.edu.cn/aa/0a/c21691a502282/page.htm；东/西大楼依据南京大学官网https://www.nju.edu.cn/info/3191/152251.htm，均实际读取。大纛坪旗杆竣工月份在官方材料中有8月/10月差异，游戏只写已一致确认的1935年，不把月度差异当作定论。

## Local v0.19 — east terrace and teaching buildings

- Official VR [scene_gl-3-16](https://vr.nju.edu.cn/newUI/#/): directly inspected the long descent beside the new teaching entrance, retaining cheeks and central wheel channel. East Building, its physics and surrounding terrain share a raised platform. The 2.88 m rise / 18 risers are visual estimates, not surveyed dimensions.
- [NJU Asset Office 2024 plan](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html): regularized the new teaching footprint and rechecked the southern teaching strip. The latter differs little from the earlier plan; no unsupported large inward relocation was made.
- Official VR scene_gl-2-53: south teaching entrance is on the west end; closed glass vestibule stays accessible. New teaching's visible west facade is five levels, with a projecting canopy and entrance risers. The documented two-storey auxiliary building has not yet been reliably matched to a separate footprint.
- Both user-specified walk videos were decoded locally again, alongside the saved reference index. Source media remain excluded.

## Local v0.20 — library complex and individual lettering

- User-provided overhead photo (local only), the [2024 official campus map](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html), [NJU Archives](https://dawww.nju.edu.cn/info/1201/10631.htm), and official VR scene_gl-2-21 were inspected together. The northern historic building has the traditional roof; the central reading-room mass is flat. The modern west/south wings and elevated west connector leave a real open courtyard. Vertical dimensions and hidden facades remain estimates.
- The history museum entrance faces north toward Jin Da Road; its travel destination and area label follow the corrected entrance. Both museum and modern library have separately collidable, closed entrances and visible stairs.
- `scripts/trace-building-lettering.py` reconstructs contour-only geometry from the archive library frontage, official museum VR face and new-teaching VR face. Distinctive forms and spacing are retained per sign. The output is an approximate reconstruction, not original calligraphy artwork or a claim of ownership. No source photographs or panorama tiles are distributed.
- The user's library photo agrees with the wide-spaced lettering above the west canopy. Other facade/year variants of a high-left sign remain unverified; this does not establish that such a sign never existed.

## Local v0.21–0.22 — sports facilities and open bicycle parking

- Sports court footprints, perimeter, four openings and west podium follow the [2024 Asset Office plan](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html), cross-checked with official VR scene_gl-3-17 and the user's [walk video](https://www.bilibili.com/video/BV1iL411h7G2/) at 20:00. Four full basketball courts, a half court and four eastern tennis areas are represented; equipment and heights are estimated, and the narrow tennis footprints are not regulation dimensions. Basketball/tennis equipment is scenery.
- [Official VR](https://vr.nju.edu.cn/newUI/#/) scene_gl-3-16, gl-2-22 and gl-2-53 directly show open bicycle rows beside new teaching, the library and south teaching. Five rows of five rideable bicycles fit the model's apron space, leaving entrances, the east terrace stairs and roadways accessible. Quantities and spacing are gameplay approximations; the real scenes also contain electric bikes.
- The purple P board and its wording “校园共享单车指定停车区 / 请按车位有序停车” are visible at the south teaching west entrance in gl-2-53-r. This board is recreated only there, without inferring it at the other rows. Models, paving and board are locally generated geometry/text; original reference pictures remain excluded.

## Local v0.23 — running track and jump apron

- Official VR scene_gl-3 front/back aerials show eight lanes, the western sprint-straight extensions, red semicircles and two east–west jump runways sharing a sandpit on the eastern side of the south apron. These were inspected alongside the 2024 campus plan and scene_gl-3-17. Lane widths, curve radii, runways and pit dimensions fit the registered model approximately; the track is not asserted to be a surveyed 400 m circuit.
- Track/apron markings and sand are generated geometry and materials. The apron excludes the exact existing turf footprint to avoid overlapping ground surfaces. These decorative additions do not add collision barriers or alter football rules. Original panorama tiles and video frames remain local.

## Local v0.24 — Fei Yimin tower, column recess and courtyard

- The [official VR](https://vr.nju.edu.cn/newUI/#/) scene_gl-3 front aerial and scene_gl-4-02 right face were directly inspected with the [2024 campus plan](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html). They establish the western tower, low east/south wings, west-open court and southwest column recess with an inner wall. The large colonnade near 25 minutes in the user walk video belongs to the western neighbouring building and does not establish a through-tunnel in Fei Yimin.
- The canopy is separately collidable overhead while its ground route remains open. The 68.4 m tower, 19 m wings, floor spacing, canopy dimensions and hidden facades are visual estimates. Vertical gold lettering is placed on the south wing's west end, recreated with a system Kai font; it is not a traced original inscription.
- Models, glazing and lettering are generated locally. Reference photographs, panorama tiles, user screenshots and videos remain outside source commits and distribution.

## Local v0.25 — Hankou boundary and public-road alignment

- [Official VR](https://vr.nju.edu.cn/newUI/#/) scene_gl-2-01 and gl-2-40 were inspected with the [2024 Asset Office plan](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html). These support the short solid-wall stretches north of Hankou Road and low masonry / iron railings south of it. Gl-2-40 is an elevated gate-side view despite its official aerial label. Unseen perimeter extensions are not inferred.
- The registered map centreline replaces the straight Hankou strip that overlapped south teaching. The 10.4 m carriageway, 1.8 m sidewalks, wall heights and setbacks are model estimates, not surveyed dimensions. Guangzhou retains its prior road approximation. Road drawing, vehicle paths and crossing checks share the same coordinates.
- Chrome and Edge each passed 28 walk/ride route checks, 16 boundary blocks, 12 physics rays and eight actual player crossings with stop/resume checks. Real Rapier tests cover bends, yielding, wraparound and contact. Original source media remain local and excluded from distribution.

## Local v0.26 — Single building roof surface

Ordinary and sectioned specific buildings now render the existing extrusion cap as the roof, removing near-coplanar duplicate surfaces that produced triangular depth stripes at long distances. Existing footprint/height references remain unchanged; no new architectural dimensions are inferred. The closed collision shell and camera blockers are preserved. No source reference image or personal media is included.

## v0.27 南教学楼西端题字与入口细部

依据南京大学官方鼓楼VR `scene_gl-2-53-r` 立方体面实际查看全景和原尺寸题字裁切。以石材分缝作透视校正，重建金色“南教学楼”各字的独立轮廓和孔洞；照片中的字形保留，不用系统字体替换。`scripts/trace-building-lettering.py --only southTeaching`可单独重建，保持旧三组数据。金字置于西入口深色薄檐上，补窄支撑与浅色石材分缝。透视校正后比例、字宽5.3m、题字高度和檐尺寸为影像估计；建筑7.6m体量与原碰撞不变。原始照片及校正照片仅存本地references，产品仅含重建矢量。

## v0.28 两馆入口与北檐细节

再次实际查看[南京大学官方VR](https://vr.nju.edu.cn/newUI/#/) `scene_gl-2-21-f` 和[档案馆老图书馆资料](https://dawww.nju.edu.cn/info/1201/10631.htm)中的现代馆入口照片28。博物馆改为棕木双门、下嵌板、上部菱形格栅及气窗，配窄侧窗、浅石材内门框；门楣和瓦盖沿入口朝向对齐。北向两层檐补绿色梁、暖色几何线纹与密椽头；纹饰是简化重建，未见立面不延伸假定。现代馆补宽玻璃厅包围窄深色双门及平雨棚底三个矩形灯。两馆题字向外调整到各自门楣／窗框前，修复金字被外凸窗框遮挡；字形、宽度与高度保持原重建数据。

入口宽度、窗格、檐梁与椽头间距均为适配现有体量的视觉估计。原九体量和门前台阶保留；新增固定玻璃区域有碰撞。两馆也使用既有挤出几何的唯一顶盖绘制，移除重复表面。原始图片仅本地参考，产品为程序几何/材质；石狮、细密原彩绘和未见侧仍待核实精修。

## v0.29 博物馆北侧中央立面

再次查看[南京大学官方VR](https://vr.nju.edu.cn/newUI/#/) `scene_gl-2-21-f` 全图与门侧上下层局部，确认底层门两旁各有一对较窄窗、浅石窗台和窗下矩形嵌板；浅石横带分层，上方三组宽窗由圆红棕木柱分开，带独立气窗及浅色几何窗棂。此次只替换可见的中央北向立面，不把同样格局推断到被树遮挡的两翼及背面。

细砖为512×512程序纹理、石缝与窗棂为程序几何；不使用原照片作贴图。石带高度、1.02m底窗、3.12m上窗、圆柱直径和简化窗棂图案均为适配既有地图体量的影像估计。九体量、门记录、台阶、题字和碰撞保持不变。石狮、门侧牌匾与灯具、两翼立面仍待后续核实。

## v0.30 博物馆入口与前庭

再次实际查看[南京大学官方VR](https://vr.nju.edu.cn/newUI/#/) `scene_gl-2-21-f` 全图和入口裁切：浅石内门框上有成对乳白壁灯、外柱前有成对坐姿石狮，下方方座带浮雕；入口中央有宽铺装通路，两旁为圆冠灌木与低方形绿篱。按既有地图道路/草坪（含多边形孔洞）安置绿化，保留中间道路和台阶前横向通路。

石狮使用坐姿躯干、前腿/足爪、鬃毛、眉眼/口鼻与方形基座的简化程序几何，不宣称精确雕塑复刻。雕像约2m含现有台阶及承座、壁灯和绿篱大小均为影像估计；未辨清的牌匾文字不编造。两座雕像与四处绿篱有独立简化碰撞，其他楼体/门/题字保持。叶片为256×256本地程序纹理，不使用参考照片贴图。原始参考不打包、不提交、不上传。


## Local v0.31 — 教学楼／郑钢楼

实际查看用户提供的教学楼正面照片及官方 VR `scene_gl-2-10-f` 高清正面。重建四方柱与三个深开间、后置关闭门、八级宽浅台阶与斜侧帮、檐下灯笼、九组窗和中央较大的三拱冠部。灰砖由程序生成；金色“教学楼”和竖排银色“郑钢楼”按照片提取轮廓，校徽为简化近似，不可辨读铭牌暂不编造。楼体占地与最高点保持；台阶、柱和门的碰撞随可见几何调整。尺寸、比例、隐藏侧仍是照片参考下的近似，不宣称测绘还原。原图、裁切与全景仅留本地，不进入游戏包。

构建、ESLint、Chrome/Edge 五视角与真实物理逐步验证通过：三条登阶至闭门路线、四组步行／骑行道路、两条横向柱廊及八处阻挡；保留405个旧物理网格，替换10个并加入22个，现427个。工作量统计脚本分别报告源码、工具、数据与素材，不将重复全景面当成独立照片，不推测未知账单。

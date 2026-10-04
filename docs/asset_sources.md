# 资产来源与使用范围

当前本地版本 v0.62.0。游戏资产、空间基准和建模参考分别列出，第三方资料保留各自权利。

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

- v0.34：重新查看官方 VR `scene_gl-3-17-r` 的主席台正面裁切，并按用户纠正移除台阶全宽前方的围网、横杆、立柱及对应碰撞。两側围网及四个入口保留；开口两端余量依据影像估计，未作为测绘尺寸。参考原图仅本地保存。

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


## Local v0.35 — 物理楼与入口告示

实际查看[南京大学官方VR](https://vr.nju.edu.cn/newUI/#/) `scene_gl-2-15-f` 全图、门廊与题字特写，并与[2024资产处地图](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html)配准，确认外侧U形楼为物理楼（plan-70），纠正旧“微结构研究中心”对应；plan-69仅暂记物理楼内院研究楼，尚无充分证据标具体机构。VR gl-2-25实际是顾毓秀雕像，不能引用为物理楼。

五层、四方柱/三开间、后置玻璃门、浅三级台阶、平雨棚、宽窄交替窗、石竖条与上层突出米色百叶罩按可见正面重建。金色“物理楼”为按照片手工重建的独立笔画近似，不是精确书法扫描。18m楼高、窗/柱/台阶/雨棚尺度和未见侧均为影像估计；U形占地与内院保留。原图不入游戏包。按用户要求删除通用入口告示，其他楼门与碰撞不变。

构建、ESLint及Chrome/Edge专项通过；425无关碰撞逐项保持，物理楼旧2代理替换为13代理。三入口登阶并停门前、柱廊/门前道路双向、四柱阻挡与雨棚/院落射线通过；各四个最终视角实际查看。门旁铭牌、自行车及绿化尚待精修。


## Local v0.36 — 软件学院与费彝民楼南翼通道

实际查看用户四张软件学院／标语／通道图片，并核对[软件学院官网](https://software.nju.edu.cn/)及其[通讯地址页脚](https://software.nju.edu.cn/DFS/template/1322/images/footer.js)：鼓楼通讯地址为汉口路22号费彝民楼。保留费彝民楼身份，新增软件学院独立地点和庭院侧院牌；不能据此认定整栋楼均为学院独占。

南翼局部开口真实贯通，按斜边分割墙体；紫色标语位于有后墙的凹槽，旁侧玻璃门按用户图正视右侧摆放。标语仅重建可辨文字与简化线描，不包含截图界面。净高3.8米、位置／尺寸及院牌字形仍为近似，原始素材不打包。

构建、ESLint及Chrome／Edge通过：24条双向步行／骑行路线、12处墙柱门阻挡、6条竖向射线，保留436个碰撞、替换旧2块并新增6块。其他建筑及原有门记录保持，两浏览器各6视角已实际查看。


## Local v0.37 — 吕志和游泳馆与体育馆

实际查看[南京大学官方VR](https://vr.nju.edu.cn/newUI/#/) `scene_gl-3-03` 的 f/l/r 高清立面与 gl-3 鸟瞰，结合2024官方地图保留两馆轮廓。泳馆采用前低后高两片浅坡金属屋顶、三层灰绿窗、三组门与浅台阶、蓝色“南京大学学生体育活动中心”牌和简化运动图标；体育馆采用较低平顶、高窗、独立入口及门上金字。

右侧 r 面高清特写明确可辨竖排“吕志和游泳馆”，位于正立面最右端、顶层窗下方的实墙，已补入模型并调整对应窗格。主标题文字已核实；旁侧小署名未可靠辨认，不编造。字体为系统楷体近似，尺寸、屋顶高程、未见立面与运动图标均为影像估计，非测绘数据或原书法矢量稿；参考照片不作贴图、不提交、不打包。

类型检查、ESLint、构建和Chrome／Edge专项通过；保留438个无关碰撞，旧两馆4代理替换为19代理，校园轮廓及其他楼／门记录保持。四入口登阶闭门、两馆门前及平台双向横穿、四条屋顶／凹口射线通过，两浏览器各7视角已实际查看。前場树木、低栏、公告设施与单车继续精修。


## Local v0.38 — 两体育馆前场

重新实际查看官方VR `scene_gl-3-03` 的 f/l/r 全图，补泳馆前两段低白栏、两处公告栏与四棵修剪圆冠树，体育馆入口两树、三棵白刷干高树、左侧三张黄木条凳及门旁窄公告板。公告纸张采用程序色块，不虚构无法辨读的小字。中央开口与门前横穿路线已验证。

位置、数量拟合、尺寸和树冠形态为影像近似；高树复用CC0模型，树干姿态与照片存在差异。现有前场草坪／道路尚未完全对齐VR中的宽硬质广场，另列下一阶段；单车亦待按用户新照片更新。所有原参考仅留本地。


## Local v0.39 — 用户照片中的紫色共享单车

实际查看用户提供的紫车照片（本地references/phase33/purple-bicycle-user.png），重建洋红紫低跨弯管架、浅紫轮圈与银色细辐条、开孔黑前篮及支架、扫后车把、刹车线、浅紫边黑座、挡泥板、后轮环抱锁与简化链罩。两侧管身“南京大学”为系统楷体程序文字，校徽仅为简化轮廓；不复制原图像素，不编造可扫描二维码和无法辨认的小字。尺寸、隐藏部件与字体为视觉近似。

45辆原有车辆的位置、碰撞和交互保持；共享9份几何、2材质和1文字纹理，车辆节点及转向／踏板动画独立。几何缓冲7,367,760→484,456字节，网格540→495，三角形77,040→208,440；节省几何内存不等于已改善GPU帧时或温度。类型、ESLint、构建及Chrome／Edge25停车点骑出／上下车、动画独立验证通过；Pixel 7真实触屏模拟通过。两浏览器各5张最终图已实际查看，包括骑姿。


## Local v0.40 — 两馆连续硬质广场

重新实际查看官方VR `scene_gl-3-03` 的 f/l/r 高清面，按两馆已配准轮廓建立连续混凝土广场、泳馆两侧种植带与白色停车线、体育馆五处树穴。混凝土分缝为程序纹理，范围、分缝尺度、树穴及车位尺寸为影像近似；不使用原图作纹理。

以带洞多边形裁切原道路／草坪可见面，保留原地形物理网格，广场不新增碰撞。仅移除广场内两棵随机树及其代理，其他1,071个方盒碰撞保持。数学裁切、Chrome／Edge铺地覆盖、入口与步骑通行验证通过，两浏览器各九张最终图已实际查看。原始参考仅留本地，不提交或打包。


## Local v0.41 — 南园连续校界栅栏

用户围栏截图 `references/phase33/boundary-game-user.png` 明确外观方向及“更高、每一两跨校徽”的要求；官方VR gl-2-40、gl-2-42、gl-1-16用于校门／街道边缘核对，用户校园平面图经现有TPS配准后用于完整南园轮廓。截图本身是游戏反馈，不冒称实景照片；未知高度、跨距、转角和背侧为近似。104段、约1,407.08m模型轮廓包含55栋南园建筑，避开专家楼、汉口路／广州路人行道及地图拟合的小粉桥公共通路。三处校门开口约27.4／12／12m，东侧门按地图[3037,3212]修正至小粉桥校门；不是实测通道净宽。

栅栏高3.15m，浅石基柱与深铁杆，176处双面校徽复用现有官方开场校徽资源；原始参考不作为新纹理、不提交。按64m格子实例化，共享2几何／4材质，9,416实例的几何及矩阵共603,604字节（不含纹理／碰撞，不等于显存总量或帧率收益）。保留1,046旧方盒碰撞，仅替换25处旧南园短栏／东门设备，新增104面围栏代理及5个移动后的门设备。

类型、ESLint、构建、布局几何及Chrome／Edge通过；每浏览器1,040物理射线、1,040相机射线、214转角／门接缝射线、32条三门双向步骑路线、20次步骑阻挡与36条公共通路检查。两浏览器各8张最终截图已实际查看，校徽两侧文字没有镜像、广州门天空正常。测试阻挡起点曾落在沿街楼体附近，修正至门肩后通过，未改游戏碰撞迎合测例。北园当前仅保留汉口门两侧短墙，完整北园边界另版核实，不把本版称作南北园均完成。


## Local v0.42 — 北园北／东／南三侧栅栏

沿用南园高栏构造，依据用户校园平面图TPS配准描线，实际查看官方VR gl-2-42街道／门边影像，以及gl-1-16、gl-4-02鸟瞰和用户43:06视频的相关接触表；鸟瞰不能视为门口地面照片。用户boundary-game-user.png为游戏反馈截图，非实景。北园西侧仍缺可靠分界，保留未闭合状态，不封金银街／南秀村公共路。86段模型长1,252.68m、高3.15m，位置、高度与未见侧近似；为避出版社、地质实验楼及南侧长楼，描线按已配准轮廓校正，未声称测绘精度。

布局检查覆盖129栋建筑、无自交穿楼，最小楼间距约0.778m、汉口路人行道净距约1.195m，内部两处门缺口各12m。保留1,151个旧方盒碰撞，仅移除4个旧北墙并增加86个围栏代理；南园、楼体、固定地形与校门记录保持。南北园合计190面、334处双面校徽、17,780实例、164绘制批次，共享2几何／4材质，几何与矩阵共1,138,900字节（不含纹理／碰撞，非显存总量或帧率结论）。

类型、ESLint、构建、布局及Chrome／Edge均通过；每浏览器1,900物理射线、1,900相机射线、394接缝射线、48条四门双向步骑路线、20次步骑阻挡与60条公共路线（含汉口／广州两侧人行道）。两浏览器各8张最终图实际查看，校徽双面文字方向正确。小粉桥检查修正为真实有限路段，避免把中心线无限延伸到北园；骑行测例曾因115帧不足走完14m而失败，增至180帧后通过，未改游戏速度或碰撞迎合检查。报告留本地phase43，原before不覆盖，原始参考不提交打包。


## Local v0.43 — 汉口路门题字比例

- 实际重看本地用户门照片 `references/hankou-gate-user-target.png` 和官方 VR `scene_gl-2-40-f`，按字中心与相对高度修正整组比例。校名约5.25×1.04m、两柱字组高约3.28m；这些为影像拟合近似值，非实测。
- 沿用已有照片重建笔画轮廓，不新增原图纹理。两柱为“严肃活泼”“团结紧张”；照片中的临时迎新横幅未据此添加为常设设施。
- Chrome／Edge 各验证16个字网格不重叠越界、12条正门及左右人行门双向步骑路线；固定碰撞与非文字门几何哈希一致，各5视角最终图已实际查看。记录在本地忽略的 `docs/validation/phase44/`。


## Local v0.44 — 中大路两侧步道

- 实际查看官方 VR `scene_gl-2-22-f/r/b/l` 与既有漫游参考，按配准地图道路边缘补两侧独立步道、10段有低边的树带、东侧近门树穴。每侧范围约188m、树带宽4.25m、步道宽3.35m，位置和尺寸为影像近似。横向路口、图书馆及沿线入口保留开口。
- 可见地面与旧路缘裁切；4棵路口／树带端部的树及其碰撞代理移回相邻树带，其他树、地形碰撞和方盒碰撞保持。步道复用沥青纹理、按材质合并为4个网格；不宣称帧率或温度收益。
- 类型、ESLint、构建、Chrome／Edge通过；每浏览器18条双向步行／骑行路线、1,992个地面采样无漏铺或旧地面重叠，固定碰撞和剔除4棵已记录树移位后的方盒哈希保持，各6张最终图已实际查看。报告在本地忽略的 `docs/validation/phase45/`，before不可覆盖。原图不提交打包。


## Local v0.45 — 赛珍珠纪念馆

- 南京大学档案馆《百廿校庆·百廿建筑｜赛珍珠故居》，2023-12-24：https://dawww.nju.edu.cn/info/1201/10661.htm ，另见纪念馆官网：https://pearlsbuck.nju.edu.cn/zjbg/szzgj/index.html 。官方区位鸟瞰、用户地图plan-50共同确认位置为北园西墙附近、西南楼西侧；旧“实验楼”标注和academic wing备注为误识别，现同步纠正模型、地图搜索与地点介绍。图书馆对面的绿地另核，未将此楼移过去。
- 本轮实际查看官方东立面图／区位鸟瞰、视频帧0060、官方VR gl-2-05四面。官方记载建于1912年、2011年修复、2012-05-19开馆，约600平方米，含地下室阁楼共四层。图纸层高用于建模；注册轮廓、隐蔽立面、当前长脊及阁楼屋顶为近似，尚未完全复原交叉坡顶。
- 补灰砖两层、半地下百叶、深红窗框和百叶、双圆柱门廊、六级台阶、平台和阳台、金色门牌、封闭阁楼与五烟囱。使用256px原创程序砖纹理和按材质合并的几何，不嵌入原始参考像素。沿用原门前植树排除点，避免全校园随机树布局变化。
- 类型检查、ESLint、构建与Chrome／Edge专项通过：各17条入口／绕行路线、6处屋顶／阳台／门前射线、地图快捷键及释放鼠标后的按钮、唯一名称搜索和门前地面传送；保留453个无关固定碰撞，局部旧4代理替换为25代理，所有方盒、地图轮廓及无关楼／门记录保持。阳台压顶具有与可见面一致的碰撞。各5视角已实看，报告留本地phase46，before不覆盖。测试鼠标锁定时直接点击HUD会被canvas接收，已按真实M键流程处理；未修改产品来强制显示控件。原始参考不提交打包。

## Local v0.46 — 图书馆西入口对面绿地

- 实际查看南京大学官方VR https://vr.nju.edu.cn/newUI/#/ 的gl-2-22四面、gl-2-23四面、用户校园地图及漫游联系图。gl-2-22-l明确显示物理楼入口道路两边的草地、密集乔木、白刷树干和低绿篱；地图未填色区域不能直接当作硬地。纪念馆位置沿用v0.45核实结果。
- 沿现有地图道路边缘和v0.44步道边界补两片草地、24棵共享模型树、两段白色矮栏与横路叶片绿篱，仅裁切旧地面视觉面。树位、树高、栏杆形式和尺寸均为近似，横路宽度和不同时期景观差异待进一步核实。原图和视频不进游戏资源或Git。
- 类型检查、ESLint、构建通过；Chrome／Edge各20条双向步行／骑行路线、8次栏杆实际阻挡、2,039个地面采样通过，各5视角核对。固定地形碰撞、1,237个旧方盒碰撞及旧树固定模型矩阵保持；新增24树干和2矮栏碰撞。视向动态树冠不参与固定矩阵哈希。验证报告留本机phase47，原before基线不覆盖。


## Local v0.47 — 中山楼

- 实际查看用户中山楼照片（本地 references/phase33/zhongshan-user.png）与南京大学官方 VR https://vr.nju.edu.cn/newUI/#/ 的 gl-1-04 西侧院落画面；圆柱门廊和邻接松林楼关系支持西侧入口。保留地图 plan-77 轮廓，尺寸、地图配准、遮挡立面和完整屋顶均为近似。不可辨小字未编造，原图未加入游戏资源或提交。
- 专用模型补两层淡黄墙、灰台基、白框高窗、鼓肚黑铁窗网、双圆柱门廊、七级外阶、阳台石栏、门上楼名和独立石碑、灰坡屋顶、圆窗山花及红色小屋顶窗。屋顶合并同位顶点后计算共享法线，改善采样三角拼缝；植树排除仍用旧门点，避免无关树位重排。地图传送移到正门外5.5米地面。
- 类型、ESLint、构建与Chrome／Edge通过；每浏览器13条实际移动路线、5处碰撞射线、地图快捷键／按钮／唯一搜索及传送通过，各5张最终截图已实看。474个无关固定网格碰撞保持，中山楼旧4个替换为31个；全场方盒、其他楼门与静态实例保持。修复山花几何先变换再复制造成碰撞重复变换的问题，失败记录保留在本地phase49。原before及before-west基线不覆盖。


## Local v0.48 — 拉贝旧居

- 实际查看用户照片（本地 references/phase33/rabe-user.png）及南京大学官方 VR https://vr.nju.edu.cn/newUI/#/ 的 gl-1-08 四面。门廊、两层灰砖、奶白窗框、坡屋顶阁楼、圆孔阳台栏、双球灯、五级红阶和绿色“拉贝旧居”碑按照片近似重建，地图搜索仍为“拉贝纪念馆”。照片不作为纹理或提交资源。
- gl-1-08 热点与陶园南楼、篮球场的相对位置支持南向配准；XML 无经纬度或朝向值，绝对罗盘方向不是实测。地图 plan128 简化轮廓解释为包含门廊的整体范围，主墙退2.7m，把门廊和台阶放在校界内；尺寸及隐藏侧为近似。gl-1-16／gl-1-24 鸟瞰未提供清晰入口方位，不作为绝对朝向证据。
- 类型、ESLint、构建与Chrome／Edge专项通过：各12条入口／绕行路线、5处表面射线、地图搜索／传送；501个无关固定碰撞保持，旧4代理换26代理，原方盒、静态实例、道路、地图轮廓和其他门楼保持。新模型方盒角点及传送点校界净距通过，实际由门前向外行走被围栏阻挡。各5张最终图均已实际查看。报告留本地phase50，before不可覆盖。庭院绿化另版完善。

## Local v0.49 — 拉贝庭院

- 用户拉贝照片与官方VR gl-1-08 的共同证据：灰石板、浅色种植边缘和白刷树干；补四块种植区、四棵树及低地被，保留新照片的贴墙草地，不复制旧VR木栏。庭院轮廓、铺石规格、树位和尺寸为近似，院门位置未核实；原图不提交或分发。
- 铺地按三种材质合并，512px程序石板纹理，地被实例化；树模型与距离分级复用既有系统。裁切旧地面防止重叠，不更改旧门和台阶。
- 类型、ESLint、构建和Chrome／Edge专项通过。各12条实际通行／阻挡路线、5处表面射线、地图搜索／传送及2,768个地面采样通过；新增4树已确认进入Rapier碰撞世界，均在种植区并避开楼体和校界，旧随机树未占新铺地。527个旧固定网格、初始区域方盒、建筑与入口、旧静态实例保持；旧基线未采全场Rapier方盒，未声称该全集哈希相同。测试曾漏查扩展区碰撞，已修正采集来源。
- 两浏览器各7张最终画面实际查看，报告保留本机phase51。原v0.48 before基线不覆盖。

## Local v0.50 — 几何索引与等价验证

- 本版为几何存储优化，无新增照片或视频参考。保留原索引、独立法线／UV与三角顺序；非索引表面添加顺序索引，合并时按范围选择16／32位。原始照片不成为纹理。
- 几何专项覆盖2,901份混合图元与超过65,535顶点；types／ESLint／build通过。Chrome／Edge展开属性、全部固定方盒与527份实际注册三角网格一致，各424相机射线、2,312物理射线、四角色路线通过。各六张最终图已实看且逐像素零差异，绘制数和三角数一致。
- 几何缓冲减少27.7%（269.2→194.8MiB），受控GPU采样多数有小幅收益，CPU不一致；不可解释为整体内存、实际帧率或发热已解决。本机phase52保留原基线，脚本拒绝覆盖before；候选报告及媒体不提交。

## Local v0.51 — 鼓楼校医院入口

- 实际查看[官方 VR 校医院 note_191](https://vr.nju.edu.cn/newUI/static/krpano/image/notes/191.jpg)；热点位于鼓楼 scene_gl-1，浅灰金属宽雨棚、六字金色“南京大学医院”、四红褐方柱、玻璃门、约三级灰阶和银框防盗窗与医院交流照片一致。原图留在本机 references/phase53，不作为游戏纹理或提交素材。
- 医院院区已核实；照片不能证明入口精确对应楼块与方位。本版沿用 plan80 原程序入口位置，保留 plan81；两层平屋顶体量、配准及尺寸近似，不套用仙林左涤江医院。
- types／ESLint／build及Chrome／Edge专项通过；每浏览器11条实际路线、5处物理表面射线、医院搜索／传送通过。526份旧固定网格保留，原封闭门碰撞1份替换为9份入口实体碰撞；其他建筑、门、固定方盒和静态实例不变。动态树冠LOD矩阵排除在固定实例比较之外。
- 每浏览器四张最终图均实际查看。phase53保留原before及从v0.50补采的before-static（固定网格与原基线相同），禁止覆盖；报告与截图仅本机。Edge使用既有本地展开程序，未安装全局浏览器。


## Local v0.52 — 南园取件入口

- 实际查看用户 `references/phase33/parcel-building-game-user.png` 及现有场景对应视角：两层楼东立面两组窗，左侧 plan105、右侧 plan98 和前方树带吻合，定位为 plan100。用户明确纠正此处为取快递地点且有门；旧地图名“南芳园风味美食苑”保存在 old_name。原截图只留本地，不打包提交。
- 重新查看官方 VR gl-1-13 四面，未能证明这扇门的样式；未套用邻近店面的门。现有体量不变，新增简洁东侧双玻璃门并缩窄首层两窗；“南园快递取件点”为描述性名称，门材质、尺寸及字体均近似，正式名称待核实。
- types／ESLint／build与Chrome／Edge专项通过；各9条实际步行路线、3处门表面射线、地图快捷键／按钮、快递／取件搜索及东门外传送通过。534份无关固定网格保留，原北门1份换为东门1份；无关楼门、固定方盒、静态实例及相机碰撞保持。phase54原baseline不覆盖；每浏览器三张最终画面均已查看，无网页错误或缺失资源。


## Local v0.53 — 金银街苏富特大楼西侧围栏

- 实际查看官方鼓楼 VR gl-4-05 的街景面及用户校园地图西侧裁图：浅色高基座、黑色竖栏与浅色柱；本机参考 `references/official-vr/phase10/scene_gl-4-05-{l,b}.jpg` 和 `references/gulou-campus-plan-user.png` 不提交、不作为纹理打包。
- 沿苏富特大楼西侧新增3段约52米栏杆，复用实例化几何、材质和间隔校徽。基座1.1米、总高3.15米、地图配准与校徽间距为近似；保留运输中心入口与金银街公共路，northComplete仍为false，未核实段不宣称封闭完成。
- 布局净距、types／ESLint／build与Chrome／Edge验证通过。各16条双向步骑公共路线、12条围栏阻挡路线、1,930条物理射线、1,930条相机射线和402条接缝射线通过；旧1,267个固定方盒连同重复数量保留，仅增3个，旧固定网格、静态实例、楼体、门及校门保持。每浏览器三张最终图实看，无网页错误或缺失资源。
- phase55原before与失败诊断保留不覆盖。原西北门路线失败来自固定2200帧最多步行60.5米，小于约65米路线；按距离与速度分配预算后，改前改后双浏览器皆通过，未修改Player／Rapier。浏览器元数据的undefined字段按与基线相同的JSON格式比较。

## Local v0.54 — 金银街行道树与苏富特楼名

- 实际查看官方 VR `scene_gl-4-05-{l,b}.jpg` 与用户校园图西侧裁图；成熟阔叶树位于浅色围栏基座临街侧，树干刷白。新增七棵，树位、树高、树种、树龄和模型形状为近似，未声称逐株实测。原始参考仅本机保存。
- 用户地图确认 plan-12 为“苏富特大楼”，修正布局、生成器和边界语义名；正确的“苏浙运动场”保持。楼体仍为通用近似立面，实体题字尚未制作；地图与门口交互使用修正名称。
- 独立实例化树群复用现有模型／材质缓存及植被LOD，保持旧树矩阵。types／ESLint／build通过；Chrome／Edge各28条双向步骑路线和28条树干射线通过，1,270个旧固定方盒全部保留，仅增七个树干。旧固定网格、静态实例、world.solids与校门保持，楼体／门仅改名称。零网页错误与缺失资源，每浏览器五张最终截图实看。
- phase56原before不覆盖；测试按JS形状精度用1e-5容差，地图搜索后显式点关闭按钮，再截图。入口截图只证明立面现状，不证明实体题字已实现。

## Local v0.55 — 苏富特大楼庭院立面

- 实际查看官方鼓楼 VR gl-4-10 的 f/b/l/r 四面，以及 gl-4-05 b/l、gl-4-06 b/r 与用户地图。gl-4-10 f 为逸夫管理科学楼门廊，b 可读田家炳艺术书院竖排字，l 对应西侧苏富特大楼；未将 gl-4-05 b 尚未确认的低层玻璃入口移植到此楼。
- 六层浅色立面、中央横窗与挑板、细竖构件、北端成对小窗采用程序几何，窗框沿用距离显隐。保留19.5米旧外壳与入口；尺寸、下部遮挡窗、未见侧和楼梯间屋顶高差仍待核实。512×96程序楼名牌是用户要求的临时名称标识，位置／字体并非已核实原题字。
- types、lint、build通过；Chrome／Edge各20条双向步骑路线和楼名搜索通过，无网页错误／缺失资源。旧固定碰撞网格、方盒、world.solids、门／校门、无关楼记录及受检静态实例保持；植被LOD和已排除的树／边界实例不在该静态实例比较口径中。各四张最终截图实看，并修复名牌被竖构件遮字及验收镜头进入邻楼的问题；原before基线保留。


## Local v0.56 — 田家炳艺术书院体量与立面

- 实际查看官方 gl-4-08、gl-4-09 四面、gl-4-10 b 及用户校园地图：北侧五层正面、东侧入口和“田家炳艺术书院”楼名相互对应。移除旧 plan17 十一层与“艺术学院”误称；未将相邻高楼层数套用到此楼。
- 北／东窗列、北侧细竖构件与遮阳板、中央褐石区域内两对小窗、金色竖排字、东侧褐色门口按影像细化。高度16.25米、具体尺寸、程序字体与隐藏南／西侧近似；庭院绿化和雕塑尚未补齐。
- types／lint／build、Chrome／Edge 各24条双向步骑路线、实体屋顶射线、搜索通过；各四图实际查看，零页面错误和缺资源。phase58 保留原 before 基线，仅替换该楼外壳与旧门两份碰撞，其余固定网格、固定方盒、门／校门与受检静态实例保持。

## Local v0.57 — 田家炳庭院草坪与入口绿地

- 再次实际查看官方 VR gl-4-10 b、gl-4-09 f/l/r：北庭院矩形浅边草坪、灰色交错砖铺地，东门两侧低围边绿地、两棵白刷树干大树。原始参考仅本地，不提交。
- 增加三块草坪和三份合并表面网格，裁切覆盖此处的旧视觉铺装；旧道路物理表面保持。两棵树复用已有CC0模型缓存和分区LOD，未重排旧植被。庭院及草坪米制尺寸、树位／高度、树种与砖纹为近似，雕塑尚未建模。
- types/lint/build通过；Chrome／Edge各44条双向步骑路线、8条树干射线和地图搜索通过，各4最终截图已实看，无网页错误／缺失资源。535旧固定网格、1277旧固定方盒、938基础solids及无关静态实例／楼体／门／校门保持，只增两树干碰撞。phase59基线不覆盖。

## v0.58 逸夫管理科学楼贯通入口

- 实际查看官方 VR gl-4-10 f 的2304px原面和入口局部，gl-4-02 r 竖字与用户地图确认楼名。实景可见中央贯通、两根石柱、深色侧玻璃、三层浅台阶、檐底方格灯与灰方盆植物；照片与裁切只在本地保存。
- [终身教育学院官网](https://slle.nju.edu.cn/)及其[干部教育培训页面](https://slle.nju.edu.cn/sy/ldpxxm/gbjypx/index.html)核实学院名称和全国干部教育培训高校基地。牌文可见前缀来自实景，被植物遮挡的“院”“基地”依据官网名称补全，末字排列与字体未获照片完整证实。未误写为商学院。
- 南入口和北出口以既有地图轮廓拆分可碰撞楼壳，保留32.5m旧楼高。柱廊宽深、4.06m通行净高、0.42m地板、前后浅阶及隐藏通道饰面均为近似；楼上立面仍需下一版核实。
- Chrome／Edge 各40条双向步行／骑行路线、19组人物及相机射线、地图搜索通过；仅替换旧壳与通用门2份碰撞为20份分块实体，其余固定网格、方盒、道路、楼门和受检实例保持。各四张最终截图已实际查看，报告位于忽略的 docs/validation/phase60，原before不覆盖。入口几何按材质合并，小灯不新增独立光源，植物不使用透明叠层。


## v0.59 逸夫管理科学楼上部体量与屋顶

- 实际重看[官方 VR](https://vr.nju.edu.cn/newUI/) gl-4-10 f/u完整图、入口与屋顶局部，以及gl-4-02 r西北侧照片。全上视图用于区分楼翼退让与透视缩短，侧图确认金色竖排楼名、顶部长窗和独立端翼蓝灰屋顶。原图仅本地保存。
- 五翼共同上部16排窗、浅色立面、中央百叶与栏杆、端面长暗窗及三组屋顶。58.2m共同檐高、约18层解释、屋顶服务间及悬挑尺寸、隐藏侧立面为近似重建，不声称官方楼层确认。官方建筑API响应截断，未作为层数依据。
- v0.58贯通入口保持；只替换1份旧上部壳碰撞为5份楼翼与22份屋顶实体。types/lint/build通过；Chrome／Edge各40条双向步骑路线、29组人物及相机射线、搜索与无关几何检查通过，零网页错误及缺失资源。各5张最终画面已实看，报告位于忽略的docs/validation/phase61，before不覆盖。
- 立面及屋顶构件按材质合并，装饰窗格使用现有细节层；无新增逐帧逻辑或独立灯光。


## v0.60 唐仲英楼北庭院立面

- 实际查看[官方 VR](https://vr.nju.edu.cn/newUI/) gl-4-05 f/r/b/l、gl-4四面和局部下视图、gl-4-02 f/l，并结合官方场景标题及近似坐标定位北庭院。石面格网、窄竖窗、蓝灰玻璃连接面、顶部细钢架和北翼端面玻璃来自可见影像。没有把gl-4-04中美文化研究中心的立面移植过来。
- 复核画面后，把最初过度凸起的窗套修为连续石面中的内凹窗；石板接缝用一张共享256×128程序纹理，不含参考照片像素。窗格复用现有距离细节层，构件按材质合并，不新增逐帧逻辑或独立灯光。
- 原19.5米壳体及入口保持，六排窗、窗位、所有尺寸和隐藏立面近似。gl405 f可见深入口，但尚未准确定位，未据此挖贯通洞。院外公共通路及西校界仍待核实，不能盲封。
- types/lint/build通过；Chrome／Edge各20条双向步骑路线、搜索、旧碰撞/方盒/门/校门/道路及受检实例保持检查通过，零网页错误和缺资源，各四张最终画面实看。报告在忽略的docs/validation/phase62，成功before基线不覆盖。首次基线路线贴树的骑行失败另存，修正测试路线后通过。原始参考媒体仅本地保存。

## v0.61 唐仲英楼北庭院凹入口

- 实际查看官方 [鼓楼VR](https://vr.nju.edu.cn/newUI/) gl-4-05 f 2560px全景面的800px缩图及入口裁切；来源场景见docs/sources/official-newui-gulou.xml，原图references/official-vr/phase63仅本地。
- 可见深凹入口、石柱、格网檐底、侧玻璃与红色安全条、后部深色门框。不能证实贯穿整翼；因此保留后部实体玻璃边界，不臆造通道。入口8.5m宽、6.2m退深、6.55m净高与0.12m地坪等尺寸均为近似；上部19.5m楼高沿用。
- 拆分凹口底层楼壳／完整上壳／入口地板，人物与相机碰撞同步；移除旧西侧猜测门，将楼门移到北庭院。共享立面材质，檐灯只用发光材质，不新增动态灯或逐帧逻辑。
- types/lint/build及Chrome／Edge各32条双向步骑路线、21组人物／相机射线、搜索与无关几何检查通过，零网页错误／缺资源；各4张最终画面实际查看。报告docs/validation/phase63，before-chrome成功基线不覆盖。

## v0.62 唐仲英楼庭院铺装与种植带

- 实际查看官方 [鼓楼VR](https://vr.nju.edu.cn/newUI/) gl-4-05 f/r/b/l（f高清面及800px缩图），结合用户地图核对入口前粗粒灰地坪、侧玻璃前方格铺装、北翼东端外浓密灌木与浅色低边。原媒体仅本地，纹理为程序生成或既有许可资产。
- 地坪按楼体庭院平面裁切并排除铺装与种植带；新增4份合并表面网格与1份静态叶片实例，无新增灯、逐帧生成、碰撞或全校植被重排。尺寸和遮挡的种植范围近似。院墙、伸缩门、短柱与井盖尚未建模，继续核实，不能因此封住金银街。
- types/lint/build通过；Chrome／Edge各40条双向步骑路线、21组入口人物／相机射线、搜索与旧几何保持检查通过，无网页错误／缺资源，各4张最终图实看。报告docs/validation/phase64，成功before-chrome不覆盖。

## v0.63 唐仲英楼朝金银街开放院门

- 实际查看官方 [鼓楼VR](https://vr.nju.edu.cn/newUI/) gl-4-05 b/l/r，核对北侧浅方砖院墙、收拢银门与凸面镜、南侧停车P牌柱。来源场景见docs/sources/official-newui-gulou.xml，原图references/official-vr/phase10仅本地。
- 位置、尺寸与遮挡面近似；院口保持开放，院墙不等同全校围墙，不据此封闭金银街公共道路。新增3份简单碰撞，相机使用可见合并网格；凸镜为静态材质，无实时反射。
- types/lint/build及Chrome／Edge各48条双向步骑路线、30组人物／相机射线、搜索与旧几何保持检查通过，零网页错误／缺资源，各4张最终图实看。报告docs/validation/phase65；成功before-chrome不覆盖。

## v0.64 唐楼院角短柱、锥筒与井盖

- 实际查看官方 [鼓楼VR](https://vr.nju.edu.cn/newUI/) gl-4-05 r，三根黑黄圆短柱、两只方形锥筒及圆井盖可见；尺寸、摆位及锥筒细节为近似，不照搬倒地临时设施。井盖字样不可辨读，未虚构校徽或文字。原图仅本地。
- 新增5份简单方盒碰撞，3种合并静态材质；井盖不增加碰撞或相机阻挡，无动态灯或逐帧生成。保留院口、柱间、院角与公共街道通路。
- types/lint/build通过；Chrome／Edge各56条双向步骑路线、40组人物／相机射线、搜索和旧几何保持检查通过，零网页错误／缺资源，各4张最终图实看。报告docs/validation/phase66；成功before-chrome不覆盖。

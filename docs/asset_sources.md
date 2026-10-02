# 资产来源与使用范围

当前本地版本 v0.7.0。游戏资产、空间基准和建模参考分别列出，第三方资料保留各自权利。

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

# 资产来源与使用范围

当前本地版本 v0.6.0。游戏资产、空间基准和建模参考分别列出，第三方资料保留各自权利。

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

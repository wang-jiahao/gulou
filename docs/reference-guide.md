# 参考资料导览

主要参考南京大学官方 VR、鼓楼校区平面图、校园漫游视频，以及用户补充的建筑与设施照片。本页挑选有代表性的资料，方便理解模型依据；完整资产来源与许可见 [资产说明](asset_sources.md) 和 [第三方资源说明](../THIRD_PARTY.md)，逐版使用记录见 [开发历史](development-history.md)。

**下列本地图片和视频仅在这台电脑保留原文件时可预览。** 它们位于被 Git 忽略的 `references/` 或项目根目录，原媒体不复制进文档目录、不提交、不打包、不上传。外部读者请使用各项的官方页面或原视频链接；用户提供但未附公开链接的素材，保留本地说明。可观看或可下载不代表获得再分发许可。

## 官方 VR 与空间布局

| 资料 | 主要用途 | 使用边界 |
| --- | --- | --- |
| [南京大学官方 VR 校园](https://vr.nju.edu.cn/newUI/#/) | 从正面、侧面、鸟瞰和相邻视点核对建筑外观、门廊、道路与空间关系 | 全景有透视畸变、拍摄年代和遮挡；不能把画面比例当成精确尺寸 |
| [南京大学资产管理处：鼓楼校区地图](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html) · [2024 年地图 PDF](https://zcc.nju.edu.cn/DFS//file/2024/09/20/20240920103404667kkasuw.pdf) | 核对南北园布局、建筑编号和名称、道路及出入口；与旧图配准 | 示意图与图像配准用于空间对应，拟合残差不等于实地测绘误差 |
| [OpenStreetMap 核心建筑占地示例](https://www.openstreetmap.org/way/88778620) | 补充地理基准、建筑占地和周边公共道路关系 | 开放数据同样可能有误差或更新滞后；涉及数据保留 ODbL 署名 |

### 北大楼与前庭：官方 VR 代表视点

<img src="../references/official-vr/phase9/scene_gl-3-05-f-full.jpg" width="680" alt="南京大学官方VR gl-3-05视点的北大楼、前庭道路、草坪与树木">

本地文件：[`scene_gl-3-05-f-full.jpg`](../references/official-vr/phase9/scene_gl-3-05-f-full.jpg)。来源为官方 VR `gl-3-05` 前方全景面，用于核对北大楼立面、前庭道路和绿地关系。它是一张参考照片，不是游戏画面；树种、株位和模型高差仍需多视点确认。

### 鼓楼校区 2024 年平面图

<img src="../references/phase19/gulou-plan-2024.png" width="460" alt="南京大学鼓楼校区2024年平面图的本地渲染图">

本地 [地图图像](../references/phase19/gulou-plan-2024.png) / [地图 PDF](../references/phase19/gulou-plan-2024.pdf)。来源为上表资产管理处地图。用于区分新教学楼、南教学楼、南园教学楼，以及南北园建筑与道路；图像中的符号和配准结果不直接等于现实道路宽度或地面高程。

## 两段主要校园漫游视频

### 鼓楼校园步行漫游

[原视频：YouTube](https://www.youtube.com/watch?v=aGgqEV3syjw) · [本地视频](<../【Remastered 4K】Once China’s Central University_ Nanjing University Gulou Campus Walk _ 漫步南京大学鼓楼校区_480p.mp4>)

<video controls preload="none" width="720" poster="../references/video-walk/1722.jpg" src="../【Remastered 4K】Once China’s Central University_ Nanjing University Gulou Campus Walk _ 漫步南京大学鼓楼校区_480p.mp4"></video>

本机文件长约 43 分 06 秒、854×480；标题包含“4K”，不表示本地下载文件具有 4K 分辨率。资料用于核对连续步行中的道路衔接、建筑入口、台阶和校园设施。上方封面来自本地 28:42 帧，画面为林荫道路；具体细节还需回看相邻片段和官方 VR，单帧无法证明完整空间关系。

### 南京大学徒步参观

[原视频：Bilibili BV1iL411h7G2](https://www.bilibili.com/video/BV1iL411h7G2/) · [本地视频](../references/phase18/bili-walk.mp4)

<video controls preload="none" width="720" src="../references/phase18/bili-walk.mp4"></video>

原页面标题为《南京大学/徒步参观/中国最古老和最著名的大学之一》，本地元数据记载时长 53 分 45 秒。结合第一段漫游和官方 VR 补充校园道路、楼体与入口观察。视频是不同时间的记录，临时围挡、停放车辆和偶发设施不会直接当作永久校园布局。

若 Markdown 阅读器不支持内嵌视频，请使用每项的“本地视频”链接；没有本地文件时使用原视频链接。

## 局部补充视频与用户照片

| 资料 | 本地文件 / 外部来源 | 用途与边界 |
| --- | --- | --- |
| 广州路门口实拍，67 秒 | [本地视频](../references/phase18/guangzhou-gate-walk.mp4) · [Bilibili BV1HT4y1U7TE](https://www.bilibili.com/video/BV1HT4y1U7TE/) | 00:00–00:03 与 00:23 附近用于核对牌墙、金色中英文题字、石墩和门上交通牌；拍摄于 2022 年，门区尺寸与未见侧仍为近似 |
| 北门周边补充视频 | [本地视频](../references/phase110-user/north-gate-user.mp4) · [10 秒帧](../references/phase110-user/north-gate-10s.jpg) | 用户提供的带原平台界面视频，用于结合行走过程检查门内道路和周边设施；未记录独立公开链接，不能仅凭局部画面推定整段围墙的面板数量或顺序 |
| 陶园三舍入口照片 | [本地照片](../references/phase96-user/taoyuan-3-entry.png) | 用户提供，原发布者信息保留在水印中；核对灰墙、浅色墙面、“3 陶园”牌、右侧阳台与左侧入口，照片不足以独立证明整栋层数或遮挡立面 |

<img src="../references/phase96-user/taoyuan-3-entry.png" width="380" alt="用户提供的陶园三舍入口照片，保留原平台水印">

<img src="../references/phase110-user/north-gate-10s.jpg" width="290" alt="用户提供的北门周边视频10秒帧，门内道路与绿化局部">

照片和视频保留原有水印与出处，不作为游戏建筑贴图直接使用。部分用户截图来自其他平台，原作者的权利和再分发许可没有因为转交参考而改变。

## 官方建筑资料与分发资产

- [南京大学官网](https://www.nju.edu.cn/)与院系页面用于核对校名、机构及校园介绍；[教务处新教学楼、南教学楼说明](https://jw.nju.edu.cn/33/b6/c24683a603062/page.htm)用于区别相邻教学建筑。
- [南京大学档案馆：图书馆资料](https://dawww.nju.edu.cn/info/1201/10631.htm)补充现代馆入口照片；[西南楼资料](https://dawww.nju.edu.cn/info/1201/10581.htm)补充建筑历史、用途和形态。不同年代的照片不强行合并为同一时刻的实景。
- [Wikimedia Commons](https://commons.wikimedia.org/)中的建筑照片作为补充参考，每张素材按各自来源和许可处理；不能把整个站点视为统一公版图库。
- [Poly Haven Tree Small 02](https://polyhaven.com/a/tree_small_02)、[天空](https://polyhaven.com/a/kloppenheim_06_puresky)及其 CC0 材质用于可分发游戏资产；它们不是南京现场树种、天空或逐株测绘记录。
- [MakeHuman 图形资产许可](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md)是人体基础资产的许可依据；应用源码和图形资产许可分开处理，具体使用见 [第三方资源说明](../THIRD_PARTY.md)。

本页的来源用于支持创作与核对。游戏仍是资料支持下的近似重建，既不是南京大学官方产品，也不是精确测绘成果。返回 [README](../README.md)。

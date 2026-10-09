# 参考资料导览

主要参考南京大学官方 VR、鼓楼校区平面图、校园漫游视频，以及用户补充的建筑与设施照片。以下原始页面与视频链接说明模型依据；完整资产来源与许可见 [资产说明](asset_sources.md) 和 [第三方资源说明](../THIRD_PARTY.md)，逐版使用记录见 [开发历史](development-history.md)。

## 参考使用范围的核对

按已记录的建模任务去重，官方VR明确支持77个版本；指定YouTube步行漫游明确支持至少5个版本，另有未标明平台的漫游记录不强行归类。早期VR审计记录92个视点/368个方向、79栋含具体VR视点的建筑；YouTube抽帧元数据记录53个不同时间点。这些是可复核的记录口径，不是完整浏览历史，也不能把下载文件数当成实际观看次数。因此本文将官方VR列为主要建筑参考，两段漫游视频作为重要补充。

## 官方 VR 与空间布局

| 资料 | 主要用途 | 使用边界 |
| --- | --- | --- |
| [南京大学官方 VR 校园](https://vr.nju.edu.cn/newUI/#/) | 从正面、侧面、鸟瞰和相邻视点核对建筑外观、门廊、道路与空间关系 | 全景有透视畸变、拍摄年代和遮挡；不能把画面比例当成精确尺寸 |
| [南京大学资产管理处：鼓楼校区地图](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html) · [2024 年地图 PDF](https://zcc.nju.edu.cn/DFS//file/2024/09/20/20240920103404667kkasuw.pdf) | 核对南北园布局、建筑编号和名称、道路及出入口；与旧图配准 | 示意图与图像配准用于空间对应，拟合残差不等于实地测绘误差 |
| [OpenStreetMap 核心建筑占地示例](https://www.openstreetmap.org/way/88778620) | 补充地理基准、建筑占地和周边公共道路关系 | 开放数据同样可能有误差或更新滞后；涉及数据保留 ODbL 署名 |

### 北大楼与前庭：官方 VR 代表视点

[南京大学官方 VR](https://vr.nju.edu.cn/newUI/#/) 的 `gl-3-05` 前方全景面用于核对北大楼立面、前庭道路与绿地关系。树种、株位与高差需要结合相邻视点判断，单张全景不能提供精确尺寸。

### 鼓楼校区 2024 年平面图

[资产管理处地图页面](https://zcc.nju.edu.cn/dzdt/glxqdt/index.html)与[2024 年地图 PDF](https://zcc.nju.edu.cn/DFS//file/2024/09/20/20240920103404667kkasuw.pdf)用于区分新教学楼、南教学楼、南园教学楼，以及南北园建筑与道路。图像中的符号和配准结果不直接等于现实道路宽度或地面高程。

## 两段主要校园漫游视频

### 鼓楼校园步行漫游

[YouTube：《Once China’s Central University — Nanjing University Gulou Campus Walk》](https://www.youtube.com/watch?v=aGgqEV3syjw)

用于核对连续步行中的道路衔接、建筑入口、台阶和校园设施。例如 28:42 附近的林荫道路可辅助观察道路与树木关系；具体细节仍需回看相邻片段并与官方 VR 交叉核对，单帧无法证明完整空间关系。

### 南京大学徒步参观

[Bilibili：《南京大学/徒步参观/中国最古老和最著名的大学之一》](https://www.bilibili.com/video/BV1iL411h7G2/)

结合第一段漫游和官方 VR 补充校园道路、楼体与入口观察。视频是不同时间的记录，临时围挡、停放车辆和偶发设施不会直接当作永久校园布局。

## 局部补充视频与用户照片

[Bilibili：广州路门口实拍 BV1HT4y1U7TE](https://www.bilibili.com/video/BV1HT4y1U7TE/) 的 00:00–00:03 与 00:23 附近用于核对牌墙、金色中英文题字、石墩和门上交通牌。视频拍摄于 2022 年，门区尺寸与未见侧仍为近似。

用户补充的照片与视频用于校对北门周边道路、陶园三舍入口，以及南园三舍的内凹门厅、雨棚、宽台阶和两侧坡道。照片可支持可见形式的重建，不能独立确定整栋层数、被遮挡立面或实测尺寸。

## 官方建筑资料与分发资产

- [南京大学官网](https://www.nju.edu.cn/)与院系页面用于核对校名、机构及校园介绍；[教务处新教学楼、南教学楼说明](https://jw.nju.edu.cn/33/b6/c24683a603062/page.htm)用于区别相邻教学建筑。
- [南京大学档案馆：图书馆资料](https://dawww.nju.edu.cn/info/1201/10631.htm)补充现代馆入口照片；[西南楼资料](https://dawww.nju.edu.cn/info/1201/10581.htm)补充建筑历史、用途和形态。不同年代的照片不强行合并为同一时刻的实景。
- [Wikimedia Commons](https://commons.wikimedia.org/)中的建筑照片作为补充参考，每张素材按各自来源和许可处理；不能把整个站点视为统一公版图库。
- [Poly Haven Tree Small 02](https://polyhaven.com/a/tree_small_02)、[天空](https://polyhaven.com/a/kloppenheim_06_puresky)及其 CC0 材质用于可分发游戏资产；它们不是南京现场树种、天空或逐株测绘记录。
- [MakeHuman 图形资产许可](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md)是人体基础资产的许可依据；应用源码和图形资产许可分开处理，具体使用见 [第三方资源说明](../THIRD_PARTY.md)。

本页的来源用于支持创作与核对。游戏仍是资料支持下的近似重建，既不是南京大学官方产品，也不是精确测绘成果。返回 [README](../README.md)。

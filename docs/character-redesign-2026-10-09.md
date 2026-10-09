# 人物整体重做：设计与准确断点

用户最新要求是整体重做，旧人物“太丑”，参考大型游戏。v107仅是技术修补，不算美术验收。当前正式游戏仍v0.109/158a40e；新原型未达标，未替换正式资产。

## 已实际查看的参考

- Square Enix《Life is Strange: True Colors - Meet The Cast》：https://www.square-enix-games.com/en_EU/news/life-is-strange-true-colors-meet-the-cast 。正文正常可读，原图在页面一直显示loading；经同一查询的图片结果实际查看了发行商署名的Ryan半身图及Alex图，参考分层发束、自然眼窝眉形、有厚度的日常服装。仅参考设计原则，不复制模型/角色身份，不导入其游戏素材。
- lifeisstrange.com入口触发企业网关验证，没有绕过。转为独立可访问的发行商来源。GitHub官方资产树API返回403 rate limit，不是游戏故障；没有完成新资产下载。
- 旧人物本地v107正面/双人图、v110四轮原型均实际查看。

## 新设计方向

偏写实、适度风格化的原创成年校园角色。先头身比例、轮廓与辨识度，再做细纹：男生自然短侧分、明确眉眼、较利落下颌，女生分层及肩发与独立脸型，避免只把男模横向缩小。服装采用有真实肩线和厚度的短外套/针织内搭、自然直筒裤与比例合适的鞋，男女有不同剪裁与配色。保留校园身份，不做盔甲、夸张战斗服或照搬某个游戏角色。

## 为什么原方案不够

旧smoothBody丢弃原始UV，改用位置投影，皮肤只有顶点色，难以提供眼周/唇色等真实层次。旧衣服由分开的环带/袖筒拼成，肩口和领口难以连续；单纯提高面数或叠发丝不能解决造型。原型用连续服装壳与新分层发束试验后，轮廓虽变，但领口/衣摆边缘仍粗糙，眉眼/皮肤仍像中性模型，离参考品质很远。不能因正常渲染或三角形计数就说重做完成。

## 已做但未采用的原型

本机忽略目录docs/validation/v0.110含：
- student-{male,female}-baseline.glb：从v109保存的基线，绝不覆盖。
- build-student-prototype.mjs、student-hair.mjs：四轮造型实验生成器；第四轮时输出曾指public；第五轮已改为独立原型目录，接续以当前脚本为准。
- student-{male,female}-prototype.glb：末轮输出。
- avatar-prototype.ts、preview.html：独立正常UI预览，复用游戏动画，读取原型模型。
- male-prototype-four.png、pair-prototype-not-accepted.png：未验收画面，不当完成图。

生成均成功，正常预览console error为空；未进行完整资源/权重/动作/校园整合回归，也未测GPU。原型没有达到美术要求，因此正式三个GLB和build-student生成脚本已恢复为158a40e；没有残留student-hair模块在scripts。用户浏览正式游戏看到的仍是原角色，必须明确这一点。QA tab12已关，4173服务复用。

## 第五轮：保留UV与独立形体的数据流程已建立

新增scripts/character-surface.mjs：一次Catmull–Clark细分保留原始UV岛；UV接缝拆点前统一法线。双岛平面用例通过，实际头部17,616顶点/34,368三角形/385处UV副本检查通过，接缝法线一致、UV保持0—1。此计数只是头部表面，不是整个游戏角色。

新增scripts/character-source.mjs：读取CC0 OBJ与男女成年形变数据，先在原始单位应用形变，再统一归一化到1.75米；从同一变形后的关节标记重建关节位置。基础顶点/UV/拓扑与旧human-data一致检查通过，男女各有独立头部及眼部坐标；不是仅横向缩放同一个模型。

主仓库Git读取成功，官方形变已保存本机assets/source-models/character/asian-{male,female}-young.target，来源commit a8bc2d54ff0ac92e78ff71431b1023eda42bf482。没有引入MakeHuman应用代码。官方download_assets_git.py中引用的makehuman-assets仓库克隆要求认证，停止该路径，未获取皮肤贴图；不把它当游戏故障。

独立原型生成器已改为调用这两个模块、输出仅docs/validation/v0.110/student-{male,female}-prototype.glb，不再写public。第四轮模型另存*-prototype-four.glb，原baseline不变。第五轮正常UI男女正面已实看，截图male/female-prototype-five.png；新脸型可区分，但皮肤、唇眼、发顶空隙和衣领仍未达标。原型console error为空，tab13已关；完整动作/校园/GPU仍未验。正式游戏和生成脚本未变，人物仍未完成。

## 下一步可执行工作

UV与基础形体流程已具备；继续建立可重现的原创造型配置，核对可再分发的基础形变/皮肤资产来源，必要时采用新的合法基础资产。重建连续肩袖、干净领口和衣摆拓扑，而非反复补接缝。新模型至少同时检查正面/侧前/侧面/背面、近景和正常第三人称距离，再回归站走跑坐骑飞及持球动作。外观未达标时继续独立迭代，不升版本掩盖未完。

恢复预览：http://localhost:4173/docs/validation/v0.110/preview.html 。不需要重启服务。下一轮不要重复做v109导航/喷泉检查或重新拉取整段聊天。人物仍为需求表54“未完成”，宣传片继续后置。

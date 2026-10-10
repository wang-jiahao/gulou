export const collegePortraitOrder=['bingwen','xingzhi','youxun','anbang','yuxiu','kaijia','jianxiong'] as const;
export type CollegeId=typeof collegePortraitOrder[number];
export type CollegePortrait={asset:string;source:string;credit:string;license:string;licenseUrl:string;changes:string};
export type CollegeStory={college:string;person:string;role:string;paragraphs:readonly [string,string];source:string;portrait:CollegePortrait|null};
const official=(id:string,day='20201129')=>`https://xsxy.nju.edu.cn/xygk/syjs/${day}/i${id}.html`;
const publicDomain=(id:CollegeId,file:string,credit:string):CollegePortrait=>({
 asset:`assets/portraits/colleges/${id}.webp`,source:`https://commons.wikimedia.org/wiki/File:${file}`,credit,
 license:'公共领域（PD-China）',licenseUrl:'https://commons.wikimedia.org/wiki/Template:PD-China',changes:'从历史照片裁切为竖幅，转灰度并缩放；未生成或重绘面容。',
});

/** Names and biographical facts checked against the seven current college
 * pages linked by NJU's Freshman College. Order is official-list order, not
 * evidence for the physical sequence of the north-gate noticeboards. */
export const collegeStories:Record<CollegeId,CollegeStory>={
 bingwen:{college:'秉文书院',person:'郭秉文',role:'教育家 · 国立东南大学校长',
  paragraphs:['1914年获哥伦比亚大学教育学博士学位，回国参与南京高等师范学校筹建，先后担任南高师、国立东南大学校长。','倡导“三育并举”与“四个平衡”的教育理念，注重学生人格养成。秉文书院以他的名字命名，传承教育报国精神。'],
  source:official('170993'),portrait:publicDomain('bingwen','Guo_Bingwen.jpg','原载《Who’s Who in China》第3版，1925年，第434页；摄影者不详。')},
 xingzhi:{college:'行知书院',person:'陶行知',role:'教育家 · 生活教育的倡导者',
  paragraphs:['毕生从事平民教育事业，身体力行，将教育与普通人的生活紧密联系。行知书院以他的名字命名。','书院传承“生活即教育，社会即学校，教学做合一”的理念，鼓励学生在学习专业知识的同时参与社会实践。'],
  source:official('170994'),portrait:publicDomain('xingzhi','Hu_Shih,_John_Dewey_and_others.jpg','1919年上海合影，后排左起第三人为陶行知；来源《胡适文集》第二卷；摄影者不详。')},
 youxun:{college:'有训书院',person:'吴有训',role:'物理学家 · 国立中央大学校长',
  paragraphs:['1920年毕业于南京高等师范学校，1925年获芝加哥大学博士学位。在X射线散射研究中，为康普顿效应的确立作出贡献。','曾任南京大学前身国立中央大学校长，重视物理学人才培养。有训书院以他的名字命名，传承严谨求实的治学精神。'],
  source:official('170995'),portrait:publicDomain('youxun','吳有訓.jpg','原载杨家骆编《民国名人图鉴》，辞典馆，1937年。')},
 anbang:{college:'安邦书院',person:'戴安邦',role:'无机化学家 · 化学教育家',
  paragraphs:['长期在南京大学任教，参与创立中国化学会、创办期刊《化学》，并创建南京大学配位化学国家重点实验室。','倡导“全面科学教育”，重视科学知识、思维方法、精神与品德的共同培养。安邦书院以他的名字命名。'],
  source:official('170996'),portrait:{asset:'assets/portraits/colleges/anbang.webp',source:'用户提供的戴安邦历史肖像，2026-10-10',credit:'原图含百度百科水印；摄影者与原始出版来源未确认。',license:'用户提供参考，未确认公开使用许可',licenseUrl:'',changes:'保留完整原图与水印，以留边适配展板；未生成或重绘面容。'}},
 yuxiu:{college:'毓琇书院',person:'顾毓琇',role:'电机工程学家 · 教育家 · 诗人',
  paragraphs:['1928年毕业于麻省理工学院，是该校第一位获得科学博士学位的中国人，在电机工程、自动控制及文学艺术领域均有建树。','曾任南京大学前身国立中央大学校长，倡导文、理、工平衡发展，重视宽阔的知识面。毓琇书院以他的名字命名。'],
  source:official('170997'),portrait:publicDomain('yuxiu','顧毓琇.jpg','原载《制宪国民大会实录》，国民大会秘书处编，1946年。')},
 kaijia:{college:'开甲书院',person:'程开甲',role:'理论物理学家 · “两弹一星”功勋',
  paragraphs:['1948年获爱丁堡大学博士学位，曾任南京大学教授，是我国核试验科学技术体系的创建者之一。','1999年获“两弹一星功勋奖章”，2013年获国家最高科学技术奖。开甲书院以他的名字命名，传承报效国家、严谨求实的精神。'],
  source:official('170998'),portrait:publicDomain('kaijia','年轻程开甲.jpg','1960年代程开甲肖像；文汇报历史照片，经Wikimedia Commons标注公版；摄影者不详。')},
 jianxiong:{college:'健雄书院',person:'吴健雄',role:'实验物理学家 · 国立中央大学校友',
  paragraphs:['1934年毕业于国立中央大学物理系，1940年获加州大学伯克利分校博士学位，长期从事实验物理学研究。','以β衰变实验证明弱相互作用中的宇称不守恒。健雄书院于2022年设立，以她的名字命名。'],
  source:official('226117','20220720'),portrait:{asset:'assets/portraits/colleges/jianxiong.webp',source:'https://commons.wikimedia.org/wiki/File:Informal_portrait_of_Chien-shiung_Wu.jpg',
   credit:'AIP Emilio Segrè Visual Archives, Segrè Collection',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',changes:'裁切为竖幅、转灰度并缩放；未生成或重绘面容。'}},
};
export const missingCollegePortraits=collegePortraitOrder.filter(id=>!collegeStories[id].portrait);

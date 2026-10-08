"""Register the supplied campus plan and vectorize its roads/lawns.
All results are plan-based approximations; anchors and residuals stay reviewable.
"""
import sys,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'.tools/python'))
import cv2
import numpy as np

source=json.loads((root/'docs/sources/plan-buildings-pixels.json').read_text())
byid={f['id']:f for f in source['features']}
lat0,lon0,rotation=32.059064,118.775750,.143
def geographic(lat,lon):
    x=(lon-lon0)*111320*math.cos(math.radians(lat0));z=-(lat-lat0)*111320
    return [x*math.cos(rotation)-z*math.sin(rotation),x*math.sin(rotation)+z*math.cos(rotation)]
anchors=[
 {'name':'北大楼','pixel':byid[26]['center'],'world':[0,0],'source':'OSM 88778620'},
 {'name':'东大楼','pixel':byid[31]['center'],'world':[52.1,48.1],'source':'OSM 88778615, footprint centroid'},
 {'name':'西大楼','pixel':byid[30]['center'],'world':[-50.9,45.9],'source':'OSM 88778613'},
 {'name':'大礼堂','pixel':byid[37]['center'],'world':[-52.4,98.9],'source':'OSM 88778619'},
 {'name':'汉口路校门','pixel':[2188,2527],'world':geographic(32.05582611,118.775325),'source':'official VR scene_gl-2-01'},
 {'name':'广州路校门','pixel':[2579,3976],'world':geographic(32.05266139,118.77646222),'source':'official VR scene_gl-1-12'},
]
origin=np.array(byid[26]['center']);a=(np.array([x['pixel'] for x in anchors])-origin)/1000;target=np.array([x['world'] for x in anchors]);n=len(a)
def kernel(r):return r*r*np.log(np.maximum(r,1e-12))
k=kernel(np.linalg.norm(a[:,None,:]-a[None,:,:],axis=2));p=np.column_stack([np.ones(n),a]);matrix=np.block([[k+np.eye(n)*1e-5,p],[p.T,np.zeros((3,3))]])
weights=np.linalg.solve(matrix,np.vstack([target,np.zeros((3,2))]))
def project(points):
    q=(np.asarray(points,dtype=float).reshape(-1,2)-origin)/1000
    return kernel(np.linalg.norm(q[:,None,:]-a[None,:,:],axis=2))@weights[:n]+np.column_stack([np.ones(len(q)),q])@weights[n:]
def poly(points):return np.round(project(points),3).tolist()

names={1:'中美文化研究中心／国际学术交流楼',2:'科学楼',3:'化学楼',4:'费彝民楼群',5:'安中大楼',6:'体育馆',7:'西苑宾馆',8:'曾宪梓楼',10:'逸夫管理科学楼',11:'南京大学出版社',12:'苏富特大楼',13:'游泳健身馆',14:'网络与计算中心',15:'制药厂',16:'中华文化研究院',17:'田家炳艺术书院',18:'丙丁楼',20:'东北楼',22:'唐仲英楼',23:'建良楼',24:'苏浙运动场',25:'甲乙楼',26:'北大楼',28:'钟山楼',29:'戊己庚楼',30:'西大楼',31:'东大楼',32:'低温车间',33:'低温实验楼',34:'逸夫馆',35:'辛壬楼',36:'地质实验楼群',37:'大礼堂',38:'健忠楼',39:'离退休工作处',40:'教学楼／郑钢楼',41:'天文楼',42:'平台化楼',44:'东南楼',45:'工程管理学院',47:'南楼',49:'协鑫楼',50:'实验楼',51:'西南楼（法学院）',52:'小礼堂',56:'知行楼',57:'南华楼',58:'斗鸡闸',62:'科技馆报告厅',63:'学报编辑部',64:'声学楼',65:'声学楼',66:'图书馆',69:'物理楼内院研究楼',70:'物理楼',71:'蒙民伟楼',74:'李四光工作室',75:'罗根泽旧居',77:'中山楼',78:'南园18、19舍',80:'校医院',81:'校医院',82:'汉口路27号楼／南园21舍',83:'南园20舍',85:'经济管理学院中心',86:'松林楼',88:'南园5舍',89:'南园物业中心',90:'南园1舍',92:'南园14舍',94:'南园2舍',95:'南园6舍',96:'南京大学出版社',97:'南园13舍',99:'南园7舍',101:'南园3舍',102:'南园17舍',103:'公寓',104:'有园宾馆',105:'南园教学楼',106:'南园4舍',108:'服装市场',110:'陶园01幢',111:'南大浴室',112:'陶园02幢',113:'南园综合楼与学生餐厅',114:'学生活动中心',115:'南园16舍',116:'陶园南楼',117:'南芳园餐厅',118:'陶园03幢',119:'南园15舍',120:'外教公寓',121:'洗涤服务',122:'南园11舍',123:'南园8舍',124:'专家楼2号',125:'纪念馆',126:'南苑宾馆',127:'南园12舍',128:'拉贝纪念馆'}
# Labels re-read from the supplied plan during the v0.8 audit.
reviewed_names={9: '运输中心', 48: '幼儿园', 53: '幼儿园', 54: '华龙楼3号', 55: '动力与零修中心', 59: '幼儿园', 60: '华龙楼2号', 67: '华龙楼1号', 68: '微波实验楼', 72: '绿化养护与环卫中心', 76: '校园纪念品商店', 84: '荟萃楼', 91: '售电处', 93: '电话亭', 98: '校园一卡通中心', 100: '南芳园风味美食苑', 107: '东苑宿舍', 109: '教育超市'}
names.update(reviewed_names)
hero={26:'88778620',30:'88778613',31:'88778615',37:'88778619',40:'teaching-priority'}
features=[]
for f in source['features']:
    kind=f['kind'];name=names.get(f['id'],f"{'南园' if f['center'][1]>2580 else '北园'}建筑 {f['id']:03}")
    if f['id']==123:kind='dormitory'  # Nanyuan 8: six-storey flat-roof dorm, confirmed by user photo.
    tags={'name':name,'source':'user supplied NJU campus plan','confidence':'map-traced; geographic scale approximate','garden':'south' if f['center'][1]>2580 else 'north','plan_id':str(f['id'])}
    if f['id'] in reviewed_names:tags['labelConfidence']='read from supplied campus plan'
    if kind=='athletics':tags['leisure']='track'
    else:tags.update({'building':'university','building:levels':str(2 if f['id']==38 else 3 if kind=='historic' else 6 if kind=='dormitory' else 2 if kind=='service' else 4)})
    features.append({'id':hero.get(f['id'],'plan-'+str(f['id'])),'tags':tags,'kind':kind,'points':poly(f['polygon']),'holes':[poly(x) for x in f['holes']],'planCenter':f['center']})

im=cv2.imread(str(root/'references/gulou-campus-plan-user.png'));hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV);gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
road=((np.max(im,2)-np.min(im,2)<15)&(gray>65)&(gray<155)).astype(np.uint8)*255
road[:395]=0;road[:,3480:]=0
road=cv2.morphologyEx(road,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
green=((hsv[:,:,0]>30)&(hsv[:,:,0]<85)&(hsv[:,:,1]>80)&(hsv[:,:,2]>75)).astype(np.uint8)*255
green[:500]=0;green[:,3480:]=0;green=cv2.morphologyEx(green,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
def surfaces(mask,min_area):
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE);out=[]
    for i,c in enumerate(contours):
        if hierarchy[0,i,3]!=-1 or cv2.contourArea(c)<min_area:continue
        holes=[];child=hierarchy[0,i,2]
        while child!=-1:
            if cv2.contourArea(contours[child])>500:holes.append(poly(cv2.approxPolyDP(contours[child],2.2,True).reshape(-1,2)))
            child=hierarchy[0,child,0]
        out.append({'points':poly(cv2.approxPolyDP(c,2.2,True).reshape(-1,2)),'holes':holes})
    return out
roads=surfaces(road,800);lawns=surfaces(green,1000)
cv2.imwrite(str(root/'references/plan-roads-mask.png'),road)

# Named route points are snapped to the plan's road surface, retaining its bends.
road_y,road_x=np.nonzero(road);road_pixels=np.column_stack([road_x,road_y])
def snap(point):
    q=np.asarray(point);idx=np.argmin(np.sum((road_pixels-q)**2,axis=1));return road_pixels[idx].tolist()
route_pixels=[('北大楼前',[2327,1350]),('金大路',[2350,1450]),('南高路',[2367,1600]),('大礼堂路口',[2155,1620]),('教学楼东侧',[2340,1790]),('两江路',[2120,1840]),('中大路北段',[2108,1960]),('中大路',[2150,2200]),('汉口路校门',[2188,2527]),('南园北门',[2220,2680]),('南园喷泉',[2320,2908]),('南园宿舍区',[2435,3200]),('南园8舍',[2590,3660]),('广州路校门',[2579,3976])]
route=[{'name':name,'pixel':snap(pixel),'point':poly([snap(pixel)])[0]} for name,pixel in route_pixels]
spawn=poly([snap([2357,1513])])[0]
anchor_report=[]
for item in anchors:
    fitted=project([item['pixel']])[0];anchor_report.append({**item,'fitted':fitted.tolist(),'residualMetres':float(np.linalg.norm(fitted-np.array(item['world'])))})
report={'method':'regularized thin-plate interpolation of six reference anchors; plan geometry, not a survey','anchors':anchor_report,'imageSize':source['imageSize'],'originWGS84':[lat0,lon0],'axisRotation':rotation}
(root/'docs/sources/plan-registration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
output={'origin':[lat0,lon0],'rotation':rotation,'source':'User-provided NJU campus plan + official VR navigation and OSM anchors','accuracy':'plan-traced approximate reconstruction','features':features,'roads':roads,'lawns':lawns,'spawn':spawn,'priorityRoute':route,'gates':{'hankou':anchors[-2]['world'],'guangzhou':anchors[-1]['world']},'projection':{'originPixel':origin.tolist(),'controls':a.tolist(),'weights':weights.tolist()}}
(root/'public/data/campus-layout.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')))
print('Buildings / fields',len(features),'road regions',len(roads),'lawns',len(lawns),'spawn',spawn)
print('Registration residuals',[(x['name'],round(x['residualMetres'],3)) for x in anchor_report])
print('Priority route',[(x['name'],x['point']) for x in route])

"""Audit plan tracing separately from hero-model approximation and real-world accuracy."""
import sys,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tools/python'))
import cv2,numpy as np
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'public/data/campus-layout.json').read_text());source=json.loads((root/'docs/sources/plan-buildings-pixels.json').read_text());byid={str(f['id']):f for f in source['features']}
projection=data['projection'];controls=np.array(projection['controls']);weights=np.array(projection['weights']);origin=np.array(projection['originPixel']);n=len(controls)
def kernel(r):return r*r*np.log(np.maximum(r,1e-12))
def project(points):
 q=(np.asarray(points)-origin)/1000
 return kernel(np.linalg.norm(q[:,None,:]-controls[None,:,:],axis=2))@weights[:n]+np.column_stack([np.ones(len(q)),q])@weights[n:]
plan=cv2.imread(str(root/'references/campus-plan-check-20261002.png'));hsv=cv2.cvtColor(plan,cv2.COLOR_BGR2HSV);h,s,v=cv2.split(hsv)
color=((s>95)&(v>75)&(((h>90)&(h<165))|((h>3)&(h<30)))).astype(np.uint8);color[:510]=0;color[:,3480:]=0
coverage=np.zeros(color.shape,np.uint8)
for f in source['features']:cv2.fillPoly(coverage,[np.array(f['polygon'],np.int32)],1)
covered=int(((coverage>0)&(color>0)).sum());total=int((color>0).sum())
records=[]
for f in data['features']:
 original=byid.get(f['tags']['plan_id']);expected=np.round(project(original['polygon']),3)
 match=len(expected)==len(f['points']);delta=float(np.abs(expected-np.array(f['points'])).max()) if match else None
 records.append({'id':f['id'],'planId':f['tags']['plan_id'],'name':f['tags']['name'],'kind':f['kind'],'outlineMaxDeviationMetres':delta,'sourceTraceMatches':match and delta<.001,'labelRechecked':f['tags'].get('labelConfidence')=='read from supplied campus plan','height':'not measured; estimated by building class','withinPlayableBounds':all(-615<=x<=155 and -275<=z<=745 for x,z in f['points'])})
# Recompute every road/lawn ring from the local source, without changing game data.
# This verifies trace consistency, not independent real-world accuracy.
original_plan=cv2.imread(str(root/'references/gulou-campus-plan-user.png'))
identical=plan.shape==original_plan.shape and np.array_equal(plan,original_plan)
assert identical, 'New and original plan differ; review registration before proceeding'
original_hsv=cv2.cvtColor(original_plan,cv2.COLOR_BGR2HSV);gray=cv2.cvtColor(original_plan,cv2.COLOR_BGR2GRAY)
road=((np.max(original_plan,2)-np.min(original_plan,2)<15)&(gray>65)&(gray<155)).astype(np.uint8)*255
road[:395]=0;road[:,3480:]=0
lawn=((original_hsv[:,:,0]>30)&(original_hsv[:,:,0]<85)&(original_hsv[:,:,1]>80)&(original_hsv[:,:,2]>75)).astype(np.uint8)*255
lawn[:500]=0;lawn[:,3480:]=0
surface_checks={}
for name,mask,min_area in [('roads',road,800),('lawns',lawn,1000)]:
 mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
 contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE);expected=[]
 for i,c in enumerate(contours):
  if hierarchy[0,i,3]!=-1 or cv2.contourArea(c)<min_area:continue
  rings=[np.round(project(cv2.approxPolyDP(c,2.2,True).reshape(-1,2)),3)];child=hierarchy[0,i,2]
  while child!=-1:
   if cv2.contourArea(contours[child])>500:rings.append(np.round(project(cv2.approxPolyDP(contours[child],2.2,True).reshape(-1,2)),3))
   child=hierarchy[0,child,0]
  expected.append(rings)
 assert len(expected)==len(data[name]), f'{name} component count differs'
 deviations=[]
 for rings,stored in zip(expected,data[name]):
  actual=[stored['points'],*stored.get('holes',[])]
  assert len(rings)==len(actual), f'{name} hole count differs'
  deviations.append(max(float(np.max(np.abs(a-np.asarray(b)))) for a,b in zip(rings,actual)))
 surface_checks[name]={'regions':len(expected),'matchingRegions':sum(d<.001 for d in deviations),'maxDeviationMetres':max(deviations)}
 assert all(d<.001 for d in deviations), f'{name} outline mismatch'

hero=json.loads((root/'.tools/phase9-hero-footprints.json').read_text());comparisons=[]
for ident,solids in hero.items():
 f=next(f for f in data['features']if f['id']==ident);polys=[]
 for b in solids:
  a=b.get('angle',0);polys.append([[b['x']+x*math.cos(a)+z*math.sin(a),b['z']-x*math.sin(a)+z*math.cos(a)]for x,z in [(-b['w']/2,-b['d']/2),(b['w']/2,-b['d']/2),(b['w']/2,b['d']/2),(-b['w']/2,b['d']/2)]])
 allpoints=np.array(f['points']+sum(polys,[]));low=allpoints.min(axis=0)-1;high=allpoints.max(axis=0)+1;scale=10;shape=(int((high[1]-low[1])*scale)+2,int((high[0]-low[0])*scale)+2)
 a=np.zeros(shape,np.uint8);b=np.zeros(shape,np.uint8)
 def raster(poly):return np.round((np.array(poly)-low)*scale).astype(np.int32)
 cv2.fillPoly(a,[raster(f['points'])],1)
 for hole in f.get('holes',[]):cv2.fillPoly(a,[raster(hole)],0)
 for poly in polys:cv2.fillPoly(b,[raster(poly)],1)
 intersection=int(((a>0)&(b>0)).sum());union=int(((a>0)|(b>0)).sum())
 comparisons.append({'id':ident,'name':f['tags']['name'],'planAreaM2':float(a.sum())/100,'modelGroundAreaM2':float(b.sum())/100,'footprintIoU':intersection/union,'note':'OSM/photo hero geometry versus schematic-plan tracing; difference is not proof that either is a survey'})
 image=np.full((*shape,3),245,np.uint8);image[a>0]=(214,161,80);image[b>0]=(70,139,213);image[(a>0)&(b>0)]=(140,176,126);cv2.imwrite(str(root/f'docs/validation/phase9/footprint-{ident}.png'),image)
unknown=[r for r in records if '建筑 'in r['name']]
report={'sourceImage':'references/campus-plan-check-20261002.png','scope':'all 130 source building/field components; plan trace integrity, not surveyed geometry','sourceComponents':len(source['features']),'mappedComponents':len(records),'matchedTraces':sum(r['sourceTraceMatches'] for r in records),'coloredPixelCoverage':covered/total,'surfaceTraceChecks':surface_checks,'identicalReferencePixels':bool(identical),'roadRegions':len(data['roads']),'lawnRegions':len(data['lawns']),'unlabeledComponents':len(unknown),'heroComparisons':comparisons,'records':records,'conclusion':'Not an exact campus reconstruction: ordinary heights and facades remain approximate; four hero footprints differ from the schematic plan; the plan does not contain surveyed ground levels.'}
(root/'docs/validation/phase9/map-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
rows=['# 鼓楼校区平面与场景核对 · v0.8','', '**结论：目前不能称为与真实校园或平面图完全一致。** 本次对全量 130 个建筑／场地轮廓做了来源核对；这不是测绘验收。','',f'- 本次提供的地图与既有参考图尺寸相同，解码后像素完全相同。130 个轮廓均能追溯到该图；按既有投影转换后的数据与当前地图文件吻合。',f'- 独立颜色区域检查：当前轮廓覆盖约 {covered/total:.2%} 的蓝／紫／橙色图面像素（排除图例和页眉）。该比例只检查描图覆盖，不代表建筑真实精度。',f'- 路面共 {len(data["roads"])} 片、草地共 {len(data["lawns"])} 片。全部轮廓和孔洞已从本地原图重算，并与当前数据逐点核对；可走性另由实际浏览器路线验证。这是描图一致性检查，不是独立测绘。','- 重新辨认并补齐 18 个原先使用编号的名称；仍有部分图面本身未标名或尚不能确认名称的附属建筑。','- 六片北大楼庭院草坪加入约 0.20 m 标高与约 0.22 m 石缘，形成通往金大路的浅台阶；有实体碰撞。高差由用户反馈与 VR 确認，具体数值仍为近似值。','', '## 重点建筑轮廓差异','', '| 建筑 | 图面描绘占地 m² | 模型地面占地 m² | 轮廓交并比 |','| --- | ---: | ---: | ---: |']
for c in comparisons:rows.append(f'| {c["name"]} | {c["planAreaM2"]:.1f} | {c["modelGroundAreaM2"]:.1f} | {c["footprintIoU"]:.1%} |')
rows+=['','模型统计包含地面台阶／门廊，图面轮廓未必包含这些部件。重点模型还参考了 OSM 与实景；不能仅为了提高交并比把真实屋檐或入口压缩成示意图方块。位置和道路关系继续以多源交叉核对为准。','','## 仍未验证的内容','','普通建筑楼高、楼层与立面细部多数仍为近似值；平面图不提供坡度、庭院标高、门窗尺寸或树木精确位置。少数附属体未标名。不能把控制点拟合的极小残差当作真实测绘精度。','','完整逐栋记录见 `validation/phase9/map-audit.json`。原始照片与地图只留在本地。']
(root/'docs/map-audit.md').write_text('\n'.join(rows)+'\n')
print(json.dumps({k:v for k,v in report.items()if k not in ['records','sourceImage','scope']},ensure_ascii=False))

"""Reconstruct sign silhouettes; source photographs remain local and excluded.
This produces vector contour data, not source photo textures or original artwork.
"""
from pathlib import Path
import sys,json,argparse
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tools/python'))
import cv2,numpy as np
parser=argparse.ArgumentParser()
parser.add_argument('--only',choices=['library','museum','newTeaching','southTeaching','teaching','physics'])
args=parser.parse_args()
jobs=[
 ('teaching','教学楼','references/phase18/scene_gl-2-10-f-full.jpg',(1230,1004,1516,1053)),
 ('library','图书馆','references/research-2026-10-03/library-official-28.png',(374,408,695,477)),
 ('museum','南京大学校史博物馆','references/phase20/scene_gl-2-21-f-full.jpg',(1007,953,1355,1009)),
 ('newTeaching','新教学楼','references/phase19/scene_gl-3-16-f-full.jpg',(1000,770,1630,931)),
 ('southTeaching','南教学楼','references/phase19/scene_gl-2-53-r-full.jpg',None),
 ('physics','物理楼','references/phase36/physics-front-full.jpg',(1010,850,1350,940)),
]
output=Path('src/world/building-lettering.json')
result=json.loads(output.read_text()) if args.only and output.exists() else {};tiles=[]
for name,text,path,bounds in jobs:
 if args.only and args.only!=name:continue
 im=cv2.imread(path)
 if name=='teaching':
  # User photo provides clearer strokes than the distant cubemap. Rectify
  # the sign plane, then fit the three glyphs to official frontal spacing.
  im=cv2.imread('references/phase32/teaching-zhenggang-user.png')
  src=np.float32([[240,483],[663,595],[663,714],[240,601]])
  dst=np.float32([[10,10],[1010,10],[1010,240],[10,240]])
  crop=cv2.warpPerspective(im,cv2.getPerspectiveTransform(src,dst),(1020,250))
 elif name=='southTeaching':
  # Official west-entry cubemap, rectified along its stone panel joints.
  # This recovers approximate proportions, not a measured orthographic sign.
  src=np.float32([[70,663],[704,978],[713,1104],[71,900]])
  dst=np.float32([[40,50],[1040,50],[1040,290],[40,290]])
  crop=cv2.warpPerspective(im,cv2.getPerspectiveTransform(src,dst),(1080,340))
  Path('references/phase28').mkdir(parents=True,exist_ok=True)
  cv2.imwrite('references/phase28/south-sign-rectified.jpg',crop)
 else:
  x,y,x2,y2=bounds;crop=im[y:y2,x:x2]
 hsv=cv2.cvtColor(crop,cv2.COLOR_BGR2HSV)
 r=crop[:,:,2].astype(float);g=crop[:,:,1].astype(float);blue=crop[:,:,0].astype(float)
 mask=((r-blue>40)&(g-blue>12)&(r>105)).astype(np.uint8)*255
 if name=='physics':
  # Gold strokes overlap beige cages and window reflections. Trace their
  # visible centre lines at 3x crop scale rather than retaining those blobs.
  # These are a manual photographic reconstruction, not original calligraphy.
  strokes=[
   [(151,31),(144,50),(132,72)],[(132,68),(175,63)],[(167,34),(163,98),(154,173)],[(174,96),(146,119),(114,147)],
   [(207,32),(197,56),(181,85)],[(195,79),(239,78),(245,92),(234,159),(223,174),(208,161)],
   [(207,88),(186,120),(157,151)],[(224,97),(199,139),(168,172)],
   [(456,35),(492,32)],[(479,37),(474,114)],[(457,68),(491,64)],[(455,104),(469,114),(499,96)],
   [(514,33),(539,29),(570,31),(578,37),(565,86),(515,91),(512,34)],
   [(515,62),(569,59)],[(542,33),(536,105)],[(516,115),(568,106)],
   [(537,92),(522,119),(492,145),(453,158)],[(555,111),(543,136),(522,155),(571,150)],
   [(786,25),(830,23)],[(809,25),(803,111),(775,147)],[(781,58),(835,53)],[(777,85),(825,75)],
   [(806,82),(783,115),(763,145)],[(837,24),(851,42)],[(878,16),(862,45)],
   [(842,53),(893,44)],[(865,34),(852,86)],[(851,58),(834,82)],[(864,62),(887,71)],
   [(827,98),(891,87)],[(852,84),(824,122),(871,147),(902,158)],
   [(889,102),(873,127),(842,149),(802,163)],[(819,132),(855,139)],
  ]
  mask=np.zeros((270,1020),np.uint8)
  for stroke in strokes:cv2.polylines(mask,[np.array(stroke,np.int32)],False,255,7,cv2.LINE_AA)
 if name=='newTeaching':mask=((hsv[:,:,1]>100)&(hsv[:,:,0]>10)&(hsv[:,:,0]<42)&(hsv[:,:,2]>100)).astype(np.uint8)*255
 if name=='museum':mask=((hsv[:,:,1]>115)&(hsv[:,:,0]>10)&(hsv[:,:,0]<42)).astype(np.uint8)*255
 if name=='southTeaching':
  # Reject the green foliage behind the last character and neutral supports.
  mask=((r-blue>39)&(g-blue>15)&(r-g>13)&(hsv[:,:,0]>9)&(hsv[:,:,0]<32)&(hsv[:,:,1]>100)&(r>85)).astype(np.uint8)*255
  mask[:20]=0;mask[285:]=0

 if name=='teaching':
  mask=((r-blue>15)&(g-blue>13)&(r>105)&(g>103)).astype(np.uint8)*255
  region=np.zeros(mask.shape,np.uint8)
  region[12:189,25:250]=255;region[45:200,485:642]=255;region[53:220,825:995]=255
  mask[region==0]=0
  # Recover bronze edges only immediately beside a bright gold stroke. A
  # broad low-light threshold also selects the wall and fills the last glyph.
  bronze=((r-blue>12)&(g-blue>8)&(r>60)&(region>0)).astype(np.uint8)*255
  mask=bronze & cv2.dilate(mask,np.ones((3,3),np.uint8))
  mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  n,labels,stats,_=cv2.connectedComponentsWithStats(mask);mask[:]=0
  for i in range(1,n):
   if stats[i,4]>18:mask[labels==i]=255
  contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
  for i,c in enumerate(contours):
   if hierarchy[0,i,3]>=0 and cv2.contourArea(c)<20:cv2.drawContours(mask,[c],-1,255,-1)
  fitted=np.zeros((160,1100),np.uint8)
  for (x0,x1),(left,width) in zip([(25,250),(485,642),(825,995)],[(20,142),(480,114),(922,128)]):
   glyph=mask[:,x0:x1];ys,xs=np.where(glyph>0)
   glyph=glyph[ys.min():ys.max()+1,xs.min():xs.max()+1]
   fitted[10:145,left:left+width]=cv2.resize(glyph,(width,135),interpolation=cv2.INTER_AREA)
  mask=fitted

 # Include pale gold highlights adjoining a coloured stroke only.
 dil=cv2.dilate(mask,np.ones((3,3),np.uint8))>0

 if name=='library':mask[dil&(r-blue>28)&(hsv[:,:,2]>140)]=255
 if name=='newTeaching': mask[-5:]=0
 n,labels,stats,_=cv2.connectedComponentsWithStats(mask)
 clean=np.zeros_like(mask)
 for i in range(1,n):
  if stats[i,4]>=(15 if name in ['newTeaching','southTeaching'] else 3):clean[labels==i]=255
 clean=cv2.resize(clean,None,fx=3,fy=3,interpolation=cv2.INTER_CUBIC)
 clean=cv2.GaussianBlur(clean,(3,3),.55);_,clean=cv2.threshold(clean,120,255,cv2.THRESH_BINARY)
 contours,hierarchy=cv2.findContours(clean,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 yy,xx=np.where(clean>0);left,right,top,bottom=xx.min(),xx.max(),yy.min(),yy.max();scale=1/(right-left)
 shapes=[]
 def ring(c):return [[round((float(px)-left)*scale-.5,5),round((bottom-float(py))*scale,5)] for px,py in cv2.approxPolyDP(c,.75,True).reshape(-1,2)]
 for i,c in enumerate(contours):
  if hierarchy[0,i,3]!=-1 or cv2.contourArea(c)<8:continue
  holes=[];child=hierarchy[0,i,2]
  while child!=-1:
   if cv2.contourArea(contours[child])>8:holes.append(ring(contours[child]))
   child=hierarchy[0,child,0]
  shapes.append({'outline':ring(c),'holes':holes})
 result[name]={'text':text,'heightRatio':round((bottom-top)*scale,5),'shapes':shapes,'method':('manual photo stroke reconstruction; proportions approximate; original photograph excluded' if name=='physics' else 'perspective-rectified photo silhouette reconstruction; proportions approximate; original photograph excluded' if name in ['southTeaching','teaching'] else 'photo silhouette reconstruction; original photograph excluded')}
 tile=np.full((200,1000,3),245,np.uint8);fit=min(960/clean.shape[1],155/clean.shape[0]);small=cv2.resize(clean,None,fx=fit,fy=fit,interpolation=cv2.INTER_AREA);tile[10:10+small.shape[0],20:20+small.shape[1]][small>120]=(55,145,185);cv2.putText(tile,name,(20,190),0,.65,(0,0,0),1);tiles.append(tile)
output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
review='references/phase36/physics-lettering-review.png' if args.only=='physics' else 'references/phase32/teaching-lettering-review.png' if args.only=='teaching' else 'references/phase28/south-lettering-review.png' if args.only=='southTeaching' else 'references/phase20/building-lettering-review.png'
cv2.imwrite(review,np.concatenate(tiles))
print({key:{'shapes':len(value['shapes']),'heightRatio':value['heightRatio']} for key,value in result.items()})

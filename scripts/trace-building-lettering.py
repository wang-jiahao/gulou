"""Reconstruct sign silhouettes; source photographs remain local and excluded.
This produces vector contour data, not source photo textures or original artwork.
"""
from pathlib import Path
import sys,json,argparse
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tools/python'))
import cv2,numpy as np
parser=argparse.ArgumentParser()
parser.add_argument('--only',choices=['library','museum','newTeaching','southTeaching'])
args=parser.parse_args()
jobs=[
 ('library','图书馆','references/research-2026-10-03/library-official-28.png',(374,408,695,477)),
 ('museum','南京大学校史博物馆','references/phase20/scene_gl-2-21-f-full.jpg',(1007,953,1355,1009)),
 ('newTeaching','新教学楼','references/phase19/scene_gl-3-16-f-full.jpg',(1000,770,1630,931)),
 ('southTeaching','南教学楼','references/phase19/scene_gl-2-53-r-full.jpg',None),
]
output=Path('src/world/building-lettering.json')
result=json.loads(output.read_text()) if args.only and output.exists() else {};tiles=[]
for name,text,path,bounds in jobs:
 if args.only and args.only!=name:continue
 im=cv2.imread(path)
 if name=='southTeaching':
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
 if name=='newTeaching':mask=((hsv[:,:,1]>100)&(hsv[:,:,0]>10)&(hsv[:,:,0]<42)&(hsv[:,:,2]>100)).astype(np.uint8)*255
 if name=='museum':mask=((hsv[:,:,1]>115)&(hsv[:,:,0]>10)&(hsv[:,:,0]<42)).astype(np.uint8)*255
 if name=='southTeaching':
  # Reject the green foliage behind the last character and neutral supports.
  mask=((r-blue>39)&(g-blue>15)&(r-g>13)&(hsv[:,:,0]>9)&(hsv[:,:,0]<32)&(hsv[:,:,1]>100)&(r>85)).astype(np.uint8)*255
  mask[:20]=0;mask[285:]=0

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
 result[name]={'text':text,'heightRatio':round((bottom-top)*scale,5),'shapes':shapes,'method':('perspective-rectified photo silhouette reconstruction; proportions approximate; original photograph excluded' if name=='southTeaching' else 'photo silhouette reconstruction; original photograph excluded')}
 tile=np.full((200,1000,3),245,np.uint8);fit=min(960/clean.shape[1],155/clean.shape[0]);small=cv2.resize(clean,None,fx=fit,fy=fit,interpolation=cv2.INTER_AREA);tile[10:10+small.shape[0],20:20+small.shape[1]][small>120]=(55,145,185);cv2.putText(tile,name,(20,190),0,.65,(0,0,0),1);tiles.append(tile)
output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
review='references/phase28/south-lettering-review.png' if args.only=='southTeaching' else 'references/phase20/building-lettering-review.png'
cv2.imwrite(review,np.concatenate(tiles))
print({key:{'shapes':len(value['shapes']),'heightRatio':value['heightRatio']} for key,value in result.items()})

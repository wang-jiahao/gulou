"""Digitize building outlines from the user-provided NJU campus plan.
The plan is reference material, not a distributed texture. Geographic calibration
and labels are applied in a separate, reviewable step.
"""
import sys,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.tools/python'))
import cv2
import numpy as np

image=cv2.imread(str(root/'references/gulou-campus-plan-user.png'))
hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
h,s,v=cv2.split(hsv)
colored=((s>95)&(v>75)&(((h>90)&(h<165))|((h>3)&(h<30)))).astype(np.uint8)*255
colored[:510]=0;colored[:,3480:]=0
colored=cv2.morphologyEx(colored,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
contours,hierarchy=cv2.findContours(colored,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
features=[]
for i,c in enumerate(contours):
    if hierarchy[0,i,3]!=-1 or cv2.contourArea(c)<310:continue
    x,y,w,hh=cv2.boundingRect(c)
    if w<10 or hh<9:continue
    m=cv2.moments(c);center=[m['m10']/m['m00'],m['m01']/m['m00']]
    holes=[];child=hierarchy[0,i,2]
    while child!=-1:
        if cv2.contourArea(contours[child])>850:holes.append(cv2.approxPolyDP(contours[child],2.0,True).reshape(-1,2).tolist())
        child=hierarchy[0,child,0]
    mask=np.zeros(colored.shape,np.uint8);cv2.drawContours(mask,[c],0,255,-1)
    hue=float(np.median(h[(mask>0)&(colored>0)]))
    kind='historic' if hue>125 else 'building' if hue>90 else 'dormitory' if hue<16 else 'service'
    if 1350<x<1700 and 950<y<1100 and hh>400:kind='athletics'
    features.append({'id':0,'kind':kind,'center':[round(a,2) for a in center],'bounds':[x,y,w,hh],'areaPixels':round(cv2.contourArea(c)),'polygon':cv2.approxPolyDP(c,2.0,True).reshape(-1,2).tolist(),'holes':holes})
features.sort(key=lambda f:(int(f['center'][1]/90),f['center'][0]))
overlay=image.copy()
for i,f in enumerate(features,1):
    f['id']=i;point=tuple(int(p) for p in f['center']);cv2.drawContours(overlay,[np.array(f['polygon'])],0,(40,30,240),2)
    cv2.rectangle(overlay,(point[0]-21,point[1]-16),(point[0]+30,point[1]+13),(245,245,245),-1)
    cv2.putText(overlay,str(i),(point[0]-19,point[1]+8),cv2.FONT_HERSHEY_SIMPLEX,.7,(20,20,20),2,cv2.LINE_AA)
cv2.imwrite(str(root/'references/plan-components.png'),overlay)
cv2.imwrite(str(root/'references/plan-components-core.png'),overlay[1000:2000,1750:2800])
cv2.imwrite(str(root/'references/plan-components-south.png'),overlay[2650:4030,1760:3260])
(root/'docs/sources/plan-buildings-pixels.json').write_text(json.dumps({'imageSize':[image.shape[1],image.shape[0]],'features':features},ensure_ascii=False,indent=2))
print('Building/field components:',len(features))
print([(f['id'],f['kind'],f['center'],f['bounds']) for f in features if 1850<f['center'][0]<2800 and 1000<f['center'][1]<1850])

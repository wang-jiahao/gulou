"""Original sharp three-lobed ivy atlas and vein normal map; no reference photo pixels."""
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'.tools/python'))
import cv2
import numpy as np
s=512;rng=np.random.default_rng(1902)
outline=np.array([[.5,.025],[.615,.255],[.81,.16],[.765,.365],[.945,.35],[.82,.62],[.68,.795],[.52,.94],[.48,.94],[.32,.8],[.18,.64],[.055,.36],[.245,.375],[.19,.17],[.385,.26]])*s
points=[]
for a,b in zip(outline,np.roll(outline,-1,axis=0)):
 delta=b-a;length=np.linalg.norm(delta);normal=np.array([-delta[1],delta[0]])/length;n=max(2,int(length/8))
 for k in range(n):
  t=k/n;points.append(a+delta*t+normal*((k%2)*2.3*np.sin(np.pi*t)))
mask=np.zeros((s*2,s*2),np.uint8);cv2.fillPoly(mask,[np.round(np.array(points)*2).astype(np.int32)],255);mask=cv2.resize(mask,(s,s),interpolation=cv2.INTER_AREA)
y,x=np.mgrid[:s,:s];coarse=cv2.resize(rng.normal(0,1,(24,24)).astype(np.float32),(s,s),interpolation=cv2.INTER_CUBIC)
shade=5*np.cos((x-s/2)/s*np.pi)+3*np.sin(y/s*np.pi)+coarse*2.8+rng.normal(0,1.25,(s,s))
rgb=np.stack([np.clip(base+shade*factor,0,255)for base,factor in [(42,.7),(91,1),(28,.6)]],axis=2).astype(np.uint8)
veins=np.zeros((s,s),np.uint8);base=(256,476)
for tip in [(256,22),(407,90),(468,184),(410,315),(351,395),(102,89),(38,190),(93,321),(164,395)]:
 cv2.line(veins,base,tip,210,2,cv2.LINE_AA)
for yy in range(70,426,30):
 for side in [-1,1]:
  xx=256+side*int(35+(yy-70)*.35);cv2.line(veins,(256,yy+21),(xx,yy-9),90,1,cv2.LINE_AA)
veins=veins.astype(np.float32)/255;rgb=np.clip(rgb.astype(float)+veins[:,:,None]*np.array([15,21,9]),0,255).astype(np.uint8)
height=(np.cos((x-s/2)/s*np.pi)*5+veins*3).astype(np.float32)
gx=cv2.Sobel(height,cv2.CV_32F,1,0,ksize=3)*.09;gy=cv2.Sobel(height,cv2.CV_32F,0,1,ksize=3)*.09
normal=np.stack([-gx,gy,np.ones_like(gx)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True);normal=((normal*.5+.5)*255).astype(np.uint8)
out=root/'public/assets/textures';cv2.imwrite(str(out/'ivy-leaf-natural.png'),cv2.cvtColor(np.dstack([rgb,mask]),cv2.COLOR_RGBA2BGRA));cv2.imwrite(str(out/'ivy-leaf_nor_gl.png'),cv2.cvtColor(normal,cv2.COLOR_RGB2BGR));print('Ivy atlas',s,'alpha coverage',round(float((mask>100).mean()),3))

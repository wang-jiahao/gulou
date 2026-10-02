"""Clean the CC0 Tree Small 02 atlas; no campus reference pixels are used."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'.tools/python'))
import cv2,numpy as np
src=cv2.imread(str(root/'assets/source-models/tree-small/textures/tree_small_02_leaves_diff_1k.jpg'))
alpha=np.clip((src.max(2).astype(float)-19)*12,0,255).astype(np.uint8)
cv2.imwrite(str(root/'public/assets/textures/campus-canopy-alpha.webp'),alpha,[cv2.IMWRITE_WEBP_QUALITY,98])
crop=src[5:900,470:895];hsv=cv2.cvtColor(crop,cv2.COLOR_BGR2HSV)
mask=((hsv[:,:,1]>32)&(hsv[:,:,2]>28)&(hsv[:,:,0]>25)&(hsv[:,:,0]<90)).astype(np.uint8)*255
poly=np.zeros(mask.shape,np.uint8)
points=np.array([[184,9],[302,9],[307,122],[220,168],[379,208],[384,363],[248,403],[396,450],[389,730],[302,841],[107,892],[7,819],[28,560],[36,411],[48,338],[1,238],[28,100],[95,111]],np.int32)
cv2.fillPoly(poly,[points],255);mask=cv2.bitwise_and(mask,poly)
crop=cv2.resize(crop,(256,512),interpolation=cv2.INTER_AREA);mask=cv2.resize(mask,(256,512),interpolation=cv2.INTER_AREA)
cv2.imwrite(str(root/'public/assets/textures/campus-leaf-spray.png'),np.dstack([crop,mask]))
print('Cleaned CC0 canopy mask and isolated leafy twig')

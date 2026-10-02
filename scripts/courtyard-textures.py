"""Original hanging scale-leaf spray and fine asphalt; no reference-image pixels."""
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.tools/python'))
import cv2
import numpy as np
rng = np.random.default_rng(1924)
s = 768
rgba = np.zeros((s, s, 4), np.uint8)
# Drooping sprays have a green central axis and many overlapping scale leaves.
# Draw at large resolution, then reduce once for clean alpha edges.
for strand in range(29):
    t = strand / 28
    side = -1 if strand % 2 else 1
    start = np.array([s * (.50 + .018 * np.sin(t * 7)), s * (.07 + t * .55)])
    reach = s * (.10 + .29 * np.sin(t * np.pi))
    end = start + np.array([side * reach, s * (.20 + rng.uniform(.02, .12))])
    bend = start + np.array([side * reach * .88, s * .045])
    path = np.array([(1-u)**2 * start + 2*(1-u)*u*bend + u*u*end for u in np.linspace(0,1,27)])
    tint = rng.uniform(.86, 1.12)
    cv2.polylines(rgba, [path.astype(np.int32)], False, (52, 91, 35, 255), 3, cv2.LINE_AA)
    for i, point in enumerate(path):
        direction = path[min(i+1,26)] - path[max(i-1,0)]
        angle = np.arctan2(direction[1], direction[0])
        taper = .65 + .35 * np.sin(i / 27 * np.pi)
        for flank in [-1,1]:
            leaf_angle = angle + flank * .65
            length = (23 + rng.uniform(0,14)) * taper
            tip = point + np.array([np.cos(leaf_angle), np.sin(leaf_angle)]) * length
            middle = (point + tip) / 2
            green = int((103 + rng.uniform(-12,18)) * tint)
            cv2.ellipse(rgba, tuple(middle.astype(int)), (max(2,int(length*.58)),7), leaf_angle*180/np.pi,0,360,(int(green*.59),green,int(green*.34),255),-1,cv2.LINE_AA)
cv2.line(rgba,(s//2,int(s*.04)),(int(s*.51),int(s*.72)),(61,98,39,255),4,cv2.LINE_AA)
rgba=cv2.resize(rgba,(512,512),interpolation=cv2.INTER_AREA)
# Dilate edge RGB into transparent pixels to avoid dark mip fringes.
for c in range(3):
    dilated=cv2.dilate(rgba[:,:,c],np.ones((5,5),np.uint8))
    rgba[:,:,c]=np.where(rgba[:,:,3]==0,dilated,rgba[:,:,c])
out=root/'public/assets/textures'
cv2.imwrite(str(out/'cypress-spray.png'),cv2.cvtColor(rgba,cv2.COLOR_RGBA2BGRA))
rng=np.random.default_rng(2288)
gray=np.clip(231+rng.normal(0,5,(512,512)),0,255).astype(np.uint8)
for _ in range(1700):
    x,y=rng.integers(0,512,2);gray[y,x]=rng.integers(135,205)
cv2.polylines(gray,[np.array([[20,420],[58,400],[81,360],[109,344],[117,309],[150,287]],np.int32)],False,193,1,cv2.LINE_AA)
cv2.imwrite(str(out/'courtyard-asphalt.webp'),gray,[cv2.IMWRITE_WEBP_QUALITY,91])
print('Generated cypress spray and courtyard asphalt')

"""Reconstruct the twelve gate glyph silhouettes from the local reference photo.
The source photograph remains local. Output contains contour geometry only.
Requires OpenCV and numpy, available in this workspace's .tools/python directory.
"""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tools/python'))
import cv2,numpy as np
im=cv2.imread('references/hankou-gate-user-target.png')
# Individual bounds keep nearby banners, lanterns and other red marks out of the glyphs.
regions=[('南',(527,492,578,558),'gold'),('京',(606,496,656,561),'gold'),('大',(692,501,742,563),'gold'),('学',(773,501,823,570),'gold'),('严',(315,503,415,580),'red'),('肃',(338,581,387,649),'red'),('活',(326,660,392,711),'red'),('泼',(319,713,405,790),'red'),('团',(939,537,986,592),'red'),('结',(941,592,988,642),'red'),('紧',(949,647,993,722),'red'),('张',(950,722,994,782),'red')]
glyphs={};tiles=[];report=[]
for ch,(x,y,x2,y2),kind in regions:
 crop=im[y:y2,x:x2];hsv=cv2.cvtColor(crop,cv2.COLOR_BGR2HSV)
 if kind=='gold':mask=((hsv[:,:,0]<43)&(hsv[:,:,1]>135)&(hsv[:,:,2]>75)).astype(np.uint8)*255
 else:mask=(((hsv[:,:,0]<12)|(hsv[:,:,0]>170))&(hsv[:,:,1]>145)&(hsv[:,:,2]>35)).astype(np.uint8)*255
 # Reunite highlight splits within a stroke, without replacing its distinctive contour.
 if kind=='gold':
  close=cv2.dilate(mask,np.ones((3,3),np.uint8))>0
  highlight=(hsv[:,:,2]>155)&(crop[:,:,2]>crop[:,:,0]*1.08)
  mask[close&highlight]=255
 num,lab,stats,_=cv2.connectedComponentsWithStats(mask);clean=np.zeros_like(mask)
 for i in range(1,num):
  if stats[i,4]>=4:clean[lab==i]=255
 clean=cv2.resize(clean,None,fx=3,fy=3,interpolation=cv2.INTER_CUBIC);clean=cv2.GaussianBlur(clean,(3,3),.65);_,clean=cv2.threshold(clean,120,255,cv2.THRESH_BINARY)
 contours,hierarchy=cv2.findContours(clean,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 coords=np.column_stack(np.where(clean>0));top,left=coords.min(axis=0);bottom,right=coords.max(axis=0);scale=900/(bottom-top+1);commands=[]
 for i,c in enumerate(contours):
  if abs(cv2.contourArea(c))<10:continue
  c=cv2.approxPolyDP(c,.85,True).reshape(-1,2)[::-1]
  # FontLoader expects clockwise exterior paths in Y-up font coordinates.
  # Inverting image Y flips winding, so reverse both exteriors and holes too.
  pts=[(round((px-left)*scale,2),round((bottom-py)*scale,2))for px,py in c]
  for j,(px,py)in enumerate(pts):commands += [('m' if j==0 else 'l'),str(px),str(py)]
  commands+=['l',str(pts[0][0]),str(pts[0][1])]
 glyphs[ch]={'ha':1000,'o':' '.join(commands),'displayScale':round((bottom-top+1)/(3*(76 if kind=='gold' else 80)),3)}
 tile=np.full((160,160,3),245,np.uint8);fit=130/max(clean.shape);small=cv2.resize(clean,(max(1,int(clean.shape[1]*fit)),max(1,int(clean.shape[0]*fit))));sy=(160-small.shape[0])//2;sx=(160-small.shape[1])//2;tile[sy:sy+small.shape[0],sx:sx+small.shape[1]][small>0]=(30,30,150)if kind=='red' else(45,125,185);tiles.append(tile)

 report.append({'character':ch,'referenceBounds':[x,y,x2,y2],'outlinePoints':sum(len(c)for c in contours),'source':'local gate photograph; contour reconstruction'})
out={'glyphs':glyphs,'familyName':'Gulou Gate Photo Outlines','resolution':1000,'boundingBox':{'yMin':0,'yMax':1000},'underlineThickness':50,'original_font_information':{'source':'User-supplied Hankou gate reference photograph, checked with NJU official VR','method':'color-separated glyph contour reconstruction; not original vector calligraphy','originalPhotoDistributed':False}}
Path('public/assets/fonts/gate-lettering.typeface.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
Path('docs/validation/phase9/gate-lettering.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
cv2.imwrite('references/gate-calligraphy-outline-review.png',np.concatenate([np.concatenate(tiles[i:i+4],axis=1)for i in range(0,12,4)],axis=0))
print('Reconstructed',len(glyphs),'glyphs')

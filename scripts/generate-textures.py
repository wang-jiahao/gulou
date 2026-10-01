"""Original, deterministic masonry and foliage assets. No reference photograph pixels are used."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import random, math

out = Path(__file__).resolve().parents[1] / 'public/assets/textures'
out.mkdir(parents=True, exist_ok=True)
r = random.Random(1917)
im = Image.new('RGB', (1024, 1024), (111, 112, 102))
d = ImageDraw.Draw(im)
for row in range(16):
    for col in range(-1, 6):
        x = col * 205 + (row % 2) * 102
        y = row * 64
        v = r.randrange(-18, 19)
        d.rectangle((x+3,y+3,x+202,y+61), fill=(100+v,104+v,98+v))
        d.line((x+4,y+4,x+201,y+4), fill=(128+v,130+v,121+v), width=2)
        d.line((x+3,y+61,x+202,y+61), fill=(71+v,77+v,72+v), width=2)
for _ in range(160000):
    x,y=r.randrange(1024),r.randrange(1024);c=im.getpixel((x,y));v=r.randrange(-18,19)
    d.point((x,y),fill=tuple(max(0,min(255,a+v)) for a in c))
im.save(out/'historic-brick.webp',quality=92)
im.convert('L').save(out/'historic-brick-height.webp',quality=90)

leaf = Image.new('RGBA',(256,256),(0,0,0,0));d=ImageDraw.Draw(leaf)
d.line((124,239,124,20),fill=(116,122,54,255),width=3)
for i in range(7):
    cy=205-i*26;direction=1 if i%2 else -1;cx=124+direction*42
    points=[(124,cy+18),(cx-direction*10,cy-19),(cx+direction*37,cy-33),(cx+direction*26,cy+8),(cx-direction*3,cy+26)]
    green=r.randrange(100,146)
    d.polygon(points,fill=(green-29,green+15,42,255))
    d.line([(124,cy+18),(cx+direction*33,cy-31)],fill=(green+6,green+29,74,255),width=2)
    for j in range(3):
        yy=cy+9-j*9;xx=124+direction*(18+j*11)
        d.line((xx,yy,xx+direction*13,yy+6),fill=(green-4,green+22,61,255),width=1)
leaf=leaf.filter(ImageFilter.GaussianBlur(.35));leaf.save(out/'leaf-spray.png')

ivy=Image.new('RGBA',(128,128),(0,0,0,0));d=ImageDraw.Draw(ivy)
pts=[(63,8),(77,36),(109,21),(101,58),(124,73),(86,87),(67,117),(47,89),(8,75),(32,54),(20,20),(51,37)]
d.polygon(pts,fill=(78,115,35,255))
for x,y in [(63,10),(107,23),(119,74),(9,75),(22,23)]:d.line((65,111,x,y),fill=(119,146,60,255),width=2)
ivy.save(out/'ivy-leaf.png')

grass=Image.new('RGBA',(256,256),(0,0,0,0));d=ImageDraw.Draw(grass)
for i in range(55):
    x=r.randrange(5,251);h=r.randrange(35,240);dx=r.randrange(-35,36);w=r.randrange(1,4);v=r.randrange(80,155)
    d.polygon([(x-w,255),(x+w,255),(x+dx//3,255-h//2),(x+dx,255-h)],fill=(v-30,v,35,255))
grass.save(out/'grass-tuft.png')
print('Original texture assets generated.')
# A lawn and cut stone paving with restrained variation, generated at authoring time.
import numpy as np
rng = np.random.default_rng(1917)
noise = rng.normal(0, 7, (1024, 1024))
coarse = np.array(Image.fromarray(rng.integers(0,255,(32,32),dtype=np.uint8)).resize((1024,1024),Image.Resampling.BICUBIC),dtype=float)/255
arr=np.zeros((1024,1024,3),dtype=np.uint8)
for channel,base in enumerate([83,111,44]): arr[:,:,channel]=np.clip(base+noise+coarse*20,0,255)
lawn=Image.fromarray(arr);d=ImageDraw.Draw(lawn)
for i in range(95000):
    x,y=r.randrange(1024),r.randrange(1024);v=r.randrange(-16,22)
    d.line((x,y,x+r.randrange(-2,3),y-r.randrange(2,7)),fill=(91+v,120+v,46+v),width=1)
lawn.save(out/'lawn.webp',quality=90)
paver=Image.new('RGB',(1024,1024),(112,112,98));d=ImageDraw.Draw(paver)
for row in range(8):
    for col in range(-1,5):
        x=col*256+(row%2)*128;y=row*128;v=r.randrange(-9,10)
        d.rounded_rectangle((x+2,y+2,x+254,y+126),radius=2,fill=(164+v,162+v,145+v))
        d.line((x+4,y+4,x+252,y+4),fill=(179+v,177+v,160+v),width=2)
for i in range(120000):
    x,y=r.randrange(1024),r.randrange(1024);c=paver.getpixel((x,y));v=r.randrange(-9,10);d.point((x,y),fill=tuple(max(0,min(255,a+v)) for a in c))
paver.save(out/'pavers.webp',quality=91)
conifer=Image.new('RGBA',(256,256),(0,0,0,0));d=ImageDraw.Draw(conifer)
d.line((125,250,132,12),fill=(100,90,62,255),width=3)
for i in range(18):
    y=240-i*12
    for side in [-1,1]:
        length=45+int(38*math.sin(i/18*math.pi));ex=128+side*length;ey=y-35
        d.line((128,y,ex,ey),fill=(88,99,64,255),width=2)
        for k in range(14):
            t=k/14;x=128+(ex-128)*t;yy=y+(ey-y)*t;v=r.randrange(-16,17)
            for direction in [-1,1]:d.line((x,yy,x+side*10,yy+direction*13-7),fill=(72+v,99+v,61+v,255),width=2)
conifer.save(out/'conifer-spray.png')
# Adapt a branch from Poly Haven's CC0 atlas to an alpha-tested leaf spray.
source=out.parents[2]/'assets/source-models/tree-small/textures/tree_small_02_leaves_diff_1k.jpg'
if source.exists():
    im=Image.open(source).convert('RGB').crop((547,27,874,635)).resize((256,476),Image.Resampling.LANCZOS)
    a=np.array(im);alpha=np.clip((a.max(axis=2).astype(float)-12)*12,0,255).astype(np.uint8)
    rgba=np.dstack((a,alpha));Image.fromarray(rgba).save(out/'leaf-spray.png')
castle=out/'castle_brick_01_diffuse.jpg'
if castle.exists():
    from PIL import ImageEnhance
    brick=ImageEnhance.Color(Image.open(castle).convert('RGB')).enhance(.12)
    brick=ImageEnhance.Brightness(brick).enhance(.83)
    brick.save(out/'historic-brick.webp',quality=93)
paver.convert('L').save(out/'pavers-height.webp',quality=90)

from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np

out=Path(__file__).resolve().parents[1]/'public/assets/textures'
r=np.random.default_rng(1902)
coarse=np.array(Image.fromarray(r.integers(60,190,(24,24),dtype=np.uint8)).resize((1024,1024),Image.Resampling.BICUBIC),dtype=float)
noise=r.normal(0,3.5,(1024,1024))+(coarse-125)*.12
rgb=np.stack([np.clip(base+noise,0,255) for base in [160,160,149]],axis=2).astype(np.uint8)
Image.fromarray(rgb).save(out/'stone-grain.webp',quality=90)
yy,xx=np.mgrid[:512,:512];weave=128+np.sin(xx*np.pi)*20+np.cos(yy*np.pi*.5)*12+r.normal(0,7,(512,512))
Image.fromarray(np.clip(weave,0,255).astype(np.uint8)).save(out/'fabric-bump.webp',quality=85)
mask=Image.new('L',(256,256));d=ImageDraw.Draw(mask)
d.polygon([(128,10),(151,55),(187,31),(178,90),(237,81),(204,133),(226,177),(168,190),(129,243),(85,190),(26,177),(48,129),(16,81),(78,87),(69,32),(105,55)],fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(.6));noise=r.normal(0,5,(256,256));shade=np.sin(xx[:256,:256]*.028)*7+noise
rgb=np.stack([np.clip(base+shade,0,255) for base in [51,82,34]],axis=2).astype(np.uint8)
leaf=Image.fromarray(np.dstack([rgb,np.array(mask)]));d=ImageDraw.Draw(leaf)
for x,y in [(128,15),(183,36),(231,86),(220,174),(70,37),(22,86),(31,174)]:d.line((129,232,x,y),fill=(98,119,54,255),width=2)
leaf.putalpha(mask);leaf.save(out/'ivy-leaf-natural.png')
print('Stone, cloth and natural ivy textures ready.')
pine=out.parents[2]/'assets/source-models/pine_tree_01_twig_diff_1k.jpg'
if pine.exists():
    twig=Image.open(pine).convert('RGB').crop((35,32,218,374)).resize((256,478),Image.Resampling.LANCZOS)
    a=np.asarray(twig);alpha=np.clip((a.max(2).astype(float)-14)*14,0,255).astype(np.uint8)
    Image.fromarray(np.dstack([a,alpha])).save(out/'pine-spray.png')
    Image.open(pine.with_name('pine_tree_01_bark_diff_1k.jpg')).save(out/'pine-bark.webp',quality=91)

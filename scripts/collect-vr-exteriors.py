"""Cache NJU's public exterior cube faces locally, never in public/ or dist/."""
import sys,json,math,re,urllib.request,concurrent.futures,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'.tools/python'))
import cv2,numpy as np
out=root/'references/official-vr/phase10';out.mkdir(parents=True,exist_ok=True)
scenes=ET.parse(root/'docs/sources/official-newui-gulou.xml').getroot().findall('scene')
external=[s for s in scenes if s.get('name')=='scene_gl' or s.get('name').split('-')[1] in ['1','2','3','4']]
specs=[];jobs=[]
for s in external:
 cube=s.find('image/cube');dims=list(map(int,cube.get('multires').split(',')));tile,size=dims[:2];n=math.ceil(size/tile)
 for side in ['f','r','b','l']:
  spec=(s.get('name'),side,size,tile);specs.append(spec)
  if (out/f'{spec[0]}-{side}.jpg').exists():continue
  for y in range(1,n+1):
   for x in range(1,n+1):
    path=cube.get('url').replace('%s',side).replace('%l','1').replace('%0v',f'{y:02}').replace('%0h',f'{x:02}').replace('%v',str(y)).replace('%h',str(x));jobs.append((spec,x,y,'https://vr.nju.edu.cn/newUI/static/krpano/'+path))
canvases={s:np.zeros((s[2],s[2],3),np.uint8) for s in specs if not(out/f'{s[0]}-{s[1]}.jpg').exists()};failures=[]
def fetch(job):
 spec,x,y,url=job
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=20)as r:data=r.read()
   im=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
   if im is None:raise ValueError('invalid image')
   return spec,x,y,im,None
  except Exception as e:
   error=str(e)
   if '404' in error:url=re.sub(r'(?<=[/_])0([1-9])',r'\1',url)
 return spec,x,y,None,{'url':url,'error':error}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for i,(s,x,y,im,error)in enumerate(pool.map(fetch,jobs)):
  if error:failures.append(error);continue
  yy=(y-1)*s[3];xx=(x-1)*s[3];h=min(im.shape[0],s[2]-yy);w=min(im.shape[1],s[2]-xx);canvases[s][yy:yy+h,xx:xx+w]=im[:h,:w]
  if i%100==0:print('tiles',i+1,'/',len(jobs),flush=True)
for s,im in canvases.items():
 if any(f'/{s[0].replace("scene_","")}.tiles/{s[1]}/' in e['url'] for e in failures):continue
 cv2.imwrite(str(out/f'{s[0]}-{s[1]}.jpg'),im)
for i in range(0,len(external),6):
 rows=[]
 for s in external[i:i+6]:
  imgs=[]
  for side in ['f','r','b','l']:
   loaded=cv2.imread(str(out/f'{s.get("name")}-{side}.jpg'));im=cv2.resize(loaded if loaded is not None else np.zeros((320,320,3),np.uint8),(320,320));cv2.putText(im,side,(10,30),cv2.FONT_HERSHEY_SIMPLEX,.8,(0,0,255),2);imgs.append(im)
  row=np.concatenate(imgs,axis=1);bar=np.full((32,1280,3),238,np.uint8);cv2.putText(bar,s.get('name'),(10,24),cv2.FONT_HERSHEY_SIMPLEX,.65,(10,10,10),1);rows.append(np.concatenate([bar,row]))
 cv2.imwrite(str(out/f'sheet-{i//6+1:02}.jpg'),np.concatenate(rows))
report={'source':'https://vr.nju.edu.cn/newUI/#/','allViews':len(scenes),'exteriorViews':len(external),'faces':len(specs),'failedTiles':failures,'scenes':[{'id':s.get('name'),'title':s.get('title'),'latitude':s.get('lat'),'longitude':s.get('lng'),'views':[str((out/f'{s.get("name")}-{side}.jpg').relative_to(root))for side in ['f','r','b','l']]}for s in external]}
(root/'docs/validation/phase10/vr-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('Finished',len(external),'exterior views;',len(failures),'failed tiles',flush=True)
if failures:sys.exit(1)

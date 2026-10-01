"""Extract CC0 MakeHuman graphical data only; no MakeHuman application code is used."""
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
vertices=[];uvs=[];groups={};group='body'
for line in (root/'assets/source-models/character/makehuman-base.obj').read_text().splitlines():
    p=line.split()
    if not p:continue
    if p[0]=='v':vertices.append(list(map(float,p[1:4])))
    elif p[0]=='vt':uvs.append(list(map(float,p[1:3])))
    elif p[0]=='g':group=p[1];groups.setdefault(group,[])
    elif p[0]=='f':groups[group].append([[int(t.split('/')[0])-1,int(t.split('/')[1])-1] for t in p[1:]])
body_ids={v[0] for f in groups['body'] for v in f}
low=min(vertices[v][1] for v in body_ids);high=max(vertices[v][1] for v in body_ids);scale=1.75/(high-low)
vertices=[[round(x*scale,6),round((y-low)*scale,6),round(z*scale,6)] for x,y,z in vertices]
joints={}
for name,faces in groups.items():
    if not name.startswith('joint-'):continue
    ids={v[0] for f in faces for v in f}
    joints[name[6:]]=[sum(vertices[v][axis] for v in ids)/len(ids) for axis in range(3)]
data={'vertices':vertices,'uvs':uvs,'groups':{key:groups[key] for key in ['body','helper-tights','helper-hair']},'joints':joints,'source':'MakeHuman base.obj, CC0 1.0'}
(root/'assets/source-models/character/human-data.json').write_text(json.dumps(data,separators=(',',':')))
print('MakeHuman base mesh and joint markers extracted.')
